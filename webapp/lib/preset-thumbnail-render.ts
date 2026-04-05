import { clampFxLeading, clampFxSize, clampRotation } from "@/lib/block-constraints"
import {
  buildCanvasImagePlans,
  buildCanvasTypographyRenderPlans,
  buildOrderedCanvasLayerKeys,
  drawCanvasLayerStack,
} from "@/lib/canvas-page-renderer"
import {
  getDefaultTextSchemeColor,
  resolveImageSchemeColor,
} from "@/lib/config/color-schemes"
import {
  getStyleDefaultFontWeight,
  isFontFamily,
  resolveFontVariant,
  type FontFamily,
} from "@/lib/config/fonts"
import { DEFAULT_STYLE_ASSIGNMENTS, DEFAULT_TEXT_CONTENT, isBaseBlockId } from "@/lib/document-defaults"
import { buildAxisStarts, findNearestAxisIndex, resolveAxisSizes } from "@/lib/grid-rhythm"
import { getOpticalMarginAnchorOffset } from "@/lib/optical-margin"
import { reconcileLayerOrder } from "@/lib/preview-layer-order"
import type { LayoutPresetBrowserPage } from "@/lib/presets/types"
import {
  measureFormattedTextRangeWidth,
  normalizeTextFormatRuns,
  type BaseTextFormat,
  type TextFormatRun,
} from "@/lib/text-format-runs"
import {
  measureTrackedTextRangeWidth,
  normalizeTextTrackingRuns,
  type TextTrackingRun,
} from "@/lib/text-tracking-runs"
import {
  applyCanvasTextConfig,
  DEFAULT_OPTICAL_KERNING,
  DEFAULT_TRACKING_SCALE,
  measureCanvasTextWidth,
  normalizeOpticalKerning,
  normalizeTrackingScale,
} from "@/lib/text-rendering"
import { mapTextBlockPositionsToAbsolute } from "@/lib/text-block-position"
import { getDefaultColumnSpan, wrapTextDetailed } from "@/lib/text-layout"
import { resolveSyllableDivisionEnabled, resolveTextReflowEnabled } from "@/lib/typography-behavior"
import type { ModulePosition, PreviewLayoutState, TextAlignMode } from "@/lib/types/preview-layout"

type BlockId = string
type TypographyStyleKey = string
type ThumbnailLayout = PreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>
type TypographyStyleDefinition = {
  size: number
  leading: number
  weight: string
  blockItalic: boolean
  baselineMultiplier: number
}

function normalizeKeys(value: unknown): BlockId[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is BlockId => typeof entry === "string" && entry.trim().length > 0)
    .filter((key, index, source) => source.indexOf(key) === index)
}

function getThumbnailLayout(page: LayoutPresetBrowserPage): ThumbnailLayout | null {
  const raw = page.previewLayout
  if (!raw || typeof raw !== "object") return null
  return raw as ThumbnailLayout
}

function toTextAlign(value: unknown): TextAlignMode {
  return value === "right" || value === "center" ? value : "left"
}

function getStyleDefinitions(page: LayoutPresetBrowserPage): Record<TypographyStyleKey, TypographyStyleDefinition> {
  return page.result.typography.styles as Record<TypographyStyleKey, TypographyStyleDefinition>
}

function getResolvedBlockOrder(layout: ThumbnailLayout | null): BlockId[] {
  return normalizeKeys(layout?.blockOrder)
}

function getResolvedImageOrder(layout: ThumbnailLayout | null): BlockId[] {
  return normalizeKeys(layout?.imageOrder)
}

function getResolvedLayerOrder(
  layout: ThumbnailLayout | null,
  blockOrder: BlockId[],
  imageOrder: BlockId[],
): BlockId[] {
  return reconcileLayerOrder(normalizeKeys(layout?.layerOrder), blockOrder, imageOrder)
}

function getStyleKeyForBlock(
  key: BlockId,
  styleAssignments: Partial<Record<BlockId, TypographyStyleKey>>,
  styleDefinitions: Record<TypographyStyleKey, TypographyStyleDefinition>,
): TypographyStyleKey {
  const assigned = styleAssignments[key]
  if (assigned && Object.hasOwn(styleDefinitions, assigned)) return assigned
  if (isBaseBlockId(key)) return DEFAULT_STYLE_ASSIGNMENTS[key]
  return "body"
}

function getResolvedFontVariantForBlock(
  key: BlockId,
  styleKey: TypographyStyleKey,
  styleDefinitions: Record<TypographyStyleKey, TypographyStyleDefinition>,
  baseFont: FontFamily,
  layout: ThumbnailLayout | null,
) {
  const blockFontFamilies = layout?.blockFontFamilies ?? {}
  const requestedFont = blockFontFamilies[key]
  const blockFont = isFontFamily(requestedFont) ? requestedFont : baseFont
  const weightOverride = layout?.blockFontWeights?.[key]
  const legacyBoldOverride = layout?.blockBold?.[key]
  const requestedWeight = typeof weightOverride === "number" && Number.isFinite(weightOverride) && weightOverride > 0
    ? weightOverride
    : legacyBoldOverride === true
      ? 700
      : legacyBoldOverride === false
        ? 400
        : getStyleDefaultFontWeight(styleDefinitions[styleKey]?.weight)
  const italicOverride = layout?.blockItalic?.[key]
  const requestedItalic = italicOverride === true || italicOverride === false
    ? italicOverride
    : styleDefinitions[styleKey]?.blockItalic === true

  return {
    font: blockFont,
    variant: resolveFontVariant(blockFont, requestedWeight, requestedItalic),
  }
}

export function collectPresetThumbnailFontLoadSpecs(page: LayoutPresetBrowserPage): string[] {
  const layout = getThumbnailLayout(page)
  const blockOrder = getResolvedBlockOrder(layout)
  if (!blockOrder.length || typeof document === "undefined" || !("fonts" in document)) return []

  const styleDefinitions = getStyleDefinitions(page)
  const styleAssignments = layout?.styleAssignments ?? {}
  const blockCustomSizes = layout?.blockCustomSizes ?? {}
  const specs = new Set<string>()

  for (const key of blockOrder) {
    const styleKey = getStyleKeyForBlock(key, styleAssignments, styleDefinitions)
    const style = styleDefinitions[styleKey]
    if (!style) continue
    const defaultSize = style.size
    const rawCustomSize = blockCustomSizes[key]
    const fontSize = styleKey === "fx" && typeof rawCustomSize === "number" && Number.isFinite(rawCustomSize) && rawCustomSize > 0
      ? clampFxSize(rawCustomSize)
      : defaultSize
    const { font, variant } = getResolvedFontVariantForBlock(key, styleKey, styleDefinitions, page.baseFont, layout)
    specs.add(`${variant.italic ? "italic" : "normal"} ${variant.weight} ${Math.max(12, Math.round(fontSize))}px "${font}"`)
  }

  return [...specs]
}

export function drawPresetThumbnailToCanvas(
  canvas: HTMLCanvasElement,
  page: LayoutPresetBrowserPage,
  cssWidth: number,
  cssHeight: number,
  pixelRatio = 1,
): void {
  const safeWidth = Math.max(0, cssWidth)
  const safeHeight = Math.max(0, cssHeight)
  if (safeWidth <= 0 || safeHeight <= 0) return

  const targetWidth = Math.max(1, Math.round(safeWidth * pixelRatio))
  const targetHeight = Math.max(1, Math.round(safeHeight * pixelRatio))
  if (canvas.width !== targetWidth) canvas.width = targetWidth
  if (canvas.height !== targetHeight) canvas.height = targetHeight

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const result = page.result
  const layout = getThumbnailLayout(page)
  const styleDefinitions = getStyleDefinitions(page)
  const blockOrder = getResolvedBlockOrder(layout)
  const imageOrder = getResolvedImageOrder(layout)
  const layerOrder = getResolvedLayerOrder(layout, blockOrder, imageOrder)
  const styleAssignments = layout?.styleAssignments ?? {}
  const textContent = layout?.textContent ?? {}
  const blockColumnSpans = layout?.blockColumnSpans ?? {}
  const blockRowSpans = layout?.blockRowSpans ?? {}
  const blockTextAlignments = layout?.blockTextAlignments ?? {}
  const blockTextReflow = layout?.blockTextReflow ?? {}
  const blockSyllableDivision = layout?.blockSyllableDivision ?? {}
  const blockOpticalKerning = layout?.blockOpticalKerning ?? {}
  const blockTrackingScales = layout?.blockTrackingScales ?? {}
  const blockTrackingRuns = layout?.blockTrackingRuns ?? {}
  const blockTextFormatRuns = layout?.blockTextFormatRuns ?? {}
  const blockRotations = layout?.blockRotations ?? {}
  const blockCustomSizes = layout?.blockCustomSizes ?? {}
  const blockCustomLeadings = layout?.blockCustomLeadings ?? {}
  const blockTextColors = layout?.blockTextColors ?? {}
  const storedImageModulePositions = layout?.imageModulePositions ?? {}
  const imageColumnSpans = layout?.imageColumnSpans ?? {}
  const imageRowSpans = layout?.imageRowSpans ?? {}
  const imageColors = layout?.imageColors ?? {}

  const { width, height } = result.pageSizePt
  const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
  const { width: moduleWidthBase, height: moduleHeightBase } = result.module
  const { gridCols, gridRows } = result.settings
  const moduleWidths = resolveAxisSizes(result.module.widths, gridCols, moduleWidthBase)
  const moduleHeights = resolveAxisSizes(result.module.heights, gridRows, moduleHeightBase)
  const colStarts = buildAxisStarts(moduleWidths, gridMarginHorizontal)
  const rowStarts = buildAxisStarts(moduleHeights, gridMarginVertical)
  const rowStartsInBaselines = rowStarts.map((value) => value / Math.max(0.0001, gridUnit))
  const blockModulePositions = mapTextBlockPositionsToAbsolute(layout?.blockModulePositions ?? {}, rowStartsInBaselines)
  const imageModulePositions = mapTextBlockPositionsToAbsolute(storedImageModulePositions, rowStartsInBaselines)
  const scale = Math.min(safeWidth / width, safeHeight / height)
  const pageWidth = width * scale
  const pageHeight = height * scale
  const offsetX = (safeWidth - pageWidth) / 2
  const offsetY = (safeHeight - pageHeight) / 2
  const contentTop = margins.top * scale
  const contentLeft = margins.left * scale
  const baselineStep = gridUnit * scale
  const baselineOriginTop = contentTop - baselineStep
  const firstColumnStep = (moduleWidths[0] ?? moduleWidthBase) + gridMarginHorizontal
  const maxBaselineRow = Math.max(
    0,
    Math.floor((pageHeight - (margins.top + margins.bottom) * scale) / Math.max(0.0001, baselineStep)),
  )
  const defaultTextColor = getDefaultTextSchemeColor(page.imageColorScheme)
  const pageRotation = typeof page.uiSettings.rotation === "number" && Number.isFinite(page.uiSettings.rotation)
    ? clampRotation(page.uiSettings.rotation)
    : 0

  const getBlockSpan = (key: BlockId) => {
    const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, gridCols)
    return Math.max(1, Math.min(gridCols, Math.round(raw)))
  }

  const getBlockRows = (key: BlockId) => {
    const raw = blockRowSpans[key] ?? 1
    return Math.max(1, Math.min(gridRows, Math.round(raw)))
  }

  const getBlockFont = (key: BlockId, styleKey: TypographyStyleKey): FontFamily => {
    return getResolvedFontVariantForBlock(key, styleKey, styleDefinitions, page.baseFont, layout).font
  }

  const getBlockFontWeight = (key: BlockId, styleKey: TypographyStyleKey): number => {
    return getResolvedFontVariantForBlock(key, styleKey, styleDefinitions, page.baseFont, layout).variant.weight
  }

  const isBlockItalic = (key: BlockId, styleKey: TypographyStyleKey): boolean => {
    return getResolvedFontVariantForBlock(key, styleKey, styleDefinitions, page.baseFont, layout).variant.italic
  }

  const isBlockOpticalKerningEnabled = (key: BlockId): boolean => {
    return normalizeOpticalKerning(blockOpticalKerning[key] ?? DEFAULT_OPTICAL_KERNING)
  }

  const getBlockTrackingScale = (key: BlockId): number => {
    return normalizeTrackingScale(blockTrackingScales[key] ?? DEFAULT_TRACKING_SCALE)
  }

  const getBlockTrackingRuns = (key: BlockId): TextTrackingRun[] => {
    return normalizeTextTrackingRuns(
      textContent[key] ?? "",
      blockTrackingRuns[key],
      getBlockTrackingScale(key),
    )
  }

  const getBlockTextFormatRuns = (
    key: BlockId,
    styleKey: TypographyStyleKey,
    color: string,
  ): TextFormatRun<TypographyStyleKey, FontFamily>[] => (
    normalizeTextFormatRuns(
      textContent[key] ?? "",
      blockTextFormatRuns[key],
      {
        fontFamily: getBlockFont(key, styleKey),
        fontWeight: getBlockFontWeight(key, styleKey),
        italic: isBlockItalic(key, styleKey),
        styleKey,
        color,
      },
    )
  )

  const getBlockRotation = (key: BlockId): number => {
    const raw = blockRotations[key]
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 0
    return clampRotation(raw)
  }

  const getBlockFontSize = (key: BlockId, styleKey: TypographyStyleKey, defaultSize: number): number => {
    if (styleKey !== "fx") return defaultSize
    const raw = blockCustomSizes[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultSize
    return clampFxSize(raw)
  }

  const getBlockBaselineMultiplier = (
    key: BlockId,
    styleKey: TypographyStyleKey,
    defaultMultiplier: number,
  ): number => {
    if (styleKey !== "fx") return defaultMultiplier
    const raw = blockCustomLeadings[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultMultiplier
    return Math.max(0.01, clampFxLeading(raw) / gridUnit)
  }

  const getBlockTextColor = (key: BlockId): string => {
    const raw = blockTextColors[key]
    return typeof raw === "string" && raw.trim().length > 0 ? raw : defaultTextColor
  }

  const getImageSpan = (key: BlockId): number => {
    const raw = imageColumnSpans[key] ?? 1
    return Math.max(1, Math.min(gridCols, Math.round(raw)))
  }

  const getImageRows = (key: BlockId): number => {
    const raw = imageRowSpans[key] ?? 1
    return Math.max(1, Math.min(gridRows, Math.round(raw)))
  }

  const toColumnX = (col: number) => {
    if (col < 0) return contentLeft + col * firstColumnStep * scale
    const start = colStarts[col] ?? col * firstColumnStep
    return contentLeft + start * scale
  }

  const clampImageBaselinePosition = (position: ModulePosition, columns: number): ModulePosition => {
    const safeCols = Math.max(1, Math.min(gridCols, columns))
    const minCol = -Math.max(0, safeCols - 1)
    return {
      col: Math.max(minCol, Math.min(Math.max(0, gridCols - 1), position.col)),
      row: Math.max(-Math.max(0, maxBaselineRow), Math.min(maxBaselineRow, position.row)),
    }
  }

  const imageRenderState = buildCanvasImagePlans({
    imageOrder,
    imageModulePositions,
    getImageSpan,
    getImageRows,
    getImageColor: (key) => resolveImageSchemeColor(imageColors[key], page.imageColorScheme),
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
  const imagePlans = imageRenderState.imagePlans

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  ctx.clearRect(0, 0, safeWidth, safeHeight)
  ctx.imageSmoothingEnabled = true
  ctx.save()
  ctx.translate(offsetX + pageWidth / 2, offsetY + pageHeight / 2)
  ctx.rotate((pageRotation * Math.PI) / 180)
  ctx.translate(-pageWidth / 2, -pageHeight / 2)
  ctx.fillStyle = page.resolvedCanvasBackground ?? "#ffffff"
  ctx.fillRect(0, 0, pageWidth, pageHeight)
  ctx.beginPath()
  ctx.rect(0, 0, pageWidth, pageHeight)
  ctx.clip()

  if (blockOrder.length > 0) {
    const getWrappedTextForCanvas = (
      canvasContext: CanvasRenderingContext2D,
      text: string,
      maxWidth: number,
      hyphenate: boolean,
      trackingScale: number,
      opticalKerning: boolean,
      trackingRuns: readonly TextTrackingRun[] = [],
      baseFormat?: BaseTextFormat<TypographyStyleKey, FontFamily>,
      formatRuns?: readonly TextFormatRun<TypographyStyleKey, FontFamily>[],
      resolveFontSize?: (styleKey: TypographyStyleKey) => number,
    ) => {
      applyCanvasTextConfig(canvasContext, {
        font: canvasContext.font,
        opticalKerning,
      })
      const normalizedRuns = normalizeTextTrackingRuns(text, trackingRuns, trackingScale)
      return wrapTextDetailed(text, maxWidth, hyphenate, (sample, range) => {
        if (range && baseFormat && resolveFontSize && (normalizedRuns.length > 0 || (formatRuns?.length ?? 0) > 0)) {
          return measureFormattedTextRangeWidth(canvasContext, {
            sourceText: text,
            renderedText: sample,
            range,
            baseFormat,
            formatRuns,
            baseTrackingScale: trackingScale,
            trackingRuns: normalizedRuns,
            resolveFontSize,
            opticalKerning,
          })
        }
        if (range && normalizedRuns.length > 0) {
          return measureTrackedTextRangeWidth(canvasContext, {
            sourceText: text,
            renderedText: sample,
            range,
            baseTrackingScale: trackingScale,
            runs: normalizedRuns,
            fontSize: Number.parseFloat(canvasContext.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? "0"),
            opticalKerning,
          })
        }
        return measureCanvasTextWidth(canvasContext, sample, trackingScale, undefined, opticalKerning)
      })
    }

    const getOpticalOffsetForCanvas = (
      canvasContext: CanvasRenderingContext2D,
      _key: BlockId,
      styleKey: TypographyStyleKey,
      line: string,
      align: TextAlignMode,
      fontSize: number,
      opticalKerning: boolean,
      trackingScale: number,
    ) => {
      applyCanvasTextConfig(canvasContext, {
        font: canvasContext.font,
        opticalKerning,
      })
      return getOpticalMarginAnchorOffset({
        line,
        align,
        fontSize,
        styleKey,
        font: canvasContext.font,
        measureWidth: (sample) => measureCanvasTextWidth(canvasContext, sample, trackingScale, fontSize, opticalKerning),
      })
    }

    const typographyRenderState = buildCanvasTypographyRenderPlans<BlockId, TypographyStyleKey>({
      ctx,
      blockOrder,
      textContent: blockOrder.reduce((acc, key) => {
        const value = textContent[key]
        acc[key] = typeof value === "string" ? value : (isBaseBlockId(key) ? DEFAULT_TEXT_CONTENT[key] : "")
        return acc
      }, {} as Record<BlockId, string>),
      styleAssignments,
      styles: styleDefinitions,
      blockTextAlignments: Object.fromEntries(
        blockOrder.map((key) => [key, toTextAlign(blockTextAlignments[key])]),
      ) as Partial<Record<BlockId, TextAlignMode>>,
      contentTop,
      contentLeft,
      pageHeight,
      marginsBottom: margins.bottom * scale,
      baselineStep,
      moduleWidth: moduleWidthBase * scale,
      moduleHeight: moduleHeightBase * scale,
      moduleWidths: moduleWidths.map((value) => value * scale),
      moduleHeights: moduleHeights.map((value) => value * scale),
      gutterX: gridMarginHorizontal * scale,
      gutterY: gridMarginVertical * scale,
      gridRows,
      gridCols,
      fontScale: scale,
      bodyKey: "body",
      displayKey: "display",
      captionKey: "caption",
      defaultBodyStyleKey: "body",
      defaultCaptionStyleKey: "caption",
      getBlockSpan,
      getBlockRows,
      getBlockFontSize: (key, styleKey) => getBlockFontSize(key, styleKey, styleDefinitions[styleKey]?.size ?? 0),
      getBlockBaselineMultiplier: (key, styleKey) => (
        getBlockBaselineMultiplier(
          key,
          styleKey,
          styleDefinitions[styleKey]?.baselineMultiplier ?? 1,
        )
      ),
      getBlockRotation,
      isTextReflowEnabled: (key) => (
        resolveTextReflowEnabled(key, getStyleKeyForBlock(key, styleAssignments, styleDefinitions), getBlockSpan(key), blockTextReflow)
      ),
      isSyllableDivisionEnabled: (key) => (
        resolveSyllableDivisionEnabled(key, getStyleKeyForBlock(key, styleAssignments, styleDefinitions), blockSyllableDivision)
      ),
      isBlockPositionManual: (key) => blockModulePositions[key] !== undefined,
      getBlockColumnStart: (key, span) => {
        const manual = blockModulePositions[key]
        if (!manual) return 0
        const minCol = -Math.max(0, span - 1)
        return Math.max(minCol, Math.min(Math.max(0, gridCols - 1), manual.col))
      },
      getBlockRowStart: (key) => {
        const manual = blockModulePositions[key]
        if (!manual) return 0
        return Math.max(
          0,
          Math.min(Math.max(0, gridRows - 1), findNearestAxisIndex(rowStartsInBaselines, manual.row)),
        )
      },
      getOriginForBlock: (key, fallbackX, fallbackY) => {
        const manual = blockModulePositions[key]
        if (!manual) return { x: fallbackX, y: fallbackY }
        const span = getBlockSpan(key)
        const minCol = -Math.max(0, span - 1)
        const col = Math.max(minCol, Math.min(Math.max(0, gridCols - 1), manual.col))
        const row = Math.max(-Math.max(0, maxBaselineRow), Math.min(maxBaselineRow, manual.row))
        return {
          x: toColumnX(col),
          y: baselineOriginTop + row * baselineStep,
        }
      },
      getBlockFont,
      getBlockFontWeight,
      isBlockItalic,
      isBlockOpticalKerningEnabled,
      getBlockTrackingScale,
      getBlockTrackingRuns,
      getBlockTextFormatRuns: (key, color) => {
        const styleKey = getStyleKeyForBlock(key, styleAssignments, styleDefinitions)
        return getBlockTextFormatRuns(key, styleKey, color)
      },
      getBlockTextColor,
      getWrappedText: getWrappedTextForCanvas,
      getOpticalOffset: getOpticalOffsetForCanvas,
    })
    const orderedKeys = buildOrderedCanvasLayerKeys(
      layerOrder,
      imageOrder,
      blockOrder,
      imagePlans,
      typographyRenderState.textPlans,
    )
    drawCanvasLayerStack(ctx, orderedKeys, imagePlans, typographyRenderState.textPlans)
  } else {
    const orderedKeys = buildOrderedCanvasLayerKeys(
      layerOrder,
      imageOrder,
      blockOrder,
      imagePlans,
      new Map(),
    )
    drawCanvasLayerStack(ctx, orderedKeys, imagePlans, new Map())
  }

  ctx.restore()
}
