import type { GridResult } from "@/lib/grid-calculator"
import {
  DEFAULT_BASE_FONT,
  getStyleDefaultFontWeight,
  resolveFontVariant,
  type FontFamily,
} from "@/lib/config/fonts"
import { resolveImageSchemeColor, type ImageColorSchemeId } from "@/lib/config/color-schemes"
import {
  BASE_BLOCK_IDS,
  DEFAULT_STYLE_ASSIGNMENTS,
  DEFAULT_TEXT_CONTENT,
  isBaseBlockId,
} from "@/lib/document-defaults"
import { clampFxLeading, clampFxSize, clampRotation } from "@/lib/block-constraints"
import { parseHexColor, type RgbColor } from "@/lib/export-colors"
import {
  buildAxisStarts,
  findNearestAxisIndex,
  resolveAxisSizes,
  sumAxisSpan,
} from "@/lib/grid-rhythm"
import {
  clearOpticalMarginMeasurementCache,
  getOpticalMarginAnchorOffset,
} from "@/lib/optical-margin"
import { wrapTextDetailed, getDefaultColumnSpan } from "@/lib/text-layout"
import { mapTextBlockPositionsToAbsolute } from "@/lib/text-block-position"
import {
  buildTypographyLayoutPlan,
  type TypographyLayoutPlan,
} from "@/lib/typography-layout-plan"
import {
  buildPositionedTextFormatTrackingSegments,
  measureFormattedTextRangeWidth,
  normalizeTextFormatRuns,
  type TextFormatRun,
  type PositionedTextFormatTrackingSegment,
} from "@/lib/text-format-runs"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  DEFAULT_OPTICAL_KERNING,
  DEFAULT_TRACKING_SCALE,
  normalizeOpticalKerning,
  normalizeTrackingScale,
} from "@/lib/text-rendering"
import {
  measureTrackedTextRangeWidth,
  normalizeTextTrackingRuns,
  type TextTrackingRun,
} from "@/lib/text-tracking-runs"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { resolveSyllableDivisionEnabled, resolveTextReflowEnabled } from "@/lib/typography-behavior"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type BlockId = string
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

export type PageExportLine = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type PageExportRect = {
  x: number
  y: number
  width: number
  height: number
}

export type PageExportGuideGroup = {
  id: "margins" | "modules" | "baselines"
  strokeColor: RgbColor
  strokeWidth: number
  dashPattern: number[]
  clipToPage: boolean
  lines: PageExportLine[]
  rects: PageExportRect[]
}

export type PageExportImagePlan = PageExportRect & {
  key: BlockId
  fillColor: RgbColor
}

export type PageExportTextPlan = TypographyLayoutPlan<BlockId, TypographyStyleKey> & {
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  leading: number
  trackingScale: number
  trackingRuns: TextTrackingRun[]
  opticalKerning: boolean
  textColor: RgbColor
  sourceText: string
  segmentLines: PositionedTextFormatTrackingSegment<TypographyStyleKey, FontFamily>[][]
}

export type PageExportPlan = {
  pageWidth: number
  pageHeight: number
  rotation: number
  backgroundColor: RgbColor | null
  pageOutline: {
    strokeColor: RgbColor
    strokeWidth: number
  } | null
  guideGroups: PageExportGuideGroup[]
  orderedLayerKeys: BlockId[]
  imagePlans: PageExportImagePlan[]
  textPlans: PageExportTextPlan[]
}

type BuildPageExportPlanArgs = {
  result: GridResult
  layout: PreviewLayoutState | null
  baseFont?: FontFamily
  imageColorScheme: ImageColorSchemeId
  canvasBackground?: string | null
  rotation: number
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
  monochromeGuides?: boolean
}

type ExportTextContext = {
  canvasFont: string
  opticalKerning: boolean
  trackingScale: number
  trackingRuns: TextTrackingRun[]
  baseFormat: {
    fontFamily: FontFamily
    fontWeight: number
    italic: boolean
    styleKey: TypographyStyleKey
    color: string
  }
  formatRuns: TextFormatRun<TypographyStyleKey, FontFamily>[]
  resolveFontSize: (styleKey: TypographyStyleKey) => number
  sourceText: string
  measureWidth: (text: string, range?: { start: number; end: number }) => number
}

function createTextMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  return canvas.getContext("2d")
}

function estimateTextAscent(
  measureContext: CanvasRenderingContext2D | null,
  canvasFont: string,
  fallbackFontSize: number,
): number {
  if (!measureContext) return fallbackFontSize * 0.8
  measureContext.font = canvasFont
  const metrics = measureContext.measureText("Hg")
  return metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : fallbackFontSize * 0.8
}

function reconcileLayerOrder(
  current: readonly BlockId[],
  blockOrder: readonly BlockId[],
  imageOrder: readonly BlockId[],
): BlockId[] {
  const validKeys = new Set<BlockId>([...imageOrder, ...blockOrder])
  const next: BlockId[] = []
  const seen = new Set<BlockId>()

  for (const key of current) {
    if (!validKeys.has(key) || seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of imageOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of blockOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  return next
}

export function buildPageExportPlan({
  result,
  layout,
  baseFont = DEFAULT_BASE_FONT,
  imageColorScheme,
  canvasBackground = null,
  rotation,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders,
  showTypography,
  monochromeGuides = false,
}: BuildPageExportPlanArgs): PageExportPlan {
  clearOpticalMarginMeasurementCache()

  const sourceWidth = result.pageSizePt.width
  const sourceHeight = result.pageSizePt.height
  const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
  const { width: modW, height: modH } = result.module
  const { gridCols, gridRows } = result.settings
  const moduleWidths = resolveAxisSizes(result.module.widths, gridCols, modW)
  const moduleHeights = resolveAxisSizes(result.module.heights, gridRows, modH)
  const colStarts = buildAxisStarts(moduleWidths, gridMarginHorizontal)
  const rowStarts = buildAxisStarts(moduleHeights, gridMarginVertical)
  const rowStartsInBaselines = rowStarts.map((value) => value / Math.max(0.0001, gridUnit))
  const firstColumnStep = (moduleWidths[0] ?? modW) + gridMarginHorizontal
  const firstRowStep = (moduleHeights[0] ?? modH) + gridMarginVertical
  const showPageOutline = showMargins || showModules || showBaselines
  const guideContentTop = margins.top
  const guideBaselineSpacing = gridUnit
  const guideBaselineRows = Math.max(
    0,
    Math.round((sourceHeight - (margins.top + margins.bottom)) / guideBaselineSpacing),
  )
  const guideContentBottom = guideContentTop + guideBaselineRows * guideBaselineSpacing
  const contentTop = margins.top
  const contentLeft = margins.left
  const baselineStep = gridUnit
  const baselineOriginTop = contentTop - baselineStep
  const maxBaselineRow = Math.max(
    0,
    Math.floor((sourceHeight - margins.top - margins.bottom) / gridUnit),
  )

  const backgroundColor = canvasBackground
    ? parseHexColor(resolveImageSchemeColor(canvasBackground, imageColorScheme))
    : null

  const pageOutline = showPageOutline
    ? {
      strokeColor: monochromeGuides ? { r: 172, g: 172, b: 172 } : { r: 229, g: 229, b: 229 },
      strokeWidth: 0.4,
    }
    : null

  const guideGroups: PageExportGuideGroup[] = []
  if (showMargins) {
    guideGroups.push({
      id: "margins",
      strokeColor: monochromeGuides ? { r: 88, g: 88, b: 88 } : { r: 59, g: 130, b: 246 },
      strokeWidth: 0.5,
      dashPattern: [4, 4],
      clipToPage: false,
      lines: [],
      rects: [{
        x: margins.left,
        y: guideContentTop,
        width: sourceWidth - (margins.left + margins.right),
        height: guideContentBottom - guideContentTop,
      }],
    })
  }

  if (showModules) {
    const rects: PageExportRect[] = []
    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
        rects.push({
          x: margins.left + (colStarts[col] ?? col * firstColumnStep),
          y: margins.top + (rowStarts[row] ?? row * firstRowStep),
          width: moduleWidths[col] ?? modW,
          height: moduleHeights[row] ?? modH,
        })
      }
    }
    guideGroups.push({
      id: "modules",
      strokeColor: monochromeGuides ? { r: 116, g: 116, b: 116 } : { r: 6, g: 182, b: 212 },
      strokeWidth: 0.4,
      dashPattern: [],
      clipToPage: false,
      lines: [],
      rects,
    })
  }

  if (showBaselines) {
    const lines: PageExportLine[] = []
    const halfDiag = Math.sqrt(sourceWidth * sourceWidth + sourceHeight * sourceHeight) / 2
    const extStartY = guideContentTop - halfDiag
    const extEndY = sourceHeight + halfDiag
    const rowsAbove = Math.ceil((guideContentTop - extStartY) / guideBaselineSpacing)
    const startY = guideContentTop - rowsAbove * guideBaselineSpacing
    const totalRows = Math.ceil((extEndY - startY) / guideBaselineSpacing)
    for (let row = 0; row <= totalRows; row += 1) {
      const y = startY + row * guideBaselineSpacing
      if (y > extEndY) break
      lines.push({
        x1: -halfDiag,
        y1: y,
        x2: sourceWidth + halfDiag,
        y2: y,
      })
    }
    guideGroups.push({
      id: "baselines",
      strokeColor: monochromeGuides ? { r: 148, g: 148, b: 148 } : { r: 236, g: 72, b: 153 },
      strokeWidth: 0.3,
      dashPattern: [],
      clipToPage: true,
      lines,
      rects: [],
    })
  }

  const imageOrder = layout?.imageOrder?.filter(
    (key): key is BlockId => typeof key === "string" && key.length > 0,
  ) ?? []
  const imageModulePositions = layout?.imageModulePositions ?? {}
  const imageColumnSpans = layout?.imageColumnSpans ?? {}
  const imageRowSpans = layout?.imageRowSpans ?? {}
  const imageColors = layout?.imageColors ?? {}
  const fallbackImageColor = parseHexColor(resolveImageSchemeColor(undefined, imageColorScheme)) ?? { r: 11, g: 53, b: 54 }
  const imagePlans: PageExportImagePlan[] = []

  if (showImagePlaceholders) {
    for (const key of imageOrder) {
      const manual = imageModulePositions[key]
      if (!manual || typeof manual.col !== "number" || typeof manual.row !== "number") continue

      const spanRaw = imageColumnSpans[key] ?? 1
      const rowRaw = imageRowSpans[key] ?? 1
      const span = Math.max(1, Math.min(gridCols, spanRaw))
      const rows = Math.max(1, Math.min(gridRows, rowRaw))
      const minCol = -Math.max(0, span - 1)
      const col = Math.max(minCol, Math.min(Math.max(0, gridCols - 1), manual.col))
      const row = Math.max(-Math.max(0, maxBaselineRow), Math.min(maxBaselineRow, manual.row))
      const rowStartIndex = Math.max(
        0,
        Math.min(Math.max(0, gridRows - 1), findNearestAxisIndex(rowStartsInBaselines, row)),
      )
      imagePlans.push({
        key,
        x: contentLeft + (col < 0 ? col * firstColumnStep : (colStarts[col] ?? col * firstColumnStep)),
        y: baselineOriginTop + row * baselineStep + baselineStep,
        width: sumAxisSpan(moduleWidths, col, span, gridMarginHorizontal),
        height: sumAxisSpan(moduleHeights, rowStartIndex, rows, gridMarginVertical),
        fillColor: parseHexColor(resolveImageSchemeColor(imageColors[key], imageColorScheme)) ?? fallbackImageColor,
      })
    }
  }

  const styleDefinitions = result.typography.styles
  const blockOrder = layout?.blockOrder?.filter((key): key is BlockId => typeof key === "string" && key.length > 0) ?? [...BASE_BLOCK_IDS]
  const textContent: Record<BlockId, string> = layout?.textContent
    ? { ...layout.textContent }
    : { ...DEFAULT_TEXT_CONTENT } as Record<BlockId, string>
  const styleAssignments: Record<BlockId, TypographyStyleKey> = layout?.styleAssignments
    ? { ...layout.styleAssignments }
    : { ...DEFAULT_STYLE_ASSIGNMENTS } as Record<BlockId, TypographyStyleKey>
  const blockFontFamilies = layout?.blockFontFamilies ?? {}
  const blockColumnSpans = layout?.blockColumnSpans ?? {}
  const blockRowSpans = layout?.blockRowSpans ?? {}
  const blockTextAlignments = layout?.blockTextAlignments ?? {}
  const blockTextReflow = layout?.blockTextReflow ?? {}
  const blockSyllableDivision = layout?.blockSyllableDivision ?? {}
  const blockFontWeights = layout?.blockFontWeights ?? {}
  const blockOpticalKerning = layout?.blockOpticalKerning ?? {}
  const blockTrackingScales = layout?.blockTrackingScales ?? {}
  const blockTrackingRuns = layout?.blockTrackingRuns ?? {}
  const blockTextFormatRuns = layout?.blockTextFormatRuns ?? {}
  const blockBold = layout?.blockBold ?? {}
  const blockItalic = layout?.blockItalic ?? {}
  const blockRotations = layout?.blockRotations ?? {}
  const blockCustomSizes = layout?.blockCustomSizes ?? {}
  const blockCustomLeadings = layout?.blockCustomLeadings ?? {}
  const blockTextColors = layout?.blockTextColors ?? {}
  const storedBlockModulePositions = layout?.blockModulePositions ?? {}
  const blockModulePositions = mapTextBlockPositionsToAbsolute(storedBlockModulePositions, rowStartsInBaselines)
  const orderedLayerKeys = reconcileLayerOrder(
    layout?.layerOrder?.filter((key): key is BlockId => typeof key === "string" && key.length > 0) ?? [],
    blockOrder,
    imageOrder,
  )

  const textMeasureContext = createTextMeasureContext()

  const getBlockSpan = (key: BlockId) => {
    const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, gridCols)
    return Math.max(1, Math.min(gridCols, raw))
  }

  const getBlockRows = (key: BlockId) => {
    const raw = blockRowSpans[key] ?? 1
    return Math.max(1, Math.min(gridRows, raw))
  }

  const getStyleKeyForBlock = (key: BlockId): TypographyStyleKey => {
    const assigned = styleAssignments[key]
    if (assigned && Object.hasOwn(styleDefinitions, assigned)) return assigned
    if (isBaseBlockId(key)) return DEFAULT_STYLE_ASSIGNMENTS[key] as TypographyStyleKey
    return "body"
  }

  const isTextReflowEnabled = (key: BlockId) => (
    resolveTextReflowEnabled(key, getStyleKeyForBlock(key), getBlockSpan(key), blockTextReflow)
  )
  const isSyllableDivisionEnabled = (key: BlockId) => (
    resolveSyllableDivisionEnabled(key, getStyleKeyForBlock(key), blockSyllableDivision)
  )
  const getBlockFont = (key: BlockId): FontFamily => blockFontFamilies[key] ?? baseFont
  const getStyleDefaultItalic = (styleKey: TypographyStyleKey) => styleDefinitions[styleKey]?.blockItalic === true
  const getStyleDefaultWeight = (styleKey: TypographyStyleKey) => (
    getStyleDefaultFontWeight(styleDefinitions[styleKey]?.weight)
  )
  const getResolvedFontVariantForBlock = (key: BlockId, styleKey: TypographyStyleKey) => {
    const weightOverride = blockFontWeights[key]
    const legacyBoldOverride = blockBold[key]
    const requestedWeight = typeof weightOverride === "number" && Number.isFinite(weightOverride) && weightOverride > 0
      ? weightOverride
      : legacyBoldOverride === true
        ? 700
        : legacyBoldOverride === false
          ? 400
          : getStyleDefaultWeight(styleKey)
    const italicOverride = blockItalic[key]
    const requestedItalic = italicOverride === true || italicOverride === false
      ? italicOverride
      : getStyleDefaultItalic(styleKey)
    return resolveFontVariant(getBlockFont(key), requestedWeight, requestedItalic)
  }
  const getBlockFontWeight = (key: BlockId, styleKey: TypographyStyleKey) => (
    getResolvedFontVariantForBlock(key, styleKey).weight
  )
  const isBlockItalic = (key: BlockId, styleKey: TypographyStyleKey) => (
    getResolvedFontVariantForBlock(key, styleKey).italic
  )
  const isBlockOpticalKerningEnabled = (key: BlockId) => (
    normalizeOpticalKerning(blockOpticalKerning[key] ?? DEFAULT_OPTICAL_KERNING)
  )
  const getBlockTrackingScale = (key: BlockId) => (
    normalizeTrackingScale(blockTrackingScales[key] ?? DEFAULT_TRACKING_SCALE)
  )
  const getBlockTrackingRuns = (key: BlockId) => (
    normalizeTextTrackingRuns(
      textContent[key] ?? "",
      blockTrackingRuns[key],
      getBlockTrackingScale(key),
    )
  )
  const getResolvedBlockTextColor = (key: BlockId) => (
    resolveImageSchemeColor(blockTextColors[key], imageColorScheme)
  )
  const getBlockTextFormatRuns = (key: BlockId, styleKey: TypographyStyleKey) => (
    normalizeTextFormatRuns(
      textContent[key] ?? "",
      blockTextFormatRuns[key],
      {
        fontFamily: getBlockFont(key),
        fontWeight: getBlockFontWeight(key, styleKey),
        italic: isBlockItalic(key, styleKey),
        styleKey,
        color: getResolvedBlockTextColor(key),
      },
    )
  )
  const getBlockRotation = (key: BlockId) => {
    const raw = blockRotations[key]
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 0
    return clampRotation(raw)
  }
  const getBlockFontSize = (key: BlockId, styleKey: TypographyStyleKey, defaultSize: number) => {
    if (styleKey !== "fx") return defaultSize
    const raw = blockCustomSizes[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultSize
    return clampFxSize(raw)
  }
  const getBlockBaselineMultiplier = (
    key: BlockId,
    styleKey: TypographyStyleKey,
    defaultMultiplier: number,
  ) => {
    if (styleKey !== "fx") return defaultMultiplier
    const raw = blockCustomLeadings[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultMultiplier
    return Math.max(0.01, clampFxLeading(raw) / gridUnit)
  }
  const getOriginForBlock = (key: BlockId, fallbackX: number, fallbackY: number) => {
    const manual = blockModulePositions[key]
    if (!manual || typeof manual.col !== "number" || typeof manual.row !== "number") {
      return { x: fallbackX, y: fallbackY }
    }
    const span = getBlockSpan(key)
    const minCol = -Math.max(0, span - 1)
    const minRow = -Math.max(0, maxBaselineRow)
    const col = Math.max(minCol, Math.min(Math.max(0, gridCols - 1), manual.col))
    const row = Math.max(minRow, Math.min(maxBaselineRow, manual.row))
    return {
      x: contentLeft + (col < 0 ? col * firstColumnStep : (colStarts[col] ?? col * firstColumnStep)),
      y: baselineOriginTop + row * baselineStep,
    }
  }

  const layoutOutput = showTypography
    ? buildTypographyLayoutPlan<BlockId, TypographyStyleKey, ExportTextContext>({
      blockOrder,
      textContent,
      styleAssignments,
      styles: styleDefinitions,
      blockTextAlignments,
      contentTop,
      contentLeft,
      pageHeight: sourceHeight,
      marginsBottom: margins.bottom,
      baselineStep,
      moduleWidth: modW,
      moduleHeight: modH,
      moduleWidths,
      moduleHeights,
      gutterX: gridMarginHorizontal,
      gutterY: gridMarginVertical,
      gridRows,
      gridCols,
      fontScale: 1,
      bodyKey: "body",
      displayKey: "display",
      captionKey: "caption",
      defaultBodyStyleKey: "body",
      defaultCaptionStyleKey: "caption",
      getBlockSpan,
      getBlockRows,
      getBlockFontSize: ({ key, styleKey, defaultSize }) => getBlockFontSize(key, styleKey, defaultSize),
      getBlockBaselineMultiplier: ({ key, styleKey, defaultMultiplier }) => (
        getBlockBaselineMultiplier(key, styleKey, defaultMultiplier)
      ),
      getBlockRotation,
      isTextReflowEnabled,
      isSyllableDivisionEnabled,
      isBlockPositionManual: (key) => {
        const manual = blockModulePositions[key]
        return Boolean(manual && typeof manual.col === "number" && typeof manual.row === "number")
      },
      getBlockColumnStart: (key, span) => {
        const manual = blockModulePositions[key]
        if (!manual || typeof manual.col !== "number") return 0
        const minCol = -Math.max(0, span - 1)
        return Math.max(minCol, Math.min(Math.max(0, gridCols - 1), manual.col))
      },
      getBlockRowStart: (key) => {
        const manual = blockModulePositions[key]
        if (!manual || typeof manual.row !== "number") return 0
        return Math.max(
          0,
          Math.min(Math.max(0, gridRows - 1), findNearestAxisIndex(rowStartsInBaselines, manual.row)),
        )
      },
      getOriginForBlock,
      createTextContext: ({ key, styleKey, fontSize }) => {
        const opticalKerning = isBlockOpticalKerningEnabled(key)
        const trackingScale = getBlockTrackingScale(key)
        const trackingRuns = getBlockTrackingRuns(key)
        const sourceText = textContent[key] ?? ""
        const baseFormat = {
          fontFamily: getBlockFont(key),
          fontWeight: getBlockFontWeight(key, styleKey),
          italic: isBlockItalic(key, styleKey),
          styleKey,
          color: getResolvedBlockTextColor(key),
        }
        const formatRuns = getBlockTextFormatRuns(key, styleKey)
        const resolveFontSize = (segmentStyleKey: TypographyStyleKey) => getBlockFontSize(key, segmentStyleKey, fontSize)
        const canvasFont = buildCanvasFont(
          baseFormat.fontFamily,
          baseFormat.fontWeight,
          baseFormat.italic,
          fontSize,
        )
        const measureWidth = (text: string, range?: { start: number; end: number }) => {
          if (textMeasureContext) {
            applyCanvasTextConfig(textMeasureContext, {
              font: canvasFont,
              opticalKerning,
            })
            if (range && (trackingRuns.length > 0 || formatRuns.length > 0)) {
              return measureFormattedTextRangeWidth(textMeasureContext, {
                sourceText,
                renderedText: text,
                range,
                baseFormat,
                formatRuns,
                baseTrackingScale: trackingScale,
                trackingRuns,
                resolveFontSize,
                opticalKerning,
              })
            }
            if (range && trackingRuns.length > 0) {
              return measureTrackedTextRangeWidth(textMeasureContext, {
                sourceText,
                renderedText: text,
                range,
                baseTrackingScale: trackingScale,
                runs: trackingRuns,
                fontSize,
                opticalKerning,
              })
            }
            return measureTrackedTextRangeWidth(textMeasureContext, {
              sourceText,
              renderedText: text,
              range: range ?? { start: 0, end: sourceText.length },
              baseTrackingScale: trackingScale,
              runs: trackingRuns,
              fontSize,
              opticalKerning,
            })
          }
          return text.length * fontSize * 0.56
        }
        return {
          canvasFont,
          opticalKerning,
          trackingScale,
          trackingRuns,
          baseFormat,
          formatRuns,
          resolveFontSize,
          sourceText,
          measureWidth,
        }
      },
      wrapText: ({ context, text, maxWidth, hyphenate }) =>
        wrapTextDetailed(text, maxWidth, hyphenate, context.measureWidth),
      textAscent: ({ context, fontSize }) =>
        estimateTextAscent(textMeasureContext, context.canvasFont, fontSize),
      opticalOffset: ({ context, styleKey, line, align, fontSize }) =>
        getOpticalMarginAnchorOffset({
          line,
          align,
          fontSize,
          styleKey,
          font: context.canvasFont,
          measureWidth: context.measureWidth,
        }),
    })
    : { plans: [] as TypographyLayoutPlan<BlockId, TypographyStyleKey>[], rects: {} as Record<BlockId, PageExportRect>, overflowByBlock: {} }

  const textPlans: PageExportTextPlan[] = layoutOutput.plans.map((plan) => ({
    ...plan,
    fontFamily: getBlockFont(plan.key),
    fontWeight: getBlockFontWeight(plan.key, plan.styleKey),
    italic: isBlockItalic(plan.key, plan.styleKey),
    leading: getBlockBaselineMultiplier(
      plan.key,
      plan.styleKey,
      styleDefinitions[plan.styleKey]?.baselineMultiplier ?? 1,
    ) * baselineStep,
    trackingScale: getBlockTrackingScale(plan.key),
    trackingRuns: getBlockTrackingRuns(plan.key),
    opticalKerning: isBlockOpticalKerningEnabled(plan.key),
    textColor: parseHexColor(getResolvedBlockTextColor(plan.key)) ?? { r: 31, g: 41, b: 55 },
    sourceText: textContent[plan.key] ?? "",
    segmentLines: [],
  }))

  for (const textPlan of textPlans) {
    if (!textMeasureContext) continue
    applyCanvasTextConfig(textMeasureContext, {
      font: buildCanvasFont(textPlan.fontFamily, textPlan.fontWeight, textPlan.italic, textPlan.fontSize),
      opticalKerning: textPlan.opticalKerning,
    })
    textPlan.segmentLines = textPlan.commands.map((command) => buildPositionedTextFormatTrackingSegments(textMeasureContext, {
      sourceText: textPlan.sourceText,
      command,
      textAlign: textPlan.textAlign,
      baseFormat: {
        fontFamily: textPlan.fontFamily,
        fontWeight: textPlan.fontWeight,
        italic: textPlan.italic,
        styleKey: textPlan.styleKey,
        color: getResolvedBlockTextColor(textPlan.key),
      },
      formatRuns: getBlockTextFormatRuns(textPlan.key, textPlan.styleKey),
      baseTrackingScale: textPlan.trackingScale,
      trackingRuns: textPlan.trackingRuns,
      resolveFontSize: (styleKey) => getBlockFontSize(textPlan.key, styleKey, textPlan.fontSize),
      opticalKerning: textPlan.opticalKerning,
    }))
  }

  const resolvedOrderedLayerKeys = orderedLayerKeys.filter((key) =>
    imagePlans.some((plan) => plan.key === key) || textPlans.some((plan) => plan.key === key),
  )
  for (const key of imageOrder) {
    if ((imagePlans.some((plan) => plan.key === key) || textPlans.some((plan) => plan.key === key))
      && !resolvedOrderedLayerKeys.includes(key)) {
      resolvedOrderedLayerKeys.push(key)
    }
  }
  for (const key of blockOrder) {
    if ((imagePlans.some((plan) => plan.key === key) || textPlans.some((plan) => plan.key === key))
      && !resolvedOrderedLayerKeys.includes(key)) {
      resolvedOrderedLayerKeys.push(key)
    }
  }

  return {
    pageWidth: sourceWidth,
    pageHeight: sourceHeight,
    rotation,
    backgroundColor,
    pageOutline,
    guideGroups,
    orderedLayerKeys: resolvedOrderedLayerKeys,
    imagePlans,
    textPlans,
  }
}
