import { resolveBlockHeight } from "@/lib/block-height"
import { findNearestAxisIndex, sumAxisSpan } from "@/lib/grid-rhythm"
import type { FontFamily } from "@/lib/config/fonts"
import { getOpticalTerminalCaretAdvance } from "@/lib/optical-margin"
import { resolveTextDrawCommandRange } from "@/lib/text-draw-command"
import type {
  BlockRenderPlan,
  BlockRect,
  RenderedCaretStop,
  RenderedTextLine,
  TextAlignMode,
  TextVerticalAlignMode,
  TextDrawCommand,
} from "@/lib/preview-types"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  drawCanvasText,
  getTrackingLetterSpacing,
  measureCanvasTextWidth,
  measureTextPairAdvance,
  splitTextForTracking,
} from "@/lib/text-rendering"
import {
  buildPositionedTextFormatTrackingGraphemes,
  type BaseTextFormat,
  type TextFormatRun,
} from "@/lib/text-format-runs"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"
import { buildTypographyLayoutPlan } from "@/lib/typography-layout-plan"
import { clampFreePlacementRow, clampLayerColumn, resolveLayerColumnBounds } from "@/lib/layer-placement"
import type { ModulePosition } from "@/lib/types/layout-primitives"
import { resolveScaledCanvasFontSize } from "./canvas-render-math.ts"
import type { WrappedTextLine } from "./text-layout.ts"

export type CanvasImageRenderPlan = {
  rect: BlockRect
  color: string
  opacity: number
  rotation: number
  rotationOriginX: number
  rotationOriginY: number
}

type ImageDragState<Key extends string> = {
  key: Key
  preview: ModulePosition
  copyOnDrop?: boolean
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
  getImageHeightBaselines: (key: Key) => number
  getImageColor: (key: Key) => string
  getImageOpacity: (key: Key) => number
  getImageRotation: (key: Key) => number
  isImageSnapToColumnsEnabled: (key: Key) => boolean
  isImageSnapToBaselineEnabled: (key: Key) => boolean
  toColumnX: (col: number) => number
  baselineOriginTop: number
  baselineStep: number
  maxBaselineRow: number
  gridCols: number
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
  blockVerticalAlignments: Partial<Record<BlockId, TextVerticalAlignMode>>
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
  getBlockHeightBaselines: (key: BlockId) => number
  getBlockFontSize: (key: BlockId, styleKey: StyleKey) => number
  getBlockBaselineMultiplier: (key: BlockId, styleKey: StyleKey) => number
  getBlockRotation: (key: BlockId) => number
  isTextReflowEnabled: (key: BlockId) => boolean
  isSyllableDivisionEnabled: (key: BlockId) => boolean
  isBlockPositionManual?: (key: BlockId) => boolean
  getBlockColumnStart?: (key: BlockId, span: number) => number
  getBlockRowStart?: (key: BlockId, rowSpan: number) => number
  getOriginForBlock: (key: BlockId, fallbackX: number, fallbackY: number) => { x: number; y: number }
  getBlockFont: (key: BlockId, styleKey: StyleKey) => FontFamily
  getBlockFontWeight: (key: BlockId, styleKey: StyleKey) => number
  isBlockItalic: (key: BlockId, styleKey: StyleKey) => boolean
  isBlockOpticalKerningEnabled: (key: BlockId) => boolean
  getBlockTrackingScale: (key: BlockId) => number
  getBlockTrackingRuns: (key: BlockId) => TextTrackingRun[]
  getBlockTextFormatRuns: (key: BlockId, color: string) => TextFormatRun<StyleKey, FontFamily>[]
  getBlockTextColor: (key: BlockId) => string
  getWrappedText: (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
    trackingScale: number,
    opticalKerning: boolean,
    trackingRuns?: readonly TextTrackingRun[],
    baseFormat?: BaseTextFormat<StyleKey, FontFamily>,
    formatRuns?: readonly TextFormatRun<StyleKey, FontFamily>[],
    resolveFontSize?: (styleKey: StyleKey) => number,
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

const INVISIBLE_TEXT_ARTIFACTS_RE = /[\u00AD\u200B\u200C\u200D\uFEFF]/g

type NormalizedSourceGrapheme = {
  renderedText: string
  sourceStart: number
  sourceEnd: number
}

function toNormalizedSourceGraphemes(
  sourceText: string,
  start: number,
  end: number,
): NormalizedSourceGrapheme[] {
  const slice = sourceText.slice(start, end)
  const graphemes = splitTextForTracking(slice)
  const normalized: NormalizedSourceGrapheme[] = []
  let cursor = start

  for (const grapheme of graphemes) {
    const graphemeStart = cursor
    const graphemeEnd = graphemeStart + grapheme.length
    cursor = graphemeEnd
    const cleanText = grapheme.replace(INVISIBLE_TEXT_ARTIFACTS_RE, "")
    if (!cleanText) continue
    normalized.push({
      renderedText: cleanText,
      sourceStart: graphemeStart,
      sourceEnd: graphemeEnd,
    })
  }

  return normalized
}

function pushCaretStop(stops: RenderedCaretStop[], index: number, x: number) {
  const previous = stops[stops.length - 1]
  if (previous?.index === index) {
    previous.x = x
    return
  }
  stops.push({ index, x })
}

function parseCanvasFontSize(font: string, fallback: number): number {
  const match = font.match(/(\d+(?:\.\d+)?)px/)
  if (!match) return fallback
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function buildRenderedTextLines(
  ctx: CanvasRenderingContext2D,
  sourceText: string,
  commands: TextDrawCommand[],
  segmentLines: BlockRenderPlan<string>["segmentLines"],
  fallbackFont: string,
  opticalKerning: boolean,
): RenderedTextLine[] {
  const fallbackFontSize = parseCanvasFontSize(fallbackFont, 16)
  const fallbackMetricsContextFont = ctx.font

  const renderedLines: RenderedTextLine[] = commands.map((command, lineIndex) => {
    const segments = segmentLines[lineIndex] ?? []
    const commandRange = resolveTextDrawCommandRange(command, sourceText.length)
    const lineSourceStart = commandRange.sourceStart
    const lineSourceEnd = commandRange.sourceEnd
    const lineVisibleStart = commandRange.visibleRange.start
    if (segments.length === 0) {
      applyCanvasTextConfig(ctx, {
        font: fallbackFont,
        opticalKerning,
      })
      const metrics = ctx.measureText("Hgyp")
      const ascent = metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : fallbackFontSize * 0.8
      const descent = metrics.actualBoundingBoxDescent > 0 ? metrics.actualBoundingBoxDescent : fallbackFontSize * 0.2
      return {
        sourceStart: lineSourceStart,
        sourceEnd: lineSourceEnd,
        left: command.x,
        top: command.y - ascent,
        width: 0,
        height: ascent + descent,
        baselineY: command.y,
        caretStops: Array.from({ length: Math.max(1, lineSourceEnd - lineSourceStart + 1) }, (_, offset) => ({
          index: lineSourceStart + offset,
          x: command.x,
        })),
      }
    }

    let lineTop = Number.POSITIVE_INFINITY
    let lineBottom = Number.NEGATIVE_INFINITY
    let visualLineLeft = Number.POSITIVE_INFINITY
    const caretStops: RenderedCaretStop[] = []
    const lineLeft = segments[0]?.x ?? command.x

    for (let hiddenIndex = lineSourceStart; hiddenIndex <= lineVisibleStart; hiddenIndex += 1) {
      pushCaretStop(caretStops, hiddenIndex, lineLeft)
    }

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      const segment = segments[segmentIndex]!
      const nextSegment = segments[segmentIndex + 1]
      const segmentFont = buildCanvasFont(segment.fontFamily, segment.fontWeight, segment.italic, segment.fontSize)
      applyCanvasTextConfig(ctx, {
        font: segmentFont,
        opticalKerning,
      })
      const segmentBounds = ctx.measureText(segment.text)
      const metrics = ctx.measureText("Hgyp")
      const ascent = metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : segment.fontSize * 0.8
      const descent = metrics.actualBoundingBoxDescent > 0 ? metrics.actualBoundingBoxDescent : segment.fontSize * 0.2
      lineTop = Math.min(lineTop, segment.y - ascent)
      lineBottom = Math.max(lineBottom, segment.y + descent)
      visualLineLeft = Math.min(
        visualLineLeft,
        segment.x - Math.max(0, segmentBounds.actualBoundingBoxLeft),
      )

      pushCaretStop(caretStops, Math.max(lineVisibleStart, segment.start), segment.x)

      const normalizedSource = toNormalizedSourceGraphemes(sourceText, segment.start, segment.end)
      const renderedGraphemes = splitTextForTracking(segment.text)
      const graphemeCount = Math.min(normalizedSource.length, renderedGraphemes.length)
      let cursorX = segment.x
      let lastGraphemeStartX = segment.x

      for (let graphemeIndex = 1; graphemeIndex < graphemeCount; graphemeIndex += 1) {
        const previousGrapheme = renderedGraphemes[graphemeIndex - 1] ?? ""
        const currentGrapheme = renderedGraphemes[graphemeIndex] ?? ""
        cursorX += measureTextPairAdvance(
          ctx,
          previousGrapheme,
          currentGrapheme,
          segment.fontSize,
          opticalKerning,
        ) + getTrackingLetterSpacing(segment.fontSize, segment.trackingScale)
        lastGraphemeStartX = cursorX
        pushCaretStop(caretStops, normalizedSource[graphemeIndex]?.sourceStart ?? segment.end, cursorX)
      }

      let segmentRight = nextSegment?.start === segment.end
        ? nextSegment.x
        : segment.x + measureCanvasTextWidth(
          ctx,
          segment.text,
          segment.trackingScale,
          segment.fontSize,
          opticalKerning,
        )
      if (!nextSegment && graphemeCount > 0 && segment.end === lineSourceEnd) {
        const terminalAdvance = getOpticalTerminalCaretAdvance({
          char: renderedGraphemes[graphemeCount - 1] ?? "",
          font: segmentFont,
          fontSize: segment.fontSize,
          styleKey: segment.styleKey,
        })
        if (terminalAdvance !== null) {
          segmentRight = lastGraphemeStartX + terminalAdvance
        }
      }
      pushCaretStop(caretStops, Math.min(lineSourceEnd, segment.end), segmentRight)
    }

    if (!caretStops.length) {
      pushCaretStop(caretStops, lineSourceStart, lineLeft)
    }
    pushCaretStop(caretStops, lineSourceEnd, caretStops[caretStops.length - 1]?.x ?? lineLeft)

    const left = Number.isFinite(visualLineLeft) ? visualLineLeft : lineLeft
    const right = caretStops[caretStops.length - 1]?.x ?? left
    return {
      sourceStart: lineSourceStart,
      sourceEnd: lineSourceEnd,
      left,
      top: Number.isFinite(lineTop) ? lineTop : command.y - fallbackFontSize * 0.8,
      width: Math.max(0, right - left),
      height: Math.max(1, (Number.isFinite(lineBottom) ? lineBottom : command.y + fallbackFontSize * 0.2) - (Number.isFinite(lineTop) ? lineTop : command.y - fallbackFontSize * 0.8)),
      baselineY: command.y,
      caretStops,
    }
  })

  ctx.font = fallbackMetricsContextFont
  return renderedLines
}

export function buildCanvasImagePlans<Key extends string>({
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
  gridMarginHorizontal,
  gridMarginVertical,
  scale,
}: BuildCanvasImagePlansArgs<Key>): {
  imagePlans: Map<Key, CanvasImageRenderPlan>
  imageRects: Record<Key, BlockRect>
  dragPreviewImagePlan: CanvasImageRenderPlan | null
} {
  const imagePlans = new Map<Key, CanvasImageRenderPlan>()
  const imageRects = {} as Record<Key, BlockRect>
  const imageDuplicatePreviewKey = dragState?.copyOnDrop && imageOrder.includes(dragState.key)
    ? dragState.key
    : null

  const createImagePlan = (position: ModulePosition, key: Key): CanvasImageRenderPlan => {
    const columns = getImageSpan(key)
    const rows = getImageRows(key)
    const heightBaselines = getImageHeightBaselines(key)
    const snapToColumns = isImageSnapToColumnsEnabled(key)
    const snapToBaseline = isImageSnapToBaselineEnabled(key)
    const clamped = {
      col: clampLayerColumn(snapToColumns ? Math.round(position.col) : position.col, {
        span: columns,
        gridCols,
        snapToColumns,
      }),
      row: clampFreePlacementRow(
        snapToBaseline ? Math.round(position.row) : position.row,
        maxBaselineRow,
      ),
    }
    const { minCol } = resolveLayerColumnBounds({ span: columns, gridCols, snapToColumns })
    const snappedStartCol = Math.max(minCol, Math.min(Math.max(0, gridCols - 1), Math.round(clamped.col)))
    const x = toColumnX(clamped.col)
    const y = baselineOriginTop + clamped.row * baselineStep + baselineStep
    const rowStartIndex = Math.max(
      0,
      Math.min(gridRows - 1, findNearestAxisIndex(rowStartsInBaselines, clamped.row)),
    )
    return {
      rect: {
        x,
        y,
        width: sumAxisSpan(moduleWidths, snappedStartCol, columns, gridMarginHorizontal) * scale,
        height: resolveBlockHeight({
          rowStart: rowStartIndex,
          rows,
          baselines: heightBaselines,
          gridRows,
          moduleHeights,
          fallbackModuleHeight: moduleHeights[rowStartIndex] ?? moduleHeights[0] ?? 0,
          gutterY: gridMarginVertical,
          baselineStep: baselineStep / Math.max(scale, 0.0001),
        }) * scale,
      },
      color: getImageColor(key),
      opacity: getImageOpacity(key),
      rotation: getImageRotation(key),
      rotationOriginX: x,
      rotationOriginY: y,
    }
  }

  for (const key of imageOrder) {
    const basePosition = imageModulePositions[key]
    const position = imageDuplicatePreviewKey === key
      ? basePosition
      : dragState?.key === key
        ? dragState.preview
        : basePosition
    if (!position) continue
    const imagePlan = createImagePlan(position, key)
    imageRects[key] = imagePlan.rect
    imagePlans.set(key, imagePlan)
  }

  const dragPreviewImagePlan = imageDuplicatePreviewKey && dragState
    ? createImagePlan(dragState.preview, imageDuplicatePreviewKey)
    : null

  return { imagePlans, imageRects, dragPreviewImagePlan }
}

export function buildCanvasTypographyRenderPlans<BlockId extends string, StyleKey extends string>({
  ctx,
  blockOrder,
  textContent,
  styleAssignments,
  styles,
  blockTextAlignments,
  blockVerticalAlignments,
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
  getBlockHeightBaselines,
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
  getBlockTextFormatRuns,
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
    blockVerticalAlignments,
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
    getBlockHeightBaselines,
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
    wrapText: ({ context, key, styleKey, text, maxWidth, hyphenate }) => (
      getWrappedText(
        context,
        text,
        maxWidth,
        hyphenate,
        getBlockTrackingScale(key),
        isBlockOpticalKerningEnabled(key),
        getBlockTrackingRuns(key),
        {
          fontFamily: getBlockFont(key, styleKey),
          fontWeight: getBlockFontWeight(key, styleKey),
          italic: isBlockItalic(key, styleKey),
          styleKey,
          color: getBlockTextColor(key),
        },
        getBlockTextFormatRuns(key, getBlockTextColor(key)),
        (segmentStyleKey) => resolveScaledCanvasFontSize(
          getBlockFontSize(key, segmentStyleKey),
          fontScale,
          getBlockFontSize(key, styleKey),
        ),
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
    const segmentLines = plan.commands.map((command) => buildPositionedTextFormatTrackingGraphemes(ctx, {
      sourceText: textContent[plan.key] ?? "",
      command,
      textAlign: plan.textAlign,
      baseFormat: {
        fontFamily: blockFont,
        fontWeight: blockFontWeight,
        italic: blockItalic,
        styleKey: plan.styleKey,
        color: getBlockTextColor(plan.key),
      },
      formatRuns: getBlockTextFormatRuns(plan.key, getBlockTextColor(plan.key)),
      baseTrackingScale: trackingScale,
      trackingRuns,
      resolveFontSize: (styleKey) => resolveScaledCanvasFontSize(
        getBlockFontSize(plan.key, styleKey),
        fontScale,
        plan.fontSize,
      ),
      opticalKerning,
    }))
    const renderedLines = buildRenderedTextLines(
      ctx,
      textContent[plan.key] ?? "",
      plan.commands,
      segmentLines,
      planFont,
      opticalKerning,
    )
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
        plan.textVerticalAlign,
        plan.blockRotation.toFixed(2),
        plan.span,
        plan.rowSpan,
        plan.columnReflow ? 1 : 0,
        plan.heightBaselines,
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
        segmentLines
          .map((segments) => segments.map((segment) => (
            `${segment.text}:${segment.fontFamily}:${segment.fontWeight}:${segment.italic ? 1 : 0}:${segment.styleKey}:${segment.color}:${segment.fontSize}:${segment.trackingScale}`
          )).join("||"))
          .join("###"),
      ].join("|"),
      font: planFont,
      textColor: getBlockTextColor(plan.key),
      textAlign: plan.textAlign,
      textVerticalAlign: plan.textVerticalAlign,
      blockRotation: plan.blockRotation,
      rotationOriginX: plan.rotationOriginX,
      rotationOriginY: plan.rotationOriginY,
      opticalKerning,
      trackingScale,
      trackingRuns,
      sourceText: textContent[plan.key] ?? "",
      segmentLines,
      renderedLines,
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
      drawCanvasImagePlan(ctx, imagePlan)
      continue
    }

    const textPlan = textPlans.get(key)
    if (!textPlan) continue
    drawCanvasTextPlan(ctx, textPlan)
  }
}

export function drawCanvasImagePlan(
  ctx: CanvasRenderingContext2D,
  imagePlan: CanvasImageRenderPlan,
): void {
  ctx.fillStyle = imagePlan.color
  ctx.globalAlpha = imagePlan.opacity
  if (Math.abs(imagePlan.rotation) > 0.0001) {
    ctx.save()
    ctx.translate(imagePlan.rotationOriginX, imagePlan.rotationOriginY)
    ctx.rotate((imagePlan.rotation * Math.PI) / 180)
    ctx.translate(-imagePlan.rotationOriginX, -imagePlan.rotationOriginY)
    ctx.fillRect(imagePlan.rect.x, imagePlan.rect.y, imagePlan.rect.width, imagePlan.rect.height)
    ctx.restore()
  } else {
    ctx.fillRect(imagePlan.rect.x, imagePlan.rect.y, imagePlan.rect.width, imagePlan.rect.height)
  }
  ctx.globalAlpha = 1
}

export function drawCanvasTextPlan<Key extends string>(
  ctx: CanvasRenderingContext2D,
  textPlan: BlockRenderPlan<Key>,
): void {
  ctx.fillStyle = textPlan.textColor
  ctx.textAlign = "left"
  for (const lineSegments of textPlan.segmentLines) {
    for (const segment of lineSegments) {
      ctx.fillStyle = segment.color
      applyCanvasTextConfig(ctx, {
        font: buildCanvasFont(segment.fontFamily, segment.fontWeight, segment.italic, segment.fontSize),
        opticalKerning: textPlan.opticalKerning,
      })
      drawCanvasText(ctx, {
        text: segment.text,
        x: segment.x,
        y: segment.y,
        textAlign: "left",
        trackingScale: segment.trackingScale,
        opticalKerning: textPlan.opticalKerning,
        fontSize: segment.fontSize,
        blockRotation: textPlan.blockRotation,
        rotationOrigin: {
          x: textPlan.rotationOriginX,
          y: textPlan.rotationOriginY,
        },
      })
    }
  }
}
