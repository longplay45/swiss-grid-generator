import jsPDF from "jspdf"
import type { GridResult } from "@/lib/grid-calculator"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import type { FontFamily } from "@/lib/config/fonts"
import { hyphenateWordEnglish } from "@/lib/english-hyphenation"
import { getOpticalMarginAnchorOffset } from "@/lib/optical-margin"

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

const DEFAULT_TEXT_CONTENT: Record<BaseBlockId, string> = {
  display: "Swiss Design",
  headline: "Modular Grid Systems",
  subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
  body: "The modular grid allows designers to organize content hierarchically and rhythmically. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide rhythm, contrast, and emphasis while preserving clarity across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet coherent systems.",
  caption: "Figure 5: Based on Muller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
}

const DEFAULT_STYLE_ASSIGNMENTS: Record<BaseBlockId, TypographyStyleKey> = {
  display: "display",
  headline: "headline",
  subhead: "subhead",
  body: "body",
  caption: "caption",
}

function isBaseBlockId(key: string): key is BaseBlockId {
  return (BASE_BLOCK_IDS as readonly string[]).includes(key)
}

function getDefaultColumnSpan(key: BlockId, gridCols: number): number {
  if (gridCols <= 1) return 1
  if (key === "display") return gridCols
  if (key === "headline") return gridCols >= 3 ? Math.min(gridCols, Math.floor(gridCols / 2) + 1) : gridCols
  if (key === "caption") return 1
  return Math.max(1, Math.floor(gridCols / 2))
}

function getFontStyle(bold = false, italic = false): "normal" | "bold" | "italic" | "bolditalic" {
  if (bold) return italic ? "bolditalic" : "bold"
  return italic ? "italic" : "normal"
}

function estimateTextAscent(fontSize: number): number {
  return fontSize * 0.78
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

function hyphenateWord(pdf: jsPDF, word: string, maxWidth: number): string[] {
  return hyphenateWordEnglish(word, maxWidth, (text) => pdf.getTextWidth(text))
}

function wrapText(pdf: jsPDF, text: string, maxWidth: number, hyphenate = false): string[] {
  const wrapSingleLine = (input: string): string[] => {
    const words = input.split(/\s+/).filter(Boolean)
    if (!words.length) return [""]

    const lines: string[] = []
    let current = ""
    for (const word of words) {
      const testLine = current ? `${current} ${word}` : word
      if (pdf.getTextWidth(testLine) <= maxWidth || current.length === 0) {
        if (pdf.getTextWidth(word) > maxWidth && hyphenate) {
          if (current) {
            lines.push(current)
            current = ""
          }
          const parts = hyphenateWord(pdf, word, maxWidth)
          for (let i = 0; i < parts.length; i += 1) {
            if (i === parts.length - 1) current = parts[i]
            else lines.push(parts[i])
          }
        } else {
          current = testLine
        }
      } else {
        lines.push(current)
        if (pdf.getTextWidth(word) > maxWidth && hyphenate) {
          const parts = hyphenateWord(pdf, word, maxWidth)
          for (let i = 0; i < parts.length; i += 1) {
            if (i === parts.length - 1) current = parts[i]
            else lines.push(parts[i])
          }
        } else {
          current = word
        }
      }
    }

    if (current) lines.push(current)
    return lines
  }

  const hardBreakLines = text.replace(/\r\n/g, "\n").split("\n")
  const wrapped: string[] = []
  for (const line of hardBreakLines) wrapped.push(...wrapSingleLine(line))
  return wrapped
}

export function renderSwissGridVectorPdf({
  pdf,
  width,
  height,
  result,
  layout,
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

  const drawText = (line: string, x: number, y: number, align: TextAlignMode, blockRotation = 0) => {
    const point = transformPoint(x, y)
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
      margins.top,
      sourceWidth - (margins.left + margins.right),
      sourceHeight - (margins.top + margins.bottom),
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
    const startY = margins.top
    const endY = sourceHeight - margins.bottom
    const baselineSpacing = gridUnit
    setDrawColorCmyk(pdf, useMonochromeGuides ? { r: 148, g: 148, b: 148 } : { r: 236, g: 72, b: 153 })
    pdf.setLineWidth(Math.max(0.3 * scale, minHairlinePt))
    let currentY = startY
    while (currentY <= endY) {
      drawLine(0, currentY, sourceWidth, currentY)
      currentY += baselineSpacing
    }
  }

  if (!showTypography) return

  const styleDefinitions = result.typography.styles
  const validStyles = new Set(Object.keys(styleDefinitions))
  const blockOrder = layout?.blockOrder?.filter((key): key is BlockId => typeof key === "string" && key.length > 0) ?? [...BASE_BLOCK_IDS]
  const textContent: Record<BlockId, string> = layout?.textContent
    ? { ...layout.textContent }
    : { ...DEFAULT_TEXT_CONTENT }
  const styleAssignments: Record<BlockId, TypographyStyleKey> = layout?.styleAssignments
    ? { ...layout.styleAssignments }
    : { ...DEFAULT_STYLE_ASSIGNMENTS }
  const blockColumnSpans = layout?.blockColumnSpans ?? {}
  const blockRowSpans = layout?.blockRowSpans ?? {}
  const blockTextAlignments = layout?.blockTextAlignments ?? {}
  const blockTextReflow = layout?.blockTextReflow ?? {}
  const blockSyllableDivision = layout?.blockSyllableDivision ?? {}
  const blockBold = layout?.blockBold ?? {}
  const blockItalic = layout?.blockItalic ?? {}
  const blockRotations = layout?.blockRotations ?? {}
  const blockModulePositions = layout?.blockModulePositions ?? {}

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
    return Math.max(1, Math.min(gridCols, Math.round(raw)))
  }

  const getBlockRows = (key: BlockId) => {
    const raw = blockRowSpans[key] ?? 1
    return Math.max(1, Math.min(gridRows, Math.round(raw)))
  }

  const isTextReflowEnabled = (key: BlockId) => {
    return blockTextReflow[key] ?? false
  }
  const isSyllableDivisionEnabled = (key: BlockId) => {
    if (blockSyllableDivision[key] === true || blockSyllableDivision[key] === false) return blockSyllableDivision[key]
    return key === "body" || key === "caption"
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
    const col = Math.max(0, Math.min(maxCol, Math.round(manual.col)))
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

    const styleKeyRaw = styleAssignments[block.key]
    const styleKey = (validStyles.has(String(styleKeyRaw))
      ? String(styleKeyRaw)
      : (isBaseBlockId(block.key) ? DEFAULT_STYLE_ASSIGNMENTS[block.key] : "body")) as TypographyStyleKey
    const style = styleDefinitions[styleKey]
    if (!style) continue

    const fontSize = style.size * scale
    const baselineMult = style.baselineMultiplier

    let blockStartOffset = currentBaselineOffset + block.spaceBefore + block.extraOffset
    if (useParagraphRows) {
      blockStartOffset = currentRowIndex * rowStepBaselines + 1 + block.extraOffset
    } else if (useRowPlacement && block.key === "display") {
      blockStartOffset = displayStartOffset + block.extraOffset
    }

    const blockRotation = getBlockRotation(block.key)
    pdf.setFont("helvetica", getFontStyle(isBlockBold(block.key, styleKey), isBlockItalic(block.key, styleKey)))
    pdf.setFontSize(fontSize)

    const span = getBlockSpan(block.key)
    const wrapWidth = (span * modW + Math.max(span - 1, 0) * gridMarginHorizontal) * scale
    const rowSpan = getBlockRows(block.key)
    const columnReflow = isTextReflowEnabled(block.key)
    const lines = wrapText(
      pdf,
      value,
      columnReflow ? modW * scale : wrapWidth,
      isSyllableDivisionEnabled(block.key)
    )

    const autoX = contentLeft
    const autoY = contentTop + (blockStartOffset - 1) * baselineStep
    const origin = getOriginForBlock(block.key, autoX, autoY)
    const align: TextAlignMode = blockTextAlignments[block.key] === "right" ? "right" : "left"
    const textAscent = estimateTextAscent(fontSize)
    const lineStep = baselineMult * baselineStep
    const moduleHeight = rowSpan * modH + Math.max(rowSpan - 1, 0) * gridMarginVertical
    const maxLinesPerColumn = Math.max(1, Math.floor(moduleHeight / lineStep))
    let maxUsedRows = 0

    if (!columnReflow) {
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
          measureWidth: (text) => pdf.getTextWidth(text),
        })
        drawText(line, anchorX + opticalOffsetX, y, align, blockRotation)
      }
    } else {
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
          measureWidth: (text) => pdf.getTextWidth(text),
        })
        drawText(line, anchorX + opticalOffsetX, y, align, blockRotation)
      }
    }

    if (!useParagraphRows) {
      const usedLineRows = maxUsedRows || lines.length
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

  const captionStyleRaw = styleAssignments.caption
  const captionStyleKey = (validStyles.has(String(captionStyleRaw))
    ? String(captionStyleRaw)
    : DEFAULT_STYLE_ASSIGNMENTS.caption) as TypographyStyleKey
  const captionStyle = styleDefinitions[captionStyleKey]
  const captionText = (textContent.caption ?? "").trim()
  if (!captionStyle || !captionText) return

  const captionRotation = getBlockRotation("caption")
  pdf.setFont("helvetica", getFontStyle(isBlockBold("caption", captionStyleKey), isBlockItalic("caption", captionStyleKey)))
  pdf.setFontSize(captionStyle.size * scale)
  const captionAlign: TextAlignMode = blockTextAlignments.caption === "right" ? "right" : "left"
  const captionSpan = getBlockSpan("caption")
  const captionRowSpan = getBlockRows("caption")
  const captionWidth = (captionSpan * modW + Math.max(captionSpan - 1, 0) * gridMarginHorizontal) * scale
  const captionColumnReflow = isTextReflowEnabled("caption")
  const captionLines = wrapText(
    pdf,
    captionText,
    captionColumnReflow ? modW * scale : captionWidth,
    isSyllableDivisionEnabled("caption")
  )
  const captionLineCount = captionLines.length
  const availableHeight = sourceHeight - margins.top - margins.bottom
  const totalBaselinesFromTop = Math.floor(availableHeight / gridUnit)
  const firstLineBaselineUnit = totalBaselinesFromTop - (captionLineCount - 1) * captionStyle.baselineMultiplier
  const autoCaptionY = contentTop + (firstLineBaselineUnit - 1) * baselineStep
  const captionOrigin = getOriginForBlock("caption", contentLeft, autoCaptionY)
  const captionAscent = estimateTextAscent(captionStyle.size * scale)
  const captionFontSize = captionStyle.size * scale
  const captionLineStep = captionStyle.baselineMultiplier * baselineStep
  const captionModuleHeight = captionRowSpan * modH + Math.max(captionRowSpan - 1, 0) * gridMarginVertical
  const captionMaxLinesPerColumn = Math.max(1, Math.floor(captionModuleHeight / captionLineStep))

  if (!captionColumnReflow) {
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
        measureWidth: (text) => pdf.getTextWidth(text),
      })
      drawText(line, captionAnchorX + opticalOffsetX, y, captionAlign, captionRotation)
    }
  } else {
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
        measureWidth: (text) => pdf.getTextWidth(text),
      })
      drawText(line, captionAnchorX + opticalOffsetX, y, captionAlign, captionRotation)
    }
  }
}
