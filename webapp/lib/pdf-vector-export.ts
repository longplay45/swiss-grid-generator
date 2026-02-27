import type jsPDF from "jspdf"
import type { GridResult } from "@/lib/grid-calculator"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { DEFAULT_BASE_FONT, getFontFamilyCss, type FontFamily } from "@/lib/config/fonts"
import { getOpticalMarginAnchorOffset } from "@/lib/optical-margin"
import { wrapText, getDefaultColumnSpan } from "@/lib/text-layout"
import { computeSingleColumnLineTops } from "@/lib/reflow-line-placement"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type BlockId = string
type TextAlignMode = "left" | "right"
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
  printPro?: PrintProOptions
  rotation: number
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showTypography: boolean
}

const BASE_BLOCK_IDS = ["display", "headline", "subhead", "body", "caption"] as const
type BaseBlockId = typeof BASE_BLOCK_IDS[number]
type PdfFontFamily = "helvetica" | "times"

const DEFAULT_TEXT_CONTENT: Record<BaseBlockId, string> = {
  display: "Swiss Design",
  headline: "Modular Grid Systems",
  subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
  body: "The modular grid allows designers to organize content with clarity and purpose. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide contrast and emphasis while preserving coherence across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet unified systems.",
  caption: "Based on Müller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
}

const DEFAULT_STYLE_ASSIGNMENTS: Record<BaseBlockId, TypographyStyleKey> = {
  display: "display",
  headline: "headline",
  subhead: "subhead",
  body: "body",
  caption: "caption",
}

function getFontStyle(bold = false, italic = false): "normal" | "bold" | "italic" | "bolditalic" {
  if (bold) return italic ? "bolditalic" : "bold"
  return italic ? "italic" : "normal"
}

const SERIF_STYLE_FONTS = new Set<FontFamily>([
  "EB Garamond",
  "Libre Baskerville",
  "Bodoni Moda",
  "Besley",
  "Playfair Display",
])

function getPdfFontFamily(fontFamily: FontFamily): PdfFontFamily {
  return SERIF_STYLE_FONTS.has(fontFamily) ? "times" : "helvetica"
}

function createTextMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  return canvas.getContext("2d")
}

function buildCanvasFont(fontFamily: FontFamily, bold: boolean, italic: boolean, fontSize: number): string {
  const fontStyle = italic ? "italic " : ""
  const fontWeight = bold ? "700" : "400"
  return `${fontStyle}${fontWeight} ${fontSize}px ${getFontFamilyCss(fontFamily)}`
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

function setDrawColorFromCmyk(pdf: jsPDF, color: CmykColor): void {
  pdf.setDrawColor(color.c, color.m, color.y, color.k)
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
  printPro,
  rotation,
  showBaselines,
  showModules,
  showMargins,
  showTypography,
}: ExportVectorPdfOptions): void {
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
      angle: rotation + blockRotation,
    })
  }

  const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
  const { width: modW, height: modH } = result.module
  const { gridCols, gridRows } = result.settings
  const minHairlinePt = 0.25
  const useMonochromeGuides = printPro?.monochromeGuides ?? false
  const guideContentTop = margins.top
  const guideBaselineSpacing = gridUnit
  const guideBaselineRows = Math.max(
    0,
    Math.round((sourceHeight - (margins.top + margins.bottom)) / guideBaselineSpacing),
  )
  const guideContentBottom = guideContentTop + guideBaselineRows * guideBaselineSpacing

  pdf.setLineCap("butt")
  pdf.setLineJoin("miter")
  pdf.setLineMiterLimit(10)
  setDrawColorCmyk(pdf, useMonochromeGuides ? { r: 172, g: 172, b: 172 } : { r: 229, g: 229, b: 229 })
  pdf.setLineWidth(Math.max(0.4 * scale, minHairlinePt))
  drawRectOutline(0, 0, sourceWidth, sourceHeight)

  if (printPro?.enabled) {
    const bleed = Math.max(0, printPro.bleedPt)
    const markOffset = Math.max(0, printPro.cropMarkOffsetPt + bleed)
    const markLength = Math.max(0, printPro.cropMarkLengthPt)
    if (printPro.showBleedGuide) {
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
        const x = margins.left + col * (modW + gridMarginHorizontal)
        const y = margins.top + row * (modH + gridMarginVertical)
        drawRectOutline(x, y, modW, modH)
      }
    }
  }

  if (showBaselines) {
    setDrawColorCmyk(pdf, useMonochromeGuides ? { r: 148, g: 148, b: 148 } : { r: 236, g: 72, b: 153 })
    pdf.setLineWidth(Math.max(0.3 * scale, minHairlinePt))
    for (let row = 0; row <= guideBaselineRows; row += 1) {
      const y = guideContentTop + row * guideBaselineSpacing
      drawLine(0, y, sourceWidth, y)
    }
  }

  if (!showTypography) return

  const styleDefinitions = result.typography.styles
  const blockOrder = layout?.blockOrder?.filter((key): key is BlockId => typeof key === "string" && key.length > 0) ?? [...BASE_BLOCK_IDS]
  const textContent: Record<BlockId, string> = layout?.textContent
    ? { ...layout.textContent }
    : { ...DEFAULT_TEXT_CONTENT }
  const styleAssignments: Record<BlockId, TypographyStyleKey> = layout?.styleAssignments
    ? { ...layout.styleAssignments }
    : { ...DEFAULT_STYLE_ASSIGNMENTS }
  const blockFontFamilies = layout?.blockFontFamilies ?? {}
  const blockColumnSpans = layout?.blockColumnSpans ?? {}
  const blockRowSpans = layout?.blockRowSpans ?? {}
  const blockTextAlignments = layout?.blockTextAlignments ?? {}
  const blockTextReflow = layout?.blockTextReflow ?? {}
  const blockSyllableDivision = layout?.blockSyllableDivision ?? {}
  const blockBold = layout?.blockBold ?? {}
  const blockItalic = layout?.blockItalic ?? {}
  const blockRotations = layout?.blockRotations ?? {}
  const blockModulePositions = layout?.blockModulePositions ?? {}
  const textMeasureContext = createTextMeasureContext()

  const contentTop = margins.top
  const contentLeft = margins.left
  const pageBottom = sourceHeight - margins.bottom
  const baselineStep = gridUnit
  const baselineOriginTop = contentTop - baselineStep
  const moduleXStep = modW + gridMarginHorizontal
  const rowHeightBaselines = modH / gridUnit
  const gutterBaselines = gridMarginVertical / gridUnit
  const rowStepBaselines = rowHeightBaselines + gutterBaselines
  const row2TopBaselines = rowStepBaselines
  const row3TopBaselines = rowStepBaselines * 2
  const displayStartOffset = 1
  const restStartOffset = gridRows > 6 ? row3TopBaselines + 1 : row2TopBaselines + 1
  const useRowPlacement = gridRows >= 2
  const useParagraphRows = gridRows >= 5
  const maxBaselineRow = Math.max(
    0,
    Math.floor((sourceHeight - margins.top - margins.bottom) / gridUnit),
  )

  const getBlockSpan = (key: BlockId) => {
    const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, gridCols)
    return Math.max(1, Math.min(gridCols, raw))
  }

  const getBlockRows = (key: BlockId) => {
    const raw = blockRowSpans[key] ?? 1
    return Math.max(1, Math.min(gridRows, raw))
  }

  const isTextReflowEnabled = (key: BlockId) => {
    if (blockTextReflow[key] === true || blockTextReflow[key] === false) return blockTextReflow[key]
    return key === "body" || key === "caption"
  }
  const isSyllableDivisionEnabled = (key: BlockId) => {
    if (blockSyllableDivision[key] === true || blockSyllableDivision[key] === false) return blockSyllableDivision[key]
    return key === "body" || key === "caption"
  }
  const getBlockFont = (key: BlockId): FontFamily => {
    return blockFontFamilies[key] ?? baseFont
  }
  const getStyleDefaultBold = (styleKey: TypographyStyleKey) => styleDefinitions[styleKey]?.weight === "Bold"
  const getStyleDefaultItalic = (styleKey: TypographyStyleKey) => styleDefinitions[styleKey]?.blockItalic === true
  const isBlockBold = (key: BlockId, styleKey: TypographyStyleKey) => {
    const override = blockBold[key]
    if (override === true || override === false) return override
    return getStyleDefaultBold(styleKey)
  }
  const isBlockItalic = (key: BlockId, styleKey: TypographyStyleKey) => {
    const override = blockItalic[key]
    if (override === true || override === false) return override
    return getStyleDefaultItalic(styleKey)
  }
  const getBlockRotation = (key: BlockId) => {
    const raw = blockRotations[key]
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 0
    return Math.max(-180, Math.min(180, raw))
  }

  const getOriginForBlock = (key: BlockId, fallbackX: number, fallbackY: number) => {
    const manual = blockModulePositions[key]
    if (!manual || typeof manual.col !== "number" || typeof manual.row !== "number") {
      return { x: fallbackX, y: fallbackY }
    }
    const span = getBlockSpan(key)
    const maxCol = Math.max(0, gridCols - span)
    const col = Math.max(0, Math.min(maxCol, manual.col))
    const row = Math.max(0, Math.min(maxBaselineRow, manual.row))
    return {
      x: contentLeft + col * moduleXStep,
      y: baselineOriginTop + row * baselineStep,
    }
  }

  const textBlocks = blockOrder
    .filter((key) => key !== "caption")
    .map((key) => ({
      key,
      spaceBefore: key === "body" ? 1 : 0,
      extraOffset: 0,
    }))

  let currentBaselineOffset = useRowPlacement ? restStartOffset : displayStartOffset
  let currentRowIndex = 0
  setDrawColorCmyk(pdf, { r: 31, g: 41, b: 55 })
  setTextColorCmyk(pdf, { r: 31, g: 41, b: 55 })

  for (const block of textBlocks) {
    const value = (textContent[block.key] ?? "").trim()
    if (!value) continue

    const styleKey = (styleAssignments[block.key] ?? "body") as TypographyStyleKey
    const style = styleDefinitions[styleKey]
    if (!style) continue

    const fontSize = style.size * scale
    const baselineMult = style.baselineMultiplier
    const blockIsBold = isBlockBold(block.key, styleKey)
    const blockIsItalic = isBlockItalic(block.key, styleKey)
    const blockFont = getBlockFont(block.key)
    const canvasFont = buildCanvasFont(blockFont, blockIsBold, blockIsItalic, fontSize)
    const measureWidth = (text: string) => {
      if (textMeasureContext) {
        textMeasureContext.font = canvasFont
        return textMeasureContext.measureText(text).width
      }
      return pdf.getTextWidth(text)
    }

    let blockStartOffset = currentBaselineOffset + block.spaceBefore + block.extraOffset
    if (useParagraphRows) {
      blockStartOffset = currentRowIndex * rowStepBaselines + 1 + block.extraOffset
    } else if (useRowPlacement && block.key === "display") {
      blockStartOffset = displayStartOffset + block.extraOffset
    }

    const blockRotation = getBlockRotation(block.key)
    pdf.setFont(getPdfFontFamily(blockFont), getFontStyle(blockIsBold, blockIsItalic))
    pdf.setFontSize(fontSize)

    const span = getBlockSpan(block.key)
    const wrapWidth = (span * modW + Math.max(span - 1, 0) * gridMarginHorizontal) * scale
    const rowSpan = getBlockRows(block.key)
    const reflowEnabled = isTextReflowEnabled(block.key)
    const columnReflow = reflowEnabled && span >= 2
    const singleColumnReflow = reflowEnabled && span === 1
    const lines = wrapText(
      value,
      reflowEnabled ? modW * scale : wrapWidth,
      isSyllableDivisionEnabled(block.key),
      measureWidth,
    )

    const autoX = contentLeft
    const autoY = contentTop + (blockStartOffset - 1) * baselineStep
    const origin = getOriginForBlock(block.key, autoX, autoY)
    const rotationOrigin = { x: origin.x, y: origin.y }
    const align: TextAlignMode = blockTextAlignments[block.key] === "right" ? "right" : "left"
    const textAscent = estimateTextAscent(textMeasureContext, canvasFont, fontSize)
    const lineStep = baselineMult * baselineStep
    const moduleHeight = rowSpan * modH + Math.max(rowSpan - 1, 0) * gridMarginVertical
    const maxLinesPerColumn = Math.max(1, Math.floor(moduleHeight / lineStep))
    const moduleCyclePt = modH + gridMarginVertical
    const firstLineTopY = origin.y + baselineStep
    let maxUsedRows = 0

    if (!reflowEnabled) {
      const anchorX = align === "right"
        ? origin.x + span * modW + Math.max(span - 1, 0) * gridMarginHorizontal
        : origin.x
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const lineTopY = origin.y + baselineStep + lineIndex * baselineMult * baselineStep
        if (lineTopY >= pageBottom) continue
        maxUsedRows = Math.max(maxUsedRows, lineIndex + 1)
        const y = lineTopY + textAscent / scale
        const line = lines[lineIndex]
        const opticalOffsetX = getOpticalMarginAnchorOffset({
          line,
          align,
          fontSize,
          measureWidth,
        })
        drawText(line, anchorX + opticalOffsetX, y, align, blockRotation, rotationOrigin)
      }
    } else if (singleColumnReflow) {
      const anchorX = align === "right" ? origin.x + wrapWidth : origin.x
      const lineTops = computeSingleColumnLineTops({
        firstLineTopY,
        lineStep,
        pageBottomY: pageBottom,
        lineCount: lines.length,
        contentTop,
        moduleHeightPx: modH,
        moduleCyclePx: moduleCyclePt,
      })
      for (let lineIndex = 0; lineIndex < lineTops.length; lineIndex += 1) {
        const lineTopY = lineTops[lineIndex]
        const line = lines[lineIndex]
        const y = lineTopY + textAscent / scale
        maxUsedRows += 1
        const opticalOffsetX = getOpticalMarginAnchorOffset({
          line,
          align,
          fontSize,
          measureWidth,
        })
        drawText(line, anchorX + opticalOffsetX, y, align, blockRotation, rotationOrigin)
      }
    } else if (columnReflow) {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const columnIndex = Math.floor(lineIndex / maxLinesPerColumn)
        if (columnIndex >= span) break
        const rowIndex = lineIndex % maxLinesPerColumn
        const columnX = origin.x + columnIndex * moduleXStep
        const anchorX = align === "right" ? columnX + modW : columnX
        const lineTopY = origin.y + baselineStep + rowIndex * lineStep
        if (lineTopY >= pageBottom) continue
        maxUsedRows = Math.max(maxUsedRows, rowIndex + 1)
        const y = lineTopY + textAscent / scale
        const line = lines[lineIndex]
        const opticalOffsetX = getOpticalMarginAnchorOffset({
          line,
          align,
          fontSize,
          measureWidth,
        })
        drawText(line, anchorX + opticalOffsetX, y, align, blockRotation, rotationOrigin)
      }
    }

    if (!useParagraphRows) {
      const usedLineRows = reflowEnabled
        ? (maxUsedRows || Math.min(lines.length, Math.max(1, maxLinesPerColumn)))
        : (maxUsedRows || lines.length)
      if (!useRowPlacement || block.key !== "display") {
        currentBaselineOffset = blockStartOffset + usedLineRows * baselineMult
      } else {
        currentBaselineOffset = restStartOffset
      }
    } else {
      const blockEnd = blockStartOffset + lines.length * baselineMult
      currentRowIndex = Math.ceil(blockEnd / rowStepBaselines)
    }
  }

  const captionKey = "caption" as const
  const hasCaptionBlock = blockOrder.includes(captionKey)
  if (!hasCaptionBlock) return

  const captionStyleKey = (styleAssignments[captionKey] ?? "caption") as TypographyStyleKey
  const captionStyle = styleDefinitions[captionStyleKey]
  const captionText = (textContent[captionKey] ?? "").trim()
  if (!captionStyle || !captionText) return

  const captionFontSize = captionStyle.size * scale
  const captionIsBold = isBlockBold(captionKey, captionStyleKey)
  const captionIsItalic = isBlockItalic(captionKey, captionStyleKey)
  const captionFont = getBlockFont(captionKey)
  const captionCanvasFont = buildCanvasFont(captionFont, captionIsBold, captionIsItalic, captionFontSize)
  const captionMeasureWidth = (text: string) => {
    if (textMeasureContext) {
      textMeasureContext.font = captionCanvasFont
      return textMeasureContext.measureText(text).width
    }
    return pdf.getTextWidth(text)
  }
  const captionRotation = getBlockRotation(captionKey)
  pdf.setFont(getPdfFontFamily(captionFont), getFontStyle(captionIsBold, captionIsItalic))
  pdf.setFontSize(captionFontSize)
  const captionAlign: TextAlignMode = blockTextAlignments[captionKey] === "right" ? "right" : "left"
  const captionSpan = getBlockSpan(captionKey)
  const captionRowSpan = getBlockRows(captionKey)
  const captionWidth = (captionSpan * modW + Math.max(captionSpan - 1, 0) * gridMarginHorizontal) * scale
  const captionReflowEnabled = isTextReflowEnabled(captionKey)
  const captionColumnReflow = captionReflowEnabled && captionSpan >= 2
  const captionSingleColumnReflow = captionReflowEnabled && captionSpan === 1
  const captionLines = wrapText(
    captionText,
    captionReflowEnabled ? modW * scale : captionWidth,
    isSyllableDivisionEnabled(captionKey),
    captionMeasureWidth,
  )
  const captionLineCount = captionLines.length
  const availableHeight = sourceHeight - margins.top - margins.bottom
  const totalBaselinesFromTop = Math.floor(availableHeight / gridUnit)
  const firstLineBaselineUnit = totalBaselinesFromTop - (captionLineCount - 1) * captionStyle.baselineMultiplier
  const autoCaptionY = contentTop + (firstLineBaselineUnit - 1) * baselineStep
  const captionOrigin = getOriginForBlock(captionKey, contentLeft, autoCaptionY)
  const captionRotationOrigin = { x: captionOrigin.x, y: captionOrigin.y }
  const captionAscent = estimateTextAscent(textMeasureContext, captionCanvasFont, captionFontSize)
  const captionLineStep = captionStyle.baselineMultiplier * baselineStep
  const captionModuleHeight = captionRowSpan * modH + Math.max(captionRowSpan - 1, 0) * gridMarginVertical
  const captionMaxLinesPerColumn = Math.max(1, Math.floor(captionModuleHeight / captionLineStep))
  const captionModuleCyclePt = modH + gridMarginVertical
  const captionFirstLineTopY = captionOrigin.y + baselineStep

  if (!captionReflowEnabled) {
    const captionAnchorX = captionAlign === "right"
      ? captionOrigin.x + captionSpan * modW + Math.max(captionSpan - 1, 0) * gridMarginHorizontal
      : captionOrigin.x
    for (let i = 0; i < captionLines.length; i += 1) {
      const lineTopY = captionOrigin.y + baselineStep + i * captionStyle.baselineMultiplier * baselineStep
      if (lineTopY >= pageBottom) continue
      const y = lineTopY + captionAscent / scale
      const line = captionLines[i]
      const opticalOffsetX = getOpticalMarginAnchorOffset({
        line,
        align: captionAlign,
        fontSize: captionFontSize,
        measureWidth: captionMeasureWidth,
      })
      drawText(
        line,
        captionAnchorX + opticalOffsetX,
        y,
        captionAlign,
        captionRotation,
        captionRotationOrigin,
      )
    }
  } else if (captionSingleColumnReflow) {
    const captionAnchorX = captionAlign === "right" ? captionOrigin.x + captionWidth : captionOrigin.x
    const captionLineTops = computeSingleColumnLineTops({
      firstLineTopY: captionFirstLineTopY,
      lineStep: captionLineStep,
      pageBottomY: pageBottom,
      lineCount: captionLines.length,
      contentTop,
      moduleHeightPx: modH,
      moduleCyclePx: captionModuleCyclePt,
    })
    for (let i = 0; i < captionLineTops.length; i += 1) {
      const lineTopY = captionLineTops[i]
      const line = captionLines[i]
      const y = lineTopY + captionAscent / scale
      const opticalOffsetX = getOpticalMarginAnchorOffset({
        line,
        align: captionAlign,
        fontSize: captionFontSize,
        measureWidth: captionMeasureWidth,
      })
      drawText(
        line,
        captionAnchorX + opticalOffsetX,
        y,
        captionAlign,
        captionRotation,
        captionRotationOrigin,
      )
    }
  } else if (captionColumnReflow) {
    for (let i = 0; i < captionLines.length; i += 1) {
      const columnIndex = Math.floor(i / captionMaxLinesPerColumn)
      if (columnIndex >= captionSpan) break
      const rowIndex = i % captionMaxLinesPerColumn
      const columnX = captionOrigin.x + columnIndex * moduleXStep
      const captionAnchorX = captionAlign === "right" ? columnX + modW : columnX
      const lineTopY = captionOrigin.y + baselineStep + rowIndex * captionLineStep
      if (lineTopY >= pageBottom) continue
      const y = lineTopY + captionAscent / scale
      const line = captionLines[i]
      const opticalOffsetX = getOpticalMarginAnchorOffset({
        line,
        align: captionAlign,
        fontSize: captionFontSize,
        measureWidth: captionMeasureWidth,
      })
      drawText(
        line,
        captionAnchorX + opticalOffsetX,
        y,
        captionAlign,
        captionRotation,
        captionRotationOrigin,
      )
    }
  }
}
