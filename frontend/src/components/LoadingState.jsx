export function LoadingState({ message }) {
  return (
    <div className="flex items-center gap-3 bg-gray-900 rounded-xl p-4 mb-6">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent
                      rounded-full animate-spin shrink-0" />
      <p className="text-sm text-gray-300">{message}</p>
    </div>
  )
}
