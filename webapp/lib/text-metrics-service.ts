import {
  clearOpticalMarginMeasurementCache,
  getOpticalMarginAnchorOffset,
} from "@/lib/optical-margin"
import { wrapTextDetailed, type WrappedTextLine } from "@/lib/text-layout"
import {
  measureFormattedTextRangeWidth,
  type BaseTextFormat,
  type TextFormatRun,
} from "@/lib/text-format-runs"
import {
  measureCanvasTextWidth,
  DEFAULT_TRACKING_SCALE,
  normalizeTrackingScale,
  setCanvasFontKerning,
} from "@/lib/text-rendering"
import {
  measureTrackedTextRangeWidth,
  normalizeTextTrackingRuns,
  type TextTrackingRun,
} from "@/lib/text-tracking-runs"
import type { FontFamily } from "@/lib/config/fonts"
import type { TextAlignMode } from "@/lib/types/layout-primitives"

const DEFAULT_TEXT_CACHE_LIMIT = 5000

function makeCacheKeyForTrackingRuns(runs: readonly TextTrackingRun[]): string {
  return runs.map((run) => `${run.start}:${run.end}:${run.trackingScale}`).join("|")
}

function makeCacheKeyForBaseFormat<StyleKey extends string, Family extends string>(
  baseFormat?: BaseTextFormat<StyleKey, Family>,
): string {
  if (!baseFormat) return "-"
  return `${baseFormat.fontFamily}:${baseFormat.fontWeight}:${baseFormat.italic ? 1 : 0}:${baseFormat.styleKey}:${baseFormat.color}`
}

function makeCacheKeyForFormatRuns<StyleKey extends string, Family extends string>(
  runs?: readonly TextFormatRun<StyleKey, Family>[],
): string {
  return (runs ?? [])
    .map((run) => `${run.start}:${run.end}:${run.fontFamily ?? ""}:${run.fontWeight ?? ""}:${run.italic === true ? 1 : run.italic === false ? 0 : ""}:${run.styleKey ?? ""}:${run.color ?? ""}`)
    .join("|")
}

function makeCacheKeyForResolvedFontSizes<StyleKey extends string, Family extends string>(
  baseFormat?: BaseTextFormat<StyleKey, Family>,
  formatRuns?: readonly TextFormatRun<StyleKey, Family>[],
  resolveFontSize?: (styleKey: StyleKey) => number,
): string {
  if (!baseFormat || !resolveFontSize) return "-"
  const styleKeys = new Set<StyleKey>([baseFormat.styleKey])
  for (const run of formatRuns ?? []) {
    if (run.styleKey !== undefined) {
      styleKeys.add(run.styleKey)
    }
  }
  return [...styleKeys]
    .sort()
    .map((styleKey) => `${styleKey}:${resolveFontSize(styleKey).toFixed(4)}`)
    .join("|")
}

export function measureCanvasTextAscent(
  context: CanvasRenderingContext2D | null,
  canvasFont: string,
  fallbackFontSize: number,
): number {
  if (!context) return fallbackFontSize * 0.8
  context.font = canvasFont
  const metrics = context.measureText("Hg")
  return metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : fallbackFontSize * 0.8
}

export function createTextMetricsService<StyleKey extends string, Family extends string = FontFamily>(
  options: {
    cacheLimit?: number
  } = {},
) {
  const cacheLimit = options.cacheLimit ?? DEFAULT_TEXT_CACHE_LIMIT
  const measureWidthCache = new Map<string, number>()
  const wrapTextCache = new Map<string, WrappedTextLine[]>()
  const opticalOffsetCache = new Map<string, number>()

  const makeCachedValue = <T,>(cache: Map<string, T>, key: string, compute: () => T): T => {
    const existing = cache.get(key)
    if (existing !== undefined) return existing
    const value = compute()
    cache.set(key, value)
    if (cache.size > cacheLimit) cache.clear()
    return value
  }

  const clearCaches = () => {
    measureWidthCache.clear()
    wrapTextCache.clear()
    opticalOffsetCache.clear()
    clearOpticalMarginMeasurementCache()
  }

  const getMeasuredTextWidth = (
    context: CanvasRenderingContext2D,
    text: string,
    trackingScale: number,
    opticalKerning: boolean,
    sourceText = text,
    trackingRuns: readonly TextTrackingRun[] = [],
    range?: { start: number; end: number },
    baseFormat?: BaseTextFormat<StyleKey, Family>,
    formatRuns?: readonly TextFormatRun<StyleKey, Family>[],
    resolveFontSize?: (styleKey: StyleKey) => number,
  ): number => {
    const normalizedTrackingScale = normalizeTrackingScale(trackingScale)
    const normalizedRuns = normalizeTextTrackingRuns(sourceText, trackingRuns, normalizedTrackingScale)
    const rangeKey = range ? `${range.start}:${range.end}` : "-"
    const runsKey = makeCacheKeyForTrackingRuns(normalizedRuns)
    const formatBaseKey = makeCacheKeyForBaseFormat(baseFormat)
    const formatRunsKey = makeCacheKeyForFormatRuns(formatRuns)
    const resolvedFontSizesKey = makeCacheKeyForResolvedFontSizes(baseFormat, formatRuns, resolveFontSize)
    const key = `${context.font}::${opticalKerning ? 1 : 0}::${normalizedTrackingScale}::${rangeKey}::${runsKey}::${formatBaseKey}::${formatRunsKey}::${resolvedFontSizesKey}::${text}`

    return makeCachedValue(measureWidthCache, key, () => {
      setCanvasFontKerning(context, opticalKerning)
      if (range && baseFormat && resolveFontSize && (normalizedRuns.length > 0 || (formatRuns?.length ?? 0) > 0)) {
        return measureFormattedTextRangeWidth(context, {
          sourceText,
          renderedText: text,
          range,
          baseFormat,
          formatRuns,
          baseTrackingScale: normalizedTrackingScale,
          trackingRuns: normalizedRuns,
          resolveFontSize,
          opticalKerning,
        })
      }
      if (range && normalizedRuns.length > 0) {
        const sizeMatch = context.font.match(/(\d+(?:\.\d+)?)px/)
        const fontSize = sizeMatch ? Number(sizeMatch[1]) : 0
        return measureTrackedTextRangeWidth(context, {
          sourceText,
          renderedText: text,
          range,
          baseTrackingScale: normalizedTrackingScale,
          runs: normalizedRuns,
          fontSize,
          opticalKerning,
        })
      }
      return measureCanvasTextWidth(context, text, normalizedTrackingScale, undefined, opticalKerning)
    })
  }

  const getWrappedText = (
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
    trackingScale: number,
    opticalKerning: boolean,
    trackingRuns: readonly TextTrackingRun[] = [],
    baseFormat?: BaseTextFormat<StyleKey, Family>,
    formatRuns?: readonly TextFormatRun<StyleKey, Family>[],
    resolveFontSize?: (styleKey: StyleKey) => number,
  ): WrappedTextLine[] => {
    const normalizedTrackingScale = normalizeTrackingScale(trackingScale)
    const normalizedRuns = normalizeTextTrackingRuns(text, trackingRuns, normalizedTrackingScale)
    const runsKey = makeCacheKeyForTrackingRuns(normalizedRuns)
    const formatRunsKey = makeCacheKeyForFormatRuns(formatRuns)
    const formatBaseKey = makeCacheKeyForBaseFormat(baseFormat)
    const resolvedFontSizesKey = makeCacheKeyForResolvedFontSizes(baseFormat, formatRuns, resolveFontSize)
    const key = `${context.font}::${opticalKerning ? 1 : 0}::${normalizedTrackingScale}::${runsKey}::${formatBaseKey}::${formatRunsKey}::${resolvedFontSizesKey}::${maxWidth.toFixed(4)}::${hyphenate ? 1 : 0}::${text}`
    const wrapped = makeCachedValue(wrapTextCache, key, () =>
      wrapTextDetailed(text, maxWidth, hyphenate, (sample, range) => getMeasuredTextWidth(
        context,
        sample,
        normalizedTrackingScale,
        opticalKerning,
        text,
        normalizedRuns,
        range,
        baseFormat,
        formatRuns,
        resolveFontSize,
      )),
    )

    return wrapped.map((line) => ({ ...line }))
  }

  const getOpticalOffset = (
    context: CanvasRenderingContext2D,
    styleKey: StyleKey,
    line: string,
    align: TextAlignMode,
    fontSize: number,
    opticalKerning: boolean,
  ): number => {
    const key = `${context.font}::${opticalKerning ? 1 : 0}::${styleKey}::${line}::${align}::${fontSize.toFixed(4)}`
    return makeCachedValue(opticalOffsetCache, key, () =>
      getOpticalMarginAnchorOffset({
        line,
        align,
        fontSize,
        styleKey,
        font: context.font,
        measureWidth: (sample) => getMeasuredTextWidth(
          context,
          sample,
          DEFAULT_TRACKING_SCALE,
          opticalKerning,
        ),
      }),
    )
  }

  return {
    clearCaches,
    getMeasuredTextWidth,
    getWrappedText,
    getOpticalOffset,
  }
}
