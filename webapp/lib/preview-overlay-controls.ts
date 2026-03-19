import type { Dispatch, SetStateAction } from "react"

import type { BlockEditorState, BlockEditorStyleOption } from "@/components/editor/block-editor-types"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"

export type PreviewColorSchemeOption = {
  id: ImageColorSchemeId
  label: string
  colors: readonly string[]
}

export type TextEditorControls<StyleKey extends string> = {
  editorState: BlockEditorState<StyleKey>
  setEditorState: Dispatch<SetStateAction<BlockEditorState<StyleKey> | null>>
  deleteEditorBlock: () => void
  gridRows: number
  gridCols: number
  hierarchyTriggerMinWidthCh: number
  rowTriggerMinWidthCh: number
  colTriggerMinWidthCh: number
  styleOptions: Array<BlockEditorStyleOption<StyleKey>>
  getStyleSizeLabel: (styleKey: StyleKey) => string
  getStyleSizeValue: (styleKey: StyleKey) => number
  getStyleLeadingValue: (styleKey: StyleKey) => number
  isFxStyle: (styleKey: StyleKey) => boolean
  getDummyTextForStyle: (styleKey: StyleKey) => string
  colorSchemes: readonly PreviewColorSchemeOption[]
  selectedColorScheme: ImageColorSchemeId
  onColorSchemeChange: (value: ImageColorSchemeId) => void
  palette: readonly string[]
}
