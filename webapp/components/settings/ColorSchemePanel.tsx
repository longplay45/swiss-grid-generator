import { memo } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PanelCard } from "@/components/settings/PanelCard"
import {
  getImageColorScheme,
  IMAGE_COLOR_SCHEMES,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  colorScheme: ImageColorSchemeId
  onColorSchemeChange: (value: ImageColorSchemeId) => void
  canvasBackground: string | null
  onCanvasBackgroundChange: (value: string | null) => void
  isDarkMode: boolean
}

export const ColorSchemePanel = memo(function ColorSchemePanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  colorScheme,
  onColorSchemeChange,
  canvasBackground,
  onCanvasBackgroundChange,
  isDarkMode,
}: Props) {
  const selected = getImageColorScheme(colorScheme)
  const backgroundSelectValue = canvasBackground ?? "__none__"

  return (
    <PanelCard
      title="VI. Color Scheme"
      tooltip="Color scheme and page background for image placeholders"
      collapsed={collapsed}
      collapsedSummary={(
        <div className="flex items-center gap-1.5">
          {selected.colors.map((color, index) => (
            <span
              key={`collapsed-${selected.id}-${index}-${color}`}
              className={`inline-block h-2.5 w-5 rounded-sm border ${isDarkMode ? "border-gray-600" : "border-gray-300"}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="color"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">Base Color Scheme</Label>
        <Select
          value={colorScheme}
          onValueChange={(value) => onColorSchemeChange(value as ImageColorSchemeId)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_COLOR_SCHEMES.map((scheme) => (
              <SelectItem key={scheme.id} value={scheme.id}>
                {scheme.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {selected.colors.map((color, index) => (
          <div
            key={`${selected.id}-${index}-${color}`}
            className="flex flex-col items-start gap-1"
          >
            <div
              className={`h-5 w-full rounded-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
              style={{ backgroundColor: color }}
              title={color}
            />
            <span className={`w-full text-left text-[9px] font-mono leading-none ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              {color.toLowerCase()}
            </span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">Background</Label>
        <Select
          value={backgroundSelectValue}
          onValueChange={(value) => onCanvasBackgroundChange(value === "__none__" ? null : value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {selected.colors.map((color) => (
              <SelectItem key={`background-${selected.id}-${color}`} value={color}>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3 w-3 rounded-full border ${isDarkMode ? "border-gray-600" : "border-gray-300"}`}
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono text-xs">{color.toLowerCase()}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </PanelCard>
  )
})

ColorSchemePanel.displayName = "ColorSchemePanel"
