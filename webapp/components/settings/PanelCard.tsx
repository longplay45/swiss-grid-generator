import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import type { ReactNode } from "react"
import type { SectionKey } from "@/hooks/useSettingsHistory"
import { useSettingsHelpNavigation } from "@/components/settings/help-navigation-context"

type Props = {
  title: string
  tooltip: string
  collapsed: boolean
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
  onHeaderClick,
  onHeaderDoubleClick,
  helpSectionKey,
  isDarkMode,
  children,
}: Props) {
  const { showHelpIcons, onNavigate } = useSettingsHelpNavigation()

  return (
    <Card className={isDarkMode ? "border-gray-700 bg-gray-900 text-gray-100" : ""}>
      <HoverTooltip
        label={tooltip}
        className="block"
        tooltipClassName="left-4 top-full mt-1 border-gray-200 bg-white/95 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
      >
        <CardHeader
          className="pb-3 cursor-pointer select-none"
          onClick={onHeaderClick}
          onDoubleClick={onHeaderDoubleClick}
        >
          <CardTitle className="text-sm flex items-center gap-2">
            {title}
            {showHelpIcons ? (
              <button
                type="button"
                aria-label={`Open help for ${title}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onNavigate(helpSectionKey)
                }}
                onMouseEnter={() => onNavigate(helpSectionKey)}
                onDoubleClick={(event) => event.stopPropagation()}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-[10px] font-semibold leading-none text-gray-700 hover:bg-gray-200"
              >
                ?
              </button>
            ) : null}
            <span
              className={`ml-auto text-base leading-none transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
            >
              ▼
            </span>
          </CardTitle>
        </CardHeader>
      </HoverTooltip>
      {!collapsed && <CardContent className="space-y-4">{children}</CardContent>}
    </Card>
  )
}
