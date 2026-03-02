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
  colorShema: ImageColorSchemeId
  onColorShemaChange: (value: ImageColorSchemeId) => void
  isDarkMode: boolean
}

export const ColorShemaPanel = memo(function ColorShemaPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  colorShema,
  onColorShemaChange,
  isDarkMode,
}: Props) {
  const selected = getImageColorScheme(colorShema)

  return (
    <PanelCard
      title="VI. Color Shema"
      tooltip="Base shema for image placeholders"
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
        <Label>Base Shema</Label>
        <Select
          value={colorShema}
          onValueChange={(value) => onColorShemaChange(value as ImageColorSchemeId)}
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
            className={`h-2.5 rounded-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </PanelCard>
  )
})

ColorShemaPanel.displayName = "ColorShemaPanel"
