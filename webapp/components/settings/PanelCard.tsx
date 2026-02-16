import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import type { ReactNode } from "react"

type Props = {
  title: string
  tooltip: string
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  isDarkMode: boolean
  children: ReactNode
}

export function PanelCard({
  title,
  tooltip,
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  isDarkMode,
  children,
}: Props) {
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
