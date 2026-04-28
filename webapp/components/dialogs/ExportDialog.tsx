import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { EXPORT_DIALOG_PRINT_PRESETS } from "@/hooks/useExportActions"
import type { ExportFormat, ExportProgressState, PrintPresetKey } from "@/hooks/useExportActions"
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
  jsonTitleDraft: string
  onJsonTitleChange: (value: string) => void
  jsonDescriptionDraft: string
  onJsonDescriptionChange: (value: string) => void
  jsonAuthorDraft: string
  onJsonAuthorChange: (value: string) => void
  jsonCompressionEnabledDraft: boolean
  onJsonCompressionEnabledChange: (value: boolean) => void
  activePrintPresetDraft: PrintPresetKey | null
  showPrintAdjustmentsDraft: boolean
  onApplyPrintPreset: (key: PrintPresetKey) => void
  exportBleedMmDraft: string
  onExportBleedMmChange: (value: string) => void
  exportRegistrationMarksDraft: boolean
  onExportRegistrationMarksChange: (value: boolean) => void
  onConfirm: () => void
  exportProgress: ExportProgressState | null
}

export function ExportDialog({
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
  jsonTitleDraft,
  onJsonTitleChange,
  jsonDescriptionDraft,
  onJsonDescriptionChange,
  jsonAuthorDraft,
  onJsonAuthorChange,
  jsonCompressionEnabledDraft,
  onJsonCompressionEnabledChange,
  activePrintPresetDraft,
  showPrintAdjustmentsDraft,
  onApplyPrintPreset,
  exportBleedMmDraft,
  onExportBleedMmChange,
  exportRegistrationMarksDraft,
  onExportRegistrationMarksChange,
  onConfirm,
  exportProgress,
}: Props) {
  if (!isOpen) return null

  const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
  const helpTextClassName = "text-xs text-muted-foreground"
  const toggleRowClassName = "flex items-center justify-between rounded-md border border-input bg-background px-3 py-2"
  const dialogThemeClassName = isDarkUi ? "dark" : undefined
  const isPdfExport = exportFormatDraft === "pdf"
  const isSvgExport = exportFormatDraft === "svg"
  const isJsonExport = exportFormatDraft === "json"
  const isMultiPageSelection = selectedPageCount > 1
  const isExporting = exportProgress !== null
  const totalProgressPercent = exportProgress
    ? Math.max(0, Math.min(100, Math.round((exportProgress.completedSteps / Math.max(1, exportProgress.totalSteps)) * 100)))
    : 0

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
            Vector exports follow the current preview exactly, including guides, typography, and placeholders. JSON exports preserve the editable project document.
          </p>
        </div>
        {isExporting ? (
          <div className="space-y-2 rounded-md border border-input bg-background px-3 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {exportProgress.phase === "packaging" ? "Finalizing export" : `Rendering page ${exportProgress.currentPageNumber} of ${Math.max(1, exportProgress.totalSteps)}`}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {exportProgress.currentLabel}
                </div>
              </div>
              <div className="shrink-0 text-xs font-medium text-foreground">{totalProgressPercent}%</div>
            </div>
            <div className="h-2 overflow-hidden rounded-sm bg-muted">
              <div
                className="h-full bg-foreground transition-[width] duration-200"
                style={{ width: `${totalProgressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label>Format</Label>
          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              variant={exportFormatDraft === "json" ? "default" : "outline"}
              size="sm"
              className="text-[11px]"
              disabled={isExporting}
              onClick={() => onExportFormatChange("json")}
            >
              JSON
            </Button>
            <Button
              type="button"
              variant={exportFormatDraft === "pdf" ? "default" : "outline"}
              size="sm"
              className="text-[11px]"
              disabled={isExporting}
              onClick={() => onExportFormatChange("pdf")}
            >
              PDF
            </Button>
            <Button
              type="button"
              variant={exportFormatDraft === "svg" ? "default" : "outline"}
              size="sm"
              className="text-[11px]"
              disabled={isExporting}
              onClick={() => onExportFormatChange("svg")}
            >
              SVG
            </Button>
            <Button
              type="button"
              variant={exportFormatDraft === "idml" ? "default" : "outline"}
              size="sm"
              className="text-[11px]"
              disabled={isExporting}
              onClick={() => onExportFormatChange("idml")}
            >
              IDML
            </Button>
          </div>
        </div>
        {!isJsonExport && pageRangeOptions.length > 1 && (
          <div className="space-y-2">
            <Label>Pages</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">From</Label>
                <Select
                  value={String(exportRangeStartDraft)}
                  onValueChange={onExportRangeStartChange}
                  disabled={isExporting}
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
                  disabled={isExporting}
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
        <div className="space-y-2">
          <Label>Filename</Label>
          <input
            type="text"
            value={exportFilenameDraft}
            onChange={(event) => onExportFilenameChange(event.target.value)}
            disabled={isExporting}
            className={inputClassName}
            placeholder={defaultFilename}
          />
        </div>
        {isJsonExport ? (
          <>
            <div className="space-y-2">
              <Label>Project Title</Label>
              <input
                type="text"
                value={jsonTitleDraft}
                onChange={(event) => onJsonTitleChange(event.target.value)}
                disabled={isExporting}
                className={inputClassName}
                placeholder="Project title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <textarea
                value={jsonDescriptionDraft}
                onChange={(event) => onJsonDescriptionChange(event.target.value)}
                disabled={isExporting}
                className={`${inputClassName} min-h-20`}
                placeholder="Short description"
              />
            </div>
            <div className="space-y-2">
              <Label>Author (optional)</Label>
              <input
                type="text"
                value={jsonAuthorDraft}
                onChange={(event) => onJsonAuthorChange(event.target.value)}
                disabled={isExporting}
                className={inputClassName}
                placeholder="Author name"
              />
            </div>
            <label className="flex items-start gap-2 rounded-md border border-input bg-background px-3 py-2">
              <input
                type="checkbox"
                checked={jsonCompressionEnabledDraft}
                onChange={(event) => onJsonCompressionEnabledChange(event.target.checked)}
                disabled={isExporting}
                className="mt-0.5 h-3.5 w-3.5"
              />
              <span className="space-y-0.5">
                <span className="block text-sm text-foreground">Gzip-compress export</span>
                <span className="block text-xs text-muted-foreground">
                  Save compressed project files as <code>.swissgridgenerator</code> instead of plain <code>.json</code>.
                </span>
              </span>
            </label>
            <p className={helpTextClassName}>
              JSON exports the full editable project document, including all pages, metadata, and current layout state.
            </p>
          </>
        ) : null}
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
                    disabled={isExporting}
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
                    disabled={isExporting}
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
                    disabled={isExporting}
                  />
                </div>
              </>
            )}
          </>
        ) : isSvgExport ? (
          <p className={helpTextClassName}>
            {isMultiPageSelection
              ? "SVG v1 exports a ZIP with one trim-sized outlined SVG per selected page. Typography is converted to glyph paths for geometric fidelity, so exported text is not live-editable."
              : "SVG v1 exports trim-sized glyph-outline vectors, guides, and placeholders. Typography is converted to exact glyph paths, so exported text is not live-editable."}
          </p>
        ) : isJsonExport ? null : (
          <p className={helpTextClassName}>
            IDML v1 exports the selected project page range as an InDesign package with separate guides, outlined
            typography, and placeholder layers. Exported typography is frozen as geometry rather than live text.
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Cancel"}
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isExporting}>
            {isExporting
              ? (isPdfExport ? "Exporting PDF" : isSvgExport ? "Exporting SVG" : "Exporting IDML")
              : isPdfExport ? "Export PDF" : isSvgExport ? "Export SVG" : isJsonExport ? "Save JSON" : "Export IDML"}
          </Button>
        </div>
      </div>
    </div>
  )
}
