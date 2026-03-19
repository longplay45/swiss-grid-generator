import { useMemo } from "react"
import type { Dispatch, SetStateAction } from "react"

import type { BlockEditorState, BlockEditorStyleOption } from "@/components/editor/block-editor-types"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { PreviewColorSchemeOption, TextEditorControls } from "@/lib/preview-overlay-controls"

type Args<StyleKey extends string> = {
  editorState: BlockEditorState<StyleKey> | null
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

export function usePreviewOverlayControls<StyleKey extends string>({
  editorState,
  setEditorState,
  deleteEditorBlock,
  gridRows,
  gridCols,
  hierarchyTriggerMinWidthCh,
  rowTriggerMinWidthCh,
  colTriggerMinWidthCh,
  styleOptions,
  getStyleSizeLabel,
  getStyleSizeValue,
  getStyleLeadingValue,
  isFxStyle,
  getDummyTextForStyle,
  colorSchemes,
  selectedColorScheme,
  onColorSchemeChange,
  palette,
}: Args<StyleKey>) {
  return useMemo<TextEditorControls<StyleKey> | null>(() => {
    if (!editorState) return null
    return {
      editorState,
      setEditorState,
      deleteEditorBlock,
      gridRows,
      gridCols,
      hierarchyTriggerMinWidthCh,
      rowTriggerMinWidthCh,
      colTriggerMinWidthCh,
      styleOptions,
      getStyleSizeLabel,
      getStyleSizeValue,
      getStyleLeadingValue,
      isFxStyle,
      getDummyTextForStyle,
      colorSchemes,
      selectedColorScheme,
      onColorSchemeChange,
      palette,
    }
  }, [
    colTriggerMinWidthCh,
    colorSchemes,
    deleteEditorBlock,
    editorState,
    getDummyTextForStyle,
    getStyleLeadingValue,
    getStyleSizeLabel,
    getStyleSizeValue,
    gridCols,
    gridRows,
    hierarchyTriggerMinWidthCh,
    isFxStyle,
    onColorSchemeChange,
    palette,
    rowTriggerMinWidthCh,
    selectedColorScheme,
    setEditorState,
    styleOptions,
  ])
}
