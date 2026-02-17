import { useState, useEffect, useCallback } from "react"
import { FORMATS_PT } from "@/lib/grid-calculator"
import type { GridResult } from "@/lib/grid-calculator"
import type { PreviewLayoutState } from "@/components/grid-preview"
import { renderSwissGridVectorPdf } from "@/lib/pdf-vector-export"
import { mmToPt, formatValue } from "@/lib/units"

export type PrintPresetKey = "press_proof" | "offset_final" | "digital_print"

export const PRINT_PRESETS: Array<{
  key: PrintPresetKey
  label: string
  config: { enabled: boolean; bleedMm: number; registrationMarks: boolean; finalSafeGuides: boolean }
}> = [
  {
    key: "press_proof",
    label: "Press Proof",
    config: { enabled: true, bleedMm: 3, registrationMarks: true, finalSafeGuides: false },
  },
  {
    key: "offset_final",
    label: "Offset Final",
    config: { enabled: true, bleedMm: 3, registrationMarks: true, finalSafeGuides: true },
  },
  {
    key: "digital_print",
    label: "Digital Print",
    config: { enabled: false, bleedMm: 0, registrationMarks: false, finalSafeGuides: true },
  },
]

const PRINT_PRO_CROP_OFFSET_MM = 2
const PRINT_PRO_CROP_LENGTH_MM = 5

export type ExportActionsContext = {
  result: GridResult
  previewLayout: PreviewLayoutState | null
  orientation: "portrait" | "landscape"
  rotation: number
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showTypography: boolean
  isDinOrAnsiRatio: boolean
  displayUnit: "pt" | "mm" | "px"
  setDisplayUnit: (u: "pt" | "mm" | "px") => void
  exportPaperSize: string
  setExportPaperSize: (s: string) => void
  exportPrintPro: boolean
  setExportPrintPro: (b: boolean) => void
  exportBleedMm: number
  setExportBleedMm: (n: number) => void
  exportRegistrationMarks: boolean
  setExportRegistrationMarks: (b: boolean) => void
  exportFinalSafeGuides: boolean
  setExportFinalSafeGuides: (b: boolean) => void
  paperSizeOptions: Array<{ value: string; label: string }>
  previewFormat: string
  defaultPdfFilename: string
  defaultJsonFilename: string
  /** Returns the full uiSettings payload for JSON save. */
  buildUiSettingsPayload: () => object
}

export function useExportActions(ctx: ExportActionsContext) {
  const {
    result,
    previewLayout,
    orientation,
    rotation,
    showBaselines,
    showModules,
    showMargins,
    showTypography,
    isDinOrAnsiRatio,
    displayUnit,
    setDisplayUnit,
    exportPaperSize,
    setExportPaperSize,
    exportPrintPro,
    setExportPrintPro,
    exportBleedMm,
    setExportBleedMm,
    exportRegistrationMarks,
    setExportRegistrationMarks,
    exportFinalSafeGuides,
    setExportFinalSafeGuides,
    previewFormat,
    defaultPdfFilename,
    defaultJsonFilename,
    buildUiSettingsPayload,
  } = ctx
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [exportFilenameDraft, setExportFilenameDraft] = useState("")
  const [exportPaperSizeDraft, setExportPaperSizeDraft] = useState(exportPaperSize)
  const [exportPrintProDraft, setExportPrintProDraft] = useState(exportPrintPro)
  const [exportBleedMmDraft, setExportBleedMmDraft] = useState(String(exportBleedMm))
  const [exportRegistrationMarksDraft, setExportRegistrationMarksDraft] = useState(exportRegistrationMarks)
  const [exportFinalSafeGuidesDraft, setExportFinalSafeGuidesDraft] = useState(exportFinalSafeGuides)
  const [exportWidthDraft, setExportWidthDraft] = useState("")
  const [saveFilenameDraft, setSaveFilenameDraft] = useState("")

  const getOrientedDimensions = useCallback(
    (paperSize: string) => {
      const base = FORMATS_PT[paperSize] ?? FORMATS_PT[previewFormat]
      if (orientation === "landscape") {
        return { width: base.height, height: base.width }
      }
      return { width: base.width, height: base.height }
    },
    [orientation, previewFormat],
  )

  const saveJSON = useCallback(
    (filename: string) => {
      const trimmed = filename.trim()
      if (!trimmed) return
      const normalizedFilename = trimmed.toLowerCase().endsWith(".json") ? trimmed : `${trimmed}.json`
      const payload = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        gridResult: result,
        uiSettings: buildUiSettingsPayload(),
        previewLayout,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = normalizedFilename
      a.click()
      URL.revokeObjectURL(url)
    },
    [buildUiSettingsPayload, previewLayout, result],
  )

  const openSaveDialog = useCallback(() => {
    setSaveFilenameDraft(defaultJsonFilename)
    setIsSaveDialogOpen(true)
  }, [defaultJsonFilename])

  const confirmSaveJSON = useCallback(() => {
    const trimmedName = saveFilenameDraft.trim()
    if (!trimmedName) return
    saveJSON(trimmedName)
    setIsSaveDialogOpen(false)
  }, [saveFilenameDraft, saveJSON])

  const exportPDF = useCallback(
    async (
      width: number,
      height: number,
      filename: string,
      printProConfig: { enabled: boolean; bleedMm: number; registrationMarks: boolean; finalSafeGuides: boolean },
    ) => {
      const { default: jsPDF } = await import("jspdf")
      const { enabled, bleedMm, registrationMarks, finalSafeGuides } = printProConfig
      const bleedPt = mmToPt(bleedMm)
      const cropOffsetPt = mmToPt(PRINT_PRO_CROP_OFFSET_MM)
      const cropLengthPt = mmToPt(PRINT_PRO_CROP_LENGTH_MM)
      const cropMarginPt = bleedPt + cropOffsetPt + cropLengthPt
      const originX = enabled ? cropMarginPt : 0
      const originY = enabled ? cropMarginPt : 0
      const pageWidth = enabled ? width + cropMarginPt * 2 : width
      const pageHeight = enabled ? height + cropMarginPt * 2 : height

      const pdf = new jsPDF({
        orientation: pageWidth > pageHeight ? "landscape" : "portrait",
        unit: "pt",
        format: [pageWidth, pageHeight],
        compress: true,
        putOnlyUsedFonts: true,
        precision: 12,
        floatPrecision: "smart",
        userUnit: 1,
      })
      pdf.setDocumentProperties({
        title: filename,
        author: "Generated by Swiss Grid Generator",
        subject: "Swiss Grid Vector Export",
        creator: "Swiss Grid Generator",
        keywords: "swiss grid, typography, modular grid, vector pdf",
      })
      pdf.setCreationDate(new Date())
      pdf.setLanguage("en-US")
      pdf.viewerPreferences({
        DisplayDocTitle: true,
        PrintScaling: "None",
        PickTrayByPDFSize: true,
        PrintArea: "TrimBox",
        PrintClip: "TrimBox",
        ViewArea: "TrimBox",
        ViewClip: "TrimBox",
      })
      renderSwissGridVectorPdf({
        pdf,
        width,
        height,
        result,
        layout: previewLayout,
        originX,
        originY,
        printPro: {
          enabled,
          bleedPt,
          cropMarkOffsetPt: cropOffsetPt,
          cropMarkLengthPt: cropLengthPt,
          showBleedGuide: enabled,
          registrationMarks,
          monochromeGuides: finalSafeGuides,
        },
        rotation,
        showBaselines,
        showModules,
        showMargins,
        showTypography,
      })
      pdf.save(filename)
    },
    [previewLayout, result, rotation, showBaselines, showMargins, showModules, showTypography],
  )

  const openExportDialog = useCallback(() => {
    const dims = getOrientedDimensions(exportPaperSize)
    setExportPaperSizeDraft(exportPaperSize)
    setExportPrintProDraft(exportPrintPro)
    setExportBleedMmDraft(String(exportBleedMm))
    setExportRegistrationMarksDraft(exportRegistrationMarks)
    setExportFinalSafeGuidesDraft(exportFinalSafeGuides)
    setExportFilenameDraft(defaultPdfFilename)
    setExportWidthDraft(formatValue(dims.width, isDinOrAnsiRatio ? displayUnit : "mm"))
    setIsExportDialogOpen(true)
  }, [
    defaultPdfFilename,
    displayUnit,
    exportBleedMm,
    exportFinalSafeGuides,
    exportPaperSize,
    exportPrintPro,
    exportRegistrationMarks,
    getOrientedDimensions,
    isDinOrAnsiRatio,
  ])

  const applyPrintPreset = useCallback((presetKey: PrintPresetKey) => {
    const preset = PRINT_PRESETS.find((entry) => entry.key === presetKey)
    if (!preset) return
    setExportPrintProDraft(preset.config.enabled)
    setExportBleedMmDraft(String(preset.config.bleedMm))
    setExportRegistrationMarksDraft(preset.config.registrationMarks)
    setExportFinalSafeGuidesDraft(preset.config.finalSafeGuides)
  }, [])

  const confirmExportPDF = useCallback(async () => {
    const trimmedName = exportFilenameDraft.trim()
    if (!trimmedName) return
    const filename = trimmedName.toLowerCase().endsWith(".pdf") ? trimmedName : `${trimmedName}.pdf`
    const baseDims = getOrientedDimensions(exportPaperSizeDraft)
    const aspectRatio = baseDims.height / baseDims.width
    const parsedWidth = Number(exportWidthDraft)
    const parsedBleed = Number(exportBleedMmDraft)
    const bleedMm =
      Number.isFinite(parsedBleed) && parsedBleed >= 0 ? parsedBleed : exportBleedMm
    const width = isDinOrAnsiRatio
      ? baseDims.width
      : Number.isFinite(parsedWidth) && parsedWidth > 0
        ? mmToPt(parsedWidth)
        : baseDims.width
    const height = width * aspectRatio
    setExportPaperSize(exportPaperSizeDraft)
    setExportPrintPro(exportPrintProDraft)
    setExportBleedMm(bleedMm)
    setExportRegistrationMarks(exportRegistrationMarksDraft)
    setExportFinalSafeGuides(exportFinalSafeGuidesDraft)
    await exportPDF(width, height, filename, {
      enabled: exportPrintProDraft,
      bleedMm,
      registrationMarks: exportRegistrationMarksDraft,
      finalSafeGuides: exportFinalSafeGuidesDraft,
    })
    setIsExportDialogOpen(false)
  }, [
    exportBleedMm,
    exportBleedMmDraft,
    exportFinalSafeGuidesDraft,
    exportFilenameDraft,
    exportPaperSizeDraft,
    exportPrintProDraft,
    exportRegistrationMarksDraft,
    exportWidthDraft,
    exportPDF,
    getOrientedDimensions,
    isDinOrAnsiRatio,
    setExportBleedMm,
    setExportFinalSafeGuides,
    setExportPaperSize,
    setExportPrintPro,
    setExportRegistrationMarks,
  ])

  // Close export dialog on Escape
  useEffect(() => {
    if (!isExportDialogOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setIsExportDialogOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isExportDialogOpen])

  return {
    // Save dialog
    isSaveDialogOpen,
    setIsSaveDialogOpen,
    saveFilenameDraft,
    setSaveFilenameDraft,
    openSaveDialog,
    confirmSaveJSON,
    // Export dialog
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportFilenameDraft,
    setExportFilenameDraft,
    exportPaperSizeDraft,
    setExportPaperSizeDraft,
    exportPrintProDraft,
    setExportPrintProDraft,
    exportBleedMmDraft,
    setExportBleedMmDraft,
    exportRegistrationMarksDraft,
    setExportRegistrationMarksDraft,
    exportFinalSafeGuidesDraft,
    setExportFinalSafeGuidesDraft,
    exportWidthDraft,
    setExportWidthDraft,
    openExportDialog,
    applyPrintPreset,
    confirmExportPDF,
    getOrientedDimensions,
  }
}
