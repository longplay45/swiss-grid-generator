"use client"

import { ExportPdfDialog } from "@/components/dialogs/ExportPdfDialog"
import { NoticeDialog } from "@/components/dialogs/NoticeDialog"
import { SaveJsonDialog } from "@/components/dialogs/SaveJsonDialog"
import type { ExportFormat, ExportProgressState, PrintPresetKey } from "@/hooks/useExportActions"

type NoticeState = {
  title: string
  message: string
} | null

type DialogOption = {
  value: string
  label: string
}

type Props = {
  ratioLabel: string
  orientation: "portrait" | "landscape"
  rotation: number
  isDarkUi: boolean
  exportDialog: {
    isOpen: boolean
    onClose: () => void
    selectedPageCount: number
    pageRangeOptions: DialogOption[]
    rangeStart: number
    onRangeStartChange: (value: string) => void
    rangeEnd: number
    onRangeEndChange: (value: string) => void
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
    progress: ExportProgressState | null
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
        pageRangeOptions={exportDialog.pageRangeOptions}
        exportRangeStartDraft={exportDialog.rangeStart}
        onExportRangeStartChange={exportDialog.onRangeStartChange}
        exportRangeEndDraft={exportDialog.rangeEnd}
        onExportRangeEndChange={exportDialog.onRangeEndChange}
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
        exportProgress={exportDialog.progress}
      />

      <SaveJsonDialog
        isOpen={saveDialog.isOpen}
        onClose={saveDialog.onClose}
        isDarkUi={isDarkUi}
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
        isDarkUi={isDarkUi}
        title={noticeState?.title ?? ""}
        message={noticeState?.message ?? ""}
        onClose={onCloseNotice}
      />
    </>
  )
}
