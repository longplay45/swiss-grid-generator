import type jsPDF from "jspdf"
import type { GridResult } from "@/lib/grid-calculator"
import type { TextAlignMode } from "@/lib/types/layout-primitives"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import {
  DEFAULT_BASE_FONT,
  getStyleDefaultFontWeight,
  isPdfSerifStyleFont,
  resolveFontVariant,
  type FontFamily,
} from "@/lib/config/fonts"
import { resolvePdfFontFamily } from "@/lib/pdf-font-registry"
import {
  clearOpticalMarginMeasurementCache,
  getOpticalMarginAnchorOffset,
} from "@/lib/optical-margin"
import { wrapText, getDefaultColumnSpan } from "@/lib/text-layout"
import { buildTypographyLayoutPlan } from "@/lib/typography-layout-plan"
import {
  BASE_BLOCK_IDS,
  DEFAULT_STYLE_ASSIGNMENTS,
  DEFAULT_TEXT_CONTENT,
  isBaseBlockId,
} from "@/lib/document-defaults"
import { clampFxLeading, clampFxSize, clampRotation } from "@/lib/block-constraints"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  DEFAULT_OPTICAL_KERNING,
  DEFAULT_TRACKING_SCALE,
  getTrackingLetterSpacing,
  measureCanvasTextWidth,
  normalizeOpticalKerning,
  normalizeTrackingScale,
  splitTextForTracking,
} from "@/lib/text-rendering"
import { resolveSyllableDivisionEnabled, resolveTextReflowEnabled } from "@/lib/typography-behavior"
import {
  buildAxisStarts,
  findNearestAxisIndex,
  resolveAxisSizes,
  sumAxisSpan,
} from "@/lib/grid-rhythm"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type BlockId = string
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>
type RgbColor = { r: number; g: number; b: number }
type CmykColor = { c: number; m: number; y: number; k: number }
type PrintProOptions = {
  enabled: boolean
  bleedPt: number
  cropMarkLengthPt: number
  cropMarkOffsetPt: number
  showBleedGuide?: boolean
  registrationMarks?: boolean
  monochromeGuides?: boolean
}

type ExportVectorPdfOptions = {
  pdf: jsPDF
  width: number
  height: number
  result: GridResult
  layout: PreviewLayoutState | null
  baseFont?: FontFamily
  originX?: number
  originY?: number
  canvasBackground?: string | null
  printPro?: PrintProOptions
  rotation: number
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
}

function getPdfFontFamily(fontFamily: FontFamily, fontWeight: number): string {
  const embedded = resolvePdfFontFamily(fontFamily, fontWeight)
  if (embedded) return embedded
  return isPdfSerifStyleFont(fontFamily) ? "times" : "helvetica"
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

function rgbToCmyk({ r, g, b }: RgbColor): CmykColor {
  const rr = r / 255
  const gg = g / 255
  const bb = b / 255
  const k = 1 - Math.max(rr, gg, bb)

  if (k >= 0.9999) {
    return { c: 0, m: 0, y: 0, k: 1 }
  }

  const c = (1 - rr - k) / (1 - k)
  const m = (1 - gg - k) / (1 - k)
  const y = (1 - bb - k) / (1 - k)

  return {
    c: Math.max(0, Math.min(1, c)),
    m: Math.max(0, Math.min(1, m)),
    y: Math.max(0, Math.min(1, y)),
    k: Math.max(0, Math.min(1, k)),
  }
}

function setDrawColorCmyk(pdf: jsPDF, color: RgbColor): void {
  const { c, m, y, k } = rgbToCmyk(color)
  pdf.setDrawColor(c, m, y, k)
}

function setTextColorCmyk(pdf: jsPDF, color: RgbColor): void {
  const { c, m, y, k } = rgbToCmyk(color)
  pdf.setTextColor(c, m, y, k)
}

function setFillColorCmyk(pdf: jsPDF, color: RgbColor): void {
  const { c, m, y, k } = rgbToCmyk(color)
  pdf.setFillColor(c, m, y, k)
}

function setDrawColorFromCmyk(pdf: jsPDF, color: CmykColor): void {
  pdf.setDrawColor(color.c, color.m, color.y, color.k)
}

function parseHexColor(value: string | undefined): RgbColor | null {
  if (!value || typeof value !== "string") return null
  const normalized = value.trim().replace(/^#/, "")
  const expanded = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized
  if (!/^[\da-fA-F]{6}$/.test(expanded)) return null
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  }
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

export function renderSwissGridVectorPdf({
  pdf,
  width,
  height,
  result,
  layout,
  baseFont = DEFAULT_BASE_FONT,
  originX = 0,
  originY = 0,
  canvasBackground = null,
  printPro,
  rotation,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders,
  showTypography,
}: ExportVectorPdfOptions): void {
  clearOpticalMarginMeasurementCache()
  const sourceWidth = result.pageSizePt.width
  const sourceHeight = result.pageSizePt.height
  const sx = width / sourceWidth
  const sy = height / sourceHeight
  const scale = (sx + sy) / 2
  const cx = originX + width / 2
  const cy = originY + height / 2
  const theta = (rotation * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)

  const transformPoint = (x: number, y: number) => {
    const scaledX = originX + x * sx
    const scaledY = originY + y * sy
    const dx = scaledX - cx
    const dy = scaledY - cy
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    }
  }

  const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
    const a = transformPoint(x1, y1)
    const b = transformPoint(x2, y2)
    pdf.line(a.x, a.y, b.x, b.y)
  }

  const drawRectOutline = (x: number, y: number, w: number, h: number) => {
    drawLine(x, y, x + w, y)
    drawLine(x + w, y, x + w, y + h)
    drawLine(x + w, y + h, x, y + h)
    drawLine(x, y + h, x, y)
  }

  const drawFilledRect = (x: number, y: number, w: number, h: number) => {
    const topLeft = transformPoint(x, y)
    const topRight = transformPoint(x + w, y)
    const bottomRight = transformPoint(x + w, y + h)
    const bottomLeft = transformPoint(x, y + h)
    pdf.moveTo(topLeft.x, topLeft.y)
    pdf.lineTo(topRight.x, topRight.y)
    pdf.lineTo(bottomRight.x, bottomRight.y)
    pdf.lineTo(bottomLeft.x, bottomLeft.y)
    pdf.close()
    pdf.fill()
  }

  const backgroundRgb = parseHexColor(canvasBackground ?? undefined)
  if (backgroundRgb) {
    setFillColorCmyk(pdf, backgroundRgb)
    drawFilledRect(0, 0, sourceWidth, sourceHeight)
  }

  const drawCropMarks = (offset: number, length: number) => {
    const outside = offset
    drawLine(-outside - length, 0, -outside, 0)
    drawLine(0, -outside - length, 0, -outside)
    drawLine(sourceWidth + outside, 0, sourceWidth + outside + length, 0)
    drawLine(sourceWidth, -outside - length, sourceWidth, -outside)

    drawLine(-outside - length, sourceHeight, -outside, sourceHeight)
    drawLine(0, sourceHeight + outside, 0, sourceHeight + outside + length)
    drawLine(sourceWidth + outside, sourceHeight, sourceWidth + outside + length, sourceHeight)
    drawLine(sourceWidth, sourceHeight + outside, sourceWidth, sourceHeight + outside + length)
  }

  const rotatePointAround = (
    x: number,
    y: number,
    originX: number,
    originY: number,
    angleDeg: number,
  ) => {
    const radians = (angleDeg * Math.PI) / 180
    const cosAngle = Math.cos(radians)
    const sinAngle = Math.sin(radians)
    const dx = x - originX
    const dy = y - originY
    return {
      x: originX + dx * cosAngle - dy * sinAngle,
      y: originY + dx * sinAngle + dy * cosAngle,
    }
  }

  const drawText = (
    line: string,
    x: number,
    y: number,
    align: TextAlignMode,
    trackingScale = DEFAULT_TRACKING_SCALE,
    fontSize = 0,
    blockRotation = 0,
    rotationOrigin?: { x: number; y: number },
  ) => {
    let drawX = x
    let drawY = y
    if (rotationOrigin && Math.abs(blockRotation) > 0.0001) {
      const rotated = rotatePointAround(x, y, rotationOrigin.x, rotationOrigin.y, blockRotation)
      drawX = rotated.x
      drawY = rotated.y
    }
    const point = transformPoint(drawX, drawY)
    pdf.text(line, point.x, point.y, {
      align,
      charSpace: getTrackingLetterSpacing(fontSize * scale, trackingScale),
      angle: rotation + blockRotation,
      // Keep PDF text rotation semantics aligned with canvas:
      // positive angles rotate clockwise in preview.
      rotationDirection: 0,
    })
  }

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
  const minHairlinePt = 0.25
  const showPageOutline = showMargins || showModules || showBaselines
  const useMonochromeGuides = printPro?.monochromeGuides ?? false
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

  pdf.setLineCap("butt")
  pdf.setLineJoin("miter")
  pdf.setLineMiterLimit(10)
  if (showPageOutline) {
    setDrawColorCmyk(pdf, useMonochromeGuides ? { r: 172, g: 172, b: 172 } : { r: 229, g: 229, b: 229 })
    pdf.setLineWidth(Math.max(0.4 * scale, minHairlinePt))
    drawRectOutline(0, 0, sourceWidth, sourceHeight)
  }

  if (printPro?.enabled) {
    const bleed = Math.max(0, printPro.bleedPt)
    const markOffset = Math.max(0, printPro.cropMarkOffsetPt + bleed)
    const markLength = Math.max(0, printPro.cropMarkLengthPt)
    if (printPro.showBleedGuide && showPageOutline) {
      setDrawColorCmyk(pdf, { r: 140, g: 140, b: 140 })
      pdf.setLineWidth(Math.max(0.25 * scale, minHairlinePt))
      pdf.setLineDashPattern([2 * scale, 2 * scale], 0)
      drawRectOutline(-bleed, -bleed, sourceWidth + bleed * 2, sourceHeight + bleed * 2)
      pdf.setLineDashPattern([], 0)
    }
    if (printPro.registrationMarks) {
      setDrawColorFromCmyk(pdf, { c: 1, m: 1, y: 1, k: 1 })
    } else {
      setDrawColorCmyk(pdf, { r: 20, g: 20, b: 20 })
    }
    pdf.setLineWidth(Math.max(0.35 * scale, minHairlinePt))
    drawCropMarks(markOffset, markLength)
  }

  if (showMargins) {
    setDrawColorCmyk(pdf, useMonochromeGuides ? { r: 88, g: 88, b: 88 } : { r: 59, g: 130, b: 246 })
    pdf.setLineWidth(Math.max(0.5 * scale, minHairlinePt))
    pdf.setLineDashPattern([4 * scale, 4 * scale], 0)
    drawRectOutline(
      margins.left,
      guideContentTop,
      sourceWidth - (margins.left + margins.right),
      guideContentBottom - guideContentTop,
    )
    pdf.setLineDashPattern([], 0)
  }

  if (showModules) {
    setDrawColorCmyk(pdf, useMonochromeGuides ? { r: 116, g: 116, b: 116 } : { r: 6, g: 182, b: 212 })
    pdf.setLineWidth(Math.max(0.4 * scale, minHairlinePt))
    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
        const x = margins.left + (colStarts[col] ?? col * firstColumnStep)
        const y = margins.top + (rowStarts[row] ?? row * firstRowStep)
        drawRectOutline(x, y, moduleWidths[col] ?? modW, moduleHeights[row] ?? modH)
      }
    }
  }

  if (showBaselines) {
    setDrawColorCmyk(pdf, useMonochromeGuides ? { r: 148, g: 148, b: 148 } : { r: 236, g: 72, b: 153 })
    pdf.setLineWidth(Math.max(0.3 * scale, minHairlinePt))
    const halfDiag = Math.sqrt(sourceWidth * sourceWidth + sourceHeight * sourceHeight) / 2
    const extStartY = guideContentTop - halfDiag
    const extEndY = sourceHeight + halfDiag
    const rowsAbove = Math.ceil((guideContentTop - extStartY) / guideBaselineSpacing)
    const startY = guideContentTop - rowsAbove * guideBaselineSpacing
    const totalRows = Math.ceil((extEndY - startY) / guideBaselineSpacing)
    for (let row = 0; row <= totalRows; row += 1) {
      const y = startY + row * guideBaselineSpacing
      if (y > extEndY) break
      drawLine(-halfDiag, y, sourceWidth + halfDiag, y)
    }
  }

  const imageOrder = layout?.imageOrder?.filter(
    (key): key is BlockId => typeof key === "string" && key.length > 0,
  ) ?? []
  const imageModulePositions = layout?.imageModulePositions ?? {}
  const imageColumnSpans = layout?.imageColumnSpans ?? {}
  const imageRowSpans = layout?.imageRowSpans ?? {}
  const imageColors = layout?.imageColors ?? {}
  const fallbackImageColor: RgbColor = { r: 11, g: 53, b: 54 }
  const imagePlans = new Map<BlockId, { x: number; y: number; width: number; height: number; fillColor: RgbColor }>()

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

      const x = contentLeft + (col < 0 ? col * firstColumnStep : (colStarts[col] ?? col * firstColumnStep))
      const y = baselineOriginTop + row * baselineStep + baselineStep
      const blockWidth = sumAxisSpan(moduleWidths, col, span, gridMarginHorizontal)
      const blockHeight = sumAxisSpan(moduleHeights, rowStartIndex, rows, gridMarginVertical)
      const fillColor = parseHexColor(imageColors[key]) ?? fallbackImageColor
      imagePlans.set(key, { x, y, width: blockWidth, height: blockHeight, fillColor })
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
  const blockBold = layout?.blockBold ?? {}
  const blockItalic = layout?.blockItalic ?? {}
  const blockRotations = layout?.blockRotations ?? {}
  const blockCustomSizes = layout?.blockCustomSizes ?? {}
  const blockCustomLeadings = layout?.blockCustomLeadings ?? {}
  const blockTextColors = layout?.blockTextColors ?? {}
  const blockModulePositions = layout?.blockModulePositions ?? {}
  const resolvedLayerOrder = reconcileLayerOrder(
    layout?.layerOrder?.filter((key): key is BlockId => typeof key === "string" && key.length > 0) ?? [],
    blockOrder,
    imageOrder,
  )
  const textMeasureContext = createTextMeasureContext()

  const drawImagePlan = (imagePlan: { x: number; y: number; width: number; height: number; fillColor: RgbColor }) => {
    setFillColorCmyk(pdf, imagePlan.fillColor)
    drawFilledRect(imagePlan.x, imagePlan.y, imagePlan.width, imagePlan.height)
  }

  if (!showTypography) {
    for (const key of resolvedLayerOrder) {
      const imagePlan = imagePlans.get(key)
      if (imagePlan) drawImagePlan(imagePlan)
    }
    return
  }

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

  const isTextReflowEnabled = (key: BlockId) => {
    return resolveTextReflowEnabled(key, getStyleKeyForBlock(key), getBlockSpan(key), blockTextReflow)
  }
  const isSyllableDivisionEnabled = (key: BlockId) => {
    return resolveSyllableDivisionEnabled(key, getStyleKeyForBlock(key), blockSyllableDivision)
  }
  const getBlockFont = (key: BlockId): FontFamily => {
    return blockFontFamilies[key] ?? baseFont
  }
  const getStyleDefaultWeight = (styleKey: TypographyStyleKey) => (
    getStyleDefaultFontWeight(styleDefinitions[styleKey]?.weight)
  )
  const getStyleDefaultItalic = (styleKey: TypographyStyleKey) => styleDefinitions[styleKey]?.blockItalic === true
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
  const getBlockFontWeight = (key: BlockId, styleKey: TypographyStyleKey) => {
    return getResolvedFontVariantForBlock(key, styleKey).weight
  }
  const isBlockItalic = (key: BlockId, styleKey: TypographyStyleKey) => {
    return getResolvedFontVariantForBlock(key, styleKey).italic
  }
  const isBlockOpticalKerningEnabled = (key: BlockId) => {
    return normalizeOpticalKerning(blockOpticalKerning[key] ?? DEFAULT_OPTICAL_KERNING)
  }
  const getBlockTrackingScale = (key: BlockId) => {
    return normalizeTrackingScale(blockTrackingScales[key] ?? DEFAULT_TRACKING_SCALE)
  }
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

  type PdfTextContext = {
    canvasFont: string
    opticalKerning: boolean
    trackingScale: number
    measureWidth: (text: string) => number
  }

  setDrawColorCmyk(pdf, { r: 31, g: 41, b: 55 })
  setTextColorCmyk(pdf, { r: 31, g: 41, b: 55 })

  const layoutOutput = buildTypographyLayoutPlan<BlockId, TypographyStyleKey, PdfTextContext>({
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
    // Keep all layout math in source-page units; scale only when drawing to output PDF size.
    fontScale: 1,
    bodyKey: "body",
    displayKey: "display",
    captionKey: "caption",
    defaultBodyStyleKey: "body",
    defaultCaptionStyleKey: "caption",
    getBlockSpan,
    getBlockRows,
    getBlockFontSize: ({ key, styleKey, defaultSize }) => (
      getBlockFontSize(key, styleKey, defaultSize)
    ),
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
      const blockFontWeight = getBlockFontWeight(key, styleKey)
      const blockIsItalic = isBlockItalic(key, styleKey)
      const blockFont = getBlockFont(key)
      const pdfFontFamily = getPdfFontFamily(blockFont, blockFontWeight)
      const opticalKerning = isBlockOpticalKerningEnabled(key)
      const trackingScale = getBlockTrackingScale(key)
      const canvasFont = buildCanvasFont(blockFont, blockFontWeight, blockIsItalic, fontSize)
      const measureWidth = (text: string) => {
        if (textMeasureContext) {
          applyCanvasTextConfig(textMeasureContext, {
            font: canvasFont,
            opticalKerning,
          })
          return measureCanvasTextWidth(textMeasureContext, text, trackingScale, fontSize)
        }
        pdf.setFont(pdfFontFamily, blockIsItalic ? "italic" : "normal")
        pdf.setFontSize(fontSize * scale)
        const gapCount = Math.max(0, splitTextForTracking(text).length - 1)
        return pdf.getTextWidth(text) / scale + gapCount * getTrackingLetterSpacing(fontSize, trackingScale)
      }
      return { canvasFont, opticalKerning, trackingScale, measureWidth }
    },
    wrapText: ({ context, text, maxWidth, hyphenate }) =>
      wrapText(text, maxWidth, hyphenate, context.measureWidth),
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

  const textPlans = new Map(layoutOutput.plans.map((plan) => [plan.key, plan] as const))
  const orderedKeys = resolvedLayerOrder.filter((key) => imagePlans.has(key) || textPlans.has(key))
  for (const key of imageOrder) {
    if ((imagePlans.has(key) || textPlans.has(key)) && !orderedKeys.includes(key)) orderedKeys.push(key)
  }
  for (const key of blockOrder) {
    if ((imagePlans.has(key) || textPlans.has(key)) && !orderedKeys.includes(key)) orderedKeys.push(key)
  }

  for (const key of orderedKeys) {
    const imagePlan = imagePlans.get(key)
    if (imagePlan) {
      drawImagePlan(imagePlan)
      continue
    }
    const plan = textPlans.get(key)
    if (!plan) continue
    const blockFont = getBlockFont(plan.key)
    const blockFontWeight = getBlockFontWeight(plan.key, plan.styleKey)
    const blockIsItalic = isBlockItalic(plan.key, plan.styleKey)
    const blockOpticalKerningEnabled = isBlockOpticalKerningEnabled(plan.key)
    const blockTrackingScale = getBlockTrackingScale(plan.key)
    const blockTrackingGap = (text: string) => Math.max(0, splitTextForTracking(text).length - 1)
    const blockTextColor = parseHexColor(blockTextColors[plan.key]) ?? { r: 31, g: 41, b: 55 }
    const canvasFont = buildCanvasFont(blockFont, blockFontWeight, blockIsItalic, plan.fontSize)
    const measureWidthSource = (text: string) => {
      if (textMeasureContext) {
        applyCanvasTextConfig(textMeasureContext, {
          font: canvasFont,
          opticalKerning: blockOpticalKerningEnabled,
        })
        return measureCanvasTextWidth(textMeasureContext, text, blockTrackingScale, plan.fontSize)
      }
      return pdf.getTextWidth(text) / scale + blockTrackingGap(text) * getTrackingLetterSpacing(plan.fontSize, blockTrackingScale)
    }
    pdf.setFont(getPdfFontFamily(blockFont, blockFontWeight), blockIsItalic ? "italic" : "normal")
    setTextColorCmyk(pdf, blockTextColor)
    pdf.setFontSize(plan.fontSize * scale)
    const rotationOrigin = { x: plan.rotationOriginX, y: plan.rotationOriginY }
    for (const command of plan.commands) {
      const drawAlign: TextAlignMode = plan.textAlign === "right" ? "left" : plan.textAlign
      const drawX = plan.textAlign === "right"
        ? command.x - measureWidthSource(command.text)
        : command.x
      drawText(
        command.text,
        drawX,
        command.y,
        drawAlign,
        blockTrackingScale,
        plan.fontSize,
        plan.blockRotation,
        rotationOrigin,
      )
    }
  }
}
