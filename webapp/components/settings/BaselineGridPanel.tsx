import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { PanelCard } from "@/components/settings/PanelCard"

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  customBaseline: number
  availableBaselineOptions: number[]
  onCustomBaselineChange: (value: number) => void
  isDarkMode: boolean
}

export function BaselineGridPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  customBaseline,
  availableBaselineOptions,
  onCustomBaselineChange,
  isDarkMode,
}: Props) {
  return (
    <PanelCard
      title="II. Baseline Grid"
      tooltip="Baseline unit for grid and typography"
      collapsed={collapsed}
      collapsedSummary={`${customBaseline} pt`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="baseline"
      isDarkMode={isDarkMode}
    >
      {availableBaselineOptions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Grid Unit</Label>
            <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">
              {customBaseline} pt
            </span>
          </div>
          <Slider
            value={[
              availableBaselineOptions.indexOf(customBaseline) >= 0
                ? availableBaselineOptions.indexOf(customBaseline)
                : 0,
            ]}
            min={0}
            max={availableBaselineOptions.length - 1}
            step={1}
            onValueChange={([v]) => onCustomBaselineChange(availableBaselineOptions[v])}
          />
        </div>
      )}
    </PanelCard>
  )
}
