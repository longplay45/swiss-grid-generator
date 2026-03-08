import { useEffect } from "react"
import type { MutableRefObject, RefObject } from "react"

import type { GridResult } from "@/lib/grid-calculator"
import { getFontFamilyCss, type FontFamily } from "@/lib/config/fonts"
import { buildAxisStarts, findNearestAxisIndex, resolveAxisSizes, sumAxisSpan } from "@/lib/grid-rhythm"
import { buildTypographyLayoutPlan } from "@/lib/typography-layout-plan"

type TextAlignMode = "left" | "right"

type BlockRect = {
  x: number
  y: number
  width: number
  height: number
}

type ModulePosition = {
  col: number
  row: number
}

type TextDrawCommand = {
  text: string
  x: number
  y: number
}

type BlockRenderPlan<BlockId extends string> = {
  key: BlockId
  rect: BlockRect
  signature: string
  font: string
  textColor: string
  textAlign: TextAlignMode
  blockRotation: number
  rotationOriginX: number
  rotationOriginY: number
  commands: TextDrawCommand[]
}

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
  isBlockItalic: (key: BlockId) => boolean
  isBlockBold: (key: BlockId) => boolean
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
  getWrappedText: (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, hyphenate: boolean) => string[]
  getOpticalOffset: (ctx: CanvasRenderingContext2D, line: string, align: TextAlignMode, fontSize: number) => number
  onOverflowLinesChange?: (overflowByBlock: Partial<Record<BlockId, number>>) => void
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  recordPerfMetric: (metric: "drawMs", valueMs: number) => void
}

function getTextAscentPx(ctx: CanvasRenderingContext2D, fallbackFontSizePx: number): number {
  const metrics = ctx.measureText("Hg")
  return metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : fallbackFontSizePx * 0.8
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
  isBlockItalic,
  isBlockBold,
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
      const draftPlans = new Map<BlockId, BlockRenderPlan<BlockId>>()
      const imagePlans = new Map<BlockId, { rect: BlockRect; color: string }>()

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
        for (const key of imageOrder) {
          const basePosition = imageModulePositions[key]
          const position = dragState?.key === key ? dragState.preview : basePosition
          if (!position) continue
          const columns = getImageSpan(key)
          const rows = getImageRows(key)
          const clamped = clampImageBaselinePosition(position, columns)
          const x = toColumnX(clamped.col)
          const y = baselineOriginTop + clamped.row * baselineStep + baselineStep
          const rowStartIndex = Math.max(
            0,
            Math.min(gridRows - 1, findNearestAxisIndex(rowStartsInBaselines, clamped.row)),
          )
          const widthPx = sumAxisSpan(moduleWidths, clamped.col, columns, gridMarginHorizontal) * scale
          const heightPx = sumAxisSpan(moduleHeights, rowStartIndex, rows, gridMarginVertical) * scale
          const rect = { x, y, width: widthPx, height: heightPx }
          imageRectsRef.current[key] = rect
          imagePlans.set(key, { rect, color: getImageColor(key) })
        }
      }

      if (showTypography) {
        const layoutOutput = buildTypographyLayoutPlan<BlockId, keyof GridResult["typography"]["styles"], CanvasRenderingContext2D>({
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
          getBlockFontSize: ({ key, styleKey, defaultSize }) => {
            const scaledSize = getBlockFontSize(key, styleKey) * scale
            return Number.isFinite(scaledSize) && scaledSize > 0 ? scaledSize : defaultSize
          },
          getBlockBaselineMultiplier: ({ key, styleKey, defaultMultiplier }) => {
            const next = getBlockBaselineMultiplier(key, styleKey)
            return Number.isFinite(next) && next > 0 ? next : defaultMultiplier
          },
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
          createTextContext: ({ key, fontSize }) => {
            const blockFont = getBlockFont(key)
            const blockFontStyle = isBlockItalic(key) ? "italic " : ""
            const blockFontWeight = isBlockBold(key) ? "700" : "400"
            ctx.font = `${blockFontStyle}${blockFontWeight} ${fontSize}px ${getFontFamilyCss(blockFont)}`
            return ctx
          },
          wrapText: ({ context, text, maxWidth, hyphenate }) =>
            getWrappedText(context, text, maxWidth, hyphenate),
          textAscent: ({ context, fontSize }) => getTextAscentPx(context, fontSize),
          opticalOffset: ({ context, line, align, fontSize }) =>
            getOpticalOffset(context, line, align, fontSize),
        })

        for (const plan of layoutOutput.plans) {
          const blockFont = getBlockFont(plan.key)
          const blockFontStyle = isBlockItalic(plan.key) ? "italic " : ""
          const blockFontWeight = isBlockBold(plan.key) ? "700" : "400"
          ctx.font = `${blockFontStyle}${blockFontWeight} ${plan.fontSize}px ${getFontFamilyCss(blockFont)}`
          const planFont = ctx.font
          draftPlans.set(plan.key, {
            key: plan.key,
            rect: plan.rect,
            signature: [
              plan.styleKey,
              blockFont,
              getBlockTextColor(plan.key),
              blockFontWeight === "700" ? "bold" : "regular",
              blockFontStyle ? "italic" : "normal",
              plan.textAlign,
              plan.blockRotation.toFixed(2),
              plan.span,
              plan.rowSpan,
              plan.columnReflow ? 1 : 0,
              plan.rotationOriginX.toFixed(3),
              plan.rotationOriginY.toFixed(3),
              plan.rect.width.toFixed(3),
              plan.rect.height.toFixed(3),
              plan.commands
                .map((command) => `${command.text}@${command.x.toFixed(3)},${command.y.toFixed(3)}`)
                .join("||"),
            ].join("|"),
            font: planFont,
            textColor: getBlockTextColor(plan.key),
            textAlign: plan.textAlign,
            blockRotation: plan.blockRotation,
            rotationOriginX: plan.rotationOriginX,
            rotationOriginY: plan.rotationOriginY,
            commands: plan.commands,
          })
        }

        blockRectsRef.current = layoutOutput.rects
        Object.assign(overflowByBlock, layoutOutput.overflowByBlock)
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

      const drawPlans = (plans: BlockRenderPlan<BlockId>[]) => {
        bufferCtx.textBaseline = "alphabetic"
        for (const plan of plans) {
          bufferCtx.fillStyle = plan.textColor
          bufferCtx.font = plan.font
          bufferCtx.textAlign = plan.textAlign
          const angle = (plan.blockRotation * Math.PI) / 180
          if (Math.abs(angle) > 0.0001) {
            bufferCtx.save()
            bufferCtx.translate(plan.rotationOriginX, plan.rotationOriginY)
            bufferCtx.rotate(angle)
            for (const command of plan.commands) {
              bufferCtx.fillText(
                command.text,
                command.x - plan.rotationOriginX,
                command.y - plan.rotationOriginY,
              )
            }
            bufferCtx.restore()
          } else {
            for (const command of plan.commands) {
              bufferCtx.fillText(command.text, command.x, command.y)
            }
          }
        }
      }

      const drawImagePlan = (imagePlan: { rect: BlockRect; color: string }) => {
        bufferCtx.fillStyle = imagePlan.color
        bufferCtx.globalAlpha = 0.92
        bufferCtx.fillRect(imagePlan.rect.x, imagePlan.rect.y, imagePlan.rect.width, imagePlan.rect.height)
        bufferCtx.globalAlpha = 1
      }

      const orderedKeys = layerOrder.filter((key) => imagePlans.has(key) || draftPlans.has(key))
      for (const key of imageOrder) {
        if ((imagePlans.has(key) || draftPlans.has(key)) && !orderedKeys.includes(key)) orderedKeys.push(key)
      }
      for (const key of blockOrder) {
        if ((imagePlans.has(key) || draftPlans.has(key)) && !orderedKeys.includes(key)) orderedKeys.push(key)
      }

      bufferCtx.setTransform(1, 0, 0, 1, 0, 0)
      bufferCtx.clearRect(0, 0, typographyBuffer.width, typographyBuffer.height)
      bufferCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      bufferCtx.save()
      bufferCtx.translate(bufferCssWidth / 2, bufferCssHeight / 2)
      bufferCtx.rotate((rotation * Math.PI) / 180)
      bufferCtx.translate(-pageWidth / 2, -pageHeight / 2)
      for (const key of orderedKeys) {
        const imagePlan = imagePlans.get(key)
        if (imagePlan) {
          drawImagePlan(imagePlan)
          continue
        }
        const textPlan = draftPlans.get(key)
        if (textPlan) drawPlans([textPlan])
      }
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
    isBlockBold,
    isBlockItalic,
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
