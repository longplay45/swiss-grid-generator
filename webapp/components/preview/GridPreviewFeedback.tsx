"use client"

import { useEffect } from "react"

type WarningToastState = {
  id: number
  message: string
}

type Props = {
  warningToast: WarningToastState | null
  dismissWarningToast: () => void
  isDarkMode?: boolean
}

const WARNING_TOAST_TIMEOUT_MS = 4200

export function GridPreviewFeedback({
  warningToast,
  dismissWarningToast,
  isDarkMode = false,
}: Props) {
  useEffect(() => {
    if (!warningToast) return
    const timeoutId = window.setTimeout(() => {
      dismissWarningToast()
    }, WARNING_TOAST_TIMEOUT_MS)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [dismissWarningToast, warningToast])

  if (!warningToast) return null

  return (
    <div
      className={`absolute bottom-3 right-3 z-30 w-full max-w-sm border px-4 py-3 shadow-lg ${
        isDarkMode
          ? "dark border-gray-700 bg-gray-900 text-gray-100"
          : "border-gray-300 bg-white text-gray-900"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
        isDarkMode ? "text-gray-400" : "text-gray-500"
      }`}>
        Grid Unchanged
      </div>
      <div className={`mt-1 text-xs leading-5 ${
        isDarkMode ? "text-gray-200" : "text-gray-700"
      }`}>
        {warningToast.message}
      </div>
    </div>
  )
}
