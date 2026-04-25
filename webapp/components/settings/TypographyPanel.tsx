import { memo } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TopSelectContent,
} from "@/components/ui/select"
import { FontSelect } from "@/components/ui/font-select"
import { PREVIEW_STYLE_OPTIONS, formatPtSize } from "@/lib/preview-text-config"
import { TYPOGRAPHY_SCALE_LABELS } from "@/lib/grid-calculator"
import type { GridResult } from "@/lib/grid-calculator"
import { FONT_OPTIONS, type FontFamily } from "@/lib/config/fonts"
import type { TypographyScale } from "@/lib/config/defaults"
import { PanelCard } from "@/components/settings/PanelCard"
import { LabeledControlRow } from "@/components/ui/labeled-control-row"
import { useSelectRolloverPreview } from "@/hooks/useSelectRolloverPreview"

const TYPOGRAPHY_SCALE_OPTIONS: Array<{ value: TypographyScale; label: string }> = Object
  .entries(TYPOGRAPHY_SCALE_LABELS)
  .map(([value, label]) => ({ value: value as TypographyScale, label }))
  .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  typographyScale: TypographyScale
  onTypographyScaleChange: (value: TypographyScale) => void
  onTypographyScalePreviewChange?: (value: TypographyScale | null) => void
  typographyStyles: GridResult["typography"]["styles"]
  baseFont: FontFamily
  onBaseFontChange: (value: FontFamily) => void
  onBaseFontPreviewChange?: (value: FontFamily | null) => void
  isDarkMode: boolean
}

export const TypographyPanel = memo(function TypographyPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  typographyScale,
  onTypographyScaleChange,
  onTypographyScalePreviewChange,
  typographyStyles,
  baseFont,
  onBaseFontChange,
  onBaseFontPreviewChange,
  isDarkMode,
}: Props) {
  const typographyScaleSelectPreview = useSelectRolloverPreview<TypographyScale>({
    value: typographyScale,
    onCommitValue: onTypographyScaleChange,
    onPreviewValue: (value) => onTypographyScalePreviewChange?.(value),
    onPreviewClear: () => onTypographyScalePreviewChange?.(null),
  })
  const baseFontSelectPreview = useSelectRolloverPreview<FontFamily>({
    value: baseFont,
    onCommitValue: onBaseFontChange,
    onPreviewValue: (value) => onBaseFontPreviewChange?.(value),
    onPreviewClear: () => onBaseFontPreviewChange?.(null),
  })
  const tableTone = isDarkMode
    ? {
        frame: "border-gray-700 bg-gray-900/60",
        header: "text-gray-400",
        row: "border-gray-800",
        label: "text-gray-100",
        value: "text-gray-300",
      }
    : {
        frame: "border-gray-200 bg-gray-50/80",
        header: "text-gray-500",
        row: "border-gray-200",
        label: "text-gray-900",
        value: "text-gray-700",
      }

  const hierarchyRows = PREVIEW_STYLE_OPTIONS
    .filter((option) => option.value !== "fx")
    .filter((option) => typographyStyles[option.value])
    .map((option) => ({
      key: option.value,
      label: option.label,
      size: typographyStyles[option.value].size,
      leading: typographyStyles[option.value].leading,
    }))

  return (
    <PanelCard
      title="V. Typo & Rhythms"
      tooltip="Typography scale, hierarchy table, and base font; hierarchy and font lists preview on rollover"
      collapsed={collapsed}
      collapsedSummary={`${TYPOGRAPHY_SCALE_LABELS[typographyScale]}, ${baseFont}`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="typo"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-2">
        <LabeledControlRow label={<Label className="text-sm text-gray-600">Base</Label>}>
          <FontSelect
            value={baseFont}
            onValueChange={(value) => baseFontSelectPreview.handleValueChange(value as FontFamily)}
            options={FONT_OPTIONS}
            onOpenChange={baseFontSelectPreview.handleOpenChange}
            onContentPointerLeave={baseFontSelectPreview.handleContentPointerLeave}
            getItemPreviewProps={(value) => baseFontSelectPreview.getItemPreviewProps(value as FontFamily)}
          />
        </LabeledControlRow>
        <LabeledControlRow label={<Label className="text-sm text-gray-600">Rhythm</Label>}>
          <Select
            value={typographyScale}
            onOpenChange={typographyScaleSelectPreview.handleOpenChange}
            onValueChange={typographyScaleSelectPreview.handleValueChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <TopSelectContent onPointerLeave={typographyScaleSelectPreview.handleContentPointerLeave}>
              {TYPOGRAPHY_SCALE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  {...typographyScaleSelectPreview.getItemPreviewProps(option.value)}
                >
                  {option.label}
                </SelectItem>
              ))}
            </TopSelectContent>
          </Select>
        </LabeledControlRow>
        <div className={`border ${tableTone.frame}`}>
          <div className={`grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 px-3 py-2 text-[10px] uppercase tracking-[0.08em] ${tableTone.header}`}>
            <span>Steps</span>
            <span>Size</span>
            <span>Leading</span>
          </div>
          {hierarchyRows.map((row, index) => (
            <div
              key={row.key}
              className={`grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 px-3 py-2 text-[11px] ${index > 0 ? `border-t ${tableTone.row}` : ""}`}
            >
              <span className={`truncate ${tableTone.label}`}>{row.label}</span>
              <span className={`font-mono ${tableTone.value}`}>{formatPtSize(row.size)}</span>
              <span className={`font-mono ${tableTone.value}`}>{formatPtSize(row.leading)}</span>
            </div>
          ))}
        </div>
      </div>
    </PanelCard>
  )
})

TypographyPanel.displayName = "TypographyPanel"
