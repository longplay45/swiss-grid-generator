"use client"

import { ExportPdfDialog } from "@/components/dialogs/ExportPdfDialog"
import { NoticeDialog } from "@/components/dialogs/NoticeDialog"
import { SaveJsonDialog } from "@/components/dialogs/SaveJsonDialog"
import type { PrintPresetKey } from "@/hooks/useExportActions"
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
  isDinOrAnsiRatio: boolean
  displayUnit: DisplayUnit
  onDisplayUnitChange: (unit: DisplayUnit) => void
  exportDialog: {
    isOpen: boolean
    onClose: () => void
    paperSize: string
    onPaperSizeChange: (value: string) => void
    paperSizeOptions: PaperSizeOption[]
    width: string
    onWidthChange: (value: string) => void
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
    finalSafeGuides: boolean
    onFinalSafeGuidesChange: (value: boolean) => void
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
  isDinOrAnsiRatio,
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
        ratioLabel={ratioLabel}
        orientation={orientation}
        rotation={rotation}
        isDinOrAnsiRatio={isDinOrAnsiRatio}
        displayUnit={displayUnit}
        onDisplayUnitChange={onDisplayUnitChange}
        exportPaperSizeDraft={exportDialog.paperSize}
        onExportPaperSizeChange={exportDialog.onPaperSizeChange}
        paperSizeOptions={exportDialog.paperSizeOptions}
        exportWidthDraft={exportDialog.width}
        onExportWidthChange={exportDialog.onWidthChange}
        exportFilenameDraft={exportDialog.filename}
        onExportFilenameChange={exportDialog.onFilenameChange}
        defaultPdfFilename={exportDialog.defaultFilename}
        activePrintPresetDraft={exportDialog.activePrintPreset}
        showPrintAdjustmentsDraft={exportDialog.showPrintAdjustments}
        onApplyPrintPreset={exportDialog.onApplyPrintPreset}
        exportBleedMmDraft={exportDialog.bleedMm}
        onExportBleedMmChange={exportDialog.onBleedMmChange}
        exportRegistrationMarksDraft={exportDialog.registrationMarks}
        onExportRegistrationMarksChange={exportDialog.onRegistrationMarksChange}
        exportFinalSafeGuidesDraft={exportDialog.finalSafeGuides}
        onExportFinalSafeGuidesChange={exportDialog.onFinalSafeGuidesChange}
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
