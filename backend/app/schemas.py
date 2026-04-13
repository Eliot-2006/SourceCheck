from typing import Literal

from pydantic import BaseModel


VerdictLiteral = Literal[
    "confirmed",
    "incorrect",
    "hallucinated_citation",
    "partially_correct",
    "unverifiable",
]

ConfidenceLiteral = Literal["high", "medium", "low"]


class SourceCheckRequest(BaseModel):
    claim: str
    citation: str = ""
    source_url: str


class ClaimVerdict(BaseModel):
    claim: str
    verdict: VerdictLiteral
    confidence: ConfidenceLiteral
    what_claim_says: str | None = None
    what_paper_says: str | None = None
    correction: str | None = None
    paper_title: str | None = None
    arxiv_id: str | None = None
    arxiv_url: str | None = None
    explanation: str


class SourceCheckResponse(ClaimVerdict):
    source_url: str


class ParagraphCheckRequest(BaseModel):
    text: str
    source_url: str
    citation_hint: str = ""


class ParagraphClaimResult(ClaimVerdict):
    claim_id: int
    original_span: str


class ParagraphCheckResponse(BaseModel):
    claims: list[ParagraphClaimResult]
    summary: dict[str, int]
    corrected_text: str
    original_text: str
    claims_checked: int
