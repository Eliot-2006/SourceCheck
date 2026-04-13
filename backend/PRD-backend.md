# SourceCheck Backend PRD

## Overview

SourceCheck verifies a single research claim against a source URL provided by the user. Given a claim and the URL of the paper or article it is attributed to, SourceCheck indexes the source via Nia, searches it for the relevant content, and returns a structured verdict.

**Use case:** Verifying citations in essays, research summaries, and AI-generated text. The user provides a claim from the text and the URL from their works-cited page.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Python 3.11+ | Language |
| FastAPI | API framework |
| Uvicorn | ASGI server |
| httpx | Async HTTP client |
| python-dotenv | Env var management |
| pydantic v2 | Request/response validation |
| Nia API | Source indexing + search |
| Groq (llama-3.3-70b-versatile) | Verdict synthesis |

---

## API

### `POST /check`

**Request:**
```json
{
  "claim": "GPT-4 achieves 87% on the HumanEval coding benchmark",
  "citation": "OpenAI, 2023",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `claim` | string | yes | The specific assertion to verify |
| `citation` | string | no | Attribution hint (author, year, title) |
| `source_url` | string | yes | URL of the source to check against |

**Response:**
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
  "explanation": "The GPT-4 technical report reports 67.0%, not 87%."
}
```

| Field | Type | Description |
|---|---|---|
| `verdict` | enum | `confirmed`, `incorrect`, `hallucinated_citation`, `partially_correct`, `unverifiable` |
| `confidence` | enum | `high`, `medium`, `low` |
| `what_claim_says` | string\|null | The specific assertion made |
| `what_paper_says` | string\|null | What the source actually says |
| `correction` | string\|null | Corrected statement if claim is wrong |
| `paper_title` | string\|null | Title of the source |
| `arxiv_id` | string\|null | arXiv ID if applicable |
| `arxiv_url` | string\|null | arXiv URL if applicable |
| `explanation` | string | One-sentence verdict explanation |

### `GET /health`

```json
{ "status": "ok" }
```

---

## Verification Flow

```
POST /check
  1. Validate claim and source_url are non-empty
  2. Determine Nia source type:
       arxiv.org URL  →  type: "research_paper"
       all other URLs →  type: "documentation"
  3. POST /sources  →  index the URL
  4. Poll GET /sources/{id} until status: indexed | ready | complete
  5. POST /search with source_id + claim as query
  6. Groq: compare claim vs Nia findings → produce verdict JSON
  7. Return flat verdict response
```

---

## Nia API Usage

**Base URL:** `https://apigcp.trynia.ai/v2`
**Auth:** `Authorization: Bearer {NIA_API_KEY}`

### Index source
```
POST /sources
{ "type": "research_paper" | "documentation", "url": "<source_url>" }
```
Poll `GET /sources/{id}` until `status` is `indexed`, `ready`, or `complete`.

### Search source
```
POST /search
{
  "mode": "query",
  "messages": [{ "role": "user", "content": "<claim> <citation>" }],
  "data_sources": ["<source_id>"]
}
```

**Oracle is not used.** Zero Oracle quota consumed per request.

---

## Groq API Usage

**Base URL:** `https://api.groq.com/openai/v1`
**Model:** `llama-3.3-70b-versatile`

One call per request — verdict synthesis only. Groq is never asked to recall facts from training data. It only structures and compares what Nia returned.

---

## Environment Variables

```
NIA_API_KEY=your_nia_api_key_here
GROQ_API_KEY=your_groq_api_key_here
MAX_CLAIMS=5             # unused in current design, kept for config compatibility
REQUEST_TIMEOUT_SECONDS=300
NIA_POLL_INTERVAL_SECONDS=2
```

---

## Project Structure

```
backend/
  main.py                  # uvicorn entrypoint (re-exports app)
  requirements.txt
  .env.example
  PRD-backend.md           # this file
  smoke_test.py
  app/
    __init__.py
    main.py                # FastAPI app, routes
    config.py              # Settings dataclass
    schemas.py             # Pydantic request/response models
    sourcecheck.py         # SourceCheckService — all business logic
```

---

## Running Locally

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # fill in NIA_API_KEY and GROQ_API_KEY
uvicorn main:app --reload
```

Test at `http://localhost:8000/docs`.

---

## Demo Test

```json
{
  "claim": "GPT-4 achieves 87% on the HumanEval coding benchmark",
  "citation": "OpenAI, 2023",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

Expected: `verdict: "incorrect"` — source reports 67.0%, not 87%.
