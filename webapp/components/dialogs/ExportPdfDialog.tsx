import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { EXPORT_DIALOG_PRINT_PRESETS } from "@/hooks/useExportActions"
import type { ExportFormat, PrintPresetKey } from "@/hooks/useExportActions"
import { cn } from "@/lib/utils"

type Props = {
  isOpen: boolean
  onClose: () => void
  isDarkUi: boolean
  selectedPageCount: number
  pageRangeOptions: Array<{ value: string; label: string }>
  exportRangeStartDraft: number
  onExportRangeStartChange: (value: string) => void
  exportRangeEndDraft: number
  onExportRangeEndChange: (value: string) => void
  exportFormatDraft: ExportFormat
  onExportFormatChange: (value: ExportFormat) => void
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
  onConfirm: () => void
}

export function ExportPdfDialog({
  isOpen,
  onClose,
  isDarkUi,
  selectedPageCount,
  pageRangeOptions,
  exportRangeStartDraft,
  onExportRangeStartChange,
  exportRangeEndDraft,
  onExportRangeEndChange,
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
}: Props) {
  if (!isOpen) return null

  const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
  const helpTextClassName = "text-xs text-muted-foreground"
  const toggleRowClassName = "flex items-center justify-between rounded-md border border-input bg-background px-3 py-2"
  const dialogThemeClassName = isDarkUi ? "dark" : undefined
  const isPdfExport = exportFormatDraft === "pdf"
  const isSvgExport = exportFormatDraft === "svg"
  const isIdmlExport = exportFormatDraft === "idml"
  const isMultiPageSelection = selectedPageCount > 1

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 md:items-center">
      <div
        className={cn(
          dialogThemeClassName,
          "w-full max-w-md max-h-[90vh] space-y-4 overflow-y-auto rounded-lg border border-border bg-background p-4 text-foreground shadow-xl",
        )}
      >
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Export</h3>
          <p className={helpTextClassName}>
            WYSIWYG: exports exactly what is currently shown in the preview, including baselines, margins, grid/modules,
            typography, and image placeholders. All exports stay vector-based. Use `SVG` or `IDML` when you need
            typography frozen into non-live geometry.
          </p>
        </div>
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
        {pageRangeOptions.length > 1 && (
          <div className="space-y-2">
            <Label>Pages</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">From</Label>
                <Select
                  value={String(exportRangeStartDraft)}
                  onValueChange={onExportRangeStartChange}
                >
                  <SelectTrigger aria-label="Export from page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={dialogThemeClassName}>
                    {pageRangeOptions.map((option) => (
                      <SelectItem key={`from-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">To</Label>
                <Select
                  value={String(exportRangeEndDraft)}
                  onValueChange={onExportRangeEndChange}
                >
                  <SelectTrigger aria-label="Export to page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={dialogThemeClassName}>
                    {pageRangeOptions.map((option) => (
                      <SelectItem key={`to-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        {isIdmlExport && (
          <p className={helpTextClassName}>
            IDML v1 exports the selected page range. Each page keeps its stored size, margins, bleed, guides,
            placeholders, and outlined glyph geometry for maximum fidelity. Typography is no longer editable as live
            text downstream.
          </p>
        )}
        {!isIdmlExport && isMultiPageSelection && (
          <p className={helpTextClassName}>
            Multi-page PDF and SVG exports keep each selected page at its stored document size.
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
            {isMultiPageSelection
              ? "SVG v1 exports a ZIP with one trim-sized outlined SVG per selected page. Typography is converted to glyph paths for geometric fidelity, so exported text is not live-editable. PDF print presets are not applied."
              : "SVG v1 exports trim-sized glyph-outline vectors, guides, and placeholders. Typography is converted to exact glyph paths, so exported text is not live-editable. PDF print presets are not applied."}
          </p>
        ) : (
          <p className={helpTextClassName}>
            IDML v1 exports the selected project page range as an InDesign package with separate guides, outlined
            typography, and placeholder layers. Exported typography is frozen as geometry rather than live text.
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
