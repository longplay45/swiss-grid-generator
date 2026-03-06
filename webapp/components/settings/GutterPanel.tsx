import { memo } from "react"
import { Label } from "@/components/ui/label"
import { DebouncedSlider } from "@/components/ui/slider"
import { PanelCard } from "@/components/settings/PanelCard"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { GridRhythm, GridRhythmRotation } from "@/lib/config/defaults"

const RHYTHM_ROTATION_OPTIONS: GridRhythmRotation[] = [0, 180]

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  gridCols: number
  onGridColsChange: (value: number) => void
  gridRows: number
  onGridRowsChange: (value: number) => void
  gutterMultiple: number
  onGutterMultipleChange: (value: number) => void
  rhythm: GridRhythm
  onRhythmChange: (value: GridRhythm) => void
  rhythmRotation: GridRhythmRotation
  onRhythmRotationChange: (value: GridRhythmRotation) => void
  isDarkMode: boolean
}

export const GutterPanel = memo(function GutterPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  gridCols,
  onGridColsChange,
  gridRows,
  onGridRowsChange,
  gutterMultiple,
  onGutterMultipleChange,
  rhythm,
  onRhythmChange,
  rhythmRotation,
  onRhythmRotationChange,
  isDarkMode,
}: Props) {
  const normalizedRotation = rhythmRotation === 180 ? 180 : 0
  const rotationSliderIndex = Math.max(0, RHYTHM_ROTATION_OPTIONS.indexOf(normalizedRotation))
  return (
    <PanelCard
      title="IV. Grid Rhythm"
      tooltip="Grid columns, rows, and gutter multiple"
      collapsed={collapsed}
      collapsedSummary={`${gridCols} cols, ${gridRows} rows, ${gutterMultiple.toFixed(1)}x`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="gutter"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">Rhythms</Label>
        <Select
          value={rhythm}
          onValueChange={(value) => onRhythmChange(value as GridRhythm)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="repetitive">Repetitive</SelectItem>
            <SelectItem value="fibonacci">Fibonacci</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rhythm === "fibonacci" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-gray-600">Rotation</Label>
            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">
              {normalizedRotation}°
            </span>
          </div>
          <DebouncedSlider
            value={[rotationSliderIndex]}
            min={0}
            max={1}
            step={1}
            onValueCommit={([value]) => {
              const index = Math.max(0, Math.min(1, Math.round(value)))
              onRhythmRotationChange(RHYTHM_ROTATION_OPTIONS[index] ?? 0)
            }}
          />
          <div className="grid grid-cols-2 text-[10px] text-gray-500">
            <span>0°</span>
            <span className="text-right">180°</span>
          </div>
        </div>
      ) : null}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-gray-600">Vertical Fields</Label>
          <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">{gridCols}</span>
        </div>
        <DebouncedSlider
          value={[gridCols]}
          min={1}
          max={13}
          step={1}
          onValueCommit={([v]) => onGridColsChange(v)}
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-gray-600">Horizontal Fields</Label>
          <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">{gridRows}</span>
        </div>
        <DebouncedSlider
          value={[gridRows]}
          min={1}
          max={13}
          step={1}
          onValueCommit={([v]) => onGridRowsChange(v)}
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-gray-600">Baseline Multiple</Label>
          <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">
            {gutterMultiple}×
          </span>
        </div>
        <DebouncedSlider
          value={[gutterMultiple]}
          min={1}
          max={4}
          step={0.5}
          onValueCommit={([v]) => onGutterMultipleChange(v)}
        />
      </div>
    </PanelCard>
  )
})

GutterPanel.displayName = "GutterPanel"
