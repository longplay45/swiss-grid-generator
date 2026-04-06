import type { GridResult } from "@/lib/grid-calculator"
import { DEFAULT_BASE_FONT, type FontFamily } from "@/lib/config/fonts"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import { formatSvgColor, parseHexColor } from "@/lib/export-colors"
import { buildPageExportPlan } from "@/lib/page-export-plan"
import { getRenderedTextDrawCommandText } from "@/lib/text-draw-command"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>

type ExportVectorSvgOptions = {
  width: number
  height: number
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
  title?: string
  description?: string
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Math.round(value * 1000) / 1000
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "")
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
}

function quoteAttr(value: string): string {
  return escapeXml(value)
}

function isRenderableTextFragment(text: string): boolean {
  return text.replace(/\s+/g, "").length > 0
}

function renderRotationTransform(rotation: number, originX: number, originY: number): string {
  if (Math.abs(rotation) <= 0.0001) return ""
  return ` transform="rotate(${formatNumber(rotation)} ${formatNumber(originX)} ${formatNumber(originY)})"`
}

export function renderSwissGridVectorSvg({
  width,
  height,
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
  title = "Swiss Grid Vector Export",
  description = "Swiss Grid Generator SVG export",
}: ExportVectorSvgOptions): string {
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

  const imagePlans = new Map(exportPlan.imagePlans.map((plan) => [plan.key, plan] as const))
  const textPlans = new Map(exportPlan.textPlans.map((plan) => [plan.key, plan] as const))
  const pageClipId = "swiss-page-clip"
  const pageRotationTransform = renderRotationTransform(
    exportPlan.rotation,
    exportPlan.pageWidth / 2,
    exportPlan.pageHeight / 2,
  )

  const guideMarkup = exportPlan.guideGroups.map((guideGroup) => {
    const stroke = formatSvgColor(guideGroup.strokeColor)
    const dashAttr = guideGroup.dashPattern.length
      ? ` stroke-dasharray="${guideGroup.dashPattern.map(formatNumber).join(" ")}"`
      : ""
    const body = [
      ...guideGroup.rects.map((rect) => (
        `<rect x="${formatNumber(rect.x)}" y="${formatNumber(rect.y)}" width="${formatNumber(rect.width)}" height="${formatNumber(rect.height)}" fill="none" />`
      )),
      ...guideGroup.lines.map((line) => (
        `<line x1="${formatNumber(line.x1)}" y1="${formatNumber(line.y1)}" x2="${formatNumber(line.x2)}" y2="${formatNumber(line.y2)}" />`
      )),
    ].join("")
    const clipAttr = guideGroup.clipToPage ? ` clip-path="url(#${pageClipId})"` : ""
    return `<g id="guides-${guideGroup.id}"${clipAttr} fill="none" stroke="${stroke}" stroke-width="${formatNumber(guideGroup.strokeWidth)}"${dashAttr}>${body}</g>`
  }).join("")

  const layerMarkup = exportPlan.orderedLayerKeys.map((key) => {
    const imagePlan = imagePlans.get(key)
    if (imagePlan) {
      const opacityAttr = imagePlan.opacity < 0.999 ? ` fill-opacity="${formatNumber(imagePlan.opacity)}"` : ""
      return `<rect id="image-${quoteAttr(key)}" data-block-key="${quoteAttr(key)}" x="${formatNumber(imagePlan.x)}" y="${formatNumber(imagePlan.y)}" width="${formatNumber(imagePlan.width)}" height="${formatNumber(imagePlan.height)}" fill="${formatSvgColor(imagePlan.fillColor)}"${opacityAttr} />`
    }

    const textPlan = textPlans.get(key)
    if (!textPlan) return ""
    const kerning = textPlan.opticalKerning ? ` font-kerning="none"` : ` font-kerning="normal"`
    const rotationTransform = renderRotationTransform(
      textPlan.blockRotation,
      textPlan.rotationOriginX,
      textPlan.rotationOriginY,
    )
    const graphemeLines = textPlan.graphemeLines.map((graphemes) => graphemes
      .filter((grapheme) => isRenderableTextFragment(grapheme.text))
      .map((grapheme) => (
        `<text x="${formatNumber(grapheme.x)}" y="${formatNumber(grapheme.y)}" fill="${formatSvgColor(parseHexColor(grapheme.color) ?? textPlan.textColor)}" font-family="${quoteAttr(grapheme.fontFamily)}" font-size="${formatNumber(grapheme.fontSize)}" font-weight="${grapheme.fontWeight}" font-style="${grapheme.italic ? "italic" : "normal"}" xml:space="preserve">${escapeXml(grapheme.text)}</text>`
      )).join(""))
      .join("")
    if (graphemeLines) {
      return (
        `<g id="text-${quoteAttr(key)}" data-block-key="${quoteAttr(key)}" data-style-key="${quoteAttr(textPlan.styleKey)}" text-anchor="start"${rotationTransform}>${graphemeLines}</g>`
      )
    }
    const lines = textPlan.segmentLines.map((segments, lineIndex) => {
      if (segments.length === 0) {
        const command = textPlan.commands[lineIndex]
        if (!command) return ""
        const renderedText = getRenderedTextDrawCommandText(command)
        return `<text x="${formatNumber(command.x)}" y="${formatNumber(command.y)}" fill="${formatSvgColor(textPlan.textColor)}" font-family="${quoteAttr(textPlan.fontFamily)}" font-size="${formatNumber(textPlan.fontSize)}" font-weight="${textPlan.fontWeight}" font-style="${textPlan.italic ? "italic" : "normal"}" xml:space="preserve">${escapeXml(renderedText)}</text>`
      }
      return segments.map((segment) => {
        const tracking = segment.trackingScale === 0
          ? ""
          : ` letter-spacing="${formatNumber((segment.fontSize * segment.trackingScale) / 1000)}"`
        return `<text x="${formatNumber(segment.x)}" y="${formatNumber(segment.y)}" fill="${formatSvgColor(parseHexColor(segment.color) ?? textPlan.textColor)}" font-family="${quoteAttr(segment.fontFamily)}" font-size="${formatNumber(segment.fontSize)}" font-weight="${segment.fontWeight}" font-style="${segment.italic ? "italic" : "normal"}" xml:space="preserve"${tracking}>${escapeXml(segment.text)}</text>`
      }).join("")
    }).join("")
    return (
      `<g id="text-${quoteAttr(key)}" data-block-key="${quoteAttr(key)}" data-style-key="${quoteAttr(textPlan.styleKey)}" text-anchor="start"${kerning}${rotationTransform}>${lines}</g>`
    )
  }).join("")

  const backgroundMarkup = exportPlan.backgroundColor
    ? `<rect x="0" y="0" width="${formatNumber(exportPlan.pageWidth)}" height="${formatNumber(exportPlan.pageHeight)}" fill="${formatSvgColor(exportPlan.backgroundColor)}" />`
    : ""

  const pageOutlineMarkup = exportPlan.pageOutline
    ? `<rect x="0" y="0" width="${formatNumber(exportPlan.pageWidth)}" height="${formatNumber(exportPlan.pageHeight)}" fill="none" stroke="${formatSvgColor(exportPlan.pageOutline.strokeColor)}" stroke-width="${formatNumber(exportPlan.pageOutline.strokeWidth)}" />`
    : ""

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(width)}pt" height="${formatNumber(height)}pt" viewBox="0 0 ${formatNumber(exportPlan.pageWidth)} ${formatNumber(exportPlan.pageHeight)}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${escapeXml(title)}</title>`,
    `<desc id="desc">${escapeXml(description)}</desc>`,
    `<defs><clipPath id="${pageClipId}"><rect x="0" y="0" width="${formatNumber(exportPlan.pageWidth)}" height="${formatNumber(exportPlan.pageHeight)}" /></clipPath></defs>`,
    `<g id="page"${pageRotationTransform} stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10">`,
    backgroundMarkup,
    pageOutlineMarkup,
    guideMarkup,
    layerMarkup,
    `</g>`,
    `</svg>`,
  ].join("")
}
