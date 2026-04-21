import { Plus } from "lucide-react"
import type { ReactNode } from "react"

import { HoverTooltip } from "@/components/ui/hover-tooltip"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"

type Props = {
  title: string
  isDarkMode: boolean
  onAction?: () => void
  actionLabel?: string
  actionTooltip?: ReactNode
  showRolloverInfo?: boolean
  children: ReactNode
}

export function ProjectSidebarSection({
  title,
  isDarkMode,
  onAction,
  actionLabel = "Add",
  actionTooltip,
  showRolloverInfo = true,
  children,
}: Props) {
  const actionIcon = (
    <button
      type="button"
      aria-label={actionLabel}
      onClick={onAction}
      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
        isDarkMode
          ? "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:text-[#F4F6F8]"
          : "border-gray-300 bg-gray-100 text-gray-700 hover:text-gray-900"
      }`}
    >
      <Plus className="h-2 w-2" aria-hidden="true" />
    </button>
  )

  return (
    <section
      className={`mb-3 border-b pb-3 ${
        isDarkMode
          ? "border-[#313A47] text-[#F4F6F8]"
          : "border-gray-200 text-gray-900"
      }`}
    >
      <header
        className="select-none pt-3"
      >
        <div className="rounded-md py-2">
          <h3 className="leading-tight">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className={SECTION_HEADLINE_CLASSNAME}>{title}</div>
              </div>
              {actionTooltip
                ? (
                    <HoverTooltip
                      label={actionTooltip}
                      disabled={!showRolloverInfo}
                      tooltipClassName="border-gray-200 bg-white/95 text-gray-700 shadow-lg dark:border-[#313A47] dark:bg-[#1D232D]/95 dark:text-[#F4F6F8]"
                    >
                      {actionIcon}
                    </HoverTooltip>
                  )
                : actionIcon}
            </div>
          </h3>
        </div>
      </header>
      <div className="space-y-4 pb-4 pt-1">{children}</div>
    </section>
  )
}
