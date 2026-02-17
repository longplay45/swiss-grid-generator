import { wrapText } from "./text-layout.ts"

export type AutoFitStyle = {
  size: number
  baselineMultiplier: number
  weight: string
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
  measureWidthForFont: (font: string, text: string) => number,
): AutoFitPlannerOutput {
  const output: AutoFitPlannerOutput = {
    spanUpdates: {},
    positionUpdates: {},
  }

  for (const item of input.items) {
    const trimmed = item.text.trim()
    if (!trimmed) continue

    const baselinePx = input.gridUnit * input.scale
    const lineStep = item.style.baselineMultiplier * baselinePx
    const moduleHeightPx = item.rowSpan * input.moduleHeight * input.scale
      + Math.max(item.rowSpan - 1, 0) * input.gridMarginVertical * input.scale
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
    const fontSpec = `${item.style.weight === "Bold" ? "700" : "400"} ${fontSize}px Inter, system-ui, -apple-system, sans-serif`
    const columnWidth = input.moduleWidth * input.scale
    const cachedMeasure = (text: string) => measureWidthForFont(fontSpec, text)
    const lines = wrapText(trimmed, columnWidth, item.syllableDivision, cachedMeasure)
    const neededCols = Math.max(1, Math.ceil(lines.length / maxLinesPerColumn))

    const maxColsFromPlacement = Math.max(
      1,
      input.gridCols - Math.max(0, Math.min(input.gridCols - 1, item.position.col)),
    )
    const nextSpan = Math.max(1, Math.min(neededCols, maxColsFromPlacement))
    const nextPosition = {
      col: Math.max(0, Math.min(Math.max(0, input.gridCols - nextSpan), item.position.col)),
      row: item.position.row,
    }

    if (nextSpan !== item.currentSpan) output.spanUpdates[item.key] = nextSpan
    if (nextPosition.col !== item.position.col || nextPosition.row !== item.position.row) {
      output.positionUpdates[item.key] = nextPosition
    }
  }

  return output
}
