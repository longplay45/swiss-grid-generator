import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TYPOGRAPHY_SCALE_LABELS } from "@/lib/grid-calculator"
import { FONT_OPTIONS } from "@/components/grid-preview"
import type { FontFamily } from "@/components/grid-preview"

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  typographyScale: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci"
  onTypographyScaleChange: (value: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci") => void
  baseFont: FontFamily
  onBaseFontChange: (value: FontFamily) => void
}

export function TypographyPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  typographyScale,
  onTypographyScaleChange,
  baseFont,
  onBaseFontChange,
}: Props) {
  return (
    <Card>
      <CardHeader
        className="group relative pb-3 cursor-pointer select-none"
        onClick={onHeaderClick}
        onDoubleClick={onHeaderDoubleClick}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          V. Typo
          <span
            className={`ml-auto text-base leading-none transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
          >
            ▼
          </span>
        </CardTitle>
        <div className="pointer-events-none absolute left-4 top-full z-20 mt-1 w-max rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
          Typography scale and hierarchy preset
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Font Hierarchy</Label>
            <Select
              value={typographyScale}
              onValueChange={(v: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci") =>
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
            <Select value={baseFont} onValueChange={(value) => onBaseFontChange(value as FontFamily)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
