import type { BlockEditorState, BlockEditorTextAlign } from "@/components/editor/block-editor-types"
import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import type { FontFamily } from "@/lib/config/fonts"
import { normalizeInlineEditorText } from "@/lib/inline-text-normalization"
import { normalizeTextFormatRuns, type TextFormatRun } from "@/lib/text-format-runs"
import {
  DEFAULT_OPTICAL_KERNING,
  DEFAULT_TRACKING_SCALE,
} from "@/lib/text-rendering"
import { normalizeTextTrackingRuns, type TextTrackingRun } from "@/lib/text-tracking-runs"

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
  getBlockFontWeight: (key: string) => number
  getBlockTrackingScale: (key: string) => number
  getBlockTrackingRuns: (key: string) => TextTrackingRun[]
  getBlockTextFormatRuns: (key: string, color: string) => TextFormatRun<StyleKey, FontFamily>[]
  getStyleLeading: (style: StyleKey) => number
  getStyleSize: (style: StyleKey) => number
  isBlockItalic: (key: string) => boolean
  isBlockOpticalKerningEnabled: (key: string) => boolean
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
  fontWeight?: number
  italic?: boolean
  opticalKerning?: boolean
  trackingScale?: number
  trackingRuns?: TextTrackingRun[]
  textFormatRuns?: TextFormatRun<StyleKey, FontFamily>[]
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
  getBlockFontWeight,
  getBlockTrackingScale,
  getBlockTrackingRuns,
  getBlockTextFormatRuns,
  getStyleLeading,
  getStyleSize,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  isSyllableDivisionEnabled,
  isTextReflowEnabled,
  fallbackStyle,
  fxStyle,
}: ExistingBlockArgs<StyleKey>): BlockEditorState<StyleKey> {
  const styleKey = styleAssignments[key] ?? fallbackStyle
  const normalizedText = normalizeInlineEditorText(textContent[key] ?? "")
  const draftFont = getBlockFont(key)
  const draftFontWeight = getBlockFontWeight(key)
  const draftItalic = isBlockItalic(key)
  const draftColor = getBlockTextColor(key)

  return {
    target: key,
    draftText: normalizedText,
    draftStyle: styleKey,
    draftFxSize: styleKey === fxStyle
      ? clampFxSize(blockCustomSizes[key] ?? getStyleSize(fxStyle))
      : getStyleSize(fxStyle),
    draftFxLeading: styleKey === fxStyle
      ? clampFxLeading(blockCustomLeadings[key] ?? getStyleLeading(fxStyle))
      : getStyleLeading(fxStyle),
    draftFont: draftFont,
    draftFontWeight: draftFontWeight,
    draftColumns: getBlockSpan(key),
    draftRows: getBlockRows(key),
    draftAlign: blockTextAlignments[key] ?? "left",
    draftColor: draftColor,
    draftReflow: isTextReflowEnabled(key),
    draftSyllableDivision: isSyllableDivisionEnabled(key),
    draftItalic: draftItalic,
    draftOpticalKerning: isBlockOpticalKerningEnabled(key),
    draftTrackingScale: getBlockTrackingScale(key),
    draftTrackingRuns: normalizeTextTrackingRuns(
      normalizedText,
      getBlockTrackingRuns(key),
      getBlockTrackingScale(key),
    ),
    draftTextFormatRuns: normalizeTextFormatRuns(
      normalizedText,
      getBlockTextFormatRuns(key, draftColor),
      {
        fontFamily: draftFont,
        fontWeight: draftFontWeight,
        italic: draftItalic,
        styleKey,
        color: draftColor,
      },
    ),
    draftRotation: getBlockRotation(key),
    draftTextEdited: blockTextEdited[key] ?? true,
    draftSelectionStart: 0,
    draftSelectionEnd: 0,
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
  fontWeight = 400,
  italic = false,
  opticalKerning = DEFAULT_OPTICAL_KERNING,
  trackingScale = DEFAULT_TRACKING_SCALE,
  trackingRuns = [],
  textFormatRuns = [],
  rotation = 0,
  textEdited = false,
}: NewBlockArgs<StyleKey>): BlockEditorState<StyleKey> {
  const normalizedText = normalizeInlineEditorText(text)
  return {
    target: key,
    draftText: normalizedText,
    draftStyle: style,
    draftFxSize: getStyleSize(fxStyle),
    draftFxLeading: getStyleLeading(fxStyle),
    draftFont: baseFont,
    draftFontWeight: fontWeight,
    draftColumns: columns,
    draftRows: rows,
    draftAlign: align,
    draftColor: defaultTextColor,
    draftReflow: reflow,
    draftSyllableDivision: syllableDivision,
    draftItalic: italic,
    draftOpticalKerning: opticalKerning,
    draftTrackingScale: trackingScale,
    draftTrackingRuns: normalizeTextTrackingRuns(normalizedText, trackingRuns, trackingScale),
    draftTextFormatRuns: normalizeTextFormatRuns(
      normalizedText,
      textFormatRuns,
      {
        fontFamily: baseFont,
        fontWeight,
        italic,
        styleKey: style,
        color: defaultTextColor,
      },
    ),
    draftRotation: rotation,
    draftTextEdited: textEdited,
    draftSelectionStart: 0,
    draftSelectionEnd: 0,
  }
}
