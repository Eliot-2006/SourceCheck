import { useEffect, useRef, useState } from "react"
import { VerdictCard } from "./components/VerdictCard"
import { PaperCard } from "./components/PaperCard"
import { SummaryBar } from "./components/SummaryBar"
import { LoadingState } from "./components/LoadingState"
import { Background } from "./components/Background"
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
  // Inverted: default background is the "focused/introspect" state.
  // Hovering the CTA briefly returns to the un-focused state.
  const [unfocus, setUnfocus] = useState(false)
  const [appInView, setAppInView] = useState(false)
  const appRef = useRef(null)

  const [text, setText] = useState("")
  const [topic, setTopic] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState("")

  useEffect(() => {
    const el = appRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setAppInView(entry.intersectionRatio > 0.15),
      { threshold: [0, 0.15, 0.3, 0.5] }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

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

  function scrollToApp() {
    appRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Particles "introspect" = focused/ambient. We want that as default,
  // and flip to un-focused when the user hovers the CTA.
  const particlesIntrospect = !unfocus

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <Background hovering={particlesIntrospect} />

      {/* Darkening overlay when main app is in view */}
      <div
        aria-hidden
        className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-700"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%)",
          opacity: appInView ? 1 : 0,
        }}
      />

      <main className="relative z-10">
        {/* ——— HERO ——— */}
        <section className="min-h-screen flex flex-col">
          <header className="container mx-auto flex items-center justify-between pt-8 md:pt-12 px-6">
            <div className="font-mono text-sm tracking-widest text-white/70">
              SOURCECHECK
            </div>
            <div className="font-mono text-xs uppercase" style={{ color: "var(--primary)" }}>
              Nozomio Labs · Nia
            </div>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-24">
            <div className="inline-flex items-center gap-2 mb-8 px-3 h-8 rounded-full
                            bg-white/5 border border-white/10 backdrop-blur-sm
                            font-mono text-xs text-white/60">
              <span className="inline-block w-2 h-2 rounded-full"
                    style={{ background: "var(--primary)", boxShadow: "0 0 8px var(--primary)" }} />
              HACKATHON BUILD
            </div>

            <h1 className="font-sentient text-5xl sm:text-6xl md:text-7xl leading-[1.05] tracking-tight max-w-4xl">
              Verify every claim.<br />
              <i className="font-light">Ground</i> every source.
            </h1>

            <p className="font-mono text-sm sm:text-base text-white/60 mt-8 max-w-[520px]">
              Paste AI-generated research text. SourceCheck finds the real papers,
              corrects the wrong numbers, and exposes the hallucinated citations.
            </p>

            <button
              onClick={scrollToApp}
              onMouseEnter={() => setUnfocus(true)}
              onMouseLeave={() => setUnfocus(false)}
              className="mt-14 px-7 h-12 rounded-md font-mono text-sm uppercase tracking-wider
                         border border-white/20 bg-white/5 hover:bg-white/10
                         backdrop-blur-sm transition-colors"
            >
              [ Check Sources ]
            </button>

            <div className="mt-16 font-mono text-[10px] tracking-widest text-white/30 uppercase">
              ↓  Scroll for app
            </div>
          </div>
        </section>

        {/* ——— MAIN APP ——— */}
        <section
          ref={appRef}
          className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-16"
        >
          <div className="w-full max-w-5xl rounded-2xl border border-white/10
                          bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/40
                          p-6 sm:p-10">

            <div className="mb-8">
              <h2 className="font-sentient text-4xl sm:text-5xl">
                <i className="font-light">Check</i> your sources
              </h2>
              <p className="text-white/60 mt-2 text-sm font-mono">
                Paste AI text below. Each claim is verified against real papers.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste any AI-generated text that makes research claims..."
                className="w-full h-44 bg-black/40 border border-white/10 rounded-xl
                           p-4 text-sm text-gray-200 resize-none focus:outline-none
                           focus:border-white/30 transition-colors font-mono backdrop-blur-sm"
              />
              <div className="flex gap-3 flex-wrap">
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Topic hint (optional)"
                  className="flex-1 min-w-[200px] bg-black/40 border border-white/10 rounded-xl
                             p-3 text-sm text-gray-200 focus:outline-none focus:border-white/30
                             transition-colors font-mono backdrop-blur-sm"
                />
                <button
                  onClick={() => {
                    setText(DEMO_TEXT)
                    setTopic("large language model reasoning")
                  }}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10
                             text-sm text-gray-300 transition-colors whitespace-nowrap font-mono"
                >
                  Load Demo
                </button>
                <button
                  onClick={handleCheck}
                  disabled={loading || !text.trim()}
                  className="px-6 py-3 rounded-xl bg-white text-black hover:bg-white/90
                             disabled:opacity-40 font-medium transition-colors
                             whitespace-nowrap font-mono"
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
                    <h3 className="font-semibold text-gray-200 font-mono text-sm uppercase tracking-wider">
                      Real Sources
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
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
        </section>
      </main>
    </div>
  )
}
