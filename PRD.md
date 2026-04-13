# Product Requirements Document: SourceCheck

## 1. Overview

### Product Name

SourceCheck

### One-Line Description

SourceCheck verifies source-attributed claims inside a paragraph against a real paper or article and returns both a claim-by-claim audit and a corrected version of the text.

### Product Summary

SourceCheck is a research-verification tool designed for essays, summaries, and AI-assisted writing. A user provides:

- a paragraph or short passage
- a source URL
- an optional citation hint

The system then:

1. indexes the source with Nia
2. extracts factual, source-attributed claims from the passage
3. verifies each extracted claim against the source
4. rewrites the paragraph conservatively using only grounded corrections

The current product is intentionally constrained to one source URL per check so the verification flow stays understandable, traceable, and reliable in a live demo.

## 2. Problem Statement

Research writing and AI-generated summaries frequently contain subtle factual errors that are difficult to detect quickly:

- wrong benchmark numbers
- incorrect attribution of ideas or methods
- claims attached to the wrong citation
- unsupported implementation details presented as fact

Most current tools either summarize sources or generate text, but they do not clearly separate:

- what the paragraph claims
- what the source actually says
- what should be corrected

SourceCheck addresses that gap by using retrieval from the cited source as the grounding layer and returning a structured verification result rather than an opaque summary.

## 3. Product Goals

### Primary Goals

- Verify source-attributed claims against a real source URL.
- Extract claims from a paragraph rather than requiring perfect one-line inputs.
- Show users exactly which claims are confirmed, incorrect, partially correct, hallucinated, or unverifiable.
- Produce a corrected paragraph that preserves the original writing where possible.

### Non-Goals

- Multi-source citation resolution
- Full essay workflows spanning many sources
- Reference management
- Accounts, saved history, collaboration, or authentication
- General-purpose summarization of a source

## 4. Target User

SourceCheck is aimed at users who need a quick trust check on source-backed writing:

- students reviewing essay paragraphs
- researchers checking AI-generated summaries
- hackathon judges evaluating groundedness
- writers validating claims against a single cited paper

## 5. User Story

As a user, I want to paste a paragraph and the source it relies on so I can see:

- which claims are actually supported
- which claims are wrong or overstated
- how the paragraph should read after grounded corrections are applied

## 6. Product Scope

### In Scope

- one paragraph or short passage per request
- one source URL for the entire verification run
- optional citation hint to improve extraction or retrieval
- extracted factual claims with verdicts
- paragraph rewrite based on grounded corrections
- local development and demo usage

### Out of Scope

- verifying an entire paper or long essay end to end
- comparing a claim against multiple candidate sources
- automatic bibliography parsing
- automatic citation resolution from a works cited page
- deployment orchestration or hosting requirements as part of the product contract

## 7. Functional Requirements

### 7.1 Input Requirements

The system must accept:

- `text`: a paragraph or short passage
- `source_url`: the source to verify against
- `citation_hint` optional: a free-form reference hint such as paper title, author-year, or citation string

The system should reject empty text and empty source URLs.

### 7.2 Claim Extraction

The system must extract only factual, source-attributed, or clearly source-referential claims from the input paragraph.

The extraction stage should:

- ignore filler, framing, and non-factual prose
- preserve original wording where possible
- split compound factual statements when they are independently verifiable
- avoid inventing claims that are not present in the text

### 7.3 Claim Verification

Each extracted claim must be verified against the user-provided source URL through Nia retrieval.

The backend must:

- index the source URL if needed
- wait until the source is ready
- search the source using the extracted claim and optional citation hint
- pass only retrieved evidence into the verdict synthesis step

### 7.4 Verdict Classification

Each claim must return one of the following verdicts:

- `confirmed`
- `incorrect`
- `partially_correct`
- `hallucinated_citation`
- `unverifiable`

The response must also include:

- confidence level
- what the claim says
- what the paper says
- correction when source-grounded
- explanation
- source metadata when available

### 7.5 Paragraph Rewrite

The system must return a corrected version of the original paragraph.

The rewrite must:

- preserve original structure and tone where possible
- update only the claim spans that are clearly wrong and clearly correctable
- avoid adding unsupported facts
- leave unverifiable claims unchanged unless the verified output clearly warrants a neutral correction

## 8. Success Criteria

The MVP is successful if it can reliably demonstrate the following on known test cases:

- extract the correct claim spans from a paragraph with filler text
- classify obvious supported and contradicted claims correctly
- avoid fabricating corrections for unrelated or unsupported claims
- produce a corrected paragraph that is visibly better than the input
- run end to end in a live local demo using a real paper URL

## 9. Technical Approach

### Grounding Principle

Nia is the source-grounding layer. Groq is used only to:

- structure extracted claims
- compare claims to retrieved evidence
- rewrite text conservatively from verified outcomes

Groq should not be used as a free-recall fact source.

### Source Handling

The system supports two practical source types:

- `research_paper` for arXiv URLs
- `documentation` for other URLs

### Retrieval Strategy

For each paragraph verification request:

1. index source once
2. extract claims once
3. search source per extracted claim
4. synthesize verdict per claim
5. rewrite paragraph once from the verified claim set

## 10. System Architecture

```text
Frontend
  -> collects paragraph, source URL, citation hint
  -> calls POST /check-paragraph
  -> renders original text, corrected text, summary, and claim cards

Backend
  -> validates request
  -> indexes source via Nia
  -> extracts claims
  -> searches Nia per claim
  -> classifies verdicts with Groq
  -> rewrites paragraph with Groq
  -> returns structured response

External Services
  -> Nia for indexing and search
  -> Groq for extraction, verdict synthesis, and rewrite
```

## 11. API Contract

### `GET /health`

Response:

```json
{
  "status": "ok"
}
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

Primary paragraph-verification endpoint.

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

## 12. Verification Flow

```text
POST /check-paragraph
  1. Validate text and source_url
  2. Infer source type from URL
       arxiv.org -> research_paper
       otherwise -> documentation
  3. Index the source via POST /sources
  4. Poll the source until ready
  5. Extract factual, source-attributed claims from the paragraph
  6. For each extracted claim:
       a. search the indexed source
       b. synthesize a verdict from claim + retrieved evidence
  7. Build summary counts
  8. Rewrite the paragraph conservatively from verified outcomes
  9. Return structured paragraph response
```

## 13. Verdict Definitions

### Confirmed

The source directly supports the claim.

### Incorrect

The source discusses the same topic and directly contradicts the claim.

### Partially Correct

The claim contains a mix of supported and unsupported details.

### Hallucinated Citation

The claim is being attributed to a source that says nothing relevant about that claim.

### Unverifiable

The source is relevant to the topic, but it does not provide enough detail to confirm or refute the claim.

## 14. Frontend Specification

The frontend should provide:

- a large text area for paragraph input
- a required source URL field
- an optional citation hint field
- a clear submit action
- a results view with:
  - original text
  - corrected text
  - verdict summary counts
  - one card per extracted claim
  - source context section

The frontend should avoid presenting the product as a multi-source or whole-document checker.

## 15. Demo Test Set

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

### Mixed Long-Paragraph Demo

```json
{
  "text": "A lot of technical reports are remembered for one or two headline facts, even though most of the document is really made up of setup, caveats, and evaluation framing. The GPT-4 Technical Report is similar in that sense: it spends a good amount of time explaining how the model is assessed and how its results should be interpreted. In the report, GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting. The report also introduced the Transformer architecture in 2017, which later became the basis for GPT models. It additionally presents chain-of-thought prompting as a reasoning method first created by OpenAI in 2022. Beyond those points, much of the paper has the familiar texture of a serious research report, where the surrounding prose often matters for context more than for any single standalone claim.",
  "source_url": "https://arxiv.org/abs/2303.08774",
  "citation_hint": "GPT-4 Technical Report (2023)"
}
```

Expected high-level result:

- `3 claims checked`
- `1 confirmed`
- `2 incorrect`

## 16. Environment Variables

Backend:

```env
NIA_API_KEY=your_nia_api_key_here
GROQ_API_KEY=your_groq_api_key_here
REQUEST_TIMEOUT_SECONDS=300
NIA_POLL_INTERVAL_SECONDS=2
MAX_CLAIMS=5
```

Frontend:

```env
VITE_API_URL=http://localhost:8000
```

## 17. Project Structure

```text
SourceCheck/
  backend/
    app/
      __init__.py
      config.py
      main.py
      schemas.py
      sourcecheck.py
    .env.example
    main.py
    PRD-backend.md
    requirements.txt
    smoke_test.py
  frontend/
    public/
      favicon.svg
    src/
      assets/
      components/
        gl/
        Background.jsx
        Navbar.jsx
        PaperCard.jsx
        SummaryBar.jsx
        VerdictCard.jsx
      pages/
        About.jsx
        Home.jsx
      App.jsx
      index.css
      main.jsx
      mockData.js
    README.md
    package.json
  .gitignore
  PRD.md
  README.md
  desc-devpost.md
```

## 18. Local Development

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Backend docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

Run the app:

```bash
npm run dev
```

Frontend URL: `http://localhost:5173`

## 19. Testing

### Manual UI Test

1. Start backend and frontend locally.
2. Open the frontend.
3. Paste a known demo paragraph.
4. Provide the source URL.
5. Confirm the app returns:
   - extracted claims
   - summary counts
   - corrected paragraph

### Backend Smoke Test

With the backend running:

```bash
cd backend
SOURCECHECK_API_BASE=http://127.0.0.1:8000 python3 smoke_test.py
```

## 20. Security and Configuration Notes

- API keys are loaded from environment variables only.
- Local secret files such as `backend/.env` and `frontend/.env.local` are gitignored.
- The repository should only contain placeholder values in `.env.example` and documentation.
