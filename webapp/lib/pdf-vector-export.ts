import type jsPDF from "jspdf"
import type { GridResult } from "@/lib/grid-calculator"
import type { TextAlignMode } from "@/lib/types/layout-primitives"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import {
  DEFAULT_BASE_FONT,
  isPdfSerifStyleFont,
  type FontFamily,
} from "@/lib/config/fonts"
import { buildPageExportPlan } from "@/lib/page-export-plan"
import { resolvePdfFontFamily } from "@/lib/pdf-font-registry"
import {
  DEFAULT_TRACKING_SCALE,
  getTrackingLetterSpacing,
} from "@/lib/text-rendering"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import { parseHexColor, type RgbColor } from "@/lib/export-colors"
import type { PdfExportColorMode } from "@/lib/pdf-output-intent"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type BlockId = string
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>
type CmykColor = { c: number; m: number; y: number; k: number }
type PdfMatrix = { toString: () => string }
type PdfMatrixConstructor = new (
  sx: number,
  shy: number,
  shx: number,
  sy: number,
  tx: number,
  ty: number,
) => PdfMatrix
type PdfGraphicsStateParameters = { opacity?: number; "stroke-opacity"?: number }
type PdfGraphicsState = PdfGraphicsStateParameters & {
  equals: (other: unknown) => boolean
}
type PdfGraphicsStateConstructor = new (parameters: PdfGraphicsStateParameters) => PdfGraphicsState
type PdfWithFormObjects = jsPDF & {
  advancedAPI?: (body?: (pdf: jsPDF) => void) => jsPDF
  beginFormObject?: (x: number, y: number, width: number, height: number, matrix: PdfMatrix) => jsPDF
  endFormObject?: (key: string) => jsPDF
  doFormObject?: (key: string, matrix: PdfMatrix) => jsPDF
  Matrix?: PdfMatrixConstructor
  GState?: PdfGraphicsStateConstructor
  addGState?: (key: string, gState: PdfGraphicsState) => jsPDF
  setGState?: (gState: string | PdfGraphicsState) => jsPDF
}
type PrintProOptions = {
  enabled: boolean
  bleedPt: number
  cropMarkLengthPt: number
  cropMarkOffsetPt: number
  showBleedGuide?: boolean
  registrationMarks?: boolean
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
  colorMode: PdfExportColorMode
  imageColorScheme: ImageColorSchemeId
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

function setDrawColorRgb(pdf: jsPDF, color: RgbColor): void {
  pdf.setDrawColor(color.r, color.g, color.b)
}

function setTextColorRgb(pdf: jsPDF, color: RgbColor): void {
  pdf.setTextColor(color.r, color.g, color.b)
}

function setFillColorRgb(pdf: jsPDF, color: RgbColor): void {
  pdf.setFillColor(color.r, color.g, color.b)
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

function setDrawColor(pdf: jsPDF, color: RgbColor, colorMode: PdfExportColorMode): void {
  if (colorMode === "cmyk") {
    setDrawColorCmyk(pdf, color)
    return
  }
  setDrawColorRgb(pdf, color)
}

function setTextColor(pdf: jsPDF, color: RgbColor, colorMode: PdfExportColorMode): void {
  if (colorMode === "cmyk") {
    setTextColorCmyk(pdf, color)
    return
  }
  setTextColorRgb(pdf, color)
}

function setFillColor(pdf: jsPDF, color: RgbColor, colorMode: PdfExportColorMode): void {
  if (colorMode === "cmyk") {
    setFillColorCmyk(pdf, color)
    return
  }
  setFillColorRgb(pdf, color)
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
  colorMode,
  imageColorScheme,
  canvasBackground = null,
  printPro,
  rotation,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders,
  showTypography,
}: ExportVectorPdfOptions): void {
  const exportPlan = buildPageExportPlan({
    result,
    layout,
    baseFont,
    imageColorScheme,
    canvasBackground,
    rotation,
    showBaselines,
    showModules,
    showMargins,
    showImagePlaceholders,
    showTypography,
  })
  const sourceWidth = exportPlan.pageWidth
  const sourceHeight = exportPlan.pageHeight
  const sx = width / sourceWidth
  const sy = height / sourceHeight
  const scale = (sx + sy) / 2
  const pageWidth = width + originX * 2
  const pageHeight = height + originY * 2
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

  const drawGuideGroup = (key: string, draw: () => void) => {
    const formPdf = pdf as PdfWithFormObjects
    if (
      typeof formPdf.advancedAPI !== "function"
      || typeof formPdf.beginFormObject !== "function"
      || typeof formPdf.endFormObject !== "function"
      || typeof formPdf.doFormObject !== "function"
      || typeof formPdf.Matrix !== "function"
    ) {
      draw()
      return
    }

    const identityMatrix = new formPdf.Matrix(1, 0, 0, 1, 0, 0)
    formPdf.advancedAPI(() => {
      formPdf.beginFormObject(0, 0, pageWidth, pageHeight, identityMatrix)
      draw()
      formPdf.endFormObject(key)
      formPdf.doFormObject(key, identityMatrix)
    })
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
  const registeredOpacityGStates = new Set<string>()
  const setPdfOpacity = (opacity: number) => {
    const normalizedOpacity = Math.max(0, Math.min(1, opacity))
    const opacityPdf = pdf as PdfWithFormObjects
    if (
      typeof opacityPdf.GState !== "function"
      || typeof opacityPdf.addGState !== "function"
      || typeof opacityPdf.setGState !== "function"
    ) {
      return
    }
    const key = `sgg_opacity_${Math.round(normalizedOpacity * 1000)}`
    if (!registeredOpacityGStates.has(key)) {
      const gState = new opacityPdf.GState({
        opacity: normalizedOpacity,
        "stroke-opacity": 1,
      })
      opacityPdf.addGState(key, gState)
      registeredOpacityGStates.add(key)
    }
    opacityPdf.setGState(key)
  }

  if (exportPlan.backgroundColor) {
    setFillColor(pdf, exportPlan.backgroundColor, colorMode)
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
  const minHairlinePt = 0.25

  pdf.setLineCap("butt")
  pdf.setLineJoin("miter")
  pdf.setLineMiterLimit(10)
  if (exportPlan.pageOutline) {
    setDrawColor(pdf, exportPlan.pageOutline.strokeColor, colorMode)
    pdf.setLineWidth(Math.max(exportPlan.pageOutline.strokeWidth * scale, minHairlinePt))
    drawRectOutline(0, 0, sourceWidth, sourceHeight)
  }

  if (printPro?.enabled) {
    const bleed = Math.max(0, printPro.bleedPt)
    const markOffset = Math.max(0, printPro.cropMarkOffsetPt + bleed)
    const markLength = Math.max(0, printPro.cropMarkLengthPt)
    if (printPro.showBleedGuide && exportPlan.pageOutline) {
      setDrawColor(pdf, { r: 140, g: 140, b: 140 }, colorMode)
      pdf.setLineWidth(Math.max(0.25 * scale, minHairlinePt))
      pdf.setLineDashPattern([2 * scale, 2 * scale], 0)
      drawRectOutline(-bleed, -bleed, sourceWidth + bleed * 2, sourceHeight + bleed * 2)
      pdf.setLineDashPattern([], 0)
    }
    if (printPro.registrationMarks && colorMode === "cmyk") {
      setDrawColorFromCmyk(pdf, { c: 1, m: 1, y: 1, k: 1 })
    } else {
      setDrawColor(pdf, { r: 20, g: 20, b: 20 }, colorMode)
    }
    pdf.setLineWidth(Math.max(0.35 * scale, minHairlinePt))
    drawCropMarks(markOffset, markLength)
  }

  const drawImagePlan = (imagePlan: { x: number; y: number; width: number; height: number; fillColor: RgbColor; opacity: number }) => {
    setFillColor(pdf, imagePlan.fillColor, colorMode)
    setPdfOpacity(imagePlan.opacity)
    drawFilledRect(imagePlan.x, imagePlan.y, imagePlan.width, imagePlan.height)
    setPdfOpacity(1)
  }
  for (const guideGroup of exportPlan.guideGroups) {
    drawGuideGroup(`swiss_guides_${guideGroup.id}`, () => {
      setDrawColor(pdf, guideGroup.strokeColor, colorMode)
      pdf.setLineWidth(Math.max(guideGroup.strokeWidth * scale, minHairlinePt))
      pdf.setLineDashPattern(guideGroup.dashPattern.map((value) => value * scale), 0)
      if (guideGroup.clipToPage) {
        pdf.saveGraphicsState()
        pdf.rect(originX, originY, width, height, null)
        pdf.clip()
        pdf.discardPath()
      }
      for (const rect of guideGroup.rects) {
        drawRectOutline(rect.x, rect.y, rect.width, rect.height)
      }
      for (const line of guideGroup.lines) {
        drawLine(line.x1, line.y1, line.x2, line.y2)
      }
      if (guideGroup.clipToPage) {
        pdf.restoreGraphicsState()
      }
      pdf.setLineDashPattern([], 0)
    })
  }

  const imagePlans = new Map(exportPlan.imagePlans.map((plan) => [plan.key, plan] as const))
  const textPlans = new Map(exportPlan.textPlans.map((plan) => [plan.key, plan] as const))

  if (!showTypography) {
    for (const key of exportPlan.orderedLayerKeys) {
      const imagePlan = imagePlans.get(key)
      if (imagePlan) drawImagePlan(imagePlan)
    }
    return
  }

  setDrawColor(pdf, { r: 31, g: 41, b: 55 }, colorMode)
  setTextColor(pdf, { r: 31, g: 41, b: 55 }, colorMode)

  for (const key of exportPlan.orderedLayerKeys) {
    const imagePlan = imagePlans.get(key)
    if (imagePlan) {
      drawImagePlan(imagePlan)
      continue
    }
    const plan = textPlans.get(key)
    if (!plan) continue
    const blockFont = plan.fontFamily
    const blockFontWeight = plan.fontWeight
    const blockIsItalic = plan.italic
    pdf.setFont(getPdfFontFamily(blockFont, blockFontWeight), blockIsItalic ? "italic" : "normal")
    pdf.setFontSize(plan.fontSize * scale)
    const rotationOrigin = { x: plan.rotationOriginX, y: plan.rotationOriginY }
    for (const segments of plan.segmentLines) {
      if (segments.length === 0) continue
      for (const segment of segments) {
        setTextColor(pdf, parseHexColor(segment.color) ?? plan.textColor, colorMode)
        pdf.setFont(
          getPdfFontFamily(segment.fontFamily, segment.fontWeight),
          segment.italic ? "italic" : "normal",
        )
        pdf.setFontSize(segment.fontSize * scale)
        drawText(
          segment.text,
          segment.x,
          segment.y,
          "left",
          segment.trackingScale,
          segment.fontSize,
          plan.blockRotation,
          rotationOrigin,
        )
      }
    }
  }
}
