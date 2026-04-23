"use client"

type Props = {
  title: string
  description?: string
  isOpen: boolean
  stepTitle?: string
  stepCaption?: string
  stepIndex: number
  stepCount: number
  waitingForLayerClick: boolean
  canGoBack: boolean
  canGoNext: boolean
  isDarkMode: boolean
  onStart: () => void
  onClose: () => void
  onBack: () => void
  onNext: () => void
}

export function ProjectTourOverlay({
  title,
  description,
  isOpen,
  stepTitle,
  stepCaption,
  stepIndex,
  stepCount,
  waitingForLayerClick,
  canGoBack,
  canGoNext,
  isDarkMode,
  onStart,
  onClose,
  onBack,
  onNext,
}: Props) {
  if (!isOpen) {
    return (
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
        <button
          type="button"
          onClick={onStart}
          className={`pointer-events-auto rounded-sm border px-3 py-2 text-left text-[11px] uppercase tracking-[0.08em] transition-colors ${
            isDarkMode
              ? "border-[#313A47] bg-[#1D232D]/95 text-[#F4F6F8] hover:border-[#A8B1BF]"
              : "border-gray-300 bg-white/95 text-gray-800 hover:border-gray-500"
          }`}
        >
          Open Tour
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 w-[min(720px,calc(100%-2rem))] -translate-x-1/2">
      <div
        className={`pointer-events-auto rounded-sm border px-4 py-3 shadow-lg backdrop-blur-sm ${
          isDarkMode
            ? "border-[#313A47] bg-[#1D232D]/95 text-[#F4F6F8]"
            : "border-gray-200 bg-white/95 text-gray-900"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-[11px] uppercase tracking-[0.08em] ${isDarkMode ? "text-[#A8B1BF]" : "text-gray-500"}`}>
              {title}
            </div>
            {description ? (
              <div className={`mt-1 text-[11px] leading-snug ${isDarkMode ? "text-[#A8B1BF]" : "text-gray-600"}`}>
                {description}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 text-[11px] uppercase tracking-[0.08em] transition-colors ${
              isDarkMode ? "text-[#A8B1BF] hover:text-[#F4F6F8]" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Close
          </button>
        </div>

        <div className={`mt-3 border-t pt-3 ${isDarkMode ? "border-[#313A47]" : "border-gray-200"}`}>
          <div className={`text-[11px] uppercase tracking-[0.08em] ${isDarkMode ? "text-[#A8B1BF]" : "text-gray-500"}`}>
            Step {Math.min(stepIndex + 1, stepCount)} / {Math.max(1, stepCount)}
          </div>
          {stepTitle ? (
            <div className="mt-1 text-sm font-medium">
              {stepTitle}
            </div>
          ) : null}
          {stepCaption ? (
            <div className={`mt-2 text-sm leading-relaxed ${isDarkMode ? "text-[#D6DAE1]" : "text-gray-700"}`}>
              {stepCaption}
            </div>
          ) : null}
          {waitingForLayerClick ? (
            <div className={`mt-2 text-[11px] uppercase tracking-[0.08em] ${isDarkMode ? "text-[#fe9f97]" : "text-[#c55a52]"}`}>
              Click the highlighted layer to continue
            </div>
          ) : null}
        </div>

        <div className={`mt-3 flex items-center justify-between gap-3 border-t pt-3 ${isDarkMode ? "border-[#313A47]" : "border-gray-200"}`}>
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className={`rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
              !canGoBack
                ? isDarkMode
                  ? "cursor-not-allowed border-[#313A47] text-[#596273]"
                  : "cursor-not-allowed border-gray-200 text-gray-300"
                : isDarkMode
                  ? "border-[#313A47] text-[#F4F6F8] hover:border-[#A8B1BF]"
                  : "border-gray-300 text-gray-800 hover:border-gray-500"
            }`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={waitingForLayerClick || !canGoNext}
            className={`rounded-sm px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
              waitingForLayerClick || !canGoNext
                ? isDarkMode
                  ? "cursor-not-allowed bg-[#313A47] text-[#596273]"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
                : "bg-[#fe9f97] text-black hover:brightness-95"
            }`}
          >
            {canGoNext ? "Next" : "Done"}
          </button>
        </div>
      </div>
    </div>
  )
}
