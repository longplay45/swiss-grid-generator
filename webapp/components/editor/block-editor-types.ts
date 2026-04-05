import type { FontFamily } from "@/lib/config/fonts"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"
import type { TextAlignMode } from "@/lib/types/layout-primitives"

export type BlockEditorTextAlign = TextAlignMode

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
  draftAlign: BlockEditorTextAlign
  draftColor: string
  draftReflow: boolean
  draftSyllableDivision: boolean
  draftItalic: boolean
  draftOpticalKerning: boolean
  draftTrackingScale: number
  draftTrackingRuns: TextTrackingRun[]
  draftRotation: number
  draftTextEdited: boolean
  draftSelectionStart: number
  draftSelectionEnd: number
}

export type BlockEditorStyleOption<StyleKey extends string = string> = {
  value: StyleKey
  label: string
}
