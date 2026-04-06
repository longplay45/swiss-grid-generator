import type { CanvasRatioKey } from "@/lib/grid-calculator"
import { FORMAT_BASELINES } from "@/lib/grid-calculator"
import { clampRotation } from "@/lib/block-constraints"
import {
  BASELINE_MULTIPLE_RANGE,
  GUTTER_MULTIPLE_RANGE,
  type GridRhythm,
  type GridRhythmColsDirection,
  type GridRhythmRowsDirection,
  type TypographyScale,
} from "@/lib/config/defaults"
import { type ImageColorSchemeId } from "@/lib/config/color-schemes"
import {
  DEFAULT_UI,
} from "@/lib/config/ui-defaults"
import {
  type FontFamily,
} from "@/lib/config/fonts"
import {
  resolveUiSettingsSnapshot,
} from "@/lib/ui-settings-resolver"
import { SECTION_KEYS } from "@/lib/workspace-ui-schema"
import type { SectionKey, UiSettingsSnapshot } from "@/lib/workspace-ui-schema"

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
  | "exportPrintPro"
  | "exportBleedMm"
  | "exportRegistrationMarks"
>

export const DEFAULT_A4_BASELINE = FORMAT_BASELINES["A4"] ?? 12

function clampBaselineMultiple(value: number): number {
  return Math.min(BASELINE_MULTIPLE_RANGE.max, Math.max(BASELINE_MULTIPLE_RANGE.min, value))
}

function clampGutterMultiple(value: number): number {
  return Math.min(GUTTER_MULTIPLE_RANGE.max, Math.max(GUTTER_MULTIPLE_RANGE.min, value))
}

export const INITIAL_GRID_UI_STATE: GridUiState = {
  canvasRatio: DEFAULT_UI.canvasRatio,
  orientation: DEFAULT_UI.orientation,
  rotation: DEFAULT_UI.rotation,
  marginMethod: DEFAULT_UI.marginMethod,
  gridCols: DEFAULT_UI.gridCols,
  gridRows: DEFAULT_UI.gridRows,
  baselineMultiple: clampBaselineMultiple(DEFAULT_UI.baselineMultiple),
  gutterMultiple: clampGutterMultiple(DEFAULT_UI.gutterMultiple),
  rhythm: DEFAULT_UI.rhythm,
  rhythmRowsEnabled: DEFAULT_UI.rhythmRowsEnabled,
  rhythmRowsDirection: DEFAULT_UI.rhythmRowsDirection,
  rhythmColsEnabled: DEFAULT_UI.rhythmColsEnabled,
  rhythmColsDirection: DEFAULT_UI.rhythmColsDirection,
  typographyScale: DEFAULT_UI.typographyScale,
  baseFont: DEFAULT_UI.baseFont,
  imageColorScheme: DEFAULT_UI.imageColorScheme,
  canvasBackground: DEFAULT_UI.canvasBackground,
  customBaseline: DEFAULT_UI.customBaseline,
  useCustomMargins: DEFAULT_UI.useCustomMargins,
  customMarginMultipliers: DEFAULT_UI.customMarginMultipliers,
  showBaselines: DEFAULT_UI.showBaselines,
  showModules: DEFAULT_UI.showModules,
  showMargins: DEFAULT_UI.showMargins,
  showImagePlaceholders: DEFAULT_UI.showImagePlaceholders,
  showTypography: DEFAULT_UI.showTypography,
  showLayers: DEFAULT_UI.showLayers,
  collapsed: SECTION_KEYS.reduce(
    (acc, key) => {
      const raw = DEFAULT_UI.collapsed[key]
      acc[key] = typeof raw === "boolean" ? raw : true
      return acc
    },
    {} as Record<SectionKey, boolean>,
  ),
}

export const INITIAL_EXPORT_UI_STATE: ExportUiState = {
  exportPrintPro: DEFAULT_UI.exportPrintPro,
  exportBleedMm: DEFAULT_UI.exportBleedMm,
  exportRegistrationMarks: DEFAULT_UI.exportRegistrationMarks,
}

export type UiAction =
  | { type: "SET"; key: "canvasRatio"; value: CanvasRatioKey }
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
        case "exportPrintPro":
        case "exportBleedMm":
        case "exportRegistrationMarks":
          if (state[action.key] === action.value) return state
          return { ...state, [action.key]: action.value }
        default:
          return state
      }
    case "APPLY_SNAPSHOT":
      return {
        exportPrintPro: action.snapshot.exportPrintPro,
        exportBleedMm: action.snapshot.exportBleedMm,
        exportRegistrationMarks: action.snapshot.exportRegistrationMarks,
      }
    case "BATCH":
      return action.actions.reduce(exportUiReducer, state)
    default:
      return state
  }
}

export function buildUiSnapshotFromLoadedSettings(
  loaded: Record<string, unknown>,
  currentCollapsed: Record<SectionKey, boolean>,
): UiSettingsSnapshot {
  return resolveUiSettingsSnapshot(loaded, {
    collapsedFallback: currentCollapsed,
  })
}
