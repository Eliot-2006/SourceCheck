export function PaperCard({ paper }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4
                    hover:border-gray-500 transition-colors">
      <div className="flex justify-between items-start gap-3 mb-2">
        <h3 className="text-sm font-medium text-white leading-snug flex-1">
          {paper.title}
        </h3>
        {paper.arxiv_id && (
          <span className="text-xs font-mono bg-blue-900 text-blue-300
                          px-2 py-1 rounded shrink-0">
            {paper.arxiv_id}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2">
        {paper.authors?.slice(0, 2).join(", ")}
        {paper.authors?.length > 2 ? " et al." : ""} · {paper.year}
      </p>
      <p className="text-xs text-gray-400 mb-3">{paper.relevance}</p>
      <div className="flex gap-3">
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noreferrer"
             className="text-xs text-blue-400 hover:text-blue-300 underline">
            → arXiv
          </a>
        )}
        {paper.arxiv_id && (
          <a href={`https://arxiv.org/pdf/${paper.arxiv_id}`} target="_blank" rel="noreferrer"
             className="text-xs text-blue-400 hover:text-blue-300 underline">
            → PDF
          </a>
        )}
      </div>
    </div>
  )
}
