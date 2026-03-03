"use client"

import { useReducer, useState, useMemo, useRef, useEffect, useCallback } from "react"
import {
  generateSwissGrid,
  FORMATS_PT,
  FORMAT_BASELINES,
  getMaxBaseline,
  CANVAS_RATIOS,
} from "@/lib/grid-calculator"
import type { CanvasRatioKey } from "@/lib/grid-calculator"
import type { GridResult } from "@/lib/grid-calculator"
import { GridPreview } from "@/components/grid-preview"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { Button } from "@/components/ui/button"
import { HeaderIconButton } from "@/components/ui/header-icon-button"
import { X } from "lucide-react"
import { formatValue } from "@/lib/units"
import { useSettingsHistory, SECTION_KEYS } from "@/hooks/useSettingsHistory"
import type { UiSettingsSnapshot, SectionKey } from "@/hooks/useSettingsHistory"
import { useExportActions } from "@/hooks/useExportActions"
import { useHeaderActions } from "@/hooks/useHeaderActions"
import type { HeaderAction } from "@/hooks/useHeaderActions"
import { CanvasRatioPanel } from "@/components/settings/CanvasRatioPanel"
import { BaselineGridPanel } from "@/components/settings/BaselineGridPanel"
import { MarginsPanel } from "@/components/settings/MarginsPanel"
import { GutterPanel } from "@/components/settings/GutterPanel"
import { TypographyPanel } from "@/components/settings/TypographyPanel"
import { ColorShemaPanel } from "@/components/settings/ColorShemaPanel"
import { SettingsHelpNavigationProvider } from "@/components/settings/help-navigation-context"
import { HelpPanel } from "@/components/sidebar/HelpPanel"
import type { LayoutPreset } from "@/lib/presets"
import {
  HELP_SECTION_BY_HEADER_ACTION,
  HELP_SECTION_BY_SETTINGS_SECTION,
} from "@/lib/help-registry"
import type { HelpSectionId } from "@/lib/help-registry"
import { ImprintPanel } from "@/components/sidebar/ImprintPanel"
import { PresetLayoutsPanel } from "@/components/sidebar/PresetLayoutsPanel"
import { ExportPdfDialog } from "@/components/dialogs/ExportPdfDialog"
import { SaveJsonDialog } from "@/components/dialogs/SaveJsonDialog"
import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"
import {
  isFontFamily,
  type FontFamily,
} from "@/lib/config/fonts"
import {
  BASELINE_OPTIONS,
  isDisplayUnit,
  isTypographyScale,
  type DisplayUnit,
  type TypographyScale
} from "@/lib/config/defaults"
import {
  isImageColorSchemeId,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import {
  DEFAULT_PREVIEW_LAYOUT,
  DEFAULT_UI,
  PREVIEW_DEFAULT_FORMAT_BY_RATIO,
  isCanvasRatioKey,
  resolveUiDefaults,
} from "@/lib/config/ui-defaults"

const CANVAS_RATIO_INDEX = new Map(CANVAS_RATIOS.map((option) => [option.key, option]))
const DEFAULT_A4_BASELINE = FORMAT_BASELINES["A4"] ?? 12
const RESOLVED_DEFAULTS = resolveUiDefaults(DEFAULT_UI, DEFAULT_A4_BASELINE)
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"
const RELEASE_CHANNEL = (process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? "prod").toLowerCase()
const SHOW_BETA_BADGE = RELEASE_CHANNEL === "beta"
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>

// ─── Split UI state (Grid/Preview + Export) ───────────────────────────────

type GridUiState = Pick<
  UiSettingsSnapshot,
  | "canvasRatio"
  | "orientation"
  | "rotation"
  | "marginMethod"
  | "gridCols"
  | "gridRows"
  | "baselineMultiple"
  | "gutterMultiple"
  | "typographyScale"
  | "baseFont"
  | "imageColorScheme"
  | "customBaseline"
  | "useCustomMargins"
  | "customMarginMultipliers"
  | "showBaselines"
  | "showModules"
  | "showMargins"
  | "showImagePlaceholders"
  | "showTypography"
  | "collapsed"
>

type ExportUiState = Pick<
  UiSettingsSnapshot,
  | "exportPaperSize"
  | "exportPrintPro"
  | "exportBleedMm"
  | "exportRegistrationMarks"
  | "exportFinalSafeGuides"
  | "displayUnit"
>

const INITIAL_GRID_UI_STATE: GridUiState = {
  canvasRatio: RESOLVED_DEFAULTS.canvasRatio,
  orientation: RESOLVED_DEFAULTS.orientation,
  rotation: DEFAULT_UI.rotation,
  marginMethod: RESOLVED_DEFAULTS.marginMethod,
  gridCols: DEFAULT_UI.gridCols,
  gridRows: DEFAULT_UI.gridRows,
  baselineMultiple: Math.max(1, DEFAULT_UI.baselineMultiple),
  gutterMultiple: DEFAULT_UI.gutterMultiple,
  typographyScale: RESOLVED_DEFAULTS.typographyScale,
  baseFont: RESOLVED_DEFAULTS.baseFont,
  imageColorScheme: RESOLVED_DEFAULTS.imageColorScheme,
  customBaseline: RESOLVED_DEFAULTS.customBaseline,
  useCustomMargins: DEFAULT_UI.useCustomMargins,
  customMarginMultipliers: DEFAULT_UI.customMarginMultipliers,
  showBaselines: DEFAULT_UI.showBaselines,
  showModules: DEFAULT_UI.showModules,
  showMargins: DEFAULT_UI.showMargins,
  showImagePlaceholders: typeof DEFAULT_UI.showImagePlaceholders === "boolean" ? DEFAULT_UI.showImagePlaceholders : true,
  showTypography: DEFAULT_UI.showTypography,
  collapsed: SECTION_KEYS.reduce(
    (acc, key) => {
      const raw = (DEFAULT_UI.collapsed as Partial<Record<SectionKey, boolean>> | undefined)?.[key]
      acc[key] = typeof raw === "boolean" ? raw : true
      return acc
    },
    {} as Record<SectionKey, boolean>,
  ),
}

const INITIAL_EXPORT_UI_STATE: ExportUiState = {
  exportPaperSize: DEFAULT_UI.exportPaperSize,
  exportPrintPro: DEFAULT_UI.exportPrintPro,
  exportBleedMm: DEFAULT_UI.exportBleedMm,
  exportRegistrationMarks: DEFAULT_UI.exportRegistrationMarks,
  exportFinalSafeGuides: DEFAULT_UI.exportFinalSafeGuides,
  displayUnit: RESOLVED_DEFAULTS.displayUnit,
}

type UiAction =
  | { type: "SET"; key: "canvasRatio"; value: CanvasRatioKey }
  | { type: "SET"; key: "exportPaperSize"; value: string }
  | { type: "SET"; key: "exportPrintPro"; value: boolean }
  | { type: "SET"; key: "exportBleedMm"; value: number }
  | { type: "SET"; key: "exportRegistrationMarks"; value: boolean }
  | { type: "SET"; key: "exportFinalSafeGuides"; value: boolean }
  | { type: "SET"; key: "orientation"; value: "portrait" | "landscape" }
  | { type: "SET"; key: "rotation"; value: number }
  | { type: "SET"; key: "marginMethod"; value: 1 | 2 | 3 }
  | { type: "SET"; key: "gridCols"; value: number }
  | { type: "SET"; key: "gridRows"; value: number }
  | { type: "SET"; key: "baselineMultiple"; value: number }
  | { type: "SET"; key: "gutterMultiple"; value: number }
  | { type: "SET"; key: "typographyScale"; value: TypographyScale }
  | { type: "SET"; key: "baseFont"; value: FontFamily }
  | { type: "SET"; key: "imageColorScheme"; value: ImageColorSchemeId }
  | { type: "SET"; key: "customBaseline"; value: number }
  | { type: "SET"; key: "displayUnit"; value: DisplayUnit }
  | { type: "SET"; key: "useCustomMargins"; value: boolean }
  | { type: "SET"; key: "customMarginMultipliers"; value: { top: number; left: number; right: number; bottom: number } }
  | { type: "SET"; key: "showBaselines"; value: boolean }
  | { type: "SET"; key: "showModules"; value: boolean }
  | { type: "SET"; key: "showMargins"; value: boolean }
  | { type: "SET"; key: "showImagePlaceholders"; value: boolean }
  | { type: "SET"; key: "showTypography"; value: boolean }
  | { type: "SET"; key: "collapsed"; value: Record<SectionKey, boolean> }
  | { type: "TOGGLE"; key: "showBaselines" | "showModules" | "showMargins" | "showImagePlaceholders" | "showTypography" }
  | { type: "TOGGLE_SECTION"; key: SectionKey }
  | { type: "SET_ALL_SECTIONS"; value: boolean }
  | { type: "APPLY_SNAPSHOT"; snapshot: UiSettingsSnapshot }
  | { type: "BATCH"; actions: UiAction[] }

function gridUiReducer(state: GridUiState, action: UiAction): GridUiState {
  switch (action.type) {
    case "SET":
      switch (action.key) {
        case "canvasRatio":
        case "orientation":
        case "rotation":
        case "marginMethod":
        case "gridCols":
        case "gridRows":
        case "gutterMultiple":
        case "typographyScale":
        case "baseFont":
        case "imageColorScheme":
        case "customBaseline":
        case "useCustomMargins":
        case "customMarginMultipliers":
        case "showBaselines":
        case "showModules":
        case "showMargins":
        case "showImagePlaceholders":
        case "showTypography":
        case "collapsed":
          if (state[action.key] === action.value) return state
          return { ...state, [action.key]: action.value }
        case "baselineMultiple": {
          const nextBaselineMultiple = Math.max(1, action.value)
          if (state.baselineMultiple === nextBaselineMultiple) return state
          return { ...state, baselineMultiple: nextBaselineMultiple }
        }
        default:
          return state
      }
    case "TOGGLE":
      return { ...state, [action.key]: !state[action.key] }
    case "TOGGLE_SECTION":
      return { ...state, collapsed: { ...state.collapsed, [action.key]: !state.collapsed[action.key] } }
    case "SET_ALL_SECTIONS":
      return {
        ...state,
        collapsed: SECTION_KEYS.reduce(
          (acc, key) => { acc[key] = action.value; return acc },
          {} as Record<SectionKey, boolean>,
        ),
      }
    case "APPLY_SNAPSHOT":
      return {
        canvasRatio: action.snapshot.canvasRatio,
        orientation: action.snapshot.orientation,
        rotation: action.snapshot.rotation,
        marginMethod: action.snapshot.marginMethod,
        gridCols: action.snapshot.gridCols,
        gridRows: action.snapshot.gridRows,
        baselineMultiple: Math.max(1, action.snapshot.baselineMultiple),
        gutterMultiple: action.snapshot.gutterMultiple,
        typographyScale: action.snapshot.typographyScale,
        baseFont: action.snapshot.baseFont,
        imageColorScheme: action.snapshot.imageColorScheme,
        customBaseline: action.snapshot.customBaseline,
        useCustomMargins: action.snapshot.useCustomMargins,
        customMarginMultipliers: action.snapshot.customMarginMultipliers,
        showBaselines: action.snapshot.showBaselines,
        showModules: action.snapshot.showModules,
        showMargins: action.snapshot.showMargins,
        showImagePlaceholders: action.snapshot.showImagePlaceholders,
        showTypography: action.snapshot.showTypography,
        collapsed: action.snapshot.collapsed,
      }
    case "BATCH":
      return action.actions.reduce(gridUiReducer, state)
    default:
      return state
  }
}

function exportUiReducer(state: ExportUiState, action: UiAction): ExportUiState {
  switch (action.type) {
    case "SET":
      switch (action.key) {
        case "exportPaperSize":
        case "exportPrintPro":
        case "exportBleedMm":
        case "exportRegistrationMarks":
        case "exportFinalSafeGuides":
        case "displayUnit":
          if (state[action.key] === action.value) return state
          return { ...state, [action.key]: action.value }
        default:
          return state
      }
    case "APPLY_SNAPSHOT":
      return {
        exportPaperSize: action.snapshot.exportPaperSize,
        exportPrintPro: action.snapshot.exportPrintPro,
        exportBleedMm: action.snapshot.exportBleedMm,
        exportRegistrationMarks: action.snapshot.exportRegistrationMarks,
        exportFinalSafeGuides: action.snapshot.exportFinalSafeGuides,
        displayUnit: action.snapshot.displayUnit,
      }
    case "BATCH":
      return action.actions.reduce(exportUiReducer, state)
    default:
      return state
  }
}

function buildUiActionsFromLoadedSettings(
  loaded: Record<string, unknown>,
  currentCollapsed: Record<SectionKey, boolean>,
): UiAction[] {
  const actions: UiAction[] = []
  const set = <K extends UiAction & { type: "SET" }>(key: K["key"], value: K["value"]) =>
    actions.push({ type: "SET", key, value } as UiAction)

  if (isCanvasRatioKey(loaded.canvasRatio)) set("canvasRatio", loaded.canvasRatio)
  if (typeof loaded.exportPaperSize === "string" && FORMATS_PT[loaded.exportPaperSize]) {
    set("exportPaperSize", loaded.exportPaperSize)
  }
  if (typeof loaded.exportPrintPro === "boolean") set("exportPrintPro", loaded.exportPrintPro)
  if (typeof loaded.exportBleedMm === "number" && Number.isFinite(loaded.exportBleedMm) && loaded.exportBleedMm >= 0) {
    set("exportBleedMm", loaded.exportBleedMm)
  }
  if (typeof loaded.exportRegistrationMarks === "boolean") set("exportRegistrationMarks", loaded.exportRegistrationMarks)
  if (typeof loaded.exportFinalSafeGuides === "boolean") set("exportFinalSafeGuides", loaded.exportFinalSafeGuides)
  if (typeof loaded.format === "string" && FORMATS_PT[loaded.format]) {
    if (/^[AB]/.test(loaded.format)) {
      set("canvasRatio", "din_ab")
      if (!loaded.exportPaperSize) set("exportPaperSize", loaded.format)
    }
    if (loaded.format === "LETTER") {
      set("canvasRatio", "letter_ansi_ab")
      if (!loaded.exportPaperSize) set("exportPaperSize", "LETTER")
    }
  }
  if (loaded.orientation === "portrait" || loaded.orientation === "landscape") set("orientation", loaded.orientation)
  if (typeof loaded.rotation === "number") set("rotation", loaded.rotation)
  if (loaded.marginMethod === 1 || loaded.marginMethod === 2 || loaded.marginMethod === 3) {
    set("marginMethod", loaded.marginMethod)
  }
  if (typeof loaded.gridCols === "number") set("gridCols", loaded.gridCols)
  if (typeof loaded.gridRows === "number") set("gridRows", loaded.gridRows)
  if (typeof loaded.baselineMultiple === "number") set("baselineMultiple", loaded.baselineMultiple)
  if (typeof loaded.gutterMultiple === "number") set("gutterMultiple", loaded.gutterMultiple)
  if (isTypographyScale(loaded.typographyScale)) set("typographyScale", loaded.typographyScale)
  if (isFontFamily(loaded.baseFont)) set("baseFont", loaded.baseFont)
  if (isImageColorSchemeId(loaded.imageColorScheme)) set("imageColorScheme", loaded.imageColorScheme)
  if (typeof loaded.customBaseline === "number") set("customBaseline", loaded.customBaseline)
  if (isDisplayUnit(loaded.displayUnit)) set("displayUnit", loaded.displayUnit)
  if (typeof loaded.useCustomMargins === "boolean") set("useCustomMargins", loaded.useCustomMargins)

  if (loaded.customMarginMultipliers && typeof loaded.customMarginMultipliers === "object") {
    const customMargins = loaded.customMarginMultipliers as {
      top?: unknown
      left?: unknown
      right?: unknown
      bottom?: unknown
    }
    if (
      typeof customMargins.top === "number"
      && typeof customMargins.left === "number"
      && typeof customMargins.right === "number"
      && typeof customMargins.bottom === "number"
    ) {
      set("customMarginMultipliers", {
        top: customMargins.top,
        left: customMargins.left,
        right: customMargins.right,
        bottom: customMargins.bottom,
      })
    }
  }

  if (typeof loaded.showBaselines === "boolean") set("showBaselines", loaded.showBaselines)
  if (typeof loaded.showModules === "boolean") set("showModules", loaded.showModules)
  if (typeof loaded.showMargins === "boolean") set("showMargins", loaded.showMargins)
  if (typeof loaded.showImagePlaceholders === "boolean") set("showImagePlaceholders", loaded.showImagePlaceholders)
  if (typeof loaded.showTypography === "boolean") set("showTypography", loaded.showTypography)

  if (loaded.collapsed && typeof loaded.collapsed === "object") {
    const collapsedSettings = loaded.collapsed as Partial<Record<SectionKey, unknown>>
    const merged = { ...currentCollapsed }
    for (const key of SECTION_KEYS) {
      if (typeof collapsedSettings[key] === "boolean") merged[key] = collapsedSettings[key]
    }
    set("collapsed", merged)
  }

  return actions
}

export default function Home() {
  const loadFileInputRef = useRef<HTMLInputElement | null>(null)
  const headerClickTimeoutRef = useRef<number | null>(null)
  const isDirtyRef = useRef(false)
  const [previewLayout, setPreviewLayout] = useState<PreviewLayoutState | null>(
    DEFAULT_PREVIEW_LAYOUT as PreviewLayoutState | null,
  )
  const [loadedPreviewLayout, setLoadedPreviewLayout] = useState<{
    key: number
    layout: PreviewLayoutState
  } | null>(() =>
    DEFAULT_PREVIEW_LAYOUT ? { key: 1, layout: DEFAULT_PREVIEW_LAYOUT as PreviewLayoutState } : null,
  )
  const [gridUi, dispatchGrid] = useReducer(gridUiReducer, INITIAL_GRID_UI_STATE)
  const [exportUi, dispatchExport] = useReducer(exportUiReducer, INITIAL_EXPORT_UI_STATE)
  const dispatch = useCallback((action: UiAction) => {
    if (action.type === "BATCH") {
      dispatchGrid(action)
      dispatchExport(action)
      return
    }
    dispatchGrid(action)
    dispatchExport(action)
  }, [dispatchExport, dispatchGrid])
  const ui = useMemo(() => ({ ...gridUi, ...exportUi }), [gridUi, exportUi])
  const {
    canvasRatio, exportPaperSize, exportPrintPro, exportBleedMm,
    exportRegistrationMarks, exportFinalSafeGuides, orientation, rotation,
    marginMethod, gridCols, gridRows, baselineMultiple, gutterMultiple,
    typographyScale, baseFont, imageColorScheme, customBaseline, displayUnit,
    useCustomMargins, customMarginMultipliers, showBaselines, showModules,
    showMargins, showImagePlaceholders, showTypography, collapsed,
  } = ui
  // Stable dispatch wrappers for child component props
  const setCanvasRatio = useCallback((v: CanvasRatioKey) => dispatch({ type: "SET", key: "canvasRatio", value: v }), [dispatch])
  const setOrientation = useCallback((v: "portrait" | "landscape") => dispatch({ type: "SET", key: "orientation", value: v }), [dispatch])
  const setRotation = useCallback((v: number) => dispatch({ type: "SET", key: "rotation", value: v }), [dispatch])
  const setMarginMethod = useCallback((v: 1 | 2 | 3) => dispatch({ type: "SET", key: "marginMethod", value: v }), [dispatch])
  const setGridCols = useCallback((v: number) => dispatch({ type: "SET", key: "gridCols", value: v }), [dispatch])
  const setGridRows = useCallback((v: number) => dispatch({ type: "SET", key: "gridRows", value: v }), [dispatch])
  const setBaselineMultiple = useCallback((v: number) => dispatch({ type: "SET", key: "baselineMultiple", value: v }), [dispatch])
  const setGutterMultiple = useCallback((v: number) => dispatch({ type: "SET", key: "gutterMultiple", value: v }), [dispatch])
  const setTypographyScale = useCallback((v: TypographyScale) => dispatch({ type: "SET", key: "typographyScale", value: v }), [dispatch])
  const setBaseFont = useCallback((v: FontFamily) => dispatch({ type: "SET", key: "baseFont", value: v }), [dispatch])
  const setImageColorScheme = useCallback((v: ImageColorSchemeId) => dispatch({ type: "SET", key: "imageColorScheme", value: v }), [dispatch])
  const setCustomBaseline = useCallback((v: number) => dispatch({ type: "SET", key: "customBaseline", value: v }), [dispatch])
  const setUseCustomMargins = useCallback((v: boolean) => dispatch({ type: "SET", key: "useCustomMargins", value: v }), [dispatch])
  const setCustomMarginMultipliers = useCallback((v: { top: number; left: number; right: number; bottom: number }) => dispatch({ type: "SET", key: "customMarginMultipliers", value: v }), [dispatch])

  const [activeSidebarPanel, setActiveSidebarPanel] = useState<
    "settings" | "help" | "imprint" | null
  >(null)
  const [showPresetsBrowser, setShowPresetsBrowser] = useState(true)
  const [activeHelpSectionId, setActiveHelpSectionId] = useState<HelpSectionId | null>(null)
  const showSectionHelpIcons = activeSidebarPanel === "help"
  const [canUndoPreview, setCanUndoPreview] = useState(false)
  const [canRedoPreview, setCanRedoPreview] = useState(false)
  const [isDarkUi, setIsDarkUi] = useState(false)
  const [showRolloverInfo, setShowRolloverInfo] = useState(true)
  const [isSmartphone, setIsSmartphone] = useState(false)
  const [smartphoneNoticeDismissed, setSmartphoneNoticeDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const applyTheme = (matches: boolean) => setIsDarkUi(matches)
    applyTheme(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => applyTheme(event.matches)
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

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
      dispatch({ type: "SET", key: "exportPaperSize", value: available[0] })
    }
  }, [dispatch, exportPaperSize, selectedCanvasRatio])

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

  const buildUiSnapshot = useCallback((): UiSettingsSnapshot => ui, [ui])

  const history = useSettingsHistory(buildUiSnapshot, canUndoPreview, canRedoPreview)
  const { suppressNext, setCurrentSnapshot } = history

  const applyUiSnapshot = useCallback(
    (snapshot: UiSettingsSnapshot) => {
      suppressNext()
      dispatch({ type: "APPLY_SNAPSHOT", snapshot })
      setCurrentSnapshot(snapshot)
    },
    [dispatch, suppressNext, setCurrentSnapshot],
  )

  const undoAny = useCallback(
    () => history.undoAny(applyUiSnapshot),
    [history, applyUiSnapshot],
  )
  const redoAny = useCallback(
    () => history.redoAny(applyUiSnapshot),
    [history, applyUiSnapshot],
  )

  const handlePreviewOpenHelpSection = useCallback((sectionId: HelpSectionId) => {
    setActiveHelpSectionId(sectionId)
    setActiveSidebarPanel("help")
  }, [])

  const handlePreviewHistoryAvailabilityChange = useCallback((undoAvailable: boolean, redoAvailable: boolean) => {
    setCanUndoPreview(undoAvailable)
    setCanRedoPreview(redoAvailable)
  }, [])

  const handlePreviewGridRestore = useCallback((cols: number, rows: number) => {
    suppressNext()
    dispatch({ type: "BATCH", actions: [
      { type: "SET", key: "gridCols", value: cols },
      { type: "SET", key: "gridRows", value: rows },
    ] })
  }, [dispatch, suppressNext])

  // ─── Section collapse helpers ─────────────────────────────────────────────

  const toggle = useCallback((key: SectionKey) =>
    dispatch({ type: "TOGGLE_SECTION", key }), [dispatch])

  const toggleAllSections = useCallback(() => {
    const allClosed = SECTION_KEYS.every((key) => collapsed[key])
    dispatch({ type: "SET_ALL_SECTIONS", value: !allClosed })
  }, [collapsed, dispatch])

  const handleSectionHeaderClick = useCallback((key: SectionKey) => (event: React.MouseEvent) => {
    if (event.detail > 1) return
    if (headerClickTimeoutRef.current !== null) window.clearTimeout(headerClickTimeoutRef.current)
    headerClickTimeoutRef.current = window.setTimeout(() => {
      toggle(key)
      headerClickTimeoutRef.current = null
    }, 180)
  }, [toggle])

  const handleSectionHeaderDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    if (headerClickTimeoutRef.current !== null) {
      window.clearTimeout(headerClickTimeoutRef.current)
      headerClickTimeoutRef.current = null
    }
    toggleAllSections()
  }, [toggleAllSections])

  const handleSectionHelpNavigate = useCallback((key: SectionKey) => {
    const targetSectionId = HELP_SECTION_BY_SETTINGS_SECTION[key]
    setActiveHelpSectionId(targetSectionId)
  }, [])
  const handleHeaderHelpNavigate = useCallback((actionKey: string) => {
    const targetSectionId = HELP_SECTION_BY_HEADER_ACTION[actionKey]
    if (!targetSectionId) return
    setActiveHelpSectionId(targetSectionId)
  }, [])

  const toggleHelpPanelFromHeader = useCallback(() => {
    setActiveSidebarPanel((prev) => {
      if (prev === "help") return null
      setActiveHelpSectionId(null)
      return "help"
    })
  }, [])

  useEffect(() => {
    return () => {
      if (headerClickTimeoutRef.current !== null) window.clearTimeout(headerClickTimeoutRef.current)
    }
  }, [])

  // Mark dirty whenever the settings or layout history accumulate unsaved changes
  useEffect(() => {
    if (history.settingsPast.length > 0 || canUndoPreview) {
      isDirtyRef.current = true
    }
  }, [history.settingsPast.length, canUndoPreview])

  // Warn before reload / tab close when there are unsaved edits
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
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
    () => ({ ...ui, format: previewFormat }),
    [ui, previewFormat],
  )

  const setDisplayUnit = useCallback((v: DisplayUnit) => dispatch({ type: "SET", key: "displayUnit", value: v }), [dispatch])
  const setExportPaperSize = useCallback((v: string) => dispatch({ type: "SET", key: "exportPaperSize", value: v }), [dispatch])
  const setExportPrintPro = useCallback((v: boolean) => dispatch({ type: "SET", key: "exportPrintPro", value: v }), [dispatch])
  const setExportBleedMm = useCallback((v: number) => dispatch({ type: "SET", key: "exportBleedMm", value: v }), [dispatch])
  const setExportRegistrationMarks = useCallback((v: boolean) => dispatch({ type: "SET", key: "exportRegistrationMarks", value: v }), [dispatch])
  const setExportFinalSafeGuides = useCallback((v: boolean) => dispatch({ type: "SET", key: "exportFinalSafeGuides", value: v }), [dispatch])

  const exportActionsContext = useMemo(
    () => ({
      result,
      previewLayout,
      baseFont,
      orientation,
      rotation,
      showBaselines,
      showModules,
      showMargins,
      showImagePlaceholders,
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
      baseFont,
      orientation,
      rotation,
      showBaselines,
      showModules,
      showMargins,
      showImagePlaceholders,
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
        case "toggle_baselines":
          dispatch({ type: "TOGGLE", key: "showBaselines" })
          return
        case "toggle_margins":
          dispatch({ type: "TOGGLE", key: "showMargins" })
          return
        case "toggle_modules":
          dispatch({ type: "TOGGLE", key: "showModules" })
          return
        case "toggle_typography":
          dispatch({ type: "TOGGLE", key: "showTypography" })
          return
        case "toggle_settings_panel":
          setActiveSidebarPanel((prev) => (prev === "settings" ? null : "settings"))
          return
        case "toggle_help_panel":
          toggleHelpPanelFromHeader()
          return
        case "toggle_imprint_panel":
          setActiveSidebarPanel((prev) => (prev === "imprint" ? null : "imprint"))
          return
        case "toggle_example_panel":
          setShowPresetsBrowser(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [dispatch, exportActions, history.canRedo, history.canUndo, redoAny, toggleHelpPanelFromHeader, undoAny])

  // ─── Load JSON layout ─────────────────────────────────────────────────────

  const loadLayout = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const loaded = parsed?.uiSettings
        if (!loaded || typeof loaded !== "object") {
          throw new Error("Invalid layout JSON: missing uiSettings.")
        }

        const actions = buildUiActionsFromLoadedSettings(loaded, collapsed)
        if (actions.length > 0) dispatch({ type: "BATCH", actions })

        if (parsed?.previewLayout) {
          const nextKey = Date.now()
          const layout = parsed.previewLayout as PreviewLayoutState
          setPreviewLayout(layout)
          setLoadedPreviewLayout({ key: nextKey, layout })
        } else {
          setPreviewLayout(null)
          setLoadedPreviewLayout(null)
        }
        setShowPresetsBrowser(false)
        isDirtyRef.current = false
      } catch (error) {
        console.error(error)
        window.alert("Could not load layout JSON.")
      } finally {
        event.target.value = ""
      }
    }
    reader.readAsText(file)
  }, [collapsed, dispatch])

  // ─── Render ───────────────────────────────────────────────────────────────

  const uiTheme = useMemo(() =>
    (isDarkUi
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
        }),
  [isDarkUi])

  const handleConfirmSaveJSON = useCallback(() => {
    exportActions.confirmSaveJSON()
    isDirtyRef.current = false
  }, [exportActions])

  const { fileGroup, displayGroup, sidebarGroup } = useHeaderActions({
    activeSidebarPanel,
    showPresetsBrowser,
    isDarkUi,
    showBaselines,
    showMargins,
    showModules,
    showImagePlaceholders,
    showTypography,
    showRolloverInfo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    onOpenPresets: () => setShowPresetsBrowser(true),
    onLoadJson: () => loadFileInputRef.current?.click(),
    onSaveJson: exportActions.openSaveDialog,
    onExportPdf: exportActions.openExportDialog,
    onUndo: undoAny,
    onRedo: redoAny,
    onToggleDarkMode: () => setIsDarkUi((prev) => !prev),
    onToggleBaselines: () => dispatch({ type: "TOGGLE", key: "showBaselines" }),
    onToggleMargins: () => dispatch({ type: "TOGGLE", key: "showMargins" }),
    onToggleModules: () => dispatch({ type: "TOGGLE", key: "showModules" }),
    onToggleImagePlaceholders: () => dispatch({ type: "TOGGLE", key: "showImagePlaceholders" }),
    onToggleTypography: () => dispatch({ type: "TOGGLE", key: "showTypography" }),
    onToggleRolloverInfo: () => setShowRolloverInfo((prev) => !prev),
    onToggleSettingsPanel: () => setActiveSidebarPanel((prev) => (prev === "settings" ? null : "settings")),
    onToggleHelpPanel: toggleHelpPanelFromHeader,
  })

  const renderHeaderAction = useCallback((action: HeaderAction) => {
    const shortcut = action.shortcutId
      ? PREVIEW_HEADER_SHORTCUTS.find((item) => item.id === action.shortcutId)?.combo
      : null
    const tooltip = shortcut ? `${action.tooltip}\n${shortcut}` : action.tooltip
    const isHelpButton = action.key === "help"
    return (
      <div
        key={action.key}
        className="inline-flex w-8 items-center justify-center"
        onMouseEnter={showSectionHelpIcons ? () => handleHeaderHelpNavigate(action.key) : undefined}
      >
        <HeaderIconButton
          ariaLabel={action.ariaLabel}
          tooltip={tooltip}
          variant={action.variant ?? "outline"}
          aria-pressed={action.pressed}
          disabled={action.disabled}
          onClick={action.onClick}
          buttonClassName={showSectionHelpIcons ? isHelpButton ? "bg-blue-500 text-white hover:bg-blue-600 border-blue-500" : "ring-1 ring-blue-500" : undefined}
        >
          {action.icon}
        </HeaderIconButton>
      </div>
    )
  }, [handleHeaderHelpNavigate, showSectionHelpIcons])

  const handleCloseSidebar = useCallback(() => {
    setActiveSidebarPanel(null)
  }, [])

  const handleLoadPresetLayout = useCallback((preset: LayoutPreset) => {
    const actions = buildUiActionsFromLoadedSettings(preset.uiSettings, collapsed)
    if (actions.length > 0) dispatch({ type: "BATCH", actions })

    if (preset.previewLayout) {
      const nextKey = Date.now()
      const layout = preset.previewLayout as PreviewLayoutState
      setPreviewLayout(layout)
      setLoadedPreviewLayout({ key: nextKey, layout })
    } else {
      setPreviewLayout(null)
      setLoadedPreviewLayout(null)
    }

    setShowPresetsBrowser(false)
  }, [collapsed, dispatch])

  const settingsPanels = useMemo(() => (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
      <h2 className={`text-sm font-semibold tracking-wide ${uiTheme.headingText}`}>
        Grid Generator Settings
      </h2>
      <SettingsHelpNavigationProvider
        value={{ showHelpIcons: showSectionHelpIcons, onNavigate: handleSectionHelpNavigate }}
      >
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

        <ColorShemaPanel
          collapsed={collapsed.color}
          onHeaderClick={handleSectionHeaderClick("color")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          colorShema={imageColorScheme}
          onColorShemaChange={setImageColorScheme}
          isDarkMode={isDarkUi}
        />
      </SettingsHelpNavigationProvider>
    </div>
  ), [
    availableBaselineOptions,
    baseFont,
    baselineMultiple,
    canvasRatio,
    collapsed,
    customBaseline,
    customMarginMultipliers,
    gridCols,
    gridRows,
    gridUnit,
    gutterMultiple,
    handleSectionHeaderDoubleClick,
    handleSectionHeaderClick,
    handleSectionHelpNavigate,
    imageColorScheme,
    isDarkUi,
    marginMethod,
    orientation,
    result.grid.margins,
    rotation,
    setBaseFont,
    setBaselineMultiple,
    setCanvasRatio,
    setCustomBaseline,
    setCustomMarginMultipliers,
    setGutterMultiple,
    setGridCols,
    setGridRows,
    setImageColorScheme,
    setMarginMethod,
    setOrientation,
    setRotation,
    setTypographyScale,
    setUseCustomMargins,
    showSectionHelpIcons,
    typographyScale,
    uiTheme.headingText,
    useCustomMargins,
  ])

  const previewWorkspace = useMemo(() => (
    <div
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
          <div className="flex flex-wrap items-start gap-2 landscape:flex-nowrap">
            {fileGroup.map((item) =>
              item.type === "divider"
                ? <div key={item.key} className={`h-6 w-px ${uiTheme.divider}`} aria-hidden="true" />
                : renderHeaderAction(item.action),
            )}
          </div>

          <div className="flex flex-wrap items-start gap-2 landscape:flex-nowrap">
            {displayGroup.map((item) =>
              item.type === "divider"
                ? <div key={item.key} className={`h-6 w-px ${uiTheme.divider}`} aria-hidden="true" />
                : renderHeaderAction(item.action),
            )}
          </div>

          <div className="flex flex-wrap items-start gap-2 landscape:flex-nowrap">
            {sidebarGroup.map((action) => renderHeaderAction(action))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-row overflow-hidden">
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {showPresetsBrowser ? (
            <div className={`h-full min-h-[360px] rounded-md border p-4 ${isDarkUi ? "border-gray-700 bg-gray-900/40" : "border-gray-200 bg-gray-100/60"}`}>
              <div className="w-40">
                <PresetLayoutsPanel
                  isDarkMode={isDarkUi}
                  onLoadPreset={handleLoadPresetLayout}
                  compact
                />
              </div>
            </div>
          ) : (
            <GridPreview
              result={result}
              showBaselines={showBaselines}
              showModules={showModules}
              showMargins={showMargins}
              showImagePlaceholders={showImagePlaceholders}
              showTypography={showTypography}
              showRolloverInfo={showRolloverInfo}
              baseFont={baseFont}
              imageColorScheme={imageColorScheme}
              onImageColorSchemeChange={setImageColorScheme}
              initialLayout={loadedPreviewLayout?.layout ?? null}
              initialLayoutKey={loadedPreviewLayout?.key ?? 0}
              rotation={rotation}
              undoNonce={history.undoNonce}
              redoNonce={history.redoNonce}
              onOpenHelpSection={handlePreviewOpenHelpSection}
              showEditorHelpIcon={showSectionHelpIcons}
              onHistoryAvailabilityChange={handlePreviewHistoryAvailabilityChange}
              onRequestGridRestore={handlePreviewGridRestore}
              isDarkMode={isDarkUi}
              onLayoutChange={setPreviewLayout}
            />
          )}
        </div>
        {activeSidebarPanel && (
          <div
            data-help-scroll-root="true"
            className={`w-[280px] shrink-0 border-l overflow-y-auto text-sm ${uiTheme.sidebar} ${
              activeSidebarPanel === "help"
                ? "px-4 pb-4 pt-0 md:px-6 md:pb-6 md:pt-0"
                : "p-4 md:p-6"
            }`}
          >
            {activeSidebarPanel === "settings" && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${uiTheme.sidebarHeading}`}>Settings</h3>
                  <button
                    type="button"
                    aria-label="Close settings panel"
                    onClick={handleCloseSidebar}
                    className={`rounded-sm p-1 transition-colors ${isDarkUi ? "text-gray-300 hover:bg-gray-700 hover:text-gray-100" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className={`space-y-2 text-xs ${uiTheme.sidebarBody}`}>
                  <p>This is a placeholder settings page.</p>
                  <p>
                    Future settings can be added here (profile, defaults, shortcuts, language,
                    etc.).
                  </p>
                </div>
              </div>
            )}
            {activeSidebarPanel === "help" && (
              <HelpPanel
                isDarkMode={isDarkUi}
                onClose={handleCloseSidebar}
                activeSectionId={activeHelpSectionId}
              />
            )}
            {activeSidebarPanel === "imprint" && (
              <ImprintPanel
                isDarkMode={isDarkUi}
                onClose={handleCloseSidebar}
              />
            )}
          </div>
        )}
      </div>
    </div>
  ), [
    activeHelpSectionId,
    activeSidebarPanel,
    baseFont,
    displayGroup,
    fileGroup,
    handleCloseSidebar,
    handleLoadPresetLayout,
    handlePreviewGridRestore,
    handlePreviewHistoryAvailabilityChange,
    handlePreviewOpenHelpSection,
    history.redoNonce,
    history.undoNonce,
    imageColorScheme,
    isDarkUi,
    loadLayout,
    loadedPreviewLayout,
    showPresetsBrowser,
    renderHeaderAction,
    result,
    rotation,
    setImageColorScheme,
    showBaselines,
    showMargins,
    showImagePlaceholders,
    showModules,
    showSectionHelpIcons,
    showTypography,
    showRolloverInfo,
    sidebarGroup,
    uiTheme.divider,
    uiTheme.previewHeader,
    uiTheme.previewShell,
    uiTheme.sidebar,
    uiTheme.sidebarBody,
    uiTheme.sidebarHeading,
  ])

  return (
    <div className={`flex h-screen flex-col md:flex-row ${uiTheme.root}`}>
      {/* Left Panel - Controls */}
      <div className={`w-full md:w-[280px] flex max-h-[50vh] flex-col border-r border-b md:max-h-full md:border-b-0 ${uiTheme.leftPanel}`}>
        {/* Header - always visible */}
        <div className={`shrink-0 space-y-2 border-b p-4 md:px-6 md:pt-6 ${uiTheme.subtleBorder}`}>
          <h1 className="text-2xl font-bold tracking-tight">Swiss Grid Generator</h1>
          <p className={`text-sm ${uiTheme.bodyText}`}>
            Based on Müller-Brockmann&apos;s <em><a href="https://amzn.to/40kfiUL">Grid Systems in Graphic Design</a></em> (1981).
            Copyleft &amp; -right 2026 by{" "}
            <a href="https://lp45.net" className={uiTheme.link}>lp45.net</a>.
          </p>
        </div>

        {settingsPanels}

        <div className={`shrink-0 border-t px-4 py-3 text-xs md:px-6 ${uiTheme.subtleBorder} ${uiTheme.bodyText}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              {SHOW_BETA_BADGE ? (
                <span className="inline-flex items-center rounded bg-red-600 px-2 py-0.5 font-medium text-white">Beta</span>
              ) : null}
              <span>Version {APP_VERSION}</span>
            </span>
            <div className="flex items-center gap-3">
              <a
                href="/survey"
                target="_blank"
                rel="noopener noreferrer"
                className={uiTheme.link}
              >
                Survey
              </a>
              <button
                type="button"
                className={uiTheme.link}
                onClick={() => setActiveSidebarPanel((prev) => (prev === "imprint" ? null : "imprint"))}
              >
                Imprint
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewWorkspace}

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
        onConfirm={handleConfirmSaveJSON}
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
