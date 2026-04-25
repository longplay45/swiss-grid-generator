"use client"

import { X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"
import type { LayoutOpenTooltipItem } from "@/lib/generated-tooltip-content"

const FADE_DURATION_MS = 220

type Props = {
  tooltip: LayoutOpenTooltipItem
  displayToken: number
  index: number
  totalCount: number
  isDarkMode: boolean
  showHelpIndicator: boolean
  bottomClassName?: string
  onClose: () => void
  onNext: () => void
  onHelpHover?: () => void
}

export function LayoutOpenTooltipOverlay({
  tooltip,
  displayToken,
  index,
  totalCount,
  isDarkMode,
  showHelpIndicator,
  bottomClassName = "bottom-4",
  onClose,
  onNext,
  onHelpHover,
}: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const closeWithFade = useCallback(() => {
    clearTimers()
    setIsVisible(false)
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose()
    }, FADE_DURATION_MS)
  }, [clearTimers, onClose])

  useEffect(() => {
    setIsVisible(false)
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true)
    })
    return () => {
      window.cancelAnimationFrame(frame)
      clearTimers()
    }
  }, [clearTimers, displayToken])

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto" onClick={closeWithFade}>
      <div
        className={`absolute left-1/2 w-[min(483px,calc(100%-2rem))] -translate-x-1/2 ${bottomClassName}`}
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <div
          className={`relative rounded-sm border shadow-lg backdrop-blur-sm transition-opacity duration-200 ${
            isVisible ? "opacity-100" : "opacity-0"
          } ${
            isDarkMode
              ? "border-[#313A47] bg-[#1D232D] text-[#F4F6F8]"
              : "border-gray-200 bg-gray-100 text-gray-900"
          }`}
          onMouseEnter={showHelpIndicator ? onHelpHover : undefined}
        >
          {showHelpIndicator ? <HelpIndicatorLine /> : null}
          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`text-[11px] uppercase tracking-[0.08em] ${isDarkMode ? "text-[#A8B1BF]" : "text-gray-500"}`}>
                  Tooltip {index + 1} of {totalCount}
                </div>
                <div className="mt-1 text-[12px] font-semibold leading-[1.55]">
                  {tooltip.title}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={onNext}
                  className={`text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    isDarkMode ? "text-[#A8B1BF] hover:text-[#F4F6F8]" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Next &gt;
                </button>
                <button
                  type="button"
                  aria-label="Close tooltip"
                  onClick={closeWithFade}
                  className={`shrink-0 transition-colors ${
                    isDarkMode ? "text-[#A8B1BF] hover:text-[#F4F6F8]" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-1.5 space-y-2">
              {tooltip.blocks.map((block, blockIndex) => (
                block.type === "paragraph" ? (
                  <p
                    key={`${tooltip.id}-paragraph-${blockIndex}`}
                    className={`text-[12px] leading-[1.55] ${isDarkMode ? "text-[#D6DAE1]" : "text-gray-700"}`}
                  >
                    {block.text}
                  </p>
                ) : (
                  <ul
                    key={`${tooltip.id}-list-${blockIndex}`}
                    className={`space-y-1 text-[12px] leading-[1.5] ${isDarkMode ? "text-[#D6DAE1]" : "text-gray-700"}`}
                  >
                    {block.items.map((item, itemIndex) => (
                      <li key={`${tooltip.id}-list-item-${blockIndex}-${itemIndex}`} className="pl-3">
                        <span className="-ml-3 inline-block w-3">-</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
