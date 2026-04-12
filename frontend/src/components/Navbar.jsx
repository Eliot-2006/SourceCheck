import { useLocation, useNavigate } from "react-router-dom"

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  // On the home page, scroll-by-hash. On other pages, navigate to / with the
  // hash — Home reads the hash on mount and scrolls there.
  const go = (hash) => {
    if (location.pathname === "/") {
      if (!hash) {
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    } else {
      navigate(hash ? `/#${hash}` : "/")
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30 pt-6 md:pt-8 px-6">
      <div className="container mx-auto flex items-start justify-between">
        <button
          onClick={() => go("")}
          className="text-left cursor-pointer"
          aria-label="SourceCheck home"
        >
          <div className="font-mono text-sm tracking-widest text-white/80">
            SOURCECHECK
          </div>
          <div
            className="font-mono text-[10px] uppercase tracking-widest mt-1"
            style={{ color: "var(--primary)" }}
          >
            Built with Nia · Nozomio Labs
          </div>
        </button>

        <nav className="flex items-center gap-6 md:gap-8 font-mono text-xs uppercase tracking-widest text-white/50">
          <button onClick={() => go("")} className="hover:text-white transition-colors">
            Home
          </button>
          <button onClick={() => go("checker")} className="hover:text-white transition-colors">
            Checker
          </button>
          <button
            onClick={() => navigate("/about")}
            className={`hover:text-white transition-colors ${
              location.pathname === "/about" ? "text-white" : ""
            }`}
          >
            About
          </button>
        </nav>
      </div>
    </header>
  )
}
