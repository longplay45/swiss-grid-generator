"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import {
  GridResult,
  generateSwissGrid,
  FORMATS_PT,
  FORMAT_BASELINES,
  getMaxBaseline,
  TYPOGRAPHY_SCALE_LABELS,
  CANVAS_RATIOS,
} from "@/lib/grid-calculator"
import type { CanvasRatioKey } from "@/lib/grid-calculator"
import { GridPreview } from "@/components/grid-preview"
import type { PreviewLayoutState } from "@/components/grid-preview"
import { renderSwissGridVectorPdf } from "@/lib/pdf-vector-export"
import defaultPreset from "@/public/default_v001.json"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { CircleHelp, Download, FolderOpen, LayoutGrid, Redo2, Rows3, Save, SquareDashed, Type, Undo2 } from "lucide-react"
import jsPDF from "jspdf"

// Conversion factors
const PT_TO_MM = 0.352778  // 1 point = 0.352778 mm
const PT_TO_PX = 96 / 72   // 1 point = 1.333... px (CSS pixels at 96ppi reference)
const PRINT_PRO_BLEED_MM = 3
const PRINT_PRO_CROP_OFFSET_MM = 2
const PRINT_PRO_CROP_LENGTH_MM = 5
type PrintPresetKey = "press_proof" | "offset_final" | "digital_print"

const PRINT_PRESETS: Array<{
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
const DEFAULT_UI = defaultPreset.uiSettings
const DEFAULT_PREVIEW_LAYOUT: PreviewLayoutState | null = defaultPreset.previewLayout as PreviewLayoutState
const DEFAULT_CANVAS_RATIO: CanvasRatioKey = (
  DEFAULT_UI.canvasRatio === "din_ab"
  || DEFAULT_UI.canvasRatio === "letter_ansi_ab"
  || DEFAULT_UI.canvasRatio === "balanced_3_4"
  || DEFAULT_UI.canvasRatio === "photo_2_3"
  || DEFAULT_UI.canvasRatio === "screen_16_9"
  || DEFAULT_UI.canvasRatio === "square_1_1"
  || DEFAULT_UI.canvasRatio === "editorial_4_5"
  || DEFAULT_UI.canvasRatio === "wide_2_1"
) ? DEFAULT_UI.canvasRatio : "din_ab"
const DEFAULT_ORIENTATION: "portrait" | "landscape" = DEFAULT_UI.orientation === "landscape" ? "landscape" : "portrait"
const DEFAULT_MARGIN_METHOD: 1 | 2 | 3 = DEFAULT_UI.marginMethod === 2 || DEFAULT_UI.marginMethod === 3 ? DEFAULT_UI.marginMethod : 1
const DEFAULT_TYPOGRAPHY_SCALE: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci" = (
  DEFAULT_UI.typographyScale === "golden"
  || DEFAULT_UI.typographyScale === "fourth"
  || DEFAULT_UI.typographyScale === "fifth"
  || DEFAULT_UI.typographyScale === "fibonacci"
) ? DEFAULT_UI.typographyScale : "swiss"
const DEFAULT_DISPLAY_UNIT: "pt" | "mm" | "px" = (
  DEFAULT_UI.displayUnit === "mm" || DEFAULT_UI.displayUnit === "px"
) ? DEFAULT_UI.displayUnit : "pt"

function ptToMm(pt: number): number {
  return pt * PT_TO_MM
}

function ptToPx(pt: number): number {
  return pt * PT_TO_PX
}

function mmToPt(mm: number): number {
  return mm / PT_TO_MM
}

function pxToPt(px: number): number {
  return px / PT_TO_PX
}

function fromPt(valuePt: number, unit: "pt" | "mm" | "px"): number {
  if (unit === "mm") return ptToMm(valuePt)
  if (unit === "px") return ptToPx(valuePt)
  return valuePt
}

function toPt(value: number, unit: "pt" | "mm" | "px"): number {
  if (unit === "mm") return mmToPt(value)
  if (unit === "px") return pxToPt(value)
  return value
}

function formatValue(value: number, unit: "pt" | "mm" | "px"): string {
  return fromPt(value, unit).toFixed(3)
}

const BASELINE_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72]
const DEFAULT_A4_BASELINE = FORMAT_BASELINES["A4"] ?? 12
const SECTION_KEYS = ["format", "baseline", "margins", "gutter", "typo"] as const
type SectionKey = typeof SECTION_KEYS[number]
type UiSettingsSnapshot = {
  canvasRatio: CanvasRatioKey
  exportPaperSize: string
  exportPrintPro: boolean
  exportBleedMm: number
  exportRegistrationMarks: boolean
  exportFinalSafeGuides: boolean
  orientation: "portrait" | "landscape"
  rotation: number
  marginMethod: 1 | 2 | 3
  gridCols: number
  gridRows: number
  baselineMultiple: number
  gutterMultiple: number
  typographyScale: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci"
  customBaseline: number
  displayUnit: "pt" | "mm" | "px"
  useCustomMargins: boolean
  customMarginMultipliers: { top: number; left: number; right: number; bottom: number }
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showTypography: boolean
  collapsed: Record<SectionKey, boolean>
}

export default function Home() {
  const loadFileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewLayout, setPreviewLayout] = useState<PreviewLayoutState | null>(DEFAULT_PREVIEW_LAYOUT)
  const [loadedPreviewLayout, setLoadedPreviewLayout] = useState<{ key: number; layout: PreviewLayoutState } | null>(() =>
    DEFAULT_PREVIEW_LAYOUT ? { key: 1, layout: DEFAULT_PREVIEW_LAYOUT } : null
  )
  const [canvasRatio, setCanvasRatio] = useState<CanvasRatioKey>(DEFAULT_CANVAS_RATIO)
  const [exportPaperSize, setExportPaperSize] = useState(DEFAULT_UI.exportPaperSize)
  const [exportPrintPro, setExportPrintPro] = useState(DEFAULT_UI.exportPrintPro)
  const [exportBleedMm, setExportBleedMm] = useState(DEFAULT_UI.exportBleedMm)
  const [exportRegistrationMarks, setExportRegistrationMarks] = useState(DEFAULT_UI.exportRegistrationMarks)
  const [exportFinalSafeGuides, setExportFinalSafeGuides] = useState(DEFAULT_UI.exportFinalSafeGuides)
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(DEFAULT_ORIENTATION)
  const [rotation, setRotation] = useState(DEFAULT_UI.rotation)
  const [marginMethod, setMarginMethod] = useState<1 | 2 | 3>(DEFAULT_MARGIN_METHOD)
  const [gridCols, setGridCols] = useState(DEFAULT_UI.gridCols)
  const [gridRows, setGridRows] = useState(DEFAULT_UI.gridRows)
  const [baselineMultiple, setBaselineMultiple] = useState(DEFAULT_UI.baselineMultiple)
  const [gutterMultiple, setGutterMultiple] = useState(DEFAULT_UI.gutterMultiple)
  const [typographyScale, setTypographyScale] = useState<"swiss" | "golden" | "fourth" | "fifth" | "fibonacci">(DEFAULT_TYPOGRAPHY_SCALE)
  const [customBaseline, setCustomBaseline] = useState<number>(DEFAULT_UI.customBaseline ?? DEFAULT_A4_BASELINE)
  const [showBaselines, setShowBaselines] = useState(DEFAULT_UI.showBaselines)
  const [showModules, setShowModules] = useState(DEFAULT_UI.showModules)
  const [showMargins, setShowMargins] = useState(DEFAULT_UI.showMargins)
  const [showTypography, setShowTypography] = useState(DEFAULT_UI.showTypography)
  const [showHelp, setShowHelp] = useState(false)
  const [showImprint, setShowImprint] = useState(false)
  const [displayUnit, setDisplayUnit] = useState<"pt" | "mm" | "px">(DEFAULT_DISPLAY_UNIT)
  const [useCustomMargins, setUseCustomMargins] = useState(DEFAULT_UI.useCustomMargins)
  const [customMarginMultipliers, setCustomMarginMultipliers] = useState(DEFAULT_UI.customMarginMultipliers)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [exportFilenameDraft, setExportFilenameDraft] = useState("")
  const [exportPaperSizeDraft, setExportPaperSizeDraft] = useState(DEFAULT_UI.exportPaperSize)
  const [exportPrintProDraft, setExportPrintProDraft] = useState(DEFAULT_UI.exportPrintPro)
  const [exportBleedMmDraft, setExportBleedMmDraft] = useState(String(DEFAULT_UI.exportBleedMm))
  const [exportRegistrationMarksDraft, setExportRegistrationMarksDraft] = useState(DEFAULT_UI.exportRegistrationMarks)
  const [exportFinalSafeGuidesDraft, setExportFinalSafeGuidesDraft] = useState(DEFAULT_UI.exportFinalSafeGuides)
  const [exportWidthDraft, setExportWidthDraft] = useState("")
  const [saveFilenameDraft, setSaveFilenameDraft] = useState("")
  const [undoNonce, setUndoNonce] = useState(0)
  const [redoNonce, setRedoNonce] = useState(0)
  const [settingsPast, setSettingsPast] = useState<UiSettingsSnapshot[]>([])
  const [settingsFuture, setSettingsFuture] = useState<UiSettingsSnapshot[]>([])
  const [canUndoPreview, setCanUndoPreview] = useState(false)
  const [canRedoPreview, setCanRedoPreview] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>(DEFAULT_UI.collapsed)
  const uiSnapshotRef = useRef<UiSettingsSnapshot | null>(null)
  const skipUiHistoryRef = useRef(false)
  const SETTINGS_HISTORY_LIMIT = 100
  const headerClickTimeoutRef = useRef<number | null>(null)
  const canUndo = settingsPast.length > 0 || canUndoPreview
  const canRedo = settingsFuture.length > 0 || canRedoPreview
  const toggle = (key: SectionKey) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleAllSections = () => {
    setCollapsed((prev) => {
      const allClosed = SECTION_KEYS.every((key) => prev[key])
      const nextValue = allClosed ? false : true
      return SECTION_KEYS.reduce((acc, key) => {
        acc[key] = nextValue
        return acc
      }, {} as Record<SectionKey, boolean>)
    })
  }
  const handleSectionHeaderClick = (key: SectionKey) => (event: React.MouseEvent) => {
    if (event.detail > 1) return
    if (headerClickTimeoutRef.current !== null) {
      window.clearTimeout(headerClickTimeoutRef.current)
    }
    headerClickTimeoutRef.current = window.setTimeout(() => {
      toggle(key)
      headerClickTimeoutRef.current = null
    }, 180)
  }
  const handleSectionHeaderDoubleClick = (event: React.MouseEvent) => {
    event.preventDefault()
    if (headerClickTimeoutRef.current !== null) {
      window.clearTimeout(headerClickTimeoutRef.current)
      headerClickTimeoutRef.current = null
    }
    toggleAllSections()
  }

  const buildUiSnapshot = useCallback((): UiSettingsSnapshot => ({
    canvasRatio,
    exportPaperSize,
    exportPrintPro,
    exportBleedMm,
    exportRegistrationMarks,
    exportFinalSafeGuides,
    orientation,
    rotation,
    marginMethod,
    gridCols,
    gridRows,
    baselineMultiple,
    gutterMultiple,
    typographyScale,
    customBaseline,
    displayUnit,
    useCustomMargins,
    customMarginMultipliers: { ...customMarginMultipliers },
    showBaselines,
    showModules,
    showMargins,
    showTypography,
    collapsed: { ...collapsed },
  }), [
    baselineMultiple,
    canvasRatio,
    collapsed,
    customBaseline,
    customMarginMultipliers,
    displayUnit,
    exportPaperSize,
    exportPrintPro,
    exportBleedMm,
    exportRegistrationMarks,
    exportFinalSafeGuides,
    gridCols,
    gridRows,
    gutterMultiple,
    marginMethod,
    orientation,
    rotation,
    showBaselines,
    showMargins,
    showModules,
    showTypography,
    typographyScale,
    useCustomMargins,
  ])

  const applyUiSnapshot = useCallback((snapshot: UiSettingsSnapshot) => {
    skipUiHistoryRef.current = true
    setCanvasRatio(snapshot.canvasRatio)
    setExportPaperSize(snapshot.exportPaperSize)
    setExportPrintPro(snapshot.exportPrintPro)
    setExportBleedMm(snapshot.exportBleedMm)
    setExportRegistrationMarks(snapshot.exportRegistrationMarks)
    setExportFinalSafeGuides(snapshot.exportFinalSafeGuides)
    setOrientation(snapshot.orientation)
    setRotation(snapshot.rotation)
    setMarginMethod(snapshot.marginMethod)
    setGridCols(snapshot.gridCols)
    setGridRows(snapshot.gridRows)
    setBaselineMultiple(snapshot.baselineMultiple)
    setGutterMultiple(snapshot.gutterMultiple)
    setTypographyScale(snapshot.typographyScale)
    setCustomBaseline(snapshot.customBaseline)
    setDisplayUnit(snapshot.displayUnit)
    setUseCustomMargins(snapshot.useCustomMargins)
    setCustomMarginMultipliers({ ...snapshot.customMarginMultipliers })
    setShowBaselines(snapshot.showBaselines)
    setShowModules(snapshot.showModules)
    setShowMargins(snapshot.showMargins)
    setShowTypography(snapshot.showTypography)
    setCollapsed({ ...snapshot.collapsed })
    uiSnapshotRef.current = snapshot
  }, [])

  useEffect(() => {
    return () => {
      if (headerClickTimeoutRef.current !== null) {
        window.clearTimeout(headerClickTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!uiSnapshotRef.current) {
      uiSnapshotRef.current = buildUiSnapshot()
      return
    }
    const current = buildUiSnapshot()
    const previous = uiSnapshotRef.current
    if (JSON.stringify(current) === JSON.stringify(previous)) return

    if (skipUiHistoryRef.current) {
      skipUiHistoryRef.current = false
      uiSnapshotRef.current = current
      return
    }

    setSettingsPast((past) => {
      const next = [...past, previous]
      return next.length > SETTINGS_HISTORY_LIMIT ? next.slice(next.length - SETTINGS_HISTORY_LIMIT) : next
    })
    setSettingsFuture([])
    uiSnapshotRef.current = current
  }, [buildUiSnapshot])

  const selectedCanvasRatio = useMemo(() => {
    return CANVAS_RATIOS.find((option) => option.key === canvasRatio) ?? CANVAS_RATIOS[0]
  }, [canvasRatio])
  const isDinOrAnsiRatio = canvasRatio === "din_ab" || canvasRatio === "letter_ansi_ab"

  const previewFormat = useMemo(() => {
    const previewDefaults: Record<CanvasRatioKey, string> = {
      din_ab: "A4",
      letter_ansi_ab: "LETTER",
      balanced_3_4: "BALANCED_3_4",
      photo_2_3: "PHOTO_2_3",
      screen_16_9: "SCREEN_16_9",
      square_1_1: "SQUARE_1_1",
      editorial_4_5: "EDITORIAL_4_5",
      wide_2_1: "WIDE_2_1",
    }
    return previewDefaults[canvasRatio] ?? (selectedCanvasRatio.paperSizes[0] ?? "A4")
  }, [canvasRatio, selectedCanvasRatio])

  const gridUnit = useMemo(() => {
    return customBaseline ?? DEFAULT_A4_BASELINE
  }, [customBaseline])

  const paperSizeOptions = useMemo(() => {
    return selectedCanvasRatio.paperSizes
      .filter((name) => Boolean(FORMATS_PT[name]))
      .map((name) => {
        const dims = FORMATS_PT[name]
        return {
          value: name,
          label: `${name} (${formatValue(dims.width, displayUnit)}×${formatValue(dims.height, displayUnit)} ${displayUnit})`,
        }
      })
  }, [displayUnit, selectedCanvasRatio])

  useEffect(() => {
    const available = selectedCanvasRatio.paperSizes
    if (!available.includes(exportPaperSize) && available.length > 0) {
      setExportPaperSize(available[0])
    }
  }, [exportPaperSize, selectedCanvasRatio])

  const result = useMemo(() => {
    const customMargins = useCustomMargins ? {
      top: customMarginMultipliers.top * gridUnit,
      bottom: customMarginMultipliers.bottom * gridUnit,
      left: customMarginMultipliers.left * gridUnit,
      right: customMarginMultipliers.right * gridUnit,
    } : undefined
    return generateSwissGrid({
      format: previewFormat,
      orientation,
      marginMethod,
      gridCols,
      gridRows,
      baseline: customBaseline ?? DEFAULT_A4_BASELINE,
      baselineMultiple,
      gutterMultiple,
      customMargins,
      typographyScale,
    })
  }, [previewFormat, orientation, marginMethod, gridCols, gridRows, customBaseline, baselineMultiple, gutterMultiple, useCustomMargins, customMarginMultipliers, gridUnit, typographyScale])

  // Dynamic maximum baseline: ensures at least 24 baselines fit in usable height
  const maxBaseline = useMemo(() => {
    const formatDim = FORMATS_PT[previewFormat]
    const pageHeight = orientation === "landscape" ? formatDim.width : formatDim.height
    const customMarginUnits = useCustomMargins
      ? customMarginMultipliers.top + customMarginMultipliers.bottom
      : undefined
    return getMaxBaseline(pageHeight, marginMethod, baselineMultiple, customMarginUnits)
  }, [previewFormat, orientation, marginMethod, baselineMultiple, useCustomMargins, customMarginMultipliers])


  // Filter available options based on max baseline
  const availableBaselineOptions = useMemo(() => {
    return BASELINE_OPTIONS.filter(val => val <= maxBaseline)
  }, [maxBaseline])

  // Generate base filename with baseline info
  const baseFilename = useMemo(() => {
    const baselineStr = customBaseline ? customBaseline.toFixed(3) : result.grid.gridUnit.toFixed(3)
    return `${canvasRatio}_${orientation}_${gridCols}x${gridRows}_method${marginMethod}_${baselineStr}pt`
  }, [canvasRatio, orientation, gridCols, gridRows, marginMethod, customBaseline, result.grid.gridUnit])

  const defaultPdfFilename = useMemo(() => {
    return `${baseFilename}_${exportPaperSize}_grid.pdf`
  }, [baseFilename, exportPaperSize])

  const defaultJsonFilename = useMemo(() => {
    return `${baseFilename}_grid.json`
  }, [baseFilename])

  const saveJSON = (filename: string) => {
    const trimmed = filename.trim()
    if (!trimmed) return
    const normalizedFilename = trimmed.toLowerCase().endsWith(".json") ? trimmed : `${trimmed}.json`

    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      gridResult: result,
      uiSettings: {
        canvasRatio,
        format: previewFormat,
        exportPaperSize,
        exportPrintPro,
        exportBleedMm,
        exportRegistrationMarks,
        exportFinalSafeGuides,
        orientation,
        rotation,
        marginMethod,
        gridCols,
        gridRows,
        baselineMultiple,
        gutterMultiple,
        typographyScale,
        customBaseline,
        displayUnit,
        useCustomMargins,
        customMarginMultipliers,
        showBaselines,
        showModules,
        showMargins,
        showTypography,
        collapsed,
      },
      previewLayout,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = normalizedFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  const openSaveDialog = () => {
    setSaveFilenameDraft(defaultJsonFilename)
    setIsSaveDialogOpen(true)
  }

  const confirmSaveJSON = () => {
    const trimmedName = saveFilenameDraft.trim()
    if (!trimmedName) return
    saveJSON(trimmedName)
    setIsSaveDialogOpen(false)
  }

  const undoAny = useCallback(() => {
    if (settingsPast.length > 0) {
      const current = buildUiSnapshot()
      const previous = settingsPast[settingsPast.length - 1]
      setSettingsPast((past) => past.slice(0, -1))
      setSettingsFuture((future) => [current, ...future].slice(0, SETTINGS_HISTORY_LIMIT))
      applyUiSnapshot(previous)
      return
    }
    setUndoNonce((n) => n + 1)
  }, [applyUiSnapshot, buildUiSnapshot, settingsPast])

  const redoAny = useCallback(() => {
    if (settingsFuture.length > 0) {
      const current = buildUiSnapshot()
      const next = settingsFuture[0]
      setSettingsFuture((future) => future.slice(1))
      setSettingsPast((past) => {
        const withCurrent = [...past, current]
        return withCurrent.length > SETTINGS_HISTORY_LIMIT ? withCurrent.slice(withCurrent.length - SETTINGS_HISTORY_LIMIT) : withCurrent
      })
      applyUiSnapshot(next)
      return
    }
    setRedoNonce((n) => n + 1)
  }, [applyUiSnapshot, buildUiSnapshot, settingsFuture])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      if (key === "z" && !event.shiftKey) {
        if (settingsPast.length > 0) {
          event.preventDefault()
          undoAny()
        }
        return
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        if (settingsFuture.length > 0) {
          event.preventDefault()
          redoAny()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [redoAny, settingsFuture.length, settingsPast.length, undoAny])

  const getOrientedDimensions = useCallback((paperSize: string) => {
    const base = FORMATS_PT[paperSize] ?? FORMATS_PT[previewFormat]
    if (orientation === "landscape") {
      return { width: base.height, height: base.width }
    }
    return { width: base.width, height: base.height }
  }, [orientation, previewFormat])

  const exportPDF = (
    width: number,
    height: number,
    filename: string,
    printProConfig: { enabled: boolean; bleedMm: number; registrationMarks: boolean; finalSafeGuides: boolean },
  ) => {
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
  }

  const openExportDialog = () => {
    const dims = getOrientedDimensions(exportPaperSize)
    setExportPaperSizeDraft(exportPaperSize)
    setExportPrintProDraft(exportPrintPro)
    setExportBleedMmDraft(String(exportBleedMm))
    setExportRegistrationMarksDraft(exportRegistrationMarks)
    setExportFinalSafeGuidesDraft(exportFinalSafeGuides)
    setExportFilenameDraft(defaultPdfFilename)
    setExportWidthDraft(formatValue(dims.width, isDinOrAnsiRatio ? displayUnit : "mm"))
    setIsExportDialogOpen(true)
  }

  const applyPrintPreset = (presetKey: PrintPresetKey) => {
    const preset = PRINT_PRESETS.find((entry) => entry.key === presetKey)
    if (!preset) return
    setExportPrintProDraft(preset.config.enabled)
    setExportBleedMmDraft(String(preset.config.bleedMm))
    setExportRegistrationMarksDraft(preset.config.registrationMarks)
    setExportFinalSafeGuidesDraft(preset.config.finalSafeGuides)
  }

  const confirmExportPDF = () => {
    const trimmedName = exportFilenameDraft.trim()
    if (!trimmedName) return
    const filename = trimmedName.toLowerCase().endsWith(".pdf") ? trimmedName : `${trimmedName}.pdf`
    const baseDims = getOrientedDimensions(exportPaperSizeDraft)
    const aspectRatio = baseDims.height / baseDims.width
    const parsedWidth = Number(exportWidthDraft)
    const parsedBleed = Number(exportBleedMmDraft)
    const bleedMm = Number.isFinite(parsedBleed) && parsedBleed >= 0 ? parsedBleed : exportBleedMm
    const width = isDinOrAnsiRatio
      ? baseDims.width
      : (Number.isFinite(parsedWidth) && parsedWidth > 0 ? toPt(parsedWidth, "mm") : baseDims.width)
    const height = width * aspectRatio
    setExportPaperSize(exportPaperSizeDraft)
    setExportPrintPro(exportPrintProDraft)
    setExportBleedMm(bleedMm)
    setExportRegistrationMarks(exportRegistrationMarksDraft)
    setExportFinalSafeGuides(exportFinalSafeGuidesDraft)
    exportPDF(width, height, filename, {
      enabled: exportPrintProDraft,
      bleedMm,
      registrationMarks: exportRegistrationMarksDraft,
      finalSafeGuides: exportFinalSafeGuidesDraft,
    })
    setIsExportDialogOpen(false)
  }

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

  const loadLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const ui = parsed?.uiSettings
        if (!ui || typeof ui !== "object") {
          throw new Error("Invalid layout JSON: missing uiSettings.")
        }

        if (
          ui.canvasRatio === "din_ab"
          || ui.canvasRatio === "letter_ansi_ab"
          || ui.canvasRatio === "balanced_3_4"
          || ui.canvasRatio === "photo_2_3"
          || ui.canvasRatio === "screen_16_9"
          || ui.canvasRatio === "square_1_1"
          || ui.canvasRatio === "editorial_4_5"
          || ui.canvasRatio === "wide_2_1"
        ) {
          setCanvasRatio(ui.canvasRatio)
        }
        if (typeof ui.exportPaperSize === "string" && FORMATS_PT[ui.exportPaperSize]) {
          setExportPaperSize(ui.exportPaperSize)
        }
        if (typeof ui.exportPrintPro === "boolean") setExportPrintPro(ui.exportPrintPro)
        if (typeof ui.exportBleedMm === "number" && Number.isFinite(ui.exportBleedMm) && ui.exportBleedMm >= 0) {
          setExportBleedMm(ui.exportBleedMm)
        }
        if (typeof ui.exportRegistrationMarks === "boolean") setExportRegistrationMarks(ui.exportRegistrationMarks)
        if (typeof ui.exportFinalSafeGuides === "boolean") setExportFinalSafeGuides(ui.exportFinalSafeGuides)
        if (typeof ui.format === "string" && FORMATS_PT[ui.format]) {
          if (/^[AB]/.test(ui.format)) {
            setCanvasRatio("din_ab")
            if (!ui.exportPaperSize) setExportPaperSize(ui.format)
          }
          if (ui.format === "LETTER") {
            setCanvasRatio("letter_ansi_ab")
            if (!ui.exportPaperSize) setExportPaperSize("LETTER")
          }
        }
        if (ui.orientation === "portrait" || ui.orientation === "landscape") setOrientation(ui.orientation)
        if (typeof ui.rotation === "number") setRotation(ui.rotation)
        if (ui.marginMethod === 1 || ui.marginMethod === 2 || ui.marginMethod === 3) setMarginMethod(ui.marginMethod)
        if (typeof ui.gridCols === "number") setGridCols(ui.gridCols)
        if (typeof ui.gridRows === "number") setGridRows(ui.gridRows)
        if (typeof ui.baselineMultiple === "number") setBaselineMultiple(ui.baselineMultiple)
        if (typeof ui.gutterMultiple === "number") setGutterMultiple(ui.gutterMultiple)
        if (ui.typographyScale === "swiss" || ui.typographyScale === "golden" || ui.typographyScale === "fourth" || ui.typographyScale === "fifth" || ui.typographyScale === "fibonacci") {
          setTypographyScale(ui.typographyScale)
        }
        if (typeof ui.customBaseline === "number") setCustomBaseline(ui.customBaseline)
        if (ui.displayUnit === "pt" || ui.displayUnit === "mm" || ui.displayUnit === "px") setDisplayUnit(ui.displayUnit)
        if (typeof ui.useCustomMargins === "boolean") setUseCustomMargins(ui.useCustomMargins)
        if (ui.customMarginMultipliers && typeof ui.customMarginMultipliers === "object") {
          const cm = ui.customMarginMultipliers
          if (typeof cm.top === "number" && typeof cm.left === "number" && typeof cm.right === "number" && typeof cm.bottom === "number") {
            setCustomMarginMultipliers({ top: cm.top, left: cm.left, right: cm.right, bottom: cm.bottom })
          }
        }
        if (typeof ui.showBaselines === "boolean") setShowBaselines(ui.showBaselines)
        if (typeof ui.showModules === "boolean") setShowModules(ui.showModules)
        if (typeof ui.showMargins === "boolean") setShowMargins(ui.showMargins)
        if (typeof ui.showTypography === "boolean") setShowTypography(ui.showTypography)
        if (ui.collapsed && typeof ui.collapsed === "object") {
          const loadedCollapsed: Partial<Record<SectionKey, boolean>> = {}
          if (typeof ui.collapsed.format === "boolean") loadedCollapsed.format = ui.collapsed.format
          if (typeof ui.collapsed.baseline === "boolean") loadedCollapsed.baseline = ui.collapsed.baseline
          if (typeof ui.collapsed.margins === "boolean") loadedCollapsed.margins = ui.collapsed.margins
          if (typeof ui.collapsed.gutter === "boolean") loadedCollapsed.gutter = ui.collapsed.gutter
          if (typeof ui.collapsed.typo === "boolean") loadedCollapsed.typo = ui.collapsed.typo
          setCollapsed((prev) => ({ ...prev, ...loadedCollapsed }))
        }
        if (parsed?.previewLayout) {
          const nextKey = Date.now()
          const layout = parsed.previewLayout as PreviewLayoutState
          setPreviewLayout(layout)
          setLoadedPreviewLayout({ key: nextKey, layout })
        } else {
          setPreviewLayout(null)
          setLoadedPreviewLayout(null)
        }
      } catch (error) {
        console.error(error)
        window.alert("Could not load layout JSON.")
      } finally {
        event.target.value = ""
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      {/* Left Panel - Controls */}
      <div className="w-full md:w-96 flex flex-col border-r border-b md:border-b-0 bg-white max-h-[50vh] md:max-h-full">
        {/* Header - always visible */}
        <div className="shrink-0 space-y-2 p-4 md:px-6 md:pt-6 border-b">
          <h1 className="text-2xl font-bold tracking-tight">Swiss Grid Generator</h1>
          <p className="text-sm text-gray-600">
            Based on Müller-Brockmann's <em>Grid Systems in Graphic Design</em> (1981). Copyleft & -right 2026 by <a href="https://lp45.net">lp45.net</a>. <a href="https://github.com/longplay45/swiss-grid-generator">Source Code</a>.
          </p>
        </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <h2 className="text-sm font-semibold tracking-wide text-gray-700">Grid Generator Settings</h2>

        {/* Canvas Ratio Settings */}
        <Card>
          <CardHeader className="group relative pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("format")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              I. Canvas Ratio & Rotation
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.format ? "-rotate-90" : "rotate-0"}`}>▼</span>
            </CardTitle>
            <div className="pointer-events-none absolute left-4 top-full z-20 mt-1 w-max rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
              Ratio, orientation, and preview rotation
            </div>
          </CardHeader>
          {!collapsed.format && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ratio</Label>
                <Select value={canvasRatio} onValueChange={(v: CanvasRatioKey) => setCanvasRatio(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANVAS_RATIOS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label} ({opt.ratioLabel} / 1:{opt.ratioDecimal.toFixed(3)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orientation</Label>
                <Select value={orientation} onValueChange={(v: "portrait" | "landscape") => setOrientation(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Rotation</Label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{rotation}°</span>
                </div>
                <Slider value={[rotation]} min={-80} max={80} step={1} onValueChange={([v]) => setRotation(v)} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Baseline Grid Settings */}
        <Card>
          <CardHeader className="group relative pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("baseline")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              II. Baseline Grid ({result.grid.gridUnit.toFixed(3)} pt)
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.baseline ? "-rotate-90" : "rotate-0"}`}>▼</span>
            </CardTitle>
            <div className="pointer-events-none absolute left-4 top-full z-20 mt-1 w-max rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
              Baseline unit for grid and typography
            </div>
          </CardHeader>
          {!collapsed.baseline && (
            <CardContent className="space-y-4">
              {availableBaselineOptions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Grid Unit</Label>
                    <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{customBaseline} pt</span>
                  </div>
                  <Slider
                    value={[availableBaselineOptions.indexOf(customBaseline) >= 0 ? availableBaselineOptions.indexOf(customBaseline) : 0]}
                    min={0}
                    max={availableBaselineOptions.length - 1}
                    step={1}
                    onValueChange={([v]) => setCustomBaseline(availableBaselineOptions[v])}
                  />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Margins */}
        <Card>
          <CardHeader className="group relative pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("margins")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              III. Margins
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.margins ? "-rotate-90" : "rotate-0"}`}>▼</span>
            </CardTitle>
            <div className="pointer-events-none absolute left-4 top-full z-20 mt-1 w-max rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
              Margin method and custom margin controls
            </div>
          </CardHeader>
          {!collapsed.margins && <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Custom Margins</Label>
              <Switch
                checked={useCustomMargins}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const methodBottomRatio: Record<number, number> = { 1: 3.0, 2: 3.0, 3: 1.0 }
                    setCustomMarginMultipliers({
                      top: Math.max(1, Math.min(9, Math.round(result.grid.margins.top / gridUnit))),
                      left: Math.max(1, Math.min(9, Math.round(result.grid.margins.left / gridUnit))),
                      right: Math.max(1, Math.min(9, Math.round(result.grid.margins.right / gridUnit))),
                      bottom: Math.max(1, Math.min(9, Math.round(methodBottomRatio[marginMethod] * baselineMultiple))),
                    })
                  }
                  setUseCustomMargins(checked)
                }}
              />
            </div>

            {!useCustomMargins ? (
              <>
                <div className="space-y-2">
                  <Label>Margin Method</Label>
                  <Select value={marginMethod.toString()} onValueChange={(v) => setMarginMethod(parseInt(v) as 1 | 2 | 3)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Progressive (1:2:2:3)</SelectItem>
                      <SelectItem value="2">Van de Graaf (2:3:4:6)</SelectItem>
                      <SelectItem value="3">Baseline (1:1:1:1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Baseline Multiple</Label>
                    <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{baselineMultiple.toFixed(1)}×</span>
                  </div>
                  <Slider value={[baselineMultiple]} min={0.5} max={7} step={0.5} onValueChange={([v]) => setBaselineMultiple(v)} />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {(["top", "left", "right"] as const).map((side) => (
                  <div key={side} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize">{side}</Label>
                      <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{customMarginMultipliers[side]}×</span>
                    </div>
                    <Slider
                      value={[customMarginMultipliers[side]]}
                      min={1}
                      max={9}
                      step={1}
                      onValueChange={([v]) => setCustomMarginMultipliers(prev => ({ ...prev, [side]: v }))}
                    />
                  </div>
                ))}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">Bottom</Label>
                    <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{customMarginMultipliers.bottom}×</span>
                  </div>
                  <Slider
                    value={[customMarginMultipliers.bottom]}
                    min={1}
                    max={9}
                    step={1}
                    onValueChange={([v]) => setCustomMarginMultipliers(prev => ({ ...prev, bottom: v }))}
                  />
                </div>
              </div>
            )}
          </CardContent>}
        </Card>

        {/* Gutter */}
        <Card>
          <CardHeader className="group relative pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("gutter")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              IV. Gutter
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.gutter ? "-rotate-90" : "rotate-0"}`}>▼</span>
            </CardTitle>
            <div className="pointer-events-none absolute left-4 top-full z-20 mt-1 w-max rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
              Grid columns, rows, and gutter multiple
            </div>
          </CardHeader>
          {!collapsed.gutter && (
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Vertical Fields</Label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{gridCols}</span>
                </div>
                <Slider value={[gridCols]} min={1} max={13} step={1} onValueChange={([v]) => setGridCols(v)} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Horizontal Fields</Label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{gridRows}</span>
                </div>
                <Slider value={[gridRows]} min={1} max={13} step={1} onValueChange={([v]) => setGridRows(v)} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Baseline Multiple</Label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{gutterMultiple}×</span>
                </div>
                <Slider value={[gutterMultiple]} min={0.5} max={4} step={0.5} onValueChange={([v]) => setGutterMultiple(v)} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Typo */}
        <Card>
          <CardHeader className="group relative pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("typo")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              V. Typo
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.typo ? "-rotate-90" : "rotate-0"}`}>▼</span>
            </CardTitle>
            <div className="pointer-events-none absolute left-4 top-full z-20 mt-1 w-max rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
              Typography scale and hierarchy preset
            </div>
          </CardHeader>
          {!collapsed.typo && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Select value={typographyScale} onValueChange={(v: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci") => setTypographyScale(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPOGRAPHY_SCALE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          )}
        </Card>

      </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col min-h-[50vh] md:min-h-full">
        <input
          ref={loadFileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={loadLayout}
        />
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-white">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="group relative">
                <Button variant="outline" size="icon" aria-label="Load" onClick={() => loadFileInputRef.current?.click()}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                  Load layout JSON
                </div>
              </div>
              <div className="group relative">
                <Button variant="outline" size="icon" aria-label="Save" onClick={openSaveDialog}>
                  <Save className="h-4 w-4" />
                </Button>
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                  Save layout JSON
                </div>
              </div>
              <div className="group relative">
                <Button variant="outline" size="icon" aria-label="Export PDF" onClick={openExportDialog}>
                  <Download className="h-4 w-4" />
                </Button>
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                  Export PDF
                </div>
              </div>
            </div>
            <div className="mx-3 h-5 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="group relative">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Undo"
                  disabled={!canUndo}
                  onClick={undoAny}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                  Undo (Cmd/Ctrl+Z)
                </div>
              </div>
              <div className="group relative">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Redo"
                  disabled={!canRedo}
                  onClick={redoAny}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                  Redo (Cmd/Ctrl+Shift+Z)
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-gray-700">Display Options</h2>
            <div className="group relative">
              <Button
                size="icon"
                variant={showBaselines ? "default" : "outline"}
                className="h-8 w-8"
                aria-label="Toggle baselines"
                aria-pressed={showBaselines}
                onClick={() => setShowBaselines((prev) => !prev)}
              >
                <Rows3 className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Toggle baselines
              </div>
            </div>
            <div className="group relative">
              <Button
                size="icon"
                variant={showMargins ? "default" : "outline"}
                className="h-8 w-8"
                aria-label="Toggle margins"
                aria-pressed={showMargins}
                onClick={() => setShowMargins((prev) => !prev)}
              >
                <SquareDashed className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Toggle margin frame
              </div>
            </div>
            <div className="group relative">
              <Button
                size="icon"
                variant={showModules ? "default" : "outline"}
                className="h-8 w-8"
                aria-label="Toggle gutter grid"
                aria-pressed={showModules}
                onClick={() => setShowModules((prev) => !prev)}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Toggle modules and gutter
              </div>
            </div>
            <div className="group relative">
              <Button
                size="icon"
                variant={showTypography ? "default" : "outline"}
                className="h-8 w-8"
                aria-label="Toggle typography"
                aria-pressed={showTypography}
                onClick={() => setShowTypography((prev) => !prev)}
              >
                <Type className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Toggle type preview
              </div>
            </div>
            <div className="mx-3 h-5 w-px bg-gray-300" />
            <div className="group relative">
              <Button
                size="icon"
                variant={showHelp ? "default" : "outline"}
                className="h-8 w-8"
                aria-label="Toggle help"
                aria-pressed={showHelp}
                onClick={() => setShowHelp((prev) => !prev)}
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Help & reference
              </div>
            </div>
            <div className="group relative">
              <button
                type="button"
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 w-8 ${showImprint ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'}`}
                aria-label="Toggle imprint"
                aria-pressed={showImprint}
                onClick={() => setShowImprint((prev) => !prev)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Imprint
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-row overflow-hidden">
        <div className="flex-1 p-4 md:p-6 overflow-auto">
        <GridPreview
          result={result}
          showBaselines={showBaselines}
          showModules={showModules}
          showMargins={showMargins}
          showTypography={showTypography}
          initialLayout={loadedPreviewLayout?.layout ?? null}
          initialLayoutKey={loadedPreviewLayout?.key ?? 0}
          rotation={rotation}
          undoNonce={undoNonce}
          redoNonce={redoNonce}
          onHistoryAvailabilityChange={(undoAvailable, redoAvailable) => {
            setCanUndoPreview(undoAvailable)
            setCanRedoPreview(redoAvailable)
          }}
          onRequestGridRestore={(cols, rows) => {
            skipUiHistoryRef.current = true
            setGridCols(cols)
            setGridRows(rows)
          }}
          onLayoutChange={setPreviewLayout}
        />
        </div>
        {(showHelp || showImprint) && (
          <div className="w-80 shrink-0 border-l bg-white overflow-y-auto p-4 md:p-6 space-y-4 text-sm text-gray-700">
            {showHelp && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">How to Use</h3>
                  <ul className="space-y-1.5 text-xs text-gray-600 list-disc pl-4">
                    <li> Double-click the canvas to edit a text block or create a new one</li>
                    <li>Drag text blocks to reposition them on the grid</li>
                    <li>Use the display toggles above to show/hide baselines, margins, modules, and typography</li>
                    <li>Cmd/Ctrl+Z to undo, Cmd/Ctrl+Shift+Z to redo</li>
                    <li>Save/load layouts as JSON, export as vector PDF</li>
                    <li>Click a section header to collapse it; double-click to toggle all sections</li>
                  </ul>
                </div>
                <hr className="border-gray-200" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Grid Theory</h3>
                  <ul className="space-y-1.5 text-xs text-gray-600 list-disc pl-4">
                    <li><span className="font-medium text-gray-700">Baseline alignment:</span> all typography leading is an integer multiple of the baseline unit</li>
                    <li><span className="font-medium text-gray-700">Margin methods:</span> Progressive (1:2:2:3), Van de Graaf (2:3:4:6), Baseline (1:1:1:1)</li>
                    <li><span className="font-medium text-gray-700">Typography scales:</span> Swiss, Golden Ratio, Perfect Fourth, Perfect Fifth, Fibonacci</li>
                    <li><span className="font-medium text-gray-700">Format scaling:</span> baseline defaults scale by {"\u221A"}2 steps (A4 = 12pt reference)</li>
                  </ul>
                  <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
                    Reference: Josef M{"\u00FC"}ller-Brockmann, <em>Grid Systems in Graphic Design</em> (1981)
                  </p>
                </div>
              </>
            )}
            {showImprint && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Imprint</h3>
                  <div className="space-y-3 text-xs text-gray-600">
                    <p>
                      <strong>Swiss Grid Generator</strong><br />
                      A web-based tool for generating modular typographic grids based on Josef Müller-Brockmann's "Grid Systems in Graphic Design" (1981).
                    </p>
                    <p>
                      <strong>Developer:</strong><br />
                      <a href="https://lp45.net" className="text-blue-600 hover:underline">lp45.net</a>
                    </p>
                    <p>
                      <strong>License:</strong><br />
                      Copyleft & -right 2026. All rights reserved.
                    </p>
                    <p>
                      <strong>Source Code:</strong><br />
                      <a href="https://github.com/longplay45/swiss-grid-generator" className="text-blue-600 hover:underline">github.com/longplay45/swiss-grid-generator</a>
                    </p>
                    <p>
                      <strong>Technologies:</strong><br />
                      Next.js, React, TypeScript, Tailwind CSS, jsPDF
                    </p>
                    <p className="pt-2 text-[11px] text-gray-400">
                      This tool is inspired by the principles of Swiss Design and the International Typographic Style. The generated grids are intended for educational and design purposes.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </div>

      {isExportDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border bg-white p-4 shadow-xl space-y-4">
            <h3 className="text-base font-semibold">Export PDF</h3>
            <p className="text-xs text-gray-600">
              Ratio: {selectedCanvasRatio.label} | Orientation: {orientation} | Rotation: {rotation}°
            </p>
            {isDinOrAnsiRatio && (
              <>
                <div className="space-y-2">
                  <Label>Units</Label>
                  <Select
                    value={displayUnit}
                    onValueChange={(nextUnit: "pt" | "mm" | "px") => {
                      const dims = getOrientedDimensions(exportPaperSizeDraft)
                      setDisplayUnit(nextUnit)
                      setExportWidthDraft(formatValue(dims.width, nextUnit))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="pt">pt</SelectItem>
                      <SelectItem value="px">px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Paper Size</Label>
                  <Select
                    value={exportPaperSizeDraft}
                    onValueChange={(value) => {
                      setExportPaperSizeDraft(value)
                      const dims = getOrientedDimensions(value)
                      setExportWidthDraft(formatValue(dims.width, displayUnit))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paperSizeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {!isDinOrAnsiRatio && (
              <div className="space-y-2">
                <Label>Width (mm)</Label>
                <input
                  type="number"
                  min={1}
                  step="0.001"
                  value={exportWidthDraft}
                  onChange={(event) => setExportWidthDraft(event.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
            )}
            <p className="text-xs text-gray-600">
              Height will follow the selected aspect ratio automatically.
            </p>
            <div className="space-y-2">
              <Label>Filename</Label>
              <input
                type="text"
                value={exportFilenameDraft}
                onChange={(event) => setExportFilenameDraft(event.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder={defaultPdfFilename}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-sm">Print Pro</Label>
                <p className="text-[11px] text-gray-600">Adds bleed and crop marks as vectors.</p>
              </div>
              <Switch checked={exportPrintProDraft} onCheckedChange={setExportPrintProDraft} />
            </div>
            <div className="space-y-2">
              <Label>Print Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRINT_PRESETS.map((preset) => (
                  <Button
                    key={preset.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px]"
                    onClick={() => applyPrintPreset(preset.key)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            {exportPrintProDraft && (
              <>
                <div className="space-y-2">
                  <Label>Bleed (mm)</Label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={exportBleedMmDraft}
                    onChange={(event) => setExportBleedMmDraft(event.target.value)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Registration-Style Marks</Label>
                    <p className="text-[11px] text-gray-600">Uses rich CMYK marks instead of black.</p>
                  </div>
                  <Switch checked={exportRegistrationMarksDraft} onCheckedChange={setExportRegistrationMarksDraft} />
                </div>
                <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Final-Safe Guide Colors</Label>
                    <p className="text-[11px] text-gray-600">Neutral grayscale guides, no cyan/magenta accents.</p>
                  </div>
                  <Switch checked={exportFinalSafeGuidesDraft} onCheckedChange={setExportFinalSafeGuidesDraft} />
                </div>
              </>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmExportPDF}>
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {isSaveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-4 shadow-xl space-y-4">
            <h3 className="text-base font-semibold">Save JSON</h3>
            <p className="text-xs text-gray-600">
              Ratio: {selectedCanvasRatio.label} | Orientation: {orientation} | Rotation: {rotation}°
            </p>
            <div className="space-y-2">
              <Label>Filename</Label>
              <input
                type="text"
                value={saveFilenameDraft}
                onChange={(event) => setSaveFilenameDraft(event.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder={defaultJsonFilename}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmSaveJSON}>
                Save JSON
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
