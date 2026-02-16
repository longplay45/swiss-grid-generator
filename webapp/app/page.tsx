"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import {
  generateSwissGrid,
  FORMATS_PT,
  FORMAT_BASELINES,
  getMaxBaseline,
  CANVAS_RATIOS,
} from "@/lib/grid-calculator"
import type { CanvasRatioKey } from "@/lib/grid-calculator"
import { FONT_OPTIONS, GridPreview } from "@/components/grid-preview"
import type { FontFamily, PreviewLayoutState } from "@/components/grid-preview"
import defaultPreset from "@/public/default_v001.json"
import { Button } from "@/components/ui/button"
import {
  CircleHelp,
  Download,
  FolderOpen,
  LayoutGrid,
  LayoutTemplate,
  Redo2,
  Rows3,
  Save,
  Settings,
  SquareDashed,
  Type,
  Undo2,
} from "lucide-react"
import { formatValue } from "@/lib/units"
import { useSettingsHistory, SECTION_KEYS } from "@/hooks/useSettingsHistory"
import type { UiSettingsSnapshot, SectionKey } from "@/hooks/useSettingsHistory"
import { useExportActions } from "@/hooks/useExportActions"
import { CanvasRatioPanel } from "@/components/settings/CanvasRatioPanel"
import { BaselineGridPanel } from "@/components/settings/BaselineGridPanel"
import { MarginsPanel } from "@/components/settings/MarginsPanel"
import { GutterPanel } from "@/components/settings/GutterPanel"
import { TypographyPanel } from "@/components/settings/TypographyPanel"
import { HelpPanel } from "@/components/sidebar/HelpPanel"
import { ImprintPanel } from "@/components/sidebar/ImprintPanel"
import { ExampleLayoutsPanel } from "@/components/sidebar/ExampleLayoutsPanel"
import { ExportPdfDialog } from "@/components/dialogs/ExportPdfDialog"
import { SaveJsonDialog } from "@/components/dialogs/SaveJsonDialog"

const CANVAS_RATIO_SET = new Set<CanvasRatioKey>([
  "din_ab",
  "letter_ansi_ab",
  "balanced_3_4",
  "photo_2_3",
  "screen_16_9",
  "square_1_1",
  "editorial_4_5",
  "wide_2_1",
])
const CANVAS_RATIO_INDEX = new Map(CANVAS_RATIOS.map((option) => [option.key, option]))
const TYPOGRAPHY_SCALE_SET = new Set(["swiss", "golden", "fourth", "fifth", "fibonacci"] as const)
const DISPLAY_UNIT_SET = new Set(["pt", "mm", "px"] as const)
const FONT_OPTION_SET = new Set(FONT_OPTIONS.map((option) => option.value))

function isCanvasRatioKey(value: unknown): value is CanvasRatioKey {
  return typeof value === "string" && CANVAS_RATIO_SET.has(value as CanvasRatioKey)
}

function isTypographyScale(
  value: unknown,
): value is "swiss" | "golden" | "fourth" | "fifth" | "fibonacci" {
  return typeof value === "string" && TYPOGRAPHY_SCALE_SET.has(value as "swiss" | "golden" | "fourth" | "fifth" | "fibonacci")
}

function isDisplayUnit(value: unknown): value is "pt" | "mm" | "px" {
  return typeof value === "string" && DISPLAY_UNIT_SET.has(value as "pt" | "mm" | "px")
}

function isFontFamily(value: unknown): value is FontFamily {
  return typeof value === "string" && FONT_OPTION_SET.has(value as FontFamily)
}

const DEFAULT_UI = defaultPreset.uiSettings
const DEFAULT_PREVIEW_LAYOUT: PreviewLayoutState | null =
  defaultPreset.previewLayout as PreviewLayoutState
const DEFAULT_CANVAS_RATIO: CanvasRatioKey = isCanvasRatioKey(DEFAULT_UI.canvasRatio)
  ? DEFAULT_UI.canvasRatio
  : "din_ab"
const DEFAULT_ORIENTATION: "portrait" | "landscape" =
  DEFAULT_UI.orientation === "landscape" ? "landscape" : "portrait"
const DEFAULT_MARGIN_METHOD: 1 | 2 | 3 =
  DEFAULT_UI.marginMethod === 2 || DEFAULT_UI.marginMethod === 3 ? DEFAULT_UI.marginMethod : 1
const DEFAULT_TYPOGRAPHY_SCALE: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci" = isTypographyScale(DEFAULT_UI.typographyScale)
  ? DEFAULT_UI.typographyScale
  : "swiss"
const DEFAULT_DISPLAY_UNIT: "pt" | "mm" | "px" = isDisplayUnit(DEFAULT_UI.displayUnit)
  ? DEFAULT_UI.displayUnit
  : "pt"
const DEFAULT_BASE_FONT: FontFamily = (() => {
  const candidate = (DEFAULT_UI as { baseFont?: unknown }).baseFont
  return isFontFamily(candidate)
    ? candidate
    : "Inter"
})()

const BASELINE_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72]
const DEFAULT_A4_BASELINE = FORMAT_BASELINES["A4"] ?? 12
const PREVIEW_DEFAULT_FORMAT_BY_RATIO: Record<CanvasRatioKey, string> = {
  din_ab: "A4",
  letter_ansi_ab: "LETTER",
  balanced_3_4: "BALANCED_3_4",
  photo_2_3: "PHOTO_2_3",
  screen_16_9: "SCREEN_16_9",
  square_1_1: "SQUARE_1_1",
  editorial_4_5: "EDITORIAL_4_5",
  wide_2_1: "WIDE_2_1",
}

export default function Home() {
  const loadFileInputRef = useRef<HTMLInputElement | null>(null)
  const headerClickTimeoutRef = useRef<number | null>(null)
  const [previewLayout, setPreviewLayout] = useState<PreviewLayoutState | null>(
    DEFAULT_PREVIEW_LAYOUT,
  )
  const [loadedPreviewLayout, setLoadedPreviewLayout] = useState<{
    key: number
    layout: PreviewLayoutState
  } | null>(() =>
    DEFAULT_PREVIEW_LAYOUT ? { key: 1, layout: DEFAULT_PREVIEW_LAYOUT } : null,
  )
  const [canvasRatio, setCanvasRatio] = useState<CanvasRatioKey>(DEFAULT_CANVAS_RATIO)
  const [exportPaperSize, setExportPaperSize] = useState(DEFAULT_UI.exportPaperSize)
  const [exportPrintPro, setExportPrintPro] = useState(DEFAULT_UI.exportPrintPro)
  const [exportBleedMm, setExportBleedMm] = useState(DEFAULT_UI.exportBleedMm)
  const [exportRegistrationMarks, setExportRegistrationMarks] = useState(
    DEFAULT_UI.exportRegistrationMarks,
  )
  const [exportFinalSafeGuides, setExportFinalSafeGuides] = useState(
    DEFAULT_UI.exportFinalSafeGuides,
  )
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(DEFAULT_ORIENTATION)
  const [rotation, setRotation] = useState(DEFAULT_UI.rotation)
  const [marginMethod, setMarginMethod] = useState<1 | 2 | 3>(DEFAULT_MARGIN_METHOD)
  const [gridCols, setGridCols] = useState(DEFAULT_UI.gridCols)
  const [gridRows, setGridRows] = useState(DEFAULT_UI.gridRows)
  const [baselineMultiple, setBaselineMultiple] = useState(DEFAULT_UI.baselineMultiple)
  const [gutterMultiple, setGutterMultiple] = useState(DEFAULT_UI.gutterMultiple)
  const [typographyScale, setTypographyScale] = useState<
    "swiss" | "golden" | "fourth" | "fifth" | "fibonacci"
  >(DEFAULT_TYPOGRAPHY_SCALE)
  const [baseFont, setBaseFont] = useState<FontFamily>(DEFAULT_BASE_FONT)
  const [customBaseline, setCustomBaseline] = useState<number>(
    DEFAULT_UI.customBaseline ?? DEFAULT_A4_BASELINE,
  )
  const [showBaselines, setShowBaselines] = useState(DEFAULT_UI.showBaselines)
  const [showModules, setShowModules] = useState(DEFAULT_UI.showModules)
  const [showMargins, setShowMargins] = useState(DEFAULT_UI.showMargins)
  const [showTypography, setShowTypography] = useState(DEFAULT_UI.showTypography)
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<
    "settings" | "help" | "imprint" | "example" | null
  >(null)
  const [displayUnit, setDisplayUnit] = useState<"pt" | "mm" | "px">(DEFAULT_DISPLAY_UNIT)
  const [useCustomMargins, setUseCustomMargins] = useState(DEFAULT_UI.useCustomMargins)
  const [customMarginMultipliers, setCustomMarginMultipliers] = useState(
    DEFAULT_UI.customMarginMultipliers,
  )
  const [canUndoPreview, setCanUndoPreview] = useState(false)
  const [canRedoPreview, setCanRedoPreview] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>(DEFAULT_UI.collapsed)
  const [isSmartphone, setIsSmartphone] = useState(false)
  const [smartphoneNoticeDismissed, setSmartphoneNoticeDismissed] = useState(false)

  // ─── Derived values ───────────────────────────────────────────────────────

  const selectedCanvasRatio = useMemo(
    () => CANVAS_RATIO_INDEX.get(canvasRatio) ?? CANVAS_RATIOS[0],
    [canvasRatio],
  )
  const isDinOrAnsiRatio = canvasRatio === "din_ab" || canvasRatio === "letter_ansi_ab"

  const previewFormat = useMemo(() => {
    return PREVIEW_DEFAULT_FORMAT_BY_RATIO[canvasRatio] ?? (selectedCanvasRatio.paperSizes[0] ?? "A4")
  }, [canvasRatio, selectedCanvasRatio])

  const gridUnit = customBaseline ?? DEFAULT_A4_BASELINE

  const paperSizeOptions = useMemo(
    () =>
      selectedCanvasRatio.paperSizes
        .filter((name) => Boolean(FORMATS_PT[name]))
        .map((name) => {
          const dims = FORMATS_PT[name]
          return {
            value: name,
            label: `${name} (${formatValue(dims.width, displayUnit)}×${formatValue(dims.height, displayUnit)} ${displayUnit})`,
          }
        }),
    [displayUnit, selectedCanvasRatio],
  )

  useEffect(() => {
    const available = selectedCanvasRatio.paperSizes
    if (!available.includes(exportPaperSize) && available.length > 0) {
      setExportPaperSize(available[0])
    }
  }, [exportPaperSize, selectedCanvasRatio])

  const result = useMemo(() => {
    const customMargins = useCustomMargins
      ? {
          top: customMarginMultipliers.top * gridUnit,
          bottom: customMarginMultipliers.bottom * gridUnit,
          left: customMarginMultipliers.left * gridUnit,
          right: customMarginMultipliers.right * gridUnit,
        }
      : undefined
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
  }, [
    previewFormat,
    orientation,
    marginMethod,
    gridCols,
    gridRows,
    customBaseline,
    baselineMultiple,
    gutterMultiple,
    useCustomMargins,
    customMarginMultipliers,
    gridUnit,
    typographyScale,
  ])

  const maxBaseline = useMemo(() => {
    const formatDim = FORMATS_PT[previewFormat]
    const pageHeight = orientation === "landscape" ? formatDim.width : formatDim.height
    const customMarginUnits = useCustomMargins
      ? customMarginMultipliers.top + customMarginMultipliers.bottom
      : undefined
    return getMaxBaseline(pageHeight, marginMethod, baselineMultiple, customMarginUnits)
  }, [previewFormat, orientation, marginMethod, baselineMultiple, useCustomMargins, customMarginMultipliers])

  const availableBaselineOptions = useMemo(
    () => BASELINE_OPTIONS.filter((val) => val <= maxBaseline),
    [maxBaseline],
  )

  const baseFilename = useMemo(() => {
    const baselineStr = customBaseline
      ? customBaseline.toFixed(3)
      : result.grid.gridUnit.toFixed(3)
    return `${canvasRatio}_${orientation}_${gridCols}x${gridRows}_method${marginMethod}_${baselineStr}pt`
  }, [canvasRatio, orientation, gridCols, gridRows, marginMethod, customBaseline, result.grid.gridUnit])

  const defaultPdfFilename = useMemo(
    () => `${baseFilename}_${exportPaperSize}_grid.pdf`,
    [baseFilename, exportPaperSize],
  )

  const defaultJsonFilename = useMemo(() => `${baseFilename}_grid.json`, [baseFilename])

  // ─── Settings snapshot (for undo/redo) ───────────────────────────────────

  const buildUiSnapshot = useCallback(
    (): UiSettingsSnapshot => ({
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
      baseFont,
      customBaseline,
      displayUnit,
      useCustomMargins,
      customMarginMultipliers: { ...customMarginMultipliers },
      showBaselines,
      showModules,
      showMargins,
      showTypography,
      collapsed: { ...collapsed },
    }),
    [
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
      baseFont,
      useCustomMargins,
    ],
  )

  const history = useSettingsHistory(buildUiSnapshot, canUndoPreview, canRedoPreview)
  const { suppressNext, setCurrentSnapshot } = history

  const applyUiSnapshot = useCallback(
    (snapshot: UiSettingsSnapshot) => {
      suppressNext()
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
      setBaseFont(snapshot.baseFont)
      setCustomBaseline(snapshot.customBaseline)
      setDisplayUnit(snapshot.displayUnit)
      setUseCustomMargins(snapshot.useCustomMargins)
      setCustomMarginMultipliers({ ...snapshot.customMarginMultipliers })
      setShowBaselines(snapshot.showBaselines)
      setShowModules(snapshot.showModules)
      setShowMargins(snapshot.showMargins)
      setShowTypography(snapshot.showTypography)
      setCollapsed({ ...snapshot.collapsed })
      setCurrentSnapshot(snapshot)
    },
    [suppressNext, setCurrentSnapshot],
  )

  const undoAny = useCallback(
    () => history.undoAny(applyUiSnapshot),
    [history, applyUiSnapshot],
  )
  const redoAny = useCallback(
    () => history.redoAny(applyUiSnapshot),
    [history, applyUiSnapshot],
  )

  // Global keyboard undo/redo
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      if (key === "z" && !event.shiftKey) {
        if (history.settingsPast.length > 0) {
          event.preventDefault()
          undoAny()
        }
        return
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        if (history.settingsFuture.length > 0) {
          event.preventDefault()
          redoAny()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [history.settingsFuture.length, history.settingsPast.length, redoAny, undoAny])

  // ─── Section collapse helpers ─────────────────────────────────────────────

  const toggle = (key: SectionKey) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  const toggleAllSections = () => {
    setCollapsed((prev) => {
      const allClosed = SECTION_KEYS.every((key) => prev[key])
      const nextValue = allClosed ? false : true
      return SECTION_KEYS.reduce(
        (acc, key) => {
          acc[key] = nextValue
          return acc
        },
        {} as Record<SectionKey, boolean>,
      )
    })
  }

  const handleSectionHeaderClick = (key: SectionKey) => (event: React.MouseEvent) => {
    if (event.detail > 1) return
    if (headerClickTimeoutRef.current !== null) window.clearTimeout(headerClickTimeoutRef.current)
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

  useEffect(() => {
    return () => {
      if (headerClickTimeoutRef.current !== null) window.clearTimeout(headerClickTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    try {
      setSmartphoneNoticeDismissed(window.sessionStorage.getItem("sgg-smartphone-notice-dismissed") === "1")
    } catch {
      setSmartphoneNoticeDismissed(false)
    }
  }, [])

  useEffect(() => {
    const checkSmartphone = () => {
      const isSmallViewport = window.matchMedia("(max-width: 767px)").matches
      setIsSmartphone(isSmallViewport)
    }

    checkSmartphone()
    window.addEventListener("resize", checkSmartphone)
    return () => window.removeEventListener("resize", checkSmartphone)
  }, [])

  // ─── Export / Save actions ────────────────────────────────────────────────

  const buildUiSettingsPayload = useCallback(
    () => ({
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
      baseFont,
      customBaseline,
      displayUnit,
      useCustomMargins,
      customMarginMultipliers,
      showBaselines,
      showModules,
      showMargins,
      showTypography,
      collapsed,
    }),
    [
      canvasRatio,
      previewFormat,
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
      baseFont,
      customBaseline,
      displayUnit,
      useCustomMargins,
      customMarginMultipliers,
      showBaselines,
      showModules,
      showMargins,
      showTypography,
      collapsed,
    ],
  )

  const exportActionsContext = useMemo(
    () => ({
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
      paperSizeOptions,
      previewFormat,
      defaultPdfFilename,
      defaultJsonFilename,
      buildUiSettingsPayload,
    }),
    [
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
      exportPaperSize,
      exportPrintPro,
      exportBleedMm,
      exportRegistrationMarks,
      exportFinalSafeGuides,
      paperSizeOptions,
      previewFormat,
      defaultPdfFilename,
      defaultJsonFilename,
      buildUiSettingsPayload,
    ],
  )

  const exportActions = useExportActions(exportActionsContext)

  // ─── Load JSON layout ─────────────────────────────────────────────────────

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

        if (isCanvasRatioKey(ui.canvasRatio)) {
          setCanvasRatio(ui.canvasRatio)
        }
        if (typeof ui.exportPaperSize === "string" && FORMATS_PT[ui.exportPaperSize]) {
          setExportPaperSize(ui.exportPaperSize)
        }
        if (typeof ui.exportPrintPro === "boolean") setExportPrintPro(ui.exportPrintPro)
        if (
          typeof ui.exportBleedMm === "number"
          && Number.isFinite(ui.exportBleedMm)
          && ui.exportBleedMm >= 0
        ) {
          setExportBleedMm(ui.exportBleedMm)
        }
        if (typeof ui.exportRegistrationMarks === "boolean")
          setExportRegistrationMarks(ui.exportRegistrationMarks)
        if (typeof ui.exportFinalSafeGuides === "boolean")
          setExportFinalSafeGuides(ui.exportFinalSafeGuides)
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
        if (ui.orientation === "portrait" || ui.orientation === "landscape")
          setOrientation(ui.orientation)
        if (typeof ui.rotation === "number") setRotation(ui.rotation)
        if (ui.marginMethod === 1 || ui.marginMethod === 2 || ui.marginMethod === 3)
          setMarginMethod(ui.marginMethod)
        if (typeof ui.gridCols === "number") setGridCols(ui.gridCols)
        if (typeof ui.gridRows === "number") setGridRows(ui.gridRows)
        if (typeof ui.baselineMultiple === "number") setBaselineMultiple(ui.baselineMultiple)
        if (typeof ui.gutterMultiple === "number") setGutterMultiple(ui.gutterMultiple)
        if (isTypographyScale(ui.typographyScale)) {
          setTypographyScale(ui.typographyScale)
        }
        if (isFontFamily(ui.baseFont)) {
          setBaseFont(ui.baseFont)
        }
        if (typeof ui.customBaseline === "number") setCustomBaseline(ui.customBaseline)
        if (isDisplayUnit(ui.displayUnit))
          setDisplayUnit(ui.displayUnit)
        if (typeof ui.useCustomMargins === "boolean") setUseCustomMargins(ui.useCustomMargins)
        if (ui.customMarginMultipliers && typeof ui.customMarginMultipliers === "object") {
          const cm = ui.customMarginMultipliers
          if (
            typeof cm.top === "number"
            && typeof cm.left === "number"
            && typeof cm.right === "number"
            && typeof cm.bottom === "number"
          ) {
            setCustomMarginMultipliers({
              top: cm.top,
              left: cm.left,
              right: cm.right,
              bottom: cm.bottom,
            })
          }
        }
        if (typeof ui.showBaselines === "boolean") setShowBaselines(ui.showBaselines)
        if (typeof ui.showModules === "boolean") setShowModules(ui.showModules)
        if (typeof ui.showMargins === "boolean") setShowMargins(ui.showMargins)
        if (typeof ui.showTypography === "boolean") setShowTypography(ui.showTypography)
        if (ui.collapsed && typeof ui.collapsed === "object") {
          const loadedCollapsed: Partial<Record<SectionKey, boolean>> = {}
          if (typeof ui.collapsed.format === "boolean") loadedCollapsed.format = ui.collapsed.format
          if (typeof ui.collapsed.baseline === "boolean")
            loadedCollapsed.baseline = ui.collapsed.baseline
          if (typeof ui.collapsed.margins === "boolean")
            loadedCollapsed.margins = ui.collapsed.margins
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      {/* Left Panel - Controls */}
      <div className="w-full md:w-96 flex flex-col border-r border-b md:border-b-0 bg-white max-h-[50vh] md:max-h-full">
        {/* Header - always visible */}
        <div className="shrink-0 space-y-2 p-4 md:px-6 md:pt-6 border-b">
          <h1 className="text-2xl font-bold tracking-tight">Swiss Grid Generator</h1>
          <p className="text-sm text-gray-600">
            Based on Müller-Brockmann&apos;s <em>Grid Systems in Graphic Design</em> (1981).
            Copyleft &amp; -right 2026 by{" "}
            <a href="https://lp45.net">lp45.net</a>.{" "}
            <a href="https://github.com/longplay45/swiss-grid-generator">Source Code</a>.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          <h2 className="text-sm font-semibold tracking-wide text-gray-700">
            Grid Generator Settings
          </h2>

          <CanvasRatioPanel
            collapsed={collapsed.format}
            onHeaderClick={handleSectionHeaderClick("format")}
            onHeaderDoubleClick={handleSectionHeaderDoubleClick}
            canvasRatio={canvasRatio}
            onCanvasRatioChange={setCanvasRatio}
            orientation={orientation}
            onOrientationChange={setOrientation}
            rotation={rotation}
            onRotationChange={setRotation}
          />

          <BaselineGridPanel
            collapsed={collapsed.baseline}
            onHeaderClick={handleSectionHeaderClick("baseline")}
            onHeaderDoubleClick={handleSectionHeaderDoubleClick}
            gridUnitPt={result.grid.gridUnit}
            customBaseline={customBaseline}
            availableBaselineOptions={availableBaselineOptions}
            onCustomBaselineChange={setCustomBaseline}
          />

          <MarginsPanel
            collapsed={collapsed.margins}
            onHeaderClick={handleSectionHeaderClick("margins")}
            onHeaderDoubleClick={handleSectionHeaderDoubleClick}
            marginMethod={marginMethod}
            onMarginMethodChange={setMarginMethod}
            baselineMultiple={baselineMultiple}
            onBaselineMultipleChange={setBaselineMultiple}
            useCustomMargins={useCustomMargins}
            onUseCustomMarginsChange={setUseCustomMargins}
            customMarginMultipliers={customMarginMultipliers}
            onCustomMarginMultipliersChange={setCustomMarginMultipliers}
            currentMargins={result.grid.margins}
            gridUnit={gridUnit}
          />

          <GutterPanel
            collapsed={collapsed.gutter}
            onHeaderClick={handleSectionHeaderClick("gutter")}
            onHeaderDoubleClick={handleSectionHeaderDoubleClick}
            gridCols={gridCols}
            onGridColsChange={setGridCols}
            gridRows={gridRows}
            onGridRowsChange={setGridRows}
            gutterMultiple={gutterMultiple}
            onGutterMultipleChange={setGutterMultiple}
          />

          <TypographyPanel
            collapsed={collapsed.typo}
            onHeaderClick={handleSectionHeaderClick("typo")}
            onHeaderDoubleClick={handleSectionHeaderDoubleClick}
            typographyScale={typographyScale}
            onTypographyScaleChange={setTypographyScale}
            baseFont={baseFont}
            onBaseFontChange={setBaseFont}
          />
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
        <div className="px-4 py-3 md:px-6 border-b bg-white">
          <div className="flex flex-col gap-2 landscape:flex-row landscape:items-center landscape:justify-between landscape:gap-3">
            <div className="flex flex-wrap items-center gap-2 landscape:flex-nowrap">
            <div className="group relative">
              <Button
                variant="outline"
                size="icon"
                aria-label="Load"
                onClick={() => loadFileInputRef.current?.click()}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Load layout JSON
              </div>
            </div>
            <div className="group relative">
              <Button
                variant="outline"
                size="icon"
                aria-label="Save"
                onClick={exportActions.openSaveDialog}
              >
                <Save className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Save layout JSON
              </div>
            </div>
            <div className="group relative">
              <Button
                variant="outline"
                size="icon"
                aria-label="Export PDF"
                onClick={exportActions.openExportDialog}
              >
                <Download className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Export PDF
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="group relative">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Undo"
                  disabled={!history.canUndo}
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
                  disabled={!history.canRedo}
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

            <div className="flex flex-wrap items-center gap-2 landscape:flex-nowrap">
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
            </div>

            <div className="flex flex-wrap items-center gap-2 landscape:flex-nowrap">
            <div className="group relative">
              <Button
                size="icon"
                variant={activeSidebarPanel === "settings" ? "default" : "outline"}
                className="h-8 w-8"
                aria-label="Show settings panel"
                aria-pressed={activeSidebarPanel === "settings"}
                onClick={() =>
                  setActiveSidebarPanel((prev) => (prev === "settings" ? null : "settings"))
                }
              >
                <Settings className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Settings panel
              </div>
            </div>
            <div className="group relative">
              <Button
                size="icon"
                variant={activeSidebarPanel === "help" ? "default" : "outline"}
                className="h-8 w-8"
                aria-label="Toggle help"
                aria-pressed={activeSidebarPanel === "help"}
                onClick={() =>
                  setActiveSidebarPanel((prev) => (prev === "help" ? null : "help"))
                }
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Help &amp; reference
              </div>
            </div>
            <div className="group relative">
              <Button
                size="icon"
                variant={activeSidebarPanel === "imprint" ? "default" : "outline"}
                className="h-8 w-8"
                aria-label="Show imprint"
                aria-pressed={activeSidebarPanel === "imprint"}
                onClick={() =>
                  setActiveSidebarPanel((prev) => (prev === "imprint" ? null : "imprint"))
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Imprint
              </div>
            </div>
            <div className="group relative">
              <Button
                size="icon"
                variant={activeSidebarPanel === "example" ? "default" : "outline"}
                className="h-8 w-8"
                aria-label="Show examples"
                aria-pressed={activeSidebarPanel === "example"}
                onClick={() =>
                  setActiveSidebarPanel((prev) => (prev === "example" ? null : "example"))
                }
              >
                <LayoutTemplate className="h-4 w-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white/95 px-2 py-1 text-[11px] text-gray-700 shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
                Example layouts
              </div>
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
              baseFont={baseFont}
              initialLayout={loadedPreviewLayout?.layout ?? null}
              initialLayoutKey={loadedPreviewLayout?.key ?? 0}
              rotation={rotation}
              undoNonce={history.undoNonce}
              redoNonce={history.redoNonce}
              onHistoryAvailabilityChange={(undoAvailable, redoAvailable) => {
                setCanUndoPreview(undoAvailable)
                setCanRedoPreview(redoAvailable)
              }}
              onRequestGridRestore={(cols, rows) => {
                suppressNext()
                setGridCols(cols)
                setGridRows(rows)
              }}
              onLayoutChange={setPreviewLayout}
            />
          </div>
          {activeSidebarPanel && (
            <div className="w-80 shrink-0 border-l bg-white overflow-y-auto p-4 md:p-6 space-y-4 text-sm text-gray-700">
              {activeSidebarPanel === "settings" && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Settings</h3>
                  <div className="space-y-2 text-xs text-gray-600">
                    <p>This is a placeholder settings page.</p>
                    <p>
                      Future settings can be added here (profile, defaults, shortcuts, language,
                      etc.).
                    </p>
                  </div>
                </div>
              )}
              {activeSidebarPanel === "help" && <HelpPanel />}
              {activeSidebarPanel === "imprint" && <ImprintPanel />}
              {activeSidebarPanel === "example" && (
                <ExampleLayoutsPanel
                  onLoadPreset={(preset) => {
                    setCanvasRatio(preset.canvasRatio)
                    setOrientation(preset.orientation)
                    setGridCols(preset.cols)
                    setGridRows(preset.rows)
                    setMarginMethod(preset.marginMethod)
                    setBaselineMultiple(preset.baselineMultiple)
                    setGutterMultiple(preset.gutterMultiple)
                    setShowModules(true)
                    setShowBaselines(true)
                    setShowMargins(true)
                    setActiveSidebarPanel(null)
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <ExportPdfDialog
        isOpen={exportActions.isExportDialogOpen}
        onClose={() => exportActions.setIsExportDialogOpen(false)}
        ratioLabel={selectedCanvasRatio.label}
        orientation={orientation}
        rotation={rotation}
        isDinOrAnsiRatio={isDinOrAnsiRatio}
        displayUnit={displayUnit}
        onDisplayUnitChange={setDisplayUnit}
        exportPaperSizeDraft={exportActions.exportPaperSizeDraft}
        onExportPaperSizeChange={exportActions.setExportPaperSizeDraft}
        paperSizeOptions={paperSizeOptions}
        exportWidthDraft={exportActions.exportWidthDraft}
        onExportWidthChange={exportActions.setExportWidthDraft}
        exportFilenameDraft={exportActions.exportFilenameDraft}
        onExportFilenameChange={exportActions.setExportFilenameDraft}
        defaultPdfFilename={defaultPdfFilename}
        exportPrintProDraft={exportActions.exportPrintProDraft}
        onExportPrintProChange={exportActions.setExportPrintProDraft}
        onApplyPrintPreset={exportActions.applyPrintPreset}
        exportBleedMmDraft={exportActions.exportBleedMmDraft}
        onExportBleedMmChange={exportActions.setExportBleedMmDraft}
        exportRegistrationMarksDraft={exportActions.exportRegistrationMarksDraft}
        onExportRegistrationMarksChange={exportActions.setExportRegistrationMarksDraft}
        exportFinalSafeGuidesDraft={exportActions.exportFinalSafeGuidesDraft}
        onExportFinalSafeGuidesChange={exportActions.setExportFinalSafeGuidesDraft}
        onConfirm={exportActions.confirmExportPDF}
        getOrientedDimensions={exportActions.getOrientedDimensions}
      />

      <SaveJsonDialog
        isOpen={exportActions.isSaveDialogOpen}
        onClose={() => exportActions.setIsSaveDialogOpen(false)}
        filename={exportActions.saveFilenameDraft}
        onFilenameChange={exportActions.setSaveFilenameDraft}
        onConfirm={exportActions.confirmSaveJSON}
        defaultFilename={defaultJsonFilename}
        ratioLabel={selectedCanvasRatio.label}
        orientation={orientation}
        rotation={rotation}
      />

      {isSmartphone && !smartphoneNoticeDismissed ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 text-white">
          <div className="w-full max-w-md rounded-lg border border-white/30 bg-black/40 p-6">
            <h2 className="text-lg font-semibold">Best On Bigger Screens</h2>
            <p className="mt-3 text-sm text-white/85">
              Swiss Grid Generator is optimized for tablets, laptops, and desktop screens.
              Smartphone screens offer a limited editing experience.
            </p>
            <div className="mt-5 flex justify-end">
              <Button
                onClick={() => {
                  setSmartphoneNoticeDismissed(true)
                  try {
                    window.sessionStorage.setItem("sgg-smartphone-notice-dismissed", "1")
                  } catch {
                    // no-op
                  }
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
