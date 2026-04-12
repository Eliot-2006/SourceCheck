import asyncio
import json
import re
from typing import Any

import httpx
from fastapi import HTTPException

from .config import Settings
from .schemas import SourceCheckRequest

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
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=504,
                detail="Groq timed out while synthesizing the verdict",
            ) from exc
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:400] or exc.response.reason_phrase
            raise HTTPException(
                status_code=502,
                detail=f"Groq request failed: {detail}",
            ) from exc

        return response.json()["choices"][0]["message"]["content"]

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

    async def produce_verdict(
        self,
        request: SourceCheckRequest,
        nia_findings: str,
    ) -> dict[str, Any]:
        print("[SourceCheck] verdict_started")
        raw = await self.groq_call(
            [
                {"role": "system", "content": VERDICT_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Claim: {request.claim}\n"
                        f"Citation: {request.citation or 'not provided'}\n"
                        f"Source URL: {request.source_url}\n\n"
                        f"What Nia found in the source:\n{nia_findings}"
                    ),
                },
            ],
            max_tokens=700,
        )
        try:
            result = json.loads(clean_json(raw))
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=502,
                detail="Groq returned invalid JSON for the verdict",
            ) from exc

        _valid_verdicts = {
            "confirmed", "incorrect", "hallucinated_citation",
            "partially_correct", "unverifiable",
        }
        verdict = result.get("verdict")
        if verdict not in _valid_verdicts:
            verdict = "unverifiable"
        result["verdict"] = verdict

        confidence = self._normalize_optional_string(result.get("confidence"))
        if confidence not in {"high", "medium", "low"}:
            confidence = "low"
        result["confidence"] = confidence

        result["what_claim_says"] = self._normalize_optional_string(result.get("what_claim_says")) or request.claim

        _nullable = ("what_paper_says", "correction", "paper_title", "arxiv_id", "arxiv_url")
        for field in _nullable:
            result[field] = self._normalize_optional_string(result.get(field))

        explanation = self._normalize_optional_string(result.get("explanation"))
        result["verdict"] = self._normalize_verdict_from_evidence(
            result["verdict"],
            result["what_paper_says"],
            explanation,
        )

        if verdict in {"confirmed", "hallucinated_citation", "unverifiable"}:
            result["correction"] = None

        final_verdict = result["verdict"]
        if final_verdict in {"confirmed", "hallucinated_citation", "unverifiable"}:
            result["correction"] = None

        result["explanation"] = explanation or self._fallback_explanation(final_verdict)

        result["claim"] = request.claim
        result["source_url"] = request.source_url
        print(
            "[SourceCheck] verdict_completed "
            f"verdict={result['verdict']} confidence={result['confidence']}"
        )
        return result

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
        return await self.produce_verdict(request, nia_findings)
