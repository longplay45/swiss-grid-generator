import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DebouncedSlider } from "@/components/ui/slider"
import { CANVAS_RATIOS } from "@/lib/grid-calculator"
import type { CanvasRatioKey } from "@/lib/grid-calculator"
import { PanelCard } from "@/components/settings/PanelCard"

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
  isDarkMode: boolean
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
  isDarkMode,
}: Props) {
  return (
    <PanelCard
      title="I. Canvas Ratio & Rotation"
      tooltip="Ratio, orientation, and preview rotation"
      collapsed={collapsed}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="format"
      isDarkMode={isDarkMode}
    >
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
          <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">{rotation}°</span>
        </div>
        <DebouncedSlider
          value={[rotation]}
          min={-80}
          max={80}
          step={1}
          onValueCommit={([v]) => onRotationChange(v)}
        />
      </div>
    </PanelCard>
  )
}
