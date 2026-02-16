import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { CANVAS_RATIOS } from "@/lib/grid-calculator"
import type { CanvasRatioKey } from "@/lib/grid-calculator"

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  canvasRatio: CanvasRatioKey
  onCanvasRatioChange: (value: CanvasRatioKey) => void
  orientation: "portrait" | "landscape"
  onOrientationChange: (value: "portrait" | "landscape") => void
  rotation: number
  onRotationChange: (value: number) => void
}

export function CanvasRatioPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  canvasRatio,
  onCanvasRatioChange,
  orientation,
  onOrientationChange,
  rotation,
  onRotationChange,
}: Props) {
  return (
    <Card>
      <CardHeader
        className="group relative pb-3 cursor-pointer select-none"
        onClick={onHeaderClick}
        onDoubleClick={onHeaderDoubleClick}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          I. Canvas Ratio &amp; Rotation
          <span
            className={`ml-auto text-base leading-none transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
          >
            ▼
          </span>
        </CardTitle>
        <div className="pointer-events-none absolute left-4 top-full z-20 mt-1 w-max rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
          Ratio, orientation, and preview rotation
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ratio</Label>
            <Select value={canvasRatio} onValueChange={(v: CanvasRatioKey) => onCanvasRatioChange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANVAS_RATIOS.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.label} ({opt.ratioLabel} / 1:{opt.ratioDecimal.toFixed(3)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Orientation</Label>
            <Select
              value={orientation}
              onValueChange={(v: "portrait" | "landscape") => onOrientationChange(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Rotation</Label>
              <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{rotation}°</span>
            </div>
            <Slider
              value={[rotation]}
              min={-80}
              max={80}
              step={1}
              onValueChange={([v]) => onRotationChange(v)}
            />
          </div>
        </CardContent>
      )}
    </Card>
  )
}
