import { useEffect } from "react"

const TEAM = [
  {
    name: "Piqim",
    role: "Fullstack Developer",
    img: "/team/dev1.jpg",
    initials: "PQ",
    github: "github.com/piqim",
    githubLabel: "@piqim",
    bio: "Fullstack developer on SourceCheck, focused primarily on frontend. Led the UI/UX implementation, interactive background, and verdict experience, while also contributing on backend-facing work including API usage patterns and early frontend-backend integration flow.",
  },
  {
    name: "Eliot",
    role: "Fullstack Developer",
    img: "/team/dev2.jpg",
    initials: "EL",
    github: "https://github.com/Eliot-2006",
    githubLabel: "@Eliot-2006",
    bio: "Fullstack developer on SourceCheck, focused primarily on backend. Built the Nia and Groq pipeline, claim extraction, and verification logic, while also supporting minor frontend implementation to keep product flow and presentation cohesive.",
  },
]

export default function About() {
  const normalizeGithubUrl = (url) =>
    url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
  }, [])

  return (
    <section className="min-h-[100svh] px-6 pt-32 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h1
            className="font-sentient leading-[1.1] tracking-tight"
            style={{ fontSize: "clamp(2.5rem, 6.5vw, 4.5rem)" }}
          >
            About <i className="font-light">the project</i>.
          </h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-5 font-mono text-sm leading-relaxed text-white/70 mb-24">
          <p>
            SourceCheck is a hackathon project built for the Nozomio Labs (Nia)
            track. It takes AI-generated research text, extracts every verifiable
            claim, and grounds each one against the actual papers — correcting
            wrong numbers, exposing hallucinated citations, and surfacing real
            related work.
          </p>
          <p>
            Our intention is simple: hallucinated citations and fabricated numbers
            are a widespread failure mode of modern LLMs, and no tool today
            verifies AI output claim-by-claim against primary sources. SourceCheck
            is our attempt at that tool — every verdict traces back to a real
            paper, retrieved by Nia, never recalled from training data.
          </p>
        </div>

        <div className="text-center mb-10">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/50">
            The Team
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {TEAM.map((p) => (
            <div
              key={p.name}
              className="rounded-2xl border border-white/10 bg-white/[0.03]
                         backdrop-blur-sm p-6 flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4
                              border border-white/15 bg-white/5 flex items-center
                              justify-center relative">
                <span className="absolute font-sentient text-2xl text-white/40">
                  {p.initials}
                </span>
                <img
                  src={p.img}
                  alt={p.name}
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => { e.currentTarget.style.display = "none" }}
                />
              </div>
              <div className="font-sentient text-xl">{p.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-1 mb-3">
                {p.role}
              </div>
              <p className="font-mono text-xs text-white/60 leading-relaxed">
                {p.bio}
              </p>
              <a
                href={normalizeGithubUrl(p.github)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 font-mono text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors"
              >
                {p.githubLabel}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
