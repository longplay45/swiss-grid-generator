import {
  DEFAULT_TRACKING_SCALE,
  getTrackingLetterSpacing,
  measureTextPairAdvance,
  normalizeTrackingScale,
  splitTextForTracking,
} from "./text-rendering.ts"
import { resolveTextDrawCommandRange } from "./text-draw-command.ts"
import type { OpticalGlyphBounds } from "./optical-margin.ts"
import type { TextAlignMode } from "./types/layout-primitives.ts"
import type { TextDrawCommand } from "./typography-layout-plan.ts"

export type TextTrackingRun = {
  start: number
  end: number
  trackingScale: number
}

export type TextRange = {
  start: number
  end: number
}

type TrackingInterval = {
  start: number
  end: number
  trackingScale: number
}

type GraphemeRange = {
  text: string
  start: number
  end: number
}

const INVISIBLE_TEXT_ARTIFACTS_RE = /[\u00AD\u200B\u200C\u200D\uFEFF]/g

type CanvasMeasureContext = {
  font: string
  fontKerning?: "auto" | "normal" | "none"
  measureText: (text: string) => TextMetrics
}

type GlyphBoundsMeasure = (glyph: string) => OpticalGlyphBounds | null

function clampIndex(text: string, value: number): number {
  return Math.max(0, Math.min(text.length, Math.round(value)))
}

function normalizeRange(text: string, range: TextRange): TextRange {
  const start = clampIndex(text, Math.min(range.start, range.end))
  const end = clampIndex(text, Math.max(range.start, range.end))
  return { start, end }
}

function sanitizeTrackingScale(value: unknown): number {
  return normalizeTrackingScale(typeof value === "number" ? value : DEFAULT_TRACKING_SCALE)
}

function getTrackingIntervals(
  text: string,
  baseTrackingScale: number,
  runs: readonly TextTrackingRun[] | null | undefined,
): TrackingInterval[] {
  const base = sanitizeTrackingScale(baseTrackingScale)
  const textLength = text.length
  const boundaries = new Set<number>([0, textLength])
  const normalizedRuns = (runs ?? [])
    .map((run) => ({
      start: clampIndex(text, run.start),
      end: clampIndex(text, run.end),
      trackingScale: sanitizeTrackingScale(run.trackingScale),
    }))
    .filter((run) => run.end > run.start)

  for (const run of normalizedRuns) {
    boundaries.add(run.start)
    boundaries.add(run.end)
  }

  const sortedBoundaries = [...boundaries].sort((left, right) => left - right)
  const intervals: TrackingInterval[] = []

  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const start = sortedBoundaries[index] ?? 0
    const end = sortedBoundaries[index + 1] ?? start
    if (end <= start) continue

    let trackingScale = base
    for (const run of normalizedRuns) {
      if (start >= run.start && end <= run.end) {
        trackingScale = run.trackingScale
      }
    }
    intervals.push({ start, end, trackingScale })
  }

  return intervals
}

export function normalizeTextTrackingRuns(
  text: string,
  runs: readonly TextTrackingRun[] | null | undefined,
  baseTrackingScale = DEFAULT_TRACKING_SCALE,
): TextTrackingRun[] {
  const base = sanitizeTrackingScale(baseTrackingScale)
  const intervals = getTrackingIntervals(text, base, runs)
  const normalized: TextTrackingRun[] = []

  for (const interval of intervals) {
    if (interval.trackingScale === base) continue
    const previous = normalized[normalized.length - 1]
    if (previous && previous.end === interval.start && previous.trackingScale === interval.trackingScale) {
      previous.end = interval.end
      continue
    }
    normalized.push({
      start: interval.start,
      end: interval.end,
      trackingScale: interval.trackingScale,
    })
  }

  return normalized
}

export function getTrackingScaleForIndex(
  text: string,
  index: number,
  baseTrackingScale: number,
  runs: readonly TextTrackingRun[] | null | undefined,
): number {
  const clampedIndex = clampIndex(text, index)
  for (const interval of getTrackingIntervals(text, baseTrackingScale, runs)) {
    if (clampedIndex >= interval.start && clampedIndex < interval.end) {
      return interval.trackingScale
    }
  }
  return sanitizeTrackingScale(baseTrackingScale)
}

export function getUniformTrackingScaleForRange(
  text: string,
  range: TextRange,
  baseTrackingScale: number,
  runs: readonly TextTrackingRun[] | null | undefined,
): number | null {
  const normalizedRange = normalizeRange(text, range)
  if (normalizedRange.start === normalizedRange.end) {
    return sanitizeTrackingScale(baseTrackingScale)
  }

  let uniform: number | null = null
  for (const interval of getTrackingIntervals(text, baseTrackingScale, runs)) {
    const overlapStart = Math.max(interval.start, normalizedRange.start)
    const overlapEnd = Math.min(interval.end, normalizedRange.end)
    if (overlapEnd <= overlapStart) continue
    if (uniform === null) {
      uniform = interval.trackingScale
      continue
    }
    if (uniform !== interval.trackingScale) return null
  }

  return uniform ?? sanitizeTrackingScale(baseTrackingScale)
}

export function applyTrackingScaleToRange(
  text: string,
  range: TextRange,
  nextTrackingScale: number,
  baseTrackingScale: number,
  runs: readonly TextTrackingRun[] | null | undefined,
): TextTrackingRun[] {
  const normalizedRange = normalizeRange(text, range)
  if (normalizedRange.start === normalizedRange.end) {
    return normalizeTextTrackingRuns(text, runs, baseTrackingScale)
  }

  const appliedTrackingScale = sanitizeTrackingScale(nextTrackingScale)
  const nextIntervals: TrackingInterval[] = []

  for (const interval of getTrackingIntervals(text, baseTrackingScale, runs)) {
    if (interval.end <= normalizedRange.start || interval.start >= normalizedRange.end) {
      nextIntervals.push(interval)
      continue
    }
    if (interval.start < normalizedRange.start) {
      nextIntervals.push({
        start: interval.start,
        end: normalizedRange.start,
        trackingScale: interval.trackingScale,
      })
    }
    if (interval.end > normalizedRange.end) {
      nextIntervals.push({
        start: normalizedRange.end,
        end: interval.end,
        trackingScale: interval.trackingScale,
      })
    }
  }

  nextIntervals.push({
    start: normalizedRange.start,
    end: normalizedRange.end,
    trackingScale: appliedTrackingScale,
  })

  return normalizeTextTrackingRuns(text, nextIntervals, baseTrackingScale)
}

export function rebaseTextTrackingRuns(
  text: string,
  runs: readonly TextTrackingRun[] | null | undefined,
  previousBaseTrackingScale: number,
  nextBaseTrackingScale: number,
): TextTrackingRun[] {
  const effectiveRuns = getTrackingIntervals(text, previousBaseTrackingScale, runs)
  return normalizeTextTrackingRuns(text, effectiveRuns, nextBaseTrackingScale)
}

function splitTextForTrackingWithRanges(text: string, startOffset = 0): GraphemeRange[] {
  const graphemes = splitTextForTracking(text)
  const ranges: GraphemeRange[] = []
  let cursor = startOffset
  for (const grapheme of graphemes) {
    const start = cursor
    const end = start + grapheme.length
    ranges.push({ text: grapheme, start, end })
    cursor = end
  }
  return ranges
}

type NormalizedSourceGrapheme = {
  renderedText: string
  sourceStart: number
  sourceEnd: number
}

function toNormalizedSourceGraphemes(
  sourceText: string,
  range: TextRange,
): NormalizedSourceGrapheme[] {
  const sourceSlice = sourceText.slice(range.start, range.end)
  const graphemes = splitTextForTrackingWithRanges(sourceSlice, range.start)
  const normalized: NormalizedSourceGrapheme[] = []

  for (const grapheme of graphemes) {
    const cleanText = grapheme.text.replace(INVISIBLE_TEXT_ARTIFACTS_RE, "")
    if (!cleanText) continue
    normalized.push({
      renderedText: cleanText,
      sourceStart: grapheme.start,
      sourceEnd: grapheme.end,
    })
  }

  return normalized
}

export type TrackingSegment = {
  text: string
  trackingScale: number
  start: number
  end: number
}

export type PositionedTrackingSegment = TrackingSegment & {
  x: number
  y: number
}

export function buildTrackingSegmentsForRenderedRange({
  sourceText,
  renderedText,
  range,
  baseTrackingScale,
  runs,
}: {
  sourceText: string
  renderedText: string
  range: TextRange
  baseTrackingScale: number
  runs: readonly TextTrackingRun[] | null | undefined
}): TrackingSegment[] {
  const normalizedRange = normalizeRange(sourceText, range)
  const normalizedSource = toNormalizedSourceGraphemes(sourceText, normalizedRange)
  const renderedGraphemes = splitTextForTracking(renderedText)
  const segments: TrackingSegment[] = []

  const pushSegment = (text: string, trackingScale: number, start: number, end: number) => {
    if (!text) return
    const previous = segments[segments.length - 1]
    if (previous && previous.trackingScale === trackingScale && previous.end === start) {
      previous.text += text
      previous.end = end
      return
    }
    segments.push({ text, trackingScale, start, end })
  }

  const mappedCount = Math.min(normalizedSource.length, renderedGraphemes.length)
  for (let index = 0; index < mappedCount; index += 1) {
    const sourceGrapheme = normalizedSource[index]
    const renderedGrapheme = renderedGraphemes[index] ?? ""
    const trackingScale = getTrackingScaleForIndex(
      sourceText,
      sourceGrapheme.sourceStart,
      baseTrackingScale,
      runs,
    )
    pushSegment(renderedGrapheme, trackingScale, sourceGrapheme.sourceStart, sourceGrapheme.sourceEnd)
  }

  if (renderedGraphemes.length > mappedCount) {
    const trailingTrackingScale = segments[segments.length - 1]?.trackingScale
      ?? sanitizeTrackingScale(baseTrackingScale)
    const fallbackStart = normalizedRange.end
    for (let index = mappedCount; index < renderedGraphemes.length; index += 1) {
      pushSegment(renderedGraphemes[index] ?? "", trailingTrackingScale, fallbackStart, fallbackStart)
    }
  }

  return segments
}

export function measureTrackedTextRangeWidth(
  context: CanvasMeasureContext,
  {
    sourceText,
    renderedText,
    range,
    baseTrackingScale,
    runs,
    fontSize,
    opticalKerning = true,
    measureGlyphBounds,
  }: {
    sourceText: string
    renderedText: string
    range: TextRange
    baseTrackingScale: number
    runs: readonly TextTrackingRun[] | null | undefined
    fontSize: number
    opticalKerning?: boolean
    measureGlyphBounds?: GlyphBoundsMeasure
  },
): number {
  const graphemes = buildTrackingSegmentsForRenderedRange({
    sourceText,
    renderedText,
    range,
    baseTrackingScale,
    runs,
  }).flatMap((segment) => {
    const segmentGraphemes = splitTextForTrackingWithRanges(segment.text, segment.start)
    return segmentGraphemes.map((grapheme) => ({
      text: grapheme.text,
      trackingScale: segment.trackingScale,
    }))
  })

  if (!graphemes.length) return 0
  if (graphemes.length === 1) return context.measureText(graphemes[0]?.text ?? "").width

  let width = context.measureText(graphemes[0]?.text ?? "").width
  for (let index = 1; index < graphemes.length; index += 1) {
    const previous = graphemes[index - 1]
    const current = graphemes[index]
    const pairAdvance = measureTextPairAdvance(
      context,
      previous?.text ?? "",
      current?.text ?? "",
      fontSize,
      opticalKerning,
      measureGlyphBounds,
    )
    width += pairAdvance + getTrackingLetterSpacing(fontSize, previous?.trackingScale ?? DEFAULT_TRACKING_SCALE)
  }
  return width
}

export function buildPositionedTrackingSegments(
  context: CanvasMeasureContext,
  {
    sourceText,
    command,
    textAlign,
    baseTrackingScale,
    runs,
    fontSize,
    opticalKerning = true,
    measureGlyphBounds,
  }: {
    sourceText: string
    command: TextDrawCommand
    textAlign: TextAlignMode
    baseTrackingScale: number
    runs: readonly TextTrackingRun[] | null | undefined
    fontSize: number
    opticalKerning?: boolean
    measureGlyphBounds?: GlyphBoundsMeasure
  },
): PositionedTrackingSegment[] {
  const commandRange = resolveTextDrawCommandRange(command, sourceText.length)
  const graphemes = buildTrackingSegmentsForRenderedRange({
    sourceText,
    renderedText: commandRange.renderedText,
    range: commandRange.visibleRange,
    baseTrackingScale,
    runs,
  }).flatMap((segment) => {
    const graphemeItems = splitTextForTracking(segment.text)
    let cursor = segment.start
    return graphemeItems.map((item) => {
      const next = {
        text: item,
        start: cursor,
        end: cursor + item.length,
        trackingScale: segment.trackingScale,
      }
      cursor += item.length
      return next
    })
  })

  if (!graphemes.length) return []

  const lineWidth = measureTrackedTextRangeWidth(context, {
    sourceText,
    renderedText: commandRange.renderedText,
    range: commandRange.visibleRange,
    baseTrackingScale,
    runs,
    fontSize,
    opticalKerning,
    measureGlyphBounds,
  })
  const lineStartX = textAlign === "center"
    ? command.x - lineWidth / 2
    : textAlign === "right"
      ? command.x - lineWidth
      : command.x

  const positioned: PositionedTrackingSegment[] = []
  let cursorX = lineStartX
  let active = {
    text: graphemes[0]?.text ?? "",
    trackingScale: graphemes[0]?.trackingScale ?? baseTrackingScale,
    start: graphemes[0]?.start ?? commandRange.sourceStart,
    end: graphemes[0]?.end ?? commandRange.sourceStart,
    x: cursorX,
    y: command.y,
  }

  for (let index = 1; index < graphemes.length; index += 1) {
    const previous = graphemes[index - 1]
    const current = graphemes[index]
    const pairAdvance = measureTextPairAdvance(
      context,
      previous?.text ?? "",
      current?.text ?? "",
      fontSize,
      opticalKerning,
      measureGlyphBounds,
    )
    cursorX += pairAdvance + getTrackingLetterSpacing(fontSize, previous?.trackingScale ?? baseTrackingScale)

    if (!opticalKerning && current?.trackingScale === active.trackingScale) {
      active.text += current?.text ?? ""
      active.end = current?.end ?? active.end
      continue
    }

    positioned.push(active)
    active = {
      text: current?.text ?? "",
      trackingScale: current?.trackingScale ?? baseTrackingScale,
      start: current?.start ?? active.end,
      end: current?.end ?? active.end,
      x: cursorX,
      y: command.y,
    }
  }

  positioned.push(active)
  return positioned
}

export function remapTrackingRunsForTextEdit(
  previousText: string,
  nextText: string,
  runs: readonly TextTrackingRun[] | null | undefined,
  baseTrackingScale: number,
): TextTrackingRun[] {
  if (previousText === nextText) {
    return normalizeTextTrackingRuns(nextText, runs, baseTrackingScale)
  }

  let prefix = 0
  const maxPrefix = Math.min(previousText.length, nextText.length)
  while (prefix < maxPrefix && previousText[prefix] === nextText[prefix]) {
    prefix += 1
  }

  let previousSuffix = previousText.length
  let nextSuffix = nextText.length
  while (
    previousSuffix > prefix
    && nextSuffix > prefix
    && previousText[previousSuffix - 1] === nextText[nextSuffix - 1]
  ) {
    previousSuffix -= 1
    nextSuffix -= 1
  }

  const deletedCount = previousSuffix - prefix
  const insertedCount = nextSuffix - prefix
  const delta = insertedCount - deletedCount
  const insertionTrackingScale = getTrackingScaleForIndex(
    previousText,
    prefix,
    baseTrackingScale,
    runs,
  )

  const nextIntervals: TrackingInterval[] = []
  for (const interval of getTrackingIntervals(previousText, baseTrackingScale, runs)) {
    if (interval.end <= prefix) {
      nextIntervals.push(interval)
      continue
    }
    if (interval.start >= previousSuffix) {
      nextIntervals.push({
        start: interval.start + delta,
        end: interval.end + delta,
        trackingScale: interval.trackingScale,
      })
      continue
    }
    if (interval.start < prefix) {
      nextIntervals.push({
        start: interval.start,
        end: prefix,
        trackingScale: interval.trackingScale,
      })
    }
    if (interval.end > previousSuffix) {
      nextIntervals.push({
        start: prefix + insertedCount,
        end: interval.end + delta,
        trackingScale: interval.trackingScale,
      })
    }
  }

  if (insertedCount > 0) {
    nextIntervals.push({
      start: prefix,
      end: prefix + insertedCount,
      trackingScale: insertionTrackingScale,
    })
  }

  return normalizeTextTrackingRuns(nextText, nextIntervals, baseTrackingScale)
}
