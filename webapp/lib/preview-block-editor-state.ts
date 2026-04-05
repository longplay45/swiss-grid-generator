import type { BlockEditorState, BlockEditorTextAlign } from "@/components/editor/block-editor-types"
import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import type { FontFamily } from "@/lib/config/fonts"
import { normalizeInlineEditorText } from "@/lib/inline-text-normalization"
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
    draftFontWeight: getBlockFontWeight(key),
    draftColumns: getBlockSpan(key),
    draftRows: getBlockRows(key),
    draftAlign: blockTextAlignments[key] ?? "left",
    draftColor: getBlockTextColor(key),
    draftReflow: isTextReflowEnabled(key),
    draftSyllableDivision: isSyllableDivisionEnabled(key),
    draftItalic: isBlockItalic(key),
    draftOpticalKerning: isBlockOpticalKerningEnabled(key),
    draftTrackingScale: getBlockTrackingScale(key),
    draftTrackingRuns: normalizeTextTrackingRuns(
      textContent[key] ?? "",
      getBlockTrackingRuns(key),
      getBlockTrackingScale(key),
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
    draftRotation: rotation,
    draftTextEdited: textEdited,
    draftSelectionStart: 0,
    draftSelectionEnd: 0,
  }
}
