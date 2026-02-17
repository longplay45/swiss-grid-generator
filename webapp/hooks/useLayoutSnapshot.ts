import { useCallback } from "react"
import {
  buildResolvedSnapshotState,
  normalizeSnapshotStateForApply,
} from "@/lib/preview-layout-snapshot"

export type SnapshotState<
  Key extends string,
  StyleKey extends string,
  FontFamily,
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
  blockTextAlignments: Partial<Record<Key, TextAlignMode>>
  blockTextReflow: Partial<Record<Key, boolean>>
  blockSyllableDivision: Partial<Record<Key, boolean>>
  blockFontFamilies: Partial<Record<Key, FontFamily>>
  blockBold: Partial<Record<Key, boolean>>
  blockItalic: Partial<Record<Key, boolean>>
  blockRotations: Partial<Record<Key, number>>
}

type Args<
  Key extends string,
  StyleKey extends string,
  FontFamily,
  TextAlignMode extends string,
  Position,
  Snapshot,
> = {
  state: SnapshotState<Key, StyleKey, FontFamily, TextAlignMode, Position>
  gridCols: number
  baseFont: FontFamily
  getDefaultColumnSpan: (key: Key, gridCols: number) => number
  getBlockRows: (key: Key) => number
  isTextReflowEnabled: (key: Key) => boolean
  isSyllableDivisionEnabled: (key: Key) => boolean
  isBlockBold: (key: Key) => boolean
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
  FontFamily,
  TextAlignMode extends string,
  Position,
  Snapshot,
>({
  state,
  gridCols,
  baseFont,
  getDefaultColumnSpan,
  getBlockRows,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isBlockBold,
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
      isTextReflowEnabled,
      isSyllableDivisionEnabled,
      isBlockBold,
      isBlockItalic,
      getBlockRotation,
      defaultTextAlign: "left" as TextAlignMode,
    }))
  }, [
    getBlockRotation,
    getBlockRows,
    getDefaultColumnSpan,
    gridCols,
    isBlockBold,
    isBlockItalic,
    isSyllableDivisionEnabled,
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
