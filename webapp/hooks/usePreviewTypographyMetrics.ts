import { useCallback, useEffect, useRef, useState } from "react"

import {
  clearOpticalMarginMeasurementCache,
  getOpticalMarginAnchorOffset,
} from "@/lib/optical-margin"
import { wrapText } from "@/lib/text-layout"
import type { FontFamily } from "@/lib/config/fonts"
import type { TextAlignMode } from "@/lib/types/layout-primitives"

type Args<Key extends string, StyleKey extends string> = {
  showTypography: boolean
  blockOrder: Key[]
  typographyStyles: Record<StyleKey, unknown>
  getStyleKeyForBlock: (key: Key) => StyleKey
  getBlockFont: (key: Key) => FontFamily
  isBlockBold: (key: Key) => boolean
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
  isBlockBold,
  isBlockItalic,
  getBlockFontSize,
  scale,
}: Args<Key, StyleKey>) {
  const measureWidthCacheRef = useRef<Map<string, number>>(new Map())
  const wrapTextCacheRef = useRef<Map<string, string[]>>(new Map())
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
      const fontWeight = isBlockBold(key) ? "700" : "400"
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
    getBlockFontSize,
    getStyleKeyForBlock,
    isBlockBold,
    isBlockItalic,
    scale,
    showTypography,
    typographyStyles,
  ])

  const getMeasuredTextWidth = useCallback((ctx: CanvasRenderingContext2D, text: string): number => {
    const key = `${ctx.font}::${text}`
    return makeCachedValue(measureWidthCacheRef.current, key, () => ctx.measureText(text).width)
  }, [makeCachedValue])

  const getWrappedText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
  ): string[] => {
    const key = `${ctx.font}::${maxWidth.toFixed(4)}::${hyphenate ? 1 : 0}::${text}`
    const cached = makeCachedValue(wrapTextCacheRef.current, key, () =>
      wrapText(text, maxWidth, hyphenate, (sample) => getMeasuredTextWidth(ctx, sample)),
    )
    return [...cached]
  }, [getMeasuredTextWidth, makeCachedValue])

  const getOpticalOffset = useCallback((
    ctx: CanvasRenderingContext2D,
    styleKey: StyleKey,
    line: string,
    align: TextAlignMode,
    fontSize: number,
  ): number => {
    const key = `${ctx.font}::${styleKey}::${line}::${align}::${fontSize.toFixed(4)}`
    return makeCachedValue(opticalOffsetCacheRef.current, key, () =>
      getOpticalMarginAnchorOffset({
        line,
        align,
        fontSize,
        styleKey,
        font: ctx.font,
        measureWidth: (sample) => getMeasuredTextWidth(ctx, sample),
      }),
    )
  }, [getMeasuredTextWidth, makeCachedValue])

  return {
    fontRenderEpoch,
    getWrappedText,
    getOpticalOffset,
  }
}
