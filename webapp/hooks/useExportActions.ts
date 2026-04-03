import { useState, useEffect, useCallback } from "react"
import { FORMATS_PT } from "@/lib/grid-calculator"
import type { GridResult } from "@/lib/grid-calculator"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import type { FontFamily } from "@/lib/config/fonts"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import { attachPdfOutputIntent, type PdfExportColorMode, type PdfOutputIntentProfileId } from "@/lib/pdf-output-intent"
import { renderSwissGridVectorPdf } from "@/lib/pdf-vector-export"
import { ensurePdfFontsRegistered } from "@/lib/pdf-font-registry"
import { toProjectJsonFilename } from "@/lib/project-file-naming"
import { mmToPt, formatValue } from "@/lib/units"
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>

type PrintPresetConfig = {
  enabled: boolean
  bleedMm: number
  registrationMarks: boolean
  finalSafeGuides: boolean
}

export type PrintPresetKey = "digital_print" | "press_proof" | "offset_final"

const DIGITAL_PRINT_CONFIG: PrintPresetConfig = {
  enabled: false,
  bleedMm: 0,
  registrationMarks: false,
  finalSafeGuides: true,
}

const PRESS_PROOF_CONFIG: PrintPresetConfig = {
  enabled: true,
  bleedMm: 3,
  registrationMarks: true,
  finalSafeGuides: false,
}

const OFFSET_FINAL_CONFIG: PrintPresetConfig = {
  enabled: true,
  bleedMm: 3,
  registrationMarks: true,
  finalSafeGuides: true,
}

export const PRINT_PRESETS: Array<{
  key: PrintPresetKey
  label: string
  config: PrintPresetConfig
}> = [
  {
    key: "digital_print",
    label: "Digital Print",
    config: DIGITAL_PRINT_CONFIG,
  },
  {
    key: "press_proof",
    label: "Press Proof",
    config: PRESS_PROOF_CONFIG,
  },
  {
    key: "offset_final",
    label: "Offset Final",
    config: OFFSET_FINAL_CONFIG,
  },
]

export const EXPORT_DIALOG_PRINT_PRESETS = PRINT_PRESETS.filter((preset) => preset.key !== "offset_final")

const PRINT_CROP_OFFSET_MM = 2
const PRINT_CROP_LENGTH_MM = 5

function isSamePrintPresetConfig(left: PrintPresetConfig, right: PrintPresetConfig): boolean {
  return left.enabled === right.enabled
    && left.bleedMm === right.bleedMm
    && left.registrationMarks === right.registrationMarks
    && left.finalSafeGuides === right.finalSafeGuides
}

function resolveActivePrintPresetKey(config: PrintPresetConfig): PrintPresetKey | null {
  const match = PRINT_PRESETS.find((preset) => isSamePrintPresetConfig(preset.config, config))
  return match?.key ?? null
}

function resolvePdfExportColorManagement(config: Pick<PrintPresetConfig, "enabled">): {
  colorMode: PdfExportColorMode
  outputIntentProfileId: PdfOutputIntentProfileId
} {
  if (!config.enabled) {
    return {
      colorMode: "rgb",
      outputIntentProfileId: "srgb",
    }
  }

  return {
    colorMode: "cmyk",
    outputIntentProfileId: "coated-fogra39",
  }
}

export type ExportActionsContext = {
  result: GridResult
  previewLayout: PreviewLayoutState | null
  baseFont: FontFamily
  orientation: "portrait" | "landscape"
  rotation: number
  imageColorScheme: ImageColorSchemeId
  canvasBackground: string | null
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
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
  projectMetadata: {
    title: string
    description: string
    author: string
    createdAt?: string
  }
  onProjectMetadataChange: (metadata: {
    title: string
    description: string
    author: string
    createdAt?: string
  }) => void
  buildProjectPayload: () => object
}

export function useExportActions(ctx: ExportActionsContext) {
  const {
    result,
    previewLayout,
    baseFont,
    orientation,
    rotation,
    imageColorScheme,
    canvasBackground,
    showBaselines,
    showModules,
    showMargins,
    showImagePlaceholders,
    showTypography,
    isDinOrAnsiRatio,
    displayUnit,
    exportPaperSize,
    setExportPaperSize,
    exportPrintPro: persistedPrintPresetEnabled,
    setExportPrintPro: setPersistedPrintPresetEnabled,
    exportBleedMm,
    setExportBleedMm,
    exportRegistrationMarks,
    setExportRegistrationMarks,
    exportFinalSafeGuides,
    setExportFinalSafeGuides,
    previewFormat,
    defaultPdfFilename,
    defaultJsonFilename,
    projectMetadata,
    onProjectMetadataChange,
    buildProjectPayload,
  } = ctx
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [exportFilenameDraft, setExportFilenameDraft] = useState("")
  const [exportPaperSizeDraft, setExportPaperSizeDraft] = useState(exportPaperSize)
  const [printPresetEnabledDraft, setPrintPresetEnabledDraft] = useState(persistedPrintPresetEnabled)
  const [exportBleedMmDraft, setExportBleedMmDraft] = useState(String(exportBleedMm))
  const [exportRegistrationMarksDraft, setExportRegistrationMarksDraft] = useState(exportRegistrationMarks)
  const [exportFinalSafeGuidesDraft, setExportFinalSafeGuidesDraft] = useState(exportFinalSafeGuides)
  const [exportWidthDraft, setExportWidthDraft] = useState("")
  const [saveFilenameDraft, setSaveFilenameDraft] = useState("")
  const [saveTitleDraft, setSaveTitleDraft] = useState("")
  const [saveDescriptionDraft, setSaveDescriptionDraft] = useState("")
  const [saveAuthorDraft, setSaveAuthorDraft] = useState("")
  const [saveFilenameTouched, setSaveFilenameTouched] = useState(false)

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
    (filename: string, metadata: { title: string; description: string; author: string; createdAt: string }) => {
      const trimmed = filename.trim()
      if (!trimmed) return
      const normalizedFilename = trimmed.toLowerCase().endsWith(".json") ? trimmed : `${trimmed}.json`
      const payload = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        createdAt: metadata.createdAt,
        ...buildProjectPayload(),
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = normalizedFilename
      a.click()
      URL.revokeObjectURL(url)
    },
    [buildProjectPayload],
  )

  const openSaveDialog = useCallback(() => {
    setSaveFilenameDraft(defaultJsonFilename)
    setSaveTitleDraft(projectMetadata.title ?? "")
    setSaveDescriptionDraft(projectMetadata.description ?? "")
    setSaveAuthorDraft(projectMetadata.author ?? "")
    setSaveFilenameTouched(false)
    setIsSaveDialogOpen(true)
  }, [defaultJsonFilename, projectMetadata.author, projectMetadata.description, projectMetadata.title])

  const handleSaveFilenameChange = useCallback((value: string) => {
    setSaveFilenameTouched(true)
    setSaveFilenameDraft(value)
  }, [])

  const handleSaveTitleChange = useCallback((value: string) => {
    setSaveTitleDraft(value)
    if (saveFilenameTouched) return
    setSaveFilenameDraft(toProjectJsonFilename(value, defaultJsonFilename.replace(/\.json$/i, "")))
  }, [defaultJsonFilename, saveFilenameTouched])

  const confirmSaveJSON = useCallback(() => {
    const trimmedName = saveFilenameDraft.trim()
    if (!trimmedName) return
    const nextCreatedAt = projectMetadata.createdAt && !Number.isNaN(Date.parse(projectMetadata.createdAt))
      ? new Date(projectMetadata.createdAt).toISOString()
      : new Date().toISOString()
    const normalizedMetadata = {
      title: saveTitleDraft.trim(),
      description: saveDescriptionDraft.trim(),
      author: saveAuthorDraft.trim(),
      createdAt: nextCreatedAt,
    }
    saveJSON(trimmedName, {
      title: normalizedMetadata.title,
      description: normalizedMetadata.description,
      author: normalizedMetadata.author,
      createdAt: normalizedMetadata.createdAt,
    })
    onProjectMetadataChange(normalizedMetadata)
    setIsSaveDialogOpen(false)
  }, [
    onProjectMetadataChange,
    projectMetadata.createdAt,
    saveAuthorDraft,
    saveDescriptionDraft,
    saveFilenameDraft,
    saveJSON,
    saveTitleDraft,
  ])

  const exportPDF = useCallback(
    async (
      width: number,
      height: number,
      filename: string,
      printPresetConfig: PrintPresetConfig,
    ) => {
      const { default: jsPDF } = await import("jspdf")
      const { enabled, bleedMm, registrationMarks, finalSafeGuides } = printPresetConfig
      const { colorMode, outputIntentProfileId } = resolvePdfExportColorManagement({ enabled })
      const bleedPt = mmToPt(bleedMm)
      const cropOffsetPt = mmToPt(PRINT_CROP_OFFSET_MM)
      const cropLengthPt = mmToPt(PRINT_CROP_LENGTH_MM)
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
      const trimmedTitle = projectMetadata.title.trim()
      const trimmedDescription = projectMetadata.description.trim()
      const trimmedAuthor = projectMetadata.author.trim()
      const parsedCreatedAt = projectMetadata.createdAt ? Date.parse(projectMetadata.createdAt) : Number.NaN
      pdf.setDocumentProperties({
        title: trimmedTitle || filename,
        author: trimmedAuthor || "Generated by Swiss Grid Generator",
        subject: trimmedDescription || "Swiss Grid Vector Export",
        creator: "Swiss Grid Generator",
        keywords: "swiss grid, typography, modular grid, vector pdf",
      })
      pdf.setCreationDate(Number.isNaN(parsedCreatedAt) ? new Date() : new Date(parsedCreatedAt))
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

      const fontsToRegister = new Set<FontFamily>([baseFont])
      const blockFonts = previewLayout?.blockFontFamilies
      if (blockFonts) {
        for (const family of Object.values(blockFonts)) {
          if (family) fontsToRegister.add(family)
        }
      }
      await ensurePdfFontsRegistered(pdf, fontsToRegister)
      await attachPdfOutputIntent(pdf, outputIntentProfileId)

      renderSwissGridVectorPdf({
        pdf,
        width,
        height,
        result,
        layout: previewLayout,
        baseFont,
        originX,
        originY,
        colorMode,
        imageColorScheme,
        canvasBackground,
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
        showImagePlaceholders,
        showTypography,
      })
      pdf.save(filename)
    },
    [
      baseFont,
      projectMetadata.author,
      projectMetadata.createdAt,
      projectMetadata.description,
      projectMetadata.title,
      previewLayout,
      result,
      rotation,
      imageColorScheme,
      canvasBackground,
      showBaselines,
      showMargins,
      showModules,
      showImagePlaceholders,
      showTypography,
    ],
  )

  const openExportDialog = useCallback(() => {
    const dims = getOrientedDimensions(exportPaperSize)
    setExportPaperSizeDraft(exportPaperSize)
    setPrintPresetEnabledDraft(persistedPrintPresetEnabled)
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
    persistedPrintPresetEnabled,
    exportRegistrationMarks,
    getOrientedDimensions,
    isDinOrAnsiRatio,
  ])

  const applyPrintPresetConfig = useCallback((config: PrintPresetConfig) => {
    setPrintPresetEnabledDraft(config.enabled)
    setExportBleedMmDraft(String(config.bleedMm))
    setExportRegistrationMarksDraft(config.registrationMarks)
    setExportFinalSafeGuidesDraft(config.finalSafeGuides)
  }, [])

  const applyPrintPreset = useCallback((presetKey: PrintPresetKey) => {
    const preset = PRINT_PRESETS.find((entry) => entry.key === presetKey)
    if (!preset) return
    applyPrintPresetConfig(preset.config)
  }, [applyPrintPresetConfig])

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
    setPersistedPrintPresetEnabled(printPresetEnabledDraft)
    setExportBleedMm(bleedMm)
    setExportRegistrationMarks(exportRegistrationMarksDraft)
    setExportFinalSafeGuides(exportFinalSafeGuidesDraft)
    await exportPDF(width, height, filename, {
      enabled: printPresetEnabledDraft,
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
    printPresetEnabledDraft,
    exportRegistrationMarksDraft,
    exportWidthDraft,
    exportPDF,
    getOrientedDimensions,
    isDinOrAnsiRatio,
    setExportBleedMm,
    setExportFinalSafeGuides,
    setExportPaperSize,
    setPersistedPrintPresetEnabled,
    setExportRegistrationMarks,
  ])

  const parsedDraftBleed = Number(exportBleedMmDraft)
  const resolvedDraftBleedMm = Number.isFinite(parsedDraftBleed) && parsedDraftBleed >= 0 ? parsedDraftBleed : exportBleedMm
  const activePrintPresetDraft = resolveActivePrintPresetKey({
    enabled: printPresetEnabledDraft,
    bleedMm: resolvedDraftBleedMm,
    registrationMarks: exportRegistrationMarksDraft,
    finalSafeGuides: exportFinalSafeGuidesDraft,
  })

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
    setSaveFilenameDraft: handleSaveFilenameChange,
    saveTitleDraft,
    setSaveTitleDraft: handleSaveTitleChange,
    saveDescriptionDraft,
    setSaveDescriptionDraft,
    saveAuthorDraft,
    setSaveAuthorDraft,
    openSaveDialog,
    confirmSaveJSON,
    // Export dialog
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportFilenameDraft,
    setExportFilenameDraft,
    exportPaperSizeDraft,
    setExportPaperSizeDraft,
    activePrintPresetDraft,
    showPrintAdjustmentsDraft: printPresetEnabledDraft,
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
