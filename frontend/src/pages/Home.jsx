import { useEffect, useRef, useState } from "react"
import { useLocation, useOutletContext } from "react-router-dom"
import { Modal } from "../components/Modal"
import { VerdictCard } from "../components/VerdictCard"
import { SummaryBar } from "../components/SummaryBar"
import { DEMO_CASES, getMockResultForInput, USE_MOCK_DATA } from "../mockData"

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "")

const LOADING_MESSAGES = [
  "🔗 Indexing source URL in Nia...",
  "🔎 Searching source for relevant evidence...",
  "🧠 Comparing claim against source findings...",
  "🧾 Finalizing grounded verdict...",
]

export default function Home() {
  const { setUnfocus } = useOutletContext()
  const location = useLocation()

  const heroRef = useRef(null)
  const inputRef = useRef(null)
  const resultsRef = useRef(null)

  const [text, setText] = useState("")
  const [topic, setTopic] = useState("")
  const [citation, setCitation] = useState("")
  const [urlError, setUrlError] = useState("")
  const [requestError, setRequestError] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState("")
  const [submittedInput, setSubmittedInput] = useState({ sourceUrl: "", citation: "" })
  const [demoModalOpen, setDemoModalOpen] = useState(false)

  function isValidUrl(s) {
    try {
      const u = new URL(s.trim())
      return u.protocol === "http:" || u.protocol === "https:"
    } catch {
      return false
    }
  }

  function normalizeResult(payload, claimText, sourceUrl) {
    if (payload && Array.isArray(payload.verdicts)) {
      return {
        ...payload,
        summary: payload.summary || {},
        claims_checked: payload.claims_checked ?? payload.verdicts.length,
        related_papers: Array.isArray(payload.related_papers) ? payload.related_papers : [],
      }
    }

    const verdictValue = payload?.verdict || "unverifiable"
    const normalizedVerdict = {
      ...payload,
      claim: payload?.claim || claimText,
      what_claim_says: payload?.what_claim_says || payload?.claim || claimText,
      input_type: payload?.input_type || (sourceUrl ? "cited" : "uncited"),
      verdict: verdictValue,
      confidence: payload?.confidence || "medium",
      explanation: payload?.explanation || "Verification complete.",
    }

    return {
      verdicts: [normalizedVerdict],
      summary: { [verdictValue]: 1 },
      claims_checked: 1,
      related_papers: Array.isArray(payload?.related_papers) ? payload.related_papers : [],
    }
  }

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
    const claimText = text.trim()
    const sourceUrl = topic.trim()
    const citationText = citation.trim()

    if (!sourceUrl) {
      setUrlError("Source URL is required.")
      return
    }

    if (!isValidUrl(sourceUrl)) {
      setUrlError("Please enter a valid URL starting with http:// or https://")
      return
    }

    setUrlError("")
    setRequestError("")
    setSubmittedInput({ sourceUrl, citation: citationText })

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

    try {
      if (USE_MOCK_DATA) {
        setResult(normalizeResult(getMockResultForInput(claimText, sourceUrl), claimText, sourceUrl))
        return
      }

      const requestBody = {
        claim: claimText,
        source_url: sourceUrl,
        ...(citationText ? { citation: citationText } : {}),
      }

      const res = await fetch(`${API_BASE}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `Request failed with status ${res.status}`)
      }

      const payload = await res.json()
      setResult(normalizeResult(payload, claimText, sourceUrl))
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Failed to verify claim")
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  function handleClear() {
    setText("")
    setTopic("")
    setCitation("")
    setUrlError("")
    setRequestError("")
    setResult(null)
    setLoading(false)
    setLoadingMsg("")
    setSubmittedInput({ sourceUrl: "", citation: "" })
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function loadDemoCase(sample) {
    setText(sample.claim)
    setTopic(sample.sourceUrl)
    setCitation(sample.citation || "")
    setUrlError("")
    setRequestError("")
    setDemoModalOpen(false)
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
            SDxUCSD HACKATHON BUILD
          </div>

          <h1 className="font-sentient leading-[1.05] tracking-tight max-w-4xl"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
            Verify every claim.<br />
            <i className="font-light">Ground</i> every source.
          </h1>

          <p className="font-mono text-sm sm:text-base text-white/60 mt-6 max-w-[520px]">
            Check one claim against one source. SourceCheck compares the claim to
            grounded evidence and returns a clear verdict.
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
            Enter a single claim, a required source URL, and an optional citation hint.
          </p>
        </div>

        <div className="w-full max-w-3xl mt-8 space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter a single claim to verify"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl
                       p-4 text-sm text-gray-100 resize-none focus:outline-none
                       focus:border-white/30 focus:bg-white/[0.05]
                       transition-all font-mono backdrop-blur-sm placeholder:text-white/30"
            style={{ height: "clamp(7rem, 22vh, 11rem)" }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block font-mono text-xs uppercase tracking-widest text-white/60 mb-2">
                Source URL (Required)
              </label>
              <input
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value)
                  if (urlError) setUrlError("")
                }}
                type="url"
                placeholder="https://arxiv.org/abs/2303.08774"
                className={`w-full bg-white/[0.03] border rounded-xl
                           px-4 py-3 text-sm text-gray-100 focus:outline-none
                           focus:bg-white/[0.05]
                           transition-all font-mono backdrop-blur-sm placeholder:text-white/30
                           ${urlError
                              ? "border-red-500/70 focus:border-red-500"
                              : "border-white/10 focus:border-white/30"}`}
              />
              {urlError && (
                <p className="mt-2 font-mono text-xs text-red-400/90 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                  {urlError}
                </p>
              )}
            </div>

            <div className="min-w-0">
              <label className="block font-mono text-xs uppercase tracking-widest text-white/60 mb-2">
                Citation Hint (Optional)
              </label>
              <input
                value={citation}
                onChange={(e) => setCitation(e.target.value)}
                type="text"
                placeholder="e.g. GPT-4 Technical Report (2023)"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl
                           px-4 py-3 text-sm text-gray-100 focus:outline-none
                           focus:border-white/30 focus:bg-white/[0.05]
                           transition-all font-mono backdrop-blur-sm placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              onClick={handleClear}
              disabled={loading || (!text && !topic && !citation && !result)}
              className="px-5 h-11 rounded-md font-mono text-sm uppercase tracking-wider
                         border border-white/15 bg-transparent hover:bg-white/5
                         text-white/60 hover:text-white/90
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors"
            >
              [ Clear ]
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

          {requestError && (
            <p className="text-center font-mono text-xs text-red-400/90">
              {requestError}
            </p>
          )}
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
              <div className="max-w-3xl mx-auto space-y-4">
                <SummaryBar summary={result.summary} total={result.claims_checked} />
                {result.verdicts.map((v, i) => <VerdictCard key={i} verdict={v} />)}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-white/60">
                    Source Context
                  </h3>
                  <p className="text-xs text-white/40 mt-1 font-mono">
                    URL used for this check:
                  </p>
                  <a
                    href={submittedInput.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-white/80 hover:text-white underline break-all"
                  >
                    {submittedInput.sourceUrl}
                  </a>
                  {submittedInput.citation && (
                    <p className="text-xs text-white/50 mt-3 font-mono">
                      Citation hint: {submittedInput.citation}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {USE_MOCK_DATA && (
        <>
          <button
            onClick={() => setDemoModalOpen(true)}
            className="fixed bottom-6 right-6 z-40 px-4 h-11 rounded-md
                       font-mono text-xs uppercase tracking-wider
                       border border-white/30 bg-black/70 hover:bg-black/85
                       text-white/85 hover:text-white backdrop-blur-sm transition-colors"
          >
            [ Demo Cases ]
          </button>

          <Modal open={demoModalOpen} onClose={() => setDemoModalOpen(false)}>
            <div className="space-y-4">
              <h3 className="font-sentient text-2xl leading-tight">
                Demo Cases
              </h3>
              <p className="font-mono text-xs text-white/60 uppercase tracking-widest">
                Quick-fill claim, source URL, and citation for mock testing
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEMO_CASES.map((sample) => (
                  <button
                    key={sample.label}
                    onClick={() => loadDemoCase(sample)}
                    disabled={loading}
                    className="w-full text-left px-4 py-3 rounded-lg
                               border border-white/15 bg-white/[0.02] hover:bg-white/[0.06]
                               text-white/85 disabled:opacity-30 disabled:cursor-not-allowed
                               transition-colors"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-widest text-white/60">
                      {sample.label}
                    </p>
                    <p className="text-sm mt-1 leading-snug">{sample.claim}</p>
                  </button>
                ))}
              </div>
            </div>
          </Modal>
        </>
      )}
    </>
  )
}
