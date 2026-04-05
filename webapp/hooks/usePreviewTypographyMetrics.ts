import { useCallback, useEffect, useRef, useState } from "react"

import {
  clearOpticalMarginMeasurementCache,
  getOpticalMarginAnchorOffset,
} from "@/lib/optical-margin"
import { wrapTextDetailed, type WrappedTextLine } from "@/lib/text-layout"
import {
  measureCanvasTextWidth,
  DEFAULT_TRACKING_SCALE,
  normalizeTrackingScale,
  setCanvasFontKerning,
} from "@/lib/text-rendering"
import type { FontFamily } from "@/lib/config/fonts"
import {
  measureTrackedTextRangeWidth,
  normalizeTextTrackingRuns,
  type TextTrackingRun,
} from "@/lib/text-tracking-runs"
import type { TextAlignMode } from "@/lib/types/layout-primitives"

type Args<Key extends string, StyleKey extends string> = {
  showTypography: boolean
  blockOrder: Key[]
  typographyStyles: Record<StyleKey, unknown>
  getStyleKeyForBlock: (key: Key) => StyleKey
  getBlockFont: (key: Key) => FontFamily
  getBlockFontWeight: (key: Key) => number
  isBlockItalic: (key: Key) => boolean
  getBlockFontSize: (key: Key, styleKey: StyleKey) => number
  scale: number
}

const TEXT_CACHE_LIMIT = 5000

export function usePreviewTypographyMetrics<Key extends string, StyleKey extends string>({
  showTypography,
  blockOrder,
  typographyStyles,
  getStyleKeyForBlock,
  getBlockFont,
  getBlockFontWeight,
  isBlockItalic,
  getBlockFontSize,
  scale,
}: Args<Key, StyleKey>) {
  const measureWidthCacheRef = useRef<Map<string, number>>(new Map())
  const wrapTextCacheRef = useRef<Map<string, WrappedTextLine[]>>(new Map())
  const opticalOffsetCacheRef = useRef<Map<string, number>>(new Map())
  const [fontRenderEpoch, setFontRenderEpoch] = useState(0)

  const makeCachedValue = useCallback(
    <T,>(cache: Map<string, T>, key: string, compute: () => T): T => {
      const existing = cache.get(key)
      if (existing !== undefined) return existing
      const value = compute()
      cache.set(key, value)
      if (cache.size > TEXT_CACHE_LIMIT) cache.clear()
      return value
    },
    [],
  )

  const clearCaches = useCallback(() => {
    measureWidthCacheRef.current.clear()
    wrapTextCacheRef.current.clear()
    opticalOffsetCacheRef.current.clear()
    clearOpticalMarginMeasurementCache()
  }, [])

  useEffect(() => {
    if (!showTypography || typeof document === "undefined" || !("fonts" in document)) return

    let cancelled = false
    const fontFaceSet = document.fonts
    const specs = new Set<string>()
    for (const key of blockOrder) {
      const styleKey = getStyleKeyForBlock(key)
      const style = typographyStyles[styleKey]
      if (!style) continue
      const fontFamily = getBlockFont(key)
      const fontWeight = String(getBlockFontWeight(key))
      const fontStyle = isBlockItalic(key) ? "italic" : "normal"
      const fontSize = getBlockFontSize(key, styleKey) * scale
      specs.add(`${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`)
    }

    if (!specs.size) return

    void Promise
      .allSettled([...specs].map((spec) => fontFaceSet.load(spec)))
      .then(() => {
        if (cancelled) return
        clearCaches()
        setFontRenderEpoch((value) => value + 1)
      })

    return () => {
      cancelled = true
    }
  }, [
    blockOrder,
    clearCaches,
    getBlockFont,
    getBlockFontWeight,
    getBlockFontSize,
    getStyleKeyForBlock,
    isBlockItalic,
    scale,
    showTypography,
    typographyStyles,
  ])

  const getMeasuredTextWidth = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    trackingScale: number,
    opticalKerning: boolean,
    sourceText = text,
    trackingRuns: readonly TextTrackingRun[] = [],
    range?: { start: number; end: number },
  ): number => {
    const normalizedTrackingScale = normalizeTrackingScale(trackingScale)
    const normalizedRuns = normalizeTextTrackingRuns(sourceText, trackingRuns, normalizedTrackingScale)
    const rangeKey = range ? `${range.start}:${range.end}` : "-"
    const runsKey = normalizedRuns.map((run) => `${run.start}:${run.end}:${run.trackingScale}`).join("|")
    const key = `${ctx.font}::${opticalKerning ? 1 : 0}::${normalizedTrackingScale}::${rangeKey}::${runsKey}::${text}`
    return makeCachedValue(measureWidthCacheRef.current, key, () => {
      setCanvasFontKerning(ctx, opticalKerning)
      if (range && normalizedRuns.length > 0) {
        const sizeMatch = ctx.font.match(/(\d+(?:\.\d+)?)px/)
        const fontSize = sizeMatch ? Number(sizeMatch[1]) : 0
        return measureTrackedTextRangeWidth(ctx, {
          sourceText,
          renderedText: text,
          range,
          baseTrackingScale: normalizedTrackingScale,
          runs: normalizedRuns,
          fontSize,
          opticalKerning,
        })
      }
      return measureCanvasTextWidth(ctx, text, normalizedTrackingScale, undefined, opticalKerning)
    })
  }, [makeCachedValue])

  const getWrappedText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
    trackingScale: number,
    opticalKerning: boolean,
    trackingRuns: readonly TextTrackingRun[] = [],
  ): WrappedTextLine[] => {
    const normalizedTrackingScale = normalizeTrackingScale(trackingScale)
    const normalizedRuns = normalizeTextTrackingRuns(text, trackingRuns, normalizedTrackingScale)
    const runsKey = normalizedRuns.map((run) => `${run.start}:${run.end}:${run.trackingScale}`).join("|")
    const key = `${ctx.font}::${opticalKerning ? 1 : 0}::${normalizedTrackingScale}::${runsKey}::${maxWidth.toFixed(4)}::${hyphenate ? 1 : 0}::${text}`
    const cached = makeCachedValue(wrapTextCacheRef.current, key, () =>
      wrapTextDetailed(text, maxWidth, hyphenate, (sample, range) => getMeasuredTextWidth(
        ctx,
        sample,
        normalizedTrackingScale,
        opticalKerning,
        text,
        normalizedRuns,
        range,
      )),
    )
    return cached.map((line) => ({ ...line }))
  }, [getMeasuredTextWidth, makeCachedValue])

  const getOpticalOffset = useCallback((
    ctx: CanvasRenderingContext2D,
    styleKey: StyleKey,
    line: string,
    align: TextAlignMode,
    fontSize: number,
    opticalKerning: boolean,
  ): number => {
    const key = `${ctx.font}::${opticalKerning ? 1 : 0}::${styleKey}::${line}::${align}::${fontSize.toFixed(4)}`
    return makeCachedValue(opticalOffsetCacheRef.current, key, () =>
      getOpticalMarginAnchorOffset({
        line,
        align,
        fontSize,
        styleKey,
        font: ctx.font,
        measureWidth: (sample) => getMeasuredTextWidth(
          ctx,
          sample,
          DEFAULT_TRACKING_SCALE,
          opticalKerning,
        ),
      }),
    )
  }, [getMeasuredTextWidth, makeCachedValue])

  return {
    fontRenderEpoch,
    getWrappedText,
    getOpticalOffset,
  }
}
