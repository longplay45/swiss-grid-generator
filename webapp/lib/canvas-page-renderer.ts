import { findNearestAxisIndex, sumAxisSpan } from "@/lib/grid-rhythm"
import type { BlockRenderPlan, BlockRect, TextAlignMode } from "@/lib/preview-types"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  drawCanvasText,
} from "@/lib/text-rendering"
import { buildPositionedTrackingSegments, type TextTrackingRun } from "@/lib/text-tracking-runs"
import { buildTypographyLayoutPlan } from "@/lib/typography-layout-plan"
import type { ModulePosition } from "@/lib/types/layout-primitives"
import { resolveScaledCanvasFontSize } from "./canvas-render-math.ts"
import type { WrappedTextLine } from "./text-layout.ts"

export type CanvasImageRenderPlan = {
  rect: BlockRect
  color: string
}

type ImageDragState<Key extends string> = {
  key: Key
  preview: ModulePosition
}

type TypographyStyleDefinition = {
  size: number
  baselineMultiplier: number
}

type BuildCanvasImagePlansArgs<Key extends string> = {
  imageOrder: Key[]
  imageModulePositions: Partial<Record<Key, ModulePosition>>
  dragState?: ImageDragState<Key> | null
  getImageSpan: (key: Key) => number
  getImageRows: (key: Key) => number
  getImageColor: (key: Key) => string
  clampImageBaselinePosition: (position: ModulePosition, columns: number) => ModulePosition
  toColumnX: (col: number) => number
  baselineOriginTop: number
  baselineStep: number
  rowStartsInBaselines: number[]
  gridRows: number
  moduleWidths: number[]
  moduleHeights: number[]
  gridMarginHorizontal: number
  gridMarginVertical: number
  scale: number
}

type BuildCanvasTypographyRenderPlansArgs<BlockId extends string, StyleKey extends string> = {
  ctx: CanvasRenderingContext2D
  blockOrder: BlockId[]
  textContent: Record<BlockId, string>
  styleAssignments: Record<BlockId, StyleKey>
  styles: Record<StyleKey, TypographyStyleDefinition>
  blockTextAlignments: Partial<Record<BlockId, TextAlignMode>>
  contentTop: number
  contentLeft: number
  pageHeight: number
  marginsBottom: number
  baselineStep: number
  moduleWidth: number
  moduleHeight: number
  moduleWidths: number[]
  moduleHeights: number[]
  gutterX: number
  gutterY: number
  gridRows: number
  gridCols: number
  fontScale: number
  bodyKey: BlockId
  displayKey: BlockId
  captionKey: BlockId
  defaultBodyStyleKey: StyleKey
  defaultCaptionStyleKey: StyleKey
  getBlockSpan: (key: BlockId) => number
  getBlockRows: (key: BlockId) => number
  getBlockFontSize: (key: BlockId, styleKey: StyleKey) => number
  getBlockBaselineMultiplier: (key: BlockId, styleKey: StyleKey) => number
  getBlockRotation: (key: BlockId) => number
  isTextReflowEnabled: (key: BlockId) => boolean
  isSyllableDivisionEnabled: (key: BlockId) => boolean
  isBlockPositionManual?: (key: BlockId) => boolean
  getBlockColumnStart?: (key: BlockId, span: number) => number
  getBlockRowStart?: (key: BlockId, rowSpan: number) => number
  getOriginForBlock: (key: BlockId, fallbackX: number, fallbackY: number) => { x: number; y: number }
  getBlockFont: (key: BlockId, styleKey: StyleKey) => string
  getBlockFontWeight: (key: BlockId, styleKey: StyleKey) => number
  isBlockItalic: (key: BlockId, styleKey: StyleKey) => boolean
  isBlockOpticalKerningEnabled: (key: BlockId) => boolean
  getBlockTrackingScale: (key: BlockId) => number
  getBlockTrackingRuns: (key: BlockId) => TextTrackingRun[]
  getBlockTextColor: (key: BlockId) => string
  getWrappedText: (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
    trackingScale: number,
    opticalKerning: boolean,
    trackingRuns?: readonly TextTrackingRun[],
  ) => WrappedTextLine[]
  getOpticalOffset: (
    ctx: CanvasRenderingContext2D,
    key: BlockId,
    styleKey: StyleKey,
    line: string,
    align: TextAlignMode,
    fontSize: number,
    opticalKerning: boolean,
    trackingScale: number,
  ) => number
}

export function getCanvasTextAscentPx(
  ctx: CanvasRenderingContext2D,
  fallbackFontSizePx: number,
): number {
  const metrics = ctx.measureText("Hg")
  return metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : fallbackFontSizePx * 0.8
}

export function buildCanvasImagePlans<Key extends string>({
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
}: BuildCanvasImagePlansArgs<Key>): {
  imagePlans: Map<Key, CanvasImageRenderPlan>
  imageRects: Record<Key, BlockRect>
} {
  const imagePlans = new Map<Key, CanvasImageRenderPlan>()
  const imageRects = {} as Record<Key, BlockRect>

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
    const rect = {
      x,
      y,
      width: sumAxisSpan(moduleWidths, clamped.col, columns, gridMarginHorizontal) * scale,
      height: sumAxisSpan(moduleHeights, rowStartIndex, rows, gridMarginVertical) * scale,
    }
    imageRects[key] = rect
    imagePlans.set(key, { rect, color: getImageColor(key) })
  }

  return { imagePlans, imageRects }
}

export function buildCanvasTypographyRenderPlans<BlockId extends string, StyleKey extends string>({
  ctx,
  blockOrder,
  textContent,
  styleAssignments,
  styles,
  blockTextAlignments,
  contentTop,
  contentLeft,
  pageHeight,
  marginsBottom,
  baselineStep,
  moduleWidth,
  moduleHeight,
  moduleWidths,
  moduleHeights,
  gutterX,
  gutterY,
  gridRows,
  gridCols,
  fontScale,
  bodyKey,
  displayKey,
  captionKey,
  defaultBodyStyleKey,
  defaultCaptionStyleKey,
  getBlockSpan,
  getBlockRows,
  getBlockFontSize,
  getBlockBaselineMultiplier,
  getBlockRotation,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isBlockPositionManual,
  getBlockColumnStart,
  getBlockRowStart,
  getOriginForBlock,
  getBlockFont,
  getBlockFontWeight,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  getBlockTrackingScale,
  getBlockTrackingRuns,
  getBlockTextColor,
  getWrappedText,
  getOpticalOffset,
}: BuildCanvasTypographyRenderPlansArgs<BlockId, StyleKey>): {
  textPlans: Map<BlockId, BlockRenderPlan<BlockId>>
  blockRects: Record<BlockId, BlockRect>
  overflowByBlock: Partial<Record<BlockId, number>>
} {
  const layoutOutput = buildTypographyLayoutPlan<BlockId, StyleKey, CanvasRenderingContext2D>({
    blockOrder,
    textContent,
    styleAssignments,
    styles,
    blockTextAlignments,
    contentTop,
    contentLeft,
    pageHeight,
    marginsBottom,
    baselineStep,
    moduleWidth,
    moduleHeight,
    moduleWidths,
    moduleHeights,
    gutterX,
    gutterY,
    gridRows,
    gridCols,
    fontScale,
    bodyKey,
    displayKey,
    captionKey,
    defaultBodyStyleKey,
    defaultCaptionStyleKey,
    getBlockSpan,
    getBlockRows,
    getBlockFontSize: ({ key, styleKey, defaultSize }) => (
      resolveScaledCanvasFontSize(getBlockFontSize(key, styleKey), fontScale, defaultSize)
    ),
    getBlockBaselineMultiplier: ({ key, styleKey, defaultMultiplier }) => {
      const next = getBlockBaselineMultiplier(key, styleKey)
      return Number.isFinite(next) && next > 0 ? next : defaultMultiplier
    },
    getBlockRotation,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isBlockPositionManual,
    getBlockColumnStart,
    getBlockRowStart,
    getOriginForBlock,
    createTextContext: ({ key, styleKey, fontSize }) => {
      applyCanvasTextConfig(ctx, {
        font: buildCanvasFont(
          getBlockFont(key, styleKey),
          getBlockFontWeight(key, styleKey),
          isBlockItalic(key, styleKey),
          fontSize,
        ),
        opticalKerning: isBlockOpticalKerningEnabled(key),
      })
      return ctx
    },
    wrapText: ({ context, key, text, maxWidth, hyphenate }) => (
      getWrappedText(
        context,
        text,
        maxWidth,
        hyphenate,
        getBlockTrackingScale(key),
        isBlockOpticalKerningEnabled(key),
        getBlockTrackingRuns(key),
      )
    ),
    textAscent: ({ context, fontSize }) => getCanvasTextAscentPx(context, fontSize),
    opticalOffset: ({ context, key, styleKey, line, align, fontSize }) => (
      getOpticalOffset(
        context,
        key,
        styleKey,
        line,
        align,
        fontSize,
        isBlockOpticalKerningEnabled(key),
        getBlockTrackingScale(key),
      )
    ),
  })

  const textPlans = new Map<BlockId, BlockRenderPlan<BlockId>>()
  for (const plan of layoutOutput.plans) {
    const blockFont = getBlockFont(plan.key, plan.styleKey)
    const blockFontWeight = getBlockFontWeight(plan.key, plan.styleKey)
    const blockItalic = isBlockItalic(plan.key, plan.styleKey)
    const opticalKerning = isBlockOpticalKerningEnabled(plan.key)
    const trackingScale = getBlockTrackingScale(plan.key)
    const trackingRuns = getBlockTrackingRuns(plan.key)
    applyCanvasTextConfig(ctx, {
      font: buildCanvasFont(blockFont, blockFontWeight, blockItalic, plan.fontSize),
      opticalKerning,
    })
    const planFont = ctx.font
    const segmentLines = plan.commands.map((command) => buildPositionedTrackingSegments(ctx, {
      sourceText: textContent[plan.key] ?? "",
      command,
      textAlign: plan.textAlign,
      baseTrackingScale: trackingScale,
      runs: trackingRuns,
      fontSize: plan.fontSize,
    }))
    textPlans.set(plan.key, {
      key: plan.key,
      rect: plan.rect,
      guideRects: plan.guideRects,
      signature: [
        plan.styleKey,
        blockFont,
        getBlockTextColor(plan.key),
        blockFontWeight,
        blockItalic ? "italic" : "normal",
        opticalKerning ? "kerning-on" : "kerning-off",
        trackingScale,
        plan.textAlign,
        plan.blockRotation.toFixed(2),
        plan.span,
        plan.rowSpan,
        plan.columnReflow ? 1 : 0,
        plan.rotationOriginX.toFixed(3),
        plan.rotationOriginY.toFixed(3),
        plan.rect.width.toFixed(3),
        plan.rect.height.toFixed(3),
        plan.guideRects
          .map((guideRect) => (
            `${guideRect.x.toFixed(3)},${guideRect.y.toFixed(3)},${guideRect.width.toFixed(3)},${guideRect.height.toFixed(3)}`
          ))
          .join("||"),
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
      opticalKerning,
      trackingScale,
      trackingRuns,
      sourceText: textContent[plan.key] ?? "",
      segmentLines,
      commands: plan.commands,
    })
  }

  return {
    textPlans,
    blockRects: layoutOutput.rects,
    overflowByBlock: layoutOutput.overflowByBlock,
  }
}

export function buildOrderedCanvasLayerKeys<Key extends string>(
  layerOrder: Key[],
  imageOrder: Key[],
  blockOrder: Key[],
  imagePlans: Map<Key, CanvasImageRenderPlan>,
  textPlans: Map<Key, BlockRenderPlan<Key>>,
): Key[] {
  const orderedKeys = layerOrder.filter((key) => imagePlans.has(key) || textPlans.has(key))
  for (const key of imageOrder) {
    if ((imagePlans.has(key) || textPlans.has(key)) && !orderedKeys.includes(key)) orderedKeys.push(key)
  }
  for (const key of blockOrder) {
    if ((imagePlans.has(key) || textPlans.has(key)) && !orderedKeys.includes(key)) orderedKeys.push(key)
  }
  return orderedKeys
}

export function drawCanvasLayerStack<Key extends string>(
  ctx: CanvasRenderingContext2D,
  orderedKeys: Key[],
  imagePlans: Map<Key, CanvasImageRenderPlan>,
  textPlans: Map<Key, BlockRenderPlan<Key>>,
): void {
  ctx.textBaseline = "alphabetic"
  for (const key of orderedKeys) {
    const imagePlan = imagePlans.get(key)
    if (imagePlan) {
      ctx.fillStyle = imagePlan.color
      ctx.globalAlpha = 0.92
      ctx.fillRect(imagePlan.rect.x, imagePlan.rect.y, imagePlan.rect.width, imagePlan.rect.height)
      ctx.globalAlpha = 1
      continue
    }

    const textPlan = textPlans.get(key)
    if (!textPlan) continue
    ctx.fillStyle = textPlan.textColor
    applyCanvasTextConfig(ctx, {
      font: textPlan.font,
      opticalKerning: textPlan.opticalKerning,
    })
    ctx.textAlign = "left"
    for (const lineSegments of textPlan.segmentLines) {
      for (const segment of lineSegments) {
        drawCanvasText(ctx, {
          text: segment.text,
          x: segment.x,
          y: segment.y,
          textAlign: "left",
          trackingScale: segment.trackingScale,
          blockRotation: textPlan.blockRotation,
          rotationOrigin: {
            x: textPlan.rotationOriginX,
            y: textPlan.rotationOriginY,
          },
        })
      }
    }
  }
}
