import { useEffect } from "react"
import type { MutableRefObject, RefObject } from "react"

import type { GridResult } from "@/lib/grid-calculator"
import type { FontFamily } from "@/lib/config/fonts"
import { buildAxisStarts, findNearestAxisIndex, resolveAxisSizes, sumAxisSpan } from "@/lib/grid-rhythm"
import {
  buildCanvasImagePlans,
  buildCanvasTypographyRenderPlans,
  buildOrderedCanvasLayerKeys,
  drawCanvasLayerStack,
} from "@/lib/canvas-page-renderer"
import type { BlockRect, BlockRenderPlan, TextAlignMode } from "@/lib/preview-types"
import type { ModulePosition } from "@/lib/types/layout-primitives"

type DragState<BlockId extends string> = {
  key: BlockId
  preview: ModulePosition
}

type Args<BlockId extends string> = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  blockRectsRef: MutableRefObject<Record<BlockId, BlockRect>>
  imageRectsRef: MutableRefObject<Record<BlockId, BlockRect>>
  typographyBufferRef: MutableRefObject<HTMLCanvasElement | null>
  previousPlansRef: MutableRefObject<Map<BlockId, BlockRenderPlan<BlockId>>>
  typographyBufferTransformRef: MutableRefObject<string>
  result: GridResult
  scale: number
  pixelRatio: number
  fontRenderEpoch: number
  rotation: number
  showTypography: boolean
  showImagePlaceholders: boolean
  blockOrder: BlockId[]
  imageOrder: BlockId[]
  layerOrder: BlockId[]
  textContent: Record<BlockId, string>
  styleAssignments: Record<BlockId, keyof GridResult["typography"]["styles"]>
  blockTextAlignments: Partial<Record<BlockId, TextAlignMode>>
  blockModulePositions: Partial<Record<BlockId, ModulePosition>>
  imageModulePositions: Partial<Record<BlockId, ModulePosition>>
  dragState: DragState<BlockId> | null
  getBlockFont: (key: BlockId) => FontFamily
  getBlockFontWeight: (key: BlockId) => number
  getBlockTrackingScale: (key: BlockId) => number
  isBlockItalic: (key: BlockId) => boolean
  isBlockOpticalKerningEnabled: (key: BlockId) => boolean
  getBlockRotation: (key: BlockId) => number
  getBlockSpan: (key: BlockId) => number
  getBlockRows: (key: BlockId) => number
  getBlockFontSize: (key: BlockId, styleKey: keyof GridResult["typography"]["styles"]) => number
  getBlockBaselineMultiplier: (key: BlockId, styleKey: keyof GridResult["typography"]["styles"]) => number
  getBlockTextColor: (key: BlockId) => string
  getImageSpan: (key: BlockId) => number
  getImageRows: (key: BlockId) => number
  getImageColor: (key: BlockId) => string
  clampImageBaselinePosition: (position: ModulePosition, columns: number) => ModulePosition
  isTextReflowEnabled: (key: BlockId) => boolean
  isSyllableDivisionEnabled: (key: BlockId) => boolean
  getWrappedText: (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
    trackingScale: number,
    opticalKerning: boolean,
  ) => string[]
  getOpticalOffset: (
    ctx: CanvasRenderingContext2D,
    styleKey: keyof GridResult["typography"]["styles"],
    line: string,
    align: TextAlignMode,
    fontSize: number,
    opticalKerning: boolean,
  ) => number
  onOverflowLinesChange?: (overflowByBlock: Partial<Record<BlockId, number>>) => void
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  recordPerfMetric: (metric: "drawMs", valueMs: number) => void
}

export function useTypographyRenderer<BlockId extends string>({
  canvasRef,
  blockRectsRef,
  imageRectsRef,
  typographyBufferRef,
  previousPlansRef,
  typographyBufferTransformRef,
  result,
  scale,
  pixelRatio,
  fontRenderEpoch,
  rotation,
  showTypography,
  showImagePlaceholders,
  blockOrder,
  imageOrder,
  layerOrder,
  textContent,
  styleAssignments,
  blockTextAlignments,
  blockModulePositions,
  imageModulePositions,
  dragState,
  getBlockFont,
  getBlockFontWeight,
  getBlockTrackingScale,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  getBlockRotation,
  getBlockSpan,
  getBlockRows,
  getBlockFontSize,
  getBlockBaselineMultiplier,
  getBlockTextColor,
  getImageSpan,
  getImageRows,
  getImageColor,
  clampImageBaselinePosition,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  getWrappedText,
  getOpticalOffset,
  onOverflowLinesChange,
  onCanvasReady,
  recordPerfMetric,
}: Args<BlockId>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)

    const frame = window.requestAnimationFrame(() => {
      const drawStartedAt = performance.now()
      const drawMarkName = "sgg:draw"
      if (typeof performance.mark === "function") performance.mark(`${drawMarkName}:start`)
      const endDrawMark = () => {
        if (typeof performance.mark !== "function" || typeof performance.measure !== "function") return
        performance.mark(`${drawMarkName}:end`)
        try {
          performance.measure(drawMarkName, `${drawMarkName}:start`, `${drawMarkName}:end`)
        } catch {
          // Ignore missing/invalid marks.
        }
      }
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        endDrawMark()
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }
      const canvasCssWidth = canvas.width / pixelRatio
      const canvasCssHeight = canvas.height / pixelRatio

      const { width, height } = result.pageSizePt
      const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
      const { width: modW, height: modH } = result.module
      const { gridCols, gridRows } = result.settings
      const pageWidth = width * scale
      const pageHeight = height * scale

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, canvasCssWidth, canvasCssHeight)
      blockRectsRef.current = {} as Record<BlockId, BlockRect>
      imageRectsRef.current = {} as Record<BlockId, BlockRect>
      const overflowByBlock: Partial<Record<BlockId, number>> = {}

      const { styles } = result.typography
      const contentTop = margins.top * scale
      const contentLeft = margins.left * scale
      const baselinePx = gridUnit * scale
      const baselineStep = gridUnit * scale
      const baselineOriginTop = contentTop - baselineStep
      const moduleWidths = resolveAxisSizes(result.module.widths, gridCols, modW)
      const moduleHeights = resolveAxisSizes(result.module.heights, gridRows, modH)
      const colStarts = buildAxisStarts(moduleWidths, gridMarginHorizontal)
      const rowStarts = buildAxisStarts(moduleHeights, gridMarginVertical)
      const rowStartsInBaselines = rowStarts.map((value) => value / Math.max(0.0001, gridUnit))
      const firstColumnStep = (moduleWidths[0] ?? modW) + gridMarginHorizontal
      const toColumnX = (col: number) => {
        if (col < 0) return contentLeft + col * firstColumnStep * scale
        const start = colStarts[col] ?? col * firstColumnStep
        return contentLeft + start * scale
      }
      const toClosestRowIndex = (rowInBaselines: number) => {
        if (!rowStartsInBaselines.length) return 0
        return findNearestAxisIndex(rowStartsInBaselines, rowInBaselines)
      }
      const maxBaselineRow = Math.max(
        0,
        Math.floor((pageHeight - (margins.top + margins.bottom) * scale) / baselineStep),
      )
      const minBaselineRow = -maxBaselineRow
      const gutterX = gridMarginHorizontal * scale
      let draftPlans = new Map<BlockId, BlockRenderPlan<BlockId>>()
      let imagePlans = new Map<BlockId, { rect: BlockRect; color: string }>()

      const getOriginForBlock = (key: BlockId, fallbackX: number, fallbackY: number) => {
        const dragged = dragState?.key === key ? dragState.preview : undefined
        const manual = dragged ?? blockModulePositions[key]
        if (!manual) return { x: fallbackX, y: fallbackY }
        const span = getBlockSpan(key)
        const minCol = -Math.max(0, span - 1)
        const clamped = {
          col: Math.max(minCol, Math.min(Math.max(0, gridCols - 1), manual.col)),
          row: Math.max(minBaselineRow, Math.min(maxBaselineRow, manual.row)),
        }
        return {
          x: toColumnX(clamped.col),
          y: baselineOriginTop + clamped.row * baselineStep,
        }
      }

      if (showImagePlaceholders) {
        const imageRenderState = buildCanvasImagePlans({
          imageOrder,
          imageModulePositions,
          dragState,
          getImageSpan,
          getImageRows,
          getImageColor,
          clampImageBaselinePosition,
          toColumnX,
          baselineOriginTop,
          baselineStep,
          rowStartsInBaselines,
          gridRows,
          moduleWidths,
          moduleHeights,
          gridMarginHorizontal,
          gridMarginVertical,
          scale,
        })
        imagePlans = imageRenderState.imagePlans
        imageRectsRef.current = imageRenderState.imageRects
      }

      if (showTypography) {
        const typographyRenderState = buildCanvasTypographyRenderPlans<BlockId, keyof GridResult["typography"]["styles"]>({
          ctx,
          blockOrder,
          textContent,
          styleAssignments,
          styles,
          blockTextAlignments,
          contentTop,
          contentLeft,
          pageHeight,
          marginsBottom: margins.bottom * scale,
          baselineStep: baselinePx,
          moduleWidth: modW * scale,
          moduleHeight: modH * scale,
          moduleWidths: moduleWidths.map((value) => value * scale),
          moduleHeights: moduleHeights.map((value) => value * scale),
          gutterX,
          gutterY: gridMarginVertical * scale,
          gridRows,
          gridCols,
          fontScale: scale,
          bodyKey: "body" as BlockId,
          displayKey: "display" as BlockId,
          captionKey: "caption" as BlockId,
          defaultBodyStyleKey: "body",
          defaultCaptionStyleKey: "caption",
          getBlockSpan,
          getBlockRows,
          getBlockFontSize,
          getBlockBaselineMultiplier,
          getBlockRotation,
          isTextReflowEnabled,
          isSyllableDivisionEnabled,
          isBlockPositionManual: (key) => blockModulePositions[key] !== undefined,
          getBlockColumnStart: (key, span) => {
            const manual = (dragState?.key === key ? dragState.preview : blockModulePositions[key])
            if (!manual) return 0
            const minCol = -Math.max(0, span - 1)
            return Math.max(minCol, Math.min(Math.max(0, gridCols - 1), manual.col))
          },
          getBlockRowStart: (key) => {
            const manual = (dragState?.key === key ? dragState.preview : blockModulePositions[key])
            if (!manual) return 0
            return toClosestRowIndex(manual.row)
          },
          getOriginForBlock,
          getBlockFont: (key) => getBlockFont(key),
          getBlockFontWeight: (key) => getBlockFontWeight(key),
          isBlockItalic: (key) => isBlockItalic(key),
          isBlockOpticalKerningEnabled,
          getBlockTrackingScale,
          getBlockTextColor,
          getWrappedText,
          getOpticalOffset: (context, key, styleKey, line, align, fontSize, opticalKerning) => (
            getOpticalOffset(context, styleKey, line, align, fontSize, opticalKerning)
          ),
        })
        draftPlans = typographyRenderState.textPlans
        blockRectsRef.current = typographyRenderState.blockRects
        Object.assign(overflowByBlock, typographyRenderState.overflowByBlock)
      } else {
        previousPlansRef.current.clear()
      }

      onOverflowLinesChange?.(overflowByBlock)

      if (!showTypography && imagePlans.size === 0) {
        endDrawMark()
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }

      let typographyBuffer = typographyBufferRef.current
      if (!typographyBuffer) {
        typographyBuffer = document.createElement("canvas")
        typographyBufferRef.current = typographyBuffer
      }
      const resized = typographyBuffer.width !== canvas.width || typographyBuffer.height !== canvas.height
      if (resized) {
        typographyBuffer.width = canvas.width
        typographyBuffer.height = canvas.height
        previousPlansRef.current.clear()
      }
      const transformSignature = `${rotation}|${pageWidth.toFixed(4)}|${pageHeight.toFixed(4)}`
      const transformChanged = typographyBufferTransformRef.current !== transformSignature
      if (transformChanged) {
        typographyBufferTransformRef.current = transformSignature
        previousPlansRef.current.clear()
      }
      const bufferCtx = typographyBuffer.getContext("2d")
      if (!bufferCtx) {
        endDrawMark()
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }
      const bufferCssWidth = typographyBuffer.width / pixelRatio
      const bufferCssHeight = typographyBuffer.height / pixelRatio

      const orderedKeys = buildOrderedCanvasLayerKeys(
        layerOrder,
        imageOrder,
        blockOrder,
        imagePlans,
        draftPlans,
      )

      bufferCtx.setTransform(1, 0, 0, 1, 0, 0)
      bufferCtx.clearRect(0, 0, typographyBuffer.width, typographyBuffer.height)
      bufferCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      bufferCtx.save()
      bufferCtx.translate(bufferCssWidth / 2, bufferCssHeight / 2)
      bufferCtx.rotate((rotation * Math.PI) / 180)
      bufferCtx.translate(-pageWidth / 2, -pageHeight / 2)
      drawCanvasLayerStack(bufferCtx, orderedKeys, imagePlans, draftPlans)
      bufferCtx.restore()

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(typographyBuffer, 0, 0)
      previousPlansRef.current = draftPlans
      endDrawMark()
      recordPerfMetric("drawMs", performance.now() - drawStartedAt)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    blockModulePositions,
    blockOrder,
    blockRectsRef,
    blockTextAlignments,
    canvasRef,
    clampImageBaselinePosition,
    dragState,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockRotation,
    getBlockRows,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    getBlockSpan,
    getImageColor,
    getImageRows,
    getImageSpan,
    getOpticalOffset,
    getWrappedText,
    imageModulePositions,
    imageOrder,
    imageRectsRef,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    layerOrder,
    onCanvasReady,
    onOverflowLinesChange,
    previousPlansRef,
    recordPerfMetric,
    result,
    fontRenderEpoch,
    rotation,
    scale,
    pixelRatio,
    showImagePlaceholders,
    showTypography,
    styleAssignments,
    textContent,
    typographyBufferRef,
    typographyBufferTransformRef,
  ])
}
