import type { ProjectPage } from "@/lib/document-session"
import { clampRotation } from "@/lib/block-constraints"
import {
  DEFAULT_IMAGE_COLOR_SCHEME_ID,
  resolveImageSchemeColor,
} from "@/lib/config/color-schemes"
import { DEFAULT_BASE_FONT } from "@/lib/config/fonts"
import {
  isGridRhythm,
  isGridRhythmColsDirection,
  isGridRhythmRowsDirection,
  isLegacyGridRhythmRotation,
  resolveLegacyGridRhythmAxisSettings,
  isTypographyScale,
} from "@/lib/config/defaults"
import {
  isCanvasRatioKey,
  PREVIEW_DEFAULT_FORMAT_BY_RATIO,
  resolveUiDefaults,
} from "@/lib/config/ui-defaults"
import { FORMAT_BASELINES, generateSwissGrid } from "@/lib/grid-calculator"
import type { LayoutPresetBrowserPage, LayoutPresetUiSettings } from "@/lib/presets/types"

const DEFAULT_A4_BASELINE = FORMAT_BASELINES.A4 ?? 12

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null
)

const isOrientation = (value: unknown): value is LayoutPresetUiSettings["orientation"] => (
  value === "portrait" || value === "landscape"
)

const isMarginMethod = (value: unknown): value is LayoutPresetUiSettings["marginMethod"] => (
  value === 1 || value === 2 || value === 3
)

function resolveCustomMarginMultipliers(
  value: unknown,
  sourcePath: string,
): LayoutPresetUiSettings["customMarginMultipliers"] | undefined {
  if (value === undefined) return undefined
  if (!isObjectRecord(value)) {
    throw new Error(`Invalid preset "${sourcePath}": customMarginMultipliers must be an object`)
  }

  const top = value.top
  const left = value.left
  const right = value.right
  const bottom = value.bottom

  for (const [label, entry] of [["top", top], ["left", left], ["right", right], ["bottom", bottom]] as const) {
    if (typeof entry !== "number" || !Number.isFinite(entry) || entry <= 0) {
      throw new Error(`Invalid preset "${sourcePath}": customMarginMultipliers.${label} must be a positive number`)
    }
  }

  return {
    top: top as number,
    left: left as number,
    right: right as number,
    bottom: bottom as number,
  }
}

export function toPresetUiSettings(source: Record<string, unknown>, sourcePath: string): LayoutPresetUiSettings {
  const gridCols = source.gridCols
  const gridRows = source.gridRows
  const canvasRatio = source.canvasRatio
  const orientation = source.orientation
  const marginMethod = source.marginMethod
  const baselineMultiple = source.baselineMultiple
  const gutterMultiple = source.gutterMultiple
  const customBaseline = source.customBaseline
  const rhythmSource = source.rhythm
  const rhythmRowsEnabledSource = source.rhythmRowsEnabled
  const rhythmRowsDirectionSource = source.rhythmRowsDirection
  const rhythmColsEnabledSource = source.rhythmColsEnabled
  const rhythmColsDirectionSource = source.rhythmColsDirection
  const rhythmRotationSource = source.rhythmRotation
  const rhythmRotate90Source = source.rhythmRotate90
  const useCustomMargins = source.useCustomMargins === true

  if (typeof gridCols !== "number" || !Number.isFinite(gridCols) || gridCols <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.gridCols must be a positive number`)
  }
  if (typeof gridRows !== "number" || !Number.isFinite(gridRows) || gridRows <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.gridRows must be a positive number`)
  }
  if (!isCanvasRatioKey(canvasRatio)) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.canvasRatio is not supported`)
  }
  if (!isOrientation(orientation)) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.orientation is not supported`)
  }
  if (!isMarginMethod(marginMethod)) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.marginMethod must be 1, 2, or 3`)
  }
  if (typeof baselineMultiple !== "number" || !Number.isFinite(baselineMultiple) || baselineMultiple <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.baselineMultiple must be a positive number`)
  }
  if (typeof gutterMultiple !== "number" || !Number.isFinite(gutterMultiple) || gutterMultiple <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.gutterMultiple must be a positive number`)
  }
  if (customBaseline !== undefined && (typeof customBaseline !== "number" || !Number.isFinite(customBaseline) || customBaseline <= 0)) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.customBaseline must be a positive number`)
  }
  if (rhythmSource !== undefined && !isGridRhythm(rhythmSource)) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.rhythm must be one of repetitive, fibonacci, golden, fourth, fifth`)
  }
  if (rhythmRowsEnabledSource !== undefined && typeof rhythmRowsEnabledSource !== "boolean") {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.rhythmRowsEnabled must be a boolean`)
  }
  if (rhythmRowsDirectionSource !== undefined && !isGridRhythmRowsDirection(rhythmRowsDirectionSource)) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.rhythmRowsDirection must be "ltr" or "rtl"`)
  }
  if (rhythmColsEnabledSource !== undefined && typeof rhythmColsEnabledSource !== "boolean") {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.rhythmColsEnabled must be a boolean`)
  }
  if (rhythmColsDirectionSource !== undefined && !isGridRhythmColsDirection(rhythmColsDirectionSource)) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.rhythmColsDirection must be "ttb" or "btt"`)
  }
  if (rhythmRotationSource !== undefined && !isLegacyGridRhythmRotation(rhythmRotationSource)) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.rhythmRotation must be 0, 90, 180, or 360`)
  }
  if (rhythmRotate90Source !== undefined && typeof rhythmRotate90Source !== "boolean") {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.rhythmRotate90 must be a boolean`)
  }
  if (source.typographyScale !== undefined && !isTypographyScale(source.typographyScale)) {
    throw new Error(`Invalid preset "${sourcePath}": page uiSettings.typographyScale is not supported`)
  }

  const defaults = resolveUiDefaults(source, DEFAULT_A4_BASELINE)
  const legacyRhythmAxisSettings = resolveLegacyGridRhythmAxisSettings(
    rhythmRotationSource,
    rhythmRotate90Source,
  )
  const customMarginMultipliers = useCustomMargins
    ? resolveCustomMarginMultipliers(source.customMarginMultipliers, sourcePath)
    : undefined

  return {
    ...source,
    gridCols,
    gridRows,
    canvasRatio: defaults.canvasRatio,
    orientation,
    marginMethod,
    baselineMultiple,
    gutterMultiple,
    rotation: typeof source.rotation === "number" && Number.isFinite(source.rotation)
      ? clampRotation(source.rotation)
      : 0,
    typographyScale: defaults.typographyScale,
    baseFont: defaults.baseFont,
    imageColorScheme: defaults.imageColorScheme,
    canvasBackground: source.canvasBackground === null ? null : defaults.canvasBackground,
    customBaseline: customBaseline ?? defaults.customBaseline,
    useCustomMargins,
    customMarginMultipliers,
    rhythm: isGridRhythm(rhythmSource) ? rhythmSource : defaults.rhythm,
    rhythmRowsEnabled: typeof rhythmRowsEnabledSource === "boolean"
      ? rhythmRowsEnabledSource
      : legacyRhythmAxisSettings.rhythmRowsEnabled,
    rhythmRowsDirection: isGridRhythmRowsDirection(rhythmRowsDirectionSource)
      ? rhythmRowsDirectionSource
      : legacyRhythmAxisSettings.rhythmRowsDirection,
    rhythmColsEnabled: typeof rhythmColsEnabledSource === "boolean"
      ? rhythmColsEnabledSource
      : legacyRhythmAxisSettings.rhythmColsEnabled,
    rhythmColsDirection: isGridRhythmColsDirection(rhythmColsDirectionSource)
      ? rhythmColsDirectionSource
      : legacyRhythmAxisSettings.rhythmColsDirection,
  }
}

export function buildPresetBrowserPage(
  page: ProjectPage<Record<string, unknown>>,
  sourcePath: string,
): LayoutPresetBrowserPage {
  if (!isObjectRecord(page.uiSettings)) {
    throw new Error(`Invalid preset "${sourcePath}": browser page is missing uiSettings`)
  }

  const uiSettings = toPresetUiSettings(page.uiSettings, sourcePath)
  const baseline = uiSettings.customBaseline ?? DEFAULT_A4_BASELINE
  const customMargins = uiSettings.useCustomMargins && uiSettings.customMarginMultipliers
    ? {
        top: uiSettings.customMarginMultipliers.top * uiSettings.baselineMultiple * baseline,
        left: uiSettings.customMarginMultipliers.left * uiSettings.baselineMultiple * baseline,
        right: uiSettings.customMarginMultipliers.right * uiSettings.baselineMultiple * baseline,
        bottom: uiSettings.customMarginMultipliers.bottom * uiSettings.baselineMultiple * baseline,
      }
    : undefined
  const result = generateSwissGrid({
    format: PREVIEW_DEFAULT_FORMAT_BY_RATIO[uiSettings.canvasRatio],
    orientation: uiSettings.orientation,
    marginMethod: uiSettings.marginMethod,
    gridCols: uiSettings.gridCols,
    gridRows: uiSettings.gridRows,
    baseline,
    baselineMultiple: uiSettings.baselineMultiple,
    gutterMultiple: uiSettings.gutterMultiple,
    rhythm: uiSettings.rhythm,
    rhythmRowsEnabled: uiSettings.rhythmRowsEnabled,
    rhythmRowsDirection: uiSettings.rhythmRowsDirection,
    rhythmColsEnabled: uiSettings.rhythmColsEnabled,
    rhythmColsDirection: uiSettings.rhythmColsDirection,
    customMargins,
    typographyScale: uiSettings.typographyScale,
  })
  const imageColorScheme = uiSettings.imageColorScheme ?? DEFAULT_IMAGE_COLOR_SCHEME_ID

  return {
    id: page.id,
    name: page.name,
    uiSettings,
    previewLayout: isObjectRecord(page.previewLayout) ? page.previewLayout : null,
    result,
    baseFont: uiSettings.baseFont ?? DEFAULT_BASE_FONT,
    imageColorScheme,
    resolvedCanvasBackground: uiSettings.canvasBackground
      ? resolveImageSchemeColor(uiSettings.canvasBackground, imageColorScheme)
      : null,
  }
}
