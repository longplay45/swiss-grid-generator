import { useCallback, useState } from "react"

import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import { isImagePlaceholderColor } from "@/lib/config/color-schemes"
import type { PreviewLayoutState } from "@/lib/types/preview-layout"

type TypographyStyleDefinition = {
  baselineMultiplier?: number
}

type Args<Key extends string, StyleKey extends string> = {
  blockOrder: Key[]
  styleAssignments: Record<Key, StyleKey>
  defaultTextColor: string
  gridUnit: number
  getStyleSize: (styleKey: StyleKey) => number
  getStyleLeading: (styleKey: StyleKey) => number
  typographyStyles: Record<StyleKey, TypographyStyleDefinition>
}

export function usePreviewTextBlockOverrides<Key extends string, StyleKey extends string>({
  blockOrder,
  styleAssignments,
  defaultTextColor,
  gridUnit,
  getStyleSize,
  getStyleLeading,
  typographyStyles,
}: Args<Key, StyleKey>) {
  const [blockCustomSizes, setBlockCustomSizes] = useState<Partial<Record<Key, number>>>({})
  const [blockCustomLeadings, setBlockCustomLeadings] = useState<Partial<Record<Key, number>>>({})
  const [blockTextColors, setBlockTextColors] = useState<Partial<Record<Key, string>>>({})

  const getBlockFontSize = useCallback((key: Key, styleKey: StyleKey): number => {
    const defaultSize = getStyleSize(styleKey)
    if (styleKey !== "fx") return defaultSize
    const raw = blockCustomSizes[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultSize
    return clampFxSize(raw)
  }, [blockCustomSizes, getStyleSize])

  const getBlockBaselineMultiplier = useCallback((key: Key, styleKey: StyleKey): number => {
    const defaultLeading = getStyleLeading(styleKey)
    const defaultMultiplier = typographyStyles[styleKey]?.baselineMultiplier
      ?? Math.max(0.01, defaultLeading / gridUnit)
    if (styleKey !== "fx") return defaultMultiplier
    const raw = blockCustomLeadings[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultMultiplier
    return Math.max(0.01, Math.min(800, raw) / gridUnit)
  }, [blockCustomLeadings, getStyleLeading, gridUnit, typographyStyles])

  const getBlockTextColor = useCallback((key: Key): string => {
    const raw = blockTextColors[key]
    if (isImagePlaceholderColor(raw)) return raw
    return defaultTextColor
  }, [blockTextColors, defaultTextColor])

  const buildTextOverridesSnapshot = useCallback(() => ({
    blockCustomSizes: blockOrder.reduce((acc, key) => {
      const styleKey = styleAssignments[key] ?? ("body" as StyleKey)
      if (styleKey !== "fx") return acc
      const raw = blockCustomSizes[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
      acc[key] = clampFxSize(raw)
      return acc
    }, {} as Partial<Record<Key, number>>),
    blockCustomLeadings: blockOrder.reduce((acc, key) => {
      const styleKey = styleAssignments[key] ?? ("body" as StyleKey)
      if (styleKey !== "fx") return acc
      const raw = blockCustomLeadings[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
      acc[key] = clampFxLeading(raw)
      return acc
    }, {} as Partial<Record<Key, number>>),
    blockTextColors: blockOrder.reduce((acc, key) => {
      const raw = blockTextColors[key]
      if (!isImagePlaceholderColor(raw)) return acc
      acc[key] = raw
      return acc
    }, {} as Partial<Record<Key, string>>),
  }), [
    blockCustomLeadings,
    blockCustomSizes,
    blockOrder,
    blockTextColors,
    styleAssignments,
  ])

  const applyTextOverridesSnapshot = useCallback((snapshot: PreviewLayoutState<StyleKey, string, Key>) => {
    const normalizedOrder = (Array.isArray(snapshot.blockOrder) ? snapshot.blockOrder : [])
      .filter((key): key is Key => typeof key === "string" && key.length > 0)
    const nextSizes = normalizedOrder.reduce((acc, key) => {
      const styleKey = snapshot.styleAssignments?.[key] ?? ("body" as StyleKey)
      if (styleKey !== "fx") return acc
      const raw = snapshot.blockCustomSizes?.[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
      acc[key] = clampFxSize(raw)
      return acc
    }, {} as Partial<Record<Key, number>>)
    const nextLeadings = normalizedOrder.reduce((acc, key) => {
      const styleKey = snapshot.styleAssignments?.[key] ?? ("body" as StyleKey)
      if (styleKey !== "fx") return acc
      const raw = snapshot.blockCustomLeadings?.[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
      acc[key] = clampFxLeading(raw)
      return acc
    }, {} as Partial<Record<Key, number>>)
    const nextTextColors = normalizedOrder.reduce((acc, key) => {
      const raw = snapshot.blockTextColors?.[key]
      if (!isImagePlaceholderColor(raw)) return acc
      acc[key] = raw
      return acc
    }, {} as Partial<Record<Key, string>>)
    setBlockCustomSizes(nextSizes)
    setBlockCustomLeadings(nextLeadings)
    setBlockTextColors(nextTextColors)
  }, [])

  return {
    blockCustomSizes,
    setBlockCustomSizes,
    blockCustomLeadings,
    setBlockCustomLeadings,
    blockTextColors,
    setBlockTextColors,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    buildTextOverridesSnapshot,
    applyTextOverridesSnapshot,
  }
}
