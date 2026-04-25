import type { FontFamily } from "./config/fonts.ts"
import type { PreviewTextLayerCollectionsState } from "./preview-text-layer-state.ts"
import { omitOptionalRecordKey } from "./record-helpers.ts"
import type { TextFormatRun } from "./text-format-runs.ts"
import type { TextTrackingRun } from "./text-tracking-runs.ts"
import type { TextAlignMode, TextVerticalAlignMode } from "./types/layout-primitives.ts"

export type TextStyleTransferMode = "full" | "paragraph" | "typo" | "both"

export type ParagraphStyleTransferSnapshot = {
  columns: number
  rows: number
  heightBaselines: number
  align: TextAlignMode
  verticalAlign: TextVerticalAlignMode
  reflow: boolean
  syllableDivision: boolean
  snapToColumns: boolean
  snapToBaseline: boolean
  rotation?: number
}

export type TypoStyleTransferSnapshot<StyleKey extends string> = {
  styleKey: StyleKey
  fontFamily?: FontFamily
  fontWeight?: number
  opticalKerning?: boolean
  trackingScale?: number
  italic?: boolean
  customSize?: number
  customLeading?: number
  textColor?: string
  trackingRuns?: TextTrackingRun[]
  textFormatRuns?: TextFormatRun<StyleKey, FontFamily>[]
}

export type TextStyleTransferSnapshot<Key extends string, StyleKey extends string> = {
  sourceKey: Key
  mode: TextStyleTransferMode
  textContent?: string
  textEdited?: boolean
  paragraph?: ParagraphStyleTransferSnapshot
  typo?: TypoStyleTransferSnapshot<StyleKey>
}

function assignOptionalValue<Key extends string, Value>(
  record: Partial<Record<Key, Value>>,
  key: Key,
  value: Value | undefined,
): Partial<Record<Key, Value>> {
  if (value === undefined) {
    return omitOptionalRecordKey(record, key)
  }
  return {
    ...record,
    [key]: value,
  }
}

export function applyOptionalTransferredValue<Key extends string, Value>(
  record: Partial<Record<Key, Value>>,
  key: Key,
  value: Value | undefined,
): Partial<Record<Key, Value>> {
  return assignOptionalValue(record, key, value)
}

export function applyTextStyleTransferToCollections<Key extends string, StyleKey extends string>(
  current: PreviewTextLayerCollectionsState<Key, StyleKey>,
  targetKey: Key,
  transfer: TextStyleTransferSnapshot<Key, StyleKey>,
): PreviewTextLayerCollectionsState<Key, StyleKey> {
  let nextState = current

  if (transfer.textContent !== undefined) {
    nextState = {
      ...nextState,
      textContent: {
        ...nextState.textContent,
        [targetKey]: transfer.textContent,
      },
      blockTextEdited: {
        ...nextState.blockTextEdited,
        [targetKey]: transfer.textEdited ?? nextState.blockTextEdited[targetKey] ?? true,
      },
    }
  }

  if (transfer.paragraph) {
    nextState = {
      ...nextState,
      blockColumnSpans: {
        ...nextState.blockColumnSpans,
        [targetKey]: transfer.paragraph.columns,
      },
      blockRowSpans: {
        ...nextState.blockRowSpans,
        [targetKey]: transfer.paragraph.rows,
      },
      blockHeightBaselines: {
        ...nextState.blockHeightBaselines,
        [targetKey]: transfer.paragraph.heightBaselines,
      },
      blockTextAlignments: {
        ...nextState.blockTextAlignments,
        [targetKey]: transfer.paragraph.align,
      },
      blockVerticalAlignments: {
        ...nextState.blockVerticalAlignments,
        [targetKey]: transfer.paragraph.verticalAlign,
      },
      blockTextReflow: {
        ...nextState.blockTextReflow,
        [targetKey]: transfer.paragraph.reflow,
      },
      blockSyllableDivision: {
        ...nextState.blockSyllableDivision,
        [targetKey]: transfer.paragraph.syllableDivision,
      },
      blockSnapToColumns: {
        ...nextState.blockSnapToColumns,
        [targetKey]: transfer.paragraph.snapToColumns,
      },
      blockSnapToBaseline: {
        ...nextState.blockSnapToBaseline,
        [targetKey]: transfer.paragraph.snapToBaseline,
      },
      blockRotations: assignOptionalValue(
        nextState.blockRotations,
        targetKey,
        transfer.paragraph.rotation,
      ),
    }
  }

  if (transfer.typo) {
    nextState = {
      ...nextState,
      styleAssignments: {
        ...nextState.styleAssignments,
        [targetKey]: transfer.typo.styleKey,
      },
      blockFontFamilies: assignOptionalValue(
        nextState.blockFontFamilies,
        targetKey,
        transfer.typo.fontFamily,
      ),
      blockFontWeights: assignOptionalValue(
        nextState.blockFontWeights,
        targetKey,
        transfer.typo.fontWeight,
      ),
      blockOpticalKerning: assignOptionalValue(
        nextState.blockOpticalKerning,
        targetKey,
        transfer.typo.opticalKerning,
      ),
      blockTrackingScales: assignOptionalValue(
        nextState.blockTrackingScales,
        targetKey,
        transfer.typo.trackingScale,
      ),
      blockTrackingRuns: transfer.typo.trackingRuns
        ? {
            ...nextState.blockTrackingRuns,
            [targetKey]: transfer.typo.trackingRuns.map((run) => ({ ...run })),
          }
        : omitOptionalRecordKey(nextState.blockTrackingRuns, targetKey),
      blockTextFormatRuns: transfer.typo.textFormatRuns
        ? {
            ...nextState.blockTextFormatRuns,
            [targetKey]: transfer.typo.textFormatRuns.map((run) => ({ ...run })),
          }
        : omitOptionalRecordKey(nextState.blockTextFormatRuns, targetKey),
      blockItalic: assignOptionalValue(
        nextState.blockItalic,
        targetKey,
        transfer.typo.italic,
      ),
    }
  }

  return nextState
}
