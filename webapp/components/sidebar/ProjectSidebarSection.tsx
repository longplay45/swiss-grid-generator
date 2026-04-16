import { ChevronUp } from "lucide-react"
import type { ReactNode } from "react"

import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"

type Props = {
  title: string
  collapsed: boolean
  collapsedSummary?: ReactNode
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  isDarkMode: boolean
  children: ReactNode
}

export function ProjectSidebarSection({
  title,
  collapsed,
  collapsedSummary,
  onHeaderClick,
  onHeaderDoubleClick,
  isDarkMode,
  children,
}: Props) {
  return (
    <section
      className={`mb-3 border-b pb-3 ${
        isDarkMode
          ? "border-[#313A47] text-[#F4F6F8]"
          : "border-gray-200 text-gray-900"
      }`}
    >
      <header
        className="cursor-pointer select-none pt-3"
        onClick={onHeaderClick}
        onDoubleClick={onHeaderDoubleClick}
      >
        <div className="rounded-md py-2">
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
                    ? "border-[#313A47] bg-[#232A35] text-[#A8B1BF]"
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
      {!collapsed && <div className="space-y-4 pb-4 pt-1">{children}</div>}
    </section>
  )
}
