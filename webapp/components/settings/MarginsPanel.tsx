import { memo } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DebouncedSlider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { PanelCard } from "@/components/settings/PanelCard"
import { BASELINE_MULTIPLE_RANGE } from "@/lib/config/defaults"

type CustomMarginMultipliers = { top: number; left: number; right: number; bottom: number }

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  marginMethod: 1 | 2 | 3
  onMarginMethodChange: (value: 1 | 2 | 3) => void
  baselineMultiple: number
  onBaselineMultipleChange: (value: number) => void
  useCustomMargins: boolean
  onUseCustomMarginsChange: (checked: boolean) => void
  customMarginMultipliers: CustomMarginMultipliers
  onCustomMarginMultipliersChange: (value: CustomMarginMultipliers) => void
  /** Used when initializing custom margins from current method margins. */
  currentMargins: { top: number; left: number; right: number; bottom: number }
  gridUnit: number
  isDarkMode: boolean
}

export const MarginsPanel = memo(function MarginsPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  marginMethod,
  onMarginMethodChange,
  baselineMultiple,
  onBaselineMultipleChange,
  useCustomMargins,
  onUseCustomMarginsChange,
  customMarginMultipliers,
  onCustomMarginMultipliersChange,
  currentMargins,
  gridUnit,
  isDarkMode,
}: Props) {
  const clampCustomMarginMultiplier = (value: number) => Math.max(1, Math.min(9, Math.round(value)))

  const handleCustomMarginsToggle = (checked: boolean) => {
    if (checked) {
      const defaultBaselineMultiple = BASELINE_MULTIPLE_RANGE.min
      const customMarginScale = gridUnit * defaultBaselineMultiple
      onBaselineMultipleChange(defaultBaselineMultiple)
      onCustomMarginMultipliersChange({
        top: clampCustomMarginMultiplier(currentMargins.top / customMarginScale),
        left: clampCustomMarginMultiplier(currentMargins.left / customMarginScale),
        right: clampCustomMarginMultiplier(currentMargins.right / customMarginScale),
        bottom: clampCustomMarginMultiplier(currentMargins.bottom / customMarginScale),
      })
    }
    onUseCustomMarginsChange(checked)
  }

  const collapsedSummary = useCustomMargins
    ? `Custom ${baselineMultiple.toFixed(1)}x: T${customMarginMultipliers.top}x L${customMarginMultipliers.left}x R${customMarginMultipliers.right}x B${customMarginMultipliers.bottom}x`
    : `${marginMethod === 1 ? "Progressive" : marginMethod === 2 ? "Van de Graaf" : "Baseline"}, ${baselineMultiple.toFixed(1)}x`

  const baselineMultipleControl = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-gray-600">Baseline Multiple</Label>
        <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">
          {baselineMultiple.toFixed(1)}×
        </span>
      </div>
      <DebouncedSlider
        value={[baselineMultiple]}
        min={BASELINE_MULTIPLE_RANGE.min}
        max={BASELINE_MULTIPLE_RANGE.max}
        step={BASELINE_MULTIPLE_RANGE.step}
        onValueCommit={([v]) => onBaselineMultipleChange(v)}
      />
    </div>
  )

  return (
    <PanelCard
      title="III. Margins"
      tooltip="Margin method and custom margin controls"
      collapsed={collapsed}
      collapsedSummary={collapsedSummary}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="margins"
      isDarkMode={isDarkMode}
    >
      <div className="flex items-center justify-between">
        <Label className="text-sm text-gray-600">Custom Margins</Label>
        <Switch
          checked={useCustomMargins}
          onCheckedChange={handleCustomMarginsToggle}
          className="h-3 w-6 rounded-none border border-black bg-white data-[state=checked]:bg-white data-[state=unchecked]:bg-white"
          thumbClassName="h-3 w-3 rounded-none border border-black bg-gray-300 shadow-none data-[state=checked]:translate-x-3"
        />
      </div>

      {!useCustomMargins ? (
        <>
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Margin Method</Label>
            <Select
              value={marginMethod.toString()}
              onValueChange={(v) => onMarginMethodChange(parseInt(v) as 1 | 2 | 3)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Progressive (1:2:2:3)</SelectItem>
                <SelectItem value="2">Van de Graaf (2:3:4:6)</SelectItem>
                <SelectItem value="3">Baseline (1:1:1:1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {baselineMultipleControl}
        </>
      ) : (
        <div className="space-y-4">
          {(["top", "left", "right"] as const).map((side) => (
            <div key={side} className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="capitalize text-sm text-gray-600">{side}</Label>
                <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">
                  {customMarginMultipliers[side]}×
                </span>
              </div>
              <DebouncedSlider
                value={[customMarginMultipliers[side]]}
                min={1}
                max={9}
                step={1}
                onValueCommit={([v]) =>
                  onCustomMarginMultipliersChange({ ...customMarginMultipliers, [side]: v })
                }
              />
            </div>
          ))}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="capitalize text-sm text-gray-600">Bottom</Label>
              <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">
                {customMarginMultipliers.bottom}×
              </span>
            </div>
            <DebouncedSlider
              value={[customMarginMultipliers.bottom]}
              min={1}
              max={9}
              step={1}
              onValueCommit={([v]) =>
                onCustomMarginMultipliersChange({ ...customMarginMultipliers, bottom: v })
              }
            />
          </div>
          {baselineMultipleControl}
        </div>
      )}
    </PanelCard>
  )
})

MarginsPanel.displayName = "MarginsPanel"
