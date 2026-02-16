"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import type { ReactNode } from "react"
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
import { HeaderIconButton } from "@/components/ui/header-icon-button"
import {
  CircleHelp,
  Download,
  FolderOpen,
  LayoutGrid,
  LayoutTemplate,
  Maximize2,
  Minimize2,
  Moon,
  Redo2,
  Rows3,
  Save,
  Settings,
  SquareDashed,
  Sun,
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
import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"
import type { PreviewHeaderShortcutId } from "@/lib/preview-header-shortcuts"

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
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.7.0"
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
  const previewPanelRef = useRef<HTMLDivElement | null>(null)
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
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false)
  const [isDarkUi, setIsDarkUi] = useState(false)
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

  const togglePreviewFullscreen = useCallback(async () => {
    const previewElement = previewPanelRef.current
    if (!previewElement || typeof document === "undefined") return

    try {
      if (document.fullscreenElement === previewElement) {
        await document.exitFullscreen()
      } else {
        await previewElement.requestFullscreen()
      }
    } catch {
      // Ignore request/exit failures and keep current non-fullscreen UI usable.
    }
  }, [])

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsPreviewFullscreen(document.fullscreenElement === previewPanelRef.current)
    }
    updateFullscreenState()
    document.addEventListener("fullscreenchange", updateFullscreenState)
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState)
  }, [])

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

  // Global keyboard shortcuts for preview-header actions
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      const shifted = event.shiftKey
      const alted = event.altKey
      const editable = isEditableTarget(event.target)
      const shortcut = PREVIEW_HEADER_SHORTCUTS.find((item) =>
        item.bindings.some(
          (binding) =>
            binding.key === key
            && (binding.shift ?? false) === shifted
            && (binding.alt ?? false) === alted,
        ),
      )
      if (!shortcut || editable) return

      event.preventDefault()
      switch (shortcut.id) {
        case "load_json":
          loadFileInputRef.current?.click()
          return
        case "save_json":
          exportActions.openSaveDialog()
          return
        case "export_pdf":
          exportActions.openExportDialog()
          return
        case "undo":
          if (history.canUndo) undoAny()
          return
        case "redo":
          if (history.canRedo) redoAny()
          return
        case "toggle_dark_mode":
          setIsDarkUi((prev) => !prev)
          return
        case "toggle_fullscreen":
          togglePreviewFullscreen()
          return
        case "toggle_baselines":
          setShowBaselines((prev) => !prev)
          return
        case "toggle_margins":
          setShowMargins((prev) => !prev)
          return
        case "toggle_modules":
          setShowModules((prev) => !prev)
          return
        case "toggle_typography":
          setShowTypography((prev) => !prev)
          return
        case "toggle_settings_panel":
          setActiveSidebarPanel((prev) => (prev === "settings" ? null : "settings"))
          return
        case "toggle_help_panel":
          setActiveSidebarPanel((prev) => (prev === "help" ? null : "help"))
          return
        case "toggle_imprint_panel":
          setActiveSidebarPanel((prev) => (prev === "imprint" ? null : "imprint"))
          return
        case "toggle_example_panel":
          setActiveSidebarPanel((prev) => (prev === "example" ? null : "example"))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [exportActions, history.canRedo, history.canUndo, redoAny, togglePreviewFullscreen, undoAny])

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

  const uiTheme = isDarkUi
    ? {
        root: "bg-gray-950",
        leftPanel: "dark border-gray-700 bg-gray-900 text-gray-100",
        subtleBorder: "border-gray-700",
        bodyText: "text-gray-300",
        headingText: "text-gray-300",
        link: "text-gray-100 underline",
        previewShell: "bg-gray-950",
        previewHeader: "dark border-gray-700 bg-gray-900 text-gray-100",
        divider: "bg-gray-700",
        sidebar: "dark border-gray-700 bg-gray-900 text-gray-300",
        sidebarHeading: "text-gray-100",
        sidebarBody: "text-gray-400",
      }
    : {
        root: "bg-gray-100",
        leftPanel: "border-gray-200 bg-white",
        subtleBorder: "border-gray-200",
        bodyText: "text-gray-600",
        headingText: "text-gray-700",
        link: "underline",
        previewShell: "bg-white",
        previewHeader: "border-gray-200 bg-white",
        divider: "bg-gray-200",
        sidebar: "border-gray-200 bg-white text-gray-700",
        sidebarHeading: "text-gray-900",
        sidebarBody: "text-gray-600",
      }

  type HeaderAction = {
    key: string
    ariaLabel: string
    tooltip: string
    shortcutId?: PreviewHeaderShortcutId
    icon: ReactNode
    variant?: "default" | "outline"
    pressed?: boolean
    disabled?: boolean
    onClick: () => void
  }
  type HeaderItem = { type: "action"; action: HeaderAction } | { type: "divider"; key: string }

  const fileGroup: HeaderItem[] = [
    {
      type: "action",
      action: {
        key: "examples",
        ariaLabel: "Show examples",
        tooltip: "Example layouts",
        shortcutId: "toggle_example_panel",
        variant: activeSidebarPanel === "example" ? "default" : "outline",
        pressed: activeSidebarPanel === "example",
        onClick: () => setActiveSidebarPanel((prev) => (prev === "example" ? null : "example")),
        icon: <LayoutTemplate className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-examples-load" },
    {
      type: "action",
      action: {
        key: "load",
        ariaLabel: "Load",
        tooltip: "Load layout JSON",
        shortcutId: "load_json",
        onClick: () => loadFileInputRef.current?.click(),
        icon: <FolderOpen className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "save",
        ariaLabel: "Save",
        tooltip: "Save layout JSON",
        shortcutId: "save_json",
        onClick: exportActions.openSaveDialog,
        icon: <Save className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "export",
        ariaLabel: "Export PDF",
        tooltip: "Export PDF",
        shortcutId: "export_pdf",
        onClick: exportActions.openExportDialog,
        icon: <Download className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-export-undo" },
    {
      type: "action",
      action: {
        key: "undo",
        ariaLabel: "Undo",
        tooltip: "Undo",
        shortcutId: "undo",
        disabled: !history.canUndo,
        onClick: undoAny,
        icon: <Undo2 className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "redo",
        ariaLabel: "Redo",
        tooltip: "Redo",
        shortcutId: "redo",
        disabled: !history.canRedo,
        onClick: redoAny,
        icon: <Redo2 className="h-4 w-4" />,
      },
    },
  ]

  const displayGroup: HeaderItem[] = [
    {
      type: "action",
      action: {
        key: "dark-mode",
        ariaLabel: isDarkUi ? "Disable dark mode" : "Enable dark mode",
        tooltip: isDarkUi ? "Switch to light UI" : "Switch to dark UI",
        shortcutId: "toggle_dark_mode",
        variant: isDarkUi ? "default" : "outline",
        pressed: isDarkUi,
        onClick: () => setIsDarkUi((prev) => !prev),
        icon: isDarkUi ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "fullscreen",
        ariaLabel: isPreviewFullscreen ? "Exit fullscreen preview" : "Enter fullscreen preview",
        tooltip: isPreviewFullscreen ? "Exit fullscreen preview" : "Enter fullscreen preview",
        shortcutId: "toggle_fullscreen",
        pressed: isPreviewFullscreen,
        onClick: togglePreviewFullscreen,
        icon: isPreviewFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-fullscreen-baselines" },
    {
      type: "action",
      action: {
        key: "baselines",
        ariaLabel: "Toggle baselines",
        tooltip: "Toggle baselines",
        shortcutId: "toggle_baselines",
        variant: showBaselines ? "default" : "outline",
        pressed: showBaselines,
        onClick: () => setShowBaselines((prev) => !prev),
        icon: <Rows3 className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "margins",
        ariaLabel: "Toggle margins",
        tooltip: "Toggle margin frame",
        shortcutId: "toggle_margins",
        variant: showMargins ? "default" : "outline",
        pressed: showMargins,
        onClick: () => setShowMargins((prev) => !prev),
        icon: <SquareDashed className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "modules",
        ariaLabel: "Toggle gutter grid",
        tooltip: "Toggle modules and gutter",
        shortcutId: "toggle_modules",
        variant: showModules ? "default" : "outline",
        pressed: showModules,
        onClick: () => setShowModules((prev) => !prev),
        icon: <LayoutGrid className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "typography",
        ariaLabel: "Toggle typography",
        tooltip: "Toggle type preview",
        shortcutId: "toggle_typography",
        variant: showTypography ? "default" : "outline",
        pressed: showTypography,
        onClick: () => setShowTypography((prev) => !prev),
        icon: <Type className="h-4 w-4" />,
      },
    },
  ]

  const sidebarGroup: HeaderAction[] = [
    {
      key: "settings",
      ariaLabel: "Show settings panel",
      tooltip: "Settings panel",
      shortcutId: "toggle_settings_panel",
      variant: activeSidebarPanel === "settings" ? "default" : "outline",
      pressed: activeSidebarPanel === "settings",
      onClick: () => setActiveSidebarPanel((prev) => (prev === "settings" ? null : "settings")),
      icon: <Settings className="h-4 w-4" />,
    },
    {
      key: "help",
      ariaLabel: "Toggle help",
      tooltip: "Help & reference",
      shortcutId: "toggle_help_panel",
      variant: activeSidebarPanel === "help" ? "default" : "outline",
      pressed: activeSidebarPanel === "help",
      onClick: () => setActiveSidebarPanel((prev) => (prev === "help" ? null : "help")),
      icon: <CircleHelp className="h-4 w-4" />,
    },
  ]

  const renderHeaderAction = (action: HeaderAction) => {
    const shortcut = action.shortcutId
      ? PREVIEW_HEADER_SHORTCUTS.find((item) => item.id === action.shortcutId)?.combo
      : null
    const tooltip = shortcut ? `${action.tooltip}\n${shortcut}` : action.tooltip
    return (
    <HeaderIconButton
      key={action.key}
      ariaLabel={action.ariaLabel}
      tooltip={tooltip}
      variant={action.variant ?? "outline"}
      aria-pressed={action.pressed}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.icon}
    </HeaderIconButton>
    )
  }

  return (
    <div className={`flex h-screen flex-col md:flex-row ${uiTheme.root}`}>
      {/* Left Panel - Controls */}
      <div className={`w-full md:w-96 flex max-h-[50vh] flex-col border-r border-b md:max-h-full md:border-b-0 ${uiTheme.leftPanel}`}>
        {/* Header - always visible */}
        <div className={`shrink-0 space-y-2 border-b p-4 md:px-6 md:pt-6 ${uiTheme.subtleBorder}`}>
          <h1 className="text-2xl font-bold tracking-tight">Swiss Grid Generator</h1>
          <p className={`text-sm ${uiTheme.bodyText}`}>
            Based on Müller-Brockmann&apos;s <em>Grid Systems in Graphic Design</em> (1981).
            Copyleft &amp; -right 2026 by{" "}
            <a href="https://lp45.net" className={uiTheme.link}>lp45.net</a>.{" "}
            <a href="https://github.com/longplay45/swiss-grid-generator" className={uiTheme.link}>Source Code</a>.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          <h2 className={`text-sm font-semibold tracking-wide ${uiTheme.headingText}`}>
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
            isDarkMode={isDarkUi}
          />

          <BaselineGridPanel
            collapsed={collapsed.baseline}
            onHeaderClick={handleSectionHeaderClick("baseline")}
            onHeaderDoubleClick={handleSectionHeaderDoubleClick}
            gridUnitPt={result.grid.gridUnit}
            customBaseline={customBaseline}
            availableBaselineOptions={availableBaselineOptions}
            onCustomBaselineChange={setCustomBaseline}
            isDarkMode={isDarkUi}
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
            isDarkMode={isDarkUi}
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
            isDarkMode={isDarkUi}
          />

          <TypographyPanel
            collapsed={collapsed.typo}
            onHeaderClick={handleSectionHeaderClick("typo")}
            onHeaderDoubleClick={handleSectionHeaderDoubleClick}
            typographyScale={typographyScale}
            onTypographyScaleChange={setTypographyScale}
            baseFont={baseFont}
            onBaseFontChange={setBaseFont}
            isDarkMode={isDarkUi}
          />
        </div>

        <div className={`shrink-0 border-t px-4 py-3 text-xs md:px-6 ${uiTheme.subtleBorder} ${uiTheme.bodyText}`}>
          <div className="flex items-center justify-between gap-3">
            <span>Version {APP_VERSION}</span>
            <button
              type="button"
              className={uiTheme.link}
              onClick={() => setActiveSidebarPanel("imprint")}
            >
              Imprint
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div
        ref={previewPanelRef}
        className={`flex-1 flex flex-col min-h-[50vh] md:min-h-full ${uiTheme.previewShell}`}
      >
        <input
          ref={loadFileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={loadLayout}
        />
        <div className={`px-4 py-3 md:px-6 border-b ${uiTheme.previewHeader}`}>
          <div className="flex flex-col gap-2 landscape:flex-row landscape:items-center landscape:justify-between landscape:gap-3">
            <div className="flex flex-wrap items-center gap-2 landscape:flex-nowrap">
              {fileGroup.map((item) =>
                item.type === "divider"
                  ? <div key={item.key} className={`h-6 w-px ${uiTheme.divider}`} aria-hidden="true" />
                  : renderHeaderAction(item.action),
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 landscape:flex-nowrap">
              {displayGroup.map((item) =>
                item.type === "divider"
                  ? <div key={item.key} className={`h-6 w-px ${uiTheme.divider}`} aria-hidden="true" />
                  : renderHeaderAction(item.action),
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 landscape:flex-nowrap">
              {sidebarGroup.map((action) => renderHeaderAction(action))}
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
              isDarkMode={isDarkUi}
              onLayoutChange={setPreviewLayout}
            />
          </div>
          {activeSidebarPanel && (
            <div className={`w-80 shrink-0 border-l overflow-y-auto p-4 md:p-6 space-y-4 text-sm ${uiTheme.sidebar}`}>
              {activeSidebarPanel === "settings" && (
                <div>
                  <h3 className={`text-sm font-semibold mb-2 ${uiTheme.sidebarHeading}`}>Settings</h3>
                  <div className={`space-y-2 text-xs ${uiTheme.sidebarBody}`}>
                    <p>This is a placeholder settings page.</p>
                    <p>
                      Future settings can be added here (profile, defaults, shortcuts, language,
                      etc.).
                    </p>
                  </div>
                </div>
              )}
              {activeSidebarPanel === "help" && <HelpPanel isDarkMode={isDarkUi} />}
              {activeSidebarPanel === "imprint" && <ImprintPanel isDarkMode={isDarkUi} />}
              {activeSidebarPanel === "example" && (
                <ExampleLayoutsPanel
                  isDarkMode={isDarkUi}
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
