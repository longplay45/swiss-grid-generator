import { useEffect } from "react"
import type { MutableRefObject, RefObject } from "react"

import type { GridResult } from "@/lib/grid-calculator"
import { getFontFamilyCss, type FontFamily } from "@/lib/config/fonts"

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
  textAlign: TextAlignMode
  blockRotation: number
  commands: TextDrawCommand[]
}

type DragState<BlockId extends string> = {
  key: BlockId
  preview: ModulePosition
}

type Args<BlockId extends string> = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  blockRectsRef: MutableRefObject<Record<BlockId, BlockRect>>
  typographyBufferRef: MutableRefObject<HTMLCanvasElement | null>
  previousPlansRef: MutableRefObject<Map<BlockId, BlockRenderPlan<BlockId>>>
  typographyBufferTransformRef: MutableRefObject<string>
  result: GridResult
  scale: number
  pixelRatio: number
  rotation: number
  showTypography: boolean
  blockOrder: BlockId[]
  textContent: Record<BlockId, string>
  styleAssignments: Record<BlockId, keyof GridResult["typography"]["styles"]>
  blockTextAlignments: Partial<Record<BlockId, TextAlignMode>>
  blockModulePositions: Partial<Record<BlockId, ModulePosition>>
  dragState: DragState<BlockId> | null
  clampModulePosition: (position: ModulePosition, key: BlockId) => ModulePosition
  getBlockFont: (key: BlockId) => FontFamily
  isBlockItalic: (key: BlockId) => boolean
  isBlockBold: (key: BlockId) => boolean
  getBlockRotation: (key: BlockId) => number
  getBlockSpan: (key: BlockId) => number
  getBlockRows: (key: BlockId) => number
  isTextReflowEnabled: (key: BlockId) => boolean
  isSyllableDivisionEnabled: (key: BlockId) => boolean
  getWrappedText: (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, hyphenate: boolean) => string[]
  getOpticalOffset: (ctx: CanvasRenderingContext2D, line: string, align: TextAlignMode, fontSize: number) => number
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  recordPerfMetric: (metric: "drawMs", valueMs: number) => void
}

function rectsIntersect(a: BlockRect, b: BlockRect): boolean {
  return !(
    a.x + a.width < b.x
    || b.x + b.width < a.x
    || a.y + a.height < b.y
    || b.y + b.height < a.y
  )
}

function getTextAscentPx(ctx: CanvasRenderingContext2D, fallbackFontSizePx: number): number {
  const metrics = ctx.measureText("Hg")
  return metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : fallbackFontSizePx * 0.8
}

export function useTypographyRenderer<BlockId extends string>({
  canvasRef,
  blockRectsRef,
  typographyBufferRef,
  previousPlansRef,
  typographyBufferTransformRef,
  result,
  scale,
  pixelRatio,
  rotation,
  showTypography,
  blockOrder,
  textContent,
  styleAssignments,
  blockTextAlignments,
  blockModulePositions,
  dragState,
  clampModulePosition,
  getBlockFont,
  isBlockItalic,
  isBlockBold,
  getBlockRotation,
  getBlockSpan,
  getBlockRows,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  getWrappedText,
  getOpticalOffset,
  onCanvasReady,
  recordPerfMetric,
}: Args<BlockId>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)

    const frame = window.requestAnimationFrame(() => {
      const drawStartedAt = performance.now()
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }
      const canvasCssWidth = canvas.width / pixelRatio
      const canvasCssHeight = canvas.height / pixelRatio

      const { width, height } = result.pageSizePt
      const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
      const { width: modW, height: modH } = result.module
      const { gridRows } = result.settings
      const pageWidth = width * scale
      const pageHeight = height * scale

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, canvasCssWidth, canvasCssHeight)
      blockRectsRef.current = {} as Record<BlockId, BlockRect>
      if (!showTypography) {
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }

      const { styles } = result.typography
      const contentTop = margins.top * scale
      const contentLeft = margins.left * scale
      const baselinePx = gridUnit * scale
      const moduleXStep = (modW + gridMarginHorizontal) * scale
      const baselineStep = gridUnit * scale
      const baselineOriginTop = contentTop - baselineStep
      const gutterX = gridMarginHorizontal * scale

      const getMinOffset = (): number => 1
      const draftPlans = new Map<BlockId, BlockRenderPlan<BlockId>>()

      const textBlocks = blockOrder
        .filter((key) => key !== "caption")
        .map((key) => ({
          key,
          extraOffset: 0,
          spaceBefore: key === "body" ? 1 : 0,
          lines: [textContent[key] ?? ""],
        }))

      const useRowPlacement = gridRows >= 2
      const useParagraphRows = gridRows >= 5
      const rowHeightBaselines = modH / gridUnit
      const gutterBaselines = gridMarginVertical / gridUnit
      const rowStepBaselines = rowHeightBaselines + gutterBaselines
      const row2TopBaselines = rowStepBaselines
      const row3TopBaselines = rowStepBaselines * 2

      const displayStartOffset = getMinOffset()
      const restStartOffset = gridRows > 6
        ? row3TopBaselines + getMinOffset()
        : row2TopBaselines + getMinOffset()

      let currentBaselineOffset = useRowPlacement ? restStartOffset : displayStartOffset
      let currentRowIndex = 0

      const nextRects: Record<BlockId, BlockRect> = {} as Record<BlockId, BlockRect>
      for (const key of blockOrder) {
        nextRects[key] = { x: 0, y: 0, width: 0, height: 0 }
      }

      const getOriginForBlock = (key: BlockId, fallbackX: number, fallbackY: number) => {
        const dragged = dragState?.key === key ? dragState.preview : undefined
        const manual = dragged ?? blockModulePositions[key]
        if (!manual) return { x: fallbackX, y: fallbackY }
        const clamped = clampModulePosition(manual, key)
        return {
          x: contentLeft + clamped.col * moduleXStep,
          y: baselineOriginTop + clamped.row * baselineStep,
        }
      }

      for (const block of textBlocks) {
        const blockText = block.lines.join(" ")
        if (!blockText.trim()) continue

        const styleKey = styleAssignments[block.key] ?? "body"
        const style = styles[styleKey]
        if (!style) continue

        const fontSize = style.size * scale
        const baselineMult = style.baselineMultiplier

        let blockStartOffset = currentBaselineOffset + block.spaceBefore + block.extraOffset
        if (useParagraphRows) {
          const minOffset = getMinOffset()
          blockStartOffset = currentRowIndex * rowStepBaselines + minOffset + block.extraOffset
        } else if (useRowPlacement && block.key === "display") {
          blockStartOffset = displayStartOffset + block.extraOffset
        }

        const blockFont = getBlockFont(block.key)
        const blockFontStyle = isBlockItalic(block.key) ? "italic " : ""
        const blockFontWeight = isBlockBold(block.key) ? "700" : "400"
        const blockRotation = getBlockRotation(block.key)
        ctx.font = `${blockFontStyle}${blockFontWeight} ${fontSize}px ${getFontFamilyCss(blockFont)}`
        const planFont = ctx.font

        const span = getBlockSpan(block.key)
        const wrapWidth = span * modW * scale + Math.max(span - 1, 0) * gutterX
        const rowSpan = getBlockRows(block.key)
        const columnReflow = isTextReflowEnabled(block.key)
        const textLines = getWrappedText(
          ctx,
          blockText,
          columnReflow ? modW * scale : wrapWidth,
          isSyllableDivisionEnabled(block.key),
        )

        const autoBlockX = contentLeft
        const autoBlockY = contentTop + (blockStartOffset - 1) * baselinePx
        const origin = getOriginForBlock(block.key, autoBlockX, autoBlockY)
        const textAlign = blockTextAlignments[block.key] ?? "left"
        const textAscentPx = getTextAscentPx(ctx, fontSize)
        const hitTopPadding = Math.max(baselinePx, textAscentPx)
        const lineStep = baselineMult * baselinePx
        const pageBottomY = pageHeight - margins.bottom * scale
        const moduleHeightPx = rowSpan * modH * scale + Math.max(rowSpan - 1, 0) * gridMarginVertical * scale
        const maxLinesPerColumn = Math.max(1, Math.floor(moduleHeightPx / lineStep))
        let maxUsedRows = 0

        nextRects[block.key] = {
          x: origin.x,
          y: origin.y - hitTopPadding,
          width: wrapWidth,
          height: columnReflow
            ? moduleHeightPx + hitTopPadding
            : (Math.max(textLines.length, 1) * baselineMult + 1) * baselinePx + hitTopPadding,
        }
        const commands: TextDrawCommand[] = []

        if (!columnReflow) {
          const textAnchorX = textAlign === "right" ? origin.x + wrapWidth : origin.x
          textLines.forEach((line, lineIndex) => {
            const lineTopY = origin.y + baselinePx + lineIndex * baselineMult * baselinePx
            const y = lineTopY + textAscentPx
            if (lineTopY < pageBottomY) {
              maxUsedRows = Math.max(maxUsedRows, lineIndex + 1)
              const opticalOffsetX = getOpticalOffset(ctx, line, textAlign, fontSize)
              commands.push({ text: line, x: textAnchorX + opticalOffsetX, y })
            }
          })
        } else {
          const columnWidth = modW * scale
          for (let lineIndex = 0; lineIndex < textLines.length; lineIndex += 1) {
            const columnIndex = Math.floor(lineIndex / maxLinesPerColumn)
            if (columnIndex >= span) break
            const rowIndex = lineIndex % maxLinesPerColumn
            const columnX = origin.x + columnIndex * (columnWidth + gutterX)
            const textAnchorX = textAlign === "right" ? columnX + columnWidth : columnX
            const line = textLines[lineIndex]
            const lineTopY = origin.y + baselinePx + rowIndex * lineStep
            const y = lineTopY + textAscentPx
            if (lineTopY >= pageBottomY) continue
            maxUsedRows = Math.max(maxUsedRows, rowIndex + 1)
            const opticalOffsetX = getOpticalOffset(ctx, line, textAlign, fontSize)
            commands.push({ text: line, x: textAnchorX + opticalOffsetX, y })
          }
        }

        if (maxUsedRows > 0 && !columnReflow) {
          nextRects[block.key].height = (maxUsedRows * baselineMult + 1) * baselinePx + hitTopPadding
        }

        draftPlans.set(block.key, {
          key: block.key,
          rect: nextRects[block.key],
          signature: [
            styleKey,
            blockFont,
            blockFontWeight === "700" ? "bold" : "regular",
            blockFontStyle ? "italic" : "normal",
            textAlign,
            blockRotation.toFixed(2),
            span,
            rowSpan,
            columnReflow ? 1 : 0,
            origin.x.toFixed(3),
            origin.y.toFixed(3),
            nextRects[block.key].width.toFixed(3),
            nextRects[block.key].height.toFixed(3),
            commands.map((command) => `${command.text}@${command.x.toFixed(3)},${command.y.toFixed(3)}`).join("||"),
          ].join("|"),
          font: planFont,
          textAlign,
          blockRotation,
          commands,
        })

        if (!useParagraphRows) {
          const usedLineRows = maxUsedRows || textLines.length
          if (!useRowPlacement || block.key !== "display") {
            currentBaselineOffset = blockStartOffset + usedLineRows * baselineMult
          } else {
            currentBaselineOffset = restStartOffset
          }
        } else {
          const blockEnd = blockStartOffset + textLines.length * baselineMult
          currentRowIndex = Math.ceil(blockEnd / rowStepBaselines)
        }
      }

      const captionKey = "caption" as BlockId
      const hasCaptionBlock = blockOrder.includes(captionKey)
      const captionStyleKey = (styleAssignments[captionKey] ?? "caption") as keyof GridResult["typography"]["styles"]
      const captionStyle = styles[captionStyleKey]
      const captionText = textContent[captionKey] ?? ""
      if (hasCaptionBlock && captionStyle && captionText.trim()) {
        const captionFontSize = captionStyle.size * scale
        const captionBaselineMult = captionStyle.baselineMultiplier
        const captionFont = getBlockFont(captionKey)

        const captionFontStyle = isBlockItalic(captionKey) ? "italic " : ""
        const captionFontWeight = isBlockBold(captionKey) ? "700" : "400"
        const captionRotation = getBlockRotation(captionKey)
        ctx.font = `${captionFontStyle}${captionFontWeight} ${captionFontSize}px ${getFontFamilyCss(captionFont)}`
        const captionPlanFont = ctx.font
        const captionAlign = blockTextAlignments[captionKey] ?? "left"

        const captionSpan = getBlockSpan(captionKey)
        const captionRowSpan = getBlockRows(captionKey)
        const captionWidth = captionSpan * modW * scale + Math.max(captionSpan - 1, 0) * gutterX
        const captionColumnReflow = isTextReflowEnabled(captionKey)
        const captionLines = getWrappedText(
          ctx,
          captionText,
          captionColumnReflow ? modW * scale : captionWidth,
          isSyllableDivisionEnabled(captionKey),
        )
        const captionLineCount = captionLines.length

        const pageHeightPt = result.pageSizePt.height
        const availableHeight = pageHeightPt - margins.top - margins.bottom
        const totalBaselinesFromTop = Math.floor(availableHeight / gridUnit)
        const firstLineBaselineUnit = totalBaselinesFromTop - (captionLineCount - 1) * captionBaselineMult

        const autoCaptionY = contentTop + (firstLineBaselineUnit - 1) * baselinePx
        const captionOrigin = getOriginForBlock(captionKey, contentLeft, autoCaptionY)
        ctx.textAlign = captionAlign
        const captionAscentPx = getTextAscentPx(ctx, captionFontSize)
        const captionHitTopPadding = Math.max(baselinePx, captionAscentPx)
        const captionLineStep = captionBaselineMult * baselinePx
        const captionPageBottomY = pageHeight - margins.bottom * scale
        const captionModuleHeightPx = captionRowSpan * modH * scale + Math.max(captionRowSpan - 1, 0) * gridMarginVertical * scale
        const captionMaxLinesPerColumn = Math.max(1, Math.floor(captionModuleHeightPx / captionLineStep))
        let captionMaxUsedRows = 0
        const captionCommands: TextDrawCommand[] = []

        if (!captionColumnReflow) {
          const captionAnchorX = captionAlign === "right" ? captionOrigin.x + captionWidth : captionOrigin.x
          captionLines.forEach((line, lineIndex) => {
            const lineTopY = captionOrigin.y + baselinePx + lineIndex * captionBaselineMult * baselinePx
            const y = lineTopY + captionAscentPx
            if (lineTopY < captionPageBottomY) {
              captionMaxUsedRows = Math.max(captionMaxUsedRows, lineIndex + 1)
              const opticalOffsetX = getOpticalOffset(ctx, line, captionAlign, captionFontSize)
              captionCommands.push({ text: line, x: captionAnchorX + opticalOffsetX, y })
            }
          })
        } else {
          const columnWidth = modW * scale
          for (let lineIndex = 0; lineIndex < captionLines.length; lineIndex += 1) {
            const columnIndex = Math.floor(lineIndex / captionMaxLinesPerColumn)
            if (columnIndex >= captionSpan) break
            const rowIndex = lineIndex % captionMaxLinesPerColumn
            const columnX = captionOrigin.x + columnIndex * (columnWidth + gutterX)
            const captionAnchorX = captionAlign === "right" ? columnX + columnWidth : columnX
            const line = captionLines[lineIndex]
            const lineTopY = captionOrigin.y + baselinePx + rowIndex * captionLineStep
            const y = lineTopY + captionAscentPx
            if (lineTopY >= captionPageBottomY) continue
            captionMaxUsedRows = Math.max(captionMaxUsedRows, rowIndex + 1)
            const opticalOffsetX = getOpticalOffset(ctx, line, captionAlign, captionFontSize)
            captionCommands.push({ text: line, x: captionAnchorX + opticalOffsetX, y })
          }
        }

        const captionRect: BlockRect = {
          x: captionOrigin.x,
          y: captionOrigin.y - captionHitTopPadding,
          width: captionWidth,
          height: captionColumnReflow
            ? captionModuleHeightPx + captionHitTopPadding
            : ((captionMaxUsedRows || captionLineCount) * captionBaselineMult + 1) * baselinePx + captionHitTopPadding,
        }
        nextRects[captionKey] = captionRect
        draftPlans.set(captionKey, {
          key: captionKey,
          rect: captionRect,
          signature: [
            captionStyleKey,
            captionFont,
            captionFontWeight === "700" ? "bold" : "regular",
            captionFontStyle ? "italic" : "normal",
            captionAlign,
            captionRotation.toFixed(2),
            captionSpan,
            captionRowSpan,
            captionColumnReflow ? 1 : 0,
            captionOrigin.x.toFixed(3),
            captionOrigin.y.toFixed(3),
            captionRect.width.toFixed(3),
            captionRect.height.toFixed(3),
            captionCommands
              .map((command) => `${command.text}@${command.x.toFixed(3)},${command.y.toFixed(3)}`)
              .join("||"),
          ].join("|"),
          font: captionPlanFont,
          textAlign: captionAlign,
          blockRotation: captionRotation,
          commands: captionCommands,
        })
      }

      blockRectsRef.current = nextRects

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
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }
      const bufferCssWidth = typographyBuffer.width / pixelRatio
      const bufferCssHeight = typographyBuffer.height / pixelRatio

      const drawPlans = (plans: BlockRenderPlan<BlockId>[]) => {
        bufferCtx.fillStyle = "#1f2937"
        bufferCtx.textBaseline = "alphabetic"
        for (const plan of plans) {
          bufferCtx.font = plan.font
          bufferCtx.textAlign = plan.textAlign
          const angle = (plan.blockRotation * Math.PI) / 180
          for (const command of plan.commands) {
            if (Math.abs(angle) > 0.0001) {
              bufferCtx.save()
              bufferCtx.translate(command.x, command.y)
              bufferCtx.rotate(angle)
              bufferCtx.fillText(command.text, 0, 0)
              bufferCtx.restore()
            } else {
              bufferCtx.fillText(command.text, command.x, command.y)
            }
          }
        }
      }

      const previousPlans = previousPlansRef.current
      const fullRedraw = resized || transformChanged || previousPlans.size === 0
      const allCurrentPlans = [...draftPlans.values()]

      if (fullRedraw) {
        bufferCtx.setTransform(1, 0, 0, 1, 0, 0)
        bufferCtx.clearRect(0, 0, typographyBuffer.width, typographyBuffer.height)
        bufferCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
        bufferCtx.save()
        bufferCtx.translate(bufferCssWidth / 2, bufferCssHeight / 2)
        bufferCtx.rotate((rotation * Math.PI) / 180)
        bufferCtx.translate(-pageWidth / 2, -pageHeight / 2)
        drawPlans(allCurrentPlans)
        bufferCtx.restore()
      } else {
        const dirtyKeys = new Set<BlockId>()
        const mergedKeys = new Set<BlockId>([
          ...Array.from(previousPlans.keys()),
          ...Array.from(draftPlans.keys()),
        ])
        for (const key of mergedKeys) {
          const prev = previousPlans.get(key)
          const next = draftPlans.get(key)
          if (!prev || !next) {
            dirtyKeys.add(key)
            continue
          }
          if (
            prev.signature !== next.signature
            || prev.rect.x !== next.rect.x
            || prev.rect.y !== next.rect.y
            || prev.rect.width !== next.rect.width
            || prev.rect.height !== next.rect.height
          ) {
            dirtyKeys.add(key)
          }
        }
        if (!dirtyKeys.size) {
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(typographyBuffer, 0, 0)
          previousPlansRef.current = draftPlans
          recordPerfMetric("drawMs", performance.now() - drawStartedAt)
          return
        }
        const dirtyRegions: BlockRect[] = []
        for (const key of dirtyKeys) {
          const prev = previousPlans.get(key)
          const next = draftPlans.get(key)
          if (prev) dirtyRegions.push(prev.rect)
          if (next) dirtyRegions.push(next.rect)
        }
        if (dirtyRegions.length > 0) {
          const redrawPlans = allCurrentPlans.filter((plan) =>
            dirtyRegions.some((region) => rectsIntersect(plan.rect, region)),
          )
          bufferCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
          bufferCtx.save()
          bufferCtx.translate(bufferCssWidth / 2, bufferCssHeight / 2)
          bufferCtx.rotate((rotation * Math.PI) / 180)
          bufferCtx.translate(-pageWidth / 2, -pageHeight / 2)
          const clearPadding = 2
          for (const region of dirtyRegions) {
            bufferCtx.clearRect(
              region.x - clearPadding,
              region.y - clearPadding,
              region.width + clearPadding * 2,
              region.height + clearPadding * 2,
            )
          }
          drawPlans(redrawPlans)
          bufferCtx.restore()
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(typographyBuffer, 0, 0)
      previousPlansRef.current = draftPlans
      recordPerfMetric("drawMs", performance.now() - drawStartedAt)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    blockModulePositions,
    blockOrder,
    blockRectsRef,
    blockTextAlignments,
    canvasRef,
    clampModulePosition,
    dragState,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getOpticalOffset,
    getWrappedText,
    isBlockBold,
    isBlockItalic,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    onCanvasReady,
    previousPlansRef,
    recordPerfMetric,
    result,
    rotation,
    scale,
    pixelRatio,
    showTypography,
    styleAssignments,
    textContent,
    typographyBufferRef,
    typographyBufferTransformRef,
  ])
}
