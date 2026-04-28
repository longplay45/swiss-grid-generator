import type { Dispatch, SetStateAction } from "react"

import type { BlockEditorState, BlockEditorStyleOption } from "@/components/editor/block-editor-types"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { FontFamily } from "@/lib/config/fonts"
import type { BaseTextFormat } from "@/lib/text-format-runs"

export type InsertEditorTextOptions<StyleKey extends string> = {
  format?: Partial<BaseTextFormat<StyleKey, FontFamily>>
}

export type PreviewColorSchemeOption = {
  id: ImageColorSchemeId
  label: string
  colors: readonly string[]
}

export type TextEditorControls<StyleKey extends string> = {
  editorState: BlockEditorState<StyleKey>
  setEditorState: Dispatch<SetStateAction<BlockEditorState<StyleKey> | null>>
  insertEditorText: (value: string, options?: InsertEditorTextOptions<StyleKey>) => void
  deleteEditorBlock: () => void
  maxCharsPerLine: number | null
  baselinesPerGridModule: number
  gridRows: number
  gridCols: number
  styleOptions: Array<BlockEditorStyleOption<StyleKey>>
  getStyleSizeLabel: (styleKey: StyleKey) => string
  getStyleSizeValue: (styleKey: StyleKey) => number
  getStyleLeadingValue: (styleKey: StyleKey) => number
  getStyleDefaultFontWeight: (styleKey: StyleKey) => number
  getStyleDefaultItalic: (styleKey: StyleKey) => boolean
  isFxStyle: (styleKey: StyleKey) => boolean
  getDummyTextForStyle: (styleKey: StyleKey) => string
  colorSchemes: readonly PreviewColorSchemeOption[]
  selectedColorScheme: ImageColorSchemeId
  palette: readonly string[]
}
