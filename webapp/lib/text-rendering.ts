type CanvasKerningValue = "auto" | "normal" | "none"

type CanvasKerningContext = {
  fontKerning?: CanvasKerningValue
}

type CanvasTrackingContext = {
  letterSpacing?: string
}

type CanvasFontContext = CanvasKerningContext & CanvasTrackingContext & {
  font: string
}

type CanvasMeasureContext = CanvasFontContext & {
  measureText: (text: string) => TextMetrics
}

type CanvasDrawContext = CanvasMeasureContext & {
  save: () => void
  restore: () => void
  translate: (x: number, y: number) => void
  rotate: (angle: number) => void
  fillText: (text: string, x: number, y: number, maxWidth?: number) => void
  textAlign: CanvasTextAlign
}

const FONT_STACKS: Record<string, string> = {
  Inter: "Inter, system-ui, -apple-system, sans-serif",
  "Work Sans": "Work Sans, sans-serif",
  "Nunito Sans": "Nunito Sans, sans-serif",
  "IBM Plex Sans": "IBM Plex Sans, sans-serif",
  "Libre Franklin": "Libre Franklin, sans-serif",
  "EB Garamond": "EB Garamond, serif",
  "Libre Baskerville": "Libre Baskerville, serif",
  "Bodoni Moda": "Bodoni Moda, serif",
  Besley: "Besley, serif",
  "Playfair Display": "Playfair Display, serif",
}

export const DEFAULT_TRACKING_SCALE = 0
export const DEFAULT_OPTICAL_KERNING = true
export const MIN_TRACKING_SCALE = -120
export const MAX_TRACKING_SCALE = 300

export const TRACKING_OPTIONS = [
  { label: "Ultra-condensed", value: -120 },
  { label: "Extra-condensed", value: -90 },
  { label: "Condensed", value: -60 },
  { label: "Semi-condensed", value: -30 },
  { label: "Normal", value: DEFAULT_TRACKING_SCALE },
  { label: "Semi-expanded", value: 30 },
  { label: "Expanded", value: 60 },
  { label: "Extra-expanded", value: 120 },
  { label: "Ultra-expanded", value: 200 },
] as const

export type TrackingOption = (typeof TRACKING_OPTIONS)[number]

const graphemeSegmenter = typeof Intl !== "undefined" && "Segmenter" in Intl
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null

export function splitTextForTracking(text: string): string[] {
  if (!text) return []
  if (!graphemeSegmenter) return Array.from(text)
  return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment)
}

export function formatTrackingScale(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0"
  return `${value > 0 ? "+" : ""}${Math.round(value)}`
}

export function normalizeTrackingScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TRACKING_SCALE
  }
  return Math.max(MIN_TRACKING_SCALE, Math.min(MAX_TRACKING_SCALE, Math.round(value)))
}

export function getTrackingOption(scale: number): TrackingOption {
  const normalized = normalizeTrackingScale(scale)
  return TRACKING_OPTIONS.find((option) => option.value === normalized) ?? TRACKING_OPTIONS[4]
}

export function normalizeOpticalKerning(value: unknown): boolean {
  return value !== false
}

function resolveCanvasFontSize(font: string): number {
  const match = font.match(/(\d+(?:\.\d+)?)px/)
  if (!match) return 0
  const size = Number(match[1])
  return Number.isFinite(size) && size > 0 ? size : 0
}

export function getTrackingLetterSpacing(fontSize: number, trackingScale: number): number {
  const normalizedTracking = normalizeTrackingScale(trackingScale)
  if (!Number.isFinite(fontSize) || fontSize <= 0 || normalizedTracking === 0) return 0
  return (fontSize * normalizedTracking) / 1000
}

export function buildCanvasFont(
  fontFamily: string,
  fontWeight: number,
  italic: boolean,
  fontSize: number,
): string {
  const fontStyle = italic ? "italic " : ""
  const fontStack = FONT_STACKS[fontFamily] ?? `"${fontFamily}", sans-serif`
  return `${fontStyle}${fontWeight} ${fontSize}px ${fontStack}`
}

export function setCanvasFontKerning(context: CanvasKerningContext, opticalKerning: boolean): void {
  if (!("fontKerning" in context)) return
  context.fontKerning = opticalKerning ? "normal" : "none"
}

export function setCanvasLetterSpacing(
  context: CanvasTrackingContext,
  trackingScale: number,
  fontSize: number,
): void {
  if (!("letterSpacing" in context)) return
  context.letterSpacing = `${getTrackingLetterSpacing(fontSize, trackingScale)}px`
}

export function applyCanvasTextConfig(
  context: CanvasFontContext,
  {
    font,
    opticalKerning,
  }: {
    font: string
    opticalKerning: boolean
  },
): void {
  context.font = font
  setCanvasFontKerning(context, opticalKerning)
  if ("letterSpacing" in context) context.letterSpacing = "0px"
}

export function measureCanvasTextWidth(
  context: CanvasMeasureContext,
  text: string,
  trackingScale: number,
  fontSize?: number,
): number {
  const trackingValue = normalizeTrackingScale(trackingScale)
  const glyphCount = splitTextForTracking(text).length
  if (glyphCount <= 1 || trackingValue === 0) {
    return context.measureText(text).width
  }
  const resolvedFontSize = fontSize ?? resolveCanvasFontSize(context.font)
  return context.measureText(text).width + (glyphCount - 1) * getTrackingLetterSpacing(resolvedFontSize, trackingValue)
}

export function drawCanvasText(
  context: CanvasDrawContext,
  {
    text,
    x,
    y,
    textAlign,
    fontSize,
    trackingScale,
    blockRotation = 0,
    rotationOrigin,
  }: {
    text: string
    x: number
    y: number
    textAlign?: CanvasTextAlign
    fontSize?: number
    trackingScale: number
    blockRotation?: number
    rotationOrigin?: { x: number; y: number }
  },
): void {
  const trackingValue = normalizeTrackingScale(trackingScale)
  const angle = (blockRotation * Math.PI) / 180
  const glyphs = splitTextForTracking(text)
  const resolvedTextAlign = textAlign ?? context.textAlign
  const resolvedFontSize = fontSize ?? resolveCanvasFontSize(context.font)
  const letterSpacingPx = getTrackingLetterSpacing(resolvedFontSize, trackingValue)
  if ((glyphs.length <= 1 || trackingValue === 0) && Math.abs(angle) <= 0.0001) {
    context.textAlign = resolvedTextAlign
    setCanvasLetterSpacing(context, trackingValue, resolvedFontSize)
    context.fillText(text, x, y)
    return
  }

  if ("letterSpacing" in context) {
    context.save()
    context.textAlign = resolvedTextAlign
    setCanvasLetterSpacing(context, trackingValue, resolvedFontSize)
    if (rotationOrigin && Math.abs(angle) > 0.0001) {
      context.translate(rotationOrigin.x, rotationOrigin.y)
      context.rotate(angle)
      context.fillText(text, x - rotationOrigin.x, y - rotationOrigin.y)
      context.restore()
      return
    }
    context.fillText(text, x, y)
    context.restore()
    return
  }

  const lineWidth = measureCanvasTextWidth(context, text, trackingValue, resolvedFontSize)
  const startX = resolvedTextAlign === "center"
    ? x - lineWidth / 2
    : resolvedTextAlign === "right"
      ? x - lineWidth
      : x

  context.save()
  context.textAlign = "left"
  if (rotationOrigin && Math.abs(angle) > 0.0001) {
    const localX = startX - rotationOrigin.x
    const localY = y - rotationOrigin.y
    context.translate(rotationOrigin.x, rotationOrigin.y)
    context.rotate(angle)
    drawTrackedGlyphs(context, glyphs, localX, localY, letterSpacingPx)
    context.restore()
    return
  }

  drawTrackedGlyphs(context, glyphs, startX, y, letterSpacingPx)
  context.restore()
}

function drawTrackedGlyphs(
  context: CanvasMeasureContext & Pick<CanvasDrawContext, "fillText">,
  glyphs: string[],
  startX: number,
  baselineY: number,
  letterSpacingPx: number,
): void {
  if (glyphs.length === 0) return
  let cursorX = startX
  context.fillText(glyphs[0] ?? "", cursorX, baselineY)
  for (let index = 1; index < glyphs.length; index += 1) {
    const previous = glyphs[index - 1] ?? ""
    const current = glyphs[index] ?? ""
    const pairAdvance = context.measureText(`${previous}${current}`).width - context.measureText(previous).width
    cursorX += pairAdvance + letterSpacingPx
    context.fillText(current, cursorX, baselineY)
  }
}
