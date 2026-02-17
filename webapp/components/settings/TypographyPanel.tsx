import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FontSelect } from "@/components/ui/font-select"
import { TYPOGRAPHY_SCALE_LABELS } from "@/lib/grid-calculator"
import { FONT_OPTIONS, type FontFamily } from "@/lib/config/fonts"
import type { TypographyScale } from "@/lib/config/defaults"
import { PanelCard } from "@/components/settings/PanelCard"

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  onHelpClick: () => void
  typographyScale: TypographyScale
  onTypographyScaleChange: (value: TypographyScale) => void
  baseFont: FontFamily
  onBaseFontChange: (value: FontFamily) => void
  isDarkMode: boolean
}

export function TypographyPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  onHelpClick,
  typographyScale,
  onTypographyScaleChange,
  baseFont,
  onBaseFontChange,
  isDarkMode,
}: Props) {
  return (
    <PanelCard
      title="V. Typo"
      tooltip="Typography scale and hierarchy preset"
      collapsed={collapsed}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      onHelpClick={onHelpClick}
      isDarkMode={isDarkMode}
    >
      <div className="space-y-2">
        <Label>Font Hierarchy</Label>
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
            {Object.entries(TYPOGRAPHY_SCALE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Base Font</Label>
        <FontSelect
          value={baseFont}
          onValueChange={(value) => onBaseFontChange(value as FontFamily)}
          options={FONT_OPTIONS}
        />
      </div>
    </PanelCard>
  )
}
