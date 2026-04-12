from typing import Literal

from pydantic import BaseModel


class SourceCheckRequest(BaseModel):
    claim: str
    citation: str = ""
    source_url: str


class SourceCheckResponse(BaseModel):
    claim: str
    source_url: str
    verdict: Literal[
        "confirmed",
        "incorrect",
        "hallucinated_citation",
        "partially_correct",
        "unverifiable",
    ]
    confidence: Literal["high", "medium", "low"]
    what_claim_says: str | None = None
    what_paper_says: str | None = None
    correction: str | None = None
    paper_title: str | None = None
    arxiv_id: str | None = None
    arxiv_url: str | None = None
    explanation: str
