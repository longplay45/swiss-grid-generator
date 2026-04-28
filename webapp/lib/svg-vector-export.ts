import type { GridResult } from "@/lib/grid-calculator"
import {
  DEFAULT_BASE_FONT,
  type FontFamily,
} from "@/lib/config/fonts"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import { formatSvgColor, parseHexColor } from "@/lib/export-colors"
import { loadOutlineFont } from "@/lib/font-outline"
import { buildPageExportPlan } from "@/lib/page-export-plan"
import { getRenderedTextDrawCommandText } from "@/lib/text-draw-command"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import type { DocumentVariableContext } from "@/lib/document-variable-text"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>

type ExportVectorSvgOptions = {
  width: number
  height: number
  result: GridResult
  layout: PreviewLayoutState | null
  documentVariableContext?: DocumentVariableContext | null
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
  author?: string
  createdAt?: string
  creatorTool?: string
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

function buildSvgMetadataMarkup({
  title,
  description,
  author,
  createdAt,
  creatorTool,
}: {
  title: string
  description: string
  author: string
  createdAt: string
  creatorTool: string
}): string {
  return [
    `<metadata>`,
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`,
    `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/">`,
    `<dc:format>image/svg+xml</dc:format>`,
    `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>`,
    description
      ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(description)}</rdf:li></rdf:Alt></dc:description>`
      : "",
    author
      ? `<dc:creator><rdf:Seq><rdf:li>${escapeXml(author)}</rdf:li></rdf:Seq></dc:creator>`
      : "",
    createdAt
      ? `<dc:date><rdf:Seq><rdf:li>${escapeXml(createdAt)}</rdf:li></rdf:Seq></dc:date>`
      : "",
    creatorTool ? `<xmp:CreatorTool>${escapeXml(creatorTool)}</xmp:CreatorTool>` : "",
    `</rdf:Description>`,
    `</rdf:RDF>`,
    `</metadata>`,
  ].join("")
}

function isRenderableTextFragment(text: string): boolean {
  return text.replace(/\s+/g, "").length > 0
}

function renderRotationTransform(rotation: number, originX: number, originY: number): string {
  if (Math.abs(rotation) <= 0.0001) return ""
  return ` transform="rotate(${formatNumber(rotation)} ${formatNumber(originX)} ${formatNumber(originY)})"`
}

async function renderOutlinedGrapheme(
  grapheme: {
    text: string
    x: number
    y: number
    fontFamily: FontFamily
    fontWeight: number
    italic: boolean
    fontSize: number
    color: string
  },
  fallbackColor: ReturnType<typeof parseHexColor> | null,
): Promise<string> {
  if (!isRenderableTextFragment(grapheme.text)) return ""

  const font = await loadOutlineFont(grapheme.fontFamily, grapheme.fontWeight, grapheme.italic)
  const fillColor = formatSvgColor(parseHexColor(grapheme.color) ?? fallbackColor ?? { r: 0, g: 0, b: 0 })

  if (!font) {
    return `<text x="${formatNumber(grapheme.x)}" y="${formatNumber(grapheme.y)}" fill="${fillColor}" font-family="${quoteAttr(grapheme.fontFamily)}" font-size="${formatNumber(grapheme.fontSize)}" font-weight="${grapheme.fontWeight}" font-style="${grapheme.italic ? "italic" : "normal"}" xml:space="preserve">${escapeXml(grapheme.text)}</text>`
  }

  const pathData = font.getPath(
    grapheme.text,
    grapheme.x,
    grapheme.y,
    grapheme.fontSize,
    {
      kerning: false,
      hinting: false,
    },
  ).toPathData(3).trim()

  if (!pathData) return ""
  return `<path d="${quoteAttr(pathData)}" fill="${fillColor}" />`
}

export async function renderSwissGridVectorSvg({
  width,
  height,
  result,
  layout,
  documentVariableContext = null,
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
  author = "",
  createdAt = "",
  creatorTool = "Swiss Grid Generator",
}: ExportVectorSvgOptions): Promise<string> {
  const exportPlan = buildPageExportPlan({
    result,
    layout,
    documentVariableContext,
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

  await Promise.all(exportPlan.textPlans.flatMap((textPlan) => textPlan.graphemeLines.flatMap((line) => line
    .filter((grapheme) => isRenderableTextFragment(grapheme.text))
    .map((grapheme) => loadOutlineFont(grapheme.fontFamily, grapheme.fontWeight, grapheme.italic)))))

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

  const layerMarkup = (await Promise.all(exportPlan.orderedLayerKeys.map(async (key) => {
    const imagePlan = imagePlans.get(key)
    if (imagePlan) {
      const opacityAttr = imagePlan.opacity < 0.999 ? ` fill-opacity="${formatNumber(imagePlan.opacity)}"` : ""
      const rotationTransform = renderRotationTransform(
        imagePlan.rotation,
        imagePlan.rotationOriginX,
        imagePlan.rotationOriginY,
      )
      return `<rect id="image-${quoteAttr(key)}" data-block-key="${quoteAttr(key)}" x="${formatNumber(imagePlan.x)}" y="${formatNumber(imagePlan.y)}" width="${formatNumber(imagePlan.width)}" height="${formatNumber(imagePlan.height)}" fill="${formatSvgColor(imagePlan.fillColor)}"${opacityAttr}${rotationTransform} />`
    }

    const textPlan = textPlans.get(key)
    if (!textPlan) return ""

    const rotationTransform = renderRotationTransform(
      textPlan.blockRotation,
      textPlan.rotationOriginX,
      textPlan.rotationOriginY,
    )

    const outlinedLines = await Promise.all(textPlan.graphemeLines.map(async (graphemes) => {
      const outlinedGraphemes = await Promise.all(graphemes.map((grapheme) => renderOutlinedGrapheme(
        grapheme,
        textPlan.textColor,
      )))
      return outlinedGraphemes.join("")
    }))

    const outlinedMarkup = outlinedLines.join("")
    if (outlinedMarkup) {
      return `<g id="text-${quoteAttr(key)}" data-block-key="${quoteAttr(key)}" data-style-key="${quoteAttr(textPlan.styleKey)}" data-text-rendering="glyph-outline"${rotationTransform}>${outlinedMarkup}</g>`
    }

    const fallbackLines = textPlan.commands.map((command) => {
      const renderedText = getRenderedTextDrawCommandText(command)
      if (!isRenderableTextFragment(renderedText)) return ""
      return `<text x="${formatNumber(command.x)}" y="${formatNumber(command.y)}" fill="${formatSvgColor(textPlan.textColor)}" font-family="${quoteAttr(textPlan.fontFamily)}" font-size="${formatNumber(textPlan.fontSize)}" font-weight="${textPlan.fontWeight}" font-style="${textPlan.italic ? "italic" : "normal"}" xml:space="preserve">${escapeXml(renderedText)}</text>`
    }).join("")

    return `<g id="text-${quoteAttr(key)}" data-block-key="${quoteAttr(key)}" data-style-key="${quoteAttr(textPlan.styleKey)}" data-text-rendering="text-fallback"${rotationTransform}>${fallbackLines}</g>`
  }))).join("")

  const backgroundMarkup = exportPlan.backgroundColor
    ? `<rect x="0" y="0" width="${formatNumber(exportPlan.pageWidth)}" height="${formatNumber(exportPlan.pageHeight)}" fill="${formatSvgColor(exportPlan.backgroundColor)}" />`
    : ""

  const pageOutlineMarkup = exportPlan.pageOutline
    ? `<rect x="0" y="0" width="${formatNumber(exportPlan.pageWidth)}" height="${formatNumber(exportPlan.pageHeight)}" fill="none" stroke="${formatSvgColor(exportPlan.pageOutline.strokeColor)}" stroke-width="${formatNumber(exportPlan.pageOutline.strokeWidth)}" />`
    : ""
  const metadataMarkup = buildSvgMetadataMarkup({
    title,
    description,
    author,
    createdAt,
    creatorTool,
  })

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(width)}pt" height="${formatNumber(height)}pt" viewBox="0 0 ${formatNumber(exportPlan.pageWidth)} ${formatNumber(exportPlan.pageHeight)}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${escapeXml(title)}</title>`,
    `<desc id="desc">${escapeXml(description)}</desc>`,
    metadataMarkup,
    backgroundMarkup,
    `<defs><clipPath id="${pageClipId}"><rect x="0" y="0" width="${formatNumber(exportPlan.pageWidth)}" height="${formatNumber(exportPlan.pageHeight)}" /></clipPath></defs>`,
    `<g id="page"${pageRotationTransform} stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10">`,
    pageOutlineMarkup,
    guideMarkup,
    layerMarkup,
    `</g>`,
    `</svg>`,
  ].join("")
}
