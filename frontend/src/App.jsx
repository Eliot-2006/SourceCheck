import { useState } from "react"
import { VerdictCard } from "./components/VerdictCard"
import { PaperCard } from "./components/PaperCard"
import { SummaryBar } from "./components/SummaryBar"
import { LoadingState } from "./components/LoadingState"
import { MOCK_RESULT } from "./mockData"

const DEMO_TEXT = `Recent advances in large language models have been remarkable.
GPT-4 achieves 87% on the HumanEval coding benchmark according to the GPT-4
technical report (OpenAI, 2023). Chain-of-thought prompting, first introduced
by OpenAI researchers in 2022, has significantly improved reasoning capabilities.
Large language models also demonstrate emergent abilities that appear suddenly
at scale. The original Transformer architecture was proposed in the landmark
paper "Attention Is All You Need" published in 2017 by Vaswani et al.`

const LOADING_MESSAGES = [
  "🔎 Extracting claims from text...",
  "📚 Indexing cited papers in Nia...",
  "🔬 Searching for actual findings...",
  "🧠 Comparing claims vs reality...",
  "📖 Finding real related papers...",
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

    // TODO (backend integration): replace this mock with a real fetch to
    // `${import.meta.env.VITE_API_URL}/check` once the backend is ready.
    await new Promise(r => setTimeout(r, 2000))
    setResult(MOCK_RESULT)

    clearInterval(interval)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-[70%] mx-auto">

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
              <h2 className="font-semibold text-gray-200">📖 Real Sources</h2>
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
