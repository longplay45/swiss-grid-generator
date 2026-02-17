import { Label } from "@/components/ui/label"
import { DebouncedSlider } from "@/components/ui/slider"
import { PanelCard } from "@/components/settings/PanelCard"

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
  isDarkMode: boolean
}

export function GutterPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  gridCols,
  onGridColsChange,
  gridRows,
  onGridRowsChange,
  gutterMultiple,
  onGutterMultipleChange,
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Vertical Fields</Label>
          <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">{gridCols}</span>
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
          <Label>Horizontal Fields</Label>
          <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">{gridRows}</span>
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
          <Label>Baseline Multiple</Label>
          <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">
            {gutterMultiple}×
          </span>
        </div>
        <DebouncedSlider
          value={[gutterMultiple]}
          min={0.5}
          max={4}
          step={0.5}
          onValueCommit={([v]) => onGutterMultipleChange(v)}
        />
      </div>
    </PanelCard>
  )
}
