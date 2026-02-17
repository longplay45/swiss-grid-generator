import type { SnapshotState } from "@/hooks/useLayoutSnapshot"

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
  blockBold: Record<Key, boolean>
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
    isBlockBold,
    isBlockItalic,
    getBlockRotation,
    defaultTextAlign,
  }: {
    gridCols: number
    getDefaultColumnSpan: (key: Key, gridCols: number) => number
    getBlockRows: (key: Key) => number
    isTextReflowEnabled: (key: Key) => boolean
    isSyllableDivisionEnabled: (key: Key) => boolean
    isBlockBold: (key: Key) => boolean
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
  const resolvedBold = state.blockOrder.reduce((acc, key) => {
    acc[key] = isBlockBold(key)
    return acc
  }, {} as Record<Key, boolean>)
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
    blockColumnSpans: resolvedSpans,
    blockRowSpans: resolvedRows,
    blockTextAlignments: resolvedAlignments,
    blockTextReflow: resolvedReflow,
    blockSyllableDivision: resolvedSyllableDivision,
    blockBold: resolvedBold,
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
  const nextBold = state.blockOrder.reduce((acc, key) => {
    const raw = state.blockBold?.[key]
    if (raw === true || raw === false) acc[key] = raw
    return acc
  }, {} as Partial<Record<Key, boolean>>)
  const nextItalic = state.blockOrder.reduce((acc, key) => {
    const raw = state.blockItalic?.[key]
    if (raw === true || raw === false) acc[key] = raw
    return acc
  }, {} as Partial<Record<Key, boolean>>)
  const nextRotations = state.blockOrder.reduce((acc, key) => {
    const raw = state.blockRotations?.[key]
    if (typeof raw === "number" && Number.isFinite(raw) && Math.abs(raw) > 0.001) {
      acc[key] = Math.max(-80, Math.min(80, raw))
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
    blockBold: nextBold,
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
