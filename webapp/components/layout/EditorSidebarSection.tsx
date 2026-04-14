"use client"

import type { ReactNode } from "react"
import { ChevronUp } from "lucide-react"

import { HoverTooltip } from "@/components/ui/hover-tooltip"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"

type Props = {
  title: string
  tooltip: string
  collapsed: boolean
  collapsedSummary?: ReactNode
  onToggle: () => void
  isDarkMode: boolean
  showHelpIndicator?: boolean
  showRolloverInfo?: boolean
  children: ReactNode
}

export function EditorSidebarSection({
  title,
  tooltip,
  collapsed,
  collapsedSummary,
  onToggle,
  isDarkMode,
  showHelpIndicator = false,
  showRolloverInfo = true,
  children,
}: Props) {
  return (
    <section
      className={`mb-3 border-b pb-3 ${
        isDarkMode
          ? "border-gray-700 text-gray-100"
          : "border-gray-200 text-gray-900"
      }`}
    >
      <HoverTooltip
        label={tooltip}
        disabled={!showRolloverInfo}
        className="block"
        tooltipClassName="border-gray-200 bg-white/95 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
      >
        <header
          className="cursor-pointer select-none pt-3"
          onClick={onToggle}
        >
          <div className={`rounded-md py-2 ${showHelpIndicator ? "relative" : ""}`}>
            {showHelpIndicator ? <HelpIndicatorLine /> : null}
            <h3 className="leading-tight">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className={SECTION_HEADLINE_CLASSNAME}>{title}</div>
                  {collapsed && collapsedSummary ? (
                    <div className={`text-[10px] font-normal leading-snug ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {collapsedSummary}
                    </div>
                  ) : null}
                </div>
                <span
                  className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isDarkMode
                      ? "border-gray-600 bg-gray-800 text-gray-300"
                      : "border-gray-300 bg-gray-100 text-gray-700"
                  }`}
                >
                  <ChevronUp
                    className={`h-2 w-2 transition-transform ${collapsed ? "rotate-90" : "rotate-180"}`}
                    aria-hidden="true"
                  />
                </span>
              </div>
            </h3>
          </div>
        </header>
      </HoverTooltip>
      {!collapsed ? <div className="space-y-4 pb-4 pt-1">{children}</div> : null}
    </section>
  )
}
