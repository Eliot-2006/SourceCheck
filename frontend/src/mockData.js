const ENV_USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA
const DEFAULT_USE_MOCK_DATA = ENV_USE_MOCK_DATA == null ? false : ENV_USE_MOCK_DATA === "true"

// Mock mode is always disabled in production builds.
export const USE_MOCK_DATA = import.meta.env.PROD ? false : DEFAULT_USE_MOCK_DATA

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
