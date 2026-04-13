# SourceCheck

SourceCheck verifies research writing against a real source. Paste a paragraph, provide the source URL, and the app extracts claim-like statements, checks them against the source with Nia, and returns both a claim-by-claim audit and a corrected version of the paragraph.

## What It Does

- checks a paragraph against one source URL
- extracts factual, source-attributed claims
- labels each extracted claim as `confirmed`, `incorrect`, `partially_correct`, `hallucinated_citation`, or `unverifiable`
- rewrites the paragraph conservatively using grounded corrections

The current demo path is built around the GPT-4 Technical Report:

- source URL: `https://arxiv.org/abs/2303.08774`

## Stack

- frontend: React, Vite, Tailwind
- backend: FastAPI, httpx, Pydantic
- retrieval: Nia
- structured reasoning and rewrite: Groq

## Repo Layout

```text
backend/    FastAPI service and smoke tests
frontend/   React app
PRD.md      Current product requirements
```

## Run Locally

### 1. Start the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Add your keys to `backend/.env`:

```env
NIA_API_KEY=...
GROQ_API_KEY=...
```

Run the server:

```bash
uvicorn main:app --reload
```

Backend docs: `http://localhost:8000/docs`

### 2. Start the frontend

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

## API

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /check-paragraph`

Request:

```json
{
  "text": "In the report, GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting.",
  "source_url": "https://arxiv.org/abs/2303.08774",
  "citation_hint": "GPT-4 Technical Report (2023)"
}
```

Returns:

- extracted claims
- verdict summary
- corrected paragraph
- original paragraph

### `POST /check`

Legacy single-claim endpoint kept for compatibility.

## Quick Manual Test

Use this paragraph in the app with the GPT-4 source URL:

```text
A lot of technical reports are remembered for one or two headline facts, even though most of the document is really made up of setup, caveats, and evaluation framing. The GPT-4 Technical Report is similar in that sense: it spends a good amount of time explaining how the model is assessed and how its results should be interpreted. In the report, GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting. The report also introduced the Transformer architecture in 2017, which later became the basis for GPT models. It additionally presents chain-of-thought prompting as a reasoning method first created by OpenAI in 2022. Beyond those points, much of the paper has the familiar texture of a serious research report, where the surrounding prose often matters for context more than for any single standalone claim.
```

Expected shape:

- `3 claims checked`
- `1 confirmed`
- `2 incorrect`
- corrected paragraph rewrites only the wrong claims

## Smoke Test

With the backend running:

```bash
cd backend
SOURCECHECK_API_BASE=http://127.0.0.1:8000 python3 smoke_test.py
```

Note: repeated smoke runs can hit Groq rate limits.

## Current Limitations

- one source URL per paragraph
- prompt-based claim extraction and rewrite
- slower first runs for uncached papers
- no persistence or multi-source citation resolution
