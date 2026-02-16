import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  gridUnitPt: number
  customBaseline: number
  availableBaselineOptions: number[]
  onCustomBaselineChange: (value: number) => void
}

export function BaselineGridPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  gridUnitPt,
  customBaseline,
  availableBaselineOptions,
  onCustomBaselineChange,
}: Props) {
  return (
    <Card>
      <CardHeader
        className="group relative pb-3 cursor-pointer select-none"
        onClick={onHeaderClick}
        onDoubleClick={onHeaderDoubleClick}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          II. Baseline Grid ({gridUnitPt.toFixed(3)} pt)
          <span
            className={`ml-auto text-base leading-none transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
          >
            ▼
          </span>
        </CardTitle>
        <div className="pointer-events-none absolute left-4 top-full z-20 mt-1 w-max rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
          Baseline unit for grid and typography
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-4">
          {availableBaselineOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Grid Unit</Label>
                <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
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
        </CardContent>
      )}
    </Card>
  )
}
