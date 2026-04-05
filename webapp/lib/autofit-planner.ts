import type { FontFamily } from "@/lib/config/fonts"
import type { TextRange, TextTrackingRun } from "./text-tracking-runs.ts"
import { wrapTextDetailed } from "./text-layout.ts"
import {
  findNearestAxisIndex,
  resolveAxisSizes,
  sumAxisSpan,
} from "./grid-rhythm.ts"

export type AutoFitStyle = {
  size: number
  baselineMultiplier: number
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  opticalKerning: boolean
  trackingScale: number
  trackingRuns: TextTrackingRun[]
}

export type AutoFitPosition = {
  col: number
  row: number
}

export type AutoFitItem = {
  key: string
  text: string
  style: AutoFitStyle
  rowSpan: number
  syllableDivision: boolean
  position: AutoFitPosition
  currentSpan: number
}

export type AutoFitPlannerInput = {
  items: AutoFitItem[]
  scale: number
  gridCols: number
  moduleWidth: number
  moduleHeight: number
  moduleWidths?: number[]
  moduleHeights?: number[]
  moduleRowStarts?: number[]
  gridMarginVertical: number
  gridUnit: number
  marginTop: number
  marginBottom: number
  pageHeight: number
}

export type AutoFitPlannerOutput = {
  spanUpdates: Partial<Record<string, number>>
  positionUpdates: Partial<Record<string, AutoFitPosition>>
}

export function computeAutoFitBatch(
  input: AutoFitPlannerInput,
  measureWidthForStyle: (
    style: AutoFitStyle,
    text: string,
    range?: TextRange,
    sourceText?: string,
  ) => number,
): AutoFitPlannerOutput {
  const output: AutoFitPlannerOutput = {
    spanUpdates: {},
    positionUpdates: {},
  }

  const resolvedModuleWidths = resolveAxisSizes(input.moduleWidths, input.gridCols, input.moduleWidth)
  const resolvedGridRows = Math.max(
    1,
    input.moduleHeights?.length
      ?? input.moduleRowStarts?.length
      ?? 1,
  )
  const resolvedModuleHeights = resolveAxisSizes(input.moduleHeights, resolvedGridRows, input.moduleHeight)
  const fallbackRowStep = Math.max(0.0001, (input.moduleHeight + input.gridMarginVertical) / Math.max(0.0001, input.gridUnit))
  const resolvedModuleRowStarts = (
    input.moduleRowStarts && input.moduleRowStarts.length > 0
      ? input.moduleRowStarts
      : Array.from({ length: resolvedGridRows }, (_, index) => index * fallbackRowStep)
  ).map((value) => Math.max(0, value))

  for (const item of input.items) {
    const trimmed = item.text.trim()
    if (!trimmed) continue

    const baselinePx = input.gridUnit * input.scale
    const lineStep = item.style.baselineMultiplier * baselinePx
    const rowStartIndex = Math.max(
      0,
      Math.min(resolvedGridRows - 1, findNearestAxisIndex(resolvedModuleRowStarts, item.position.row)),
    )
    const moduleHeightPx = sumAxisSpan(
      resolvedModuleHeights,
      rowStartIndex,
      item.rowSpan,
      input.gridMarginVertical,
    ) * input.scale
    let maxLinesPerColumn = Math.max(1, Math.floor(moduleHeightPx / lineStep))

    const contentTop = input.marginTop * input.scale
    const baselineOriginTop = contentTop - baselinePx
    const originY = baselineOriginTop + item.position.row * baselinePx
    const pageBottomY = input.pageHeight * input.scale - input.marginBottom * input.scale
    const firstLineTop = originY + baselinePx
    const availableByPage = Math.max(0, Math.floor((pageBottomY - firstLineTop) / lineStep) + 1)
    maxLinesPerColumn = Math.min(maxLinesPerColumn, availableByPage)
    if (maxLinesPerColumn <= 0) continue

    const fontSize = item.style.size * input.scale
    const startCol = Math.max(0, Math.min(input.gridCols - 1, item.position.col))
    const columnWidth = sumAxisSpan(resolvedModuleWidths, startCol, 1, 0) * input.scale
    const scaledStyle: AutoFitStyle = {
      ...item.style,
      size: fontSize,
    }
    const cachedMeasure = (text: string, range?: TextRange) => (
      measureWidthForStyle(scaledStyle, text, range, item.text)
    )
    const lines = wrapTextDetailed(trimmed, columnWidth, item.syllableDivision, cachedMeasure)
    const neededCols = Math.max(1, Math.ceil(lines.length / maxLinesPerColumn))

    const maxColsFromPlacement = Math.max(
      1,
      input.gridCols - Math.max(0, Math.min(input.gridCols - 1, item.position.col)),
    )
    const nextSpan = Math.max(1, Math.min(neededCols, maxColsFromPlacement))
    if (nextSpan !== item.currentSpan) output.spanUpdates[item.key] = nextSpan
  }

  return output
}
