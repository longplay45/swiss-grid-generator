import type { LayoutPreset, LayoutPresetUiSettings } from "@/lib/presets/types"
import { isGridRhythm } from "@/lib/config/defaults"

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
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.rhythm must be \"repetitive\" or \"fibonacci\"`)
  }
  if (rhythmRotate90Source !== undefined && typeof rhythmRotate90Source !== "boolean") {
    throw new Error(`Invalid preset "${sourcePath}": uiSettings.rhythmRotate90 must be a boolean`)
  }

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
    rhythmRotate90: typeof rhythmRotate90Source === "boolean" ? rhythmRotate90Source : undefined,
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

type PresetContext = {
  keys: () => string[]
  <T>(id: string): T
}

const webpackRequire = require as unknown as {
  context: (path: string, deep?: boolean, filter?: RegExp) => PresetContext
}
const presetContext = webpackRequire.context("./data", false, /\.json$/)

export const LAYOUT_PRESETS: LayoutPreset[] = presetContext
  .keys()
  .sort((a, b) => a.localeCompare(b))
  .map((filePath) => parseLayoutPreset(presetContext<Record<string, unknown>>(filePath), filePath))

export type { LayoutPreset }
