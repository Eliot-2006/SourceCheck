# SourceCheck Next Steps
> Focus: improve the MVP in the remaining ~2 hours of coding time before demo recording

## Goal

Do not expand scope. Tighten the existing single-claim + source URL workflow so the demo is clearer, more reliable, and easier to present.

The best use of the remaining time is to:

- make the frontend match the real MVP exactly
- make backend verdict behavior more consistent
- reduce confusing output in edge cases
- prepare clean demo test cases

---

## Backend Workstream

### Highest Priority

#### 1. Tighten verdict boundaries

Current issue:
- `incorrect`, `hallucinated_citation`, and `unverifiable` are close and sometimes blur together

What to improve:
- `incorrect` should mean the source directly contradicts the claim
- `hallucinated_citation` should mean the source is clearly irrelevant to the claim
- `unverifiable` should mean the source is relevant but does not provide enough detail
- `partially_correct` should mean part of the claim is supported and part is wrong

Concrete backend task:
- refine the Groq system prompt in `backend/app/sourcecheck.py`
- make the definitions more explicit with short decision rules

#### 2. Reduce ungrounded corrections

Current issue:
- for unrelated claims, the model sometimes invents a correction using general world knowledge

What to improve:
- only provide `correction` when Nia findings clearly support it
- otherwise return `null`

Concrete backend task:
- update the verdict prompt to say:
  - never invent a correction from general knowledge
  - if the source does not support a correction, return `correction: null`

#### 3. Improve observability during demo testing

Current issue:
- if a request is slow or fails, it is harder to tell whether indexing, polling, search, or Groq caused it

What to improve:
- add clean logging around each stage:
  - source indexing started
  - source indexing completed
  - source search completed
  - verdict synthesis completed

Concrete backend task:
- add lightweight `print()` logs in `backend/app/sourcecheck.py`

### Medium Priority

#### 4. Sanitize response fields more defensively

Current issue:
- LLM output may still produce fields that are technically valid JSON but not ideal for the response contract

What to improve:
- normalize bad string placeholders like `"null"`, `"N/A"`, `""`
- ensure `confidence` and `verdict` values are always safe before returning

Concrete backend task:
- extend post-processing in `produce_verdict()`

#### 5. Better error messages for frontend display

Current issue:
- backend errors may be technically correct but not user-friendly

What to improve:
- return clearer `400/500/502/504` messages for:
  - missing source URL
  - Nia timeout
  - failed source indexing
  - failed search

Concrete backend task:
- review current `HTTPException` messages in `sourcecheck.py`

---

## Frontend Workstream

### Highest Priority

#### 1. Make the UI match the real MVP

Current issue:
- some UI copy still reflects the old batch-text product

What to improve:
- rename labels and helper text to reflect:
  - single claim input
  - required source URL
  - optional citation hint if added

Concrete frontend task:
- update copy in `frontend/src/pages/Home.jsx`
- remove references to “paste AI-generated research text” if they suggest multi-claim extraction

#### 2. Make source URL clearly required

Current issue:
- the UI currently implies the URL is optional, but backend requires it

What to improve:
- mark source URL as required
- block submission if it is empty
- show a clean inline error before the request is sent

Concrete frontend task:
- update validation in `Home.jsx`

#### 3. Add citation input

Current issue:
- backend already supports `citation`, but frontend does not expose it

What to improve:
- add an optional citation/attribution input field
- send it in the request payload

Concrete frontend task:
- add a third input in `Home.jsx`
- include `citation` in `fetch()` body

### Medium Priority

#### 4. Remove or hide stale related-paper UI

Current issue:
- sidebar still shows “No related papers found”
- backend no longer returns related papers as a product feature

What to improve:
- either remove the panel or replace it with something more useful:
  - source metadata
  - testing note
  - verdict explanation panel

Concrete frontend task:
- simplify the results layout if no related papers feature is planned for demo

#### 5. Improve loading states

Current issue:
- current loading messages still sound like the old product flow

What to improve:
- use messages like:
  - indexing source
  - searching source
  - comparing claim to source

Concrete frontend task:
- update `LOADING_MESSAGES` in `Home.jsx`

#### 6. Add one-click demo cases

Current issue:
- manual typing slows the demo and makes mistakes more likely

What to improve:
- add 3-5 quick-fill buttons for:
  - confirmed
  - incorrect
  - partially correct
  - hallucinated citation
  - unverifiable

Concrete frontend task:
- add a small sample-case section in `Home.jsx`

---

## Shared Demo Prep

### Demo-friendly claims using `https://arxiv.org/abs/2303.08774`

#### Confirmed

```json
{
  "claim": "GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

#### Incorrect

```json
{
  "claim": "The GPT-4 Technical Report introduced the Transformer architecture in 2017",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

#### Partially Correct

```json
{
  "claim": "GPT-4 is a Transformer-based model and achieves 87% on HumanEval",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

#### Hallucinated Citation

```json
{
  "claim": "There are 7 colors in a rainbow",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

#### Unverifiable

```json
{
  "claim": "GPT-4 was trained on 12 trillion tokens",
  "source_url": "https://arxiv.org/abs/2303.08774"
}
```

---

## Recommended Split For The Remaining Time

### Backend person

Focus on:

1. prompt tightening
2. grounded correction behavior
3. response normalization
4. better logs and error messages

### Frontend person

Focus on:

1. copy cleanup to match MVP
2. required URL validation
3. citation input
4. demo buttons / sample cases
5. remove stale related-paper expectations

---

## Suggested Order

### First 45 minutes

- frontend: align form and labels with MVP
- backend: tighten verdict prompt and correction rules

### Next 45 minutes

- frontend: add citation field and demo presets
- backend: improve normalization and logging

### Final 30 minutes

- run all demo test cases
- verify each verdict in the UI
- choose 2-3 strongest examples for recording

---

## Do Not Spend Time On

- deployment polish unless needed for recording
- user accounts
- persistence/history
- related papers expansion
- big UI redesigns
- major backend feature additions

The product is already working. The remaining time should go toward making the current path cleaner and more defensible.
