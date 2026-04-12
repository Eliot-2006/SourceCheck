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
