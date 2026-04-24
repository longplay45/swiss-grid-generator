import type { LoadedProject, ProjectPage } from "@/lib/document-session"
import { clampRotation } from "@/lib/block-constraints"
import {
  DEFAULT_IMAGE_COLOR_SCHEME_ID,
  resolveImageSchemeColor,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { DEFAULT_BASE_FONT, type FontFamily } from "@/lib/config/fonts"
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
  DEFAULT_UI,
  type MarginMethod,
  type Orientation,
} from "@/lib/config/ui-defaults"
import { type GridResult } from "@/lib/grid-calculator"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { buildGridResultFromUiSettings, resolveUiSettingsSnapshot } from "@/lib/ui-settings-resolver"
import type { UiSettingsSnapshot } from "@/lib/workspace-ui-schema"
import type { DocumentVariableContext } from "@/lib/document-variable-text"
import {
  getProjectPagePhysicalPageNumberAtIndex,
  getProjectPhysicalPageCount,
} from "@/lib/document-page-numbering"

type TypographyStyleKey = string
type BlockId = string
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

type CustomMarginMultipliers = {
  top: number
  left: number
  right: number
  bottom: number
}

export type ResolvedProjectPageUiSettings = Record<string, unknown> & UiSettingsSnapshot

export type ResolvedProjectPageExportSource = {
  id: string
  name: string
  documentVariableContext: DocumentVariableContext
  uiSettings: ResolvedProjectPageUiSettings
  previewLayout: PreviewLayoutState | null
  result: GridResult
  baseFont: FontFamily
  imageColorScheme: ImageColorSchemeId
  resolvedCanvasBackground: string | null
}

export type ProjectExportPageRange = {
  fromPage: number
  toPage: number
}

export type NormalizedProjectExportPageRange = ProjectExportPageRange & {
  startIndex: number
  endIndex: number
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null
)

const isOrientation = (value: unknown): value is Orientation => (
  value === "portrait" || value === "landscape"
)

const isMarginMethod = (value: unknown): value is MarginMethod => (
  value === 1 || value === 2 || value === 3
)

function resolveCustomMarginMultipliers(
  value: unknown,
  sourcePath: string,
): CustomMarginMultipliers | undefined {
  if (value === undefined) return undefined
  if (!isObjectRecord(value)) {
    throw new Error(`Invalid project page "${sourcePath}": customMarginMultipliers must be an object`)
  }

  const top = value.top
  const left = value.left
  const right = value.right
  const bottom = value.bottom

  for (const [label, entry] of [["top", top], ["left", left], ["right", right], ["bottom", bottom]] as const) {
    if (typeof entry !== "number" || !Number.isFinite(entry) || entry <= 0) {
      throw new Error(`Invalid project page "${sourcePath}": customMarginMultipliers.${label} must be a positive number`)
    }
  }

  return {
    top: top as number,
    left: left as number,
    right: right as number,
    bottom: bottom as number,
  }
}

function resolveBooleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function resolveNonNegativeNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback
  return value
}

function resolvePositiveNumberSetting(
  value: unknown,
  sourcePath: string,
  label: string,
): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid project page "${sourcePath}": ${label} must be a positive number`)
  }
  return value
}

function clampPageNumber(value: number, pageCount: number): number {
  if (!Number.isFinite(value)) return 1
  if (pageCount <= 0) return 1
  return Math.min(pageCount, Math.max(1, Math.round(value)))
}

export function normalizeProjectExportPageRange(
  pageCount: number,
  fromPage: number,
  toPage: number,
): NormalizedProjectExportPageRange {
  const normalizedFrom = clampPageNumber(fromPage, pageCount)
  const normalizedTo = clampPageNumber(toPage, pageCount)
  const startIndex = Math.min(normalizedFrom, normalizedTo) - 1
  const endIndex = Math.max(normalizedFrom, normalizedTo) - 1

  return {
    fromPage: startIndex + 1,
    toPage: endIndex + 1,
    startIndex,
    endIndex,
  }
}

export function sliceProjectPagesForExportRange<Layout>(
  project: LoadedProject<Layout>,
  range: ProjectExportPageRange,
): ProjectPage<Layout>[] {
  if (project.pages.length === 0) return []
  const normalized = normalizeProjectExportPageRange(project.pages.length, range.fromPage, range.toPage)
  return project.pages.slice(normalized.startIndex, normalized.endIndex + 1)
}

export function filterProjectByExportRange<Layout>(
  project: LoadedProject<Layout>,
  range: ProjectExportPageRange,
): LoadedProject<Layout> {
  const pages = sliceProjectPagesForExportRange(project, range)
  if (pages.length === 0) return project

  return {
    ...project,
    activePageId: pages.some((page) => page.id === project.activePageId)
      ? project.activePageId
      : pages[0].id,
    pages,
  }
}

export function resolveProjectPageUiSettings(
  source: Record<string, unknown>,
  sourcePath: string,
): ResolvedProjectPageUiSettings {
  const gridCols = source.gridCols
  const gridRows = source.gridRows
  const canvasRatio = source.canvasRatio
  const orientation = source.orientation
  const marginMethod = source.marginMethod
  const baselineMultiple = source.baselineMultiple
  const gutterMultiple = source.gutterMultiple
  const customBaseline = source.customBaseline
  const customRatioWidth = resolvePositiveNumberSetting(source.customRatioWidth, sourcePath, "uiSettings.customRatioWidth")
  const customRatioHeight = resolvePositiveNumberSetting(source.customRatioHeight, sourcePath, "uiSettings.customRatioHeight")
  const rhythmSource = source.rhythm
  const rhythmRowsEnabledSource = source.rhythmRowsEnabled
  const rhythmRowsDirectionSource = source.rhythmRowsDirection
  const rhythmColsEnabledSource = source.rhythmColsEnabled
  const rhythmColsDirectionSource = source.rhythmColsDirection
  const rhythmRotationSource = source.rhythmRotation
  const rhythmRotate90Source = source.rhythmRotate90
  const useCustomMargins = source.useCustomMargins === true

  if (typeof gridCols !== "number" || !Number.isFinite(gridCols) || gridCols <= 0) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.gridCols must be a positive number`)
  }
  if (typeof gridRows !== "number" || !Number.isFinite(gridRows) || gridRows <= 0) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.gridRows must be a positive number`)
  }
  if (!isCanvasRatioKey(canvasRatio)) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.canvasRatio is not supported`)
  }
  if (!isOrientation(orientation)) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.orientation is not supported`)
  }
  if (!isMarginMethod(marginMethod)) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.marginMethod must be 1, 2, or 3`)
  }
  if (typeof baselineMultiple !== "number" || !Number.isFinite(baselineMultiple) || baselineMultiple <= 0) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.baselineMultiple must be a positive number`)
  }
  if (typeof gutterMultiple !== "number" || !Number.isFinite(gutterMultiple) || gutterMultiple <= 0) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.gutterMultiple must be a positive number`)
  }
  if (customBaseline !== undefined && (typeof customBaseline !== "number" || !Number.isFinite(customBaseline) || customBaseline <= 0)) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.customBaseline must be a positive number`)
  }
  if (rhythmSource !== undefined && !isGridRhythm(rhythmSource)) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.rhythm must be supported`)
  }
  if (rhythmRowsEnabledSource !== undefined && typeof rhythmRowsEnabledSource !== "boolean") {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.rhythmRowsEnabled must be a boolean`)
  }
  if (rhythmRowsDirectionSource !== undefined && !isGridRhythmRowsDirection(rhythmRowsDirectionSource)) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.rhythmRowsDirection must be "ltr" or "rtl"`)
  }
  if (rhythmColsEnabledSource !== undefined && typeof rhythmColsEnabledSource !== "boolean") {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.rhythmColsEnabled must be a boolean`)
  }
  if (rhythmColsDirectionSource !== undefined && !isGridRhythmColsDirection(rhythmColsDirectionSource)) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.rhythmColsDirection must be "ttb" or "btt"`)
  }
  if (rhythmRotationSource !== undefined && !isLegacyGridRhythmRotation(rhythmRotationSource)) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.rhythmRotation must be 0, 90, 180, or 360`)
  }
  if (rhythmRotate90Source !== undefined && typeof rhythmRotate90Source !== "boolean") {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.rhythmRotate90 must be a boolean`)
  }
  if (source.typographyScale !== undefined && !isTypographyScale(source.typographyScale)) {
    throw new Error(`Invalid project page "${sourcePath}": uiSettings.typographyScale is not supported`)
  }

  const legacyRhythmAxisSettings = resolveLegacyGridRhythmAxisSettings(
    rhythmRotationSource,
    rhythmRotate90Source,
  )
  const customMarginMultipliers = useCustomMargins
    ? resolveCustomMarginMultipliers(source.customMarginMultipliers, sourcePath)
    : undefined
  const resolved = resolveUiSettingsSnapshot(source)

  return {
    ...resolved,
    ...source,
    gridCols,
    gridRows,
    canvasRatio: resolved.canvasRatio,
    customRatioWidth: customRatioWidth ?? resolved.customRatioWidth,
    customRatioHeight: customRatioHeight ?? resolved.customRatioHeight,
    orientation,
    marginMethod,
    baselineMultiple,
    gutterMultiple,
    rotation: typeof source.rotation === "number" && Number.isFinite(source.rotation)
      ? clampRotation(source.rotation)
      : resolved.rotation,
    typographyScale: resolved.typographyScale,
    baseFont: resolved.baseFont,
    imageColorScheme: resolved.imageColorScheme,
    canvasBackground: resolved.canvasBackground,
    customBaseline: customBaseline ?? resolved.customBaseline,
    useCustomMargins,
    customMarginMultipliers: customMarginMultipliers ?? resolved.customMarginMultipliers,
    rhythm: isGridRhythm(rhythmSource) ? rhythmSource : resolved.rhythm,
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
    showBaselines: resolveBooleanSetting(source.showBaselines, DEFAULT_UI.showBaselines),
    showModules: resolveBooleanSetting(source.showModules, DEFAULT_UI.showModules),
    showMargins: resolveBooleanSetting(source.showMargins, DEFAULT_UI.showMargins),
    showImagePlaceholders: resolveBooleanSetting(source.showImagePlaceholders, DEFAULT_UI.showImagePlaceholders),
    showTypography: resolveBooleanSetting(source.showTypography, DEFAULT_UI.showTypography),
    exportBleedMm: resolveNonNegativeNumber(source.exportBleedMm, DEFAULT_UI.exportBleedMm),
  }
}

export function buildResolvedProjectPageExportSource(
  page: ProjectPage<Record<string, unknown>>,
  sourcePath: string,
  variableContext?: Partial<DocumentVariableContext>,
): ResolvedProjectPageExportSource {
  if (!isObjectRecord(page.uiSettings)) {
    throw new Error(`Invalid project page "${sourcePath}": missing uiSettings`)
  }

  const uiSettings = resolveProjectPageUiSettings(page.uiSettings, sourcePath)
  const result = buildGridResultFromUiSettings(uiSettings, {
    layoutMode: page.layoutMode ?? "single",
  })
  const imageColorScheme = uiSettings.imageColorScheme ?? DEFAULT_IMAGE_COLOR_SCHEME_ID

  return {
    id: page.id,
    name: page.name,
    documentVariableContext: {
      projectTitle: variableContext?.projectTitle ?? "",
      pageNumber: variableContext?.pageNumber ?? 1,
      pageCount: variableContext?.pageCount ?? 1,
      now: variableContext?.now ?? new Date(),
    },
    uiSettings,
    previewLayout: isObjectRecord(page.previewLayout) ? page.previewLayout as PreviewLayoutState : null,
    result,
    baseFont: uiSettings.baseFont ?? DEFAULT_BASE_FONT,
    imageColorScheme,
    resolvedCanvasBackground: uiSettings.canvasBackground
      ? resolveImageSchemeColor(uiSettings.canvasBackground, imageColorScheme)
      : null,
  }
}

export function buildResolvedProjectPageExportSources(
  project: LoadedProject<Record<string, unknown>>,
  range: ProjectExportPageRange,
): ResolvedProjectPageExportSource[] {
  const normalizedRange = normalizeProjectExportPageRange(project.pages.length, range.fromPage, range.toPage)
  const now = new Date()
  const pageCount = getProjectPhysicalPageCount(project.pages)
  return sliceProjectPagesForExportRange(project, range).map((page, index) => {
    const projectPageIndex = normalizedRange.startIndex + index
    const pageNumber = getProjectPagePhysicalPageNumberAtIndex(project.pages, projectPageIndex)
    const sourcePath = `${page.name || `Page ${pageNumber}`} (${page.id})`
    return buildResolvedProjectPageExportSource(page, sourcePath, {
      projectTitle: project.metadata.title,
      pageNumber,
      pageCount,
      now,
    })
  })
}
