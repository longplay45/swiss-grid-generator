import { memo, useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PanelCard } from "@/components/settings/PanelCard"
import { LabeledControlRow } from "@/components/ui/labeled-control-row"
import {
  getImageSchemeColorToken,
  getImageColorScheme,
  IMAGE_COLOR_SCHEMES,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { useSelectRolloverPreview } from "@/hooks/useSelectRolloverPreview"

const COLOR_SLOT_LABELS = ["Paper", "Light", "Mid", "Dark"] as const

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  colorScheme: ImageColorSchemeId
  onColorSchemeChange: (value: ImageColorSchemeId) => void
  onColorSchemePreviewChange?: (value: ImageColorSchemeId | null) => void
  canvasBackground: string | null
  onCanvasBackgroundChange: (value: string | null) => void
  onCanvasBackgroundPreviewChange?: (value: string | null) => void
  isDarkMode: boolean
}

export const ColorSchemePanel = memo(function ColorSchemePanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  colorScheme,
  onColorSchemeChange,
  onColorSchemePreviewChange,
  canvasBackground,
  onCanvasBackgroundChange,
  onCanvasBackgroundPreviewChange,
  isDarkMode,
}: Props) {
  const selected = getImageColorScheme(colorScheme)
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)
  const displayedScheme = previewColorScheme ? getImageColorScheme(previewColorScheme) : selected
  const paperBackgroundValue = getImageSchemeColorToken(0)
  const backgroundSelectValue = canvasBackground ?? "__none__"
  const colorSchemeSelectPreview = useSelectRolloverPreview<ImageColorSchemeId>({
    value: colorScheme,
    onCommitValue: onColorSchemeChange,
    onPreviewValue: (value) => {
      setPreviewColorScheme(value)
      onColorSchemePreviewChange?.(value)
    },
    onPreviewClear: () => {
      setPreviewColorScheme(null)
      onColorSchemePreviewChange?.(null)
    },
  })
  const backgroundSelectPreview = useSelectRolloverPreview<string>({
    value: backgroundSelectValue,
    onCommitValue: (value) => onCanvasBackgroundChange(value === "__none__" ? null : value),
    onPreviewValue: (value) => onCanvasBackgroundPreviewChange?.(value),
    onPreviewClear: () => onCanvasBackgroundPreviewChange?.(null),
  })

  return (
    <PanelCard
      title="VI. Color Scheme"
      tooltip="Color scheme and page background for image placeholders; scheme and background lists preview on rollover"
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
        <LabeledControlRow label={<Label className="text-sm text-gray-600">Base</Label>}>
        <Select
          value={colorScheme}
          onOpenChange={colorSchemeSelectPreview.handleOpenChange}
          onValueChange={colorSchemeSelectPreview.handleValueChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent onPointerLeave={colorSchemeSelectPreview.handleContentPointerLeave}>
            {IMAGE_COLOR_SCHEMES.map((scheme) => (
              <SelectItem
                key={scheme.id}
                value={scheme.id}
                {...colorSchemeSelectPreview.getItemPreviewProps(scheme.id)}
              >
                {scheme.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </LabeledControlRow>
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
        <LabeledControlRow label={<Label className="text-sm text-gray-600">Background</Label>}>
        <Select
          value={backgroundSelectValue}
          onOpenChange={backgroundSelectPreview.handleOpenChange}
          onValueChange={backgroundSelectPreview.handleValueChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent onPointerLeave={backgroundSelectPreview.handleContentPointerLeave}>
            <SelectItem value="__none__" {...backgroundSelectPreview.getItemPreviewProps("__none__")}>None</SelectItem>
            <SelectItem value={paperBackgroundValue} {...backgroundSelectPreview.getItemPreviewProps(paperBackgroundValue)}>
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
              <SelectItem
                key={`background-${selected.id}-${color}`}
                value={color}
                {...backgroundSelectPreview.getItemPreviewProps(color)}
              >
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
        </LabeledControlRow>
      </div>
    </PanelCard>
  )
})

ColorSchemePanel.displayName = "ColorSchemePanel"
