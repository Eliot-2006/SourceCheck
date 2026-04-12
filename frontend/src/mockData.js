const ENV_USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA
const DEFAULT_USE_MOCK_DATA = ENV_USE_MOCK_DATA == null ? true : ENV_USE_MOCK_DATA === "true"

// Mock mode is always disabled in production builds.
export const USE_MOCK_DATA = import.meta.env.PROD ? false : DEFAULT_USE_MOCK_DATA

export const DEMO_SOURCE_URL = "https://arxiv.org/abs/2303.08774"

export const DEMO_CASES = [
  {
    label: "Confirmed",
    claim: "GPT-4 achieves 67.0% on the HumanEval coding benchmark in the 0-shot setting",
    sourceUrl: DEMO_SOURCE_URL,
    citation: "GPT-4 Technical Report (2023)",
  },
  {
    label: "Incorrect",
    claim: "The GPT-4 Technical Report introduced the Transformer architecture in 2017",
    sourceUrl: DEMO_SOURCE_URL,
    citation: "GPT-4 Technical Report (2023)",
  },
  {
    label: "Partially Correct",
    claim: "GPT-4 is a Transformer-based model and achieves 87% on HumanEval",
    sourceUrl: DEMO_SOURCE_URL,
    citation: "GPT-4 Technical Report (2023)",
  },
  {
    label: "Hallucinated Citation",
    claim: "There are 7 colors in a rainbow",
    sourceUrl: DEMO_SOURCE_URL,
    citation: "GPT-4 Technical Report (2023)",
  },
  {
    label: "Unverifiable",
    claim: "GPT-4 was trained on 12 trillion tokens",
    sourceUrl: DEMO_SOURCE_URL,
    citation: "GPT-4 Technical Report (2023)",
  },
]

const MOCK_RESULTS_BY_LABEL = {
  Confirmed: {
    claims_checked: 1,
    summary: { confirmed: 1 },
    verdicts: [
      {
        claim_id: 1,
        claim: DEMO_CASES[0].claim,
        input_type: "cited",
        verdict: "confirmed",
        confidence: "high",
        what_claim_says: "GPT-4 scores 67.0% on HumanEval (0-shot)",
        what_paper_says: "GPT-4 achieves 67.0% on HumanEval in 0-shot evaluation.",
        correction: null,
        paper_title: "GPT-4 Technical Report",
        arxiv_id: "2303.08774",
        arxiv_url: DEMO_SOURCE_URL,
        explanation: "The claim matches the source figure exactly.",
        original_text: DEMO_CASES[0].claim,
      },
    ],
    related_papers: [],
  },
  Incorrect: {
    claims_checked: 1,
    summary: { incorrect: 1 },
    verdicts: [
      {
        claim_id: 1,
        claim: DEMO_CASES[1].claim,
        input_type: "cited",
        verdict: "incorrect",
        confidence: "high",
        what_claim_says: "GPT-4 report introduced Transformers in 2017",
        what_paper_says: "The GPT-4 report does not introduce Transformers; the architecture predates this report.",
        correction: "The Transformer architecture was introduced in 2017 by Vaswani et al., not by the GPT-4 report.",
        paper_title: "GPT-4 Technical Report",
        arxiv_id: "2303.08774",
        arxiv_url: DEMO_SOURCE_URL,
        explanation: "The claim conflicts with established publication history and the cited report content.",
        original_text: DEMO_CASES[1].claim,
      },
    ],
    related_papers: [],
  },
  "Partially Correct": {
    claims_checked: 1,
    summary: { partially_correct: 1 },
    verdicts: [
      {
        claim_id: 1,
        claim: DEMO_CASES[2].claim,
        input_type: "cited",
        verdict: "partially_correct",
        confidence: "high",
        what_claim_says: "GPT-4 is Transformer-based and scores 87% on HumanEval",
        what_paper_says: "GPT-4 is Transformer-based, but reported HumanEval score is 67.0%, not 87%.",
        correction: "GPT-4 is Transformer-based and achieves 67.0% on HumanEval (0-shot).",
        paper_title: "GPT-4 Technical Report",
        arxiv_id: "2303.08774",
        arxiv_url: DEMO_SOURCE_URL,
        explanation: "One part of the claim is supported, while the metric is overstated.",
        original_text: DEMO_CASES[2].claim,
      },
    ],
    related_papers: [],
  },
  "Hallucinated Citation": {
    claims_checked: 1,
    summary: { hallucinated_citation: 1 },
    verdicts: [
      {
        claim_id: 1,
        claim: DEMO_CASES[3].claim,
        input_type: "cited",
        verdict: "hallucinated_citation",
        confidence: "high",
        what_claim_says: "A general rainbow fact is supported by GPT-4 technical report",
        what_paper_says: "The source is about large language model evaluation, not color theory.",
        correction: null,
        paper_title: "GPT-4 Technical Report",
        arxiv_id: "2303.08774",
        arxiv_url: DEMO_SOURCE_URL,
        explanation: "The cited source is unrelated to the claim.",
        original_text: DEMO_CASES[3].claim,
      },
    ],
    related_papers: [],
  },
  Unverifiable: {
    claims_checked: 1,
    summary: { unverifiable: 1 },
    verdicts: [
      {
        claim_id: 1,
        claim: DEMO_CASES[4].claim,
        input_type: "cited",
        verdict: "unverifiable",
        confidence: "medium",
        what_claim_says: "GPT-4 was trained on 12 trillion tokens",
        what_paper_says: "The source does not disclose a specific total training token count.",
        correction: null,
        paper_title: "GPT-4 Technical Report",
        arxiv_id: "2303.08774",
        arxiv_url: DEMO_SOURCE_URL,
        explanation: "The source is relevant but does not provide enough detail to verify the number.",
        original_text: DEMO_CASES[4].claim,
      },
    ],
    related_papers: [],
  },
}

const MOCK_CASE_LOOKUP = DEMO_CASES.reduce((acc, item) => {
  acc[item.claim.trim().toLowerCase()] = item.label
  return acc
}, {})

export const MOCK_RESULT = MOCK_RESULTS_BY_LABEL.Confirmed

export function getMockResultForInput(claim, sourceUrl) {
  const normalizedClaim = (claim || "").trim().toLowerCase()
  const label = MOCK_CASE_LOOKUP[normalizedClaim]

  if (label && sourceUrl?.trim() === DEMO_SOURCE_URL) {
    return MOCK_RESULTS_BY_LABEL[label]
  }

  return {
    claims_checked: 1,
    summary: { unverifiable: 1 },
    verdicts: [
      {
        claim_id: 1,
        claim,
        input_type: "cited",
        verdict: "unverifiable",
        confidence: "low",
        what_claim_says: claim,
        what_paper_says: "No matching demo mock found for this claim/source pair.",
        correction: null,
        paper_title: "GPT-4 Technical Report",
        arxiv_id: "2303.08774",
        arxiv_url: DEMO_SOURCE_URL,
        explanation: "Use one of the demo preset claims to get the expected demo verdict.",
        original_text: claim,
      },
    ],
    related_papers: [],
  }
}
