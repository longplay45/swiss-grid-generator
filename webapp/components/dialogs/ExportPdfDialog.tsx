import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { PRINT_PRESETS } from "@/hooks/useExportActions"
import type { PrintPresetKey } from "@/hooks/useExportActions"
import { formatValue } from "@/lib/units"

type Props = {
  isOpen: boolean
  onClose: () => void
  // Info
  ratioLabel: string
  orientation: string
  rotation: number
  isDinOrAnsiRatio: boolean
  // Paper size (DIN/ANSI)
  displayUnit: "pt" | "mm" | "px"
  onDisplayUnitChange: (unit: "pt" | "mm" | "px") => void
  exportPaperSizeDraft: string
  onExportPaperSizeChange: (value: string) => void
  paperSizeOptions: Array<{ value: string; label: string }>
  // Custom width (non-DIN/ANSI)
  exportWidthDraft: string
  onExportWidthChange: (value: string) => void
  // Filename
  exportFilenameDraft: string
  onExportFilenameChange: (value: string) => void
  defaultPdfFilename: string
  // Print Pro
  exportPrintProDraft: boolean
  onExportPrintProChange: (value: boolean) => void
  onApplyPrintPreset: (key: PrintPresetKey) => void
  exportBleedMmDraft: string
  onExportBleedMmChange: (value: string) => void
  exportRegistrationMarksDraft: boolean
  onExportRegistrationMarksChange: (value: boolean) => void
  exportFinalSafeGuidesDraft: boolean
  onExportFinalSafeGuidesChange: (value: boolean) => void
  // Actions
  onConfirm: () => void
  getOrientedDimensions: (paperSize: string) => { width: number; height: number }
}

export function ExportPdfDialog({
  isOpen,
  onClose,
  ratioLabel,
  orientation,
  rotation,
  isDinOrAnsiRatio,
  displayUnit,
  onDisplayUnitChange,
  exportPaperSizeDraft,
  onExportPaperSizeChange,
  paperSizeOptions,
  exportWidthDraft,
  onExportWidthChange,
  exportFilenameDraft,
  onExportFilenameChange,
  defaultPdfFilename,
  exportPrintProDraft,
  onExportPrintProChange,
  onApplyPrintPreset,
  exportBleedMmDraft,
  onExportBleedMmChange,
  exportRegistrationMarksDraft,
  onExportRegistrationMarksChange,
  exportFinalSafeGuidesDraft,
  onExportFinalSafeGuidesChange,
  onConfirm,
  getOrientedDimensions,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border bg-white p-4 shadow-xl space-y-4">
        <h3 className="text-base font-semibold">Export PDF</h3>
        <p className="text-xs text-gray-600">
          Ratio: {ratioLabel} | Orientation: {orientation} | Rotation: {rotation}°
        </p>
        {isDinOrAnsiRatio && (
          <>
            <div className="space-y-2">
              <Label>Units</Label>
              <Select
                value={displayUnit}
                onValueChange={(nextUnit: "pt" | "mm" | "px") => {
                  const dims = getOrientedDimensions(exportPaperSizeDraft)
                  onDisplayUnitChange(nextUnit)
                  onExportWidthChange(formatValue(dims.width, nextUnit))
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">mm</SelectItem>
                  <SelectItem value="pt">pt</SelectItem>
                  <SelectItem value="px">px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paper Size</Label>
              <Select
                value={exportPaperSizeDraft}
                onValueChange={(value) => {
                  onExportPaperSizeChange(value)
                  const dims = getOrientedDimensions(value)
                  onExportWidthChange(formatValue(dims.width, displayUnit))
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paperSizeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        {!isDinOrAnsiRatio && (
          <div className="space-y-2">
            <Label>Width (mm)</Label>
            <input
              type="number"
              min={1}
              step="0.001"
              value={exportWidthDraft}
              onChange={(event) => onExportWidthChange(event.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
        )}
        <p className="text-xs text-gray-600">
          Height will follow the selected aspect ratio automatically.
        </p>
        <div className="space-y-2">
          <Label>Filename</Label>
          <input
            type="text"
            value={exportFilenameDraft}
            onChange={(event) => onExportFilenameChange(event.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            placeholder={defaultPdfFilename}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
          <div className="space-y-0.5">
            <Label className="text-sm">Print Pro</Label>
            <p className="text-[11px] text-gray-600">Adds bleed and crop marks as vectors.</p>
          </div>
          <Switch checked={exportPrintProDraft} onCheckedChange={onExportPrintProChange} />
        </div>
        <div className="space-y-2">
          <Label>Print Presets</Label>
          <div className="grid grid-cols-3 gap-2">
            {PRINT_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                variant="outline"
                size="sm"
                className="text-[11px]"
                onClick={() => onApplyPrintPreset(preset.key)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
        {exportPrintProDraft && (
          <>
            <div className="space-y-2">
              <Label>Bleed (mm)</Label>
              <input
                type="number"
                min={0}
                step="0.1"
                value={exportBleedMmDraft}
                onChange={(event) => onExportBleedMmChange(event.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-sm">Registration-Style Marks</Label>
                <p className="text-[11px] text-gray-600">Uses rich CMYK marks instead of black.</p>
              </div>
              <Switch
                checked={exportRegistrationMarksDraft}
                onCheckedChange={onExportRegistrationMarksChange}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-sm">Final-Safe Guide Colors</Label>
                <p className="text-[11px] text-gray-600">
                  Neutral grayscale guides, no cyan/magenta accents.
                </p>
              </div>
              <Switch
                checked={exportFinalSafeGuidesDraft}
                onCheckedChange={onExportFinalSafeGuidesChange}
              />
            </div>
          </>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Export PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
