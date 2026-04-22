import { useCallback } from "react"
import type { TextFormatRun } from "@/lib/text-format-runs"
import {
  buildResolvedSnapshotState,
  normalizeSnapshotStateForApply,
} from "@/lib/preview-layout-snapshot"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"
import type { TextVerticalAlignMode } from "@/lib/types/layout-primitives"

export type SnapshotState<
  Key extends string,
  StyleKey extends string,
  FontFamily extends string,
  TextAlignMode extends string,
  Position,
> = {
  blockOrder: Key[]
  textContent: Record<Key, string>
  blockTextEdited: Record<Key, boolean>
  styleAssignments: Record<Key, StyleKey>
  blockModulePositions: Partial<Record<Key, Position>>
  blockColumnSpans: Partial<Record<Key, number>>
  blockRowSpans: Partial<Record<Key, number>>
  blockHeightBaselines: Partial<Record<Key, number>>
  blockTextAlignments: Partial<Record<Key, TextAlignMode>>
  blockVerticalAlignments: Partial<Record<Key, TextVerticalAlignMode>>
  blockTextReflow: Partial<Record<Key, boolean>>
  blockSyllableDivision: Partial<Record<Key, boolean>>
  blockSnapToColumns: Partial<Record<Key, boolean>>
  blockSnapToBaseline: Partial<Record<Key, boolean>>
  blockFontFamilies: Partial<Record<Key, FontFamily>>
  blockFontWeights: Partial<Record<Key, number>>
  blockOpticalKerning: Partial<Record<Key, boolean>>
  blockTrackingScales: Partial<Record<Key, number>>
  blockTrackingRuns: Partial<Record<Key, TextTrackingRun[]>>
  blockTextFormatRuns: Partial<Record<Key, TextFormatRun<StyleKey, FontFamily>[]>>
  blockItalic: Partial<Record<Key, boolean>>
  blockRotations: Partial<Record<Key, number>>
}

type Args<
  Key extends string,
  StyleKey extends string,
  FontFamily extends string,
  TextAlignMode extends string,
  Position,
  Snapshot,
> = {
  state: SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>
  gridCols: number
  baseFont: FontFamily
  getDefaultColumnSpan: (key: Key, gridCols: number) => number
  getBlockRows: (key: Key) => number
  getBlockHeightBaselines: (key: Key) => number
  isTextReflowEnabled: (key: Key) => boolean
  isSyllableDivisionEnabled: (key: Key) => boolean
  isSnapToColumnsEnabled: (key: Key) => boolean
  isSnapToBaselineEnabled: (key: Key) => boolean
  getBlockFontWeight: (key: Key) => number
  isBlockOpticalKerningEnabled: (key: Key) => boolean
  getBlockTrackingScale: (key: Key) => number
  isBlockItalic: (key: Key) => boolean
  getBlockRotation: (key: Key) => number
  isFontFamily: (value: unknown) => value is FontFamily
  toSnapshot: (value: SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>) => Snapshot
  fromSnapshot: (snapshot: Snapshot) => SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>
  setState: (
    updater: (prev: SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>) => SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>
  ) => void
}

export function useLayoutSnapshot<
  Key extends string,
  StyleKey extends string,
  FontFamily extends string,
  TextAlignMode extends string,
  Position,
  Snapshot,
>({
  state,
  gridCols,
  baseFont,
  getDefaultColumnSpan,
  getBlockRows,
  getBlockHeightBaselines,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isSnapToColumnsEnabled,
  isSnapToBaselineEnabled,
  getBlockFontWeight,
  isBlockOpticalKerningEnabled,
  getBlockTrackingScale,
  isBlockItalic,
  getBlockRotation,
  isFontFamily,
  toSnapshot,
  fromSnapshot,
  setState,
}: Args<Key, StyleKey, FontFamily, TextAlignMode, Position, Snapshot>) {
  const buildSnapshot = useCallback((): Snapshot => {
    return toSnapshot(buildResolvedSnapshotState(state, {
      gridCols,
      getDefaultColumnSpan,
      getBlockRows,
      getBlockHeightBaselines,
      isTextReflowEnabled,
      isSyllableDivisionEnabled,
      isSnapToColumnsEnabled,
      isSnapToBaselineEnabled,
      getBlockFontWeight,
      isBlockOpticalKerningEnabled,
      getBlockTrackingScale,
      isBlockItalic,
      getBlockRotation,
      defaultTextAlign: "left" as TextAlignMode,
    }))
  }, [
    getBlockRotation,
    getBlockHeightBaselines,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockRows,
    getDefaultColumnSpan,
    gridCols,
    isBlockOpticalKerningEnabled,
    isBlockItalic,
    isSyllableDivisionEnabled,
    isSnapToBaselineEnabled,
    isSnapToColumnsEnabled,
    isTextReflowEnabled,
    state,
    toSnapshot,
  ])

  const applySnapshot = useCallback((snapshot: Snapshot) => {
    const value = fromSnapshot(snapshot)
    setState(() => normalizeSnapshotStateForApply(value, { baseFont, isFontFamily }))
  }, [baseFont, fromSnapshot, isFontFamily, setState])

  return {
    buildSnapshot,
    applySnapshot,
  }
}
