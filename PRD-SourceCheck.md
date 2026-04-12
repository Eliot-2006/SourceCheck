# PRD: SourceCheck — AI Research Claim Verifier
> Hackathon Project | Nozomio Labs (Nia) Track

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution](#3-solution)
4. [Goals & Success Metrics](#4-goals--success-metrics)
5. [Tech Stack](#5-tech-stack)
6. [System Architecture](#6-system-architecture)
7. [API Contract](#7-api-contract)
8. [Verification Flow](#8-verification-flow)
9. [Nia API Usage](#9-nia-api-usage)
10. [Groq API Usage](#10-groq-api-usage)
11. [Frontend Specification](#11-frontend-specification)
12. [Project Structure](#12-project-structure)
13. [Environment Variables](#13-environment-variables)
14. [Build & Run Instructions](#14-build--run-instructions)
15. [Deployment](#15-deployment)
16. [Demo Script](#16-demo-script)
17. [Known Limitations](#17-known-limitations)

---

## 1. Overview

**Project Name:** SourceCheck

**One-liner:** Enter a research claim and its source URL — SourceCheck indexes the paper via Nia, searches it for the actual findings, and returns a verdict on whether the claim is correct.

**Track:** Nozomio Labs (Nia)

**Core tech:** FastAPI · React (Vite) · Nia API (Indexing + Search) · Groq

**Team:** 2 people — backend and frontend split

**What it does:**
A user enters a single research claim (e.g. "GPT-4 achieves 87% on HumanEval") and the URL of the paper it's attributed to. SourceCheck indexes the source via Nia, searches it for the relevant content, and returns a structured verdict — confirmed, incorrect, hallucinated, partially correct, or unverifiable — along with what the paper actually says and a correction if the claim is wrong.

**Design principle:** Nia is the ground-truth retrieval layer. Groq only structures and compares what Nia returned — it is never asked to recall facts from training data.

---

## 2. Problem Statement

AI-generated research summaries, essays, and answers are full of errors that are nearly impossible to catch without expert domain knowledge:

- **Wrong numbers:** "GPT-4 achieves 87% on HumanEval" (real number: 67%)
- **Hallucinated citations:** Papers cited that don't exist, or exist but say something completely different
- **Wrong attribution:** "Chain-of-thought prompting was introduced by OpenAI" (it was Google Brain)

The core problem: there is no fast, reliable tool that takes a specific claim and its source and tells you, definitively, whether that claim is accurate — grounded in the actual paper, not another LLM's memory.

---

## 3. Solution

SourceCheck uses Nia as a retrieval layer to verify claims directly against their cited sources:

1. **Input** — User provides a single claim and the URL of the paper it's attributed to
2. **Index** — Nia indexes the source URL (arxiv paper or any web document)
3. **Search** — Nia searches the indexed source for content relevant to the claim
4. **Verdict** — Groq compares claim vs Nia's findings and produces a structured verdict
5. **Output** — Flat verdict JSON with what the claim says, what the paper actually says, a correction if wrong, and confidence level

**Zero Oracle quota consumed per request.** Nia's standard search (not Oracle) is used throughout.

---

## 4. Goals & Success Metrics

| Goal | Priority | Definition of Done |
|---|---|---|
| Single claim verified against source | **MVP** | Claim + URL produces a verdict with the actual paper finding |
| Nia is the retrieval layer | **MVP** | Every verdict traces back to a Nia index + search call |
| Corrections shown | **MVP** | Wrong claims show the real number/finding from the paper |
| Clean demo | **MVP** | Full check completes and renders (GPT-4 test: fast, new paper: ~2 min first index) |
| Deployed | **MVP** | Accessible at a public URL |

### Judging Criteria Targets

| Criterion | Max | Target |
|---|---|---|
| Effective use of Nia | 10 | 10 |
| Creative use of Nia | 10 | 9 |
| Useful product | 10 | 9 |
| **Total** | **30** | **28** |

---

## 5. Tech Stack

### Backend
| Tool | Purpose |
|---|---|
| Python 3.11+ | Language |
| FastAPI | API framework |
| Uvicorn | ASGI server |
| httpx | Async HTTP (Nia + Groq calls) |
| python-dotenv | Env var management |
| pydantic v2 | Request/response validation |

### Frontend
| Tool | Purpose |
|---|---|
| React 18 + Vite | UI framework + build tool |
| Tailwind CSS v3 | Styling |
| React Router v6 | Client-side routing |
| Three.js / WebGL | Animated particle background |

### External APIs
| API | Usage | Cost |
|---|---|---|
| Nia (`apigcp.trynia.ai/v2`) | Source indexing + search | Nia account |
| Groq (`api.groq.com`) | Verdict synthesis | Free, no card |

### Deployment
| Service | What |
|---|---|
| Railway | FastAPI backend |
| Vercel | React frontend |

---

## 6. System Architecture

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND (React)                   │
│                                                      │
│  Claim textarea + Source URL input                   │
│  → POST /check                                       │
│  → normalizeResult() wraps flat verdict for render   │
│  → VerdictCard · SummaryBar · PaperCard              │
└───────────────────────┬──────────────────────────────┘
                        │ POST /check
                        ▼
┌──────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI)                   │
│                                                      │
│  1. Validate claim + source_url                      │
│  2. Nia: POST /sources → index URL                   │
│  3. Nia: Poll GET /sources/{id} → wait for ready     │
│  4. Nia: POST /search → retrieve relevant passages   │
│  5. Groq: compare claim vs findings → verdict JSON   │
│  6. Return flat verdict response                     │
└───────────────┬──────────────────────┬───────────────┘
                │                      │
                ▼                      ▼
  ┌─────────────────────┐   ┌────────────────────┐
  │      NIA API        │   │     GROQ API       │
  │  POST /sources      │   │  /chat/completions │
  │  GET  /sources/{id} │   │  llama-3.3-70b     │
  │  POST /search       │   │                    │
  │                     │   │  Verdict synthesis │
  │  No Oracle used     │   │  only — never      │
  └─────────────────────┘   │  recalls facts     │
                             └────────────────────┘
```

---

## 7. API Contract

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
| `citation` | string | no | Attribution hint (author, year, title) — appended to search query |
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

## 8. Verification Flow

```
POST /check
  1. Validate claim and source_url are non-empty
  2. Determine Nia source type:
       arxiv.org URL  →  type: "research_paper"
       all other URLs →  type: "documentation"
  3. POST /sources → index the URL (60s timeout, 3 retries)
  4. Poll GET /sources/{id} until status: indexed | ready | complete | completed
     (2s interval, 240s max wait, 15s per poll request)
  5. POST /search with source_id + claim (+ citation if provided) as query
  6. Groq: compare claim vs Nia findings → produce verdict JSON
  7. Normalize verdict fields (null strings, invalid verdict values)
  8. Return flat verdict response
```

---

## 9. Nia API Usage

**Base URL:** `https://apigcp.trynia.ai/v2`
**Auth:** `Authorization: Bearer {NIA_API_KEY}`

### Index source
```
POST /sources
{ "type": "research_paper" | "documentation", "url": "<source_url>" }
```
Valid `type` values: `repository`, `documentation`, `research_paper`, `huggingface_dataset`, `local_folder`, `slack`, `google_drive`

Poll `GET /sources/{id}` until `status` is `indexed`, `ready`, `complete`, or `completed`.

### Search source
```
POST /search
{
  "mode": "query",
  "messages": [{ "role": "user", "content": "<claim>. <citation>" }],
  "data_sources": ["<source_id>"]
}
```

**Oracle is not used.** Zero Oracle quota consumed per request.

### Indexing notes
- Papers already in Nia's global cache (e.g. GPT-4 Technical Report) index in seconds
- First-time indexing of a new paper can take 2–4 minutes
- Subsequent requests for the same paper reuse the existing index and are fast

---

## 10. Groq API Usage

**Base URL:** `https://api.groq.com/openai/v1`
**Model:** `llama-3.3-70b-versatile`

One call per request — verdict synthesis only. Groq receives the claim, the source URL, and the text passages Nia found, then produces structured verdict JSON. It is never asked to recall facts from training data.

---

## 11. Frontend Specification

### Pages
- `/` — Home: hero section, claim input, results
- `/about` — About page

### Input (Home page)
- Textarea: single claim to verify
- URL input: source URL (optional in UI, required for useful verdict)
- Demo button: pre-fills GPT-4 HumanEval test case
- Check Sources button: disabled until claim is non-empty

### Results rendering
The backend returns a flat single-verdict object. The frontend `normalizeResult()` function wraps it into `{ verdicts: [...], summary: {...}, claims_checked: 1, related_papers: [] }` for the rendering components.

### Components
| Component | Purpose |
|---|---|
| `VerdictCard` | Renders a single verdict with claim/paper comparison, correction, arXiv links |
| `SummaryBar` | Shows counts by verdict type |
| `PaperCard` | Renders a related paper (currently unused — backend doesn't return related papers) |
| `Background` | Animated WebGL particle background |
| `Navbar` | Top navigation |
| `Modal` | Generic modal wrapper |

### Environment
```
VITE_API_URL=http://localhost:8000   # local dev
VITE_API_URL=https://<railway-url>  # production (set in Vercel)
```

---

## 12. Project Structure

```
SourceCheck/
  PRD-SourceCheck.md        # this file
  README.md
  .gitignore
  backend/
    main.py                 # uvicorn entrypoint
    requirements.txt
    .env.example
    PRD-backend.md          # backend-specific PRD
    app/
      __init__.py
      main.py               # FastAPI app, routes, CORS
      config.py             # Settings (pydantic-settings)
      schemas.py            # SourceCheckRequest / SourceCheckResponse
      sourcecheck.py        # SourceCheckService — all business logic
  frontend/
    index.html
    package.json
    vite.config.js
    tailwind.config.js
    src/
      main.jsx
      App.jsx               # Routes: / and /about
      index.css
      pages/
        Home.jsx            # Input form + results rendering
        About.jsx
      components/
        VerdictCard.jsx
        SummaryBar.jsx
        PaperCard.jsx
        Background.jsx
        Navbar.jsx
        Modal.jsx
        gl/                 # WebGL particle system
```

---

## 13. Environment Variables

### Backend (`backend/.env`)
```
NIA_API_KEY=nk_...
GROQ_API_KEY=gsk_...
REQUEST_TIMEOUT_SECONDS=300
NIA_POLL_INTERVAL_SECONDS=2
```

### Frontend (`frontend/.env.local`)
```
VITE_API_URL=http://localhost:8000
```

---

## 14. Build & Run Instructions

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # fill in NIA_API_KEY and GROQ_API_KEY
uvicorn main:app --reload
```
API available at `http://localhost:8000` — Swagger UI at `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
# create .env.local with VITE_API_URL=http://localhost:8000
npm run dev
```
UI available at `http://localhost:5173`

---

## 15. Deployment

### Backend → Railway
1. Connect GitHub repo to Railway
2. Set root directory to `backend/`
3. Add environment variables: `NIA_API_KEY`, `GROQ_API_KEY`
4. Railway auto-detects Python and runs uvicorn

### Frontend → Vercel
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend/`
3. Add environment variable: `VITE_API_URL=https://<railway-backend-url>`
4. Vercel auto-detects Vite

---

## 16. Demo Script

Load the demo button or manually enter:

**Claim:**
```
GPT-4 achieves 87% on the HumanEval coding benchmark
```

**Source URL:**
```
https://arxiv.org/abs/2303.08774
```

**Expected result:** `verdict: "incorrect"` — the GPT-4 Technical Report reports 67.0%, not 87%.

This paper is cached in Nia's global index and returns in seconds.

---

## 17. Known Limitations

| Limitation | Detail |
|---|---|
| First-time indexing is slow | New papers take 2–4 min for Nia to index. Subsequent requests are fast. |
| Source URL required | The frontend marks source URL as optional, but the backend returns 400 without one. A useful verdict requires a real source. |
| No related papers | Backend returns a flat verdict only — no related paper suggestions. `PaperCard` component exists but the sidebar shows "No related papers found". |
| Single claim only | One claim per request. Multi-claim batch checking is a future feature. |
| No caching layer | Every new request re-indexes (or reuses Nia's global cache). A source ID cache would eliminate duplicate indexing jobs. |
