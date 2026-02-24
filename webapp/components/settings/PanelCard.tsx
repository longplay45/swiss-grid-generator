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
  collapsedSummary?: string
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
    <Card className={`${isDarkMode ? "border-gray-700 bg-gray-900 text-gray-100" : ""} ${showHelpIcons ? "ring-1 ring-red-500" : ""}`}>
      <HoverTooltip
        label={tooltip}
        className="block"
        tooltipClassName="left-4 top-full mt-1 border-gray-200 bg-white/95 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
      >
        <CardHeader
          className="pb-3 cursor-pointer select-none"
          onClick={onHeaderClick}
          onDoubleClick={onHeaderDoubleClick}
          onMouseEnter={showHelpIcons ? () => onNavigate(helpSectionKey) : undefined}
        >
          <CardTitle className="text-sm">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span>{title}</span>
                </div>
                <span
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isDarkMode
                      ? "border-gray-600 bg-gray-800 text-gray-300"
                      : "border-gray-300 bg-gray-100 text-gray-700"
                  }`}
                >
                  <ChevronUp
                    className={`h-2.5 w-2.5 transition-transform ${collapsed ? "rotate-90" : "rotate-180"}`}
                    aria-hidden="true"
                  />
                </span>
              </div>
              {collapsed && collapsedSummary ? (
                <p className={`mt-1 text-[11px] font-normal leading-relaxed ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {collapsedSummary}
                </p>
              ) : null}
            </div>
          </CardTitle>
        </CardHeader>
      </HoverTooltip>
      {!collapsed && <CardContent className="space-y-4">{children}</CardContent>}
    </Card>
  )
}
