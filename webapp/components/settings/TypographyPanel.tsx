import { memo } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FontSelect } from "@/components/ui/font-select"
import { PREVIEW_STYLE_OPTIONS, formatPtSize } from "@/lib/preview-text-config"
import { TYPOGRAPHY_SCALE_LABELS } from "@/lib/grid-calculator"
import type { GridResult } from "@/lib/grid-calculator"
import { FONT_OPTIONS, type FontFamily } from "@/lib/config/fonts"
import type { TypographyScale } from "@/lib/config/defaults"
import { PanelCard } from "@/components/settings/PanelCard"

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
  typographyStyles: GridResult["typography"]["styles"]
  baseFont: FontFamily
  onBaseFontChange: (value: FontFamily) => void
  isDarkMode: boolean
}

export const TypographyPanel = memo(function TypographyPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  typographyScale,
  onTypographyScaleChange,
  typographyStyles,
  baseFont,
  onBaseFontChange,
  isDarkMode,
}: Props) {
  const tableTone = isDarkMode
    ? {
        frame: "border-gray-700 bg-gray-900/60",
        header: "text-gray-400",
        row: "border-gray-800",
        label: "text-gray-100",
        value: "text-gray-300",
        note: "text-gray-500",
      }
    : {
        frame: "border-gray-200 bg-gray-50/80",
        header: "text-gray-500",
        row: "border-gray-200",
        label: "text-gray-900",
        value: "text-gray-700",
        note: "text-gray-500",
      }

  const hierarchyRows = PREVIEW_STYLE_OPTIONS
    .filter((option) => typographyStyles[option.value])
    .map((option) => ({
      key: option.value,
      label: option.label,
      size: typographyStyles[option.value].size,
      leading: typographyStyles[option.value].leading,
    }))

  return (
    <PanelCard
      title="V. Typo"
      tooltip="Typography scale and hierarchy preset"
      collapsed={collapsed}
      collapsedSummary={`${TYPOGRAPHY_SCALE_LABELS[typographyScale]}, ${baseFont}`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="typo"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">Font Hierarchy</Label>
        <Select
          value={typographyScale}
          onValueChange={(v: TypographyScale) =>
            onTypographyScaleChange(v)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPOGRAPHY_SCALE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className={`border ${tableTone.frame}`}>
          <div className={`grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 px-3 py-2 text-[10px] uppercase tracking-[0.08em] ${tableTone.header}`}>
            <span>Style</span>
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
        <p className={`text-[10px] leading-relaxed ${tableTone.note}`}>
          Current size and leading for the active hierarchy and baseline. In Swiss on a 12pt baseline, Display is 64pt / 72pt and FX is 96pt / 96pt.
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">Base Font</Label>
        <FontSelect
          value={baseFont}
          onValueChange={(value) => onBaseFontChange(value as FontFamily)}
          options={FONT_OPTIONS}
        />
      </div>
    </PanelCard>
  )
})

TypographyPanel.displayName = "TypographyPanel"
