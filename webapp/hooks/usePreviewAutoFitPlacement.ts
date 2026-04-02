import { useCallback } from "react"
import type { RefObject } from "react"

import type { FontFamily } from "@/lib/config/fonts"
import type { GridResult } from "@/lib/grid-calculator"
import { findNearestAxisIndex, sumAxisSpan } from "@/lib/grid-rhythm"
import { applyCanvasTextConfig, buildCanvasFont } from "@/lib/text-rendering"
import type { ModulePosition } from "@/lib/types/preview-layout"

type Args<Key extends string, StyleKey extends string> = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  result: GridResult
  scale: number
  getGridMetrics: () => {
    moduleWidths: number[]
    moduleHeights: number[]
    rowStartBaselines: number[]
  }
  getWrappedText: (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
    trackingScale: number,
    opticalKerning: boolean,
  ) => string[]
  getBlockFontSize: (key: Key, styleKey: StyleKey) => number
  getBlockFont: (key: Key) => FontFamily
  getBlockFontWeight: (key: Key) => number
  getBlockTrackingScale: (key: Key) => number
  isBlockItalic: (key: Key) => boolean
  isBlockOpticalKerningEnabled: (key: Key) => boolean
}

export function usePreviewAutoFitPlacement<Key extends string, StyleKey extends string>({
  canvasRef,
  result,
  scale,
  getGridMetrics,
  getWrappedText,
  getBlockFontSize,
  getBlockFont,
  getBlockFontWeight,
  getBlockTrackingScale,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
}: Args<Key, StyleKey>) {
  return useCallback(({
    key,
    text,
    styleKey,
    rowSpan,
    reflow,
    syllableDivision,
    fontFamily,
    fontWeight,
    italic,
    opticalKerning,
    trackingScale,
    baselineMultiplierOverride,
    position,
  }: {
      key: Key
      text: string
      styleKey: StyleKey
      rowSpan: number
      reflow: boolean
      syllableDivision: boolean
      fontFamily?: FontFamily
      fontWeight?: number
      italic?: boolean
      opticalKerning?: boolean
      trackingScale?: number
      baselineMultiplierOverride?: number
      position?: ModulePosition | null
  }): { span: number; position: ModulePosition | null } | null => {
    if (!reflow) return null
    const trimmed = text.trim()
    if (!trimmed) return null
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const style = result.typography.styles[styleKey]
    if (!style) return null

    const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
    const metrics = getGridMetrics()
    const baselinePx = gridUnit * scale
    const baselineMultiplier = (
      typeof baselineMultiplierOverride === "number"
      && Number.isFinite(baselineMultiplierOverride)
      && baselineMultiplierOverride > 0
    )
      ? baselineMultiplierOverride
      : style.baselineMultiplier
    const lineStep = baselineMultiplier * baselinePx
    const startRowIndex = position
      ? Math.max(0, Math.min(result.settings.gridRows - 1, findNearestAxisIndex(metrics.rowStartBaselines, position.row)))
      : 0
    const moduleHeightPx = sumAxisSpan(metrics.moduleHeights, startRowIndex, rowSpan, gridMarginVertical) * scale
    let maxLinesPerColumn = Math.max(1, Math.floor(moduleHeightPx / lineStep))

    if (position) {
      const contentTop = margins.top * scale
      const baselineOriginTop = contentTop - baselinePx
      const originY = baselineOriginTop + position.row * baselinePx
      const pageBottomY = result.pageSizePt.height * scale - margins.bottom * scale
      const firstLineTop = originY + baselinePx
      const availableByPage = Math.max(0, Math.floor((pageBottomY - firstLineTop) / lineStep) + 1)
      maxLinesPerColumn = Math.min(maxLinesPerColumn, availableByPage)
    }
    if (maxLinesPerColumn <= 0) return null

    const fontSize = getBlockFontSize(key, styleKey) * scale
    const resolvedFontFamily = fontFamily ?? getBlockFont(key)
    const resolvedFontWeight = fontWeight ?? getBlockFontWeight(key)
    const resolvedItalic = italic ?? isBlockItalic(key)
    const resolvedOpticalKerning = opticalKerning ?? isBlockOpticalKerningEnabled(key)
    const resolvedTrackingScale = trackingScale ?? getBlockTrackingScale(key)
    applyCanvasTextConfig(ctx, {
      font: buildCanvasFont(resolvedFontFamily, resolvedFontWeight, resolvedItalic, fontSize),
      opticalKerning: resolvedOpticalKerning,
    })
    const startCol = position
      ? Math.max(0, Math.min(result.settings.gridCols - 1, position.col))
      : 0
    const columnWidth = sumAxisSpan(metrics.moduleWidths, startCol, 1, gridMarginHorizontal) * scale
    const lines = getWrappedText(
      ctx,
      trimmed,
      columnWidth,
      syllableDivision,
      resolvedTrackingScale,
      resolvedOpticalKerning,
    )
    const neededCols = Math.max(1, Math.ceil(lines.length / maxLinesPerColumn))

    const maxColsFromPlacement = position
      ? Math.max(1, result.settings.gridCols - Math.max(0, Math.min(result.settings.gridCols - 1, position.col)))
      : result.settings.gridCols
    const nextSpan = Math.max(1, Math.min(neededCols, maxColsFromPlacement))
    const nextPosition = position ? { ...position } : null

    return { span: nextSpan, position: nextPosition }
  }, [
    canvasRef,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockFontSize,
    getGridMetrics,
    getWrappedText,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    result.grid,
    result.pageSizePt.height,
    result.settings.gridCols,
    result.settings.gridRows,
    result.typography.styles,
    scale,
  ])
}
