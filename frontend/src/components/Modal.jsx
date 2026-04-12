import { useEffect } from "react"

export function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto
                   bg-gray-950/95 border border-gray-800 rounded-2xl
                   shadow-2xl shadow-black/50 p-6 sm:p-8"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full
                     bg-gray-900 hover:bg-gray-800 border border-gray-700
                     flex items-center justify-center text-gray-400 hover:text-white
                     transition-colors"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
