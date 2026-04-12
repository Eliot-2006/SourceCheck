const CONFIG = {
  confirmed:             { icon: "✅", label: "CONFIRMED",         border: "border-green-700",  bg: "bg-green-950",  text: "text-green-400" },
  supported:             { icon: "✅", label: "SUPPORTED",         border: "border-green-700",  bg: "bg-green-950",  text: "text-green-400" },
  incorrect:             { icon: "❌", label: "INCORRECT",         border: "border-red-700",    bg: "bg-red-950",    text: "text-red-400" },
  refuted:               { icon: "❌", label: "REFUTED",           border: "border-red-700",    bg: "bg-red-950",    text: "text-red-400" },
  hallucinated_citation: { icon: "👻", label: "HALLUCINATED",      border: "border-purple-700", bg: "bg-purple-950", text: "text-purple-400" },
  partially_correct:     { icon: "⚠️",  label: "PARTIALLY CORRECT", border: "border-yellow-700", bg: "bg-yellow-950", text: "text-yellow-400" },
  needs_citation:        { icon: "❓", label: "NEEDS CITATION",    border: "border-yellow-700", bg: "bg-yellow-950", text: "text-yellow-400" },
  unverifiable:          { icon: "❔", label: "UNVERIFIABLE",      border: "border-gray-700",   bg: "bg-gray-900",   text: "text-gray-400" },
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
              <a href={verdict.arxiv_url} target="_blank" rel="noreferrer"
                 className="text-xs text-blue-400 hover:text-blue-300 underline">
                → arXiv
              </a>
            )}
            {verdict.arxiv_id && (
              <a href={`https://arxiv.org/pdf/${verdict.arxiv_id}`} target="_blank" rel="noreferrer"
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
