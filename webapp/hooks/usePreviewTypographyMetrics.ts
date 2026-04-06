import { useCallback, useEffect, useRef, useState } from "react"

import type { FontFamily } from "@/lib/config/fonts"
import { createTextMetricsService } from "@/lib/text-metrics-service"

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
  const textMetricsRef = useRef(createTextMetricsService<StyleKey, FontFamily>())
  const [fontRenderEpoch, setFontRenderEpoch] = useState(0)

  const clearCaches = useCallback(() => {
    textMetricsRef.current.clearCaches()
  }, [])

  useEffect(() => {
    if (!showTypography) return
    clearCaches()
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

  return {
    fontRenderEpoch,
    getWrappedText: textMetricsRef.current.getWrappedText,
    getOpticalOffset: textMetricsRef.current.getOpticalOffset,
  }
}
