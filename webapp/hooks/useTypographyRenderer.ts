import { useEffect } from "react"
import type { MutableRefObject, RefObject } from "react"

import type { GridResult } from "@/lib/grid-calculator"
import type { FontFamily } from "@/lib/config/fonts"
import { buildAxisStarts, findNearestAxisIndex, resolveAxisSizes } from "@/lib/grid-rhythm"
import {
  resolveGridColumnStarts,
  resolveGridFirstColumnStep,
} from "@/lib/grid-column-layout"
import { resolvePreviewColumnX } from "@/lib/preview-column-snap"
import { clampFreePlacementRow, clampLayerColumn, resolveLayerColumnBounds } from "@/lib/layer-placement"
import type { TextFormatRun, BaseTextFormat } from "@/lib/text-format-runs"
import {
  buildCanvasImagePlans,
  buildCanvasTypographyRenderPlans,
  buildOrderedCanvasLayerKeys,
  drawCanvasImagePlan,
  drawCanvasTextPlan,
  drawCanvasLayerStack,
  type CanvasImageRenderPlan,
} from "@/lib/canvas-page-renderer"
import type { DocumentVariableContext } from "@/lib/document-variable-text"
import type { BlockRect, BlockRenderPlan, TextAlignMode, TextVerticalAlignMode } from "@/lib/preview-types"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"
import type { ModulePosition } from "@/lib/types/layout-primitives"
import type { WrappedTextLine } from "@/lib/text-layout"

type DragState<BlockId extends string> = {
  key: BlockId
  preview: ModulePosition
  copyOnDrop: boolean
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
  documentVariableContext?: DocumentVariableContext | null
  styleAssignments: Record<BlockId, keyof GridResult["typography"]["styles"]>
  blockTextAlignments: Partial<Record<BlockId, TextAlignMode>>
  blockVerticalAlignments: Partial<Record<BlockId, TextVerticalAlignMode>>
  blockModulePositions: Partial<Record<BlockId, ModulePosition>>
  imageModulePositions: Partial<Record<BlockId, ModulePosition>>
  dragState: DragState<BlockId> | null
  getBlockFont: (key: BlockId) => FontFamily
  getBlockFontWeight: (key: BlockId) => number
  getBlockTrackingScale: (key: BlockId) => number
  getBlockTrackingRuns: (key: BlockId) => TextTrackingRun[]
  getBlockTextFormatRuns: (key: BlockId, color: string) => TextFormatRun<keyof GridResult["typography"]["styles"], FontFamily>[]
  isBlockItalic: (key: BlockId) => boolean
  isBlockOpticalKerningEnabled: (key: BlockId) => boolean
  getBlockRotation: (key: BlockId) => number
  getBlockSpan: (key: BlockId) => number
  getBlockRows: (key: BlockId) => number
  getBlockHeightBaselines: (key: BlockId) => number
  getBlockFontSize: (key: BlockId, styleKey: keyof GridResult["typography"]["styles"]) => number
  getBlockBaselineMultiplier: (key: BlockId, styleKey: keyof GridResult["typography"]["styles"]) => number
  getBlockTextColor: (key: BlockId) => string
  getImageSpan: (key: BlockId) => number
  getImageRows: (key: BlockId) => number
  getImageHeightBaselines: (key: BlockId) => number
  getImageColor: (key: BlockId) => string
  getImageOpacity: (key: BlockId) => number
  getImageRotation: (key: BlockId) => number
  isImageSnapToColumnsEnabled: (key: BlockId) => boolean
  isImageSnapToBaselineEnabled: (key: BlockId) => boolean
  isTextReflowEnabled: (key: BlockId) => boolean
  isSyllableDivisionEnabled: (key: BlockId) => boolean
  isSnapToColumnsEnabled: (key: BlockId) => boolean
  isSnapToBaselineEnabled: (key: BlockId) => boolean
  getWrappedText: (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
    trackingScale: number,
    opticalKerning: boolean,
    trackingRuns?: readonly TextTrackingRun[],
    baseFormat?: BaseTextFormat<keyof GridResult["typography"]["styles"], FontFamily>,
    formatRuns?: readonly TextFormatRun<keyof GridResult["typography"]["styles"], FontFamily>[],
    resolveFontSize?: (styleKey: keyof GridResult["typography"]["styles"]) => number,
  ) => WrappedTextLine[]
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
  onPlansCommit?: () => void
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
  documentVariableContext = null,
  styleAssignments,
  blockTextAlignments,
  blockVerticalAlignments,
  blockModulePositions,
  imageModulePositions,
  dragState,
  getBlockFont,
  getBlockFontWeight,
  getBlockTrackingScale,
  getBlockTrackingRuns,
  getBlockTextFormatRuns,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  getBlockRotation,
  getBlockSpan,
  getBlockRows,
  getBlockHeightBaselines,
  getBlockFontSize,
  getBlockBaselineMultiplier,
  getBlockTextColor,
  getImageSpan,
  getImageRows,
  getImageHeightBaselines,
  getImageColor,
  getImageOpacity,
  getImageRotation,
  isImageSnapToColumnsEnabled,
  isImageSnapToBaselineEnabled,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isSnapToColumnsEnabled,
  isSnapToBaselineEnabled,
  getWrappedText,
  getOpticalOffset,
  onOverflowLinesChange,
  onCanvasReady,
  onPlansCommit,
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
      const colStarts = resolveGridColumnStarts(result, moduleWidths)
      const rowStarts = buildAxisStarts(moduleHeights, gridMarginVertical)
      const rowStartsInBaselines = rowStarts.map((value) => value / Math.max(0.0001, gridUnit))
      const firstColumnStep = resolveGridFirstColumnStep(moduleWidths, colStarts, gridMarginHorizontal, modW)
      const toColumnX = (col: number) => {
        return contentLeft + resolvePreviewColumnX(col, colStarts, firstColumnStep) * scale
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
      let imagePlans = new Map<BlockId, CanvasImageRenderPlan>()
      let dragPreviewImagePlan: CanvasImageRenderPlan | null = null
      let dragPreviewTextPlan: BlockRenderPlan<BlockId> | null = null
      const textDuplicatePreviewKey = dragState?.copyOnDrop && blockOrder.includes(dragState.key)
        ? dragState.key
        : null

      const resolveTextManualPosition = (key: BlockId, dragPreviewOverride?: ModulePosition) => {
        if (dragPreviewOverride && textDuplicatePreviewKey === key) return dragPreviewOverride
        if (textDuplicatePreviewKey === key) return blockModulePositions[key]
        return dragState?.key === key ? dragState.preview : blockModulePositions[key]
      }

      const getOriginForBlock = (key: BlockId, fallbackX: number, fallbackY: number) => {
        const manual = resolveTextManualPosition(key)
        if (!manual) return { x: fallbackX, y: fallbackY }
        const span = getBlockSpan(key)
        const clamped = {
          col: clampLayerColumn(manual.col, {
            span,
            gridCols,
            snapToColumns: isSnapToColumnsEnabled(key),
          }),
          row: clampFreePlacementRow(manual.row, maxBaselineRow),
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
          getImageHeightBaselines,
          getImageColor,
          getImageOpacity,
          getImageRotation,
          isImageSnapToColumnsEnabled,
          isImageSnapToBaselineEnabled,
          toColumnX,
          baselineOriginTop,
          baselineStep,
          maxBaselineRow,
          gridCols,
          rowStartsInBaselines,
          gridRows,
          moduleWidths,
          moduleHeights,
          columnStarts: colStarts,
          gridMarginHorizontal,
          gridMarginVertical,
          scale,
        })
        imagePlans = imageRenderState.imagePlans
        imageRectsRef.current = imageRenderState.imageRects
        dragPreviewImagePlan = imageRenderState.dragPreviewImagePlan
      }

      if (showTypography) {
        const buildTextRenderState = (
          keys: BlockId[],
          dragPreviewOverride?: ModulePosition,
        ) => buildCanvasTypographyRenderPlans<BlockId, keyof GridResult["typography"]["styles"]>({
          ctx,
          blockOrder: keys,
          textContent,
          documentVariableContext,
          styleAssignments,
          styles,
          blockTextAlignments,
          blockVerticalAlignments,
          contentTop,
          contentLeft,
          pageHeight,
          marginsBottom: margins.bottom * scale,
          baselineStep: baselinePx,
          moduleWidth: modW * scale,
          moduleHeight: modH * scale,
          moduleWidths: moduleWidths.map((value) => value * scale),
          moduleHeights: moduleHeights.map((value) => value * scale),
          columnStarts: colStarts.map((value) => value * scale),
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
          getBlockHeightBaselines,
          getBlockFontSize,
          getBlockBaselineMultiplier,
          getBlockRotation,
          isTextReflowEnabled,
          isSyllableDivisionEnabled,
          isBlockPositionManual: (key) => (
            dragPreviewOverride && textDuplicatePreviewKey === key
              ? true
              : blockModulePositions[key] !== undefined
          ),
          getBlockColumnStart: (key, span) => {
            const manual = resolveTextManualPosition(key, dragPreviewOverride)
            if (!manual) return 0
            const { minCol } = resolveLayerColumnBounds({
              span,
              gridCols,
              snapToColumns: isSnapToColumnsEnabled(key),
            })
            const rawCol = isSnapToColumnsEnabled(key) ? manual.col : Math.round(manual.col)
            return Math.max(minCol, Math.min(Math.max(0, gridCols - 1), rawCol))
          },
          getBlockRowStart: (key) => {
            const manual = resolveTextManualPosition(key, dragPreviewOverride)
            if (!manual) return 0
            return toClosestRowIndex(manual.row)
          },
          getOriginForBlock: (key, fallbackX, fallbackY) => {
            const manual = resolveTextManualPosition(key, dragPreviewOverride)
            if (!manual) return getOriginForBlock(key, fallbackX, fallbackY)
            const span = getBlockSpan(key)
            const clamped = {
              col: clampLayerColumn(manual.col, {
                span,
                gridCols,
                snapToColumns: isSnapToColumnsEnabled(key),
              }),
              row: clampFreePlacementRow(manual.row, maxBaselineRow),
            }
            return {
              x: toColumnX(clamped.col),
              y: baselineOriginTop + clamped.row * baselineStep,
            }
          },
          getBlockFont: (key) => getBlockFont(key),
          getBlockFontWeight: (key) => getBlockFontWeight(key),
          isBlockItalic: (key) => isBlockItalic(key),
          isBlockOpticalKerningEnabled,
          getBlockTrackingScale,
          getBlockTrackingRuns,
          getBlockTextFormatRuns,
          getBlockTextColor,
          getWrappedText,
          getOpticalOffset: (context, key, styleKey, line, align, fontSize, opticalKerning) => (
            getOpticalOffset(context, styleKey, line, align, fontSize, opticalKerning)
          ),
        })
        const typographyRenderState = buildTextRenderState(blockOrder)
        draftPlans = typographyRenderState.textPlans
        blockRectsRef.current = typographyRenderState.blockRects
        Object.assign(overflowByBlock, typographyRenderState.overflowByBlock)
        if (textDuplicatePreviewKey && dragState) {
          const duplicatePreviewState = buildTextRenderState([textDuplicatePreviewKey], dragState.preview)
          dragPreviewTextPlan = duplicatePreviewState.textPlans.get(textDuplicatePreviewKey) ?? null
        }
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
      if (dragPreviewImagePlan) {
        drawCanvasImagePlan(bufferCtx, dragPreviewImagePlan)
      }
      if (dragPreviewTextPlan) {
        drawCanvasTextPlan(bufferCtx, dragPreviewTextPlan)
      }
      bufferCtx.restore()

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(typographyBuffer, 0, 0)
      previousPlansRef.current = draftPlans
      onPlansCommit?.()
      endDrawMark()
      recordPerfMetric("drawMs", performance.now() - drawStartedAt)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    blockModulePositions,
    blockOrder,
    blockRectsRef,
    blockTextAlignments,
    blockVerticalAlignments,
    canvasRef,
    dragState,
    documentVariableContext,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    getBlockRotation,
    getBlockRows,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    getBlockSpan,
    getImageColor,
    getImageRows,
    getImageRotation,
    getImageSpan,
    isImageSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
    getOpticalOffset,
    getWrappedText,
    imageModulePositions,
    imageOrder,
    imageRectsRef,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isSnapToBaselineEnabled,
    isSnapToColumnsEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    layerOrder,
    onCanvasReady,
    onPlansCommit,
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
