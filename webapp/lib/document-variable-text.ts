import {
  normalizeTextFormatRuns,
  resolveTextFormatAtIndex,
  type BaseTextFormat,
  type TextFormatRun,
} from "./text-format-runs.ts"
import {
  getTrackingScaleForIndex,
  normalizeTextTrackingRuns,
  type TextTrackingRun,
} from "./text-tracking-runs.ts"
export { DOCUMENT_VARIABLE_DEFINITIONS, type DocumentVariableDefinition } from "./document-variable-definitions.ts"

export type DocumentVariableContext = {
  projectTitle: string
  pageNumber: number
  pageCount: number
  now: Date
}

export type DocumentVariableResolverArgs = {
  name: string
  rawText: string
  rawStart: number
  rawEnd: number
  context: DocumentVariableContext
  resolveDefaultText: (text: string) => string
}

export type DocumentVariableResolver = (
  args: DocumentVariableResolverArgs,
) => string | null | undefined

export type DocumentVariableResolvedSegment = {
  kind: "literal" | "variable"
  rawStart: number
  rawEnd: number
  resolvedStart: number
  resolvedEnd: number
}

type EffectiveFormatInterval<
  StyleKey extends string,
  FontFamily extends string,
> = {
  start: number
  end: number
  format: BaseTextFormat<StyleKey, FontFamily>
}

type EffectiveTrackingInterval = {
  start: number
  end: number
  trackingScale: number
}

export type ResolvedDocumentVariableText<
  StyleKey extends string,
  FontFamily extends string,
> = {
  text: string
  formatRuns: TextFormatRun<StyleKey, FontFamily>[]
  trackingRuns: TextTrackingRun[]
  segments: DocumentVariableResolvedSegment[]
}

const DOCUMENT_VARIABLE_RE = /<%([a-z_]+)%>/gi

function pad2(value: number): string {
  return String(Math.max(0, Math.trunc(value))).padStart(2, "0")
}

function getDatePart(
  date: Date,
  type: "year" | "month" | "day" | "hour" | "minute",
  formatter: Intl.DateTimeFormat,
): string | null {
  const parts = formatter.formatToParts(date)
  const match = parts.find((part) => part.type === type)?.value ?? null
  return match && match.trim().length > 0 ? match : null
}

function formatDocumentVariableDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const year = getDatePart(date, "year", formatter) ?? String(date.getFullYear())
  const month = getDatePart(date, "month", formatter) ?? pad2(date.getMonth() + 1)
  const day = getDatePart(date, "day", formatter) ?? pad2(date.getDate())
  return `${year}-${month}-${day}`
}

function formatDocumentVariableTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const hour = getDatePart(date, "hour", formatter) ?? pad2(date.getHours())
  const minute = getDatePart(date, "minute", formatter) ?? pad2(date.getMinutes())
  return `${hour}:${minute}`
}

function resolveBuiltInDocumentVariableValue(
  name: string,
  context: DocumentVariableContext,
): string | null {
  switch (name.trim().toLowerCase()) {
    case "project_title":
    case "title":
      return context.projectTitle
    case "page":
      return String(context.pageNumber)
    case "pages":
      return String(context.pageCount)
    case "date":
      return formatDocumentVariableDate(context.now)
    case "time":
      return formatDocumentVariableTime(context.now)
    default:
      return null
  }
}

function parseResolvedSegments(
  text: string,
  context: DocumentVariableContext,
  resolveVariable?: DocumentVariableResolver,
): {
  text: string
  segments: DocumentVariableResolvedSegment[]
  hasVariables: boolean
} {
  const segments: DocumentVariableResolvedSegment[] = []
  let resolvedText = ""
  let cursor = 0
  let hasVariables = false

  DOCUMENT_VARIABLE_RE.lastIndex = 0
  for (const match of text.matchAll(DOCUMENT_VARIABLE_RE)) {
    const fullMatch = match[0]
    const tokenName = (match[1] ?? "").trim().toLowerCase()
    const rawStart = match.index ?? 0
    const rawEnd = rawStart + fullMatch.length

    if (rawStart > cursor) {
      const literal = text.slice(cursor, rawStart)
      const resolvedStart = resolvedText.length
      resolvedText += literal
      segments.push({
        kind: "literal",
        rawStart: cursor,
        rawEnd: rawStart,
        resolvedStart,
        resolvedEnd: resolvedText.length,
      })
    }

    const resolvedValue = resolveVariable?.({
      name: tokenName,
      rawText: text,
      rawStart,
      rawEnd,
      context,
      resolveDefaultText: (sample) => parseResolvedSegments(sample, context).text,
    }) ?? resolveBuiltInDocumentVariableValue(tokenName, context)
    if (resolvedValue === null) {
      const resolvedStart = resolvedText.length
      resolvedText += fullMatch
      segments.push({
        kind: "literal",
        rawStart,
        rawEnd,
        resolvedStart,
        resolvedEnd: resolvedText.length,
      })
    } else {
      hasVariables = true
      const resolvedStart = resolvedText.length
      resolvedText += resolvedValue
      segments.push({
        kind: "variable",
        rawStart,
        rawEnd,
        resolvedStart,
        resolvedEnd: resolvedText.length,
      })
    }

    cursor = rawEnd
  }

  if (cursor < text.length) {
    const literal = text.slice(cursor)
    const resolvedStart = resolvedText.length
    resolvedText += literal
    segments.push({
      kind: "literal",
      rawStart: cursor,
      rawEnd: text.length,
      resolvedStart,
      resolvedEnd: resolvedText.length,
    })
  }

  return {
    text: resolvedText,
    segments,
    hasVariables,
  }
}

function buildEffectiveFormatIntervals<
  StyleKey extends string,
  FontFamily extends string,
>(
  text: string,
  baseFormat: BaseTextFormat<StyleKey, FontFamily>,
  formatRuns: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined,
): EffectiveFormatInterval<StyleKey, FontFamily>[] {
  const boundaries = new Set<number>([0, text.length])
  for (const run of formatRuns ?? []) {
    boundaries.add(Math.max(0, Math.min(text.length, run.start)))
    boundaries.add(Math.max(0, Math.min(text.length, run.end)))
  }

  const sorted = [...boundaries].sort((left, right) => left - right)
  const intervals: EffectiveFormatInterval<StyleKey, FontFamily>[] = []
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index] ?? 0
    const end = sorted[index + 1] ?? start
    if (end <= start) continue
    intervals.push({
      start,
      end,
      format: resolveTextFormatAtIndex(text, start, baseFormat, formatRuns),
    })
  }
  return intervals
}

function buildEffectiveTrackingIntervals(
  text: string,
  baseTrackingScale: number,
  trackingRuns: readonly TextTrackingRun[] | null | undefined,
): EffectiveTrackingInterval[] {
  const boundaries = new Set<number>([0, text.length])
  for (const run of trackingRuns ?? []) {
    boundaries.add(Math.max(0, Math.min(text.length, run.start)))
    boundaries.add(Math.max(0, Math.min(text.length, run.end)))
  }

  const sorted = [...boundaries].sort((left, right) => left - right)
  const intervals: EffectiveTrackingInterval[] = []
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index] ?? 0
    const end = sorted[index + 1] ?? start
    if (end <= start) continue
    intervals.push({
      start,
      end,
      trackingScale: getTrackingScaleForIndex(text, start, baseTrackingScale, trackingRuns),
    })
  }
  return intervals
}

function remapLiteralFormatIntervals<
  StyleKey extends string,
  FontFamily extends string,
>(
  segment: DocumentVariableResolvedSegment,
  intervals: readonly EffectiveFormatInterval<StyleKey, FontFamily>[],
): TextFormatRun<StyleKey, FontFamily>[] {
  const remapped: TextFormatRun<StyleKey, FontFamily>[] = []
  for (const interval of intervals) {
    const overlapStart = Math.max(segment.rawStart, interval.start)
    const overlapEnd = Math.min(segment.rawEnd, interval.end)
    if (overlapEnd <= overlapStart) continue
    remapped.push({
      start: segment.resolvedStart + (overlapStart - segment.rawStart),
      end: segment.resolvedStart + (overlapEnd - segment.rawStart),
      ...interval.format,
    })
  }
  return remapped
}

function remapLiteralTrackingIntervals(
  segment: DocumentVariableResolvedSegment,
  intervals: readonly EffectiveTrackingInterval[],
): TextTrackingRun[] {
  const remapped: TextTrackingRun[] = []
  for (const interval of intervals) {
    const overlapStart = Math.max(segment.rawStart, interval.start)
    const overlapEnd = Math.min(segment.rawEnd, interval.end)
    if (overlapEnd <= overlapStart) continue
    remapped.push({
      start: segment.resolvedStart + (overlapStart - segment.rawStart),
      end: segment.resolvedStart + (overlapEnd - segment.rawStart),
      trackingScale: interval.trackingScale,
    })
  }
  return remapped
}

export function resolveDocumentVariableText(
  text: string,
  context: DocumentVariableContext,
  resolveVariable?: DocumentVariableResolver,
): string {
  return parseResolvedSegments(text, context, resolveVariable).text
}

export function resolveDocumentVariableContent<
  StyleKey extends string,
  FontFamily extends string,
>({
  text,
  context,
  baseFormat,
  formatRuns,
  baseTrackingScale,
  trackingRuns,
  resolveVariable,
}: {
  text: string
  context: DocumentVariableContext
  baseFormat: BaseTextFormat<StyleKey, FontFamily>
  formatRuns: readonly TextFormatRun<StyleKey, FontFamily>[] | null | undefined
  baseTrackingScale: number
  trackingRuns: readonly TextTrackingRun[] | null | undefined
  resolveVariable?: DocumentVariableResolver
}): ResolvedDocumentVariableText<StyleKey, FontFamily> {
  const normalizedFormatRuns = normalizeTextFormatRuns(text, formatRuns, baseFormat)
  const normalizedTrackingRuns = normalizeTextTrackingRuns(text, trackingRuns, baseTrackingScale)
  const resolved = parseResolvedSegments(text, context, resolveVariable)

  if (!resolved.hasVariables) {
    return {
      text: resolved.text,
      formatRuns: normalizedFormatRuns,
      trackingRuns: normalizedTrackingRuns,
      segments: resolved.segments,
    }
  }

  const effectiveFormatIntervals = buildEffectiveFormatIntervals(text, baseFormat, normalizedFormatRuns)
  const effectiveTrackingIntervals = buildEffectiveTrackingIntervals(text, baseTrackingScale, normalizedTrackingRuns)
  const remappedFormatRuns: TextFormatRun<StyleKey, FontFamily>[] = []
  const remappedTrackingRuns: TextTrackingRun[] = []

  for (const segment of resolved.segments) {
    if (segment.kind === "literal") {
      remappedFormatRuns.push(...remapLiteralFormatIntervals(segment, effectiveFormatIntervals))
      remappedTrackingRuns.push(...remapLiteralTrackingIntervals(segment, effectiveTrackingIntervals))
      continue
    }

    if (segment.resolvedEnd <= segment.resolvedStart) continue
    remappedFormatRuns.push({
      start: segment.resolvedStart,
      end: segment.resolvedEnd,
      ...resolveTextFormatAtIndex(text, segment.rawStart, baseFormat, normalizedFormatRuns),
    })
    remappedTrackingRuns.push({
      start: segment.resolvedStart,
      end: segment.resolvedEnd,
      trackingScale: getTrackingScaleForIndex(text, segment.rawStart, baseTrackingScale, normalizedTrackingRuns),
    })
  }

  return {
    text: resolved.text,
    formatRuns: normalizeTextFormatRuns(resolved.text, remappedFormatRuns, baseFormat),
    trackingRuns: normalizeTextTrackingRuns(resolved.text, remappedTrackingRuns, baseTrackingScale),
    segments: resolved.segments,
  }
}
