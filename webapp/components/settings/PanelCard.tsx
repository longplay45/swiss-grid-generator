import { HoverTooltip } from "@/components/ui/hover-tooltip"
import type { ReactNode } from "react"
import type { SectionKey } from "@/hooks/useSettingsHistory"
import { useSettingsHelpNavigation } from "@/components/settings/help-navigation-context"
import { ChevronUp } from "lucide-react"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"
import { SectionHeaderRow } from "@/components/ui/section-header-row"

type Props = {
  title: string
  tooltip: string
  collapsed: boolean
  collapsedSummary?: ReactNode
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  helpSectionKey: SectionKey
  isDarkMode: boolean
  children: ReactNode
}

export function PanelCard({
  title,
  tooltip,
  collapsed,
  collapsedSummary,
  onHeaderClick,
  onHeaderDoubleClick,
  helpSectionKey,
  isDarkMode,
  children,
}: Props) {
  const { showHelpIcons, showRolloverInfo, interactionsDisabled, onNavigate } = useSettingsHelpNavigation()

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
          className={`select-none pt-3 ${interactionsDisabled ? "cursor-default" : "cursor-pointer"}`}
          onClick={interactionsDisabled ? undefined : onHeaderClick}
          onDoubleClick={interactionsDisabled ? undefined : onHeaderDoubleClick}
          onMouseEnter={showHelpIcons ? () => onNavigate(helpSectionKey) : undefined}
        >
          <div
            className={`rounded-md py-2 ${
              showHelpIcons ? "relative" : ""
            }`}
          >
            {showHelpIcons ? <HelpIndicatorLine /> : null}
            <h3 className={`leading-tight ${interactionsDisabled ? "opacity-50" : ""}`}>
              <SectionHeaderRow
                label={title}
                actionIcon={(
                  <ChevronUp
                    className={`h-2 w-2 transition-transform ${collapsed ? "rotate-90" : "rotate-180"}`}
                    aria-hidden="true"
                  />
                )}
                actionClassName={isDarkMode
                  ? "border-gray-600 bg-gray-800 text-gray-300"
                  : "border-gray-300 bg-gray-100 text-gray-700"}
              />
              {collapsed && collapsedSummary ? (
                <div className={`mt-1 text-[10px] font-normal leading-snug ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {collapsedSummary}
                </div>
              ) : null}
            </h3>
          </div>
        </header>
      </HoverTooltip>
      {!collapsed && (
        <div className={`space-y-4 pb-4 pt-1 ${interactionsDisabled ? "pointer-events-none opacity-50" : ""}`}>
          {children}
        </div>
      )}
    </section>
  )
}
