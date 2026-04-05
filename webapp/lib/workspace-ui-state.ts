import type { CanvasRatioKey } from "@/lib/grid-calculator"
import { FORMATS_PT, FORMAT_BASELINES } from "@/lib/grid-calculator"
import { clampRotation } from "@/lib/block-constraints"
import {
  BASELINE_MULTIPLE_RANGE,
  GUTTER_MULTIPLE_RANGE,
  defaultGridRhythmAxisSettings,
  isDisplayUnit,
  isGridRhythm,
  isGridRhythmColsDirection,
  isGridRhythmRowsDirection,
  isTypographyScale,
  resolveLegacyGridRhythmAxisSettings,
  type DisplayUnit,
  type GridRhythm,
  type GridRhythmColsDirection,
  type GridRhythmRowsDirection,
  type TypographyScale,
} from "@/lib/config/defaults"
import {
  getImageSchemeColorToken,
  isImageColorInScheme,
  isImageSchemeColorToken,
  normalizeImageColorSchemeId,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import {
  DEFAULT_UI,
  isCanvasRatioKey,
  resolveUiDefaults,
} from "@/lib/config/ui-defaults"
import {
  isFontFamily,
  type FontFamily,
} from "@/lib/config/fonts"
import { SECTION_KEYS } from "@/hooks/useSettingsHistory"
import type { SectionKey, UiSettingsSnapshot } from "@/hooks/useSettingsHistory"

export type GridUiState = Pick<
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

export type ExportUiState = Pick<
  UiSettingsSnapshot,
  | "exportPaperSize"
  | "exportPrintPro"
  | "exportBleedMm"
  | "exportRegistrationMarks"
  | "displayUnit"
>

export const DEFAULT_A4_BASELINE = FORMAT_BASELINES["A4"] ?? 12
const RESOLVED_DEFAULTS = resolveUiDefaults(DEFAULT_UI, DEFAULT_A4_BASELINE)

function clampBaselineMultiple(value: number): number {
  return Math.min(BASELINE_MULTIPLE_RANGE.max, Math.max(BASELINE_MULTIPLE_RANGE.min, value))
}

function clampGutterMultiple(value: number): number {
  return Math.min(GUTTER_MULTIPLE_RANGE.max, Math.max(GUTTER_MULTIPLE_RANGE.min, value))
}

export const INITIAL_GRID_UI_STATE: GridUiState = {
  canvasRatio: RESOLVED_DEFAULTS.canvasRatio,
  orientation: RESOLVED_DEFAULTS.orientation,
  rotation: DEFAULT_UI.rotation,
  marginMethod: RESOLVED_DEFAULTS.marginMethod,
  gridCols: DEFAULT_UI.gridCols,
  gridRows: DEFAULT_UI.gridRows,
  baselineMultiple: clampBaselineMultiple(DEFAULT_UI.baselineMultiple),
  gutterMultiple: clampGutterMultiple(DEFAULT_UI.gutterMultiple),
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

export const INITIAL_EXPORT_UI_STATE: ExportUiState = {
  exportPaperSize: DEFAULT_UI.exportPaperSize,
  exportPrintPro: DEFAULT_UI.exportPrintPro,
  exportBleedMm: DEFAULT_UI.exportBleedMm,
  exportRegistrationMarks: DEFAULT_UI.exportRegistrationMarks,
  displayUnit: RESOLVED_DEFAULTS.displayUnit,
}

export type UiAction =
  | { type: "SET"; key: "canvasRatio"; value: CanvasRatioKey }
  | { type: "SET"; key: "exportPaperSize"; value: string }
  | { type: "SET"; key: "exportPrintPro"; value: boolean }
  | { type: "SET"; key: "exportBleedMm"; value: number }
  | { type: "SET"; key: "exportRegistrationMarks"; value: boolean }
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

export function gridUiReducer(state: GridUiState, action: UiAction): GridUiState {
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
          const nextBaselineMultiple = clampBaselineMultiple(action.value)
          if (state.baselineMultiple === nextBaselineMultiple) return state
          return { ...state, baselineMultiple: nextBaselineMultiple }
        }
        case "gutterMultiple": {
          const nextGutterMultiple = clampGutterMultiple(action.value)
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
          (acc, key) => {
            acc[key] = action.value
            return acc
          },
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
        baselineMultiple: clampBaselineMultiple(action.snapshot.baselineMultiple),
        gutterMultiple: clampGutterMultiple(action.snapshot.gutterMultiple),
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

export function exportUiReducer(state: ExportUiState, action: UiAction): ExportUiState {
  switch (action.type) {
    case "SET":
      switch (action.key) {
        case "exportPaperSize":
        case "exportPrintPro":
        case "exportBleedMm":
        case "exportRegistrationMarks":
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
        displayUnit: action.snapshot.displayUnit,
      }
    case "BATCH":
      return action.actions.reduce(exportUiReducer, state)
    default:
      return state
  }
}

export function buildUiActionsFromLoadedSettings(
  loaded: Record<string, unknown>,
  currentCollapsed: Record<SectionKey, boolean>,
): UiAction[] {
  const actions: UiAction[] = []
  const set = <K extends UiAction & { type: "SET" }>(key: K["key"], value: K["value"]) => {
    actions.push({ type: "SET", key, value } as UiAction)
  }

  if (isCanvasRatioKey(loaded.canvasRatio)) set("canvasRatio", loaded.canvasRatio)
  if (typeof loaded.exportPaperSize === "string" && FORMATS_PT[loaded.exportPaperSize]) {
    set("exportPaperSize", loaded.exportPaperSize)
  }
  if (typeof loaded.exportPrintPro === "boolean") set("exportPrintPro", loaded.exportPrintPro)
  if (typeof loaded.exportBleedMm === "number" && Number.isFinite(loaded.exportBleedMm) && loaded.exportBleedMm >= 0) {
    set("exportBleedMm", loaded.exportBleedMm)
  }
  if (typeof loaded.exportRegistrationMarks === "boolean") set("exportRegistrationMarks", loaded.exportRegistrationMarks)
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
  } else if (
    isImageSchemeColorToken(loaded.canvasBackground)
    || isImageColorInScheme(loaded.canvasBackground, backgroundScheme)
  ) {
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
