import type { ModulePosition, TextAlignMode } from "@/lib/types/layout-primitives"

export type BlockId = string
export type { ModulePosition, TextAlignMode }

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
  blockModulePositions: Partial<Record<Key, ModulePosition>>
  layerOrder?: Key[]
  imageOrder?: Key[]
  imageModulePositions?: Partial<Record<Key, ModulePosition>>
  imageColumnSpans?: Partial<Record<Key, number>>
  imageRowSpans?: Partial<Record<Key, number>>
  imageColors?: Partial<Record<Key, string>>
}
