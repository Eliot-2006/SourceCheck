## Inspiration

We kept running into the same problem whenever we used LLMs for research-heavy writing: the output looked convincing, but citations were often wrong, numbers were fabricated, and attributions were shaky. Manually checking each claim against real papers is slow and painful, especially under hackathon time pressure.

SourceCheck was inspired by that trust gap. We wanted a tool that does not just score text quality, but verifies factual claims against primary sources, claim by claim. Our goal was simple: if an AI says it, you should be able to immediately see whether it is true, false, or unsupported, with real papers attached.

## What it does

SourceCheck takes AI-generated research text and turns it into a structured verification report. It extracts verifiable claims, checks them against real papers through Nia, and returns verdicts such as confirmed, incorrect, hallucinated citation, or unsupported. For incorrect claims, it provides corrected information grounded in retrieved evidence.

It also surfaces related papers so users can continue reading from trustworthy sources. The result is a fast, readable flow: paste text, run check, review verdict cards, and open the source links directly.

## How we built it

We built SourceCheck as a full-stack app with a clear retrieval-first architecture.

- Frontend: React + Vite with a focused UX for input, loading stages, summary, verdict cards, and related-paper cards.
- Backend: FastAPI orchestrating claim extraction, retrieval, and verdict generation.
- Retrieval and grounding: Nia APIs for paper indexing, search, and Oracle research jobs.
- LLM synthesis: Groq used to structure outputs and verdicts from retrieved evidence, not to invent facts from model memory.

To keep velocity high, we developed in parallel: frontend was built against realistic mock responses while backend finalized the API contract. Integration was then a clean switch from mock data to live endpoint calls.

## Challenges we ran into

- Claim extraction consistency: AI-generated text varies a lot in style and citation format, so extracting clean, verifiable claims required careful prompt and schema design.
- Long-running retrieval: deeper research jobs can take time, so we had to design a loading experience that communicates progress clearly.
- Output reliability: LLM responses can include formatting noise, so we added strict JSON handling and defensive parsing.
- Hackathon tradeoffs: balancing breadth and reliability forced us to prioritize cited-claim verification as MVP while keeping uncited-claim verification as stretch.

## Accomplishments that we're proud of

- Built an end-to-end verifier that checks claims against real papers instead of relying on another LLM guess.
- Delivered a product flow that is easy to demo and easy to understand in under two minutes.
- Created verdict UX that makes errors actionable, with explicit corrections and source links.
- Coordinated full-stack collaboration quickly: one teammate primarily frontend with backend integration contributions, the other primarily backend with frontend support.

## What we learned

- Retrieval quality drives trust. Strong grounding is more important than flashy generation.
- Prompting is only part of the solution; schema discipline, fallback logic, and error handling matter just as much.
- Good product UX is critical for technical credibility. Users trust systems that explain their reasoning transparently.
- Parallel development with a stable API shape is one of the fastest ways to ship in hackathon constraints.

## What's next for SourceCheck

- Expand uncited-claim verification so unsupported assertions are automatically matched with supporting or refuting literature.
- Add inline annotation in the original text so each sentence is visibly marked as verified, corrected, or unsupported.
- Support more input types, including URLs, PDFs, and pasted bibliography blocks.
- Improve evidence traceability with richer citations and passage-level highlighting.
- Add user history and exportable reports so SourceCheck can fit real research and editorial workflows.
- Deploy production-ready backend and frontend with monitoring, stronger rate-limit handling, and better latency management.
