import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { EXPORT_DIALOG_PRINT_PRESETS } from "@/hooks/useExportActions"
import type { ExportFormat, PrintPresetKey } from "@/hooks/useExportActions"
import { formatValue } from "@/lib/units"
import { cn } from "@/lib/utils"

type Props = {
  isOpen: boolean
  onClose: () => void
  isDarkUi: boolean
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
  exportFormatDraft: ExportFormat
  onExportFormatChange: (value: ExportFormat) => void
  // Filename
  exportFilenameDraft: string
  onExportFilenameChange: (value: string) => void
  defaultFilename: string
  activePrintPresetDraft: PrintPresetKey | null
  showPrintAdjustmentsDraft: boolean
  onApplyPrintPreset: (key: PrintPresetKey) => void
  exportBleedMmDraft: string
  onExportBleedMmChange: (value: string) => void
  exportRegistrationMarksDraft: boolean
  onExportRegistrationMarksChange: (value: boolean) => void
  // Actions
  onConfirm: () => void
  getOrientedDimensions: (paperSize: string) => { width: number; height: number }
}

export function ExportPdfDialog({
  isOpen,
  onClose,
  isDarkUi,
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
  exportFormatDraft,
  onExportFormatChange,
  exportFilenameDraft,
  onExportFilenameChange,
  defaultFilename,
  activePrintPresetDraft,
  showPrintAdjustmentsDraft,
  onApplyPrintPreset,
  exportBleedMmDraft,
  onExportBleedMmChange,
  exportRegistrationMarksDraft,
  onExportRegistrationMarksChange,
  onConfirm,
  getOrientedDimensions,
}: Props) {
  if (!isOpen) return null

  const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
  const helpTextClassName = "text-xs text-muted-foreground"
  const toggleRowClassName = "flex items-center justify-between rounded-md border border-input bg-background px-3 py-2"
  const dialogThemeClassName = isDarkUi ? "dark" : undefined
  const isPdfExport = exportFormatDraft === "pdf"
  const isSvgExport = exportFormatDraft === "svg"
  const isIdmlExport = exportFormatDraft === "idml"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 md:items-center">
      <div
        className={cn(
          dialogThemeClassName,
          "w-full max-w-md max-h-[90vh] space-y-4 overflow-y-auto rounded-lg border border-border bg-background p-4 text-foreground shadow-xl",
        )}
      >
        <h3 className="text-base font-semibold">Export</h3>
        <p className={helpTextClassName}>
          Ratio: {ratioLabel} | Orientation: {orientation} | Rotation: {rotation}°
        </p>
        <div className="space-y-2">
          <Label>Format</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={exportFormatDraft === "pdf" ? "default" : "outline"}
              size="sm"
              className="text-[11px]"
              onClick={() => onExportFormatChange("pdf")}
            >
              PDF
            </Button>
            <Button
              type="button"
              variant={exportFormatDraft === "svg" ? "default" : "outline"}
              size="sm"
              className="text-[11px]"
              onClick={() => onExportFormatChange("svg")}
            >
              SVG
            </Button>
            <Button
              type="button"
              variant={exportFormatDraft === "idml" ? "default" : "outline"}
              size="sm"
              className="text-[11px]"
              onClick={() => onExportFormatChange("idml")}
            >
              IDML
            </Button>
          </div>
        </div>
        {isIdmlExport && (
          <p className={helpTextClassName}>
            IDML v1 exports the full project. Each page keeps its stored size, margins, bleed, guides, placeholders,
            and frozen text geometry for InDesign continuation.
          </p>
        )}
        {!isIdmlExport && isDinOrAnsiRatio && (
          <div className="space-y-2">
            <Label>Units / Paper Size</Label>
            <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-2">
              <Select
                value={displayUnit}
                onValueChange={(nextUnit: "pt" | "mm" | "px") => {
                  const dims = getOrientedDimensions(exportPaperSizeDraft)
                  onDisplayUnitChange(nextUnit)
                  onExportWidthChange(formatValue(dims.width, nextUnit))
                }}
              >
                <SelectTrigger aria-label="Export units">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={dialogThemeClassName}>
                  <SelectItem value="mm">mm</SelectItem>
                  <SelectItem value="pt">pt</SelectItem>
                  <SelectItem value="px">px</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={exportPaperSizeDraft}
                onValueChange={(value) => {
                  onExportPaperSizeChange(value)
                  const dims = getOrientedDimensions(value)
                  onExportWidthChange(formatValue(dims.width, displayUnit))
                }}
              >
                <SelectTrigger aria-label="Export paper size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={dialogThemeClassName}>
                  {paperSizeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {!isIdmlExport && !isDinOrAnsiRatio && (
          <div className="space-y-2">
            <Label>Width (mm)</Label>
            <input
              type="number"
              min={1}
              step="0.001"
              value={exportWidthDraft}
              onChange={(event) => onExportWidthChange(event.target.value)}
              className={inputClassName}
            />
          </div>
        )}
        {!isIdmlExport && (
          <p className={helpTextClassName}>
            Height will follow the selected aspect ratio automatically.
          </p>
        )}
        <div className="space-y-2">
          <Label>Filename</Label>
          <input
            type="text"
            value={exportFilenameDraft}
            onChange={(event) => onExportFilenameChange(event.target.value)}
            className={inputClassName}
            placeholder={defaultFilename}
          />
        </div>
        {isPdfExport ? (
          <>
            <div className="space-y-2">
              <Label>Print Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {EXPORT_DIALOG_PRINT_PRESETS.map((preset) => (
                  <Button
                    key={preset.key}
                    type="button"
                    variant={activePrintPresetDraft === preset.key ? "default" : "outline"}
                    size="sm"
                    className="text-[11px]"
                    onClick={() => onApplyPrintPreset(preset.key)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            {showPrintAdjustmentsDraft && (
              <>
                <div className="space-y-2">
                  <Label>Bleed (mm)</Label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={exportBleedMmDraft}
                    onChange={(event) => onExportBleedMmChange(event.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div className={toggleRowClassName}>
                  <div className="space-y-0.5">
                    <Label className="text-sm">Registration-Style Marks</Label>
                    <p className="text-[11px] text-muted-foreground">Uses rich CMYK marks instead of black.</p>
                  </div>
                  <Switch
                    checked={exportRegistrationMarksDraft}
                    onCheckedChange={onExportRegistrationMarksChange}
                  />
                </div>
              </>
            )}
          </>
        ) : isSvgExport ? (
          <p className={helpTextClassName}>
            SVG v1 exports live vector text, guides, and placeholders at trim size. PDF print presets are not applied.
          </p>
        ) : (
          <p className={helpTextClassName}>
            IDML v1 exports the entire project as an InDesign package with separate guides, typography, and placeholder
            layers.
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            {isPdfExport ? "Export PDF" : isSvgExport ? "Export SVG" : "Export IDML"}
          </Button>
        </div>
      </div>
    </div>
  )
}
