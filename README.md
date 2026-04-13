# SourceCheck

SourceCheck verifies research writing against a real source. Paste a paragraph, provide the source URL, and the app extracts claim-like statements, checks them against the source with Nia, and returns both a claim-by-claim audit and a corrected version of the paragraph.

## Overview

SourceCheck is a paragraph-level verification tool for source-backed writing. It is designed for cases where a paragraph cites or refers to a paper and the user wants to know which claims are actually supported by that source.

The current application:

- accepts one paragraph or short passage
- verifies it against one source URL
- extracts factual, source-attributed claims
- returns both structured verdicts and a corrected paragraph

## Core Capabilities

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

## Architecture

```text
Frontend
  -> collect paragraph, source URL, citation hint
  -> POST /check-paragraph
  -> render original text, corrected text, summary, and claim cards

Backend
  -> validate request
  -> index source with Nia
  -> extract claims
  -> search source per claim
  -> synthesize verdicts
  -> rewrite paragraph conservatively
```

## Project Structure

```text
SourceCheck/
  backend/
    app/
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

## Local Development

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
NIA_API_KEY=your_nia_api_key_here
GROQ_API_KEY=your_groq_api_key_here
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

## API Summary

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

## Example Test

Use this paragraph in the app with the GPT-4 source URL:

```text
A lot of technical reports are remembered for one or two headline facts, even though most of the document is really made up of setup, caveats, and evaluation framing. The GPT-4 Technical Report is similar in that sense: it spends a good amount of time explaining how the model is assessed and how its results should be interpreted. In the report, GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting. The report also introduced the Transformer architecture in 2017, which later became the basis for GPT models. It additionally presents chain-of-thought prompting as a reasoning method first created by OpenAI in 2022. Beyond those points, much of the paper has the familiar texture of a serious research report, where the surrounding prose often matters for context more than for any single standalone claim.
```

Expected shape:

- `3 claims checked`
- `1 confirmed`
- `2 incorrect`
- corrected paragraph rewrites only the wrong claims

## Security and Configuration

- API keys are read from environment variables.
- Local secret files such as `backend/.env` and `frontend/.env.local` are ignored by git.
- The repository contains placeholder values only in example config files and documentation.

## Smoke Test

With the backend running:

```bash
cd backend
SOURCECHECK_API_BASE=http://127.0.0.1:8000 python3 smoke_test.py
```

Note: repeated smoke runs can hit Groq rate limits.
