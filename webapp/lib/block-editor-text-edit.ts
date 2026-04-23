import type { BlockEditorState } from "@/components/editor/block-editor-types"
import type { FontFamily } from "@/lib/config/fonts"
import {
  rebaseTextFormatRunsForTextEdit,
  type BaseTextFormat,
} from "@/lib/text-format-runs"
import { remapTrackingRunsForTextEdit } from "@/lib/text-tracking-runs"

export type BlockEditorTextSelection = {
  start: number
  end: number
  anchor: number
  focusIndex: number
}

function getBlockEditorBaseTextFormat<StyleKey extends string>(
  state: BlockEditorState<StyleKey>,
): BaseTextFormat<StyleKey, FontFamily> {
  return {
    fontFamily: state.draftFont,
    fontWeight: state.draftFontWeight,
    italic: state.draftItalic,
    styleKey: state.draftStyle,
    color: state.draftColor,
  }
}

export function applyBlockEditorTextEdit<StyleKey extends string>(
  state: BlockEditorState<StyleKey>,
  nextText: string,
  nextSelection: BlockEditorTextSelection,
): BlockEditorState<StyleKey> {
  return {
    ...state,
    draftText: nextText,
    draftTrackingRuns: remapTrackingRunsForTextEdit(
      state.draftText,
      nextText,
      state.draftTrackingRuns,
      state.draftTrackingScale,
    ),
    draftTextFormatRuns: rebaseTextFormatRunsForTextEdit(
      state.draftText,
      nextText,
      state.draftTextFormatRuns,
      getBlockEditorBaseTextFormat(state),
    ),
    draftTextEdited: true,
    draftSelectionStart: nextSelection.start,
    draftSelectionEnd: nextSelection.end,
    draftSelectionAnchor: nextSelection.anchor,
    draftSelectionFocusIndex: nextSelection.focusIndex,
  }
}
