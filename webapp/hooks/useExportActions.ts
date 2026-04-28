import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { flushSync } from "react-dom"
import jsPDF from "jspdf"
import { isFontFamily, type FontFamily } from "@/lib/config/fonts"
import { attachPdfOutputIntent, type PdfExportColorMode, type PdfOutputIntentProfileId } from "@/lib/pdf-output-intent"
import { renderSwissGridVectorPdf } from "@/lib/pdf-vector-export"
import { renderSwissGridVectorSvg } from "@/lib/svg-vector-export"
import { renderSwissGridIdmlProject } from "@/lib/idml-export"
import { ensurePdfFontsRegistered } from "@/lib/pdf-font-registry"
import { type LoadedProject } from "@/lib/document-session"
import { toProjectFilename, toProjectJsonFilename } from "@/lib/project-file-naming"
import {
  buildResolvedProjectPageExportSources,
  filterProjectByExportRange,
  normalizeProjectExportPageRange,
  type ProjectExportPageRange,
  type ResolvedProjectPageExportSource,
} from "@/lib/project-page-export-source"
import { mmToPt } from "@/lib/units"

export type ExportFormat = "pdf" | "svg" | "idml"

export type ExportProgressState = {
  format: ExportFormat
  completedSteps: number
  totalSteps: number
  currentPageNumber: number
  currentLabel: string
  phase: "rendering" | "packaging"
}

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
const EXPORT_PROGRESS_BATCH_SIZE = 8
const EXPORT_PROGRESS_MIN_INTERVAL_MS = 100

function collectPdfFontFamilies(pages: ResolvedProjectPageExportSource[]): Set<FontFamily> {
  const fontsToRegister = new Set<FontFamily>()
  pages.forEach((page) => {
    fontsToRegister.add(page.baseFont)
    Object.values(page.previewLayout?.blockFontFamilies ?? {}).forEach((family) => {
      if (isFontFamily(family)) fontsToRegister.add(family)
    })
    Object.values(page.previewLayout?.blockTextFormatRuns ?? {}).forEach((runs) => {
      if (!Array.isArray(runs)) return
      runs.forEach((run) => {
        if (isFontFamily(run.fontFamily)) fontsToRegister.add(run.fontFamily)
      })
    })
  })
  return fontsToRegister
}

class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled")
    this.name = "ExportCancelledError"
  }
}

function isExportCancelledError(error: unknown): error is ExportCancelledError {
  return error instanceof ExportCancelledError
    || (error instanceof Error && error.name === "ExportCancelledError")
}

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
  exportPrintPro: boolean
  setExportPrintPro: (b: boolean) => void
  exportBleedMm: number
  setExportBleedMm: (n: number) => void
  exportRegistrationMarks: boolean
  setExportRegistrationMarks: (b: boolean) => void
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
  getCurrentProjectSnapshot: () => LoadedProject<Record<string, unknown>>
}

export function useExportActions(ctx: ExportActionsContext) {
  const {
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
    getCurrentProjectSnapshot,
  } = ctx
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [exportFormatDraft, setExportFormatDraft] = useState<ExportFormat>("pdf")
  const [exportFilenameDraft, setExportFilenameDraft] = useState("")
  const [printPresetEnabledDraft, setPrintPresetEnabledDraft] = useState(persistedPrintPresetEnabled)
  const [exportBleedMmDraft, setExportBleedMmDraft] = useState(String(exportBleedMm))
  const [exportRegistrationMarksDraft, setExportRegistrationMarksDraft] = useState(exportRegistrationMarks)
  const [exportRangeStartDraft, setExportRangeStartDraft] = useState(1)
  const [exportRangeEndDraft, setExportRangeEndDraft] = useState(1)
  const [exportProgress, setExportProgress] = useState<ExportProgressState | null>(null)
  const exportCancelRequestedRef = useRef(false)
  const [saveFilenameDraft, setSaveFilenameDraft] = useState("")
  const [saveTitleDraft, setSaveTitleDraft] = useState("")
  const [saveDescriptionDraft, setSaveDescriptionDraft] = useState("")
  const [saveAuthorDraft, setSaveAuthorDraft] = useState("")
  const [saveFilenameTouched, setSaveFilenameTouched] = useState(false)

  const getCurrentProjectWithMetadata = useCallback(() => ({
    ...getCurrentProjectSnapshot(),
    metadata: {
      title: projectMetadata.title,
      description: projectMetadata.description,
      author: projectMetadata.author,
      createdAt: projectMetadata.createdAt,
    },
  }), [
    getCurrentProjectSnapshot,
    projectMetadata.author,
    projectMetadata.createdAt,
    projectMetadata.description,
    projectMetadata.title,
  ])

  const currentProject = useMemo(() => getCurrentProjectWithMetadata(), [getCurrentProjectWithMetadata])

  const projectPageCount = currentProject.pages.length

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
  const selectedSinglePage = selectedPageCount === 1 ? selectedProjectPages[0] ?? null : null

  const pageRangeOptions = useMemo(() => currentProject.pages.map((page, index) => ({
    value: String(index + 1),
    label: `${index + 1}. ${page.name || `Page ${index + 1}`}`,
  })), [currentProject.pages])

  const getDefaultExportFilename = useCallback((format: ExportFormat, selectedPages: number) => {
    const base = format === "svg"
      ? ctx.defaultSvgFilename
      : format === "idml"
        ? defaultIdmlFilename
        : defaultPdfFilename
    const extension = resolveExportDownloadExtension(format, selectedPages)
    const fallbackStem = base.replace(/\.(pdf|svg|idml|zip)$/i, "")
    return toProjectFilename(projectMetadata.title, fallbackStem, extension)
  }, [ctx.defaultSvgFilename, defaultIdmlFilename, defaultPdfFilename, projectMetadata.title])

  const updateFilenameForFormat = useCallback((current: string, format: ExportFormat, selectedPages: number) => (
    updateFilenameForExport(current, format, selectedPages, getDefaultExportFilename)
  ), [getDefaultExportFilename])

  const saveJSON = useCallback(
    (filename: string, metadata: { title: string; description: string; author: string; createdAt: string }) => {
      const trimmed = filename.trim()
      if (!trimmed) return
      const normalizedFilename = trimmed.toLowerCase().endsWith(".json") ? trimmed : `${trimmed}.json`
      const projectSnapshot = getCurrentProjectSnapshot()
      const payload = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        createdAt: metadata.createdAt,
        activePageId: projectSnapshot.activePageId,
        pages: projectSnapshot.pages,
        tour: projectSnapshot.tour ?? undefined,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = normalizedFilename
      a.click()
      URL.revokeObjectURL(url)
    },
    [getCurrentProjectSnapshot],
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

  const yieldToBrowser = useCallback(async () => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
  }, [])

  const waitForUiCommit = useCallback(async () => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve())
      })
    })
  }, [])

  const createProgressPublisher = useCallback(() => {
    let lastPublishedAt = 0
    let lastPublishedStep = -1

    return async (state: ExportProgressState, force = false) => {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now()
      const shouldPublish = force
        || state.phase === "packaging"
        || state.completedSteps === 0
        || state.completedSteps === state.totalSteps
        || state.completedSteps - lastPublishedStep >= EXPORT_PROGRESS_BATCH_SIZE
        || now - lastPublishedAt >= EXPORT_PROGRESS_MIN_INTERVAL_MS

      if (!shouldPublish) return

      lastPublishedAt = now
      lastPublishedStep = state.completedSteps
      setExportProgress(state)
      await yieldToBrowser()
    }
  }, [yieldToBrowser])

  const throwIfExportCancelled = useCallback(() => {
    if (!exportCancelRequestedRef.current) return
    throw new ExportCancelledError()
  }, [])

  const cancelExport = useCallback(() => {
    exportCancelRequestedRef.current = true
    setExportProgress((current) => (
      current
        ? {
            ...current,
            currentLabel: "Cancelling export",
          }
        : current
    ))
  }, [])

  const exportPDF = useCallback(async (
    pages: ResolvedProjectPageExportSource[],
    filename: string,
    printPresetConfig: PrintPresetConfig,
  ) => {
    if (pages.length === 0) return

    const { enabled, bleedMm, registrationMarks } = printPresetConfig
    const { colorMode, outputIntentProfileId } = resolvePdfExportColorManagement({ enabled })
    const bleedPt = mmToPt(bleedMm)
    const cropOffsetPt = mmToPt(PRINT_CROP_OFFSET_MM)
    const cropLengthPt = mmToPt(PRINT_CROP_LENGTH_MM)
    const cropMarginPt = bleedPt + cropOffsetPt + cropLengthPt
    const originX = enabled ? cropMarginPt : 0
    const originY = enabled ? cropMarginPt : 0
    const firstDimensions = {
      width: pages[0].result.pageSizePt.width,
      height: pages[0].result.pageSizePt.height,
    }
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

    await ensurePdfFontsRegistered(pdf, collectPdfFontFamilies(pages))
    await attachPdfOutputIntent(pdf, outputIntentProfileId)
    const publishProgress = createProgressPublisher()

    for (const [index, page] of pages.entries()) {
      throwIfExportCancelled()
      const dimensions = {
        width: page.result.pageSizePt.width,
        height: page.result.pageSizePt.height,
      }
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
        documentVariableContext: page.documentVariableContext,
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
      throwIfExportCancelled()
      await publishProgress({
        format: "pdf",
        completedSteps: index + 1,
        totalSteps: pages.length,
        currentPageNumber: index + 1,
        currentLabel: page.name || `Page ${index + 1}`,
        phase: "rendering",
      })
    }

    throwIfExportCancelled()
    pdf.save(filename)
  }, [
    createProgressPublisher,
    projectMetadata.author,
    projectMetadata.createdAt,
    projectMetadata.description,
    projectMetadata.title,
    throwIfExportCancelled,
  ])

  const exportSVG = useCallback(async (
    pages: ResolvedProjectPageExportSource[],
    filename: string,
    startPageNumber: number,
  ) => {
    if (pages.length === 0) return

    const trimmedTitle = projectMetadata.title.trim()
    const trimmedDescription = projectMetadata.description.trim()
    const publishProgress = createProgressPublisher()

    if (pages.length === 1) {
      const page = pages[0]
      await publishProgress({
        format: "svg",
        completedSteps: 0,
        totalSteps: 1,
        currentPageNumber: startPageNumber,
        currentLabel: page.name || `Page ${startPageNumber}`,
        phase: "rendering",
      }, true)
      throwIfExportCancelled()
      const svg = await renderSwissGridVectorSvg({
        width: page.result.pageSizePt.width,
        height: page.result.pageSizePt.height,
        result: page.result,
        layout: page.previewLayout,
        documentVariableContext: page.documentVariableContext,
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
      throwIfExportCancelled()
      await publishProgress({
        format: "svg",
        completedSteps: 1,
        totalSteps: 1,
        currentPageNumber: startPageNumber,
        currentLabel: page.name || `Page ${startPageNumber}`,
        phase: "rendering",
      }, true)
      downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename)
      return
    }

    const { strToU8, zipSync } = await import("fflate")
    const zipEntries: Record<string, Uint8Array> = {}
    const archiveBaseName = filename.replace(/\.(pdf|svg|idml|zip)$/i, "")
    const normalizedArchiveBaseName = normalizeFilenameSegment(archiveBaseName)

    for (const [index, page] of pages.entries()) {
      throwIfExportCancelled()
      const pageNumber = startPageNumber + index
      const pageSlug = normalizeFilenameSegment(page.name || `page-${pageNumber}`)
      const pageFilename = `${normalizedArchiveBaseName}_page_${String(pageNumber).padStart(3, "0")}_${pageSlug}.svg`
      const svg = await renderSwissGridVectorSvg({
        width: page.result.pageSizePt.width,
        height: page.result.pageSizePt.height,
        result: page.result,
        layout: page.previewLayout,
        documentVariableContext: page.documentVariableContext,
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
      throwIfExportCancelled()
      zipEntries[pageFilename] = strToU8(svg)
      await publishProgress({
        format: "svg",
        completedSteps: index + 1,
        totalSteps: pages.length,
        currentPageNumber: pageNumber,
        currentLabel: page.name || `Page ${pageNumber}`,
        phase: "rendering",
      })
    }

    throwIfExportCancelled()
    await publishProgress({
      format: "svg",
      completedSteps: pages.length,
      totalSteps: pages.length,
      currentPageNumber: startPageNumber + pages.length - 1,
      currentLabel: "Packaging SVG archive",
      phase: "packaging",
    }, true)
    throwIfExportCancelled()
    const zipBytes = zipSync(zipEntries)
    const zipBuffer = new ArrayBuffer(zipBytes.byteLength)
    new Uint8Array(zipBuffer).set(zipBytes)
    downloadBlob(new Blob([zipBuffer], { type: "application/zip" }), filename)
  }, [
    createProgressPublisher,
    downloadBlob,
    projectMetadata.description,
    projectMetadata.title,
    throwIfExportCancelled,
  ])

  const exportIDML = useCallback(async (
    project: LoadedProject<Record<string, unknown>>,
    filename: string,
  ) => {
    const publishProgress = createProgressPublisher()
    const bytes = await renderSwissGridIdmlProject(project, async (progress) => {
      throwIfExportCancelled()
      const isPackagingStep = progress.pageName === "Packaging IDML"
      await publishProgress({
        format: "idml",
        completedSteps: progress.completedSteps,
        totalSteps: progress.totalSteps,
        currentPageNumber: progress.pageNumber,
        currentLabel: progress.pageName,
        phase: isPackagingStep ? "packaging" : "rendering",
      }, isPackagingStep || progress.completedSteps === 1 || progress.completedSteps === progress.totalSteps)
    }, throwIfExportCancelled)
    throwIfExportCancelled()
    setExportProgress({
      format: "idml",
      completedSteps: project.pages.length,
      totalSteps: project.pages.length,
      currentPageNumber: project.pages.length,
      currentLabel: "Packaging IDML",
      phase: "packaging",
    })
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    downloadBlob(new Blob([buffer], {
      type: "application/vnd.adobe.indesign-idml-package",
    }), filename)
  }, [createProgressPublisher, downloadBlob, throwIfExportCancelled])

  const openExportDialog = useCallback(() => {
    const defaultRange = { fromPage: 1, toPage: projectPageCount }

    setExportRangeStartDraft(defaultRange.fromPage)
    setExportRangeEndDraft(defaultRange.toPage)
    setPrintPresetEnabledDraft(persistedPrintPresetEnabled)
    setExportBleedMmDraft(String(exportBleedMm))
    setExportRegistrationMarksDraft(exportRegistrationMarks)
    setExportFilenameDraft(getDefaultExportFilename(
      exportFormatDraft,
      defaultRange.toPage - defaultRange.fromPage + 1,
    ))
    setIsExportDialogOpen(true)
  }, [
    exportBleedMm,
    exportFormatDraft,
    exportRegistrationMarks,
    getDefaultExportFilename,
    persistedPrintPresetEnabled,
    projectPageCount,
  ])

  const handleExportFormatChange = useCallback((format: ExportFormat) => {
    setExportFormatDraft(format)
    setExportFilenameDraft((current) => updateFilenameForFormat(current, format, selectedPageCount))
  }, [selectedPageCount, updateFilenameForFormat])

  const applyExportRange = useCallback((nextRange: ProjectExportPageRange) => {
    const normalized = normalizeProjectExportPageRange(projectPageCount, nextRange.fromPage, nextRange.toPage)
    setExportRangeStartDraft(normalized.fromPage)
    setExportRangeEndDraft(normalized.toPage)
    setExportFilenameDraft((current) => updateFilenameForFormat(
      current,
      exportFormatDraft,
      normalized.toPage - normalized.fromPage + 1,
    ))
  }, [exportFormatDraft, projectPageCount, updateFilenameForFormat])

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
    exportCancelRequestedRef.current = false

    flushSync(() => {
      setExportProgress({
        format: exportFormatDraft,
        completedSteps: 0,
        totalSteps: selectedPageCount,
        currentPageNumber: normalizedRange.fromPage,
        currentLabel: "Preparing export",
        phase: "rendering",
      })
    })
    await waitForUiCommit()

    const filename = updateFilenameForExport(
      trimmedName,
      exportFormatDraft,
      selectedPageCount,
      getDefaultExportFilename,
    )
    const currentProjectSnapshot = getCurrentProjectWithMetadata()
    const selectedRange = {
      fromPage: normalizedRange.fromPage,
      toPage: normalizedRange.toPage,
    } satisfies ProjectExportPageRange
    const parsedBleed = Number(exportBleedMmDraft)
    const bleedMm = Number.isFinite(parsedBleed) && parsedBleed >= 0 ? parsedBleed : exportBleedMm
    const shouldPersistActivePageExportSettings = (
      selectedPageCount === 1
      && selectedSinglePage?.id === currentProjectSnapshot.activePageId
    )

    try {
      if (exportFormatDraft === "idml") {
        const selectedProject = filterProjectByExportRange(currentProjectSnapshot, selectedRange)
        setExportProgress((current) => current ? {
          ...current,
          totalSteps: selectedProject.pages.length,
          currentPageNumber: normalizedRange.fromPage,
          currentLabel: selectedProject.pages[0]?.name || "Preparing IDML",
        } : current)
        await exportIDML(selectedProject, filename)
        setIsExportDialogOpen(false)
        return
      }

      if (exportFormatDraft === "pdf") {
        const resolvedPages = buildResolvedProjectPageExportSources(currentProjectSnapshot, selectedRange)
        if (shouldPersistActivePageExportSettings) {
          setPersistedPrintPresetEnabled(printPresetEnabledDraft)
          setExportBleedMm(bleedMm)
          setExportRegistrationMarks(exportRegistrationMarksDraft)
        }
        await exportPDF(resolvedPages, filename, {
          enabled: printPresetEnabledDraft,
          bleedMm,
          registrationMarks: exportRegistrationMarksDraft,
        })
      } else {
        const resolvedPages = buildResolvedProjectPageExportSources(currentProjectSnapshot, selectedRange)
        await exportSVG(resolvedPages, filename, normalizedRange.fromPage)
      }

      setIsExportDialogOpen(false)
    } catch (error) {
      if (!isExportCancelledError(error)) {
        throw error
      }
    } finally {
      exportCancelRequestedRef.current = false
      setExportProgress(null)
    }
  }, [
    exportBleedMm,
    exportBleedMmDraft,
    exportFormatDraft,
    exportFilenameDraft,
    exportRegistrationMarksDraft,
    exportIDML,
    exportPDF,
    exportSVG,
    getCurrentProjectWithMetadata,
    getDefaultExportFilename,
    normalizedRange.fromPage,
    normalizedRange.toPage,
    printPresetEnabledDraft,
    selectedPageCount,
    selectedSinglePage?.id,
    setExportBleedMm,
    setPersistedPrintPresetEnabled,
    setExportRegistrationMarks,
    waitForUiCommit,
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
        if (exportProgress !== null) {
          cancelExport()
          return
        }
        setIsExportDialogOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [cancelExport, exportProgress, isExportDialogOpen])

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
    exportRangeStartDraft,
    setExportRangeStartDraft: handleExportRangeStartChange,
    exportRangeEndDraft,
    setExportRangeEndDraft: handleExportRangeEndChange,
    pageRangeOptions,
    selectedPageCount,
    activePrintPresetDraft,
    showPrintAdjustmentsDraft: printPresetEnabledDraft,
    exportBleedMmDraft,
    setExportBleedMmDraft,
    exportRegistrationMarksDraft,
    setExportRegistrationMarksDraft,
    exportProgress,
    openExportDialog,
    applyPrintPreset,
    confirmExport,
    defaultExportFilename: getDefaultExportFilename(exportFormatDraft, selectedPageCount),
  }
}
