import type { TextFormatRun } from "@/lib/text-format-runs"
import type { PreviewLayoutState } from "@/lib/types/preview-layout"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"

import { omitOptionalRecordKey, omitRequiredRecordKey } from "@/lib/record-helpers"

export type TextLayerCollections<
  Key extends string,
  StyleKey extends string,
  Family extends string,
  Align extends string,
  Position,
> = {
  blockOrder: Key[]
  textContent: Record<Key, string>
  blockTextEdited: Record<Key, boolean>
  styleAssignments: Record<Key, StyleKey>
  blockFontFamilies: Partial<Record<Key, Family>>
  blockFontWeights: Partial<Record<Key, number>>
  blockOpticalKerning: Partial<Record<Key, boolean>>
  blockTrackingScales: Partial<Record<Key, number>>
  blockTrackingRuns: Partial<Record<Key, TextTrackingRun[]>>
  blockTextFormatRuns: Partial<Record<Key, TextFormatRun<StyleKey, Family>[]>>
  blockColumnSpans: Partial<Record<Key, number>>
  blockRowSpans: Partial<Record<Key, number>>
  blockTextAlignments: Partial<Record<Key, Align>>
  blockTextReflow: Partial<Record<Key, boolean>>
  blockSyllableDivision: Partial<Record<Key, boolean>>
  blockItalic: Partial<Record<Key, boolean>>
  blockRotations: Partial<Record<Key, number>>
  blockModulePositions: Partial<Record<Key, Position>>
}

export function removeTextLayerFromCollections<
  Key extends string,
  StyleKey extends string,
  Family extends string,
  Align extends string,
  Position,
>(
  state: TextLayerCollections<Key, StyleKey, Family, Align, Position>,
  key: Key,
): TextLayerCollections<Key, StyleKey, Family, Align, Position> {
  return {
    ...state,
    blockOrder: state.blockOrder.filter((item) => item !== key),
    textContent: omitRequiredRecordKey(state.textContent, key),
    blockTextEdited: omitRequiredRecordKey(state.blockTextEdited, key),
    styleAssignments: omitRequiredRecordKey(state.styleAssignments, key),
    blockFontFamilies: omitOptionalRecordKey(state.blockFontFamilies, key),
    blockFontWeights: omitOptionalRecordKey(state.blockFontWeights, key),
    blockOpticalKerning: omitOptionalRecordKey(state.blockOpticalKerning, key),
    blockTrackingScales: omitOptionalRecordKey(state.blockTrackingScales, key),
    blockTrackingRuns: omitOptionalRecordKey(state.blockTrackingRuns, key),
    blockTextFormatRuns: omitOptionalRecordKey(state.blockTextFormatRuns, key),
    blockColumnSpans: omitOptionalRecordKey(state.blockColumnSpans, key),
    blockRowSpans: omitOptionalRecordKey(state.blockRowSpans, key),
    blockTextAlignments: omitOptionalRecordKey(state.blockTextAlignments, key),
    blockTextReflow: omitOptionalRecordKey(state.blockTextReflow, key),
    blockSyllableDivision: omitOptionalRecordKey(state.blockSyllableDivision, key),
    blockItalic: omitOptionalRecordKey(state.blockItalic, key),
    blockRotations: omitOptionalRecordKey(state.blockRotations, key),
    blockModulePositions: omitOptionalRecordKey(state.blockModulePositions, key),
  }
}

export function removeLayerFromPreviewLayout<
  StyleKey extends string,
  Family extends string,
  Key extends string,
>(
  layout: PreviewLayoutState<StyleKey, Family, Key>,
  key: Key,
  kind: "text" | "image",
): PreviewLayoutState<StyleKey, Family, Key> {
  if (kind === "image") {
    return {
      ...layout,
      layerOrder: (layout.layerOrder ?? []).filter((item) => item !== key),
      imageOrder: (layout.imageOrder ?? []).filter((item) => item !== key),
      imageModulePositions: omitOptionalRecordKey(layout.imageModulePositions, key),
      imageColumnSpans: omitOptionalRecordKey(layout.imageColumnSpans, key),
      imageRowSpans: omitOptionalRecordKey(layout.imageRowSpans, key),
      imageColors: omitOptionalRecordKey(layout.imageColors, key),
    }
  }

  return {
    ...layout,
    blockOrder: layout.blockOrder.filter((item) => item !== key),
    textContent: omitRequiredRecordKey(layout.textContent, key),
    blockTextEdited: omitRequiredRecordKey(layout.blockTextEdited, key),
    styleAssignments: omitRequiredRecordKey(layout.styleAssignments, key),
    blockFontFamilies: omitOptionalRecordKey(layout.blockFontFamilies, key),
    blockFontWeights: layout.blockFontWeights
      ? omitOptionalRecordKey(layout.blockFontWeights, key)
      : undefined,
    blockOpticalKerning: layout.blockOpticalKerning
      ? omitOptionalRecordKey(layout.blockOpticalKerning, key)
      : undefined,
    blockTrackingScales: layout.blockTrackingScales
      ? omitOptionalRecordKey(layout.blockTrackingScales, key)
      : undefined,
    blockTrackingRuns: layout.blockTrackingRuns
      ? omitOptionalRecordKey(layout.blockTrackingRuns, key)
      : undefined,
    blockTextFormatRuns: layout.blockTextFormatRuns
      ? omitOptionalRecordKey(layout.blockTextFormatRuns, key)
      : undefined,
    blockColumnSpans: omitRequiredRecordKey(layout.blockColumnSpans, key),
    blockRowSpans: layout.blockRowSpans
      ? omitRequiredRecordKey(layout.blockRowSpans, key)
      : undefined,
    blockTextAlignments: omitRequiredRecordKey(layout.blockTextAlignments, key),
    blockTextReflow: layout.blockTextReflow
      ? omitRequiredRecordKey(layout.blockTextReflow, key)
      : undefined,
    blockSyllableDivision: layout.blockSyllableDivision
      ? omitRequiredRecordKey(layout.blockSyllableDivision, key)
      : undefined,
    blockBold: layout.blockBold
      ? omitRequiredRecordKey(layout.blockBold, key)
      : undefined,
    blockItalic: layout.blockItalic
      ? omitRequiredRecordKey(layout.blockItalic, key)
      : undefined,
    blockRotations: layout.blockRotations
      ? omitRequiredRecordKey(layout.blockRotations, key)
      : undefined,
    blockCustomSizes: omitOptionalRecordKey(layout.blockCustomSizes, key),
    blockCustomLeadings: omitOptionalRecordKey(layout.blockCustomLeadings, key),
    blockTextColors: omitOptionalRecordKey(layout.blockTextColors, key),
    blockModulePositions: omitOptionalRecordKey(layout.blockModulePositions, key),
    layerOrder: (layout.layerOrder ?? []).filter((item) => item !== key),
  }
}
