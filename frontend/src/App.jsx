import { useEffect, useState } from "react"
import { Routes, Route, useLocation, Outlet } from "react-router-dom"
import { Background } from "./components/Background"
import { Navbar } from "./components/Navbar"
import Home from "./pages/Home"
import About from "./pages/About"

function Layout() {
  const [unfocus, setUnfocus] = useState(false)
  const [heroInView, setHeroInView] = useState(true)
  const location = useLocation()
  const isHome = location.pathname === "/"

  // On Home, track whether the #hero section is in view so the darkening
  // overlay fades in past it. Off Home, always darken.
  useEffect(() => {
    if (!isHome) {
      setHeroInView(false)
      return
    }
    let io
    const attach = () => {
      const el = document.getElementById("hero")
      if (!el) {
        requestAnimationFrame(attach)
        return
      }
      io = new IntersectionObserver(
        ([entry]) => setHeroInView(entry.intersectionRatio > 0.4),
        { threshold: [0, 0.2, 0.4, 0.6] }
      )
      io.observe(el)
    }
    attach()
    return () => io?.disconnect()
  }, [isHome])

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <Background hovering={!unfocus} />

      <div
        aria-hidden
        className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.88) 100%)",
          opacity: heroInView ? 0 : 1,
        }}
      />

      <Navbar />

      <main className="relative z-10">
        <Outlet context={{ setUnfocus }} />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Route>
    </Routes>
  )
}
