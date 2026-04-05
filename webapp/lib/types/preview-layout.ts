import type { TextFormatRun } from "@/lib/text-format-runs"
import type { ModulePosition, TextAlignMode, TextBlockPosition } from "@/lib/types/layout-primitives"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"

export type BlockId = string
export type { ModulePosition, TextAlignMode, TextBlockPosition }

export type PreviewLayoutState<
  StyleKey extends string = string,
  FontFamily extends string = string,
  Key extends string = BlockId,
> = {
  blockOrder: Key[]
  textContent: Record<Key, string>
  blockTextEdited: Record<Key, boolean>
  styleAssignments: Record<Key, StyleKey>
  blockFontFamilies?: Partial<Record<Key, FontFamily>>
  blockFontWeights?: Partial<Record<Key, number>>
  blockOpticalKerning?: Partial<Record<Key, boolean>>
  blockTrackingScales?: Partial<Record<Key, number>>
  blockTrackingRuns?: Partial<Record<Key, TextTrackingRun[]>>
  blockTextFormatRuns?: Partial<Record<Key, TextFormatRun<StyleKey, FontFamily>[]>>
  blockColumnSpans: Record<Key, number>
  blockRowSpans?: Record<Key, number>
  blockTextAlignments: Record<Key, TextAlignMode>
  blockTextReflow?: Record<Key, boolean>
  blockSyllableDivision?: Record<Key, boolean>
  // Legacy compatibility for older saved layouts.
  blockBold?: Record<Key, boolean>
  blockItalic?: Record<Key, boolean>
  blockRotations?: Record<Key, number>
  blockCustomSizes?: Partial<Record<Key, number>>
  blockCustomLeadings?: Partial<Record<Key, number>>
  blockTextColors?: Partial<Record<Key, string>>
  blockModulePositions: Partial<Record<Key, TextBlockPosition>>
  layerOrder?: Key[]
  imageOrder?: Key[]
  imageModulePositions?: Partial<Record<Key, ModulePosition>>
  imageColumnSpans?: Partial<Record<Key, number>>
  imageRowSpans?: Partial<Record<Key, number>>
  imageColors?: Partial<Record<Key, string>>
}
