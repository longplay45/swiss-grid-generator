import { parseLoadedProject } from "@/lib/document-session"
import type {
  LayoutPreset,
  LayoutPresetProjectSource,
  LayoutPresetUiSettings,
} from "@/lib/presets/types"
import {
  isGridRhythm,
  isGridRhythmColsDirection,
  isGridRhythmRowsDirection,
  isLegacyGridRhythmRotation,
  resolveLegacyGridRhythmAxisSettings,
} from "@/lib/config/defaults"
import presetDinAbPortrait4x4Method1 from "./data/din_ab_portrait_4x4_method1_12.000pt_grid.json"
import presetDinAbPortrait4x4Method1Alt from "./data/din_ab_portrait_4x4_method1_12.000pt_grid_002.json"
import presetImagePlaceholder from "./data/4x4 12pt grid with image placeholder.json"

type PresetManifestEntry = {
  path: string
  source: unknown
  label?: string
}

const PRESET_MANIFEST: readonly PresetManifestEntry[] = [
  {
    path: "./data/din_ab_portrait_4x4_method1_12.000pt_grid.json",
    source: presetDinAbPortrait4x4Method1,
    label: "4x4 Progressive",
  },
  {
    path: "./data/din_ab_portrait_4x4_method1_12.000pt_grid_002.json",
    source: presetDinAbPortrait4x4Method1Alt,
    label: "3x4 Baseline",
  },
  {
    path: "./data/4x4 12pt grid with image placeholder.json",
    source: presetImagePlaceholder,
    label: "Image Placeholder",
  },
] as const

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

function getPresetBaseName(sourcePath: string): string {
  const segments = sourcePath.split("/")
  return segments[segments.length - 1] ?? sourcePath
}

function toPresetId(sourcePath: string): string {
  return getPresetBaseName(sourcePath)
    .replace(/\.json$/i, "")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
}

function toPresetLabel(sourcePath: string): string {
  const cleaned = getPresetBaseName(sourcePath)
    .replace(/\.json$/i, "")
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

function toProjectSource(source: unknown, sourcePath: string): LayoutPresetProjectSource {
  const payload = isObjectRecord(source) && isObjectRecord(source.default)
    ? source.default
    : source

  if (!isObjectRecord(payload)) {
    throw new Error(`Invalid preset "${sourcePath}": expected an object`)
  }

  if (!Array.isArray(payload.pages)) {
    throw new Error(`Invalid preset "${sourcePath}": bundled presets must use project JSON with pages[]`)
  }

  return payload
}

function toPresetUiSettings(source: Record<string, unknown>, sourcePath: string): LayoutPresetUiSettings {
  const gridCols = source.gridCols
  const gridRows = source.gridRows
  const canvasRatio = source.canvasRatio
  const orientation = source.orientation
  const marginMethod = source.marginMethod
  const baselineMultiple = source.baselineMultiple
  const gutterMultiple = source.gutterMultiple
  const rhythmSource = source.rhythm
  const rhythmRowsEnabledSource = source.rhythmRowsEnabled
  const rhythmRowsDirectionSource = source.rhythmRowsDirection
  const rhythmColsEnabledSource = source.rhythmColsEnabled
  const rhythmColsDirectionSource = source.rhythmColsDirection
  const rhythmRotationSource = source.rhythmRotation
  const rhythmRotate90Source = source.rhythmRotate90

  if (typeof gridCols !== "number" || !Number.isFinite(gridCols) || gridCols <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.gridCols must be a positive number`)
  }
  if (typeof gridRows !== "number" || !Number.isFinite(gridRows) || gridRows <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.gridRows must be a positive number`)
  }
  if (!isCanvasRatio(canvasRatio)) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.canvasRatio is not supported`)
  }
  if (!isOrientation(orientation)) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.orientation is not supported`)
  }
  if (!isMarginMethod(marginMethod)) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.marginMethod must be 1, 2, or 3`)
  }
  if (typeof baselineMultiple !== "number" || !Number.isFinite(baselineMultiple) || baselineMultiple <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.baselineMultiple must be a positive number`)
  }
  if (typeof gutterMultiple !== "number" || !Number.isFinite(gutterMultiple) || gutterMultiple <= 0) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.gutterMultiple must be a positive number`)
  }
  if (rhythmSource !== undefined && !isGridRhythm(rhythmSource)) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.rhythm must be one of repetitive, fibonacci, golden, fourth, fifth`)
  }
  if (rhythmRowsEnabledSource !== undefined && typeof rhythmRowsEnabledSource !== "boolean") {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.rhythmRowsEnabled must be a boolean`)
  }
  if (rhythmRowsDirectionSource !== undefined && !isGridRhythmRowsDirection(rhythmRowsDirectionSource)) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.rhythmRowsDirection must be "ltr" or "rtl"`)
  }
  if (rhythmColsEnabledSource !== undefined && typeof rhythmColsEnabledSource !== "boolean") {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.rhythmColsEnabled must be a boolean`)
  }
  if (rhythmColsDirectionSource !== undefined && !isGridRhythmColsDirection(rhythmColsDirectionSource)) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.rhythmColsDirection must be "ttb" or "btt"`)
  }
  if (rhythmRotationSource !== undefined && !isLegacyGridRhythmRotation(rhythmRotationSource)) {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.rhythmRotation must be 0, 90, 180, or 360`)
  }
  if (rhythmRotate90Source !== undefined && typeof rhythmRotate90Source !== "boolean") {
    throw new Error(`Invalid preset "${sourcePath}": active page uiSettings.rhythmRotate90 must be a boolean`)
  }

  const legacyRhythmAxisSettings = resolveLegacyGridRhythmAxisSettings(
    rhythmRotationSource,
    rhythmRotate90Source,
  )

  return {
    ...source,
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
}

function parseLayoutPreset(
  { path: sourcePath, source, label: manifestLabel }: PresetManifestEntry,
): LayoutPreset {
  const projectSource = toProjectSource(source, sourcePath)
  const project = parseLoadedProject<Record<string, unknown>>(projectSource)
  const activePage = project.pages.find((page) => page.id === project.activePageId) ?? project.pages[0]

  if (!activePage) {
    throw new Error(`Invalid preset "${sourcePath}": project JSON must include at least one page`)
  }

  if (!isObjectRecord(activePage.uiSettings)) {
    throw new Error(`Invalid preset "${sourcePath}": active page is missing uiSettings`)
  }

  const title = toOptionalText(project.metadata.title)
  const description = toOptionalText(project.metadata.description)
  const author = toOptionalText(project.metadata.author)

  return {
    id: toPresetId(sourcePath),
    label: manifestLabel ?? title ?? toPresetLabel(sourcePath),
    title,
    description,
    author,
    createdAt: project.metadata.createdAt,
    uiSettings: toPresetUiSettings(activePage.uiSettings, sourcePath),
    previewLayout: activePage.previewLayout,
    projectSource,
  }
}

export const LAYOUT_PRESETS: LayoutPreset[] = PRESET_MANIFEST.map((entry) => parseLayoutPreset(entry))

export type { LayoutPreset }
