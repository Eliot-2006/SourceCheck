# PRD: SourceCheck — AI Research Claim Verifier
> Hackathon Project | Nozomio Labs (Nia) Track

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution](#3-solution)
4. [Input Modes](#4-input-modes)
5. [Goals & Success Metrics](#5-goals--success-metrics)
6. [Tech Stack](#6-tech-stack)
7. [System Architecture](#7-system-architecture)
8. [API Integration](#8-api-integration)
9. [Backend Specification](#9-backend-specification)
10. [Frontend Specification](#10-frontend-specification)
11. [Data Flow](#11-data-flow)
12. [Project Structure](#12-project-structure)
13. [Team Collaboration Guide](#13-team-collaboration-guide)
14. [Environment Variables](#14-environment-variables)
15. [Build & Run Instructions](#15-build--run-instructions)
16. [Deployment](#16-deployment)
17. [Demo Script](#17-demo-script)
18. [Judging Criteria Alignment](#18-judging-criteria-alignment)
19. [Timeline (6 Hours, 2-Person Team)](#19-timeline-6-hours-2-person-team)
20. [Known Limitations & Risks](#20-known-limitations--risks)

---

## 1. Overview

**Project Name:** SourceCheck

**One-liner:** Paste any AI-generated research text — SourceCheck verifies every claim against real papers, corrects wrong numbers, exposes hallucinated citations, and suggests real sources.

**Track:** Nozomio Labs (Nia)

**Core tech:** FastAPI · React (Vite) · Nia API (Oracle + Search + Indexing) · Groq (free)

**Team:** 2 people — backend and frontend split. See Section 20 for the full collaboration guide.

**Duration:** 6 hours

**What it does:**
A user pastes AI-generated text containing research claims. SourceCheck extracts every verifiable claim, routes each one through Nia to find and search the actual papers, produces a verdict per claim (confirmed / incorrect / hallucinated / unsupported), corrects wrong claims with real numbers, and suggests additional real papers on the topic.

**MVP scope (6 hours):** Cited claims only (Path A). Path B (uncited claims) is a stretch goal — cut it if behind schedule, the demo works without it.

---

## 2. Problem Statement

AI-generated research summaries, blog posts, and answers are full of errors that are nearly impossible to catch without expert domain knowledge:

- **Wrong numbers:** "GPT-4 achieves 87% on HumanEval" (real number: 67%)
- **Hallucinated citations:** Papers cited that don't exist, or exist but say something completely different
- **Wrong attribution:** "Chain-of-thought prompting was introduced by OpenAI" (it was Google Brain)
- **Uncited claims:** Assertions stated as fact with no source, impossible to verify without a literature search

The core problem: there is no tool that takes AI-generated text and tells you, claim by claim, what's actually true — grounded in the real papers, not another LLM's training data.

---

## 3. Solution

SourceCheck uses Nia as the ground-truth retrieval layer:

1. **Extract** — Groq parses every verifiable claim from the pasted text, with or without citations
2. **Route** — Each claim takes one of two paths depending on whether a source is attached
3. **Retrieve** — Nia finds and searches the actual papers (not training data)
4. **Verdict** — Groq compares claim vs reality and produces a structured verdict
5. **Suggest** — Nia Oracle finds real additional papers on the topic that weren't cited

The key principle: **Nia does all retrieval. Groq only synthesizes what Nia found.** No hallucinations possible in the output because the LLM is never asked to recall facts from training — only to structure what Nia returned.

---

## 4. Input Modes

This is a core architectural decision. SourceCheck handles both claim types in a single flow.

### Path A — Claim With a Citation

> *"GPT-4 achieves 87% on HumanEval (OpenAI, 2023)"*
> *"Wei et al. (2022) showed that chain-of-thought prompting improves reasoning"*

We know a specific paper is being referenced. We check:
- Does this paper actually exist?
- Does it actually say this?
- Is the number/finding accurate?

**Nia path:** Index the specific paper via `POST /sources` → search it for the claim → produce verdict

**Possible verdicts:**
- ✅ **Confirmed** — paper exists, says exactly this
- ❌ **Incorrect** — paper exists but number/finding is wrong
- 👻 **Hallucinated Citation** — paper doesn't exist or says nothing like this
- ⚠️ **Partially Correct** — directionally right but details are off

---

### Path B — Claim Without a Citation *(Stretch Goal — build if time allows)*

> *"Large language models have shown remarkable reasoning capabilities"*
> *"Scaling laws suggest performance improves predictably with compute"*

No paper cited. Two things could be happening:
1. The AI stated a fact without citing anything
2. The AI hallucinated so hard it didn't even bother with a fake citation

**Nia path:** Oracle Research Agent searches arXiv for the claim → finds supporting/refuting papers → produce verdict

**Possible verdicts:**
- ✅ **Supported** — real papers back this up (with citations)
- ❌ **Refuted** — real papers contradict this
- ➕ **Needs Citation** — claim is real but uncited — here are the real sources
- ❓ **Unverifiable** — not enough evidence found either way

> **Why this is a stretch goal:** Oracle takes 1–3 min per claim. Under time pressure, Path A alone produces a complete, compelling demo. Add Path B only if Path A is solid and you have 90+ minutes left.

---

### Why Both Matter (when fully built)

Path A alone = citation checker (already exists, not creative).
Path B alone = fact-finder (hard to demo clearly).
**Both together** = a tool that works on any AI output, regardless of how well-cited it is. Most AI outputs mix cited and uncited claims freely, and no existing tool handles both in one pass.

---

## 5. Goals & Success Metrics

### Hackathon Goals

| Goal | Priority | Definition of Done |
|---|---|---|
| Cited claims verified (Path A) | **MVP** | Cited claims produce verdicts with arXiv links |
| Nia is the retrieval layer | **MVP** | Every verdict traces back to a Nia API call |
| Corrections shown | **MVP** | Wrong claims show the real number/finding |
| Related papers surface | **MVP** | At least 2 real clickable arXiv papers suggested |
| Clean demo | **MVP** | Full check completes and renders in under 3 minutes |
| Deployed | **MVP** | Accessible at a public URL |
| Uncited claims (Path B) | **Stretch** | Uncited claims also get verdicts via Oracle |
| Inline text annotation | **Stretch** | Color-code phrases in the original text |

### Judging Criteria Targets

| Criterion | Max | Target |
|---|---|---|
| Effective use of Nia | 10 | 10 |
| Creative use of Nia | 10 | 9 |
| Useful product | 10 | 9 |
| **Total** | **30** | **28** |

---

## 6. Tech Stack

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
| shadcn/ui | Component library |
| React Markdown | Render markdown in verdict cards |

### External APIs
| API | Usage | Cost |
|---|---|---|
| Nia (`apigcp.trynia.ai/v2`) | Paper indexing, search, Oracle research | Nia account |
| Groq (`api.groq.com`) | Claim extraction + verdict synthesis | Free, no card |

### Deployment
| Service | What |
|---|---|
| Railway | FastAPI backend |
| Vercel | React frontend |

---

## 7. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │   Text Input    │  │  Verdict Cards   │  │  Related   │  │
│  │  + Topic Hint   │  │  (per claim)     │  │  Papers    │  │
│  └─────────────────┘  └──────────────────┘  └────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │ POST /check
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                        │
│                                                              │
│  POST /check                                                 │
│    1. Groq: extract claims + classify (cited vs uncited)     │
│    2. For each claim (parallel):                             │
│       Path A (cited)   → Nia: index paper → search → verdict│
│       Path B (uncited) → Nia: Oracle → find papers → verdict│
│    3. Nia Oracle: find related real papers on topic          │
│    4. Return verdicts + corrections + related papers         │
└────────────────────┬─────────────────────┬───────────────────┘
                     │                     │
                     ▼                     ▼
        ┌────────────────────┐   ┌──────────────────────┐
        │    NIA API         │   │     GROQ API         │
        │                    │   │                      │
        │  POST /sources     │   │  /chat/completions   │
        │  GET  /sources/:id │   │  llama-3.3-70b       │
        │  POST /search      │   │                      │
        │  POST /oracle/jobs │   │  Used for:           │
        │  GET  /oracle/:id  │   │  - Claim extraction  │
        │                    │   │  - Verdict synthesis │
        │  Path A: index +   │   │  - Paper structuring │
        │  search paper      │   │                      │
        │                    │   │  Never recalls facts │
        │  Path B + related: │   │  from training —     │
        │  Oracle research   │   │  only structures     │
        │                    │   │  what Nia found      │
        └────────────────────┘   └──────────────────────┘
```

---

## 8. API Integration

### Nia API

**Base URL:** `https://apigcp.trynia.ai/v2`
**Auth:** `Authorization: Bearer {NIA_API_KEY}`

---

#### 8.1 Index a Paper (Path A)

```
POST /sources
```
```json
{ "type": "paper", "url": "https://arxiv.org/abs/2303.08774" }
```

Response:
```json
{ "id": "source-uuid-123", "status": "indexing" }
```

Poll `GET /sources/{id}` until `status` is `"indexed"` or `"ready"`.

---

#### 8.2 Search an Indexed Paper (Path A)

```
POST /search
```
```json
{
  "mode": "query",
  "messages": [{"role": "user", "content": "What score did GPT-4 achieve on HumanEval?"}],
  "data_sources": ["source-uuid-123"]
}
```

Returns relevant passages from the actual paper with section context.

---

#### 8.3 Oracle Research Agent (Path B + Related Papers)

```
POST /oracle/jobs
```
```json
{
  "query": "Find papers that support or refute: 'chain-of-thought prompting improves reasoning'. Report titles, authors, arXiv IDs, and key findings.",
  "mode": "deep"
}
```

Response:
```json
{ "job_id": "oracle-abc123", "status": "queued" }
```

Poll `GET /oracle/jobs/{job_id}` until `status === "complete"`.

**Oracle modes:**
| Mode | Speed | Use For |
|---|---|---|
| `deep` | 1–3 min | Uncited claims, related paper discovery |
| `quick` | 30–60s | Simple citation existence checks |

---

### Groq API

**Base URL:** `https://api.groq.com/openai/v1`
**Auth:** `Authorization: Bearer {GROQ_API_KEY}`
**Model:** `llama-3.3-70b-versatile`
**Format:** OpenAI-compatible

Used in three places — claim extraction, verdict synthesis, paper structuring.
**Critical rule:** Groq is never asked to recall facts. All facts come from Nia.

---

## 9. Backend Specification

### Endpoints

#### `POST /check`

**Request:**
```json
{
  "text": "GPT-4 achieves 87% on HumanEval (OpenAI, 2023). Chain-of-thought prompting was introduced by OpenAI...",
  "topic": "large language model reasoning"
}
```

**Response:**
```json
{
  "verdicts": [
    {
      "claim_id": 1,
      "claim": "GPT-4 achieves 87% on HumanEval",
      "input_type": "cited",
      "verdict": "incorrect",
      "confidence": "high",
      "what_claim_says": "GPT-4 scores 87% on HumanEval",
      "what_paper_says": "GPT-4 achieves 67.0% on HumanEval (0-shot)",
      "correction": "GPT-4 achieves 67.0% on HumanEval, not 87%",
      "paper_title": "GPT-4 Technical Report",
      "arxiv_id": "2303.08774",
      "arxiv_url": "https://arxiv.org/abs/2303.08774",
      "explanation": "The GPT-4 technical report reports 67.0%, not 87%."
    }
  ],
  "related_papers": [
    {
      "title": "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
      "authors": ["Jason Wei", "Xuezhi Wang"],
      "year": 2022,
      "arxiv_id": "2201.11903",
      "relevance": "Foundational paper on CoT prompting",
      "url": "https://arxiv.org/abs/2201.11903"
    }
  ],
  "summary": { "confirmed": 1, "incorrect": 1, "hallucinated_citation": 1 },
  "claims_checked": 3
}
```

#### `GET /health`
```json
{ "status": "ok" }
```

---

### Full Backend Code

```python
# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import asyncio
import os
import re
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SourceCheck API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

NIA_KEY = os.getenv("NIA_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")
NIA_BASE = "https://apigcp.trynia.ai/v2"
GROQ_BASE = "https://api.groq.com/openai/v1"
MAX_CLAIMS = 5


class SourceCheckRequest(BaseModel):
    text: str
    topic: str = ""


# ─── Shared helpers ───────────────────────────────────────────────────────────

def clean_json(raw: str) -> str:
    return re.sub(r'^```json\s*|^```\s*|```$', '', raw.strip(), flags=re.MULTILINE).strip()


async def groq_call(client: httpx.AsyncClient, messages: list, max_tokens: int = 1500) -> str:
    response = await client.post(
        f"{GROQ_BASE}/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_KEY}"},
        json={
            "model": "llama-3.3-70b-versatile",
            "max_tokens": max_tokens,
            "messages": messages
        }
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


async def nia_poll(
    client: httpx.AsyncClient,
    url: str,
    done_statuses: list,
    max_wait: int = 90
) -> dict:
    for _ in range(max_wait // 2):
        res = await client.get(url, headers={"Authorization": f"Bearer {NIA_KEY}"})
        res.raise_for_status()
        data = res.json()
        status = data.get("status", "")
        if status in done_statuses:
            return data
        if status == "error":
            raise HTTPException(500, f"Nia error: {data.get('error', 'unknown')}")
        await asyncio.sleep(2)
    raise HTTPException(504, "Nia timed out")


# ─── Step 1: Extract claims ───────────────────────────────────────────────────

async def extract_claims(client: httpx.AsyncClient, text: str) -> list[dict]:
    raw = await groq_call(client, [
        {
            "role": "system",
            "content": f"""Extract every verifiable claim from this text.
Return ONLY a valid JSON array (no markdown):
[
  {{
    "id": 1,
    "claim": "the specific verifiable assertion — be precise about numbers",
    "input_type": "cited or uncited",
    "citation": "paper title/author if mentioned, else null",
    "arxiv_id": "arXiv ID if explicitly mentioned (XXXX.XXXXX), else null",
    "original_text": "exact phrase from input containing this claim",
    "search_query": "best query to find this specific fact in a paper"
  }}
]

cited = references a specific paper, author, or source.
uncited = stated as fact with no source.
Cap at {MAX_CLAIMS} claims. Prioritize numerical claims and attributions."""
        },
        {"role": "user", "content": text}
    ])
    return json.loads(clean_json(raw))


# ─── Path A: Cited claims ─────────────────────────────────────────────────────

async def index_paper(client: httpx.AsyncClient, arxiv_id: str) -> str:
    res = await client.post(
        f"{NIA_BASE}/sources",
        headers={"Authorization": f"Bearer {NIA_KEY}"},
        json={"type": "paper", "url": f"https://arxiv.org/abs/{arxiv_id}"}
    )
    res.raise_for_status()
    source_id = res.json().get("id") or res.json().get("source_id")
    await nia_poll(
        client,
        f"{NIA_BASE}/sources/{source_id}",
        done_statuses=["indexed", "ready", "complete"]
    )
    return source_id


async def search_paper(client: httpx.AsyncClient, source_id: str, query: str) -> str:
    res = await client.post(
        f"{NIA_BASE}/search",
        headers={"Authorization": f"Bearer {NIA_KEY}"},
        json={
            "mode": "query",
            "messages": [{"role": "user", "content": query}],
            "data_sources": [source_id]
        }
    )
    res.raise_for_status()
    return json.dumps(res.json())[:2500]


async def verify_cited_claim(client: httpx.AsyncClient, claim: dict) -> str:
    arxiv_id = claim.get("arxiv_id")
    if arxiv_id:
        try:
            source_id = await index_paper(client, arxiv_id)
            return await search_paper(client, source_id, claim["search_query"])
        except Exception:
            pass  # fall through to Oracle

    # No arXiv ID or indexing failed — Oracle finds and verifies
    return await run_oracle(
        client,
        f"Find and verify this claim: '{claim['claim']}'. "
        f"{'Attributed to: ' + claim['citation'] if claim.get('citation') else ''} "
        f"Find the actual paper. Report the real number/finding with arXiv ID.",
        mode="deep"
    )


# ─── Path B: Uncited claims ───────────────────────────────────────────────────

async def verify_uncited_claim(client: httpx.AsyncClient, claim: dict) -> str:
    return await run_oracle(
        client,
        f"Find arXiv papers that support or refute: '{claim['claim']}'. "
        f"Report exact findings with title, authors, year, and arXiv ID. "
        f"Be explicit about whether papers support or contradict the claim.",
        mode="deep"
    )


# ─── Oracle helper ────────────────────────────────────────────────────────────

async def run_oracle(client: httpx.AsyncClient, query: str, mode: str = "deep") -> str:
    res = await client.post(
        f"{NIA_BASE}/oracle/jobs",
        headers={"Authorization": f"Bearer {NIA_KEY}"},
        json={"query": query, "mode": mode}
    )
    res.raise_for_status()
    job_id = res.json()["job_id"]
    result = await nia_poll(
        client,
        f"{NIA_BASE}/oracle/jobs/{job_id}",
        done_statuses=["complete"],
        max_wait=180
    )
    return result.get("report", "Oracle returned no findings")


# ─── Step 3: Produce verdicts ─────────────────────────────────────────────────

VERDICT_SYSTEM = """Compare a research claim against actual paper findings from Nia.
Return ONLY valid JSON (no markdown):
{
  "claim_id": <integer>,
  "verdict": "confirmed|incorrect|hallucinated_citation|partially_correct|supported|refuted|needs_citation|unverifiable",
  "confidence": "high|medium|low",
  "what_claim_says": "the specific assertion being made",
  "what_paper_says": "exact quote or close paraphrase from the real paper",
  "correction": "corrected statement if wrong, else null",
  "paper_title": "real paper title if found, else null",
  "arxiv_id": "real arXiv ID if found, else null",
  "arxiv_url": "https://arxiv.org/abs/ID if found, else null",
  "explanation": "one sentence verdict explanation"
}

Verdict guide:
confirmed/supported = claim matches reality
incorrect = claim is wrong (be exact about numbers)
hallucinated_citation = cited paper doesn't exist or doesn't say this
partially_correct = directionally right, details wrong
needs_citation = uncited claim is real but needs a source (provide one)
refuted = uncited claim contradicts real papers
unverifiable = not enough evidence found

NEVER guess facts. Only use what Nia found."""


async def produce_verdict(
    client: httpx.AsyncClient,
    claim: dict,
    nia_findings: str
) -> dict:
    raw = await groq_call(client, [
        {"role": "system", "content": VERDICT_SYSTEM},
        {
            "role": "user",
            "content": (
                f"Claim (id={claim['id']}, type={claim['input_type']}): "
                f"{claim['claim']}\n\n"
                f"Citation in text: {claim.get('citation', 'none')}\n\n"
                f"What Nia found in real papers:\n{nia_findings}"
            )
        }
    ], max_tokens=700)

    result = json.loads(clean_json(raw))
    result["original_text"] = claim.get("original_text", "")
    result["input_type"] = claim.get("input_type", "unknown")
    return result


# ─── Step 4: Related papers ───────────────────────────────────────────────────

async def find_related_papers(client: httpx.AsyncClient, topic: str) -> list[dict]:
    oracle_report = await run_oracle(
        client,
        f"Find the 3 most important recent arXiv papers about: {topic}. "
        f"For each: exact title, authors, year, arXiv ID, key finding in 2 sentences. "
        f"Only include papers with real verifiable arXiv IDs.",
        mode="deep"
    )

    raw = await groq_call(client, [
        {
            "role": "system",
            "content": """Structure these findings into a JSON array.
Return ONLY valid JSON array (no markdown):
[
  {
    "title": "exact paper title",
    "authors": ["Author One", "Author Two"],
    "year": 2023,
    "arxiv_id": "XXXX.XXXXX",
    "relevance": "one sentence on why this paper matters",
    "url": "https://arxiv.org/abs/XXXX.XXXXX"
  }
]
Only include papers whose arXiv IDs appear in the research report."""
        },
        {
            "role": "user",
            "content": f"Topic: {topic}\n\nNia Oracle found:\n{oracle_report}"
        }
    ])

    try:
        return json.loads(clean_json(raw))
    except Exception:
        return []


# ─── Main endpoint ────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/check")
async def source_check(req: SourceCheckRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text cannot be empty")

    async with httpx.AsyncClient(timeout=300) as client:

        # Step 1: Extract and classify all claims
        try:
            claims = await extract_claims(client, req.text)
        except Exception as e:
            raise HTTPException(500, f"Failed to extract claims: {str(e)}")

        if not claims:
            raise HTTPException(400, "No verifiable claims found in the text")

        # Step 2: Verify each claim (parallel)
        async def verify_one(claim: dict) -> dict:
            try:
                if claim["input_type"] == "cited":
                    nia_findings = await verify_cited_claim(client, claim)
                else:
                    nia_findings = await verify_uncited_claim(client, claim)
                return await produce_verdict(client, claim, nia_findings)
            except Exception as e:
                return {
                    "claim_id": claim["id"],
                    "claim": claim["claim"],
                    "input_type": claim["input_type"],
                    "verdict": "unverifiable",
                    "confidence": "low",
                    "explanation": f"Verification failed: {str(e)}",
                    "what_claim_says": claim["claim"],
                    "what_paper_says": None,
                    "correction": None,
                    "paper_title": None,
                    "arxiv_id": None,
                    "arxiv_url": None,
                    "original_text": claim.get("original_text", "")
                }

        topic = req.topic or req.text[:300]

        # Run claim verification + related paper search concurrently
        results = await asyncio.gather(
            asyncio.gather(*[verify_one(c) for c in claims[:MAX_CLAIMS]]),
            find_related_papers(client, topic),
            return_exceptions=True
        )

        verdicts = results[0] if not isinstance(results[0], Exception) else []
        related_papers = results[1] if not isinstance(results[1], Exception) else []

        # Summary stats
        summary = {}
        for v in verdicts:
            vtype = v.get("verdict", "unverifiable")
            summary[vtype] = summary.get(vtype, 0) + 1

        return {
            "verdicts": verdicts,
            "related_papers": related_papers,
            "summary": summary,
            "claims_checked": len(verdicts)
        }
```

```
# requirements.txt
fastapi
uvicorn[standard]
httpx
python-dotenv
pydantic
```

---

## 10. Frontend Specification

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER                                                      │
│  🔬 SourceCheck  —  "Verify AI research claims"              │
├──────────────────────────────────────────────────────────────┤
│  INPUT ZONE                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Paste AI-generated text here...                      │  │
│  └────────────────────────────────────────────────────────┘  │
│  [Topic hint]          [Load Demo]      [Check Sources]      │
├───────────────────────────────┬──────────────────────────────┤
│  LEFT — VERDICTS              │  RIGHT — REAL SOURCES        │
│                               │                              │
│  Summary bar                  │  📚 Real papers on topic     │
│  3 checked · 1 wrong          │                              │
│                               │  ┌──────────────────────┐   │
│  ┌─────────────────────────┐  │  │ Wei et al. (2022)    │   │
│  │ ❌ INCORRECT  high      │  │  │ "Chain-of-Thought…"  │   │
│  │ cited                   │  │  │ arXiv:2201.11903     │   │
│  │                         │  │  │ → arXiv  → PDF       │   │
│  │ Claim says:             │  │  └──────────────────────┘   │
│  │ 87% on HumanEval        │  │                              │
│  │                         │  │  ┌──────────────────────┐   │
│  │ Paper says:             │  │  │ Brown et al. (2020)  │   │
│  │ 67.0% (0-shot)          │  │  │ ...                  │   │
│  │                         │  │  └──────────────────────┘   │
│  │ Correction:             │  │                              │
│  │ GPT-4 scores 67.0%      │  │                              │
│  │ → arXiv:2303.08774      │  │                              │
│  └─────────────────────────┘  │                              │
│                               │                              │
│  ┌─────────────────────────┐  │                              │
│  │ 👻 HALLUCINATED  high   │  │                              │
│  │ cited                   │  │                              │
│  │ ...                     │  │                              │
│  └─────────────────────────┘  │                              │
└───────────────────────────────┴──────────────────────────────┘
```

---

### Design Notes

> Guidelines, not hard requirements — adjust for what looks good.

- **Aesthetic:** Dark mode, clinical and precise. Think Perplexity or Linear.
- **Color system:** Green (confirmed/supported), Red (incorrect/refuted), Purple (hallucinated), Yellow (partial/needs citation), Gray (unverifiable). Consistent across summary bar and cards.
- **Verdict cards:** Structured report feel, not a chat. Each card: status badge, claim vs paper comparison, correction block if wrong, source link.
- **Loading messages:** Cycle through what Nia is actually doing — makes the wait feel like real work.
- **Related papers:** Right column desktop, stacked below on mobile. Card per paper with arXiv badge and two clickable links.
- **"Load Demo" button:** Pre-fills the textarea with the demo text. Critical for the hackathon presentation.

---

### Component Breakdown

**`TextInput`** — large textarea, topic hint, Load Demo button, Check Sources button

**`LoadingState`** — cycles through messages:
- "🔍 Extracting claims from text..."
- "📄 Indexing cited papers in Nia..."
- "🔬 Searching for actual findings..."
- "🧠 Comparing claims vs reality..."
- "📚 Finding real related papers..."

**`SummaryBar`** — colored dot + count per verdict type, total claims checked

**`VerdictCard`** — status badge, confidence, input_type badge (cited/uncited), two-column comparison (claim says / paper says), correction block, source with arXiv links

**`PaperCard`** — title, authors + year, arXiv ID badge, relevance sentence, → arXiv and → PDF links

---

### Core App Logic

```jsx
// src/App.jsx
import { useState } from "react"
import { VerdictCard } from "./components/VerdictCard"
import { PaperCard } from "./components/PaperCard"
import { SummaryBar } from "./components/SummaryBar"
import { LoadingState } from "./components/LoadingState"

const DEMO_TEXT = `Recent advances in large language models have been remarkable.
GPT-4 achieves 87% on the HumanEval coding benchmark according to the GPT-4
technical report (OpenAI, 2023). Chain-of-thought prompting, first introduced
by OpenAI researchers in 2022, has significantly improved reasoning capabilities.
Large language models also demonstrate emergent abilities that appear suddenly
at scale. The original Transformer architecture was proposed in the landmark
paper "Attention Is All You Need" published in 2017 by Vaswani et al.`

const LOADING_MESSAGES = [
  "🔍 Extracting claims from text...",
  "📄 Indexing cited papers in Nia...",
  "🔬 Searching for actual findings...",
  "🧠 Comparing claims vs reality...",
  "📚 Finding real related papers...",
]

export default function App() {
  const [text, setText] = useState("")
  const [topic, setTopic] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState("")

  async function handleCheck() {
    setLoading(true)
    setResult(null)

    let i = 0
    setLoadingMsg(LOADING_MESSAGES[0])
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[i])
    }, 4000)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, topic })
      })
      if (!res.ok) throw new Error(await res.text())
      setResult(await res.json())
    } catch (err) {
      alert("Error: " + err.message)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-6xl mx-auto">

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">🔬 SourceCheck</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Paste AI-generated research text. We verify every claim against real papers.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste any AI-generated text that makes research claims..."
          className="w-full h-44 bg-gray-900 border border-gray-700 rounded-xl
                     p-4 text-sm text-gray-200 resize-none focus:outline-none
                     focus:border-blue-500 transition-colors"
        />
        <div className="flex gap-3">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Topic hint (optional) — helps find better related papers"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl
                       p-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              setText(DEMO_TEXT)
              setTopic("large language model reasoning")
            }}
            className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700
                       text-sm text-gray-300 transition-colors whitespace-nowrap"
          >
            Load Demo
          </button>
          <button
            onClick={handleCheck}
            disabled={loading || !text.trim()}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500
                       disabled:opacity-40 font-medium transition-colors whitespace-nowrap"
          >
            {loading ? "Checking..." : "Check Sources"}
          </button>
        </div>
      </div>

      {loading && <LoadingState message={loadingMsg} />}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SummaryBar summary={result.summary} total={result.claims_checked} />
            {result.verdicts.map((v, i) => <VerdictCard key={i} verdict={v} />)}
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-200">📚 Real Sources</h2>
              <p className="text-xs text-gray-500 mt-1">
                Found by Nia — every paper is real and clickable
              </p>
            </div>
            {result.related_papers.length > 0
              ? result.related_papers.map((p, i) => <PaperCard key={i} paper={p} />)
              : <p className="text-sm text-gray-500">No related papers found</p>
            }
          </div>
        </div>
      )}
    </div>
  )
}
```

```jsx
// src/components/VerdictCard.jsx
const CONFIG = {
  confirmed:             { icon: "✅", label: "CONFIRMED",         border: "border-green-700",  bg: "bg-green-950",  text: "text-green-400" },
  supported:             { icon: "✅", label: "SUPPORTED",         border: "border-green-700",  bg: "bg-green-950",  text: "text-green-400" },
  incorrect:             { icon: "❌", label: "INCORRECT",         border: "border-red-700",    bg: "bg-red-950",    text: "text-red-400" },
  refuted:               { icon: "❌", label: "REFUTED",           border: "border-red-700",    bg: "bg-red-950",    text: "text-red-400" },
  hallucinated_citation: { icon: "👻", label: "HALLUCINATED",      border: "border-purple-700", bg: "bg-purple-950", text: "text-purple-400" },
  partially_correct:     { icon: "⚠️",  label: "PARTIALLY CORRECT", border: "border-yellow-700", bg: "bg-yellow-950", text: "text-yellow-400" },
  needs_citation:        { icon: "➕", label: "NEEDS CITATION",    border: "border-yellow-700", bg: "bg-yellow-950", text: "text-yellow-400" },
  unverifiable:          { icon: "❓", label: "UNVERIFIABLE",      border: "border-gray-700",   bg: "bg-gray-900",   text: "text-gray-400" },
}

export function VerdictCard({ verdict }) {
  const cfg = CONFIG[verdict.verdict] || CONFIG.unverifiable
  const showCorrection = ["incorrect", "hallucinated_citation", "partially_correct", "refuted"]
    .includes(verdict.verdict) && verdict.correction

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.icon}</span>
          <span className={`font-bold text-sm ${cfg.text}`}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
            {verdict.confidence} confidence
          </span>
          <span className={`text-xs px-2 py-1 rounded ${
            verdict.input_type === "cited"
              ? "bg-blue-900 text-blue-300"
              : "bg-gray-800 text-gray-400"
          }`}>
            {verdict.input_type}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Claim says</p>
          <p className="text-sm text-gray-300">{verdict.what_claim_says}</p>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Paper actually says</p>
          <p className="text-sm text-white">{verdict.what_paper_says || "Not found"}</p>
        </div>
      </div>

      {showCorrection && (
        <div className="bg-black/30 rounded-lg p-3 mb-4 border-l-2 border-blue-500">
          <p className="text-xs text-blue-400 uppercase tracking-wide mb-1">Correction</p>
          <p className="text-sm text-gray-200">{verdict.correction}</p>
        </div>
      )}

      <p className="text-xs text-gray-500 mb-4">{verdict.explanation}</p>

      {verdict.paper_title && (
        <div className="border-t border-gray-700/50 pt-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{verdict.paper_title}</p>
            {verdict.arxiv_id && (
              <p className="text-xs text-gray-600 font-mono">arXiv:{verdict.arxiv_id}</p>
            )}
          </div>
          <div className="flex gap-3">
            {verdict.arxiv_url && (
              <a href={verdict.arxiv_url} target="_blank"
                 className="text-xs text-blue-400 hover:text-blue-300 underline">
                → arXiv
              </a>
            )}
            {verdict.arxiv_id && (
              <a href={`https://arxiv.org/pdf/${verdict.arxiv_id}`} target="_blank"
                 className="text-xs text-blue-400 hover:text-blue-300 underline">
                → PDF
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

```jsx
// src/components/SummaryBar.jsx
const COLORS = {
  confirmed: "bg-green-500", supported: "bg-green-500",
  incorrect: "bg-red-500",   refuted: "bg-red-500",
  hallucinated_citation: "bg-purple-500",
  partially_correct: "bg-yellow-500", needs_citation: "bg-yellow-500",
  unverifiable: "bg-gray-500",
}

export function SummaryBar({ summary, total }) {
  const entries = Object.entries(summary).filter(([, count]) => count > 0)
  return (
    <div className="bg-gray-900 rounded-xl p-4 flex items-center gap-4 flex-wrap">
      <span className="text-sm text-gray-400">{total} claim{total !== 1 ? "s" : ""} checked</span>
      {entries.map(([verdict, count]) => (
        <div key={verdict} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${COLORS[verdict] || "bg-gray-500"}`} />
          <span className="text-xs text-gray-300 capitalize">
            {count} {verdict.replace(/_/g, " ")}
          </span>
        </div>
      ))}
    </div>
  )
}
```

```jsx
// src/components/PaperCard.jsx
export function PaperCard({ paper }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4
                    hover:border-gray-500 transition-colors">
      <div className="flex justify-between items-start gap-3 mb-2">
        <h3 className="text-sm font-medium text-white leading-snug flex-1">
          {paper.title}
        </h3>
        {paper.arxiv_id && (
          <span className="text-xs font-mono bg-blue-900 text-blue-300
                          px-2 py-1 rounded shrink-0">
            {paper.arxiv_id}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2">
        {paper.authors?.slice(0, 2).join(", ")}
        {paper.authors?.length > 2 ? " et al." : ""} · {paper.year}
      </p>
      <p className="text-xs text-gray-400 mb-3">{paper.relevance}</p>
      <div className="flex gap-3">
        {paper.url && (
          <a href={paper.url} target="_blank"
             className="text-xs text-blue-400 hover:text-blue-300 underline">
            → arXiv
          </a>
        )}
        {paper.arxiv_id && (
          <a href={`https://arxiv.org/pdf/${paper.arxiv_id}`} target="_blank"
             className="text-xs text-blue-400 hover:text-blue-300 underline">
            → PDF
          </a>
        )}
      </div>
    </div>
  )
}
```

```jsx
// src/components/LoadingState.jsx
export function LoadingState({ message }) {
  return (
    <div className="flex items-center gap-3 bg-gray-900 rounded-xl p-4 mb-6">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent
                      rounded-full animate-spin shrink-0" />
      <p className="text-sm text-gray-300">{message}</p>
    </div>
  )
}
```

---

## 11. Data Flow

```
User pastes AI text + optional topic
          │
          ▼
POST /check { text, topic }
          │
          ▼
Groq: extract_claims()
  → [{id, claim, input_type: cited|uncited, arxiv_id?, citation?}]
          │
          ├─── For each claim (parallel, max 5) ──────────────────┐
          │                                                       │
          │  input_type == "cited"      input_type == "uncited"   │
          │         │                           │                 │
          │         ▼                           ▼                 │
          │  Nia: index paper           Nia Oracle: find papers   │
          │  Nia: search paper          that support/refute claim │
          │  for specific claim                 │                 │
          │         │                           │                 │
          │         └──────────────┬────────────┘                 │
          │                        ▼                              │
          │              Groq: produce_verdict()                  │
          │              → {verdict, correction, arxiv_url}       │
          │                                                       │
          └───────────────────────────────────────────────────────┘
          │
          │  Concurrently:
          ▼
Nia Oracle: find_related_papers(topic)
  → Groq: structure into paper objects
          │
          ▼
Return { verdicts, related_papers, summary, claims_checked }
          │
          ▼
Frontend renders:
  SummaryBar → VerdictCards → PaperCards
```

---

## 12. Project Structure

```
sourcecheck/
├── backend/              ← backend dev territory
│   ├── main.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/             ← frontend dev territory
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── mockData.js   ← frontend uses this until backend is ready
│   │   ├── index.css
│   │   └── components/
│   │       ├── VerdictCard.jsx
│   │       ├── PaperCard.jsx
│   │       ├── SummaryBar.jsx
│   │       └── LoadingState.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

---

## 13. Team Collaboration Guide

### Git Setup

```bash
# Person 1 (backend) creates the repo
git init sourcecheck
cd sourcecheck
mkdir backend frontend
git add . && git commit -m "init"
# push to GitHub, share URL with teammate

# Both work on separate branches
# Backend dev:
git checkout -b backend

# Frontend dev:
git checkout -b frontend
```

**Rule:** Backend dev only touches `backend/`. Frontend dev only touches `frontend/`. The only possible conflict is `README.md` — don't both edit it.

**Integration merge (hour 2:00–2:30):**
```bash
# One person does this:
git checkout main
git merge backend
git merge frontend   # zero conflicts guaranteed
git push origin main
```

---

### Frontend Mock Data

The frontend dev builds against hardcoded mock data from minute one. No waiting for the backend.

```js
// frontend/src/mockData.js
export const MOCK_RESULT = {
  claims_checked: 3,
  summary: {
    incorrect: 1,
    hallucinated_citation: 1,
    confirmed: 1
  },
  verdicts: [
    {
      claim_id: 1,
      claim: "GPT-4 achieves 87% on HumanEval",
      input_type: "cited",
      verdict: "incorrect",
      confidence: "high",
      what_claim_says: "GPT-4 scores 87% on HumanEval",
      what_paper_says: "GPT-4 achieves 67.0% on HumanEval (0-shot)",
      correction: "GPT-4 achieves 67.0% on HumanEval, not 87%",
      paper_title: "GPT-4 Technical Report",
      arxiv_id: "2303.08774",
      arxiv_url: "https://arxiv.org/abs/2303.08774",
      explanation: "The GPT-4 technical report reports 67.0%, not 87%.",
      original_text: "GPT-4 achieves 87% on the HumanEval coding benchmark"
    },
    {
      claim_id: 2,
      claim: "Chain-of-thought prompting was introduced by OpenAI",
      input_type: "cited",
      verdict: "hallucinated_citation",
      confidence: "high",
      what_claim_says: "OpenAI introduced chain-of-thought prompting",
      what_paper_says: "CoT prompting was introduced by Wei et al. at Google Brain",
      correction: "CoT was introduced by Wei et al. (2022) at Google Brain, not OpenAI",
      paper_title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
      arxiv_id: "2201.11903",
      arxiv_url: "https://arxiv.org/abs/2201.11903",
      explanation: "The attribution to OpenAI is incorrect.",
      original_text: "Chain-of-thought prompting, first introduced by OpenAI researchers in 2022"
    },
    {
      claim_id: 3,
      claim: "Attention Is All You Need was published in 2017 by Vaswani et al.",
      input_type: "cited",
      verdict: "confirmed",
      confidence: "high",
      what_claim_says: "Transformer paper published in 2017 by Vaswani et al.",
      what_paper_says: "Attention Is All You Need, Vaswani et al., NeurIPS 2017",
      correction: null,
      paper_title: "Attention Is All You Need",
      arxiv_id: "1706.03762",
      arxiv_url: "https://arxiv.org/abs/1706.03762",
      explanation: "Correct attribution and year.",
      original_text: "Attention Is All You Need published in 2017 by Vaswani et al."
    }
  ],
  related_papers: [
    {
      title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
      authors: ["Jason Wei", "Xuezhi Wang", "Dale Schuurmans"],
      year: 2022,
      arxiv_id: "2201.11903",
      relevance: "Foundational paper on chain-of-thought prompting",
      url: "https://arxiv.org/abs/2201.11903"
    },
    {
      title: "Language Models are Few-Shot Learners",
      authors: ["Tom Brown", "Benjamin Mann"],
      year: 2020,
      arxiv_id: "2005.14165",
      relevance: "Introduced GPT-3 and in-context learning",
      url: "https://arxiv.org/abs/2005.14165"
    }
  ]
}
```

Then in `App.jsx`, a single flag swaps between mock and real:

```js
// frontend/src/App.jsx — top of file
import { MOCK_RESULT } from "./mockData"

const USE_MOCK = true  // ← frontend dev sets this. flip to false at integration hour.

// inside handleCheck():
async function handleCheck() {
  setLoading(true)
  setResult(null)

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 2000))  // fake loading delay
    setResult(MOCK_RESULT)
    setLoading(false)
    return
  }

  // real fetch below — runs when USE_MOCK = false
  const res = await fetch(`${import.meta.env.VITE_API_URL}/check`, { ... })
  ...
}
```

**Integration moment (hour 2:00):** Backend dev messages: *"localhost:8000 is ready."* Frontend dev sets `USE_MOCK = false` and `VITE_API_URL=http://localhost:8000`. Done. One line change, zero merge conflicts.

---

## 14. Environment Variables

### Backend (`backend/.env`)

```env
NIA_API_KEY=nk_your_key_here
GROQ_API_KEY=gsk_your_key_here
```

- Nia key: https://app.trynia.ai
- Groq key: https://console.groq.com (free, no credit card)

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

Set to Railway backend URL in production.

---

## 15. Build & Run Instructions

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Add keys to .env
uvicorn main:app --reload --port 8000
```

Swagger UI at `http://localhost:8000/docs` — test here before touching the frontend.

### Quick curl test

```bash
curl -X POST http://localhost:8000/check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "GPT-4 achieves 87% on HumanEval (OpenAI, 2023). Chain-of-thought prompting was introduced by OpenAI in 2022.",
    "topic": "large language models"
  }'
```

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

Frontend at `http://localhost:5173`

---

## 16. Deployment

### Backend → Railway

```bash
npm install -g @railway/cli
railway login
cd backend && railway init && railway up
railway variables set NIA_API_KEY=nk_xxx
railway variables set GROQ_API_KEY=gsk_xxx
```

### Frontend → Vercel

```bash
echo "VITE_API_URL=https://your-backend.up.railway.app" > frontend/.env
cd frontend && npm run build
npx vercel --prod
```

> **Backup:** `ngrok http 8000` if Railway has issues during demo.

---

## 17. Demo Script

### Pre-Demo Checklist

- App open with demo text pre-loaded (Load Demo button)
- ChatGPT open in another tab
- `/health` endpoint pinged to wake Railway server
- Expected verdicts confirmed: 1 incorrect, 1 hallucinated, 1 confirmed

### Demo Text

```
Recent advances in large language models have been remarkable.
GPT-4 achieves 87% on the HumanEval coding benchmark according
to the GPT-4 technical report (OpenAI, 2023). Chain-of-thought
prompting, first introduced by OpenAI researchers in 2022, has
significantly improved reasoning capabilities. Large language
models also demonstrate emergent abilities that appear suddenly
at scale. The original Transformer architecture was proposed in
"Attention Is All You Need" published in 2017 by Vaswani et al.
```

### The 2-Minute Flow

**Step 1 — Show the problem (20s)**
Paste the demo text into ChatGPT: *"Are all the claims in this text accurate?"*
ChatGPT says yes, or gives a vague answer, or confirms the wrong 87% figure.

**Step 2 — Run SourceCheck (90s)**
Click Load Demo → Check Sources. While it runs:
*"Nia is indexing the actual papers and searching them right now — not using training data."*
Results load — show the ❌ card (87% → 67%), the 👻 card (CoT not by OpenAI), the ✅ card (Transformer paper).

**Step 3 — Click the link (10s)**
Click any arXiv link → the actual paper opens.
*"Every source is real. Nia found it."*

**Step 4 — Show uncited handling (20s) — only if Path B was built**
Point to the "emergent abilities" card — no citation in the original text.
It got a ➕ Needs Citation verdict with a real paper attached.
*"We don't just check citations — we ground claims that have no source at all."*
If Path B wasn't built, skip this step — the first three steps are enough.

---

### Expected Verdicts

| Claim | Verdict | Reason |
|---|---|---|
| GPT-4 achieves 87% on HumanEval | ❌ Incorrect | Real number is 67.0% |
| CoT prompting introduced by OpenAI | 👻 Hallucinated | Was Google Brain (Wei et al.) |
| Transformer paper 2017 Vaswani | ✅ Confirmed | Correct attribution |
| Emergent abilities at scale (no citation) | ➕ Needs Citation *(stretch)* | Real but uncited — only if Path B built |

---

## 18. Judging Criteria Alignment

### Effective Use of Nia (target: 10/10)

Uses three distinct Nia capabilities in one product:
- `POST /sources` + `GET /sources/:id` — paper indexing for cited claims
- `POST /search` — targeted search within indexed papers
- `POST /oracle/jobs` — deep research for uncited claims and related papers

Nia is the **only source of facts** — Groq never recalls from training data. The product cannot exist without Nia.

### Creative Use of Nia (target: 9/10)

- Handles both cited and uncited claims — no other tool does this in one pass
- Uses Oracle for grounding bare assertions, a non-obvious application
- The claim vs reality comparison format is a novel UX built on Nia's retrieval
- Addresses a widely-felt pain that directly demonstrates why Nia exists

### Useful Product (target: 9/10)

- Every person who has used ChatGPT for research has been burned by hallucinated citations
- Demo is immediately legible: wrong number, fake attribution, real correction, clickable source
- Works on any AI output — not scoped to a niche use case
- Load Demo button means judges can try it in 30 seconds

---

## 19. Timeline (6 Hours, 2-Person Team)

### API Contract — Agree on This First (Before Splitting)

Pin this somewhere both people can see before starting. This is the only thing you need to agree on. Once agreed, you never need to coordinate again until integration.

**`POST /check`**
```
Request:  { text: string, topic?: string }
Response: {
  verdicts: [{
    claim_id: number,
    claim: string,
    input_type: "cited" | "uncited",
    verdict: "confirmed" | "incorrect" | "hallucinated_citation" |
             "partially_correct" | "unverifiable",
    confidence: "high" | "medium" | "low",
    what_claim_says: string,
    what_paper_says: string | null,
    correction: string | null,
    paper_title: string | null,
    arxiv_id: string | null,
    arxiv_url: string | null,
    explanation: string,
    original_text: string
  }],
  related_papers: [{
    title: string,
    authors: string[],
    year: number,
    arxiv_id: string,
    relevance: string,
    url: string
  }],
  summary: { [verdict: string]: number },
  claims_checked: number
}
```

**`GET /health`**
```
Response: { status: "ok" }
```

---

### Hour-by-Hour Split

| Hour | Backend (you) | Frontend (teammate) |
|---|---|---|
| 0:00–0:30 | Create repo, set up venv, install deps, get uvicorn running, set env vars | Clone repo, `npm create vite`, install Tailwind + shadcn, get dev server running |
| 0:30–1:00 | Test Nia paper indexing + search in curl. Confirm Oracle working. | Build layout skeleton + all components against mock data (`USE_MOCK = true`) |
| 1:00–2:00 | Build `/check` endpoint end-to-end for cited claims. Test in Swagger UI with demo text. | Finish VerdictCard, SummaryBar, PaperCard, LoadingState — all looking good on mock data |
| **2:00–2:30** | **🤝 Integration** — message teammate "ready at localhost:8000". Both test together. Fix any shape mismatches. | **🤝 Integration** — flip `USE_MOCK = false`, point at localhost:8000, flag any issues |
| 2:30–3:30 | Add related papers via Oracle. Harden error handling, timeouts, fallbacks. | Polish: loading messages, Load Demo button, arXiv links, responsive layout |
| 3:30–4:30 | Test all demo claims thoroughly. Fix Nia edge cases. Add Path B if ahead. | Styling pass. Empty states, error states, mobile layout. |
| 4:30–5:15 | Deploy to Railway. Set env vars. Smoke test `/health` + `/check` on prod URL. | Deploy to Vercel. Update `VITE_API_URL` to Railway URL. Smoke test full flow on prod. |
| 5:15–6:00 | Both: run demo script 3x on prod URL. Confirm all expected verdicts correct. Fix anything broken. | Both: prep the pitch. Practice the ChatGPT before/after comparison. |

---

### If Ahead of Schedule (add in this order)

1. Path B — uncited claim handling via Oracle
2. Inline text annotation (color-code phrases in original text)
3. Session history of past checks
4. URL input support (paste a URL, fetch + check)

### If Behind Schedule (cut in this order)

1. Cut related papers panel — just show verdicts
2. Cut Path B entirely (it's already a stretch goal)
3. Skip Railway — use `ngrok http 8000` and update `VITE_API_URL` to the ngrok URL

---

## 20. Known Limitations & Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Oracle takes >3 min per claim | Medium | Cap at 5 claims, run in parallel, loading messages mask wait |
| arXiv paper indexing fails | Low | Fallback to Oracle already in code |
| Groq JSON parse fails | Low | `clean_json()` strips fences, try/except per claim |
| Nia Oracle returns empty report | Low | Returns "unverifiable" verdict — graceful degradation |
| Demo text produces unexpected verdicts | Medium | Test night before, have backup claims ready |
| Railway cold start during demo | Medium | Ping `/health` before going on stage |
| Groq rate limit | Very Low | Free tier is 14,400 req/day |
| CORS issues in production | Low | `allow_origins=["*"]` covers hackathon use |
| Merge conflict between teammates | Very Low | Backend only touches `backend/`, frontend only touches `frontend/` — zero overlap |
| Integration breaks at hour 2 | Low | Mock data is structurally identical to real response — flip `USE_MOCK` flag and it works |

---

*Built for the Nozomio Labs track. Powered by Nia (indexing + search + Oracle). Synthesis by Groq (free tier).*
