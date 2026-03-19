import type { BlockEditorState, BlockEditorTextAlign } from "@/components/editor/block-editor-types"
import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import type { FontFamily } from "@/lib/config/fonts"
import { normalizeInlineEditorText } from "@/lib/inline-text-normalization"

type ExistingBlockArgs<StyleKey extends string> = {
  key: string
  styleAssignments: Record<string, StyleKey>
  textContent: Record<string, string>
  blockCustomSizes: Partial<Record<string, number>>
  blockCustomLeadings: Partial<Record<string, number>>
  blockTextAlignments: Partial<Record<string, BlockEditorTextAlign>>
  blockTextEdited: Record<string, boolean>
  getBlockFont: (key: string) => FontFamily
  getBlockRotation: (key: string) => number
  getBlockRows: (key: string) => number
  getBlockSpan: (key: string) => number
  getBlockTextColor: (key: string) => string
  getStyleLeading: (style: StyleKey) => number
  getStyleSize: (style: StyleKey) => number
  isBlockBold: (key: string) => boolean
  isBlockItalic: (key: string) => boolean
  isSyllableDivisionEnabled: (key: string) => boolean
  isTextReflowEnabled: (key: string) => boolean
  fallbackStyle: StyleKey
  fxStyle: StyleKey
}

type NewBlockArgs<StyleKey extends string> = {
  key: string
  style: StyleKey
  text: string
  columns: number
  rows: number
  baseFont: FontFamily
  defaultTextColor: string
  getStyleLeading: (style: StyleKey) => number
  getStyleSize: (style: StyleKey) => number
  fxStyle: StyleKey
  align?: BlockEditorTextAlign
  reflow?: boolean
  syllableDivision?: boolean
  bold?: boolean
  italic?: boolean
  rotation?: number
  textEdited?: boolean
}

export function buildExistingBlockEditorState<StyleKey extends string>({
  key,
  styleAssignments,
  textContent,
  blockCustomSizes,
  blockCustomLeadings,
  blockTextAlignments,
  blockTextEdited,
  getBlockFont,
  getBlockRotation,
  getBlockRows,
  getBlockSpan,
  getBlockTextColor,
  getStyleLeading,
  getStyleSize,
  isBlockBold,
  isBlockItalic,
  isSyllableDivisionEnabled,
  isTextReflowEnabled,
  fallbackStyle,
  fxStyle,
}: ExistingBlockArgs<StyleKey>): BlockEditorState<StyleKey> {
  const styleKey = styleAssignments[key] ?? fallbackStyle

  return {
    target: key,
    draftText: normalizeInlineEditorText(textContent[key] ?? ""),
    draftStyle: styleKey,
    draftFxSize: styleKey === fxStyle
      ? clampFxSize(blockCustomSizes[key] ?? getStyleSize(fxStyle))
      : getStyleSize(fxStyle),
    draftFxLeading: styleKey === fxStyle
      ? clampFxLeading(blockCustomLeadings[key] ?? getStyleLeading(fxStyle))
      : getStyleLeading(fxStyle),
    draftFont: getBlockFont(key),
    draftColumns: getBlockSpan(key),
    draftRows: getBlockRows(key),
    draftAlign: blockTextAlignments[key] ?? "left",
    draftColor: getBlockTextColor(key),
    draftReflow: isTextReflowEnabled(key),
    draftSyllableDivision: isSyllableDivisionEnabled(key),
    draftBold: isBlockBold(key),
    draftItalic: isBlockItalic(key),
    draftRotation: getBlockRotation(key),
    draftTextEdited: blockTextEdited[key] ?? true,
  }
}

export function buildNewBlockEditorState<StyleKey extends string>({
  key,
  style,
  text,
  columns,
  rows,
  baseFont,
  defaultTextColor,
  getStyleLeading,
  getStyleSize,
  fxStyle,
  align = "left",
  reflow = false,
  syllableDivision = true,
  bold = false,
  italic = false,
  rotation = 0,
  textEdited = false,
}: NewBlockArgs<StyleKey>): BlockEditorState<StyleKey> {
  return {
    target: key,
    draftText: normalizeInlineEditorText(text),
    draftStyle: style,
    draftFxSize: getStyleSize(fxStyle),
    draftFxLeading: getStyleLeading(fxStyle),
    draftFont: baseFont,
    draftColumns: columns,
    draftRows: rows,
    draftAlign: align,
    draftColor: defaultTextColor,
    draftReflow: reflow,
    draftSyllableDivision: syllableDivision,
    draftBold: bold,
    draftItalic: italic,
    draftRotation: rotation,
    draftTextEdited: textEdited,
  }
}
