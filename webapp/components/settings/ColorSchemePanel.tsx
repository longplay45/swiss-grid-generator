import { memo, useState } from "react"
import { Button } from "@/components/ui/button"
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
  getImageSchemeColorToken,
  getImageColorScheme,
  IMAGE_COLOR_SCHEMES,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"

const COLOR_SLOT_LABELS = ["Paper", "Light", "Mid", "Dark"] as const

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  colorScheme: ImageColorSchemeId
  onColorSchemeChange: (value: ImageColorSchemeId) => void
  onResetParagraphColors: () => void
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
  onResetParagraphColors,
  canvasBackground,
  onCanvasBackgroundChange,
  isDarkMode,
}: Props) {
  const selected = getImageColorScheme(colorScheme)
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)
  const displayedScheme = previewColorScheme ? getImageColorScheme(previewColorScheme) : selected
  const paperBackgroundValue = getImageSchemeColorToken(0)
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
          onOpenChange={(open) => {
            if (!open) setPreviewColorScheme(null)
          }}
          onValueChange={(value) => onColorSchemeChange(value as ImageColorSchemeId)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent onPointerLeave={() => setPreviewColorScheme(null)}>
            {IMAGE_COLOR_SCHEMES.map((scheme) => (
              <SelectItem
                key={scheme.id}
                value={scheme.id}
                onFocus={() => setPreviewColorScheme(scheme.id)}
                onPointerMove={() => setPreviewColorScheme(scheme.id)}
              >
                {scheme.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {displayedScheme.colors.map((color, index) => (
          <div
            key={`${displayedScheme.id}-${index}-${color}`}
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
            <SelectItem value={paperBackgroundValue}>
              <span className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full border ${isDarkMode ? "border-gray-600" : "border-gray-300"}`}
                  style={{ backgroundColor: selected.colors[0] }}
                />
                <span>{COLOR_SLOT_LABELS[0]}</span>
                <span className="font-mono text-xs">{selected.colors[0].toLowerCase()}</span>
              </span>
            </SelectItem>
            {selected.colors.slice(1).map((color, index) => (
              <SelectItem key={`background-${selected.id}-${color}`} value={color}>
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3 w-3 rounded-full border ${isDarkMode ? "border-gray-600" : "border-gray-300"}`}
                    style={{ backgroundColor: color }}
                  />
                  <span>{COLOR_SLOT_LABELS[index + 1]}</span>
                  <span className="font-mono text-xs">{color.toLowerCase()}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">Paragraph Colors</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={onResetParagraphColors}
        >
          Reset Colors To Scheme
        </Button>
      </div>
    </PanelCard>
  )
})

ColorSchemePanel.displayName = "ColorSchemePanel"
