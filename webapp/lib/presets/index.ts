import type { LayoutPreset, LayoutPresetUiSettings } from "@/lib/presets/types"
import {
  isGridRhythm,
  isGridRhythmColsDirection,
  isGridRhythmRowsDirection,
  isLegacyGridRhythmRotation,
  resolveLegacyGridRhythmAxisSettings,
} from "@/lib/config/defaults"
import presetDinAbPortrait4x4Method1 from "./data/din_ab_portrait_4x4_method1_12.000pt_grid.json"
import presetDinAbPortrait4x4Method1Alt from "./data/din_ab_portrait_4x4_method1_12.000pt_grid_002.json"

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null
)

const isCanvasRatio = (value: unknown): value is LayoutPresetUiSettings["canvasRatio"] => (
  value === "din_ab" || value === "letter_ansi_ab"
)

const isOrientation = (value: unknown): value is LayoutPresetUiSettings["orientation"] => (
  value === "portrait" || value === "landscape"
)

const isMarginMethod = (value: unknown): value is LayoutPresetUiSettings["marginMethod"] => (
  value === 1 || value === 2 || value === 3
)

function toPresetId(sourcePath: string): string {
  return sourcePath
    .replace(/^\.?\//, "")
    .replace(/\.json$/i, "")
    .trim()
}

function toPresetLabel(sourcePath: string): string {
  const id = toPresetId(sourcePath)
  const cleaned = id
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned
    .split(" ")
    .map((token) => (token ? `${token.charAt(0).toUpperCase()}${token.slice(1)}` : token))
    .join(" ")
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function toOptionalIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return undefined
  return new Date(parsed).toISOString()
}

function parseLayoutPreset(source: unknown, sourcePath: string): LayoutPreset {
  const payload = isObjectRecord(source) && isObjectRecord(source.default)
    ? source.default
    : source

  if (!isObjectRecord(payload)) {
    throw new Error(`Invalid preset "${sourcePath}": expected object`)
  }

  if (!isObjectRecord(payload.uiSettings)) {
    throw new Error(`Invalid preset "${sourcePath}": missing uiSettings`)
  }

  const uiSettingsSource = payload.uiSettings
  const gridCols = uiSettingsSource.gridCols
  const gridRows = uiSettingsSource.gridRows
  const canvasRatio = uiSettingsSource.canvasRatio
  const orientation = uiSettingsSource.orientation
  const marginMethod = uiSettingsSource.marginMethod
  const baselineMultiple = uiSettingsSource.baselineMultiple
  const gutterMultiple = uiSettingsSource.gutterMultiple
  const rhythmSource = uiSettingsSource.rhythm
  const rhythmRowsEnabledSource = uiSettingsSource.rhythmRowsEnabled
  const rhythmRowsDirectionSource = uiSettingsSource.rhythmRowsDirection
  const rhythmColsEnabledSource = uiSettingsSource.rhythmColsEnabled
  const rhythmColsDirectionSource = uiSettingsSource.rhythmColsDirection
  const rhythmRotationSource = uiSettingsSource.rhythmRotation
  const rhythmRotate90Source = uiSettingsSource.rhythmRotate90

  if (typeof gridCols !== "number" || !Number.isFinite(gridCols) || gridCols <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.gridCols must be a positive number`)
  }
  if (typeof gridRows !== "number" || !Number.isFinite(gridRows) || gridRows <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.gridRows must be a positive number`)
  }
  if (!isCanvasRatio(canvasRatio)) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.canvasRatio is not supported`)
  }
  if (!isOrientation(orientation)) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.orientation is not supported`)
  }
  if (!isMarginMethod(marginMethod)) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.marginMethod must be 1, 2, or 3`)
  }
  if (typeof baselineMultiple !== "number" || !Number.isFinite(baselineMultiple) || baselineMultiple <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.baselineMultiple must be a positive number`)
  }
  if (typeof gutterMultiple !== "number" || !Number.isFinite(gutterMultiple) || gutterMultiple <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.gutterMultiple must be a positive number`)
  }
  if (rhythmSource !== undefined && !isGridRhythm(rhythmSource)) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.rhythm must be one of repetitive, fibonacci, golden, fourth, fifth`)
  }
  if (rhythmRowsEnabledSource !== undefined && typeof rhythmRowsEnabledSource !== "boolean") {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.rhythmRowsEnabled must be a boolean`)
  }
  if (rhythmRowsDirectionSource !== undefined && !isGridRhythmRowsDirection(rhythmRowsDirectionSource)) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.rhythmRowsDirection must be \"ltr\" or \"rtl\"`)
  }
  if (rhythmColsEnabledSource !== undefined && typeof rhythmColsEnabledSource !== "boolean") {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.rhythmColsEnabled must be a boolean`)
  }
  if (rhythmColsDirectionSource !== undefined && !isGridRhythmColsDirection(rhythmColsDirectionSource)) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.rhythmColsDirection must be \"ttb\" or \"btt\"`)
  }
  if (rhythmRotationSource !== undefined && !isLegacyGridRhythmRotation(rhythmRotationSource)) {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.rhythmRotation must be 0, 90, 180, or 360`)
  }
  if (rhythmRotate90Source !== undefined && typeof rhythmRotate90Source !== "boolean") {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.rhythmRotate90 must be a boolean`)
  }

  const legacyRhythmAxisSettings = resolveLegacyGridRhythmAxisSettings(
    rhythmRotationSource,
    rhythmRotate90Source,
  )

  const uiSettings: LayoutPresetUiSettings = {
    ...uiSettingsSource,
    gridCols,
    gridRows,
    canvasRatio,
    orientation,
    marginMethod,
    baselineMultiple,
    gutterMultiple,
    rhythm: isGridRhythm(rhythmSource) ? rhythmSource : undefined,
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

  return {
    id: toPresetId(sourcePath),
    label: toPresetLabel(sourcePath),
    title: toOptionalText(payload.title),
    description: toOptionalText(payload.description),
    author: toOptionalText(payload.author),
    createdAt: toOptionalIsoDate(payload.createdAt) ?? toOptionalIsoDate(payload.exportedAt),
    uiSettings,
    previewLayout: isObjectRecord(payload.previewLayout) ? payload.previewLayout : null,
  }
}

const PRESET_SOURCES = [
  {
    path: "./data/din_ab_portrait_4x4_method1_12.000pt_grid.json",
    source: presetDinAbPortrait4x4Method1,
  },
  {
    path: "./data/din_ab_portrait_4x4_method1_12.000pt_grid_002.json",
    source: presetDinAbPortrait4x4Method1Alt,
  },
] as const

export const LAYOUT_PRESETS: LayoutPreset[] = [...PRESET_SOURCES]
  .sort((a, b) => a.path.localeCompare(b.path))
  .map(({ path, source }) => parseLayoutPreset(source, path))

export type { LayoutPreset }
