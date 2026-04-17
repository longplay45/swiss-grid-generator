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
import {
  GUTTER_MULTIPLE_RANGE,
  type GridRhythm,
  type GridRhythmColsDirection,
  type GridRhythmRowsDirection,
} from "@/lib/config/defaults"
import { useSelectRolloverPreview } from "@/hooks/useSelectRolloverPreview"

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
  onRhythmPreviewChange?: (value: GridRhythm | null) => void
  rhythmRowsEnabled: boolean
  onRhythmRowsEnabledChange: (value: boolean) => void
  rhythmRowsDirection: GridRhythmRowsDirection
  onRhythmRowsDirectionChange: (value: GridRhythmRowsDirection) => void
  onRhythmRowsDirectionPreviewChange?: (value: GridRhythmRowsDirection | null) => void
  rhythmColsEnabled: boolean
  onRhythmColsEnabledChange: (value: boolean) => void
  rhythmColsDirection: GridRhythmColsDirection
  onRhythmColsDirectionChange: (value: GridRhythmColsDirection) => void
  onRhythmColsDirectionPreviewChange?: (value: GridRhythmColsDirection | null) => void
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
  onRhythmPreviewChange,
  rhythmRowsEnabled,
  onRhythmRowsEnabledChange,
  rhythmRowsDirection,
  onRhythmRowsDirectionChange,
  onRhythmRowsDirectionPreviewChange,
  rhythmColsEnabled,
  onRhythmColsEnabledChange,
  rhythmColsDirection,
  onRhythmColsDirectionChange,
  onRhythmColsDirectionPreviewChange,
  isDarkMode,
}: Props) {
  const rhythmSelectPreview = useSelectRolloverPreview<GridRhythm>({
    value: rhythm,
    onCommitValue: onRhythmChange,
    onPreviewValue: (value) => onRhythmPreviewChange?.(value),
    onPreviewClear: () => onRhythmPreviewChange?.(null),
  })
  const rowsDirectionSelectPreview = useSelectRolloverPreview<GridRhythmRowsDirection>({
    value: rhythmRowsDirection,
    onCommitValue: onRhythmRowsDirectionChange,
    onPreviewValue: (value) => onRhythmRowsDirectionPreviewChange?.(value),
    onPreviewClear: () => onRhythmRowsDirectionPreviewChange?.(null),
  })
  const colsDirectionSelectPreview = useSelectRolloverPreview<GridRhythmColsDirection>({
    value: rhythmColsDirection,
    onCommitValue: onRhythmColsDirectionChange,
    onPreviewValue: (value) => onRhythmColsDirectionPreviewChange?.(value),
    onPreviewClear: () => onRhythmColsDirectionPreviewChange?.(null),
  })
  return (
    <PanelCard
      title="IV. Grid & Rhythms"
      tooltip="Grid columns, rows, gutter multiple, and rhythm controls; rhythm lists preview on rollover"
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
          onOpenChange={rhythmSelectPreview.handleOpenChange}
          onValueChange={rhythmSelectPreview.handleValueChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent onPointerLeave={rhythmSelectPreview.handleContentPointerLeave}>
            {RHYTHM_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                {...rhythmSelectPreview.getItemPreviewProps(option.value)}
              >
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
                className="h-3 w-6 rounded-none border border-black bg-gray-300 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                thumbClassName="h-3 w-3 rounded-none border border-black bg-white shadow-none data-[state=checked]:translate-x-3"
              />
            </div>
            <Select
              value={rhythmRowsDirection}
              onOpenChange={rowsDirectionSelectPreview.handleOpenChange}
              onValueChange={rowsDirectionSelectPreview.handleValueChange}
              disabled={!rhythmRowsEnabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent onPointerLeave={rowsDirectionSelectPreview.handleContentPointerLeave}>
                <SelectItem value="ltr" {...rowsDirectionSelectPreview.getItemPreviewProps("ltr")}>Left to right</SelectItem>
                <SelectItem value="rtl" {...rowsDirectionSelectPreview.getItemPreviewProps("rtl")}>Right to left</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-gray-600">Cols</Label>
              <Switch
                checked={rhythmColsEnabled}
                onCheckedChange={onRhythmColsEnabledChange}
                className="h-3 w-6 rounded-none border border-black bg-gray-300 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                thumbClassName="h-3 w-3 rounded-none border border-black bg-white shadow-none data-[state=checked]:translate-x-3"
              />
            </div>
            <Select
              value={rhythmColsDirection}
              onOpenChange={colsDirectionSelectPreview.handleOpenChange}
              onValueChange={colsDirectionSelectPreview.handleValueChange}
              disabled={!rhythmColsEnabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent onPointerLeave={colsDirectionSelectPreview.handleContentPointerLeave}>
                <SelectItem value="ttb" {...colsDirectionSelectPreview.getItemPreviewProps("ttb")}>Top to Bottom</SelectItem>
                <SelectItem value="btt" {...colsDirectionSelectPreview.getItemPreviewProps("btt")}>Bottom to top</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-gray-600">Columns</Label>
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
          <Label className="text-sm text-gray-600">Rows</Label>
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
      <hr />
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-gray-600">Baseline Multiple</Label>
          <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">
            {gutterMultiple}×
          </span>
        </div>
        <DebouncedSlider
          value={[gutterMultiple]}
          min={GUTTER_MULTIPLE_RANGE.min}
          max={GUTTER_MULTIPLE_RANGE.max}
          step={GUTTER_MULTIPLE_RANGE.step}
          onValueCommit={([v]) => onGutterMultipleChange(v)}
          onThumbDoubleClick={() => onGutterMultipleChange(1)}
        />
      </div>
    </PanelCard>
  )
})

GutterPanel.displayName = "GutterPanel"
