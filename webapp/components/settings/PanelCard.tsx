import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import type { ReactNode } from "react"
import type { SectionKey } from "@/hooks/useSettingsHistory"
import { useSettingsHelpNavigation } from "@/components/settings/help-navigation-context"
import { ChevronUp } from "lucide-react"

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
  const { showHelpIcons, onNavigate } = useSettingsHelpNavigation()

  return (
    <Card className={`${isDarkMode ? "border-gray-700 bg-gray-900 text-gray-100" : ""} ${showHelpIcons ? "ring-1 ring-blue-500" : ""}`}>
      <HoverTooltip
        label={tooltip}
        className="block"
        tooltipClassName="left-4 top-full mt-1 border-gray-200 bg-white/95 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
      >
        <CardHeader
          className={`cursor-pointer select-none ${collapsed ? "px-4 pt-3 pb-1" : "px-4 pt-3 pb-2"}`}
          onClick={onHeaderClick}
          onDoubleClick={onHeaderDoubleClick}
          onMouseEnter={showHelpIcons ? () => onNavigate(helpSectionKey) : undefined}
        >
          <CardTitle className="text-sm leading-tight">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span>{title}</span>
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
              {collapsed && collapsedSummary ? (
                <div className={`mt-1 text-[10px] font-normal leading-snug ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {collapsedSummary}
                </div>
              ) : null}
            </div>
          </CardTitle>
        </CardHeader>
      </HoverTooltip>
      {!collapsed && <CardContent className="space-y-4">{children}</CardContent>}
    </Card>
  )
}
