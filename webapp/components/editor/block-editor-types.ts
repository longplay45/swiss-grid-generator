import type { FontFamily } from "@/lib/config/fonts"
import type { TextFormatRun } from "@/lib/text-format-runs"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"
import type { TextAlignMode, TextVerticalAlignMode } from "@/lib/types/layout-primitives"

export type BlockEditorTextAlign = TextAlignMode
export type BlockEditorVerticalAlign = TextVerticalAlignMode

export type BlockEditorState<StyleKey extends string = string> = {
  target: string
  draftText: string
  draftStyle: StyleKey
  draftFxSize: number
  draftFxLeading: number
  draftFont: FontFamily
  draftFontWeight: number
  draftColumns: number
  draftRows: number
  draftHeightBaselines: number
  draftAlign: BlockEditorTextAlign
  draftVerticalAlign: BlockEditorVerticalAlign
  draftColor: string
  draftReflow: boolean
  draftSyllableDivision: boolean
  draftItalic: boolean
  draftOpticalKerning: boolean
  draftTrackingScale: number
  draftTrackingRuns: TextTrackingRun[]
  draftTextFormatRuns: TextFormatRun<StyleKey, FontFamily>[]
  draftRotation: number
  draftTextEdited: boolean
  draftSelectionStart: number
  draftSelectionEnd: number
  draftSelectionAnchor: number
  draftSelectionFocusIndex: number
}

export type BlockEditorStyleOption<StyleKey extends string = string> = {
  value: StyleKey
  label: string
}
