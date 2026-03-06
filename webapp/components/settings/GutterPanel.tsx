import { memo } from "react"
import { Label } from "@/components/ui/label"
import { DebouncedSlider } from "@/components/ui/slider"
import { PanelCard } from "@/components/settings/PanelCard"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  GridRhythm,
  GridRhythmColsDirection,
  GridRhythmRowsDirection,
} from "@/lib/config/defaults"

const RHYTHM_OPTIONS: Array<{ value: GridRhythm; label: string }> = [
  { value: "fibonacci", label: "Fibonacci" },
  { value: "golden", label: "Golden Ratio" },
  { value: "fifth", label: "Perfect Fifth" },
  { value: "fourth", label: "Perfect Fourth" },
  { value: "repetitive", label: "Repetitive" },
]

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
  rhythmRowsEnabled: boolean
  onRhythmRowsEnabledChange: (value: boolean) => void
  rhythmRowsDirection: GridRhythmRowsDirection
  onRhythmRowsDirectionChange: (value: GridRhythmRowsDirection) => void
  rhythmColsEnabled: boolean
  onRhythmColsEnabledChange: (value: boolean) => void
  rhythmColsDirection: GridRhythmColsDirection
  onRhythmColsDirectionChange: (value: GridRhythmColsDirection) => void
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
  rhythmRowsEnabled,
  onRhythmRowsEnabledChange,
  rhythmRowsDirection,
  onRhythmRowsDirectionChange,
  rhythmColsEnabled,
  onRhythmColsEnabledChange,
  rhythmColsDirection,
  onRhythmColsDirectionChange,
  isDarkMode,
}: Props) {
  return (
    <PanelCard
      title="IV. Grid & Rhythms"
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
            {RHYTHM_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {rhythm !== "repetitive" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-gray-600">Rows</Label>
              <Switch
                checked={rhythmRowsEnabled}
                onCheckedChange={onRhythmRowsEnabledChange}
                className="h-3 w-6 rounded-none border border-black bg-white data-[state=checked]:bg-white data-[state=unchecked]:bg-white"
                thumbClassName="h-3 w-3 rounded-none border border-black bg-gray-300 shadow-none data-[state=checked]:translate-x-3"
              />
            </div>
            <Select
              value={rhythmRowsDirection}
              onValueChange={(value) => onRhythmRowsDirectionChange(value as GridRhythmRowsDirection)}
              disabled={!rhythmRowsEnabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ltr">Left to right</SelectItem>
                <SelectItem value="rtl">Right to left</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-gray-600">Cols</Label>
              <Switch
                checked={rhythmColsEnabled}
                onCheckedChange={onRhythmColsEnabledChange}
                className="h-3 w-6 rounded-none border border-black bg-white data-[state=checked]:bg-white data-[state=unchecked]:bg-white"
                thumbClassName="h-3 w-3 rounded-none border border-black bg-gray-300 shadow-none data-[state=checked]:translate-x-3"
              />
            </div>
            <Select
              value={rhythmColsDirection}
              onValueChange={(value) => onRhythmColsDirectionChange(value as GridRhythmColsDirection)}
              disabled={!rhythmColsEnabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ttb">Top to Bottom</SelectItem>
                <SelectItem value="btt">Bottom to top</SelectItem>
              </SelectContent>
            </Select>
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
