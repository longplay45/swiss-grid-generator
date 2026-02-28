export type BlockId = string
export type TextAlignMode = "left" | "right"

export type ModulePosition = {
  col: number
  row: number
}

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
  blockColumnSpans: Record<Key, number>
  blockRowSpans?: Record<Key, number>
  blockTextAlignments: Record<Key, TextAlignMode>
  blockTextReflow?: Record<Key, boolean>
  blockSyllableDivision?: Record<Key, boolean>
  blockBold?: Record<Key, boolean>
  blockItalic?: Record<Key, boolean>
  blockRotations?: Record<Key, number>
  blockCustomSizes?: Partial<Record<Key, number>>
  blockCustomLeadings?: Partial<Record<Key, number>>
  blockTextColors?: Partial<Record<Key, string>>
  blockModulePositions: Partial<Record<Key, ModulePosition>>
  imageOrder?: Key[]
  imageModulePositions?: Partial<Record<Key, ModulePosition>>
  imageColumnSpans?: Partial<Record<Key, number>>
  imageRowSpans?: Partial<Record<Key, number>>
  imageColors?: Partial<Record<Key, string>>
}
