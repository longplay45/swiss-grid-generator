import type { SnapshotState } from "@/hooks/useLayoutSnapshot"
import { clampRotation, hasSignificantRotation } from "./block-constraints.ts"
import {
  normalizeOpticalKerning,
  normalizeTrackingScale,
} from "./text-rendering.ts"
import { normalizeTextTrackingRuns } from "./text-tracking-runs.ts"

type ResolvedSnapshotState<
  Key extends string,
  StyleKey extends string,
  FontFamily,
  TextAlignMode extends string,
  Position,
> = SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position> & {
  blockColumnSpans: Record<Key, number>
  blockRowSpans: Record<Key, number>
  blockTextAlignments: Record<Key, TextAlignMode>
  blockTextReflow: Record<Key, boolean>
  blockSyllableDivision: Record<Key, boolean>
  blockFontWeights: Record<Key, number>
  blockOpticalKerning: Record<Key, boolean>
  blockTrackingScales: Record<Key, number>
  blockTrackingRuns: Partial<Record<Key, ReturnType<typeof normalizeTextTrackingRuns>>>
  blockItalic: Record<Key, boolean>
  blockRotations: Record<Key, number>
}

export function buildResolvedSnapshotState<
  Key extends string,
  StyleKey extends string,
  FontFamily,
  TextAlignMode extends string,
  Position,
>(
  state: SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>,
  {
    gridCols,
    getDefaultColumnSpan,
    getBlockRows,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    getBlockFontWeight,
    isBlockOpticalKerningEnabled,
    getBlockTrackingScale,
    isBlockItalic,
    getBlockRotation,
    defaultTextAlign,
  }: {
    gridCols: number
    getDefaultColumnSpan: (key: Key, gridCols: number) => number
    getBlockRows: (key: Key) => number
    isTextReflowEnabled: (key: Key) => boolean
    isSyllableDivisionEnabled: (key: Key) => boolean
    getBlockFontWeight: (key: Key) => number
    isBlockOpticalKerningEnabled: (key: Key) => boolean
    getBlockTrackingScale: (key: Key) => number
    isBlockItalic: (key: Key) => boolean
    getBlockRotation: (key: Key) => number
    defaultTextAlign: TextAlignMode
  },
): ResolvedSnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position> {
  const resolvedSpans = state.blockOrder.reduce((acc, key) => {
    const raw = state.blockColumnSpans[key] ?? getDefaultColumnSpan(key, gridCols)
    acc[key] = Math.max(1, Math.min(gridCols, raw))
    return acc
  }, {} as Record<Key, number>)
  const resolvedAlignments = state.blockOrder.reduce((acc, key) => {
    acc[key] = state.blockTextAlignments[key] ?? defaultTextAlign
    return acc
  }, {} as Record<Key, TextAlignMode>)
  const resolvedRows = state.blockOrder.reduce((acc, key) => {
    acc[key] = getBlockRows(key)
    return acc
  }, {} as Record<Key, number>)
  const resolvedReflow = state.blockOrder.reduce((acc, key) => {
    acc[key] = isTextReflowEnabled(key)
    return acc
  }, {} as Record<Key, boolean>)
  const resolvedSyllableDivision = state.blockOrder.reduce((acc, key) => {
    acc[key] = isSyllableDivisionEnabled(key)
    return acc
  }, {} as Record<Key, boolean>)
  const resolvedFontWeights = state.blockOrder.reduce((acc, key) => {
    acc[key] = getBlockFontWeight(key)
    return acc
  }, {} as Record<Key, number>)
  const resolvedOpticalKerning = state.blockOrder.reduce((acc, key) => {
    acc[key] = isBlockOpticalKerningEnabled(key)
    return acc
  }, {} as Record<Key, boolean>)
  const resolvedTrackingScales = state.blockOrder.reduce((acc, key) => {
    acc[key] = getBlockTrackingScale(key)
    return acc
  }, {} as Record<Key, number>)
  const resolvedTrackingRuns = state.blockOrder.reduce((acc, key) => {
    const nextRuns = normalizeTextTrackingRuns(
      state.textContent[key] ?? "",
      state.blockTrackingRuns?.[key],
      resolvedTrackingScales[key] ?? 0,
    )
    if (nextRuns.length > 0) acc[key] = nextRuns
    return acc
  }, {} as Partial<Record<Key, ReturnType<typeof normalizeTextTrackingRuns>>>)
  const resolvedItalic = state.blockOrder.reduce((acc, key) => {
    acc[key] = isBlockItalic(key)
    return acc
  }, {} as Record<Key, boolean>)
  const resolvedRotations = state.blockOrder.reduce((acc, key) => {
    acc[key] = getBlockRotation(key)
    return acc
  }, {} as Record<Key, number>)

  return {
    ...state,
    blockOrder: [...state.blockOrder],
    textContent: { ...state.textContent },
    blockTextEdited: { ...state.blockTextEdited },
    styleAssignments: { ...state.styleAssignments },
    blockFontFamilies: { ...state.blockFontFamilies },
    blockFontWeights: resolvedFontWeights,
    blockOpticalKerning: resolvedOpticalKerning,
    blockTrackingScales: resolvedTrackingScales,
    blockTrackingRuns: resolvedTrackingRuns,
    blockColumnSpans: resolvedSpans,
    blockRowSpans: resolvedRows,
    blockTextAlignments: resolvedAlignments,
    blockTextReflow: resolvedReflow,
    blockSyllableDivision: resolvedSyllableDivision,
    blockItalic: resolvedItalic,
    blockRotations: resolvedRotations,
    blockModulePositions: { ...state.blockModulePositions },
  }
}

export function normalizeSnapshotStateForApply<
  Key extends string,
  StyleKey extends string,
  FontFamily,
  TextAlignMode extends string,
  Position,
>(
  state: SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>,
  {
    baseFont,
    isFontFamily,
  }: {
    baseFont: FontFamily
    isFontFamily: (value: unknown) => value is FontFamily
  },
) {
  const nextFonts = state.blockOrder.reduce((acc, key) => {
    const raw = state.blockFontFamilies?.[key]
    if (isFontFamily(raw) && raw !== baseFont) acc[key] = raw
    return acc
  }, {} as Partial<Record<Key, FontFamily>>)
  const nextFontWeights = state.blockOrder.reduce((acc, key) => {
    const raw = state.blockFontWeights?.[key]
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) acc[key] = raw
    return acc
  }, {} as Partial<Record<Key, number>>)
  const nextOpticalKerning = state.blockOrder.reduce((acc, key) => {
    const raw = state.blockOpticalKerning?.[key]
    if (raw === true || raw === false) acc[key] = normalizeOpticalKerning(raw)
    return acc
  }, {} as Partial<Record<Key, boolean>>)
  const nextTrackingScales = state.blockOrder.reduce((acc, key) => {
    const raw = state.blockTrackingScales?.[key]
    if (typeof raw === "number" && Number.isFinite(raw) && raw !== 0) {
      acc[key] = normalizeTrackingScale(raw)
    }
    return acc
  }, {} as Partial<Record<Key, number>>)
  const nextTrackingRuns = state.blockOrder.reduce((acc, key) => {
    const runs = normalizeTextTrackingRuns(
      state.textContent[key] ?? "",
      state.blockTrackingRuns?.[key],
      nextTrackingScales[key] ?? 0,
    )
    if (runs.length > 0) acc[key] = runs
    return acc
  }, {} as Partial<Record<Key, ReturnType<typeof normalizeTextTrackingRuns>>>)
  const nextItalic = state.blockOrder.reduce((acc, key) => {
    const raw = state.blockItalic?.[key]
    if (raw === true || raw === false) acc[key] = raw
    return acc
  }, {} as Partial<Record<Key, boolean>>)
  const nextRotations = state.blockOrder.reduce((acc, key) => {
    const raw = state.blockRotations?.[key]
    if (typeof raw === "number" && Number.isFinite(raw) && hasSignificantRotation(raw)) {
      acc[key] = clampRotation(raw)
    }
    return acc
  }, {} as Partial<Record<Key, number>>)

  return {
    ...state,
    blockOrder: [...state.blockOrder],
    textContent: { ...state.textContent },
    blockTextEdited: { ...state.blockTextEdited },
    styleAssignments: { ...state.styleAssignments },
    blockFontFamilies: nextFonts,
    blockFontWeights: nextFontWeights,
    blockOpticalKerning: nextOpticalKerning,
    blockTrackingScales: nextTrackingScales,
    blockTrackingRuns: nextTrackingRuns,
    blockItalic: nextItalic,
    blockRotations: nextRotations,
    blockColumnSpans: { ...state.blockColumnSpans },
    blockRowSpans: { ...(state.blockRowSpans ?? {}) },
    blockTextAlignments: { ...state.blockTextAlignments },
    blockTextReflow: { ...state.blockTextReflow },
    blockSyllableDivision: { ...state.blockSyllableDivision },
    blockModulePositions: { ...state.blockModulePositions },
  }
}
