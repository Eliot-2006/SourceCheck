import { lazy, Suspense, useEffect, useState } from "react"

const GL = lazy(() => import("./gl/GL").then(m => ({ default: m.GL })))

function detectLowPower() {
  if (typeof window === "undefined") return true
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true

    const ua = navigator.userAgent || ""
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua)
    const cores = navigator.hardwareConcurrency || 4
    const memory = navigator.deviceMemory || 4
    if (isMobile) return true
    if (cores < 4 || memory < 4) return true

    const canvas = document.createElement("canvas")
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    if (!gl) return true

    const dbg = gl.getExtension("WEBGL_debug_renderer_info")
    if (dbg) {
      const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "")
      if (/SwiftShader|llvmpipe|Microsoft Basic/i.test(renderer)) return true
    }
    return false
  } catch {
    return true
  }
}

export function Background({ hovering }) {
  const [lowPower, setLowPower] = useState(true)

  useEffect(() => {
    setLowPower(detectLowPower())
  }, [])

  if (lowPower) return <div className="static-bg" aria-hidden />

  return (
    <Suspense fallback={<div className="static-bg" aria-hidden />}>
      <GL hovering={hovering} />
    </Suspense>
  )
}
