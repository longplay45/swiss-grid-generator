import { useEffect } from "react"
import type { MutableRefObject } from "react"

import type { FontFamily } from "@/lib/config/fonts"
import { normalizeHeightMetrics } from "@/lib/block-height"
import { clampRotation, hasSignificantRotation } from "@/lib/block-constraints"
import { toTextBlockPosition } from "@/lib/text-block-position"
import { normalizeTextFormatRuns, type TextFormatRun } from "@/lib/text-format-runs"
import { normalizeOpticalKerning, normalizeTrackingScale } from "@/lib/text-rendering"
import { normalizeTextTrackingRuns, type TextTrackingRun } from "@/lib/text-tracking-runs"
import type { ModulePosition, PreviewLayoutState, TextAlignMode, TextBlockPosition } from "@/lib/types/preview-layout"

type Args<StyleKey extends string, BlockKey extends string> = {
  initialLayout: PreviewLayoutState<StyleKey, FontFamily, BlockKey> | null
  initialLayoutToken: number
  lastAppliedLayoutTokenRef: MutableRefObject<number>
  pushHistory: (snapshot: PreviewLayoutState<StyleKey, FontFamily, BlockKey>) => void
  buildSnapshot: () => PreviewLayoutState<StyleKey, FontFamily, BlockKey>
  baseFont: FontFamily
  defaultTextColor: string
  gridCols: number
  gridRows: number
  typographyStyles: Record<StyleKey, unknown>
  isBaseBlockId: (key: string) => boolean
  defaultTextContent: Record<string, string>
  defaultStyleAssignments: Record<string, StyleKey>
  isFontFamily: (value: unknown) => value is FontFamily
  getDefaultColumnSpan: (key: BlockKey, gridCols: number) => number
  getGridMetrics: () => { rowStartBaselines: number[] }
  setBlockCollections: (updater: () => {
    blockOrder: BlockKey[]
    textContent: Record<BlockKey, string>
    blockTextEdited: Record<BlockKey, boolean>
    styleAssignments: Record<BlockKey, StyleKey>
    blockFontFamilies: Partial<Record<BlockKey, FontFamily>>
    blockFontWeights: Partial<Record<BlockKey, number>>
    blockOpticalKerning: Partial<Record<BlockKey, boolean>>
    blockTrackingScales: Partial<Record<BlockKey, number>>
    blockTrackingRuns: Partial<Record<BlockKey, TextTrackingRun[]>>
    blockTextFormatRuns: Partial<Record<BlockKey, TextFormatRun<StyleKey, FontFamily>[]>>
    blockColumnSpans: Partial<Record<BlockKey, number>>
    blockRowSpans: Partial<Record<BlockKey, number>>
    blockHeightBaselines: Partial<Record<BlockKey, number>>
    blockTextAlignments: Partial<Record<BlockKey, TextAlignMode>>
    blockTextReflow: Partial<Record<BlockKey, boolean>>
    blockSyllableDivision: Partial<Record<BlockKey, boolean>>
    blockItalic: Partial<Record<BlockKey, boolean>>
    blockRotations: Partial<Record<BlockKey, number>>
    blockModulePositions: Partial<Record<BlockKey, TextBlockPosition>>
  }) => void
  onBeforeApply: () => void
  onAfterApply: () => void
}

export function useInitialLayoutHydration<StyleKey extends string, BlockKey extends string>({
  initialLayout,
  initialLayoutToken,
  lastAppliedLayoutTokenRef,
  pushHistory,
  buildSnapshot,
  baseFont,
  defaultTextColor,
  gridCols,
  gridRows,
  typographyStyles,
  isBaseBlockId,
  defaultTextContent,
  defaultStyleAssignments,
  isFontFamily,
  getDefaultColumnSpan,
  getGridMetrics,
  setBlockCollections,
  onBeforeApply,
  onAfterApply,
}: Args<StyleKey, BlockKey>) {
  useEffect(() => {
    if (!initialLayout || initialLayoutToken === 0) return
    if (lastAppliedLayoutTokenRef.current === initialLayoutToken) return
    if (lastAppliedLayoutTokenRef.current !== 0) {
      pushHistory(buildSnapshot())
    }
    lastAppliedLayoutTokenRef.current = initialLayoutToken
    onBeforeApply()

    const normalizedKeys = (Array.isArray(initialLayout.blockOrder) ? initialLayout.blockOrder : [])
      .filter((key): key is BlockKey => typeof key === "string" && key.length > 0)
      .filter((key, idx, arr) => arr.indexOf(key) === idx)
    if (!normalizedKeys.length) {
      setBlockCollections(() => ({
        blockOrder: [],
        textContent: {} as Record<BlockKey, string>,
        blockTextEdited: {} as Record<BlockKey, boolean>,
        styleAssignments: {} as Record<BlockKey, StyleKey>,
        blockFontFamilies: {},
        blockFontWeights: {},
        blockOpticalKerning: {},
        blockTrackingScales: {},
        blockTrackingRuns: {},
        blockTextFormatRuns: {},
        blockColumnSpans: {},
        blockRowSpans: {},
        blockHeightBaselines: {},
        blockTextAlignments: {} as Record<BlockKey, TextAlignMode>,
        blockTextReflow: {},
        blockSyllableDivision: {},
        blockItalic: {},
        blockRotations: {},
        blockModulePositions: {},
      }))
      onAfterApply()
      return
    }
    const validStyles = new Set(Object.keys(typographyStyles))

    const nextTextContent = normalizedKeys.reduce((acc, key) => {
      const value = initialLayout.textContent?.[key]
      acc[key] = typeof value === "string" ? value : (isBaseBlockId(key) ? defaultTextContent[key] ?? "" : "")
      return acc
    }, {} as Record<BlockKey, string>)

    const nextTextEdited = normalizedKeys.reduce((acc, key) => {
      const value = initialLayout.blockTextEdited?.[key]
      acc[key] = typeof value === "boolean" ? value : true
      return acc
    }, {} as Record<BlockKey, boolean>)

    const nextStyleAssignments = normalizedKeys.reduce((acc, key) => {
      const value = initialLayout.styleAssignments?.[key]
      acc[key] = validStyles.has(String(value))
        ? value as StyleKey
        : (isBaseBlockId(key) ? defaultStyleAssignments[key] : ("body" as StyleKey))
      return acc
    }, {} as Record<BlockKey, StyleKey>)

    const nextFontFamilies = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockFontFamilies?.[key]
      if (isFontFamily(raw) && raw !== baseFont) acc[key] = raw
      return acc
    }, {} as Partial<Record<BlockKey, FontFamily>>)

    const nextFontWeights = normalizedKeys.reduce((acc, key) => {
      const numeric = initialLayout.blockFontWeights?.[key]
      if (typeof numeric === "number" && Number.isFinite(numeric) && numeric > 0) {
        acc[key] = numeric
        return acc
      }
      const legacy = initialLayout.blockBold?.[key]
      if (legacy === true) acc[key] = 700
      if (legacy === false) acc[key] = 400
      return acc
    }, {} as Partial<Record<BlockKey, number>>)

    const nextSpans = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockColumnSpans?.[key]
      const fallback = getDefaultColumnSpan(key, gridCols)
      const value = typeof raw === "number" ? raw : fallback
      acc[key] = Math.max(1, Math.min(gridCols, Math.round(value)))
      return acc
    }, {} as Record<BlockKey, number>)

    const nextAlignments = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockTextAlignments?.[key]
      acc[key] = raw === "right" ? "right" : "left"
      return acc
    }, {} as Record<BlockKey, TextAlignMode>)

    const nextRows = normalizedKeys.reduce((acc, key) => {
      const height = normalizeHeightMetrics({
        rows: initialLayout.blockRowSpans?.[key],
        baselines: initialLayout.blockHeightBaselines?.[key],
        gridRows,
      })
      acc[key] = height.rows
      return acc
    }, {} as Record<BlockKey, number>)

    const nextHeightBaselines = normalizedKeys.reduce((acc, key) => {
      const height = normalizeHeightMetrics({
        rows: initialLayout.blockRowSpans?.[key],
        baselines: initialLayout.blockHeightBaselines?.[key],
        gridRows,
      })
      acc[key] = height.baselines
      return acc
    }, {} as Record<BlockKey, number>)

    const nextReflow = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockTextReflow?.[key]
      acc[key] = raw === true
      return acc
    }, {} as Record<BlockKey, boolean>)

    const nextSyllableDivision = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockSyllableDivision?.[key]
      if (raw === true || raw === false) {
        acc[key] = raw
      }
      return acc
    }, {} as Record<BlockKey, boolean>)

    const nextOpticalKerning = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockOpticalKerning?.[key]
      if (raw === true || raw === false) {
        acc[key] = normalizeOpticalKerning(raw)
      }
      return acc
    }, {} as Record<BlockKey, boolean>)

    const nextTrackingScales = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockTrackingScales?.[key]
      if (typeof raw === "number" && Number.isFinite(raw) && raw !== 0) {
        acc[key] = normalizeTrackingScale(raw)
      }
      return acc
    }, {} as Record<BlockKey, number>)
    const nextTrackingRuns = normalizedKeys.reduce((acc, key) => {
      const runs = normalizeTextTrackingRuns(
        nextTextContent[key] ?? "",
        initialLayout.blockTrackingRuns?.[key],
        nextTrackingScales[key] ?? 0,
      )
      if (runs.length > 0) acc[key] = runs
      return acc
    }, {} as Record<BlockKey, TextTrackingRun[]>)

    const nextItalic = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockItalic?.[key]
      if (raw === true || raw === false) acc[key] = raw
      return acc
    }, {} as Record<BlockKey, boolean>)

    const nextTextFormatRuns = normalizedKeys.reduce((acc, key) => {
      const styleKey = nextStyleAssignments[key]
      const fontFamily = nextFontFamilies[key] ?? baseFont
      const fontWeight = nextFontWeights[key]
        ?? (initialLayout.blockBold?.[key] === true ? 700 : initialLayout.blockBold?.[key] === false ? 400 : 400)
      const italic = nextItalic[key] === true
      const color = typeof initialLayout.blockTextColors?.[key] === "string" && initialLayout.blockTextColors[key]
        ? initialLayout.blockTextColors[key] as string
        : defaultTextColor
      const runs = normalizeTextFormatRuns(
        nextTextContent[key] ?? "",
        initialLayout.blockTextFormatRuns?.[key],
        {
          fontFamily,
          fontWeight,
          italic,
          styleKey,
          color,
        },
      )
      if (runs.length > 0) acc[key] = runs
      return acc
    }, {} as Record<BlockKey, TextFormatRun<StyleKey, FontFamily>[]>)

    const nextRotations = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockRotations?.[key]
      if (typeof raw === "number" && Number.isFinite(raw) && hasSignificantRotation(raw)) {
        acc[key] = clampRotation(raw)
      }
      return acc
    }, {} as Record<BlockKey, number>)

    const metrics = getGridMetrics()
    const nextPositions = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockModulePositions?.[key] as TextBlockPosition | ModulePosition | undefined
      if (!raw) return acc
      const logical = toTextBlockPosition(raw, metrics.rowStartBaselines)
      const span = nextSpans[key]
      const minCol = -Math.max(0, span - 1)
      const maxCol = Math.max(0, gridCols - 1)
      acc[key] = {
        column: Math.max(minCol, Math.min(maxCol, Math.round(logical.column))),
        row: Math.max(0, Math.min(Math.max(0, gridRows - 1), Math.round(logical.row))),
        baselineOffset: Math.round(logical.baselineOffset),
      }
      return acc
    }, {} as Partial<Record<BlockKey, TextBlockPosition>>)

    setBlockCollections(() => ({
      blockOrder: normalizedKeys,
      textContent: nextTextContent,
      blockTextEdited: nextTextEdited,
      styleAssignments: nextStyleAssignments,
      blockFontFamilies: nextFontFamilies,
      blockFontWeights: nextFontWeights,
      blockOpticalKerning: nextOpticalKerning,
      blockTrackingScales: nextTrackingScales,
      blockTrackingRuns: nextTrackingRuns,
      blockTextFormatRuns: nextTextFormatRuns,
      blockColumnSpans: nextSpans,
      blockRowSpans: nextRows,
      blockHeightBaselines: nextHeightBaselines,
      blockTextAlignments: nextAlignments,
      blockTextReflow: nextReflow,
      blockSyllableDivision: nextSyllableDivision,
      blockItalic: nextItalic,
      blockRotations: nextRotations,
      blockModulePositions: nextPositions,
    }))

    onAfterApply()
  }, [
    baseFont,
    buildSnapshot,
    defaultStyleAssignments,
    defaultTextContent,
    getDefaultColumnSpan,
    getGridMetrics,
    gridCols,
    gridRows,
    initialLayout,
    initialLayoutToken,
    isBaseBlockId,
    isFontFamily,
    lastAppliedLayoutTokenRef,
    onAfterApply,
    onBeforeApply,
    pushHistory,
    setBlockCollections,
    typographyStyles,
  ])
}
