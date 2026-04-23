import { clampFxLeading, clampFxSize, clampRotation } from "@/lib/block-constraints"
import { normalizeHeightMetrics } from "@/lib/block-height"
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
import {
  resolveGridColumnStarts,
  resolveGridFirstColumnStep,
} from "@/lib/grid-column-layout"
import { resolvePreviewColumnX } from "@/lib/preview-column-snap"
import { reconcileLayerOrder } from "@/lib/preview-layer-order"
import { clampFreePlacementRow, clampLayerColumn, resolveLayerColumnBounds } from "@/lib/layer-placement"
import type { LayoutPresetBrowserPage } from "@/lib/presets/types"
import {
  normalizeTextFormatRuns,
  type TextFormatRun,
} from "@/lib/text-format-runs"
import {
  normalizeTextTrackingRuns,
  type TextTrackingRun,
} from "@/lib/text-tracking-runs"
import {
  DEFAULT_OPTICAL_KERNING,
  DEFAULT_TRACKING_SCALE,
  normalizeOpticalKerning,
  normalizeTrackingScale,
} from "@/lib/text-rendering"
import { mapTextBlockPositionsToAbsolute } from "@/lib/text-block-position"
import { normalizeImagePlaceholderOpacity } from "@/lib/image-placeholder-opacity"
import { getDefaultColumnSpan } from "@/lib/text-layout"
import { resolveSyllableDivisionEnabled, resolveTextReflowEnabled } from "@/lib/typography-behavior"
import type { PreviewLayoutState, TextAlignMode, TextVerticalAlignMode } from "@/lib/types/preview-layout"
import { createTextMetricsService } from "@/lib/text-metrics-service"

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

function toTextVerticalAlign(value: unknown): TextVerticalAlignMode {
  return value === "bottom" || value === "center" ? value : "top"
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
  const blockHeightBaselines = layout?.blockHeightBaselines ?? {}
  const blockTextAlignments = layout?.blockTextAlignments ?? {}
  const blockVerticalAlignments = layout?.blockVerticalAlignments ?? {}
  const blockTextReflow = layout?.blockTextReflow ?? {}
  const blockSyllableDivision = layout?.blockSyllableDivision ?? {}
  const blockSnapToColumns = layout?.blockSnapToColumns ?? {}
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
  const imageHeightBaselines = layout?.imageHeightBaselines ?? {}
  const imageSnapToColumns = layout?.imageSnapToColumns ?? {}
  const imageSnapToBaseline = layout?.imageSnapToBaseline ?? {}
  const imageRotations = layout?.imageRotations ?? {}
  const imageColors = layout?.imageColors ?? {}
  const imageOpacities = layout?.imageOpacities ?? {}

  const { width, height } = result.pageSizePt
  const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
  const { width: moduleWidthBase, height: moduleHeightBase } = result.module
  const { gridCols, gridRows } = result.settings
  const moduleWidths = resolveAxisSizes(result.module.widths, gridCols, moduleWidthBase)
  const moduleHeights = resolveAxisSizes(result.module.heights, gridRows, moduleHeightBase)
  const colStarts = resolveGridColumnStarts(result, moduleWidths)
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
  const firstColumnStep = resolveGridFirstColumnStep(moduleWidths, colStarts, gridMarginHorizontal, moduleWidthBase)
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
    return normalizeHeightMetrics({
      rows: blockRowSpans[key],
      baselines: blockHeightBaselines[key],
      gridRows,
    }).rows
  }

  const getBlockHeightBaselines = (key: BlockId) => {
    return normalizeHeightMetrics({
      rows: blockRowSpans[key],
      baselines: blockHeightBaselines[key],
      gridRows,
    }).baselines
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
    return normalizeHeightMetrics({
      rows: imageRowSpans[key],
      baselines: imageHeightBaselines[key],
      gridRows,
    }).rows
  }

  const getImageHeightBaselines = (key: BlockId): number => {
    return normalizeHeightMetrics({
      rows: imageRowSpans[key],
      baselines: imageHeightBaselines[key],
      gridRows,
    }).baselines
  }

  const isImageSnapToColumnsEnabled = (key: BlockId): boolean => imageSnapToColumns[key] !== false
  const isImageSnapToBaselineEnabled = (key: BlockId): boolean => imageSnapToBaseline[key] !== false
  const getImageRotation = (key: BlockId): number => {
    const raw = imageRotations[key]
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 0
    return clampRotation(raw)
  }

  const toColumnX = (col: number) => {
    return contentLeft + resolvePreviewColumnX(col, colStarts, firstColumnStep) * scale
  }

  const imageRenderState = buildCanvasImagePlans({
    imageOrder,
    imageModulePositions,
    getImageSpan,
    getImageRows,
    getImageHeightBaselines,
    getImageColor: (key) => resolveImageSchemeColor(imageColors[key], page.imageColorScheme),
    getImageOpacity: (key) => normalizeImagePlaceholderOpacity(imageOpacities[key]),
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
    const textMetrics = createTextMetricsService<TypographyStyleKey, FontFamily>()
    textMetrics.clearCaches()

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
      blockVerticalAlignments: Object.fromEntries(
        blockOrder.map((key) => [key, toTextVerticalAlign(blockVerticalAlignments[key])]),
      ) as Partial<Record<BlockId, TextVerticalAlignMode>>,
      contentTop,
      contentLeft,
      pageHeight,
      marginsBottom: margins.bottom * scale,
      baselineStep,
      moduleWidth: moduleWidthBase * scale,
      moduleHeight: moduleHeightBase * scale,
      moduleWidths: moduleWidths.map((value) => value * scale),
      columnStarts: colStarts.map((value) => value * scale),
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
      getBlockHeightBaselines,
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
        const { minCol } = resolveLayerColumnBounds({
          span,
          gridCols,
          snapToColumns: blockSnapToColumns[key] !== false,
        })
        const rawCol = blockSnapToColumns[key] !== false ? manual.col : Math.round(manual.col)
        return Math.max(minCol, Math.min(Math.max(0, gridCols - 1), rawCol))
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
        const col = clampLayerColumn(manual.col, {
          span,
          gridCols,
          snapToColumns: blockSnapToColumns[key] !== false,
        })
        const row = clampFreePlacementRow(manual.row, maxBaselineRow)
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
      getWrappedText: textMetrics.getWrappedText,
      getOpticalOffset: (canvasContext, _key, styleKey, line, align, fontSize, opticalKerning) => (
        textMetrics.getOpticalOffset(
          canvasContext,
          styleKey,
          line,
          align,
          fontSize,
          opticalKerning,
        )
      ),
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
