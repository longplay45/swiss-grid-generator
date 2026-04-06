import {
  buildCanvasFont,
  DEFAULT_TRACKING_SCALE,
  getTrackingLetterSpacing,
  measureTextPairAdvance,
  normalizeTrackingScale,
  splitTextForTracking,
} from "@/lib/text-rendering"
import { resolveTextDrawCommandRange } from "@/lib/text-draw-command"
import {
  getTrackingScaleForIndex,
  normalizeTextTrackingRuns,
  type TextTrackingRun,
} from "@/lib/text-tracking-runs"
import type { TextAlignMode } from "@/lib/types/layout-primitives"
import type { TextDrawCommand } from "@/lib/typography-layout-plan"

export type TextRange = {
  start: number
  end: number
}

export type BaseTextFormat<
  StyleKey extends string = string,
  FontFamily extends string = string,
> = {
  fontFamily: FontFamily
  fontWeight: number
  italic: boolean
  styleKey: StyleKey
  color: string
}

export type TextFormatRun<
  StyleKey extends string = string,
  FontFamily extends string = string,
> = {
  start: number
  end: number
  fontFamily?: FontFamily
  fontWeight?: number
  italic?: boolean
  styleKey?: StyleKey
  color?: string
}

type ResolvedTextFormat<
  StyleKey extends string = string,
  FontFamily extends string = string,
> = BaseTextFormat<StyleKey, FontFamily> & {
  start: number
  end: number
}

type FormatPatch<
  StyleKey extends string = string,
  FontFamily extends string = string,
> = Partial<BaseTextFormat<StyleKey, FontFamily>>

type CanvasMeasureContext = {
  font: string
  fontKerning?: "auto" | "normal" | "none"
  measureText: (text: string) => TextMetrics
}

type SourceGrapheme = {
  renderedText: string
  sourceStart: number
  sourceEnd: number
}

type ResolvedFormatTrackingGrapheme<
  StyleKey extends string = string,
  FontFamily extends string = string,
> = BaseTextFormat<StyleKey, FontFamily> & {
  text: string
  start: number
  end: number
  trackingScale: number
  fontSize: number
}

export type TextFormatTrackingSegment<
  StyleKey extends string = string,
  FontFamily extends string = string,
> = BaseTextFormat<StyleKey, FontFamily> & {
  text: string
  start: number
  end: number
  trackingScale: number
  fontSize: number
}

export type PositionedTextFormatTrackingSegment<
  StyleKey extends string = string,
  FontFamily extends string = string,
> = TextFormatTrackingSegment<StyleKey, FontFamily> & {
  x: number
  y: number
}

export type PositionedTextFormatTrackingGrapheme<
  StyleKey extends string = string,
  FontFamily extends string = string,
> = TextFormatTrackingSegment<StyleKey, FontFamily> & {
  x: number
  y: number
  width: number
  ascent: number
  descent: number
}

const INVISIBLE_TEXT_ARTIFACTS_RE = /[\u00AD\u200B\u200C\u200D\uFEFF]/g

function clampIndex(text: string, value: number): number {
  return Math.max(0, Math.min(text.length, Math.round(value)))
}

function normalizeRange(text: string, range: TextRange): TextRange {
  const start = clampIndex(text, Math.min(range.start, range.end))
  const end = clampIndex(text, Math.max(range.start, range.end))
  return { start, end }
}

function splitTextForTrackingWithRanges(text: string, startOffset = 0) {
  const graphemes = splitTextForTracking(text)
  const ranges: Array<{ text: string; start: number; end: number }> = []
  let cursor = startOffset
  for (const grapheme of graphemes) {
    const start = cursor
    const end = start + grapheme.length
    ranges.push({ text: grapheme, start, end })
    cursor = end
  }
  return ranges
}

function toNormalizedSourceGraphemes(
  sourceText: string,
  range: TextRange,
): SourceGrapheme[] {
  const sourceSlice = sourceText.slice(range.start, range.end)
  const graphemes = splitTextForTrackingWithRanges(sourceSlice, range.start)
  const normalized: SourceGrapheme[] = []

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

function sanitizeFontWeight(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback
  return Math.round(value)
}

function sanitizeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback
}

function sanitizeFontFamily<FontFamily extends string>(value: unknown, fallback: FontFamily): FontFamily {
  return typeof value === "string" && value.trim().length > 0 ? value as FontFamily : fallback
}

function sanitizeStyleKey<StyleKey extends string>(value: unknown, fallback: StyleKey): StyleKey {
  return typeof value === "string" && value.trim().length > 0 ? value as StyleKey : fallback
}

function normalizeBaseTextFormat<
  StyleKey extends string,
  FontFamily extends string,
>(
  base: BaseTextFormat<StyleKey, FontFamily>,
): BaseTextFormat<StyleKey, FontFamily> {
  return {
    fontFamily: sanitizeFontFamily(base.fontFamily, base.fontFamily),
    fontWeight: sanitizeFontWeight(base.fontWeight, 400),
    italic: base.italic === true,
    styleKey: sanitizeStyleKey(base.styleKey, base.styleKey),
    color: sanitizeColor(base.color, "#000000"),
  }
}

function omitBaseValues<
  StyleKey extends string,
  FontFamily extends string,
>(
  resolved: BaseTextFormat<StyleKey, FontFamily>,
  base: BaseTextFormat<StyleKey, FontFamily>,
): Omit<TextFormatRun<StyleKey, FontFamily>, "start" | "end"> {
  const normalizedBase = normalizeBaseTextFormat(base)
  const next: Omit<TextFormatRun<StyleKey, FontFamily>, "start" | "end"> = {}

  if (resolved.fontFamily !== normalizedBase.fontFamily) next.fontFamily = resolved.fontFamily
  if (resolved.fontWeight !== normalizedBase.fontWeight) next.fontWeight = resolved.fontWeight
  if (resolved.italic !== normalizedBase.italic) next.italic = resolved.italic
  if (resolved.styleKey !== normalizedBase.styleKey) next.styleKey = resolved.styleKey
  if (resolved.color !== normalizedBase.color) next.color = resolved.color

  return next
}

function formatPatchHasValues<
  StyleKey extends string,
  FontFamily extends string,
>(
  patch: FormatPatch<StyleKey, FontFamily>,
): boolean {
  return patch.fontFamily !== undefined
    || patch.fontWeight !== undefined
    || patch.italic !== undefined
    || patch.styleKey !== undefined
    || patch.color !== undefined
}

function formatPatchEquals<
  StyleKey extends string,
  FontFamily extends string,
>(
  left: Omit<TextFormatRun<StyleKey, FontFamily>, "start" | "end">,
  right: Omit<TextFormatRun<StyleKey, FontFamily>, "start" | "end">,
): boolean {
  return left.fontFamily === right.fontFamily
    && left.fontWeight === right.fontWeight
    && left.italic === right.italic
    && left.styleKey === right.styleKey
    && left.color === right.color
}

function resolveEffectiveFormatFromRun<
  StyleKey extends string,
  FontFamily extends string,
>(
  base: BaseTextFormat<StyleKey, FontFamily>,
  run: TextFormatRun<StyleKey, FontFamily>,
): BaseTextFormat<StyleKey, FontFamily> {
  const normalizedBase = normalizeBaseTextFormat(base)
  return {
    fontFamily: sanitizeFontFamily(run.fontFamily, normalizedBase.fontFamily),
    fontWeight: sanitizeFontWeight(run.fontWeight, normalizedBase.fontWeight),
    italic: run.italic === undefined ? normalizedBase.italic : run.italic === true,
    styleKey: sanitizeStyleKey(run.styleKey, normalizedBase.styleKey),
    color: sanitizeColor(run.color, normalizedBase.color),
  }
}

function getResolvedFormatIntervals<
  StyleKey extends string,
  FontFamily extends string,
>(
  text: string,
  base: BaseTextFormat<StyleKey, FontFamily>,
  runs: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined,
): Array<ResolvedTextFormat<StyleKey, FontFamily>> {
  const normalizedBase = normalizeBaseTextFormat(base)
  const textLength = text.length
  const boundaries = new Set<number>([0, textLength])
  const normalizedRuns = (runs ?? [])
    .map((run) => ({
      ...run,
      start: clampIndex(text, run.start),
      end: clampIndex(text, run.end),
    }))
    .filter((run) => run.end > run.start && formatPatchHasValues(run))

  for (const run of normalizedRuns) {
    boundaries.add(run.start)
    boundaries.add(run.end)
  }

  const sortedBoundaries = [...boundaries].sort((left, right) => left - right)
  const intervals: Array<ResolvedTextFormat<StyleKey, FontFamily>> = []

  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const start = sortedBoundaries[index] ?? 0
    const end = sortedBoundaries[index + 1] ?? start
    if (end <= start) continue

    let resolved: BaseTextFormat<StyleKey, FontFamily> = normalizedBase
    for (const run of normalizedRuns) {
      if (start >= run.start && end <= run.end) {
        resolved = resolveEffectiveFormatFromRun(resolved, run)
      }
    }
    intervals.push({
      start,
      end,
      ...resolved,
    })
  }

  return intervals
}

function getExplicitFormatIntervals<
  StyleKey extends string,
  FontFamily extends string,
>(
  text: string,
  base: BaseTextFormat<StyleKey, FontFamily>,
  runs: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined,
): Array<ResolvedTextFormat<StyleKey, FontFamily>> {
  const normalizedRuns = (runs ?? [])
    .map((run) => ({
      ...run,
      start: clampIndex(text, run.start),
      end: clampIndex(text, run.end),
    }))
    .filter((run) => run.end > run.start && formatPatchHasValues(run))

  if (normalizedRuns.length === 0) return []

  return getResolvedFormatIntervals(text, base, normalizedRuns).filter((interval) => (
    normalizedRuns.some((run) => interval.start >= run.start && interval.end <= run.end)
  ))
}

export function normalizeTextFormatRuns<
  StyleKey extends string,
  FontFamily extends string,
>(
  text: string,
  runs: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined,
  base: BaseTextFormat<StyleKey, FontFamily>,
): TextFormatRun<StyleKey, FontFamily>[] {
  const normalizedBase = normalizeBaseTextFormat(base)
  const normalized: TextFormatRun<StyleKey, FontFamily>[] = []

  for (const interval of getResolvedFormatIntervals(text, normalizedBase, runs)) {
    const patch = omitBaseValues(interval, normalizedBase)
    if (!formatPatchHasValues(patch)) continue

    const previous = normalized[normalized.length - 1]
    if (
      previous
      && previous.end === interval.start
      && formatPatchEquals(
        omitBaseValues(resolveEffectiveFormatFromRun(normalizedBase, previous), normalizedBase),
        patch,
      )
    ) {
      previous.end = interval.end
      continue
    }

    normalized.push({
      start: interval.start,
      end: interval.end,
      ...patch,
    })
  }

  return normalized
}

export function resolveTextFormatAtIndex<
  StyleKey extends string,
  FontFamily extends string,
>(
  text: string,
  index: number,
  base: BaseTextFormat<StyleKey, FontFamily>,
  runs: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined,
): BaseTextFormat<StyleKey, FontFamily> {
  const clampedIndex = clampIndex(text, index)
  for (const interval of getResolvedFormatIntervals(text, base, runs)) {
    if (clampedIndex >= interval.start && clampedIndex < interval.end) {
      return {
        fontFamily: interval.fontFamily,
        fontWeight: interval.fontWeight,
        italic: interval.italic,
        styleKey: interval.styleKey,
        color: interval.color,
      }
    }
  }
  return normalizeBaseTextFormat(base)
}

export function getUniformTextFormatValueForRange<
  StyleKey extends string,
  FontFamily extends string,
  Prop extends keyof BaseTextFormat<StyleKey, FontFamily>,
>(
  text: string,
  range: TextRange,
  base: BaseTextFormat<StyleKey, FontFamily>,
  runs: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined,
  prop: Prop,
): BaseTextFormat<StyleKey, FontFamily>[Prop] | null {
  const normalizedRange = normalizeRange(text, range)
  const normalizedBase = normalizeBaseTextFormat(base)
  if (normalizedRange.start === normalizedRange.end) return normalizedBase[prop]

  let uniform: BaseTextFormat<StyleKey, FontFamily>[Prop] | null = null
  for (const interval of getResolvedFormatIntervals(text, normalizedBase, runs)) {
    const overlapStart = Math.max(interval.start, normalizedRange.start)
    const overlapEnd = Math.min(interval.end, normalizedRange.end)
    if (overlapEnd <= overlapStart) continue
    if (uniform === null) {
      uniform = interval[prop]
      continue
    }
    if (uniform !== interval[prop]) return null
  }

  return uniform ?? normalizedBase[prop]
}

export function applyTextFormatToRange<
  StyleKey extends string,
  FontFamily extends string,
>(
  text: string,
  range: TextRange,
  patch: FormatPatch<StyleKey, FontFamily>,
  base: BaseTextFormat<StyleKey, FontFamily>,
  runs: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined,
): TextFormatRun<StyleKey, FontFamily>[] {
  const normalizedRange = normalizeRange(text, range)
  const normalizedBase = normalizeBaseTextFormat(base)
  if (normalizedRange.start === normalizedRange.end || !formatPatchHasValues(patch)) {
    return normalizeTextFormatRuns(text, runs, normalizedBase)
  }

  const nextIntervals: Array<ResolvedTextFormat<StyleKey, FontFamily>> = []
  for (const interval of getResolvedFormatIntervals(text, normalizedBase, runs)) {
    if (interval.end <= normalizedRange.start || interval.start >= normalizedRange.end) {
      nextIntervals.push(interval)
      continue
    }
    if (interval.start < normalizedRange.start) {
      nextIntervals.push({
        ...interval,
        end: normalizedRange.start,
      })
    }
    nextIntervals.push({
      ...interval,
      start: Math.max(interval.start, normalizedRange.start),
      end: Math.min(interval.end, normalizedRange.end),
      fontFamily: patch.fontFamily ?? interval.fontFamily,
      fontWeight: patch.fontWeight ?? interval.fontWeight,
      italic: patch.italic ?? interval.italic,
      styleKey: patch.styleKey ?? interval.styleKey,
      color: patch.color ?? interval.color,
    })
    if (interval.end > normalizedRange.end) {
      nextIntervals.push({
        ...interval,
        start: normalizedRange.end,
      })
    }
  }

  return normalizeTextFormatRuns(text, nextIntervals, normalizedBase)
}

export function rebaseTextFormatRuns<
  StyleKey extends string,
  FontFamily extends string,
>(
  text: string,
  runs: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined,
  previousBase: BaseTextFormat<StyleKey, FontFamily>,
  nextBase: BaseTextFormat<StyleKey, FontFamily>,
): TextFormatRun<StyleKey, FontFamily>[] {
  const effectiveRuns = getExplicitFormatIntervals(text, previousBase, runs)
  return normalizeTextFormatRuns(text, effectiveRuns, nextBase)
}

export function rebaseTextFormatRunsForTextEdit<
  StyleKey extends string,
  FontFamily extends string,
>(
  previousText: string,
  nextText: string,
  runs: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined,
  base: BaseTextFormat<StyleKey, FontFamily>,
): TextFormatRun<StyleKey, FontFamily>[] {
  const normalizedBase = normalizeBaseTextFormat(base)
  if (previousText === nextText) {
    return normalizeTextFormatRuns(nextText, runs, normalizedBase)
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
  const insertionFormat = resolveTextFormatAtIndex(previousText, prefix, normalizedBase, runs)

  const nextIntervals: Array<ResolvedTextFormat<StyleKey, FontFamily>> = []
  for (const interval of getResolvedFormatIntervals(previousText, normalizedBase, runs)) {
    if (interval.end <= prefix) {
      nextIntervals.push(interval)
      continue
    }
    if (interval.start >= previousSuffix) {
      nextIntervals.push({
        ...interval,
        start: interval.start + delta,
        end: interval.end + delta,
      })
      continue
    }
    if (interval.start < prefix) {
      nextIntervals.push({
        ...interval,
        end: prefix,
      })
    }
    if (interval.end > previousSuffix) {
      nextIntervals.push({
        ...interval,
        start: prefix + insertedCount,
        end: interval.end + delta,
      })
    }
  }

  if (insertedCount > 0) {
    nextIntervals.push({
      start: prefix,
      end: prefix + insertedCount,
      ...insertionFormat,
    })
  }

  return normalizeTextFormatRuns(nextText, nextIntervals, normalizedBase)
}

function resolveFontTrackingGraphemes<
  StyleKey extends string,
  FontFamily extends string,
>({
  sourceText,
  renderedText,
  range,
  baseFormat,
  formatRuns,
  baseTrackingScale,
  trackingRuns,
  resolveFontSize,
}: {
  sourceText: string
  renderedText: string
  range: TextRange
  baseFormat: BaseTextFormat<StyleKey, FontFamily>
  formatRuns: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined
  baseTrackingScale: number
  trackingRuns: readonly TextTrackingRun[] | null | undefined
  resolveFontSize: (styleKey: StyleKey) => number
}): Array<ResolvedFormatTrackingGrapheme<StyleKey, FontFamily>> {
  const normalizedRange = normalizeRange(sourceText, range)
  const normalizedSource = toNormalizedSourceGraphemes(sourceText, normalizedRange)
  const renderedGraphemes = splitTextForTracking(renderedText)
  const mappedCount = Math.min(normalizedSource.length, renderedGraphemes.length)
  const graphemes: Array<ResolvedFormatTrackingGrapheme<StyleKey, FontFamily>> = []

  for (let index = 0; index < mappedCount; index += 1) {
    const sourceGrapheme = normalizedSource[index]
    const resolvedFormat = resolveTextFormatAtIndex(
      sourceText,
      sourceGrapheme.sourceStart,
      baseFormat,
      formatRuns,
    )
    graphemes.push({
      ...resolvedFormat,
      text: renderedGraphemes[index] ?? "",
      start: sourceGrapheme.sourceStart,
      end: sourceGrapheme.sourceEnd,
      trackingScale: getTrackingScaleForIndex(
        sourceText,
        sourceGrapheme.sourceStart,
        baseTrackingScale,
        trackingRuns,
      ),
      fontSize: resolveFontSize(resolvedFormat.styleKey),
    })
  }

  if (renderedGraphemes.length > mappedCount) {
    const fallbackFormat = graphemes[graphemes.length - 1]
      ?? {
        ...normalizeBaseTextFormat(baseFormat),
        start: normalizedRange.end,
        end: normalizedRange.end,
        trackingScale: normalizeTrackingScale(baseTrackingScale),
        fontSize: resolveFontSize(normalizeBaseTextFormat(baseFormat).styleKey),
        text: "",
      }
    const fallbackStart = normalizedRange.end
    for (let index = mappedCount; index < renderedGraphemes.length; index += 1) {
      graphemes.push({
        ...fallbackFormat,
        text: renderedGraphemes[index] ?? "",
        start: fallbackStart,
        end: fallbackStart,
      })
    }
  }

  return graphemes
}

function measureGraphemeWidth<
  StyleKey extends string,
  FontFamily extends string,
>(
  context: CanvasMeasureContext,
  grapheme: ResolvedFormatTrackingGrapheme<StyleKey, FontFamily>,
): number {
  context.font = buildCanvasFont(
    grapheme.fontFamily,
    grapheme.fontWeight,
    grapheme.italic,
    grapheme.fontSize,
  )
  return context.measureText(grapheme.text).width
}

function measureGraphemeMetrics<
  StyleKey extends string,
  FontFamily extends string,
>(
  context: CanvasMeasureContext,
  grapheme: ResolvedFormatTrackingGrapheme<StyleKey, FontFamily>,
): {
  width: number
  ascent: number
  descent: number
} {
  context.font = buildCanvasFont(
    grapheme.fontFamily,
    grapheme.fontWeight,
    grapheme.italic,
    grapheme.fontSize,
  )
  const metrics = context.measureText(grapheme.text)
  return {
    width: metrics.width,
    ascent: metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : grapheme.fontSize * 0.8,
    descent: metrics.actualBoundingBoxDescent > 0 ? metrics.actualBoundingBoxDescent : grapheme.fontSize * 0.2,
  }
}

function measureGraphemeAdvance<
  StyleKey extends string,
  FontFamily extends string,
>(
  context: CanvasMeasureContext,
  previous: ResolvedFormatTrackingGrapheme<StyleKey, FontFamily>,
  current: ResolvedFormatTrackingGrapheme<StyleKey, FontFamily>,
  opticalKerning: boolean,
): number {
  const sameFontMetrics = previous.fontFamily === current.fontFamily
    && previous.fontWeight === current.fontWeight
    && previous.italic === current.italic
    && previous.fontSize === current.fontSize

  if (!sameFontMetrics) {
    return measureGraphemeWidth(context, previous)
  }

  context.font = buildCanvasFont(
    previous.fontFamily,
    previous.fontWeight,
    previous.italic,
    previous.fontSize,
  )
  return measureTextPairAdvance(
    context,
    previous.text,
    current.text,
    previous.fontSize,
    opticalKerning,
  )
}

function segmentAttributesMatch<
  StyleKey extends string,
  FontFamily extends string,
>(
  left: TextFormatTrackingSegment<StyleKey, FontFamily>,
  right: ResolvedFormatTrackingGrapheme<StyleKey, FontFamily>,
): boolean {
  return left.trackingScale === right.trackingScale
    && left.fontFamily === right.fontFamily
    && left.fontWeight === right.fontWeight
    && left.italic === right.italic
    && left.styleKey === right.styleKey
    && left.color === right.color
    && left.fontSize === right.fontSize
}

export function measureFormattedTextRangeWidth<
  StyleKey extends string,
  FontFamily extends string,
>(
  context: CanvasMeasureContext,
  {
    sourceText,
    renderedText,
    range,
    baseFormat,
    formatRuns,
    baseTrackingScale = DEFAULT_TRACKING_SCALE,
    trackingRuns,
    resolveFontSize,
    opticalKerning = true,
  }: {
    sourceText: string
    renderedText: string
    range: TextRange
    baseFormat: BaseTextFormat<StyleKey, FontFamily>
    formatRuns: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined
    baseTrackingScale?: number
    trackingRuns?: readonly TextTrackingRun[] | null | undefined
    resolveFontSize: (styleKey: StyleKey) => number
    opticalKerning?: boolean
  },
): number {
  const normalizedTrackingRuns = normalizeTextTrackingRuns(
    sourceText,
    trackingRuns,
    baseTrackingScale,
  )
  const graphemes = resolveFontTrackingGraphemes({
    sourceText,
    renderedText,
    range,
    baseFormat,
    formatRuns,
    baseTrackingScale,
    trackingRuns: normalizedTrackingRuns,
    resolveFontSize,
  })

  if (!graphemes.length) return 0
  if (graphemes.length === 1) {
    return measureGraphemeWidth(context, graphemes[0]!)
  }

  let width = 0
  for (let index = 1; index < graphemes.length; index += 1) {
    const previous = graphemes[index - 1]!
    const current = graphemes[index]!
    width += measureGraphemeAdvance(context, previous, current, opticalKerning)
      + getTrackingLetterSpacing(previous.fontSize, previous.trackingScale)
  }

  return width + measureGraphemeWidth(context, graphemes[graphemes.length - 1]!)
}

export function buildPositionedTextFormatTrackingGraphemes<
  StyleKey extends string,
  FontFamily extends string,
>(
  context: CanvasMeasureContext,
  {
    sourceText,
    command,
    textAlign,
    baseFormat,
    formatRuns,
    baseTrackingScale = DEFAULT_TRACKING_SCALE,
    trackingRuns,
    resolveFontSize,
    opticalKerning = true,
  }: {
    sourceText: string
    command: TextDrawCommand
    textAlign: TextAlignMode
    baseFormat: BaseTextFormat<StyleKey, FontFamily>
    formatRuns: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined
    baseTrackingScale?: number
    trackingRuns?: readonly TextTrackingRun[] | null | undefined
    resolveFontSize: (styleKey: StyleKey) => number
    opticalKerning?: boolean
  },
): PositionedTextFormatTrackingGrapheme<StyleKey, FontFamily>[] {
  const commandRange = resolveTextDrawCommandRange(command, sourceText.length)
  const normalizedTrackingRuns = normalizeTextTrackingRuns(
    sourceText,
    trackingRuns,
    baseTrackingScale,
  )
  const graphemes = resolveFontTrackingGraphemes({
    sourceText,
    renderedText: commandRange.renderedText,
    range: commandRange.visibleRange,
    baseFormat,
    formatRuns,
    baseTrackingScale,
    trackingRuns: normalizedTrackingRuns,
    resolveFontSize,
  })

  if (!graphemes.length) return []

  const lineWidth = measureFormattedTextRangeWidth(context, {
    sourceText,
    renderedText: commandRange.renderedText,
    range: commandRange.visibleRange,
    baseFormat,
    formatRuns,
    baseTrackingScale,
    trackingRuns: normalizedTrackingRuns,
    resolveFontSize,
    opticalKerning,
  })
  const lineStartX = textAlign === "center"
    ? command.x - lineWidth / 2
    : textAlign === "right"
      ? command.x - lineWidth
      : command.x

  let cursorX = lineStartX
  return graphemes.map((grapheme, index) => {
    if (index > 0) {
      const previous = graphemes[index - 1]!
      cursorX += measureGraphemeAdvance(context, previous, grapheme, opticalKerning)
        + getTrackingLetterSpacing(previous.fontSize, previous.trackingScale)
    }
    const metrics = measureGraphemeMetrics(context, grapheme)
    return {
      text: grapheme.text,
      start: grapheme.start,
      end: grapheme.end,
      trackingScale: grapheme.trackingScale,
      fontFamily: grapheme.fontFamily,
      fontWeight: grapheme.fontWeight,
      italic: grapheme.italic,
      styleKey: grapheme.styleKey,
      color: grapheme.color,
      fontSize: grapheme.fontSize,
      x: cursorX,
      y: command.y,
      width: metrics.width,
      ascent: metrics.ascent,
      descent: metrics.descent,
    }
  })
}

export function buildPositionedTextFormatTrackingSegments<
  StyleKey extends string,
  FontFamily extends string,
>(
  context: CanvasMeasureContext,
  {
    sourceText,
    command,
    textAlign,
    baseFormat,
    formatRuns,
    baseTrackingScale = DEFAULT_TRACKING_SCALE,
    trackingRuns,
    resolveFontSize,
    opticalKerning = true,
  }: {
    sourceText: string
    command: TextDrawCommand
    textAlign: TextAlignMode
    baseFormat: BaseTextFormat<StyleKey, FontFamily>
    formatRuns: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined
    baseTrackingScale?: number
    trackingRuns?: readonly TextTrackingRun[] | null | undefined
    resolveFontSize: (styleKey: StyleKey) => number
    opticalKerning?: boolean
  },
): PositionedTextFormatTrackingSegment<StyleKey, FontFamily>[] {
  const graphemes = buildPositionedTextFormatTrackingGraphemes(context, {
    sourceText,
    command,
    textAlign,
    baseFormat,
    formatRuns,
    baseTrackingScale,
    trackingRuns,
    resolveFontSize,
    opticalKerning,
  })
  if (!graphemes.length) return []
  const positioned: PositionedTextFormatTrackingSegment<StyleKey, FontFamily>[] = []
  let active: PositionedTextFormatTrackingSegment<StyleKey, FontFamily> = {
    text: graphemes[0]!.text,
    start: graphemes[0]!.start,
    end: graphemes[0]!.end,
    trackingScale: graphemes[0]!.trackingScale,
    fontFamily: graphemes[0]!.fontFamily,
    fontWeight: graphemes[0]!.fontWeight,
    italic: graphemes[0]!.italic,
    styleKey: graphemes[0]!.styleKey,
    color: graphemes[0]!.color,
    fontSize: graphemes[0]!.fontSize,
    x: graphemes[0]!.x,
    y: graphemes[0]!.y,
  }

  for (let index = 1; index < graphemes.length; index += 1) {
    const current = graphemes[index]!
    if (segmentAttributesMatch(active, current)) {
      active.text += current.text
      active.end = current.end
      continue
    }

    positioned.push(active)
    active = {
      text: current.text,
      start: current.start,
      end: current.end,
      trackingScale: current.trackingScale,
      fontFamily: current.fontFamily,
      fontWeight: current.fontWeight,
      italic: current.italic,
      styleKey: current.styleKey,
      color: current.color,
      fontSize: current.fontSize,
      x: current.x,
      y: current.y,
    }
  }

  positioned.push(active)
  return positioned
}
