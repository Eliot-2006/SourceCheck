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

Verdict guide:
confirmed = claim matches what the source says
incorrect = claim is wrong (be exact about numbers)
hallucinated_citation = source doesn't exist or says nothing like this
partially_correct = directionally right, details wrong
unverifiable = not enough evidence found in the source

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

    async def index_source(self, url: str) -> str:
        is_arxiv = "arxiv.org" in url
        source_type = "research_paper" if is_arxiv else "documentation"

        response = await self.client.post(
            f"{self.settings.nia_base_url}/sources",
            headers={"Authorization": f"Bearer {self.settings.nia_api_key}"},
            json={"type": source_type, "url": url},
        )
        response.raise_for_status()

        payload = response.json()
        source_id = payload.get("id") or payload.get("source_id")
        if not source_id:
            raise HTTPException(status_code=502, detail="Nia did not return a source ID")

        await self.nia_poll(
            f"{self.settings.nia_base_url}/sources/{source_id}",
            done_statuses=["indexed", "ready", "complete", "completed"],
        )
        return source_id

    async def search_source(self, source_id: str, query: str) -> str:
        response = await self.client.post(
            f"{self.settings.nia_base_url}/search",
            headers={"Authorization": f"Bearer {self.settings.nia_api_key}"},
            json={
                "mode": "query",
                "messages": [{"role": "user", "content": query}],
                "data_sources": [source_id],
            },
        )
        response.raise_for_status()
        payload = response.json()
        fragments: list[str] = []
        _collect_text_fragments(payload, fragments)

        if not fragments:
            return json.dumps(payload)[:2500]

        deduped: list[str] = []
        seen: set[str] = set()
        for fragment in fragments:
            if fragment in seen:
                continue
            seen.add(fragment)
            deduped.append(fragment)
            if len(deduped) == 8:
                break

        return "\n\n".join(deduped)[:2500]

    async def produce_verdict(
        self,
        request: SourceCheckRequest,
        nia_findings: str,
    ) -> dict[str, Any]:
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
        result = json.loads(clean_json(raw))

        _valid_verdicts = {
            "confirmed", "incorrect", "hallucinated_citation",
            "partially_correct", "unverifiable",
        }
        if result.get("verdict") not in _valid_verdicts:
            result["verdict"] = "unverifiable"

        _nullable = ("what_paper_says", "correction", "paper_title", "arxiv_id", "arxiv_url")
        for field in _nullable:
            if result.get(field) in ("null", "None", "N/A", ""):
                result[field] = None

        result["claim"] = request.claim
        result["source_url"] = request.source_url
        return result

    async def check(self, request: SourceCheckRequest) -> dict[str, Any]:
        self.ensure_configured()

        if not request.claim.strip():
            raise HTTPException(status_code=400, detail="Claim cannot be empty")
        if not request.source_url.strip():
            raise HTTPException(status_code=400, detail="Source URL cannot be empty")

        source_id = await self.index_source(request.source_url)

        query = request.claim
        if request.citation:
            query = f"{request.claim}. {request.citation}"

        nia_findings = await self.search_source(source_id, query)
        return await self.produce_verdict(request, nia_findings)
