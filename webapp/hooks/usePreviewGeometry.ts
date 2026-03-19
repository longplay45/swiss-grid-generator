import { useCallback } from "react"
import type { RefObject } from "react"

import type { GridResult } from "@/lib/grid-calculator"
import {
  buildAxisStarts,
  findAxisIndexAtOffset,
  findNearestAxisIndex,
  resolveAxisSizes,
} from "@/lib/grid-rhythm"
import type { ModulePosition } from "@/lib/types/preview-layout"

type PagePoint = {
  x: number
  y: number
}

export type PreviewGridMetrics = {
  contentLeft: number
  contentTop: number
  moduleWidth: number
  moduleHeight: number
  moduleWidths: number[]
  moduleHeights: number[]
  colStarts: number[]
  rowStarts: number[]
  rowStartBaselines: number[]
  xStep: number
  yStep: number
  gridCols: number
  gridRows: number
  maxBaselineRow: number
  gutterX: number
  baselineStep: number
  baselineOriginTop: number
  moduleYStep: number
  getColumnX: (col: number) => number
  getNearestCol: (pageX: number) => number
  getNearestRowIndex: (pageY: number) => number
  getRowStartBaseline: (rowIndex: number) => number
}

type Args = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  result: GridResult
  scale: number
  pixelRatio: number
  rotation: number
}

export function usePreviewGeometry({
  canvasRef,
  result,
  scale,
  pixelRatio,
  rotation,
}: Args) {
  const getGridMetrics = useCallback((): PreviewGridMetrics => {
    const { margins, gridMarginHorizontal, gridMarginVertical, gridUnit } = result.grid
    const { width: modW, height: modH } = result.module
    const { gridCols, gridRows } = result.settings
    const contentHeight = (result.pageSizePt.height - margins.top - margins.bottom) * scale
    const baselineStep = gridUnit * scale
    const moduleWidths = resolveAxisSizes(result.module.widths, gridCols, modW)
    const moduleHeights = resolveAxisSizes(result.module.heights, gridRows, modH)
    const colStarts = buildAxisStarts(moduleWidths, gridMarginHorizontal)
    const rowStarts = buildAxisStarts(moduleHeights, gridMarginVertical)
    const rowStartBaselines = rowStarts.map((value) => value / Math.max(0.0001, gridUnit))
    const firstColumnStep = (moduleWidths[0] ?? modW) + gridMarginHorizontal
    const firstRowStep = (moduleHeights[0] ?? modH) + gridMarginVertical

    const getColumnX = (col: number) => (
      col < 0
        ? margins.left * scale + col * firstColumnStep * scale
        : margins.left * scale + (colStarts[col] ?? col * firstColumnStep) * scale
    )
    const getNearestCol = (pageX: number) => {
      const relative = (pageX - margins.left * scale) / Math.max(scale, 0.0001)
      return findNearestAxisIndex(colStarts, relative)
    }
    const getNearestRowIndex = (pageY: number) => {
      const relative = (pageY - margins.top * scale) / Math.max(scale, 0.0001)
      return findNearestAxisIndex(rowStarts, relative)
    }
    const getRowStartBaseline = (rowIndex: number) => rowStartBaselines[rowIndex] ?? 0
    const maxBaselineRow = Math.max(0, Math.floor(contentHeight / baselineStep))

    return {
      contentLeft: margins.left * scale,
      contentTop: margins.top * scale,
      moduleWidth: (moduleWidths[0] ?? modW) * scale,
      moduleHeight: (moduleHeights[0] ?? modH) * scale,
      moduleWidths,
      moduleHeights,
      colStarts,
      rowStarts,
      rowStartBaselines,
      xStep: firstColumnStep * scale,
      yStep: baselineStep,
      gridCols,
      gridRows,
      maxBaselineRow,
      gutterX: gridMarginHorizontal * scale,
      baselineStep,
      baselineOriginTop: margins.top * scale - baselineStep,
      moduleYStep: firstRowStep * scale,
      getColumnX,
      getNearestCol,
      getNearestRowIndex,
      getRowStartBaseline,
    }
  }, [result.grid, result.module, result.pageSizePt.height, result.settings, scale])

  const toPagePoint = useCallback((canvasX: number, canvasY: number): PagePoint | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const pageWidth = result.pageSizePt.width * scale
    const pageHeight = result.pageSizePt.height * scale
    const centerCanvasX = canvas.width / (2 * pixelRatio)
    const centerCanvasY = canvas.height / (2 * pixelRatio)
    const theta = (rotation * Math.PI) / 180
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    const dx = canvasX - centerCanvasX
    const dy = canvasY - centerCanvasY

    return {
      x: dx * cos + dy * sin + pageWidth / 2,
      y: -dx * sin + dy * cos + pageHeight / 2,
    }
  }, [canvasRef, pixelRatio, result.pageSizePt.height, result.pageSizePt.width, rotation, scale])

  const toPagePointFromClient = useCallback((clientX: number, clientY: number): PagePoint | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return toPagePoint(clientX - rect.left, clientY - rect.top)
  }, [canvasRef, toPagePoint])

  const clampImageBaselinePosition = useCallback((
    position: ModulePosition,
    columns: number,
  ): ModulePosition => {
    const metrics = getGridMetrics()
    const safeCols = Math.max(1, Math.min(result.settings.gridCols, columns))
    const minCol = -Math.max(0, safeCols - 1)
    const maxCol = Math.max(0, metrics.gridCols - 1)
    const minRow = -Math.max(0, metrics.maxBaselineRow)
    return {
      col: Math.max(minCol, Math.min(maxCol, position.col)),
      row: Math.max(minRow, Math.min(metrics.maxBaselineRow, position.row)),
    }
  }, [getGridMetrics, result.settings.gridCols])

  const clampImageModulePosition = useCallback((
    position: ModulePosition,
    columns: number,
    rows: number,
  ): ModulePosition => {
    const metrics = getGridMetrics()
    const safeCols = Math.max(1, Math.min(result.settings.gridCols, columns))
    const safeRows = Math.max(1, Math.min(result.settings.gridRows, rows))
    const maxCol = Math.max(0, metrics.gridCols - safeCols)
    const maxRowStartIndex = Math.max(0, result.settings.gridRows - safeRows)
    const maxRow = metrics.rowStartBaselines[maxRowStartIndex] ?? 0
    return {
      col: Math.max(0, Math.min(maxCol, position.col)),
      row: Math.max(0, Math.min(maxRow, position.row)),
    }
  }, [getGridMetrics, result.settings.gridCols, result.settings.gridRows])

  const resolveModulePositionAtPagePoint = useCallback((pageX: number, pageY: number): ModulePosition | null => {
    const metrics = getGridMetrics()
    const relativeX = (pageX - metrics.contentLeft) / Math.max(scale, 0.0001)
    const relativeY = (pageY - metrics.contentTop) / Math.max(scale, 0.0001)
    const col = findAxisIndexAtOffset(metrics.colStarts, metrics.moduleWidths, relativeX)
    const rowIndex = findAxisIndexAtOffset(metrics.rowStarts, metrics.moduleHeights, relativeY)
    if (
      col < 0
      || col >= result.settings.gridCols
      || rowIndex < 0
      || rowIndex >= result.settings.gridRows
    ) {
      return null
    }

    const moduleX = metrics.contentLeft + (metrics.colStarts[col] ?? 0) * scale
    const moduleY = metrics.contentTop + (metrics.rowStarts[rowIndex] ?? 0) * scale
    const moduleWidth = (metrics.moduleWidths[col] ?? metrics.moduleWidth / Math.max(scale, 0.0001)) * scale
    const moduleHeight = (metrics.moduleHeights[rowIndex] ?? metrics.moduleHeight / Math.max(scale, 0.0001)) * scale
    const localX = pageX - moduleX
    const localY = pageY - moduleY

    if (localX < 0 || localX > moduleWidth || localY < 0 || localY > moduleHeight) {
      return null
    }

    return {
      col,
      row: metrics.rowStartBaselines[rowIndex] ?? 0,
    }
  }, [getGridMetrics, result.settings.gridCols, result.settings.gridRows, scale])

  return {
    getGridMetrics,
    toPagePoint,
    toPagePointFromClient,
    clampImageBaselinePosition,
    clampImageModulePosition,
    resolveModulePositionAtPagePoint,
  }
}
