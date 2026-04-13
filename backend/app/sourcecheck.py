import asyncio
import json
import re
from typing import Any

import httpx
from fastapi import HTTPException

from .config import Settings
from .schemas import ParagraphCheckRequest, SourceCheckRequest

VERDICT_SYSTEM = """Compare a research claim against actual findings from the source provided by the user.
Return ONLY valid JSON (no markdown):
{
  "verdict": "confirmed|incorrect|hallucinated_citation|partially_correct|unverifiable",
  "confidence": "high|medium|low",
  "what_claim_says": "the specific assertion being made",
  "what_paper_says": "exact quote or close paraphrase from the real source",
  "correction": "corrected statement if wrong, else null",
  "paper_title": "real source title if found, else null",
  "arxiv_id": "arXiv ID if applicable, else null",
  "arxiv_url": "https://arxiv.org/abs/ID if applicable, else null",
  "explanation": "one sentence verdict explanation"
}

Decision rules:
- confirmed: the source directly supports the claim.
- incorrect: the source directly contradicts the claim on the same topic.
- partially_correct: one part of the claim is supported but another part is contradicted or overstated.
- hallucinated_citation: the claim is being attributed to this source, but the source is clearly irrelevant or says nothing about that topic.
- unverifiable: the source is relevant, but the findings do not provide enough evidence to confirm or refute the claim.

Correction rules:
- Only provide a correction when the source findings clearly support a grounded correction.
- If the source is irrelevant, or the findings are insufficient, return "correction": null.
- Never invent corrections from general world knowledge.

Grounding rules:
- Use only the findings provided below. Do not rely on outside knowledge.
- When a claim combines multiple sub-claims, use partially_correct only if the findings clearly support at least one sub-claim and clearly contradict or overstate at least one other sub-claim.
- If the findings only show missing detail, choose unverifiable instead of incorrect.
- If the findings show topic mismatch, choose hallucinated_citation instead of unverifiable.
- Be exact about numbers, dates, and named entities when the source provides them.

NEVER guess facts. Only use what Nia found in the source."""

EXTRACTION_SYSTEM = """Extract cited factual claims from a paragraph that should be verified against one provided source.
Return ONLY valid JSON (no markdown):
{
  "claims": [
    {
      "claim": "standalone factual claim to verify",
      "original_span": "exact span from the paragraph",
      "citation": "citation cue from the sentence if present, else null"
    }
  ]
}

Extraction rules:
- Extract only factual, source-attributed claims.
- A claim qualifies if it includes an MLA-like citation, explicit source title mention, or clear attribution like "the paper/report/source says".
- Ignore uncited framing, opinions, transitions, and unsupported side comments.
- Preserve original_span exactly as written in the paragraph.
- If a sentence contains multiple independently verifiable cited facts, split them into separate claims.
- If attribution to the provided source is ambiguous, skip the span.
- Return an empty claims array if no cited factual claims are present."""

REWRITE_SYSTEM = """Rewrite a paragraph conservatively using verified claim outcomes.
Return ONLY valid JSON (no markdown):
{
  "corrected_text": "rewritten paragraph"
}

Rewrite rules:
- Preserve the original wording, structure, and tone whenever possible.
- Only change text when a verified claim includes a grounded correction.
- Leave confirmed claims unchanged.
- Leave unverifiable claims unchanged.
- Leave hallucinated_citation claims unchanged unless the verified correction explicitly provides replacement wording.
- Never invent new facts, citations, or corrections from world knowledge.
- If no grounded corrections are available, return the original text unchanged."""


def clean_json(raw: str) -> str:
    cleaned = raw.strip()
    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _collect_text_fragments(value: Any, fragments: list[str]) -> None:
    if isinstance(value, str):
        text = value.strip()
        if text:
            fragments.append(text)
        return

    if isinstance(value, list):
        for item in value:
            _collect_text_fragments(item, fragments)
        return

    if isinstance(value, dict):
        preferred_keys = (
            "answer",
            "response",
            "summary",
            "content",
            "text",
            "snippet",
            "passage",
            "quote",
        )
        for key in preferred_keys:
            if key in value:
                _collect_text_fragments(value[key], fragments)

        nested_keys = ("results", "citations", "sources", "chunks", "data")
        for key in nested_keys:
            if key in value:
                _collect_text_fragments(value[key], fragments)


class SourceCheckService:
    def __init__(self, client: httpx.AsyncClient, settings: Settings) -> None:
        self.client = client
        self.settings = settings

    def ensure_configured(self) -> None:
        missing = []
        if not self.settings.nia_api_key:
            missing.append("NIA_API_KEY")
        if not self.settings.groq_api_key:
            missing.append("GROQ_API_KEY")
        if missing:
            raise HTTPException(
                status_code=500,
                detail=f"Missing required environment variables: {', '.join(missing)}",
            )

    async def groq_call(self, messages: list[dict[str, str]], max_tokens: int = 1500) -> str:
        last_exc: Exception | None = None
        for attempt in range(1, 4):
            try:
                response = await self.client.post(
                    f"{self.settings.groq_base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.settings.groq_api_key}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "max_tokens": max_tokens,
                        "messages": messages,
                    },
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
            except httpx.TimeoutException as exc:
                last_exc = exc
                print(f"[Groq] timeout attempt={attempt}/3")
                await asyncio.sleep(2)
            except httpx.HTTPStatusError as exc:
                last_exc = exc
                status_code = exc.response.status_code
                if status_code == 429 or status_code >= 500:
                    print(f"[Groq] retryable_status={status_code} attempt={attempt}/3")
                    await asyncio.sleep(2)
                    continue
                detail = exc.response.text[:400] or exc.response.reason_phrase
                raise HTTPException(
                    status_code=502,
                    detail=f"Groq request failed: {detail}",
                ) from exc

        if isinstance(last_exc, httpx.TimeoutException):
            raise HTTPException(
                status_code=504,
                detail="Groq timed out while synthesizing the verdict",
            ) from last_exc
        if isinstance(last_exc, httpx.HTTPStatusError):
            detail = last_exc.response.text[:400] or last_exc.response.reason_phrase
            raise HTTPException(
                status_code=502,
                detail=f"Groq request failed after retries: {detail}",
            ) from last_exc
        raise HTTPException(status_code=502, detail="Groq request failed")

    async def groq_json_call(
        self,
        messages: list[dict[str, str]],
        max_tokens: int,
        failure_detail: str,
        retries: int = 3,
    ) -> dict[str, Any]:
        last_raw = ""
        for attempt in range(1, retries + 1):
            raw = await self.groq_call(messages, max_tokens=max_tokens)
            last_raw = raw
            try:
                return json.loads(clean_json(raw))
            except json.JSONDecodeError:
                print(f"[Groq JSON] invalid_json attempt={attempt}/{retries}")

        raise HTTPException(
            status_code=502,
            detail=f"{failure_detail}. Last raw response: {last_raw[:400]}",
        )

    async def nia_poll(
        self,
        url: str,
        done_statuses: list[str],
        max_wait_seconds: int = 240,
    ) -> dict[str, Any]:
        attempts = max_wait_seconds // self.settings.nia_poll_interval_seconds
        last_status = "unknown"

        for _ in range(attempts):
            try:
                response = await self.client.get(
                    url,
                    headers={"Authorization": f"Bearer {self.settings.nia_api_key}"},
                    timeout=15,
                )
                response.raise_for_status()
            except httpx.TimeoutException:
                print(f"[Nia poll] request timed out, retrying... url={url}")
                await asyncio.sleep(self.settings.nia_poll_interval_seconds)
                continue
            except httpx.HTTPStatusError as exc:
                detail = exc.response.text[:400] or exc.response.reason_phrase
                raise HTTPException(
                    status_code=502,
                    detail=f"Nia polling failed: {detail}",
                ) from exc

            payload = response.json()
            last_status = payload.get("status", "unknown")
            print(f"[Nia poll] status={last_status} url={url}")

            if last_status in done_statuses:
                return payload
            if last_status == "error":
                raise HTTPException(
                    status_code=502,
                    detail=f"Nia error: {payload.get('error', 'unknown')}",
                )

            await asyncio.sleep(self.settings.nia_poll_interval_seconds)

        raise HTTPException(
            status_code=504,
            detail=f"Nia timed out after {max_wait_seconds}s (last status: {last_status})",
        )

    async def nia_post(self, path: str, body: dict, retries: int = 3, timeout: int = 60) -> dict:
        """POST to Nia with per-request timeout and retry on ReadTimeout."""
        last_exc: Exception | None = None
        for attempt in range(retries):
            try:
                response = await self.client.post(
                    f"{self.settings.nia_base_url}{path}",
                    headers={"Authorization": f"Bearer {self.settings.nia_api_key}"},
                    json=body,
                    timeout=timeout,
                )
                response.raise_for_status()
                return response.json()
            except httpx.TimeoutException as exc:
                last_exc = exc
                print(f"[Nia POST] timeout on attempt {attempt + 1}/{retries}, retrying... path={path}")
                await asyncio.sleep(3)
            except httpx.HTTPStatusError as exc:
                detail = exc.response.text[:400] or exc.response.reason_phrase
                raise HTTPException(
                    status_code=502,
                    detail=f"Nia request to {path} failed: {detail}",
                ) from exc
        raise HTTPException(
            status_code=504,
            detail=f"Nia POST {path} timed out after {retries} attempts",
        ) from last_exc

    async def index_source(self, url: str) -> str:
        is_arxiv = "arxiv.org" in url
        source_type = "research_paper" if is_arxiv else "documentation"

        print(f"[SourceCheck] indexing_started url={url} type={source_type}")
        payload = await self.nia_post("/sources", {"type": source_type, "url": url})
        source_id = payload.get("id") or payload.get("source_id")
        if not source_id:
            raise HTTPException(
                status_code=502,
                detail="Nia indexing failed because no source ID was returned",
            )

        await self.nia_poll(
            f"{self.settings.nia_base_url}/sources/{source_id}",
            done_statuses=["indexed", "ready", "complete", "completed"],
        )
        print(f"[SourceCheck] indexing_completed source_id={source_id}")
        return source_id

    async def search_source(self, source_id: str, query: str) -> str:
        print(f"[SourceCheck] search_started source_id={source_id}")
        payload = await self.nia_post(
            "/search",
            {
                "mode": "query",
                "messages": [{"role": "user", "content": query}],
                "data_sources": [source_id],
            },
            timeout=30,
        )
        fragments: list[str] = []
        _collect_text_fragments(payload, fragments)

        if not fragments:
            findings = json.dumps(payload)[:2500]
            print(
                "[SourceCheck] search_completed "
                f"source_id={source_id} fragments=0 findings_chars={len(findings)}"
            )
            return findings

        deduped: list[str] = []
        seen: set[str] = set()
        for fragment in fragments:
            if fragment in seen:
                continue
            seen.add(fragment)
            deduped.append(fragment)
            if len(deduped) == 8:
                break

        findings = "\n\n".join(deduped)[:2500]
        print(
            "[SourceCheck] search_completed "
            f"source_id={source_id} fragments={len(deduped)} findings_chars={len(findings)}"
        )
        return findings

    def _normalize_optional_string(self, value: Any) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            value = str(value)

        cleaned = value.strip()
        if not cleaned:
            return None

        lowered = cleaned.lower()
        placeholders = {
            "null",
            "none",
            "n/a",
            "na",
            "not applicable",
            "not provided",
            "unknown",
            "unspecified",
            "not specified",
            "not specified in the provided information",
            "not specified in the provided text",
        }
        if lowered in placeholders:
            return None

        return cleaned

    def _fallback_explanation(self, verdict: str) -> str:
        explanations = {
            "confirmed": "The source supports the claim.",
            "incorrect": "The source contradicts the claim.",
            "hallucinated_citation": "The source is not relevant to the claim being attributed to it.",
            "partially_correct": "The source supports part of the claim but not all of it.",
            "unverifiable": "The source does not provide enough evidence to verify the claim.",
        }
        return explanations[verdict]

    def _normalize_verdict_from_evidence(
        self,
        verdict: str,
        what_paper_says: str | None,
        explanation: str | None,
    ) -> str:
        evidence_text = " ".join(filter(None, [what_paper_says, explanation])).lower()

        irrelevant_markers = (
            "does not mention",
            "doesn't mention",
            "does not discuss",
            "doesn't discuss",
            "does not contain",
            "doesn't contain",
            "no discussion about",
            "irrelevant to the claim",
            "irrelevant to this claim",
            "unrelated to the claim",
            "not relevant to the claim",
            "says nothing about",
            "focuses on gpt-4",
        )
        insufficient_detail_markers = (
            "does not provide enough",
            "not enough information",
            "insufficient evidence",
            "contains no further details",
            "no further details",
            "withheld",
            "withholds",
            "withholding",
            "does not provide the specific information",
            "unable to verify from the source",
        )

        has_irrelevant_marker = any(marker in evidence_text for marker in irrelevant_markers)
        has_detail_marker = any(marker in evidence_text for marker in insufficient_detail_markers)

        if verdict == "unverifiable" and has_irrelevant_marker and not has_detail_marker:
            return "hallucinated_citation"
        if verdict == "hallucinated_citation" and has_detail_marker and not has_irrelevant_marker:
            return "unverifiable"
        return verdict

    def _clean_extracted_claims(self, payload: dict[str, Any]) -> list[dict[str, str | None]]:
        raw_claims = payload.get("claims")
        if not isinstance(raw_claims, list):
            return []

        cleaned_claims: list[dict[str, str | None]] = []
        seen: set[tuple[str, str]] = set()

        for item in raw_claims:
            if not isinstance(item, dict):
                continue

            claim = self._normalize_optional_string(item.get("claim"))
            original_span = self._normalize_optional_string(item.get("original_span"))
            citation = self._normalize_optional_string(item.get("citation"))

            if not claim or not original_span:
                continue

            key = (claim.lower(), original_span.lower())
            if key in seen:
                continue
            seen.add(key)
            cleaned_claims.append(
                {
                    "claim": claim,
                    "original_span": original_span,
                    "citation": citation,
                }
            )

        return cleaned_claims

    def _finalize_verdict_result(
        self,
        claim: str,
        source_url: str,
        result: dict[str, Any],
    ) -> dict[str, Any]:
        valid_verdicts = {
            "confirmed", "incorrect", "hallucinated_citation",
            "partially_correct", "unverifiable",
        }
        verdict = result.get("verdict")
        if verdict not in valid_verdicts:
            verdict = "unverifiable"
        result["verdict"] = verdict

        confidence = self._normalize_optional_string(result.get("confidence"))
        if confidence not in {"high", "medium", "low"}:
            confidence = "low"
        result["confidence"] = confidence

        result["what_claim_says"] = self._normalize_optional_string(result.get("what_claim_says")) or claim

        nullable_fields = ("what_paper_says", "correction", "paper_title", "arxiv_id", "arxiv_url")
        for field in nullable_fields:
            result[field] = self._normalize_optional_string(result.get(field))

        explanation = self._normalize_optional_string(result.get("explanation"))
        result["verdict"] = self._normalize_verdict_from_evidence(
            result["verdict"],
            result["what_paper_says"],
            explanation,
        )

        final_verdict = result["verdict"]
        if final_verdict in {"confirmed", "hallucinated_citation", "unverifiable"}:
            result["correction"] = None

        result["explanation"] = explanation or self._fallback_explanation(final_verdict)
        result["claim"] = claim
        result["source_url"] = source_url
        return result

    def _build_summary(self, claims: list[dict[str, Any]]) -> dict[str, int]:
        summary: dict[str, int] = {}
        for claim in claims:
            verdict = claim.get("verdict", "unverifiable")
            summary[verdict] = summary.get(verdict, 0) + 1
        return summary

    async def produce_verdict(
        self,
        claim: str,
        source_url: str,
        citation: str,
        nia_findings: str,
    ) -> dict[str, Any]:
        print("[SourceCheck] verdict_started")
        result = await self.groq_json_call(
            [
                {"role": "system", "content": VERDICT_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Claim: {claim}\n"
                        f"Citation: {citation or 'not provided'}\n"
                        f"Source URL: {source_url}\n\n"
                        f"What Nia found in the source:\n{nia_findings}"
                    ),
                },
            ],
            max_tokens=700,
            failure_detail="Groq returned invalid JSON for the verdict",
        )

        result = self._finalize_verdict_result(claim, source_url, result)
        print(
            "[SourceCheck] verdict_completed "
            f"verdict={result['verdict']} confidence={result['confidence']}"
        )
        return result

    async def extract_claims(
        self,
        text: str,
        source_url: str,
        citation_hint: str,
    ) -> list[dict[str, str | None]]:
        print("[SourceCheck] extraction_started")
        payload = await self.groq_json_call(
            [
                {"role": "system", "content": EXTRACTION_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Source URL: {source_url}\n"
                        f"Global citation hint: {citation_hint or 'not provided'}\n\n"
                        f"Paragraph:\n{text}"
                    ),
                },
            ],
            max_tokens=900,
            failure_detail="Groq returned invalid JSON while extracting claims",
        )

        claims = self._clean_extracted_claims(payload)
        print(f"[SourceCheck] extraction_completed claims={len(claims)}")
        return claims

    async def rewrite_text(
        self,
        original_text: str,
        verified_claims: list[dict[str, Any]],
    ) -> str:
        grounded_claims = []
        for claim in verified_claims:
            grounded_claims.append(
                {
                    "claim": claim["claim"],
                    "original_span": claim["original_span"],
                    "verdict": claim["verdict"],
                    "correction": claim.get("correction"),
                    "explanation": claim.get("explanation"),
                }
        )

        print("[SourceCheck] rewrite_started")
        payload = await self.groq_json_call(
            [
                {"role": "system", "content": REWRITE_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Original paragraph:\n{original_text}\n\n"
                        "Verified claim outcomes:\n"
                        f"{json.dumps(grounded_claims, ensure_ascii=True)}"
                    ),
                },
            ],
            max_tokens=900,
            failure_detail="Groq returned invalid JSON while rewriting the paragraph",
        )

        corrected_text = self._normalize_optional_string(payload.get("corrected_text"))
        if not corrected_text:
            corrected_text = original_text
        print("[SourceCheck] rewrite_completed")
        return corrected_text

    async def check(self, request: SourceCheckRequest) -> dict[str, Any]:
        self.ensure_configured()

        if not request.claim.strip():
            raise HTTPException(status_code=400, detail="Claim cannot be empty")
        if not request.source_url.strip():
            raise HTTPException(
                status_code=400,
                detail="Source URL is required so the claim can be checked against a specific source",
            )

        source_id = await self.index_source(request.source_url)

        query = request.claim
        if request.citation:
            query = f"{request.claim}. {request.citation}"

        nia_findings = await self.search_source(source_id, query)
        return await self.produce_verdict(
            claim=request.claim,
            source_url=request.source_url,
            citation=request.citation,
            nia_findings=nia_findings,
        )

    async def check_paragraph(self, request: ParagraphCheckRequest) -> dict[str, Any]:
        self.ensure_configured()

        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        if not request.source_url.strip():
            raise HTTPException(
                status_code=400,
                detail="Source URL is required so the paragraph can be checked against a specific source",
            )

        source_id = await self.index_source(request.source_url)
        extracted_claims = await self.extract_claims(
            text=request.text,
            source_url=request.source_url,
            citation_hint=request.citation_hint,
        )

        if not extracted_claims:
            return {
                "claims": [],
                "summary": {},
                "corrected_text": request.text,
                "original_text": request.text,
                "claims_checked": 0,
            }

        verified_claims: list[dict[str, Any]] = []
        for claim_id, extracted in enumerate(extracted_claims, start=1):
            claim_text = extracted["claim"] or ""
            citation_parts = [
                item for item in (extracted.get("citation"), request.citation_hint) if item
            ]
            citation = " | ".join(citation_parts)
            query = claim_text if not citation else f"{claim_text}. {citation}"
            nia_findings = await self.search_source(source_id, query)
            verdict = await self.produce_verdict(
                claim=claim_text,
                source_url=request.source_url,
                citation=citation,
                nia_findings=nia_findings,
            )
            verdict["claim_id"] = claim_id
            verdict["original_span"] = extracted["original_span"]
            verdict.pop("source_url", None)
            verified_claims.append(verdict)

        corrected_text = await self.rewrite_text(request.text, verified_claims)
        return {
            "claims": verified_claims,
            "summary": self._build_summary(verified_claims),
            "corrected_text": corrected_text,
            "original_text": request.text,
            "claims_checked": len(verified_claims),
        }
