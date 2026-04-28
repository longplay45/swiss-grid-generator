"use client"

import { ExportDialog } from "@/components/dialogs/ExportDialog"
import { NoticeDialog } from "@/components/dialogs/NoticeDialog"
import { SaveLibraryDialog } from "@/components/dialogs/SaveLibraryDialog"
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
    jsonTitle: string
    onJsonTitleChange: (value: string) => void
    jsonDescription: string
    onJsonDescriptionChange: (value: string) => void
    jsonAuthor: string
    onJsonAuthorChange: (value: string) => void
    jsonCompressionEnabled: boolean
    onJsonCompressionEnabledChange: (value: boolean) => void
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
  saveLibraryDialog: {
    isOpen: boolean
    onClose: () => void
    title: string
    onTitleChange: (value: string) => void
    description: string
    onDescriptionChange: (value: string) => void
    author: string
    onAuthorChange: (value: string) => void
    onConfirm: () => void
  }
  noticeState: NoticeState
  onCloseNotice: () => void
}

export function WorkspaceDialogs({
  isDarkUi,
  exportDialog,
  saveLibraryDialog,
  noticeState,
  onCloseNotice,
}: Props) {
  return (
    <>
      <ExportDialog
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
        jsonTitleDraft={exportDialog.jsonTitle}
        onJsonTitleChange={exportDialog.onJsonTitleChange}
        jsonDescriptionDraft={exportDialog.jsonDescription}
        onJsonDescriptionChange={exportDialog.onJsonDescriptionChange}
        jsonAuthorDraft={exportDialog.jsonAuthor}
        onJsonAuthorChange={exportDialog.onJsonAuthorChange}
        jsonCompressionEnabledDraft={exportDialog.jsonCompressionEnabled}
        onJsonCompressionEnabledChange={exportDialog.onJsonCompressionEnabledChange}
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

      <SaveLibraryDialog
        isOpen={saveLibraryDialog.isOpen}
        onClose={saveLibraryDialog.onClose}
        isDarkUi={isDarkUi}
        title={saveLibraryDialog.title}
        onTitleChange={saveLibraryDialog.onTitleChange}
        description={saveLibraryDialog.description}
        onDescriptionChange={saveLibraryDialog.onDescriptionChange}
        author={saveLibraryDialog.author}
        onAuthorChange={saveLibraryDialog.onAuthorChange}
        onConfirm={saveLibraryDialog.onConfirm}
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
