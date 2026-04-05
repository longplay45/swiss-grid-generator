import { useMemo } from "react"
import type { Dispatch, SetStateAction } from "react"

import type { BlockEditorState, BlockEditorStyleOption } from "@/components/editor/block-editor-types"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { PreviewColorSchemeOption, TextEditorControls } from "@/lib/preview-overlay-controls"

type Args<StyleKey extends string> = {
  editorState: BlockEditorState<StyleKey> | null
  setEditorState: Dispatch<SetStateAction<BlockEditorState<StyleKey> | null>>
  deleteEditorBlock: () => void
  maxCharsPerLine: number | null
  gridRows: number
  gridCols: number
  hierarchyTriggerMinWidthCh: number
  rowTriggerMinWidthCh: number
  colTriggerMinWidthCh: number
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

export function usePreviewOverlayControls<StyleKey extends string>({
  editorState,
  setEditorState,
  deleteEditorBlock,
  maxCharsPerLine,
  gridRows,
  gridCols,
  hierarchyTriggerMinWidthCh,
  rowTriggerMinWidthCh,
  colTriggerMinWidthCh,
  styleOptions,
  getStyleSizeLabel,
  getStyleSizeValue,
  getStyleLeadingValue,
  getStyleDefaultFontWeight,
  getStyleDefaultItalic,
  isFxStyle,
  getDummyTextForStyle,
  colorSchemes,
  selectedColorScheme,
  palette,
}: Args<StyleKey>) {
  return useMemo<TextEditorControls<StyleKey> | null>(() => {
    if (!editorState) return null
    return {
      editorState,
      setEditorState,
      deleteEditorBlock,
      maxCharsPerLine,
      gridRows,
      gridCols,
      hierarchyTriggerMinWidthCh,
      rowTriggerMinWidthCh,
      colTriggerMinWidthCh,
      styleOptions,
      getStyleSizeLabel,
      getStyleSizeValue,
      getStyleLeadingValue,
      getStyleDefaultFontWeight,
      getStyleDefaultItalic,
      isFxStyle,
      getDummyTextForStyle,
      colorSchemes,
      selectedColorScheme,
      palette,
    }
  }, [
    colTriggerMinWidthCh,
    colorSchemes,
    deleteEditorBlock,
    editorState,
    maxCharsPerLine,
    getDummyTextForStyle,
    getStyleDefaultFontWeight,
    getStyleDefaultItalic,
    getStyleLeadingValue,
    getStyleSizeLabel,
    getStyleSizeValue,
    gridCols,
    gridRows,
    hierarchyTriggerMinWidthCh,
    isFxStyle,
    palette,
    rowTriggerMinWidthCh,
    selectedColorScheme,
    setEditorState,
    styleOptions,
  ])
}
