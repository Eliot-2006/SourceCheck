import { useEffect, useRef, useState } from "react"
import { useLocation, useOutletContext } from "react-router-dom"
import { VerdictCard } from "../components/VerdictCard"
import { PaperCard } from "../components/PaperCard"
import { SummaryBar } from "../components/SummaryBar"
import { MOCK_RESULT } from "../mockData"

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

export default function Home() {
  const { setUnfocus } = useOutletContext()
  const location = useLocation()

  const heroRef = useRef(null)
  const inputRef = useRef(null)
  const resultsRef = useRef(null)

  const [text, setText] = useState("")
  const [topic, setTopic] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState("")

  // Handle navigation-hash: when arriving with #checker, scroll there
  useEffect(() => {
    const hash = location.hash.replace("#", "")
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }, [location])

  async function handleCheck() {
    setLoading(true)
    setResult(null)

    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })

    let i = 0
    setLoadingMsg(LOADING_MESSAGES[0])
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[i])
    }, 4000)

    // TODO (backend integration): replace this mock with a real fetch to
    // `${import.meta.env.VITE_API_URL}/check` once the backend is ready.
    await new Promise((r) => setTimeout(r, 2000))
    setResult(MOCK_RESULT)

    clearInterval(interval)
    setLoading(false)
  }

  function handleClear() {
    setText("")
    setTopic("")
    setResult(null)
    setLoading(false)
    setLoadingMsg("")
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const hasRun = loading || result !== null

  return (
    <>
      {/* ——— HERO ——— */}
      <section
        id="hero"
        ref={heroRef}
        className="snap-start min-h-[100svh] flex flex-col"
      >
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-10">
          <div className="inline-flex items-center gap-2 mb-6 px-3 h-8 rounded-full
                          bg-white/5 border border-white/10 backdrop-blur-sm
                          font-mono text-xs text-white/60">
            <span className="inline-block w-2 h-2 rounded-full"
                  style={{ background: "var(--primary)", boxShadow: "0 0 8px var(--primary)" }} />
            HACKATHON BUILD
          </div>

          <h1 className="font-sentient leading-[1.05] tracking-tight max-w-4xl"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
            Verify every claim.<br />
            <i className="font-light">Ground</i> every source.
          </h1>

          <p className="font-mono text-sm sm:text-base text-white/60 mt-6 max-w-[520px]">
            Paste AI-generated research text. SourceCheck finds the real papers,
            corrects the wrong numbers, and exposes the hallucinated citations.
          </p>

          <button
            onClick={() => inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            onMouseEnter={() => setUnfocus(true)}
            onMouseLeave={() => setUnfocus(false)}
            className="mt-10 px-7 h-12 rounded-md font-mono text-sm uppercase tracking-wider
                       border border-white/20 bg-white/5 hover:bg-white/10
                       backdrop-blur-sm transition-colors"
          >
            [ Get Started ]
          </button>

          <button
            onClick={() => inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            aria-label="Scroll to input"
            className="mt-10 font-mono text-[10px] tracking-widest text-white/30 hover:text-white/70
                       uppercase transition-colors cursor-pointer"
          >
            ↓  Scroll to begin
          </button>
        </div>
      </section>

      {/* ——— INPUT ——— */}
      <section
        id="checker"
        ref={inputRef}
        className="snap-start min-h-[100svh] flex flex-col items-center justify-center px-6 py-12"
      >
        <div className="w-full max-w-3xl text-center">
          <h2 className="font-sentient leading-[1.1] tracking-tight"
              style={{ fontSize: "clamp(2rem, 5.5vw, 3.75rem)" }}>
            Time to <i className="font-light">check</i><br />
            your sources.
          </h2>
          <p className="font-mono text-sm text-white/50 mt-4 max-w-md mx-auto">
            Paste your AI-generated text below. A topic hint helps us surface
            the most relevant related papers.
          </p>
        </div>

        <div className="w-full max-w-3xl mt-8 space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste AI-generated research text here…"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl
                       p-4 text-sm text-gray-100 resize-none focus:outline-none
                       focus:border-white/30 focus:bg-white/[0.05]
                       transition-all font-mono backdrop-blur-sm placeholder:text-white/30"
            style={{ height: "clamp(7rem, 22vh, 11rem)" }}
          />

          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            placeholder="Source or topic  ·  required  ·  e.g. arXiv:2303.08774 or large language model reasoning"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl
                       px-4 py-3 text-sm text-gray-100 focus:outline-none
                       focus:border-white/30 focus:bg-white/[0.05]
                       transition-all font-mono backdrop-blur-sm placeholder:text-white/30"
          />

          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              onClick={handleClear}
              disabled={loading || (!text && !topic && !result)}
              className="px-5 h-11 rounded-md font-mono text-sm uppercase tracking-wider
                         border border-white/15 bg-transparent hover:bg-white/5
                         text-white/60 hover:text-white/90
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors"
            >
              [ Clear ]
            </button>
            <button
              onClick={() => {
                setText(DEMO_TEXT)
                setTopic("large language model reasoning")
              }}
              disabled={loading}
              className="px-5 h-11 rounded-md font-mono text-sm uppercase tracking-wider
                         border border-white/15 bg-transparent hover:bg-white/5
                         text-white/70 hover:text-white
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors"
            >
              [ Load Demo ]
            </button>
            <button
              onClick={handleCheck}
              disabled={loading || !text.trim() || !topic.trim()}
              className="px-6 h-11 rounded-md font-mono text-sm uppercase tracking-wider
                         border border-white/40 bg-white text-black
                         hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors"
            >
              {loading ? "[ Checking… ]" : "[ Check Sources ]"}
            </button>
          </div>
        </div>
      </section>

      {/* ——— RESULTS ——— */}
      {hasRun && (
        <section
          id="results"
          ref={resultsRef}
          className="snap-start min-h-[100svh] px-6 py-12"
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-sentient leading-[1.1] tracking-tight"
                  style={{ fontSize: "clamp(2rem, 5.5vw, 3.75rem)" }}>
                The <i className="font-light">verdict</i>.
              </h2>
              <p className="font-mono text-sm text-white/50 mt-4">
                Grounded in real papers · surfaced by Nia
              </p>
            </div>

            {loading && (
              <div className="max-w-xl mx-auto flex flex-col items-center gap-6 py-10">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
                  <div className="absolute inset-0 border-2 border-transparent border-t-white
                                  rounded-full animate-spin" />
                </div>
                <p className="font-mono text-xs tracking-widest uppercase text-white/50 text-center">
                  {loadingMsg || "Checking your sources…"}
                </p>
              </div>
            )}

            {result && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <SummaryBar summary={result.summary} total={result.claims_checked} />
                  {result.verdicts.map((v, i) => <VerdictCard key={i} verdict={v} />)}
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-mono text-xs uppercase tracking-widest text-white/60">
                      Real Sources
                    </h3>
                    <p className="text-xs text-white/40 mt-1 font-mono">
                      Every paper real · every link clickable
                    </p>
                  </div>
                  {result.related_papers.length > 0
                    ? result.related_papers.map((p, i) => <PaperCard key={i} paper={p} />)
                    : <p className="text-sm text-white/40">No related papers found</p>
                  }
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}
