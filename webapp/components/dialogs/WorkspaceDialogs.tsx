"use client"

import { ExportPdfDialog } from "@/components/dialogs/ExportPdfDialog"
import { NoticeDialog } from "@/components/dialogs/NoticeDialog"
import { SaveJsonDialog } from "@/components/dialogs/SaveJsonDialog"
import type { ExportFormat, PrintPresetKey } from "@/hooks/useExportActions"
import type { DisplayUnit } from "@/lib/config/defaults"

type NoticeState = {
  title: string
  message: string
} | null

type PaperSizeOption = {
  value: string
  label: string
}

type Props = {
  ratioLabel: string
  orientation: "portrait" | "landscape"
  rotation: number
  isDarkUi: boolean
  displayUnit: DisplayUnit
  onDisplayUnitChange: (unit: DisplayUnit) => void
  exportDialog: {
    isOpen: boolean
    onClose: () => void
    selectedPageCount: number
    ratioLabel: string
    orientation: string
    rotation: number
    isDinOrAnsiRatio: boolean
    usesStoredPageSizes: boolean
    pageRangeOptions: PaperSizeOption[]
    rangeStart: number
    onRangeStartChange: (value: string) => void
    rangeEnd: number
    onRangeEndChange: (value: string) => void
    paperSize: string
    onPaperSizeChange: (value: string) => void
    paperSizeOptions: PaperSizeOption[]
    width: string
    onWidthChange: (value: string) => void
    format: ExportFormat
    onFormatChange: (value: ExportFormat) => void
    filename: string
    onFilenameChange: (value: string) => void
    defaultFilename: string
    activePrintPreset: PrintPresetKey | null
    showPrintAdjustments: boolean
    onApplyPrintPreset: (key: PrintPresetKey) => void
    bleedMm: string
    onBleedMmChange: (value: string) => void
    registrationMarks: boolean
    onRegistrationMarksChange: (value: boolean) => void
    onConfirm: () => void
    getOrientedDimensions: (paperSize: string) => { width: number; height: number }
  }
  saveDialog: {
    isOpen: boolean
    onClose: () => void
    filename: string
    onFilenameChange: (value: string) => void
    title: string
    onTitleChange: (value: string) => void
    description: string
    onDescriptionChange: (value: string) => void
    author: string
    onAuthorChange: (value: string) => void
    onConfirm: () => void
    defaultFilename: string
  }
  noticeState: NoticeState
  onCloseNotice: () => void
}

export function WorkspaceDialogs({
  ratioLabel,
  orientation,
  rotation,
  isDarkUi,
  displayUnit,
  onDisplayUnitChange,
  exportDialog,
  saveDialog,
  noticeState,
  onCloseNotice,
}: Props) {
  return (
    <>
      <ExportPdfDialog
        isOpen={exportDialog.isOpen}
        onClose={exportDialog.onClose}
        isDarkUi={isDarkUi}
        selectedPageCount={exportDialog.selectedPageCount}
        ratioLabel={exportDialog.ratioLabel}
        orientation={exportDialog.orientation}
        rotation={exportDialog.rotation}
        isDinOrAnsiRatio={exportDialog.isDinOrAnsiRatio}
        usesStoredPageSizes={exportDialog.usesStoredPageSizes}
        pageRangeOptions={exportDialog.pageRangeOptions}
        exportRangeStartDraft={exportDialog.rangeStart}
        onExportRangeStartChange={exportDialog.onRangeStartChange}
        exportRangeEndDraft={exportDialog.rangeEnd}
        onExportRangeEndChange={exportDialog.onRangeEndChange}
        displayUnit={displayUnit}
        onDisplayUnitChange={onDisplayUnitChange}
        exportPaperSizeDraft={exportDialog.paperSize}
        onExportPaperSizeChange={exportDialog.onPaperSizeChange}
        paperSizeOptions={exportDialog.paperSizeOptions}
        exportWidthDraft={exportDialog.width}
        onExportWidthChange={exportDialog.onWidthChange}
        exportFormatDraft={exportDialog.format}
        onExportFormatChange={exportDialog.onFormatChange}
        exportFilenameDraft={exportDialog.filename}
        onExportFilenameChange={exportDialog.onFilenameChange}
        defaultFilename={exportDialog.defaultFilename}
        activePrintPresetDraft={exportDialog.activePrintPreset}
        showPrintAdjustmentsDraft={exportDialog.showPrintAdjustments}
        onApplyPrintPreset={exportDialog.onApplyPrintPreset}
        exportBleedMmDraft={exportDialog.bleedMm}
        onExportBleedMmChange={exportDialog.onBleedMmChange}
        exportRegistrationMarksDraft={exportDialog.registrationMarks}
        onExportRegistrationMarksChange={exportDialog.onRegistrationMarksChange}
        onConfirm={exportDialog.onConfirm}
        getOrientedDimensions={exportDialog.getOrientedDimensions}
      />

      <SaveJsonDialog
        isOpen={saveDialog.isOpen}
        onClose={saveDialog.onClose}
        filename={saveDialog.filename}
        onFilenameChange={saveDialog.onFilenameChange}
        title={saveDialog.title}
        onTitleChange={saveDialog.onTitleChange}
        description={saveDialog.description}
        onDescriptionChange={saveDialog.onDescriptionChange}
        author={saveDialog.author}
        onAuthorChange={saveDialog.onAuthorChange}
        onConfirm={saveDialog.onConfirm}
        defaultFilename={saveDialog.defaultFilename}
        ratioLabel={ratioLabel}
        orientation={orientation}
        rotation={rotation}
      />

      <NoticeDialog
        isOpen={noticeState !== null}
        title={noticeState?.title ?? ""}
        message={noticeState?.message ?? ""}
        onClose={onCloseNotice}
      />
    </>
  )
}
