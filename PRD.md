# PRD: SourceCheck

## Overview

SourceCheck is a paragraph-level research verification tool. A user pastes a paragraph or short passage, provides a single source URL, and optionally adds a citation hint. The system indexes the source with Nia, extracts claim-like spans from the paragraph, verifies each extracted claim against the source, and returns both a claim-by-claim audit and a corrected version of the paragraph.

The current MVP is optimized for demoability:

- one paragraph at a time
- one source URL for the whole check
- source-grounded verification through Nia
- conservative rewrite based on verified corrections

## Problem

AI-generated summaries and essays often contain:

- wrong numbers
- incorrect attribution
- made-up citations
- unsupported implementation details

These mistakes are hard to catch quickly. SourceCheck is meant to show, against a real paper, which claims are right, which are wrong, and how the paragraph should read once the wrong claims are corrected.

## Product Scope

### In Scope

- paragraph or short-passage input
- one source URL
- optional citation hint
- extracted factual claims
- per-claim verdicts
- corrected paragraph rewrite

### Out of Scope

- multi-source citation resolution
- essay-length document workflows with many sources
- persistence, accounts, history, or collaboration
- deployment-specific infrastructure requirements

## Core User Flow

1. User pastes a paragraph or short passage.
2. User provides a source URL and optional citation hint.
3. Backend indexes the source through Nia.
4. Backend extracts cited or source-attributed factual claims from the paragraph.
5. Backend verifies each extracted claim against the indexed source.
6. Backend returns:
   - extracted claims with verdicts
   - summary counts
   - corrected paragraph text

## Goals

- Verify paragraph claims against a real source.
- Preserve Nia as the grounding layer.
- Show a corrected paragraph that only changes source-grounded claims.
- Produce a clean live demo against a known paper such as the GPT-4 Technical Report.

## Success Criteria

- `POST /check-paragraph` returns stable results for known demo cases.
- The frontend shows extracted claims, verdict counts, and corrected text.
- Confirmed claims remain unchanged in the rewrite.
- Incorrect claims are corrected using only grounded source evidence.
- Hallucinated or unverifiable claims do not trigger fabricated corrections.

## Tech Stack

### Backend

- Python 3.11+
- FastAPI
- Uvicorn
- httpx
- python-dotenv
- Pydantic v2

### Frontend

- React 18
- Vite
- Tailwind CSS
- React Router

### External APIs

- Nia: source indexing and source search
- Groq: structured extraction, verdict synthesis, and conservative rewrite

## Architecture

```text
Frontend
  -> POST /check-paragraph
  -> render original text, corrected text, and extracted claim cards

Backend
  1. validate text + source_url
  2. index source via Nia
  3. search source for extracted claims
  4. use Groq to classify claim vs evidence
  5. use Groq to rewrite paragraph conservatively
  6. return paragraph response
```

## API Contract

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /check`

Compatibility endpoint for single-claim verification.

Request:

```json
{
  "claim": "GPT-4 achieves 87% on the HumanEval coding benchmark",
  "citation": "OpenAI, 2023",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

Response:

```json
{
  "claim": "GPT-4 achieves 87% on the HumanEval coding benchmark",
  "source_url": "https://arxiv.org/abs/2303.08774",
  "verdict": "incorrect",
  "confidence": "high",
  "what_claim_says": "GPT-4 achieves 87% on HumanEval",
  "what_paper_says": "GPT-4 achieves 67.0% on HumanEval (0-shot)",
  "correction": "GPT-4 achieves 67.0% on HumanEval, not 87%",
  "paper_title": "GPT-4 Technical Report",
  "arxiv_id": "2303.08774",
  "arxiv_url": "https://arxiv.org/abs/2303.08774",
  "explanation": "The source reports 67.0%, not 87%."
}
```

### `POST /check-paragraph`

Primary MVP endpoint.

Request:

```json
{
  "text": "In the report, GPT-4 achieves 67.0% on HumanEval. The report also introduced the Transformer architecture in 2017.",
  "source_url": "https://arxiv.org/abs/2303.08774",
  "citation_hint": "GPT-4 Technical Report (2023)"
}
```

Response:

```json
{
  "claims": [
    {
      "claim_id": 1,
      "original_span": "GPT-4 achieves 67.0% on HumanEval",
      "claim": "GPT-4 achieves 67.0% on HumanEval",
      "verdict": "confirmed",
      "confidence": "high",
      "what_claim_says": "GPT-4 achieves 67.0% on HumanEval",
      "what_paper_says": "GPT-4 achieves 67.0% on HumanEval in the 0-shot setting",
      "correction": null,
      "paper_title": "GPT-4 Technical Report",
      "arxiv_id": "2303.08774",
      "arxiv_url": "https://arxiv.org/abs/2303.08774",
      "explanation": "The source directly supports the claim."
    }
  ],
  "summary": {
    "confirmed": 1,
    "incorrect": 1
  },
  "corrected_text": "In the report, GPT-4 achieves 67.0% on HumanEval. The report references the Transformer architecture, which was introduced by Vaswani et al. in 2017.",
  "original_text": "In the report, GPT-4 achieves 67.0% on HumanEval. The report also introduced the Transformer architecture in 2017.",
  "claims_checked": 2
}
```

## Verification Flow

```text
POST /check-paragraph
  1. Validate text and source_url
  2. Determine Nia source type:
       arxiv.org URL  -> research_paper
       other URLs     -> documentation
  3. POST /sources to index the URL
  4. Poll GET /sources/{id} until ready
  5. Extract cited or clearly source-attributed factual claims from the paragraph
  6. For each extracted claim:
       a. POST /search against the indexed source
       b. classify verdict from claim + source findings
  7. Rewrite the paragraph conservatively from the verified outcomes
  8. Return claims, summary, corrected_text, original_text, claims_checked
```

## Verdict Definitions

- `confirmed`: the source directly supports the claim
- `incorrect`: the source discusses the topic and contradicts the claim
- `partially_correct`: part of the claim is supported and part is wrong
- `hallucinated_citation`: the claim is attributed to a source that says nothing relevant about it
- `unverifiable`: the source is relevant, but it does not provide enough detail to verify the claim

## Demo Test Set

Use `https://arxiv.org/abs/2303.08774`.

### Confirmed

```json
{
  "text": "In the report, GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting.",
  "source_url": "https://arxiv.org/abs/2303.08774",
  "citation_hint": "GPT-4 Technical Report (2023)"
}
```

### Incorrect

```json
{
  "text": "The GPT-4 Technical Report introduced the Transformer architecture in 2017.",
  "source_url": "https://arxiv.org/abs/2303.08774",
  "citation_hint": "GPT-4 Technical Report (2023)"
}
```

### Partially Correct

```json
{
  "text": "According to the GPT-4 Technical Report, GPT-4 is a Transformer-based model and achieves 87% on HumanEval in the 0-shot setting.",
  "source_url": "https://arxiv.org/abs/2303.08774",
  "citation_hint": "GPT-4 Technical Report (2023)"
}
```

### Hallucinated Citation

```json
{
  "text": "The GPT-4 Technical Report explains that there are 7 colors in a rainbow.",
  "source_url": "https://arxiv.org/abs/2303.08774",
  "citation_hint": "GPT-4 Technical Report (2023)"
}
```

### Unverifiable

```json
{
  "text": "The GPT-4 Technical Report states that GPT-4 was trained on 12 trillion tokens.",
  "source_url": "https://arxiv.org/abs/2303.08774",
  "citation_hint": "GPT-4 Technical Report (2023)"
}
```

## Environment Variables

```env
NIA_API_KEY=nk_...
GROQ_API_KEY=gsk_...
REQUEST_TIMEOUT_SECONDS=300
NIA_POLL_INTERVAL_SECONDS=2
MAX_CLAIMS=5
```

Frontend local config:

```env
VITE_API_URL=http://localhost:8000
```

## Project Structure

```text
backend/
  app/
    main.py
    schemas.py
    sourcecheck.py
    config.py
  main.py
  PRD-backend.md
  smoke_test.py

frontend/
  src/
    pages/Home.jsx
    components/
  README.md

PRD.md
README.md
```

## Local Run

Backend:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Known Limitations

- The product assumes one source URL for the whole paragraph.
- Claim extraction is prompt-based, so sentence splitting can vary.
- Very long passages may produce noisier extraction and rewrite behavior.
- First-time source indexing can be slow on uncached papers.
- Repeated automated smoke runs can hit Groq rate limits.
