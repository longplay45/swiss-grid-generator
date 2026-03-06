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
import type { GridRhythm } from "@/lib/config/defaults"

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
  rhythmRotate90: boolean
  onRhythmRotate90Change: (value: boolean) => void
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
  rhythmRotate90,
  onRhythmRotate90Change,
  isDarkMode,
}: Props) {
  return (
    <PanelCard
      title="IV. Gutter"
      tooltip="Grid columns, rows, and gutter multiple"
      collapsed={collapsed}
      collapsedSummary={`${gridCols} cols, ${gridRows} rows, ${gutterMultiple.toFixed(1)}x`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="gutter"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-2">
        <Label className="text-sm text-gray-600">Grid Rhythm</Label>
        <Select
          value={rhythm}
          onValueChange={(value) => onRhythmChange(value as GridRhythm)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="repetitive">Repetitive</SelectItem>
            <SelectItem value="fibonacci">Fibonacci L→R</SelectItem>
          </SelectContent>
        </Select>
        <label className={`inline-flex items-center gap-2 text-xs ${rhythm === "fibonacci" ? "text-gray-700" : "text-gray-400"}`}>
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-gray-300"
            checked={rhythmRotate90}
            disabled={rhythm !== "fibonacci"}
            onChange={(event) => onRhythmRotate90Change(event.target.checked)}
          />
          Rotate rhythm 90°
        </label>
      </div>
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
