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
import { ColorSchemePanel } from "@/components/settings/ColorSchemePanel"
import { SettingsHelpNavigationProvider } from "@/components/settings/help-navigation-context"
import { HelpPanel } from "@/components/sidebar/HelpPanel"
import { LayersPanel } from "@/components/sidebar/LayersPanel"
import {
  HELP_SECTION_BY_HEADER_ACTION,
  HELP_SECTION_BY_SETTINGS_SECTION,
} from "@/lib/help-registry"
import { ImprintPanel } from "@/components/sidebar/ImprintPanel"
import { PresetLayoutsPanel } from "@/components/sidebar/PresetLayoutsPanel"
import { ExportPdfDialog } from "@/components/dialogs/ExportPdfDialog"
import { NoticeDialog } from "@/components/dialogs/NoticeDialog"
import { SaveJsonDialog } from "@/components/dialogs/SaveJsonDialog"
import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"
import { PREVIEW_INTERACTION_HINT_SINGLE_LINE } from "@/lib/preview-interaction-hints"
import { clampRotation } from "@/lib/block-constraints"
import { useDocumentController } from "@/hooks/useDocumentController"
import { usePreviewCommands } from "@/hooks/usePreviewCommands"
import { useShellKeyboardShortcuts } from "@/hooks/useShellKeyboardShortcuts"
import { useSidebarPanels } from "@/hooks/useSidebarPanels"
import { getPreviewLayoutSeed, type LoadedDocument } from "@/lib/document-session"
import { removeLayerFromPreviewLayout } from "@/lib/preview-layer-state"
import {
  isFontFamily,
  type FontFamily,
} from "@/lib/config/fonts"
import {
  BASELINE_OPTIONS,
  defaultGridRhythmAxisSettings,
  isGridRhythm,
  isGridRhythmColsDirection,
  isGridRhythmRowsDirection,
  isDisplayUnit,
  isTypographyScale,
  resolveLegacyGridRhythmAxisSettings,
  type DisplayUnit,
  type GridRhythm,
  type GridRhythmColsDirection,
  type GridRhythmRowsDirection,
  type TypographyScale
} from "@/lib/config/defaults"
import {
  getImageSchemeColorToken,
  isImageColorInScheme,
  isImageSchemeColorToken,
  normalizeImageColorSchemeId,
  resolveImageSchemeColor,
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
const LAYER_SELECTION_GRACE_MS = 300
const DEFAULT_A4_BASELINE = FORMAT_BASELINES["A4"] ?? 12
const RESOLVED_DEFAULTS = resolveUiDefaults(DEFAULT_UI, DEFAULT_A4_BASELINE)
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"
const RELEASE_CHANNEL = (process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? "prod").toLowerCase()
const SHOW_BETA_BADGE = RELEASE_CHANNEL === "beta"
const GLOBAL_HISTORY_LIMIT = 150
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>
const DEFAULT_PAGE_PREVIEW_LAYOUT = DEFAULT_PREVIEW_LAYOUT as PreviewLayoutState | null
type HistoryDomain = "settings" | "preview"
type NoticeState = {
  title: string
  message: string
} | null

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
  | "rhythm"
  | "rhythmRowsEnabled"
  | "rhythmRowsDirection"
  | "rhythmColsEnabled"
  | "rhythmColsDirection"
  | "typographyScale"
  | "baseFont"
  | "imageColorScheme"
  | "canvasBackground"
  | "customBaseline"
  | "useCustomMargins"
  | "customMarginMultipliers"
  | "showBaselines"
  | "showModules"
  | "showMargins"
  | "showImagePlaceholders"
  | "showTypography"
  | "showLayers"
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
  gutterMultiple: Math.max(1, DEFAULT_UI.gutterMultiple),
  rhythm: RESOLVED_DEFAULTS.rhythm,
  rhythmRowsEnabled: RESOLVED_DEFAULTS.rhythmRowsEnabled,
  rhythmRowsDirection: RESOLVED_DEFAULTS.rhythmRowsDirection,
  rhythmColsEnabled: RESOLVED_DEFAULTS.rhythmColsEnabled,
  rhythmColsDirection: RESOLVED_DEFAULTS.rhythmColsDirection,
  typographyScale: RESOLVED_DEFAULTS.typographyScale,
  baseFont: RESOLVED_DEFAULTS.baseFont,
  imageColorScheme: RESOLVED_DEFAULTS.imageColorScheme,
  canvasBackground: RESOLVED_DEFAULTS.canvasBackground,
  customBaseline: RESOLVED_DEFAULTS.customBaseline,
  useCustomMargins: DEFAULT_UI.useCustomMargins,
  customMarginMultipliers: DEFAULT_UI.customMarginMultipliers,
  showBaselines: DEFAULT_UI.showBaselines,
  showModules: DEFAULT_UI.showModules,
  showMargins: DEFAULT_UI.showMargins,
  showImagePlaceholders: typeof DEFAULT_UI.showImagePlaceholders === "boolean" ? DEFAULT_UI.showImagePlaceholders : true,
  showTypography: DEFAULT_UI.showTypography,
  showLayers: typeof (DEFAULT_UI as { showLayers?: unknown }).showLayers === "boolean"
    ? (DEFAULT_UI as { showLayers?: boolean }).showLayers ?? false
    : false,
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
  | { type: "SET"; key: "rhythm"; value: GridRhythm }
  | { type: "SET"; key: "rhythmRowsEnabled"; value: boolean }
  | { type: "SET"; key: "rhythmRowsDirection"; value: GridRhythmRowsDirection }
  | { type: "SET"; key: "rhythmColsEnabled"; value: boolean }
  | { type: "SET"; key: "rhythmColsDirection"; value: GridRhythmColsDirection }
  | { type: "SET"; key: "typographyScale"; value: TypographyScale }
  | { type: "SET"; key: "baseFont"; value: FontFamily }
  | { type: "SET"; key: "imageColorScheme"; value: ImageColorSchemeId }
  | { type: "SET"; key: "canvasBackground"; value: string | null }
  | { type: "SET"; key: "customBaseline"; value: number }
  | { type: "SET"; key: "displayUnit"; value: DisplayUnit }
  | { type: "SET"; key: "useCustomMargins"; value: boolean }
  | { type: "SET"; key: "customMarginMultipliers"; value: { top: number; left: number; right: number; bottom: number } }
  | { type: "SET"; key: "showBaselines"; value: boolean }
  | { type: "SET"; key: "showModules"; value: boolean }
  | { type: "SET"; key: "showMargins"; value: boolean }
  | { type: "SET"; key: "showImagePlaceholders"; value: boolean }
  | { type: "SET"; key: "showTypography"; value: boolean }
  | { type: "SET"; key: "showLayers"; value: boolean }
  | { type: "SET"; key: "collapsed"; value: Record<SectionKey, boolean> }
  | { type: "TOGGLE"; key: "showBaselines" | "showModules" | "showMargins" | "showImagePlaceholders" | "showTypography" | "showLayers" }
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
        case "marginMethod":
        case "gridCols":
        case "gridRows":
        case "typographyScale":
        case "rhythm":
        case "rhythmRowsEnabled":
        case "rhythmRowsDirection":
        case "rhythmColsEnabled":
        case "rhythmColsDirection":
        case "baseFont":
        case "imageColorScheme":
        case "canvasBackground":
        case "customBaseline":
        case "useCustomMargins":
        case "customMarginMultipliers":
        case "showBaselines":
        case "showModules":
        case "showMargins":
        case "showImagePlaceholders":
        case "showTypography":
        case "showLayers":
        case "collapsed":
          if (state[action.key] === action.value) return state
          return { ...state, [action.key]: action.value }
        case "rotation": {
          const nextRotation = clampRotation(action.value)
          if (state.rotation === nextRotation) return state
          return { ...state, rotation: nextRotation }
        }
        case "baselineMultiple": {
          const nextBaselineMultiple = Math.max(1, action.value)
          if (state.baselineMultiple === nextBaselineMultiple) return state
          return { ...state, baselineMultiple: nextBaselineMultiple }
        }
        case "gutterMultiple": {
          const nextGutterMultiple = Math.max(1, action.value)
          if (state.gutterMultiple === nextGutterMultiple) return state
          return { ...state, gutterMultiple: nextGutterMultiple }
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
        gutterMultiple: Math.max(1, action.snapshot.gutterMultiple),
        rhythm: action.snapshot.rhythm,
        rhythmRowsEnabled: action.snapshot.rhythmRowsEnabled,
        rhythmRowsDirection: action.snapshot.rhythmRowsDirection,
        rhythmColsEnabled: action.snapshot.rhythmColsEnabled,
        rhythmColsDirection: action.snapshot.rhythmColsDirection,
        typographyScale: action.snapshot.typographyScale,
        baseFont: action.snapshot.baseFont,
        imageColorScheme: action.snapshot.imageColorScheme,
        canvasBackground: action.snapshot.canvasBackground,
        customBaseline: action.snapshot.customBaseline,
        useCustomMargins: action.snapshot.useCustomMargins,
        customMarginMultipliers: action.snapshot.customMarginMultipliers,
        showBaselines: action.snapshot.showBaselines,
        showModules: action.snapshot.showModules,
        showMargins: action.snapshot.showMargins,
        showImagePlaceholders: action.snapshot.showImagePlaceholders,
        showTypography: action.snapshot.showTypography,
        showLayers: action.snapshot.showLayers,
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
  if (typeof loaded.rotation === "number") set("rotation", clampRotation(loaded.rotation))
  if (loaded.marginMethod === 1 || loaded.marginMethod === 2 || loaded.marginMethod === 3) {
    set("marginMethod", loaded.marginMethod)
  }
  if (typeof loaded.gridCols === "number") set("gridCols", loaded.gridCols)
  if (typeof loaded.gridRows === "number") set("gridRows", loaded.gridRows)
  if (typeof loaded.baselineMultiple === "number") set("baselineMultiple", loaded.baselineMultiple)
  if (typeof loaded.gutterMultiple === "number") set("gutterMultiple", loaded.gutterMultiple)
  if (isGridRhythm(loaded.rhythm)) set("rhythm", loaded.rhythm)
  else set("rhythm", "repetitive")
  const defaultRhythmAxis = defaultGridRhythmAxisSettings()
  const legacyRhythmAxis = resolveLegacyGridRhythmAxisSettings(loaded.rhythmRotation, loaded.rhythmRotate90)
  set(
    "rhythmRowsEnabled",
    typeof loaded.rhythmRowsEnabled === "boolean"
      ? loaded.rhythmRowsEnabled
      : legacyRhythmAxis.rhythmRowsEnabled ?? defaultRhythmAxis.rhythmRowsEnabled,
  )
  set(
    "rhythmRowsDirection",
    isGridRhythmRowsDirection(loaded.rhythmRowsDirection)
      ? loaded.rhythmRowsDirection
      : legacyRhythmAxis.rhythmRowsDirection ?? defaultRhythmAxis.rhythmRowsDirection,
  )
  set(
    "rhythmColsEnabled",
    typeof loaded.rhythmColsEnabled === "boolean"
      ? loaded.rhythmColsEnabled
      : legacyRhythmAxis.rhythmColsEnabled ?? defaultRhythmAxis.rhythmColsEnabled,
  )
  set(
    "rhythmColsDirection",
    isGridRhythmColsDirection(loaded.rhythmColsDirection)
      ? loaded.rhythmColsDirection
      : legacyRhythmAxis.rhythmColsDirection ?? defaultRhythmAxis.rhythmColsDirection,
  )
  if (isTypographyScale(loaded.typographyScale)) set("typographyScale", loaded.typographyScale)
  if (isFontFamily(loaded.baseFont)) set("baseFont", loaded.baseFont)
  const loadedImageColorScheme = normalizeImageColorSchemeId(loaded.imageColorScheme)
  if (loadedImageColorScheme) set("imageColorScheme", loadedImageColorScheme)
  const backgroundScheme = loadedImageColorScheme ?? RESOLVED_DEFAULTS.imageColorScheme
  if (loaded.canvasBackground === null) {
    set("canvasBackground", getImageSchemeColorToken(0))
  } else if (isImageSchemeColorToken(loaded.canvasBackground) || isImageColorInScheme(loaded.canvasBackground, backgroundScheme)) {
    set("canvasBackground", loaded.canvasBackground)
  } else {
    set("canvasBackground", getImageSchemeColorToken(0))
  }
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
  if (typeof loaded.showLayers === "boolean") set("showLayers", loaded.showLayers)

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
    DEFAULT_PAGE_PREVIEW_LAYOUT,
  )
  const {
    loadedLayoutState: loadedPreviewLayout,
    layerOrderRequest: requestedLayerOrderState,
    layerDeleteRequest: requestedLayerDeleteState,
    layerEditorRequest: requestedLayerEditorState,
    requestLayerOrder,
    requestLayerDelete,
    requestLayerEditor,
    loadLayout: loadPreviewLayout,
    clearLayerRequests,
  } = usePreviewCommands<PreviewLayoutState>({
    defaultLayout: DEFAULT_PAGE_PREVIEW_LAYOUT,
  })
  const [noticeState, setNoticeState] = useState<NoticeState>(null)
  const [selectedLayerKey, setSelectedLayerKey] = useState<string | null>(null)
  const selectedLayerGraceRef = useRef<{ key: string | null; until: number }>({ key: null, until: 0 })
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
  const handleRequestNotice = useCallback((notice: NonNullable<NoticeState>) => {
    setNoticeState(notice)
  }, [])
  const {
    canvasRatio, exportPaperSize, exportPrintPro, exportBleedMm,
    exportRegistrationMarks, exportFinalSafeGuides, orientation, rotation,
    marginMethod, gridCols, gridRows, baselineMultiple, gutterMultiple, rhythm,
    rhythmRowsEnabled, rhythmRowsDirection, rhythmColsEnabled, rhythmColsDirection,
    typographyScale, baseFont, imageColorScheme, canvasBackground, customBaseline, displayUnit,
    useCustomMargins, customMarginMultipliers, showBaselines, showModules,
    showMargins, showImagePlaceholders, showTypography, showLayers, collapsed,
  } = ui
  // Stable dispatch wrappers for child component props
  const setCanvasRatio = useCallback((v: CanvasRatioKey) => dispatch({ type: "SET", key: "canvasRatio", value: v }), [dispatch])
  const setOrientation = useCallback((v: "portrait" | "landscape") => dispatch({ type: "SET", key: "orientation", value: v }), [dispatch])
  const setRotation = useCallback((v: number) => dispatch({ type: "SET", key: "rotation", value: clampRotation(v) }), [dispatch])
  const setMarginMethod = useCallback((v: 1 | 2 | 3) => dispatch({ type: "SET", key: "marginMethod", value: v }), [dispatch])
  const setGridCols = useCallback((v: number) => dispatch({ type: "SET", key: "gridCols", value: v }), [dispatch])
  const setGridRows = useCallback((v: number) => dispatch({ type: "SET", key: "gridRows", value: v }), [dispatch])
  const setBaselineMultiple = useCallback((v: number) => dispatch({ type: "SET", key: "baselineMultiple", value: v }), [dispatch])
  const setGutterMultiple = useCallback((v: number) => dispatch({ type: "SET", key: "gutterMultiple", value: v }), [dispatch])
  const setRhythm = useCallback((v: GridRhythm) => dispatch({ type: "SET", key: "rhythm", value: v }), [dispatch])
  const setRhythmRowsEnabled = useCallback((v: boolean) => dispatch({ type: "SET", key: "rhythmRowsEnabled", value: v }), [dispatch])
  const setRhythmRowsDirection = useCallback((v: GridRhythmRowsDirection) => dispatch({ type: "SET", key: "rhythmRowsDirection", value: v }), [dispatch])
  const setRhythmColsEnabled = useCallback((v: boolean) => dispatch({ type: "SET", key: "rhythmColsEnabled", value: v }), [dispatch])
  const setRhythmColsDirection = useCallback((v: GridRhythmColsDirection) => dispatch({ type: "SET", key: "rhythmColsDirection", value: v }), [dispatch])
  const setTypographyScale = useCallback((v: TypographyScale) => dispatch({ type: "SET", key: "typographyScale", value: v }), [dispatch])
  const setBaseFont = useCallback((v: FontFamily) => dispatch({ type: "SET", key: "baseFont", value: v }), [dispatch])
  const setImageColorScheme = useCallback((v: ImageColorSchemeId) => {
    const actions: UiAction[] = [{ type: "SET", key: "imageColorScheme", value: v }]
    if (canvasBackground && !isImageSchemeColorToken(canvasBackground) && !isImageColorInScheme(canvasBackground, v)) {
      actions.push({ type: "SET", key: "canvasBackground", value: getImageSchemeColorToken(0) })
    }
    dispatch(actions.length === 1 ? actions[0] : { type: "BATCH", actions })
  }, [canvasBackground, dispatch])
  const setCanvasBackground = useCallback((value: string | null) => {
    dispatch({ type: "SET", key: "canvasBackground", value })
  }, [dispatch])
  const resetParagraphColorsToScheme = useCallback(() => {
    setParagraphColorResetNonce((nonce) => nonce + 1)
  }, [])
  const setCustomBaseline = useCallback((v: number) => dispatch({ type: "SET", key: "customBaseline", value: v }), [dispatch])
  const setUseCustomMargins = useCallback((v: boolean) => dispatch({ type: "SET", key: "useCustomMargins", value: v }), [dispatch])
  const setCustomMarginMultipliers = useCallback((v: { top: number; left: number; right: number; bottom: number }) => dispatch({ type: "SET", key: "customMarginMultipliers", value: v }), [dispatch])

  const [canUndoPreview, setCanUndoPreview] = useState(false)
  const [previewUndoNonce, setPreviewUndoNonce] = useState(0)
  const [previewRedoNonce, setPreviewRedoNonce] = useState(0)
  const [undoDomains, setUndoDomains] = useState<HistoryDomain[]>([])
  const [redoDomains, setRedoDomains] = useState<HistoryDomain[]>([])
  const [isDarkUi, setIsDarkUi] = useState(false)
  const [showRolloverInfo, setShowRolloverInfo] = useState(true)
  const [isSmartphone, setIsSmartphone] = useState(false)
  const [documentHistoryResetNonce, setDocumentHistoryResetNonce] = useState(0)
  const [paragraphColorResetNonce, setParagraphColorResetNonce] = useState(0)
  const undoDomainsRef = useRef<HistoryDomain[]>([])
  const redoDomainsRef = useRef<HistoryDomain[]>([])

  useEffect(() => {
    undoDomainsRef.current = undoDomains
  }, [undoDomains])

  useEffect(() => {
    redoDomainsRef.current = redoDomains
  }, [redoDomains])

  const {
    activeSidebarPanel,
    activeHelpSectionId,
    showPresetsBrowser,
    showSectionHelpIcons,
    setActiveHelpSectionId,
    setShowPresetsBrowser,
    openSidebarPanel,
    closeSidebarPanel,
    openHelpSection,
    toggleHelpPanel,
    toggleLayersPanel,
  } = useSidebarPanels({
    showLayers,
    onShowLayersChange: (next) => dispatch({ type: "SET", key: "showLayers", value: next }),
  })

  useEffect(() => {
    if (!selectedLayerKey || !previewLayout) return
    const validKeys = new Set<string>([
      ...previewLayout.blockOrder,
      ...(previewLayout.imageOrder ?? []),
    ])
    if (!validKeys.has(selectedLayerKey)) {
      const grace = selectedLayerGraceRef.current
      if (grace.key === selectedLayerKey && grace.until > Date.now()) {
        return
      }
      setSelectedLayerKey(null)
    }
  }, [previewLayout, selectedLayerKey])

  const setSelectedLayerKeyWithGrace = useCallback((key: string | null) => {
    if (key) {
      selectedLayerGraceRef.current = {
        key,
        until: Date.now() + LAYER_SELECTION_GRACE_MS,
      }
    } else {
      selectedLayerGraceRef.current = { key: null, until: 0 }
    }
    setSelectedLayerKey(key)
  }, [])

  const recordHistoryDomain = useCallback((domain: HistoryDomain) => {
    setUndoDomains((prev) => {
      const next = [...prev, domain]
      return next.length > GLOBAL_HISTORY_LIMIT ? next.slice(next.length - GLOBAL_HISTORY_LIMIT) : next
    })
    setRedoDomains([])
  }, [])

  const resetHistoryDomains = useCallback(() => {
    setUndoDomains([])
    setRedoDomains([])
  }, [])

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
      rhythm,
      rhythmRowsEnabled,
      rhythmRowsDirection,
      rhythmColsEnabled,
      rhythmColsDirection,
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
    rhythm,
    rhythmRowsEnabled,
    rhythmRowsDirection,
    rhythmColsEnabled,
    rhythmColsDirection,
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

  const history = useSettingsHistory(buildUiSnapshot, {
    onRecordHistory: () => recordHistoryDomain("settings"),
  })
  const { suppressNext, setCurrentSnapshot, reset: resetSettingsHistory } = history

  const applyUiSnapshot = useCallback(
    (snapshot: UiSettingsSnapshot) => {
      suppressNext()
      dispatch({ type: "APPLY_SNAPSHOT", snapshot })
      setCurrentSnapshot(snapshot)
    },
    [dispatch, suppressNext, setCurrentSnapshot],
  )

  const canUndo = undoDomains.length > 0
  const canRedo = redoDomains.length > 0

  const undoAny = useCallback(() => {
    const domain = undoDomainsRef.current[undoDomainsRef.current.length - 1]
    if (!domain) return

    if (domain === "settings") history.undo(applyUiSnapshot)
    else setPreviewUndoNonce((nonce) => nonce + 1)

    setUndoDomains((prev) => prev.slice(0, -1))
    setRedoDomains((prev) => {
      const next = [...prev, domain]
      return next.length > GLOBAL_HISTORY_LIMIT ? next.slice(next.length - GLOBAL_HISTORY_LIMIT) : next
    })
  }, [applyUiSnapshot, history])

  const redoAny = useCallback(() => {
    const domain = redoDomainsRef.current[redoDomainsRef.current.length - 1]
    if (!domain) return

    if (domain === "settings") history.redo(applyUiSnapshot)
    else setPreviewRedoNonce((nonce) => nonce + 1)

    setRedoDomains((prev) => prev.slice(0, -1))
    setUndoDomains((prev) => {
      const next = [...prev, domain]
      return next.length > GLOBAL_HISTORY_LIMIT ? next.slice(next.length - GLOBAL_HISTORY_LIMIT) : next
    })
  }, [applyUiSnapshot, history])

  const handlePreviewHistoryAvailabilityChange = useCallback((undoAvailable: boolean) => {
    setCanUndoPreview(undoAvailable)
  }, [])

  const handlePreviewHistoryRecord = useCallback(() => {
    recordHistoryDomain("preview")
  }, [recordHistoryDomain])

  const applyLoadedUiActions = useCallback((actions: UiAction[]) => {
    const nextGridUi = actions.reduce(gridUiReducer, gridUi)
    const nextExportUi = actions.reduce(exportUiReducer, exportUi)
    const nextSnapshot = { ...nextGridUi, ...nextExportUi } as UiSettingsSnapshot
    resetSettingsHistory(nextSnapshot)
    resetHistoryDomains()
    if (actions.length > 0) {
      suppressNext()
      dispatch({ type: "BATCH", actions })
    }
  }, [dispatch, exportUi, gridUi, resetHistoryDomains, resetSettingsHistory, suppressNext])

  const handleApplyLoadedDocument = useCallback((document: LoadedDocument<PreviewLayoutState>) => {
    const actions = buildUiActionsFromLoadedSettings(document.uiSettings, collapsed)
    applyLoadedUiActions(actions)
    setPreviewLayout(document.previewLayout)
    loadPreviewLayout(document.previewLayout)
    clearLayerRequests()
    setSelectedLayerKey(null)
    setDocumentHistoryResetNonce((nonce) => nonce + 1)
    setCanUndoPreview(false)
    setShowPresetsBrowser(false)
    isDirtyRef.current = false
  }, [applyLoadedUiActions, clearLayerRequests, collapsed, loadPreviewLayout, setShowPresetsBrowser])

  const {
    documentMetadata,
    setDocumentMetadata,
    loadDocumentFromInput: loadLayout,
    loadPresetDocument: handleLoadPresetLayout,
  } = useDocumentController<PreviewLayoutState>({
    onApplyDocument: handleApplyLoadedDocument,
    onLoadFailed: () => {
      handleRequestNotice({
        title: "Load Failed",
        message: "Could not load layout JSON.",
      })
    },
  })

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
  }, [setActiveHelpSectionId])
  const handleHeaderHelpNavigate = useCallback((actionKey: string) => {
    const targetSectionId = HELP_SECTION_BY_HEADER_ACTION[actionKey]
    if (!targetSectionId) return
    setActiveHelpSectionId(targetSectionId)
  }, [setActiveHelpSectionId])

  const handleLayerOrderChange = useCallback((nextLayerOrder: string[]) => {
    const nextPreviewLayout = {
      ...getPreviewLayoutSeed(previewLayout, DEFAULT_PAGE_PREVIEW_LAYOUT),
      layerOrder: [...nextLayerOrder],
    }
    setPreviewLayout(nextPreviewLayout)
    requestLayerOrder(nextLayerOrder)
  }, [previewLayout, requestLayerOrder])

  const handleDeleteLayer = useCallback((target: string, kind: "text" | "image") => {
    setPreviewLayout((current) => {
      if (!current) return current
      return removeLayerFromPreviewLayout(current, target, kind)
    })

    requestLayerDelete(target)
    setSelectedLayerKey((current) => (current === target ? null : current))
  }, [requestLayerDelete])

  const handlePreviewLayoutChange = useCallback((layout: PreviewLayoutState) => {
    setPreviewLayout(layout)
    clearLayerRequests()
  }, [clearLayerRequests])

  const handlePreviewLayerSelect = useCallback((key: string | null) => {
    if (activeSidebarPanel !== "layers") return
    setSelectedLayerKeyWithGrace(key)
  }, [activeSidebarPanel, setSelectedLayerKeyWithGrace])

  const handleToggleLayerEditor = useCallback((target: string) => {
    requestLayerEditor(target)
    setSelectedLayerKeyWithGrace(target)
  }, [requestLayerEditor, setSelectedLayerKeyWithGrace])

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
  const resolvedCanvasBackground = useMemo(
    () => (canvasBackground ? resolveImageSchemeColor(canvasBackground, imageColorScheme) : null),
    [canvasBackground, imageColorScheme],
  )

  const exportActionsContext = useMemo(
    () => ({
      result,
      previewLayout,
      baseFont,
      orientation,
      rotation,
      canvasBackground: resolvedCanvasBackground,
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
      documentMetadata,
      onDocumentMetadataChange: setDocumentMetadata,
      buildUiSettingsPayload,
    }),
    [
      result,
      previewLayout,
      baseFont,
      orientation,
      rotation,
      resolvedCanvasBackground,
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
      documentMetadata,
      setDocumentMetadata,
      buildUiSettingsPayload,
    ],
  )

  const exportActions = useExportActions(exportActionsContext)

  useShellKeyboardShortcuts({
    canUndo,
    canRedo,
    showPresetsBrowser,
    onLoadJson: () => loadFileInputRef.current?.click(),
    onSaveJson: exportActions.openSaveDialog,
    onExportPdf: exportActions.openExportDialog,
    onUndo: undoAny,
    onRedo: redoAny,
    onToggleDarkMode: () => setIsDarkUi((prev) => !prev),
    onToggleBaselines: () => dispatch({ type: "TOGGLE", key: "showBaselines" }),
    onToggleMargins: () => dispatch({ type: "TOGGLE", key: "showMargins" }),
    onToggleModules: () => dispatch({ type: "TOGGLE", key: "showModules" }),
    onToggleTypography: () => dispatch({ type: "TOGGLE", key: "showTypography" }),
    onToggleLayersPanel: toggleLayersPanel,
    onToggleRolloverInfo: () => setShowRolloverInfo((prev) => !prev),
    onToggleSettingsPanel: () => openSidebarPanel(activeSidebarPanel === "settings" ? null : "settings"),
    onToggleHelpPanel: toggleHelpPanel,
    onToggleImprintPanel: () => openSidebarPanel(activeSidebarPanel === "imprint" ? null : "imprint"),
    onOpenPresets: () => setShowPresetsBrowser(true),
    onClosePresets: () => setShowPresetsBrowser(false),
  })

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
    showLayers,
    showRolloverInfo,
    canUndo,
    canRedo,
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
    onToggleLayersPanel: toggleLayersPanel,
    onToggleRolloverInfo: () => setShowRolloverInfo((prev) => !prev),
    onToggleSettingsPanel: () => openSidebarPanel(activeSidebarPanel === "settings" ? null : "settings"),
    onToggleHelpPanel: toggleHelpPanel,
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
        data-preview-header-action={action.key}
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
          showTooltip={showRolloverInfo}
          buttonClassName={showSectionHelpIcons ? isHelpButton ? "bg-blue-500 text-white hover:bg-blue-600 border-blue-500" : "ring-1 ring-blue-500" : undefined}
        >
          {action.icon}
        </HeaderIconButton>
      </div>
    )
  }, [handleHeaderHelpNavigate, showRolloverInfo, showSectionHelpIcons])

  const settingsPanels = useMemo(() => (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <SettingsHelpNavigationProvider
        value={{ showHelpIcons: showSectionHelpIcons, showRolloverInfo, onNavigate: handleSectionHelpNavigate }}
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
          rhythm={rhythm}
          onRhythmChange={setRhythm}
          rhythmRowsEnabled={rhythmRowsEnabled}
          onRhythmRowsEnabledChange={setRhythmRowsEnabled}
          rhythmRowsDirection={rhythmRowsDirection}
          onRhythmRowsDirectionChange={setRhythmRowsDirection}
          rhythmColsEnabled={rhythmColsEnabled}
          onRhythmColsEnabledChange={setRhythmColsEnabled}
          rhythmColsDirection={rhythmColsDirection}
          onRhythmColsDirectionChange={setRhythmColsDirection}
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

        <ColorSchemePanel
          collapsed={collapsed.color}
          onHeaderClick={handleSectionHeaderClick("color")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          colorScheme={imageColorScheme}
          onColorSchemeChange={setImageColorScheme}
          onResetParagraphColors={resetParagraphColorsToScheme}
          canvasBackground={canvasBackground}
          onCanvasBackgroundChange={setCanvasBackground}
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
    rhythm,
    rhythmRowsEnabled,
    rhythmRowsDirection,
    rhythmColsEnabled,
    rhythmColsDirection,
    handleSectionHeaderDoubleClick,
    handleSectionHeaderClick,
    handleSectionHelpNavigate,
    canvasBackground,
    imageColorScheme,
    isDarkUi,
    marginMethod,
    orientation,
    result.grid.margins,
    rotation,
    setBaseFont,
    setBaselineMultiple,
    setCanvasRatio,
    setCanvasBackground,
    setCustomBaseline,
    setCustomMarginMultipliers,
    setGutterMultiple,
    setGridCols,
    setGridRows,
    setRhythm,
    setRhythmRowsEnabled,
    setRhythmRowsDirection,
    setRhythmColsEnabled,
    setRhythmColsDirection,
    setImageColorScheme,
    setMarginMethod,
    setOrientation,
    resetParagraphColorsToScheme,
    setRotation,
    setTypographyScale,
    setUseCustomMargins,
    showRolloverInfo,
    showSectionHelpIcons,
    typographyScale,
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

      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {showPresetsBrowser ? (
            <div className={`h-full min-h-[360px] rounded-md border p-4 ${isDarkUi ? "border-gray-700 bg-gray-900/40" : "border-gray-200 bg-gray-100/60"}`}>
              <PresetLayoutsPanel
                isDarkMode={isDarkUi}
                onLoadPreset={handleLoadPresetLayout}
                showRolloverInfo={showRolloverInfo}
                showHelpHints={showSectionHelpIcons}
                onHelpNavigate={() => handleHeaderHelpNavigate("presets")}
                compact
              />
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
              canvasBackground={resolvedCanvasBackground}
	              onImageColorSchemeChange={setImageColorScheme}
	              initialLayout={loadedPreviewLayout?.layout ?? null}
	              initialLayoutToken={loadedPreviewLayout?.token ?? 0}
	              rotation={rotation}
              undoNonce={previewUndoNonce}
              redoNonce={previewRedoNonce}
              historyResetToken={documentHistoryResetNonce}
              paragraphColorResetToken={paragraphColorResetNonce}
              onHistoryRecord={handlePreviewHistoryRecord}
              onUndoRequest={undoAny}
              onRedoRequest={redoAny}
              onOpenHelpSection={openHelpSection}
              showEditorHelpIcon={showSectionHelpIcons}
	              onHistoryAvailabilityChange={handlePreviewHistoryAvailabilityChange}
	              onRequestGridRestore={handlePreviewGridRestore}
	              onRequestNotice={handleRequestNotice}
	              requestedLayerOrder={requestedLayerOrderState?.order ?? null}
	              requestedLayerOrderToken={requestedLayerOrderState?.token ?? 0}
	              requestedLayerDeleteTarget={requestedLayerDeleteState?.target ?? null}
	              requestedLayerDeleteToken={requestedLayerDeleteState?.token ?? 0}
	              requestedLayerEditorTarget={requestedLayerEditorState?.target ?? null}
	              requestedLayerEditorToken={requestedLayerEditorState?.token ?? 0}
	              selectedLayerKey={activeSidebarPanel === "layers" ? selectedLayerKey : null}
              onSelectLayer={handlePreviewLayerSelect}
              isDarkMode={isDarkUi}
              onLayoutChange={handlePreviewLayoutChange}
            />
          )}
        </div>
        {!showPresetsBrowser && activeSidebarPanel && (
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
                    onClick={closeSidebarPanel}
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
                onClose={closeSidebarPanel}
                activeSectionId={activeHelpSectionId}
              />
            )}
            {activeSidebarPanel === "layers" && (
              <LayersPanel
                layout={previewLayout}
                baseFont={baseFont}
                imageColorScheme={imageColorScheme}
                selectedLayerKey={selectedLayerKey}
                onLayerOrderChange={handleLayerOrderChange}
                onSelectLayer={setSelectedLayerKeyWithGrace}
                onToggleEditor={handleToggleLayerEditor}
                onDeleteLayer={handleDeleteLayer}
                onClose={closeSidebarPanel}
                isDarkMode={isDarkUi}
              />
            )}
            {activeSidebarPanel === "imprint" && (
              <ImprintPanel
                isDarkMode={isDarkUi}
                onClose={closeSidebarPanel}
              />
            )}
          </div>
        )}
      </div>

      {!showPresetsBrowser && showRolloverInfo ? (
        <div className={`shrink-0 h-11 border-t px-4 text-[11px] md:px-6 ${uiTheme.previewHeader} ${uiTheme.bodyText} flex items-center`}>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            {PREVIEW_INTERACTION_HINT_SINGLE_LINE}
          </div>
        </div>
      ) : null}
    </div>
  ), [
    activeHelpSectionId,
    activeSidebarPanel,
    baseFont,
    displayGroup,
    documentHistoryResetNonce,
    fileGroup,
    handleDeleteLayer,
    handleHeaderHelpNavigate,
    handleLayerOrderChange,
	    handleLoadPresetLayout,
	    handlePreviewLayoutChange,
	    handlePreviewLayerSelect,
	    handleToggleLayerEditor,
	    handlePreviewGridRestore,
	    handlePreviewHistoryAvailabilityChange,
	    handlePreviewHistoryRecord,
	    handleRequestNotice,
    closeSidebarPanel,
    openHelpSection,
	    paragraphColorResetNonce,
    previewRedoNonce,
    previewLayout,
    previewUndoNonce,
    requestedLayerDeleteState,
    requestedLayerEditorState,
    requestedLayerOrderState,
    selectedLayerKey,
    imageColorScheme,
    isDarkUi,
    loadLayout,
    loadedPreviewLayout,
    resolvedCanvasBackground,
    showPresetsBrowser,
    renderHeaderAction,
    redoAny,
    result,
    rotation,
    setImageColorScheme,
    setSelectedLayerKeyWithGrace,
    showBaselines,
    showMargins,
    showImagePlaceholders,
    showModules,
    showSectionHelpIcons,
    showTypography,
    showRolloverInfo,
    sidebarGroup,
    undoAny,
    uiTheme.divider,
    uiTheme.bodyText,
    uiTheme.previewHeader,
    uiTheme.previewShell,
    uiTheme.sidebar,
    uiTheme.sidebarBody,
    uiTheme.sidebarHeading,
  ])

  if (isSmartphone) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-6 text-white">
        <div className="w-full max-w-md rounded-lg border border-white/20 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Screen Too Small</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/85">
            Swiss Grid Generator requires a viewport width of at least 768 pixels.
            Open it on a tablet, laptop, or desktop screen, or enlarge this window to continue.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex h-screen flex-col md:flex-row ${uiTheme.root}`}>
      {/* Left Panel - Controls */}
      <div className={`w-full md:w-[280px] flex max-h-[50vh] flex-col border-r border-b md:max-h-full md:border-b-0 ${uiTheme.leftPanel}`}>
        {/* Header - always visible */}
        <div className={`shrink-0 space-y-2 border-b p-4 md:px-6 md:pt-6 ${uiTheme.subtleBorder}`}>
          <h1 className="text-3xl leading-[1] xfont-bold tracking-tight">Swiss Grid Generator</h1>
          <p className={`text-sm ${uiTheme.bodyText}`}>
            Based on Müller-Brockmann&apos;s <em><a href="https://amzn.to/40kfiUL">Grid Systems in Graphic Design</a></em> (1981).
            Copyleft &amp; -right 2026 by{" "}
            <a href="https://lp45.net" className={uiTheme.link}>lp45.net</a>.
          </p>
        </div>

        <div className={`relative flex min-h-0 flex-1 flex-col ${showPresetsBrowser ? "opacity-50" : ""}`}>
          {showPresetsBrowser ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 z-10 cursor-not-allowed"
            />
          ) : null}

          {settingsPanels}

          <div className={`shrink-0 border-t px-4 py-3 text-[11px] md:px-6 ${uiTheme.subtleBorder} ${uiTheme.bodyText}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                {SHOW_BETA_BADGE ? (
                  <span className="inline-flex items-center rounded bg-red-600 px-2 py-0.5 font-medium text-white">Beta</span>
                ) : null}
                <span>V {APP_VERSION}</span>
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
                  onClick={() => openSidebarPanel(activeSidebarPanel === "imprint" ? null : "imprint")}
                >
                  Imprint
                </button>
              </div>
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
        title={exportActions.saveTitleDraft}
        onTitleChange={exportActions.setSaveTitleDraft}
        description={exportActions.saveDescriptionDraft}
        onDescriptionChange={exportActions.setSaveDescriptionDraft}
        author={exportActions.saveAuthorDraft}
        onAuthorChange={exportActions.setSaveAuthorDraft}
        onConfirm={handleConfirmSaveJSON}
        defaultFilename={defaultJsonFilename}
        ratioLabel={selectedCanvasRatio.label}
        orientation={orientation}
        rotation={rotation}
      />

      <NoticeDialog
        isOpen={noticeState !== null}
        title={noticeState?.title ?? ""}
        message={noticeState?.message ?? ""}
        onClose={() => setNoticeState(null)}
      />
    </div>
  )
}
