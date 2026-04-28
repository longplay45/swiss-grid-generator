import { useMemo } from "react"
import type { Dispatch, SetStateAction } from "react"

import type { BlockEditorState, BlockEditorStyleOption } from "@/components/editor/block-editor-types"
import { applyBlockEditorTextEdit } from "@/lib/block-editor-text-edit"
import { normalizeInlineEditorText } from "@/lib/inline-text-normalization"
import { applyTextFormatToRange } from "@/lib/text-format-runs"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { InsertEditorTextOptions, PreviewColorSchemeOption, TextEditorControls } from "@/lib/preview-overlay-controls"

type Args<StyleKey extends string> = {
  editorState: BlockEditorState<StyleKey> | null
  setEditorState: Dispatch<SetStateAction<BlockEditorState<StyleKey> | null>>
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

export function usePreviewOverlayControls<StyleKey extends string>({
  editorState,
  setEditorState,
  deleteEditorBlock,
  maxCharsPerLine,
  baselinesPerGridModule,
  gridRows,
  gridCols,
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
    const insertEditorText = (value: string, options?: InsertEditorTextOptions<StyleKey>) => {
      const insertedText = normalizeInlineEditorText(value)
      if (!insertedText) return
      setEditorState((prev) => {
        if (!prev) return prev
        const selectionStart = Math.min(prev.draftSelectionStart, prev.draftSelectionEnd)
        const selectionEnd = Math.max(prev.draftSelectionStart, prev.draftSelectionEnd)
        const nextText = `${prev.draftText.slice(0, selectionStart)}${insertedText}${prev.draftText.slice(selectionEnd)}`
        const nextCaretIndex = selectionStart + insertedText.length
        const nextState = applyBlockEditorTextEdit(prev, nextText, {
          start: nextCaretIndex,
          end: nextCaretIndex,
          anchor: nextCaretIndex,
          focusIndex: nextCaretIndex,
        })
        if (!options?.format) return nextState
        return {
          ...nextState,
          draftTextFormatRuns: applyTextFormatToRange(
            nextState.draftText,
            {
              start: selectionStart,
              end: nextCaretIndex,
            },
            options.format,
            {
              fontFamily: nextState.draftFont,
              fontWeight: nextState.draftFontWeight,
              italic: nextState.draftItalic,
              styleKey: nextState.draftStyle,
              color: nextState.draftColor,
            },
            nextState.draftTextFormatRuns,
          ),
        }
      })
    }

    return {
      editorState,
      setEditorState,
      insertEditorText,
      deleteEditorBlock,
      maxCharsPerLine,
      baselinesPerGridModule,
      gridRows,
      gridCols,
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
    colorSchemes,
    baselinesPerGridModule,
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
    isFxStyle,
    palette,
    selectedColorScheme,
    setEditorState,
    styleOptions,
  ])
}
