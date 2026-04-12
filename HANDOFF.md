# SourceCheck — Handoff Notes
> Last updated: 2026-04-12

## Current State

Backend and frontend are **merged into `main` and pushed to GitHub**. The product works end-to-end locally but has not been deployed yet.

---

## What Is Complete

- **Backend:** `POST /check` and `GET /health` fully working. Single claim + source URL → verdict from Nia + Groq. Tested and passing.
- **Frontend:** React + Vite app with hero, claim input, results section (VerdictCard, SummaryBar), WebGL particle background, real fetch wired to backend. Demo button pre-fills the GPT-4 test case.
- **Branches merged:** `backend` and `frontend-dev` both merged into `main` on GitHub.
- **PRDs updated:** `PRD-SourceCheck.md` (root) and `backend/PRD-backend.md` both reflect current design.

---

## What Is NOT Done (Next Steps)

### 1. Deploy backend to Railway
- Connect GitHub repo to Railway
- Set root directory to `backend/`
- Add env vars: `NIA_API_KEY`, `GROQ_API_KEY`
- Railway auto-detects Python and runs uvicorn

### 2. Deploy frontend to Vercel
- Connect GitHub repo to Vercel
- Set root directory to `frontend/`
- Add env var: `VITE_API_URL=https://<your-railway-url>`
- Vercel auto-detects Vite

### 3. Smoke test on live URLs
Run the demo test case (see below) against the deployed Railway + Vercel URLs.

---

## Demo Test Case (always works fast)

```json
{
  "claim": "GPT-4 achieves 87% on the HumanEval coding benchmark",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

Expected: `verdict: "incorrect"` — the GPT-4 Technical Report reports 67.0%, not 87%.

This paper is cached in Nia's global index so it returns in seconds.

---

## Verdict Testing Guide

These examples reflect the current MVP behavior when testing against:

```json
{
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

The current backend is best understood as follows:

- `confirmed` = the paper directly supports the claim
- `incorrect` = the paper discusses the topic, but the claim gets the details wrong
- `partially_correct` = one part is right, another part is wrong
- `hallucinated_citation` = the claim is being attributed to a source that says nothing about that topic
- `unverifiable` = the paper is relevant, but does not provide enough specific detail to verify the claim

### What kinds of claims trigger each verdict

| Verdict | Claim pattern | Example |
|---|---|---|
| `confirmed` | Supported by the paper | `GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting` |
| `incorrect` | Same topic, wrong number / attribution / conclusion | `The GPT-4 Technical Report introduced chain-of-thought prompting in 2022` |
| `partially_correct` | Mixed true + false details | `GPT-4 is a Transformer-based model and achieves 87% on HumanEval` |
| `hallucinated_citation` | Totally unrelated claim attributed to the paper | `There are 3 letters in the word cat` |
| `unverifiable` | Plausible GPT-4 claim, but the paper withholds or omits the needed detail | `GPT-4 was trained on 12 trillion tokens` |

### Practical boundary between `incorrect`, `hallucinated_citation`, and `unverifiable`

- Use `incorrect` when the paper talks about the same subject area and provides evidence that contradicts the claim.
- Use `hallucinated_citation` when the claim is clearly unrelated to the paper and the source says nothing like it.
- Use `unverifiable` when the claim is plausibly about GPT-4, but the report does not expose the necessary training, architecture, deployment, or operational detail.

### Good local test claims

#### `confirmed`

```json
{
  "claim": "GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

#### `incorrect`

```json
{
  "claim": "The GPT-4 Technical Report introduced the Transformer architecture in 2017",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

#### `partially_correct`

```json
{
  "claim": "GPT-4 is a Transformer-based model and achieves 87% on HumanEval",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

#### `hallucinated_citation`

```json
{
  "claim": "There are 7 colors in a rainbow",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

#### `unverifiable`

```json
{
  "claim": "GPT-4 was trained on 12 trillion tokens",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

```json
{
  "claim": "GPT-4 was trained for 90 days on 25,000 A100 GPUs",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

### Known behavior from current prompt

- `hallucinated_citation` and `unverifiable` are close categories. The difference is prompt-based, not enforced by hard rules.
- Very unrelated claims tend to become `hallucinated_citation`.
- Plausible but withheld implementation details tend to become `unverifiable`.
- The model may sometimes generate an ungrounded `correction` for unrelated claims. Treat the verdict label as more reliable than the correction text in those cases.

---

## Known Issues / Limitations

| Issue | Detail |
|---|---|
| First-time indexing is slow | New papers take 2–4 min for Nia to index. The GPT-4 paper is fast because it's pre-cached. |
| Source URL marked optional in UI | Frontend allows submitting without a URL, but backend returns 400. Error shows inline. |
| No related papers | `PaperCard` component exists but backend doesn't return related papers — sidebar shows "No related papers found". |
| Duplicate Nia indexing jobs | If POST /sources retries, Nia may create multiple jobs for the same URL. Not harmful but wastes quota. |

---

## Critical Nia API Notes

- Poll done_statuses must include **`"completed"`** (with 'd') — not just `"complete"`
- Valid source types: `research_paper` (for arxiv), `documentation` (everything else). **Never use `"paper"`** — it's invalid.
- POST /sources uses `timeout=60` with 3 retries (`nia_post()` helper in `sourcecheck.py`)
- Poll GET requests use `timeout=15` with retry on timeout

---

## Running Locally

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
# → http://localhost:8000/docs
```

**Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:5173
# Needs frontend/.env.local with: VITE_API_URL=http://localhost:8000
```

---

## Branch Structure

| Branch | Contents |
|---|---|
| `main` | Merged backend + frontend (current) |
| `backend` | Backend source (merged into main) |
| `frontend-dev` | Frontend source (merged into main) |
