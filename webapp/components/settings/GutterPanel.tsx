import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

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
}: Props) {
  return (
    <Card>
      <CardHeader
        className="group relative pb-3 cursor-pointer select-none"
        onClick={onHeaderClick}
        onDoubleClick={onHeaderDoubleClick}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          IV. Gutter
          <span
            className={`ml-auto text-base leading-none transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
          >
            ▼
          </span>
        </CardTitle>
        <div className="pointer-events-none absolute left-4 top-full z-20 mt-1 w-max rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
          Grid columns, rows, and gutter multiple
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Vertical Fields</Label>
              <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{gridCols}</span>
            </div>
            <Slider
              value={[gridCols]}
              min={1}
              max={13}
              step={1}
              onValueChange={([v]) => onGridColsChange(v)}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Horizontal Fields</Label>
              <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{gridRows}</span>
            </div>
            <Slider
              value={[gridRows]}
              min={1}
              max={13}
              step={1}
              onValueChange={([v]) => onGridRowsChange(v)}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Baseline Multiple</Label>
              <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                {gutterMultiple}×
              </span>
            </div>
            <Slider
              value={[gutterMultiple]}
              min={0.5}
              max={4}
              step={0.5}
              onValueChange={([v]) => onGutterMultipleChange(v)}
            />
          </div>
        </CardContent>
      )}
    </Card>
  )
}
