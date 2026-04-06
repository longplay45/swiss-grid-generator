import { useState, useEffect, useCallback, useMemo } from "react"
import { CANVAS_RATIOS, FORMATS_PT } from "@/lib/grid-calculator"
import type { GridResult } from "@/lib/grid-calculator"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import type { FontFamily } from "@/lib/config/fonts"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import { attachPdfOutputIntent, type PdfExportColorMode, type PdfOutputIntentProfileId } from "@/lib/pdf-output-intent"
import { renderSwissGridVectorPdf } from "@/lib/pdf-vector-export"
import { renderSwissGridVectorSvg } from "@/lib/svg-vector-export"
import { renderSwissGridIdmlProject } from "@/lib/idml-export"
import { ensurePdfFontsRegistered } from "@/lib/pdf-font-registry"
import { parseLoadedProject, type LoadedProject } from "@/lib/document-session"
import { toProjectJsonFilename } from "@/lib/project-file-naming"
import {
  buildResolvedProjectPageExportSources,
  filterProjectByExportRange,
  normalizeProjectExportPageRange,
  resolveProjectPageUiSettings,
  type ProjectExportPageRange,
  type ResolvedProjectPageExportSource,
} from "@/lib/project-page-export-source"
import { PREVIEW_DEFAULT_FORMAT_BY_RATIO } from "@/lib/config/ui-defaults"
import { mmToPt, formatValue } from "@/lib/units"
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>

export type ExportFormat = "pdf" | "svg" | "idml"

type PrintPresetConfig = {
  enabled: boolean
  bleedMm: number
  registrationMarks: boolean
}

export type PrintPresetKey = "digital_print" | "press_proof" | "offset_final"

const DIGITAL_PRINT_CONFIG: PrintPresetConfig = {
  enabled: false,
  bleedMm: 0,
  registrationMarks: false,
}

const PRESS_PROOF_CONFIG: PrintPresetConfig = {
  enabled: true,
  bleedMm: 3,
  registrationMarks: true,
}

const OFFSET_FINAL_CONFIG: PrintPresetConfig = {
  enabled: true,
  bleedMm: 3,
  registrationMarks: true,
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
const CANVAS_RATIO_INDEX = new Map(CANVAS_RATIOS.map((option) => [option.key, option] as const))

function isSamePrintPresetConfig(left: PrintPresetConfig, right: PrintPresetConfig): boolean {
  return left.enabled === right.enabled
    && left.bleedMm === right.bleedMm
    && left.registrationMarks === right.registrationMarks
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

function buildProjectPageSourcePath(pageName: string, pageId: string, pageNumber: number): string {
  return `${pageName || `Page ${pageNumber}`} (${pageId})`
}

function normalizeFilenameSegment(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return "page"
  return trimmed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "page"
}

function resolveExportDownloadExtension(format: ExportFormat, selectedPageCount: number): string {
  if (format === "svg" && selectedPageCount > 1) return ".zip"
  if (format === "svg") return ".svg"
  if (format === "idml") return ".idml"
  return ".pdf"
}

function updateFilenameForExport(
  current: string,
  format: ExportFormat,
  selectedPageCount: number,
  getDefaultExportFilename: (format: ExportFormat, selectedPageCount: number) => string,
): string {
  const trimmed = current.trim()
  const extension = resolveExportDownloadExtension(format, selectedPageCount)
  if (!trimmed) return getDefaultExportFilename(format, selectedPageCount)
  if (/\.(pdf|svg|idml|zip)$/i.test(trimmed)) {
    return trimmed.replace(/\.(pdf|svg|idml|zip)$/i, extension)
  }
  return `${trimmed}${extension}`
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
  paperSizeOptions: Array<{ value: string; label: string }>
  previewFormat: string
  defaultPdfFilename: string
  defaultSvgFilename: string
  defaultIdmlFilename: string
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
    displayUnit,
    exportPaperSize,
    setExportPaperSize,
    exportPrintPro: persistedPrintPresetEnabled,
    setExportPrintPro: setPersistedPrintPresetEnabled,
    exportBleedMm,
    setExportBleedMm,
    exportRegistrationMarks,
    setExportRegistrationMarks,
    defaultPdfFilename,
    defaultIdmlFilename,
    defaultJsonFilename,
    projectMetadata,
    onProjectMetadataChange,
    buildProjectPayload,
  } = ctx
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [exportFormatDraft, setExportFormatDraft] = useState<ExportFormat>("pdf")
  const [exportFilenameDraft, setExportFilenameDraft] = useState("")
  const [exportPaperSizeDraft, setExportPaperSizeDraft] = useState(exportPaperSize)
  const [printPresetEnabledDraft, setPrintPresetEnabledDraft] = useState(persistedPrintPresetEnabled)
  const [exportBleedMmDraft, setExportBleedMmDraft] = useState(String(exportBleedMm))
  const [exportRegistrationMarksDraft, setExportRegistrationMarksDraft] = useState(exportRegistrationMarks)
  const [exportWidthDraft, setExportWidthDraft] = useState("")
  const [exportRangeStartDraft, setExportRangeStartDraft] = useState(1)
  const [exportRangeEndDraft, setExportRangeEndDraft] = useState(1)
  const [saveFilenameDraft, setSaveFilenameDraft] = useState("")
  const [saveTitleDraft, setSaveTitleDraft] = useState("")
  const [saveDescriptionDraft, setSaveDescriptionDraft] = useState("")
  const [saveAuthorDraft, setSaveAuthorDraft] = useState("")
  const [saveFilenameTouched, setSaveFilenameTouched] = useState(false)

  const currentProject = useMemo(() => parseLoadedProject<Record<string, unknown>>({
    title: projectMetadata.title,
    description: projectMetadata.description,
    author: projectMetadata.author,
    createdAt: projectMetadata.createdAt,
    ...buildProjectPayload(),
  }), [
    buildProjectPayload,
    projectMetadata.author,
    projectMetadata.createdAt,
    projectMetadata.description,
    projectMetadata.title,
  ])

  const projectPageCount = currentProject.pages.length
  const activeProjectPageNumber = useMemo(() => {
    const index = currentProject.pages.findIndex((page) => page.id === currentProject.activePageId)
    return index >= 0 ? index + 1 : 1
  }, [currentProject.activePageId, currentProject.pages])

  const normalizedRange = useMemo(() => normalizeProjectExportPageRange(
    projectPageCount,
    exportRangeStartDraft,
    exportRangeEndDraft,
  ), [exportRangeEndDraft, exportRangeStartDraft, projectPageCount])

  const selectedProjectPages = useMemo(
    () => currentProject.pages.slice(normalizedRange.startIndex, normalizedRange.endIndex + 1),
    [currentProject.pages, normalizedRange.endIndex, normalizedRange.startIndex],
  )
  const selectedPageCount = selectedProjectPages.length
  const isMultiPageRange = selectedPageCount > 1
  const selectedSinglePage = selectedPageCount === 1 ? selectedProjectPages[0] ?? null : null

  const pageRangeOptions = useMemo(() => currentProject.pages.map((page, index) => ({
    value: String(index + 1),
    label: `${index + 1}. ${page.name || `Page ${index + 1}`}`,
  })), [currentProject.pages])

  const singlePageContext = useMemo(() => {
    if (!selectedSinglePage) return null

    const sourcePath = buildProjectPageSourcePath(
      selectedSinglePage.name,
      selectedSinglePage.id,
      normalizedRange.fromPage,
    )
    const uiSettings = resolveProjectPageUiSettings(selectedSinglePage.uiSettings, sourcePath)
    const ratioOption = CANVAS_RATIO_INDEX.get(uiSettings.canvasRatio) ?? null
    const fallbackFormat = PREVIEW_DEFAULT_FORMAT_BY_RATIO[uiSettings.canvasRatio]
    const defaultPaperSize = (
      typeof uiSettings.exportPaperSize === "string"
      && ratioOption?.paperSizes.includes(uiSettings.exportPaperSize)
    )
      ? uiSettings.exportPaperSize
      : (ratioOption?.paperSizes.includes(fallbackFormat) ? fallbackFormat : ratioOption?.paperSizes[0] ?? fallbackFormat)
    const baseDimensions = FORMATS_PT[defaultPaperSize] ?? FORMATS_PT[fallbackFormat]
    const orientedDimensions = uiSettings.orientation === "landscape"
      ? { width: baseDimensions.height, height: baseDimensions.width }
      : { width: baseDimensions.width, height: baseDimensions.height }

    return {
      pageNumber: normalizedRange.fromPage,
      page: selectedSinglePage,
      uiSettings,
      ratioLabel: ratioOption?.label ?? selectedSinglePage.name ?? `Page ${normalizedRange.fromPage}`,
      orientation: uiSettings.orientation,
      rotation: uiSettings.rotation,
      isDinOrAnsiRatio: uiSettings.canvasRatio === "din_ab" || uiSettings.canvasRatio === "letter_ansi_ab",
      paperSizeOptions: (ratioOption?.paperSizes ?? [fallbackFormat])
        .filter((name) => Boolean(FORMATS_PT[name]))
        .map((name) => {
          const dims = FORMATS_PT[name]
          return {
            value: name,
            label: `${name} (${formatValue(dims.width, displayUnit)}×${formatValue(dims.height, displayUnit)} ${displayUnit})`,
          }
        }),
      defaultPaperSize,
      storedWidthPt: orientedDimensions.width,
      storedHeightPt: orientedDimensions.height,
    }
  }, [displayUnit, normalizedRange.fromPage, selectedSinglePage])

  const getOrientedDimensions = useCallback((paperSize: string) => {
    if (!singlePageContext) {
      return { width: 0, height: 0 }
    }
    const fallbackPaperSize = singlePageContext.defaultPaperSize
    const base = FORMATS_PT[paperSize] ?? FORMATS_PT[fallbackPaperSize]
    if (singlePageContext.orientation === "landscape") {
      return { width: base.height, height: base.width }
    }
    return { width: base.width, height: base.height }
  }, [singlePageContext])

  const getDefaultExportFilename = useCallback((format: ExportFormat, selectedPages: number) => {
    const base = format === "svg"
      ? ctx.defaultSvgFilename
      : format === "idml"
        ? defaultIdmlFilename
        : defaultPdfFilename
    const extension = resolveExportDownloadExtension(format, selectedPages)
    return base.replace(/\.(pdf|svg|idml|zip)$/i, extension)
  }, [ctx.defaultSvgFilename, defaultIdmlFilename, defaultPdfFilename])

  const syncExportSizeDrafts = useCallback((range: ProjectExportPageRange) => {
    const normalized = normalizeProjectExportPageRange(projectPageCount, range.fromPage, range.toPage)
    if (normalized.endIndex !== normalized.startIndex) return
    const page = currentProject.pages[normalized.startIndex]
    if (!page) return

    const sourcePath = buildProjectPageSourcePath(page.name, page.id, normalized.fromPage)
    const uiSettings = resolveProjectPageUiSettings(page.uiSettings, sourcePath)
    const ratioOption = CANVAS_RATIO_INDEX.get(uiSettings.canvasRatio) ?? null
    const fallbackFormat = PREVIEW_DEFAULT_FORMAT_BY_RATIO[uiSettings.canvasRatio]
    const defaultPaperSize = (
      typeof uiSettings.exportPaperSize === "string"
      && ratioOption?.paperSizes.includes(uiSettings.exportPaperSize)
    )
      ? uiSettings.exportPaperSize
      : (ratioOption?.paperSizes.includes(fallbackFormat) ? fallbackFormat : ratioOption?.paperSizes[0] ?? fallbackFormat)
    const dims = FORMATS_PT[defaultPaperSize] ?? FORMATS_PT[fallbackFormat]
    const orientedDimensions = uiSettings.orientation === "landscape"
      ? { width: dims.height, height: dims.width }
      : { width: dims.width, height: dims.height }

    setExportPaperSizeDraft(defaultPaperSize)
    setExportWidthDraft(formatValue(orientedDimensions.width, uiSettings.canvasRatio === "din_ab" || uiSettings.canvasRatio === "letter_ansi_ab" ? displayUnit : "mm"))
  }, [currentProject.pages, displayUnit, projectPageCount])

  const updateFilenameForFormat = useCallback((current: string, format: ExportFormat, selectedPages: number) => (
    updateFilenameForExport(current, format, selectedPages, getDefaultExportFilename)
  ), [getDefaultExportFilename])

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

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportPDF = useCallback(async (
    pages: ResolvedProjectPageExportSource[],
    filename: string,
    printPresetConfig: PrintPresetConfig,
    singlePageOverride: { width: number; height: number } | null,
  ) => {
    if (pages.length === 0) return

    const { default: jsPDF } = await import("jspdf")
    const { enabled, bleedMm, registrationMarks } = printPresetConfig
    const { colorMode, outputIntentProfileId } = resolvePdfExportColorManagement({ enabled })
    const bleedPt = mmToPt(bleedMm)
    const cropOffsetPt = mmToPt(PRINT_CROP_OFFSET_MM)
    const cropLengthPt = mmToPt(PRINT_CROP_LENGTH_MM)
    const cropMarginPt = bleedPt + cropOffsetPt + cropLengthPt
    const originX = enabled ? cropMarginPt : 0
    const originY = enabled ? cropMarginPt : 0
    const resolveOutputDimensions = (page: ResolvedProjectPageExportSource, pageIndex: number) => {
      if (singlePageOverride && pageIndex === 0 && pages.length === 1) return singlePageOverride
      return {
        width: page.result.pageSizePt.width,
        height: page.result.pageSizePt.height,
      }
    }
    const firstDimensions = resolveOutputDimensions(pages[0], 0)
    const firstPageWidth = enabled ? firstDimensions.width + cropMarginPt * 2 : firstDimensions.width
    const firstPageHeight = enabled ? firstDimensions.height + cropMarginPt * 2 : firstDimensions.height

    const pdf = new jsPDF({
      orientation: firstPageWidth > firstPageHeight ? "landscape" : "portrait",
      unit: "pt",
      format: [firstPageWidth, firstPageHeight],
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

    const fontsToRegister = new Set<FontFamily>()
    pages.forEach((page) => {
      fontsToRegister.add(page.baseFont)
      const blockFonts = page.previewLayout?.blockFontFamilies
      if (!blockFonts) return
      Object.values(blockFonts).forEach((family) => {
        if (family) fontsToRegister.add(family)
      })
    })
    await ensurePdfFontsRegistered(pdf, fontsToRegister)
    await attachPdfOutputIntent(pdf, outputIntentProfileId)

    pages.forEach((page, index) => {
      const dimensions = resolveOutputDimensions(page, index)
      const pageWidth = enabled ? dimensions.width + cropMarginPt * 2 : dimensions.width
      const pageHeight = enabled ? dimensions.height + cropMarginPt * 2 : dimensions.height

      if (index > 0) {
        pdf.addPage([pageWidth, pageHeight], pageWidth > pageHeight ? "landscape" : "portrait")
      }

      renderSwissGridVectorPdf({
        pdf,
        width: dimensions.width,
        height: dimensions.height,
        result: page.result,
        layout: page.previewLayout,
        baseFont: page.baseFont,
        originX,
        originY,
        colorMode,
        imageColorScheme: page.imageColorScheme,
        canvasBackground: page.resolvedCanvasBackground,
        printPro: {
          enabled,
          bleedPt,
          cropMarkOffsetPt: cropOffsetPt,
          cropMarkLengthPt: cropLengthPt,
          showBleedGuide: enabled,
          registrationMarks,
        },
        rotation: page.uiSettings.rotation,
        showBaselines: page.uiSettings.showBaselines,
        showModules: page.uiSettings.showModules,
        showMargins: page.uiSettings.showMargins,
        showImagePlaceholders: page.uiSettings.showImagePlaceholders,
        showTypography: page.uiSettings.showTypography,
      })
    })

    pdf.save(filename)
  }, [
    projectMetadata.author,
    projectMetadata.createdAt,
    projectMetadata.description,
    projectMetadata.title,
  ])

  const exportSVG = useCallback(async (
    pages: ResolvedProjectPageExportSource[],
    filename: string,
    singlePageOverride: { width: number; height: number } | null,
    startPageNumber: number,
  ) => {
    if (pages.length === 0) return

    const trimmedTitle = projectMetadata.title.trim()
    const trimmedDescription = projectMetadata.description.trim()

    if (pages.length === 1) {
      const page = pages[0]
      const width = singlePageOverride?.width ?? page.result.pageSizePt.width
      const height = singlePageOverride?.height ?? page.result.pageSizePt.height
      const svg = renderSwissGridVectorSvg({
        width,
        height,
        result: page.result,
        layout: page.previewLayout,
        baseFont: page.baseFont,
        imageColorScheme: page.imageColorScheme,
        canvasBackground: page.resolvedCanvasBackground,
        rotation: page.uiSettings.rotation,
        showBaselines: page.uiSettings.showBaselines,
        showModules: page.uiSettings.showModules,
        showMargins: page.uiSettings.showMargins,
        showImagePlaceholders: page.uiSettings.showImagePlaceholders,
        showTypography: page.uiSettings.showTypography,
        title: trimmedTitle || filename,
        description: trimmedDescription || "Swiss Grid Vector Export",
      })
      downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename)
      return
    }

    const { strToU8, zipSync } = await import("fflate")
    const zipEntries: Record<string, Uint8Array> = {}
    const archiveBaseName = filename.replace(/\.(pdf|svg|idml|zip)$/i, "")
    const normalizedArchiveBaseName = normalizeFilenameSegment(archiveBaseName)

    pages.forEach((page, index) => {
      const pageNumber = startPageNumber + index
      const pageSlug = normalizeFilenameSegment(page.name || `page-${pageNumber}`)
      const pageFilename = `${normalizedArchiveBaseName}_page_${String(pageNumber).padStart(3, "0")}_${pageSlug}.svg`
      const svg = renderSwissGridVectorSvg({
        width: page.result.pageSizePt.width,
        height: page.result.pageSizePt.height,
        result: page.result,
        layout: page.previewLayout,
        baseFont: page.baseFont,
        imageColorScheme: page.imageColorScheme,
        canvasBackground: page.resolvedCanvasBackground,
        rotation: page.uiSettings.rotation,
        showBaselines: page.uiSettings.showBaselines,
        showModules: page.uiSettings.showModules,
        showMargins: page.uiSettings.showMargins,
        showImagePlaceholders: page.uiSettings.showImagePlaceholders,
        showTypography: page.uiSettings.showTypography,
        title: trimmedTitle ? `${trimmedTitle} - Page ${pageNumber}` : `${archiveBaseName} - Page ${pageNumber}`,
        description: trimmedDescription || `Swiss Grid Vector Export - Page ${pageNumber}`,
      })
      zipEntries[pageFilename] = strToU8(svg)
    })

    const zipBytes = zipSync(zipEntries)
    const zipBuffer = new ArrayBuffer(zipBytes.byteLength)
    new Uint8Array(zipBuffer).set(zipBytes)
    downloadBlob(new Blob([zipBuffer], { type: "application/zip" }), filename)
  }, [
    downloadBlob,
    projectMetadata.description,
    projectMetadata.title,
  ])

  const exportIDML = useCallback(async (
    project: LoadedProject<Record<string, unknown>>,
    filename: string,
  ) => {
    const bytes = await renderSwissGridIdmlProject(project)
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    downloadBlob(new Blob([buffer], {
      type: "application/vnd.adobe.indesign-idml-package",
    }), filename)
  }, [downloadBlob])

  const openExportDialog = useCallback(() => {
    const defaultRange = exportFormatDraft === "idml" && projectPageCount > 1
      ? { fromPage: 1, toPage: projectPageCount }
      : { fromPage: activeProjectPageNumber, toPage: activeProjectPageNumber }

    setExportRangeStartDraft(defaultRange.fromPage)
    setExportRangeEndDraft(defaultRange.toPage)
    syncExportSizeDrafts(defaultRange)
    setPrintPresetEnabledDraft(persistedPrintPresetEnabled)
    setExportBleedMmDraft(String(exportBleedMm))
    setExportRegistrationMarksDraft(exportRegistrationMarks)
    setExportFilenameDraft(getDefaultExportFilename(
      exportFormatDraft,
      defaultRange.toPage - defaultRange.fromPage + 1,
    ))
    setIsExportDialogOpen(true)
  }, [
    activeProjectPageNumber,
    exportBleedMm,
    exportFormatDraft,
    exportRegistrationMarks,
    getDefaultExportFilename,
    persistedPrintPresetEnabled,
    projectPageCount,
    syncExportSizeDrafts,
  ])

  const handleExportFormatChange = useCallback((format: ExportFormat) => {
    setExportFormatDraft(format)
    setExportFilenameDraft((current) => updateFilenameForFormat(current, format, selectedPageCount))
  }, [selectedPageCount, updateFilenameForFormat])

  const applyExportRange = useCallback((nextRange: ProjectExportPageRange) => {
    const normalized = normalizeProjectExportPageRange(projectPageCount, nextRange.fromPage, nextRange.toPage)
    setExportRangeStartDraft(normalized.fromPage)
    setExportRangeEndDraft(normalized.toPage)
    syncExportSizeDrafts({
      fromPage: normalized.fromPage,
      toPage: normalized.toPage,
    })
    setExportFilenameDraft((current) => updateFilenameForFormat(
      current,
      exportFormatDraft,
      normalized.toPage - normalized.fromPage + 1,
    ))
  }, [exportFormatDraft, projectPageCount, syncExportSizeDrafts, updateFilenameForFormat])

  const handleExportRangeStartChange = useCallback((value: string) => {
    const nextStart = Number(value)
    applyExportRange({
      fromPage: nextStart,
      toPage: Math.max(nextStart, exportRangeEndDraft),
    })
  }, [applyExportRange, exportRangeEndDraft])

  const handleExportRangeEndChange = useCallback((value: string) => {
    const nextEnd = Number(value)
    applyExportRange({
      fromPage: Math.min(exportRangeStartDraft, nextEnd),
      toPage: nextEnd,
    })
  }, [applyExportRange, exportRangeStartDraft])

  const applyPrintPresetConfig = useCallback((config: PrintPresetConfig) => {
    setPrintPresetEnabledDraft(config.enabled)
    setExportBleedMmDraft(String(config.bleedMm))
    setExportRegistrationMarksDraft(config.registrationMarks)
  }, [])

  const applyPrintPreset = useCallback((presetKey: PrintPresetKey) => {
    const preset = PRINT_PRESETS.find((entry) => entry.key === presetKey)
    if (!preset) return
    applyPrintPresetConfig(preset.config)
  }, [applyPrintPresetConfig])

  const confirmExport = useCallback(async () => {
    const trimmedName = exportFilenameDraft.trim()
    if (!trimmedName) return
    if (selectedPageCount === 0) return

    const filename = updateFilenameForExport(
      trimmedName,
      exportFormatDraft,
      selectedPageCount,
      getDefaultExportFilename,
    )
    const selectedRange = {
      fromPage: normalizedRange.fromPage,
      toPage: normalizedRange.toPage,
    } satisfies ProjectExportPageRange
    const selectedProject = filterProjectByExportRange(currentProject, selectedRange)
    const resolvedPages = buildResolvedProjectPageExportSources(currentProject, selectedRange)
    const parsedBleed = Number(exportBleedMmDraft)
    const bleedMm = Number.isFinite(parsedBleed) && parsedBleed >= 0 ? parsedBleed : exportBleedMm
    const shouldPersistActivePageExportSettings = (
      selectedPageCount === 1
      && selectedSinglePage?.id === currentProject.activePageId
    )
    const singlePageOverride = selectedPageCount === 1 && singlePageContext
      ? (() => {
          const baseDims = getOrientedDimensions(exportPaperSizeDraft)
          const safeBaseWidth = Math.max(baseDims.width, 0.0001)
          const aspectRatio = baseDims.height / safeBaseWidth
          const parsedWidth = Number(exportWidthDraft)
          const width = singlePageContext.isDinOrAnsiRatio
            ? baseDims.width
            : Number.isFinite(parsedWidth) && parsedWidth > 0
              ? mmToPt(parsedWidth)
              : baseDims.width
          return {
            width,
            height: width * aspectRatio,
          }
        })()
      : null

    if (exportFormatDraft === "idml") {
      await exportIDML(selectedProject, filename)
      setIsExportDialogOpen(false)
      return
    }

    if (shouldPersistActivePageExportSettings) {
      setExportPaperSize(exportPaperSizeDraft)
    }

    if (exportFormatDraft === "pdf") {
      if (shouldPersistActivePageExportSettings) {
        setPersistedPrintPresetEnabled(printPresetEnabledDraft)
        setExportBleedMm(bleedMm)
        setExportRegistrationMarks(exportRegistrationMarksDraft)
      }
      await exportPDF(resolvedPages, filename, {
        enabled: printPresetEnabledDraft,
        bleedMm,
        registrationMarks: exportRegistrationMarksDraft,
      }, singlePageOverride)
    } else {
      await exportSVG(resolvedPages, filename, singlePageOverride, normalizedRange.fromPage)
    }

    setIsExportDialogOpen(false)
  }, [
    currentProject,
    exportBleedMm,
    exportBleedMmDraft,
    exportFormatDraft,
    exportFilenameDraft,
    exportPaperSizeDraft,
    exportRegistrationMarksDraft,
    exportWidthDraft,
    exportIDML,
    exportPDF,
    exportSVG,
    getDefaultExportFilename,
    getOrientedDimensions,
    normalizedRange.fromPage,
    normalizedRange.toPage,
    printPresetEnabledDraft,
    selectedPageCount,
    selectedSinglePage?.id,
    setExportBleedMm,
    setExportPaperSize,
    setPersistedPrintPresetEnabled,
    setExportRegistrationMarks,
    singlePageContext,
  ])

  const parsedDraftBleed = Number(exportBleedMmDraft)
  const resolvedDraftBleedMm = Number.isFinite(parsedDraftBleed) && parsedDraftBleed >= 0 ? parsedDraftBleed : exportBleedMm
  const activePrintPresetDraft = resolveActivePrintPresetKey({
    enabled: printPresetEnabledDraft,
    bleedMm: resolvedDraftBleedMm,
    registrationMarks: exportRegistrationMarksDraft,
  })

  useEffect(() => {
    if (!isExportDialogOpen) return
    const next = normalizeProjectExportPageRange(projectPageCount, exportRangeStartDraft, exportRangeEndDraft)
    if (next.fromPage === exportRangeStartDraft && next.toPage === exportRangeEndDraft) return
    setExportRangeStartDraft(next.fromPage)
    setExportRangeEndDraft(next.toPage)
  }, [exportRangeEndDraft, exportRangeStartDraft, isExportDialogOpen, projectPageCount])

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
    exportFormatDraft,
    setExportFormatDraft: handleExportFormatChange,
    exportFilenameDraft,
    setExportFilenameDraft,
    exportPaperSizeDraft,
    setExportPaperSizeDraft,
    exportRangeStartDraft,
    setExportRangeStartDraft: handleExportRangeStartChange,
    exportRangeEndDraft,
    setExportRangeEndDraft: handleExportRangeEndChange,
    pageRangeOptions,
    selectedPageCount,
    ratioLabel: singlePageContext?.ratioLabel ?? `${normalizedRange.fromPage}-${normalizedRange.toPage}`,
    orientation: singlePageContext?.orientation ?? "per-page",
    rotation: singlePageContext?.rotation ?? 0,
    isDinOrAnsiRatio: !isMultiPageRange && Boolean(singlePageContext?.isDinOrAnsiRatio),
    paperSizeOptions: singlePageContext?.paperSizeOptions ?? [],
    usesStoredPageSizes: isMultiPageRange,
    activePrintPresetDraft,
    showPrintAdjustmentsDraft: printPresetEnabledDraft,
    exportBleedMmDraft,
    setExportBleedMmDraft,
    exportRegistrationMarksDraft,
    setExportRegistrationMarksDraft,
    exportWidthDraft,
    setExportWidthDraft,
    openExportDialog,
    applyPrintPreset,
    confirmExport,
    defaultExportFilename: getDefaultExportFilename(exportFormatDraft, selectedPageCount),
    getOrientedDimensions,
  }
}
