import type { PositionedTextFormatTrackingSegment } from "./text-format-runs.ts"
import { getRenderedTextDrawCommandText } from "./text-draw-command.ts"
import { splitTextForTracking } from "./text-rendering.ts"

export type SidebarPanel = "settings" | "help" | "legal" | "example" | "text-editor" | null
export type NonEditorSidebarPanel = Exclude<SidebarPanel, "text-editor">
export type InlineEditorTextAlign = "left" | "center" | "right"

type InlineEditorSegment = PositionedTextFormatTrackingSegment<string, string>
export type InlineEditorCaretStop = {
  index: number
  x: number
}

export type InlineEditorRenderedLine = {
  sourceStart: number
  sourceEnd: number
  left: number
  top: number
  width: number
  height: number
  baselineY: number
  caretStops: InlineEditorCaretStop[]
}

export type InlineEditorRect = {
  x: number
  y: number
  width: number
  height: number
}

export type InlineEditorCommand = {
  text: string
  x: number
  y: number
  sourceStart?: number
  sourceEnd?: number
  leadingBoundaryWhitespace?: number
  trailingBoundaryWhitespace?: number
}

export type InlineEditorTextBoxInput = {
  rect: InlineEditorRect
  textAlign: InlineEditorTextAlign
  commands: InlineEditorCommand[]
  renderedLines?: InlineEditorRenderedLine[]
  measureText: (text: string, range?: { start: number; end: number }) => number
}

export type InlineEditorTextBox = {
  left: number
  width: number
}

export type InlineEditorLineMatch = InlineEditorCommand & {
  renderedText: string
  sourceStart: number
  sourceEnd: number
}

export type InlineEditorCaretInput = {
  text: string
  textAlign: InlineEditorTextAlign
  commands: InlineEditorCommand[]
  renderedLines?: InlineEditorRenderedLine[]
  segmentLines?: InlineEditorSegment[][]
  selectionStart: number
  textAscent: number
  textBoxTop: number
  lineHeight: number
  caretHeight?: number
  measureText: (text: string, range?: { start: number; end: number }) => number
}

export type InlineEditorCaret = {
  x: number
  top: number
  height: number
}

export type InlineEditorLineLayout = InlineEditorLineMatch & {
  left: number
  top: number
  width: number
  height: number
  baselineY?: number
  caretStops?: InlineEditorCaretStop[]
  segments?: InlineEditorSegment[]
}

export type InlineEditorSelectionRect = {
  left: number
  top: number
  width: number
  height: number
}

export type InlineEditorSpecialCharMarker = {
  glyph: string
  x: number
  baselineY: number
  fontSize: number
}

export type InlineEditorLineLayoutInput = {
  text: string
  textAlign: InlineEditorTextAlign
  commands: InlineEditorCommand[]
  renderedLines?: InlineEditorRenderedLine[]
  segmentLines?: InlineEditorSegment[][]
  textAscent: number
  lineHeight: number
  measureText: (text: string, range?: { start: number; end: number }) => number
}

export type InlineEditorSelectionRectInput = InlineEditorLineLayoutInput & {
  selectionStart: number
  selectionEnd: number
}

export type InlineEditorHitTestInput = InlineEditorLineLayoutInput & {
  x: number
  y: number
}

export type InlineEditorLineNavigationDirection = "home" | "end" | "up" | "down"
export type InlineEditorHorizontalNavigationDirection = "left" | "right"

export type InlineEditorLineNavigationInput = InlineEditorLineLayoutInput & {
  selectionIndex: number
  direction: InlineEditorLineNavigationDirection
  desiredX?: number | null
}

export type InlineEditorLineNavigationResult = {
  index: number
  desiredX: number
}

export type InlineEditorHorizontalNavigationInput = {
  text: string
  anchor: number
  focusIndex: number
  direction: InlineEditorHorizontalNavigationDirection
  extendSelection: boolean
}

export type InlineEditorHorizontalNavigationResult = {
  anchor: number
  focusIndex: number
}

export type InlineEditorSelectionRange = {
  start: number
  end: number
}

export type InlineEditorSelectionDirection = "forward" | "backward" | "none"

export type InlineEditorSelectionState = {
  start: number
  end: number
  anchor: number
  focusIndex: number
  focused: boolean
}

export type InlineEditorKeyboardSelectionTransitionInput = InlineEditorLineLayoutInput & {
  selection: Pick<InlineEditorSelectionState, "anchor" | "focusIndex">
  key: string
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  isAltGraph?: boolean
  desiredX?: number | null
}

export type InlineEditorKeyboardSelectionTransitionResult = {
  handled: boolean
  selection: Pick<InlineEditorSelectionState, "anchor" | "focusIndex"> | null
  desiredX: number | null
}

export type InlineEditorTransformInput = {
  pageWidth: number
  pageHeight: number
  pageRotation: number
  blockRotation: number
  rectX: number
  rectY: number
  rotationOriginX: number
  rotationOriginY: number
}

export type InlineEditorTransformOutput = {
  pageTransform: string
  pageTransformOrigin: string
  blockTransform: string
  blockTransformOrigin: string
}

export function buildInlineEditorTransform(input: InlineEditorTransformInput): InlineEditorTransformOutput {
  const pageCenterX = input.pageWidth / 2
  const pageCenterY = input.pageHeight / 2
  const relativeOriginX = input.rotationOriginX - input.rectX
  const relativeOriginY = input.rotationOriginY - input.rectY
  return {
    pageTransform: `rotate(${input.pageRotation}deg)`,
    pageTransformOrigin: `${pageCenterX}px ${pageCenterY}px`,
    blockTransform: `rotate(${input.blockRotation}deg)`,
    blockTransformOrigin: `${relativeOriginX}px ${relativeOriginY}px`,
  }
}

export function buildInlineEditorSelectionStateFromRange(
  start: number,
  end: number,
  focused: boolean,
  direction: InlineEditorSelectionDirection = "none",
): InlineEditorSelectionState {
  const nextStart = Math.min(start, end)
  const nextEnd = Math.max(start, end)
  if (nextStart === nextEnd) {
    return {
      start: nextStart,
      end: nextEnd,
      anchor: nextStart,
      focusIndex: nextEnd,
      focused,
    }
  }
  if (direction === "backward") {
    return {
      start: nextStart,
      end: nextEnd,
      anchor: nextEnd,
      focusIndex: nextStart,
      focused,
    }
  }
  return {
    start: nextStart,
    end: nextEnd,
    anchor: nextStart,
    focusIndex: nextEnd,
    focused,
  }
}

export function buildInlineEditorSelectionStateFromAnchorFocus(
  anchor: number,
  focusIndex: number,
  focused: boolean,
): InlineEditorSelectionState {
  return buildInlineEditorSelectionStateFromRange(
    anchor,
    focusIndex,
    focused,
    focusIndex < anchor ? "backward" : "forward",
  )
}

export function getInlineEditorSelectionDirection(
  selection: Pick<InlineEditorSelectionState, "start" | "end" | "anchor" | "focusIndex">,
): InlineEditorSelectionDirection {
  if (selection.start === selection.end) return "none"
  return selection.focusIndex < selection.anchor ? "backward" : "forward"
}

function stripInvisibleTextArtifacts(text: string): string {
  return text.replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, "")
}

function getRenderedCommandText(command: InlineEditorCommand): string {
  return normalizeVisibleText(getRenderedTextDrawCommandText(command))
}

function normalizeVisibleText(text: string): string {
  return stripInvisibleTextArtifacts(text).replace(/\r\n?/g, "\n")
}

function normalizePrefixText(text: string): string {
  return normalizeVisibleText(text)
}

function clampSelectionIndex(text: string, index: number): number {
  return Math.max(0, Math.min(normalizeVisibleText(text).length, index))
}

function clampSelectionRange(
  text: string,
  start: number,
  end: number,
): InlineEditorSelectionRange {
  const clampedStart = clampSelectionIndex(text, Math.min(start, end))
  const clampedEnd = clampSelectionIndex(text, Math.max(start, end))
  return {
    start: clampedStart,
    end: clampedEnd,
  }
}

function trimWhitespaceFromRange(
  text: string,
  start: number,
  end: number,
): InlineEditorSelectionRange {
  let nextStart = start
  let nextEnd = end
  while (nextStart < nextEnd && /\s/u.test(text[nextStart] ?? "")) nextStart += 1
  while (nextEnd > nextStart && /\s/u.test(text[nextEnd - 1] ?? "")) nextEnd -= 1
  return clampSelectionRange(text, nextStart, nextEnd)
}

function isWordCharacter(value: string): boolean {
  return /[\p{L}\p{N}\p{M}'’_-]/u.test(value)
}

function isSentenceTerminal(value: string): boolean {
  return /[.!?…]/u.test(value)
}

function isSentenceClosingMark(value: string): boolean {
  return /["'”’)\]]/u.test(value)
}

type SegmenterLike = {
  segment: (input: string) => Iterable<{
    segment: string
    index: number
    isWordLike?: boolean
  }>
}

function getIntlSegmenter(granularity: "word" | "sentence"): SegmenterLike | null {
  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") return null
  try {
    return new Intl.Segmenter(undefined, { granularity })
  } catch {
    return null
  }
}

function findSegmentContainingIndex(
  segments: Array<{ index: number; segment: string; isWordLike?: boolean }>,
  index: number,
  textLength: number,
): { index: number; segment: string; isWordLike?: boolean } | null {
  if (!segments.length) return null
  const clampedIndex = Math.max(0, Math.min(textLength, index))
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex]!
    const nextSegment = segments[segmentIndex + 1]
    const end = nextSegment?.index ?? textLength
    if (clampedIndex < end || (clampedIndex === textLength && end === textLength)) {
      return segment
    }
  }
  return segments[segments.length - 1] ?? null
}

function resolveWordRangeWithoutSegmenter(text: string, index: number): InlineEditorSelectionRange {
  if (!text.length) return { start: 0, end: 0 }
  let probe = clampSelectionIndex(text, index)
  if (probe === text.length) probe = Math.max(0, text.length - 1)
  const probeChar = text[probe] ?? ""

  if (isWordCharacter(probeChar)) {
    let start = probe
    let end = probe + 1
    while (start > 0 && isWordCharacter(text[start - 1] ?? "")) start -= 1
    while (end < text.length && isWordCharacter(text[end] ?? "")) end += 1
    return { start, end }
  }

  if (/\s/u.test(probeChar)) {
    let start = probe
    let end = probe + 1
    while (start > 0 && /\s/u.test(text[start - 1] ?? "")) start -= 1
    while (end < text.length && /\s/u.test(text[end] ?? "")) end += 1
    return { start, end }
  }

  let start = probe
  let end = probe + 1
  while (start > 0) {
    const value = text[start - 1] ?? ""
    if (isWordCharacter(value) || /\s/u.test(value)) break
    start -= 1
  }
  while (end < text.length) {
    const value = text[end] ?? ""
    if (isWordCharacter(value) || /\s/u.test(value)) break
    end += 1
  }
  return { start, end }
}

function resolveSentenceRangeWithoutSegmenter(text: string, index: number): InlineEditorSelectionRange {
  if (!text.length) return { start: 0, end: 0 }
  let probe = clampSelectionIndex(text, index)
  if (probe === text.length) probe = Math.max(0, text.length - 1)
  while (probe > 0 && /\s/u.test(text[probe] ?? "") && !/\s/u.test(text[probe - 1] ?? "")) {
    probe -= 1
  }

  let start = probe
  while (start > 0) {
    const previous = text[start - 1] ?? ""
    if (previous === "\n") break
    if (isSentenceTerminal(previous)) break
    start -= 1
  }
  while (start < text.length && /\s/u.test(text[start] ?? "")) start += 1

  let end = probe
  while (end < text.length) {
    const value = text[end] ?? ""
    if (value === "\n") break
    end += 1
    if (isSentenceTerminal(value)) {
      while (end < text.length && isSentenceClosingMark(text[end] ?? "")) end += 1
      break
    }
  }

  return trimWhitespaceFromRange(text, start, end)
}

export function resolveInlineEditorWordSelection(
  text: string,
  index: number,
): InlineEditorSelectionRange {
  const normalizedText = normalizeVisibleText(text)
  if (!normalizedText.length) return { start: 0, end: 0 }
  const segmenter = getIntlSegmenter("word")
  if (!segmenter) {
    return resolveWordRangeWithoutSegmenter(normalizedText, index)
  }
  const segments = Array.from(segmenter.segment(normalizedText))
  const segment = findSegmentContainingIndex(segments, index, normalizedText.length)
  if (!segment) return { start: 0, end: 0 }
  const start = segment.index
  const end = Math.min(normalizedText.length, start + segment.segment.length)
  if (segment.isWordLike === false) {
    return clampSelectionRange(normalizedText, start, end)
  }
  return clampSelectionRange(normalizedText, start, end)
}

export function resolveInlineEditorSentenceSelection(
  text: string,
  index: number,
): InlineEditorSelectionRange {
  const normalizedText = normalizeVisibleText(text)
  if (!normalizedText.length) return { start: 0, end: 0 }
  const segmenter = getIntlSegmenter("sentence")
  if (!segmenter) {
    return resolveSentenceRangeWithoutSegmenter(normalizedText, index)
  }
  const segments = Array.from(segmenter.segment(normalizedText))
  const segment = findSegmentContainingIndex(segments, index, normalizedText.length)
  if (!segment) return { start: 0, end: normalizedText.length }
  return trimWhitespaceFromRange(
    normalizedText,
    segment.index,
    Math.min(normalizedText.length, segment.index + segment.segment.length),
  )
}

function getInlineEditorSpecialCharGlyph(value: string): string | null {
  if (value === "\n") return "¶"
  if (value === "\t") return "⇥"
  if (value === " " || value === "\u00A0" || value === "\u202F" || value === "\u2009") return "·"
  return null
}

function getVisibleSourceRange(
  line: Pick<InlineEditorLineMatch, "sourceStart" | "sourceEnd" | "leadingBoundaryWhitespace" | "trailingBoundaryWhitespace">,
): { start: number; end: number } {
  const sourceStart = Math.max(0, line.sourceStart)
  const sourceEnd = Math.max(sourceStart, line.sourceEnd)
  const visibleStart = Math.min(
    sourceEnd,
    sourceStart + Math.max(0, Math.min(line.leadingBoundaryWhitespace ?? 0, sourceEnd - sourceStart)),
  )
  const visibleEnd = Math.max(
    visibleStart,
    sourceEnd - Math.max(0, Math.min(line.trailingBoundaryWhitespace ?? 0, sourceEnd - visibleStart)),
  )
  return {
    start: visibleStart,
    end: visibleEnd,
  }
}

function getLineStartX(
  line: Pick<InlineEditorLineMatch, "x" | "renderedText" | "sourceStart" | "sourceEnd" | "leadingBoundaryWhitespace" | "trailingBoundaryWhitespace">,
  textAlign: InlineEditorTextAlign,
  measureText: (text: string, range?: { start: number; end: number }) => number,
): number {
  const range = typeof line.sourceStart === "number" && typeof line.sourceEnd === "number"
    ? getVisibleSourceRange(line)
    : undefined
  if (textAlign === "center") {
    return line.x - measureText(line.renderedText, range) / 2
  }
  if (textAlign === "right") {
    return line.x - measureText(line.renderedText, range)
  }
  return line.x
}

const INVISIBLE_TEXT_ARTIFACTS_RE = /[\u00AD\u200B\u200C\u200D\uFEFF]/g

type NormalizedSourceGrapheme = {
  renderedText: string
  sourceStart: number
  sourceEnd: number
}

function toNormalizedSourceGraphemes(
  text: string,
  start: number,
  end: number,
): NormalizedSourceGrapheme[] {
  const slice = text.slice(start, end)
  const graphemes = splitTextForTracking(slice)
  const normalized: NormalizedSourceGrapheme[] = []
  let cursor = start

  for (const grapheme of graphemes) {
    const graphemeStart = cursor
    const graphemeEnd = graphemeStart + grapheme.length
    cursor = graphemeEnd
    const cleanText = grapheme.replace(INVISIBLE_TEXT_ARTIFACTS_RE, "")
    if (!cleanText) continue
    normalized.push({
      renderedText: cleanText,
      sourceStart: graphemeStart,
      sourceEnd: graphemeEnd,
    })
  }

  return normalized
}

function getRenderedPrefixForIndex(
  text: string,
  segment: InlineEditorSegment,
  sourceIndex: number,
): string {
  const normalized = toNormalizedSourceGraphemes(text, segment.start, segment.end)
  const renderedGraphemes = splitTextForTracking(segment.text)
  const effectiveIndex = Math.max(segment.start, Math.min(segment.end, sourceIndex))
  let prefix = ""
  const count = Math.min(normalized.length, renderedGraphemes.length)

  for (let index = 0; index < count; index += 1) {
    if ((normalized[index]?.sourceEnd ?? segment.start) > effectiveIndex) break
    prefix += renderedGraphemes[index] ?? ""
  }

  return prefix
}

function getLineSourceStart(
  line: Pick<InlineEditorLineMatch, "sourceStart"> & { segments?: InlineEditorSegment[]; caretStops?: InlineEditorCaretStop[] },
): number {
  if (line.caretStops?.length) {
    return line.caretStops[0]?.index ?? line.sourceStart
  }
  if (line.segments?.length) {
    return line.segments[0]?.start ?? line.sourceStart
  }
  return line.sourceStart
}

function getLineSourceEnd(
  line: Pick<InlineEditorLineMatch, "sourceEnd"> & { segments?: InlineEditorSegment[]; caretStops?: InlineEditorCaretStop[] },
): number {
  if (line.caretStops?.length) {
    return line.caretStops[line.caretStops.length - 1]?.index ?? line.sourceEnd
  }
  if (line.segments?.length) {
    return line.segments[line.segments.length - 1]?.end ?? line.sourceEnd
  }
  return line.sourceEnd
}

function getCaretXFromStops(
  line: { caretStops?: InlineEditorCaretStop[] },
  sourceIndex: number,
): number | null {
  const stops = line.caretStops
  if (!stops?.length) return null
  let previous = stops[0]!
  if (sourceIndex <= previous.index) return previous.x
  for (let index = 1; index < stops.length; index += 1) {
    const current = stops[index]!
    if (sourceIndex <= current.index) {
      if (current.index === previous.index) return current.x
      const ratio = (sourceIndex - previous.index) / (current.index - previous.index)
      return previous.x + (current.x - previous.x) * ratio
    }
    previous = current
  }
  return stops[stops.length - 1]?.x ?? null
}

function getCaretXForIndex(
  text: string,
  line: InlineEditorLineMatch & { left: number; caretStops?: InlineEditorCaretStop[]; segments?: InlineEditorSegment[] },
  sourceIndex: number,
  measureText: (text: string, range?: { start: number; end: number }) => number,
): number {
  const fromStops = getCaretXFromStops(line, sourceIndex)
  if (fromStops !== null) return fromStops
  if (!line.segments?.length) {
    return line.left + measurePrefixWidthForIndex(text, line, sourceIndex, measureText)
  }

  const clampedIndex = Math.max(getLineSourceStart(line), Math.min(getLineSourceEnd(line), sourceIndex))
  for (let index = 0; index < line.segments.length; index += 1) {
    const segment = line.segments[index]!
    const nextSegment = line.segments[index + 1]
    if (clampedIndex <= segment.start) {
      return segment.x
    }
    if (clampedIndex === segment.end && nextSegment?.start === clampedIndex) {
      return nextSegment.x
    }
    if (clampedIndex <= segment.end) {
      const renderedPrefix = getRenderedPrefixForIndex(text, segment, clampedIndex)
      return segment.x + measureText(renderedPrefix, { start: segment.start, end: clampedIndex })
    }
  }

  const lastSegment = line.segments[line.segments.length - 1]
  if (!lastSegment) return line.left
  return lastSegment.x + measureText(lastSegment.text, { start: lastSegment.start, end: lastSegment.end })
}

function measurePrefixWidthForIndex(
  text: string,
  line: InlineEditorLineMatch,
  sourceIndex: number,
  measureText: (text: string, range?: { start: number; end: number }) => number,
): number {
  const visibleRange = getVisibleSourceRange(line)
  const clampedIndex = Math.max(line.sourceStart, Math.min(line.sourceEnd, sourceIndex))
  if (clampedIndex <= visibleRange.start) return 0
  const visibleIndex = Math.max(visibleRange.start, Math.min(visibleRange.end, clampedIndex))
  const sourcePrefix = text.slice(visibleRange.start, visibleIndex)
  const normalizedPrefix = normalizePrefixText(sourcePrefix)
  const renderedPrefix = visibleIndex >= visibleRange.end && line.renderedText.endsWith("-")
    ? line.renderedText
    : normalizedPrefix
  return measureText(renderedPrefix, { start: visibleRange.start, end: visibleIndex })
}

function getActiveLineIndexForSelection(
  lines: InlineEditorLineMatch[],
  selectionIndex: number,
): number {
  if (!lines.length) return -1
  let activeLineIndex = lines.length - 1
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (selectionIndex < line.sourceStart) break
    activeLineIndex = index
    if (selectionIndex <= line.sourceEnd) break
  }
  return activeLineIndex
}

export function computeInlineEditorTextBox({
  rect,
  textAlign,
  commands,
  renderedLines,
  measureText,
}: InlineEditorTextBoxInput): InlineEditorTextBox {
  if (renderedLines?.length) {
    const minX = Math.min(rect.x, ...renderedLines.map((line) => line.left))
    const maxX = Math.max(rect.x + rect.width, ...renderedLines.map((line) => line.left + line.width))
    return {
      left: minX,
      width: Math.max(1, maxX - minX),
    }
  }

  let minX = rect.x
  let maxX = rect.x + rect.width

  for (const command of commands) {
    const renderedText = getRenderedCommandText(command)
    const range = typeof command.sourceStart === "number" && typeof command.sourceEnd === "number"
      ? getVisibleSourceRange({
        sourceStart: command.sourceStart,
        sourceEnd: command.sourceEnd,
        leadingBoundaryWhitespace: command.leadingBoundaryWhitespace,
        trailingBoundaryWhitespace: command.trailingBoundaryWhitespace,
      })
      : undefined
    const renderedWidth = measureText(renderedText, (
      range
    ))
    const lineLeft = textAlign === "right"
      ? command.x - renderedWidth
      : textAlign === "center"
        ? command.x - renderedWidth / 2
        : command.x
    const lineRight = textAlign === "right"
      ? command.x
      : textAlign === "center"
        ? command.x + renderedWidth / 2
        : command.x + renderedWidth
    minX = Math.min(minX, lineLeft)
    maxX = Math.max(maxX, lineRight)
  }

  return {
    left: minX,
    width: Math.max(1, maxX - minX),
  }
}

export function resolveInlineEditorLineMatches(
  text: string,
  commands: InlineEditorCommand[],
): InlineEditorLineMatch[] {
  const normalizedText = normalizeVisibleText(text)
  let cursor = 0

  return commands.map((command) => {
    const renderedText = getRenderedCommandText(command)
    if (typeof command.sourceStart === "number" && typeof command.sourceEnd === "number") {
      const sourceStart = clampSelectionIndex(text, command.sourceStart)
      const sourceEnd = clampSelectionIndex(text, Math.max(command.sourceStart, command.sourceEnd))
      cursor = sourceEnd
      return {
        ...command,
        renderedText,
        sourceStart,
        sourceEnd,
      }
    }
    const candidates = renderedText.endsWith("-")
      ? [renderedText, renderedText.slice(0, -1)]
      : [renderedText]
    let sourceStart = cursor
    let sourceEnd = cursor

    for (const candidate of candidates) {
      if (!candidate) continue
      const matchAt = normalizedText.indexOf(candidate, cursor)
      if (matchAt >= cursor) {
        sourceStart = matchAt
        sourceEnd = matchAt + candidate.length
        cursor = sourceEnd
        break
      }
    }

    if (sourceEnd === sourceStart) {
      sourceEnd = Math.min(normalizedText.length, sourceStart + renderedText.length)
      cursor = sourceEnd
    }

    return {
      ...command,
      renderedText,
      sourceStart,
      sourceEnd,
    }
  })
}

export function buildInlineEditorLineLayouts({
  text,
  textAlign,
  commands,
  renderedLines,
  segmentLines,
  textAscent,
  lineHeight,
  measureText,
}: InlineEditorLineLayoutInput): InlineEditorLineLayout[] {
  if (renderedLines?.length) {
    return renderedLines.map((line, index) => {
      const fallbackCommand = commands[index]
      return {
        text: fallbackCommand?.text ?? "",
        x: fallbackCommand?.x ?? line.left,
        y: fallbackCommand?.y ?? line.baselineY,
        renderedText: fallbackCommand ? getRenderedCommandText(fallbackCommand) : "",
        sourceStart: line.sourceStart,
        sourceEnd: line.sourceEnd,
        left: line.left,
        top: line.top,
        width: line.width,
        height: line.height,
        baselineY: line.baselineY,
        caretStops: line.caretStops,
        segments: segmentLines?.[index]?.length ? segmentLines[index] : undefined,
      }
    })
  }

  return resolveInlineEditorLineMatches(text, commands).map((line, index) => {
    const segments = segmentLines?.[index]?.length ? segmentLines[index] : undefined
    const left = getLineStartX(line, textAlign, measureText)
    const lineStart = segments?.[0]?.start ?? line.sourceStart
    const lineEnd = segments?.[segments.length - 1]?.end ?? line.sourceEnd
    const visibleRange = getVisibleSourceRange(line)
    const width = segments?.length
      ? Math.max(1, getCaretXForIndex(text, { ...line, left, segments }, lineEnd, measureText) - (segments[0]?.x ?? left))
      : measureText(line.renderedText, visibleRange)
    return {
      ...line,
      sourceStart: lineStart,
      sourceEnd: lineEnd,
      left: segments?.[0]?.x ?? left,
      top: line.y - textAscent,
      width,
      height: lineHeight,
      segments,
    }
  })
}

export function computeInlineEditorCaret({
  text,
  textAlign,
  commands,
  renderedLines,
  segmentLines,
  selectionStart,
  textAscent,
  textBoxTop,
  lineHeight,
  caretHeight,
  measureText,
}: InlineEditorCaretInput): InlineEditorCaret | null {
  if (!commands.length) return null

  const layoutLines = buildInlineEditorLineLayouts({
    text,
    textAlign,
    commands,
    renderedLines,
    segmentLines,
    textAscent,
    lineHeight,
    measureText,
  })
  const clampedSelection = clampSelectionIndex(text, selectionStart)
  const activeLineIndex = getActiveLineIndexForSelection(layoutLines, clampedSelection)
  const activeLine = layoutLines[Math.max(0, activeLineIndex)] ?? layoutLines[layoutLines.length - 1]
  if (!activeLine) return null

  const caretX = getCaretXForIndex(text, activeLine, clampedSelection, measureText)
  const lineTop = activeLine.top

  return {
    x: caretX,
    top: lineTop - textBoxTop,
    height: Math.max(1, caretHeight ?? activeLine.height ?? lineHeight),
  }
}

export function computeInlineEditorSelectionRects({
  text,
  textAlign,
  commands,
  renderedLines,
  segmentLines,
  selectionStart,
  selectionEnd,
  textAscent,
  lineHeight,
  measureText,
}: InlineEditorSelectionRectInput): InlineEditorSelectionRect[] {
  if (!commands.length) return []

  const start = clampSelectionIndex(text, Math.min(selectionStart, selectionEnd))
  const end = clampSelectionIndex(text, Math.max(selectionStart, selectionEnd))
  if (start === end) return []

  const lines = buildInlineEditorLineLayouts({
    text,
    textAlign,
    commands,
    renderedLines,
    segmentLines,
    textAscent,
    lineHeight,
    measureText,
  })
  const rects: InlineEditorSelectionRect[] = []

  for (const line of lines) {
    const lineStart = Math.max(line.sourceStart, start)
    const lineEnd = Math.min(line.sourceEnd, end)
    if (lineStart > lineEnd) continue
    if (lineStart === lineEnd && !(lineEnd === line.sourceEnd && end > line.sourceEnd)) continue

    const left = getCaretXForIndex(text, line, lineStart, measureText)
    const right = getCaretXForIndex(
      text,
      line,
      lineEnd === line.sourceEnd && end > line.sourceStart ? line.sourceEnd : lineEnd,
      measureText,
    )
    if (right <= left) continue
    rects.push({
      left,
      top: line.top,
      width: right - left,
      height: line.height,
    })
  }

  return rects
}

export function computeInlineEditorSpecialCharMarkers({
  text,
  textAlign,
  commands,
  renderedLines,
  segmentLines,
  textAscent,
  lineHeight,
  measureText,
  markerFontSize,
  newlineMarkerOffset = 6,
}: InlineEditorLineLayoutInput & {
  markerFontSize: number
  newlineMarkerOffset?: number
}): InlineEditorSpecialCharMarker[] {
  if (!commands.length) return []

  const lines = buildInlineEditorLineLayouts({
    text,
    textAlign,
    commands,
    renderedLines,
    segmentLines,
    textAscent,
    lineHeight,
    measureText,
  })
  const markers: InlineEditorSpecialCharMarker[] = []
  const markedSourceIndices = new Set<number>()

  for (const line of lines) {
    const baselineY = line.baselineY ?? (line.top + textAscent)
    for (let index = line.sourceStart; index < line.sourceEnd; index += 1) {
      if (markedSourceIndices.has(index)) continue
      const glyph = getInlineEditorSpecialCharGlyph(text[index] ?? "")
      if (!glyph || glyph === "¶") continue
      const startX = getCaretXForIndex(text, line, index, measureText)
      const endX = getCaretXForIndex(text, line, index + 1, measureText)
      markers.push({
        glyph,
        x: startX + (endX - startX) / 2,
        baselineY,
        fontSize: markerFontSize,
      })
      markedSourceIndices.add(index)
    }

    if (getInlineEditorSpecialCharGlyph(text[line.sourceEnd] ?? "") !== "¶") continue
    const lineEndX = getCaretXForIndex(text, line, line.sourceEnd, measureText)
    markers.push({
      glyph: "¶",
      x: lineEndX + Math.max(2, newlineMarkerOffset),
      baselineY,
      fontSize: markerFontSize,
    })
  }

  return markers
}

export function resolveInlineEditorLineNavigation({
  text,
  textAlign,
  commands,
  renderedLines,
  segmentLines,
  selectionIndex,
  direction,
  desiredX = null,
  textAscent,
  lineHeight,
  measureText,
}: InlineEditorLineNavigationInput): InlineEditorLineNavigationResult {
  const clampedSelection = clampSelectionIndex(text, selectionIndex)
  if (!commands.length) {
    return {
      index: clampedSelection,
      desiredX: 0,
    }
  }

  const lines = buildInlineEditorLineLayouts({
    text,
    textAlign,
    commands,
    renderedLines,
    segmentLines,
    textAscent,
    lineHeight,
    measureText,
  })
  const activeLineIndex = getActiveLineIndexForSelection(lines, clampedSelection)
  const activeLine = lines[Math.max(0, activeLineIndex)] ?? lines[lines.length - 1]
  const currentCaretX = getCaretXForIndex(text, activeLine, clampedSelection, measureText)

  if (direction === "home") {
    return {
      index: activeLine.sourceStart,
      desiredX: activeLine.left,
    }
  }

  if (direction === "end") {
    return {
      index: activeLine.sourceEnd,
      desiredX: getCaretXForIndex(text, activeLine, activeLine.sourceEnd, measureText),
    }
  }

  const targetLineIndex = direction === "up"
    ? Math.max(0, activeLineIndex - 1)
    : Math.min(lines.length - 1, activeLineIndex + 1)
  const targetLine = lines[targetLineIndex] ?? activeLine
  const targetCaretX = desiredX ?? currentCaretX

  let bestIndex = targetLine.sourceStart
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = targetLine.sourceStart; index <= targetLine.sourceEnd; index += 1) {
    const caretX = getCaretXForIndex(text, targetLine, index, measureText)
    const distance = Math.abs(targetCaretX - caretX)
    if (distance <= bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  return {
    index: bestIndex,
    desiredX: targetCaretX,
  }
}

export function resolveInlineEditorHorizontalNavigation({
  text,
  anchor,
  focusIndex,
  direction,
  extendSelection,
}: InlineEditorHorizontalNavigationInput): InlineEditorHorizontalNavigationResult {
  const textLength = normalizeVisibleText(text).length
  const clampedAnchor = Math.max(0, Math.min(textLength, anchor))
  const clampedFocusIndex = Math.max(0, Math.min(textLength, focusIndex))
  const selectionStart = Math.min(clampedAnchor, clampedFocusIndex)
  const selectionEnd = Math.max(clampedAnchor, clampedFocusIndex)

  if (extendSelection) {
    return {
      anchor: clampedAnchor,
      focusIndex: direction === "left"
        ? Math.max(0, clampedFocusIndex - 1)
        : Math.min(textLength, clampedFocusIndex + 1),
    }
  }

  const collapsedIndex = selectionStart !== selectionEnd
    ? (direction === "left" ? selectionStart : selectionEnd)
    : (direction === "left"
      ? Math.max(0, clampedFocusIndex - 1)
      : Math.min(textLength, clampedFocusIndex + 1))

  return {
    anchor: collapsedIndex,
    focusIndex: collapsedIndex,
  }
}

export function resolveInlineEditorKeyboardSelectionTransition({
  text,
  textAlign,
  commands,
  renderedLines,
  segmentLines,
  selection,
  key,
  shiftKey,
  altKey,
  ctrlKey,
  metaKey,
  isAltGraph = false,
  desiredX = null,
  textAscent,
  lineHeight,
  measureText,
}: InlineEditorKeyboardSelectionTransitionInput): InlineEditorKeyboardSelectionTransitionResult {
  const normalizedText = normalizeVisibleText(text)
  const lowerKey = key.toLowerCase()
  const isSelectAllShortcut = lowerKey === "a"
    && !shiftKey
    && !isAltGraph
    && (
      metaKey
      || ctrlKey
      || (altKey && !metaKey && !ctrlKey)
    )
  if (isSelectAllShortcut) {
    return {
      handled: true,
      selection: {
        anchor: 0,
        focusIndex: normalizedText.length,
      },
      desiredX: null,
    }
  }

  if (altKey || metaKey || ctrlKey) {
    return {
      handled: false,
      selection: null,
      desiredX,
    }
  }

  if (key === "ArrowLeft" || key === "ArrowRight") {
    return {
      handled: true,
      selection: resolveInlineEditorHorizontalNavigation({
        text,
        anchor: selection.anchor,
        focusIndex: selection.focusIndex,
        direction: key === "ArrowLeft" ? "left" : "right",
        extendSelection: shiftKey,
      }),
      desiredX: null,
    }
  }

  if (key === "Home" || key === "End" || key === "ArrowUp" || key === "ArrowDown") {
    const result = resolveInlineEditorLineNavigation({
      text,
      textAlign,
      commands,
      renderedLines,
      segmentLines,
      selectionIndex: selection.focusIndex,
      direction: key === "Home"
        ? "home"
        : key === "End"
          ? "end"
          : key === "ArrowUp"
            ? "up"
            : "down",
      desiredX,
      textAscent,
      lineHeight,
      measureText,
    })
    return {
      handled: true,
      selection: shiftKey
        ? { anchor: selection.anchor, focusIndex: result.index }
        : { anchor: result.index, focusIndex: result.index },
      desiredX: result.desiredX,
    }
  }

  return {
    handled: false,
    selection: null,
    desiredX,
  }
}

export function hitTestInlineEditorIndex({
  text,
  textAlign,
  commands,
  renderedLines,
  segmentLines,
  x,
  y,
  textAscent,
  lineHeight,
  measureText,
}: InlineEditorHitTestInput): number {
  if (!commands.length) return clampSelectionIndex(text, 0)

  const lines = buildInlineEditorLineLayouts({
    text,
    textAlign,
    commands,
    renderedLines,
    segmentLines,
    textAscent,
    lineHeight,
    measureText,
  })

  let activeLine = lines[0]
  let bestScore = Number.POSITIVE_INFINITY
  for (const line of lines) {
    const verticalDistance = y < line.top
      ? line.top - y
      : y > line.top + line.height
        ? y - (line.top + line.height)
        : 0
    const horizontalDistance = x < line.left
      ? line.left - x
      : x > line.left + line.width
        ? x - (line.left + line.width)
        : 0
    const score = verticalDistance * 10000 + horizontalDistance
    if (score < bestScore) {
      bestScore = score
      activeLine = line
    }
  }

  let bestIndex = activeLine.sourceStart
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = activeLine.sourceStart; index <= activeLine.sourceEnd; index += 1) {
    const caretX = getCaretXForIndex(text, activeLine, index, measureText)
    const distance = Math.abs(x - caretX)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  return bestIndex
}

export function computeSidebarWithEditorSession(
  activePanel: SidebarPanel,
  previousPanelBeforeEditor: NonEditorSidebarPanel,
  hasEditorSession: boolean,
): { nextPanel: SidebarPanel; nextPreviousPanelBeforeEditor: NonEditorSidebarPanel } {
  if (hasEditorSession) {
    if (activePanel === "text-editor") {
      return { nextPanel: activePanel, nextPreviousPanelBeforeEditor: previousPanelBeforeEditor }
    }
    return {
      nextPanel: "text-editor",
      nextPreviousPanelBeforeEditor: activePanel,
    }
  }
  if (activePanel !== "text-editor") {
    return { nextPanel: activePanel, nextPreviousPanelBeforeEditor: previousPanelBeforeEditor }
  }
  return {
    nextPanel: previousPanelBeforeEditor,
    nextPreviousPanelBeforeEditor: previousPanelBeforeEditor,
  }
}
