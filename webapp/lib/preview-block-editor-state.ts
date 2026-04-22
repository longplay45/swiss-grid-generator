import type { BlockEditorState, BlockEditorTextAlign, BlockEditorVerticalAlign } from "@/components/editor/block-editor-types"
import { normalizeHeightMetrics } from "@/lib/block-height"
import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import type { FontFamily } from "@/lib/config/fonts"
import { normalizeInlineEditorText } from "@/lib/inline-text-normalization"
import {
  getUniformTextFormatValueForRange,
  normalizeTextFormatRuns,
  type BaseTextFormat,
  type TextFormatRun,
} from "@/lib/text-format-runs"
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
  blockVerticalAlignments: Partial<Record<string, BlockEditorVerticalAlign>>
  blockTextEdited: Record<string, boolean>
  getBlockFont: (key: string) => FontFamily
  getBlockRotation: (key: string) => number
  getBlockRows: (key: string) => number
  getBlockHeightBaselines: (key: string) => number
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
  isSnapToColumnsEnabled: (key: string) => boolean
  isSnapToBaselineEnabled: (key: string) => boolean
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
  heightBaselines?: number
  baseFont: FontFamily
  defaultTextColor: string
  getStyleLeading: (style: StyleKey) => number
  getStyleSize: (style: StyleKey) => number
  fxStyle: StyleKey
  align?: BlockEditorTextAlign
  verticalAlign?: BlockEditorVerticalAlign
  reflow?: boolean
  syllableDivision?: boolean
  snapToColumns?: boolean
  snapToBaseline?: boolean
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
  blockVerticalAlignments,
  blockTextEdited,
  getBlockFont,
  getBlockRotation,
  getBlockRows,
  getBlockHeightBaselines,
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
  isSnapToColumnsEnabled,
  isSnapToBaselineEnabled,
  isSyllableDivisionEnabled,
  isTextReflowEnabled,
  fallbackStyle,
  fxStyle,
}: ExistingBlockArgs<StyleKey>): BlockEditorState<StyleKey> {
  const height = normalizeHeightMetrics({
    rows: getBlockRows(key),
    baselines: getBlockHeightBaselines(key),
    gridRows: Number.MAX_SAFE_INTEGER,
  })
  const assignedStyleKey = styleAssignments[key] ?? fallbackStyle
  const normalizedText = normalizeInlineEditorText(textContent[key] ?? "")
  const initialBaseFormat: BaseTextFormat<StyleKey, FontFamily> = {
    fontFamily: getBlockFont(key),
    fontWeight: getBlockFontWeight(key),
    italic: isBlockItalic(key),
    styleKey: assignedStyleKey,
    color: getBlockTextColor(key),
  }
  const initialRuns = normalizeTextFormatRuns(
    normalizedText,
    getBlockTextFormatRuns(key, initialBaseFormat.color),
    initialBaseFormat,
  )
  const wholeTextRange = {
    start: 0,
    end: normalizedText.length,
  }
  const hasWholeText = wholeTextRange.end > wholeTextRange.start
  const collapsedBaseFormat: BaseTextFormat<StyleKey, FontFamily> = hasWholeText
    ? (() => {
      const fontFamily = getUniformTextFormatValueForRange(
        normalizedText,
        wholeTextRange,
        initialBaseFormat,
        initialRuns,
        "fontFamily",
      )
      const fontWeight = getUniformTextFormatValueForRange(
        normalizedText,
        wholeTextRange,
        initialBaseFormat,
        initialRuns,
        "fontWeight",
      )
      const italic = getUniformTextFormatValueForRange(
        normalizedText,
        wholeTextRange,
        initialBaseFormat,
        initialRuns,
        "italic",
      )
      const styleKey = getUniformTextFormatValueForRange(
        normalizedText,
        wholeTextRange,
        initialBaseFormat,
        initialRuns,
        "styleKey",
      )
      const color = getUniformTextFormatValueForRange(
        normalizedText,
        wholeTextRange,
        initialBaseFormat,
        initialRuns,
        "color",
      )
      if (
        fontFamily === null
        || fontWeight === null
        || italic === null
        || styleKey === null
        || color === null
      ) {
        return initialBaseFormat
      }
      return {
        fontFamily,
        fontWeight,
        italic,
        styleKey,
        color,
      }
    })()
    : initialBaseFormat
  const styleKey = collapsedBaseFormat.styleKey
  const draftFont = collapsedBaseFormat.fontFamily
  const draftFontWeight = collapsedBaseFormat.fontWeight
  const draftItalic = collapsedBaseFormat.italic
  const draftColor = collapsedBaseFormat.color
  const draftTextFormatRuns = normalizeTextFormatRuns(
    normalizedText,
    initialRuns,
    collapsedBaseFormat,
  )

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
    draftRows: height.rows,
    draftHeightBaselines: height.baselines,
    draftAlign: blockTextAlignments[key] ?? "left",
    draftVerticalAlign: blockVerticalAlignments[key] ?? "top",
    draftColor: draftColor,
    draftReflow: isTextReflowEnabled(key),
    draftSyllableDivision: isSyllableDivisionEnabled(key),
    draftSnapToColumns: isSnapToColumnsEnabled(key),
    draftSnapToBaseline: isSnapToBaselineEnabled(key),
    draftItalic: draftItalic,
    draftOpticalKerning: isBlockOpticalKerningEnabled(key),
    draftTrackingScale: getBlockTrackingScale(key),
    draftTrackingRuns: normalizeTextTrackingRuns(
      normalizedText,
      getBlockTrackingRuns(key),
      getBlockTrackingScale(key),
    ),
    draftTextFormatRuns,
    draftRotation: getBlockRotation(key),
    draftTextEdited: blockTextEdited[key] ?? true,
    draftSelectionStart: 0,
    draftSelectionEnd: 0,
    draftSelectionAnchor: 0,
    draftSelectionFocusIndex: 0,
  }
}

export function buildNewBlockEditorState<StyleKey extends string>({
  key,
  style,
  text,
  columns,
  rows,
  heightBaselines = 0,
  baseFont,
  defaultTextColor,
  getStyleLeading,
  getStyleSize,
  fxStyle,
  align = "left",
  verticalAlign = "top",
  reflow = false,
  syllableDivision = true,
  snapToColumns = true,
  snapToBaseline = true,
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
  const height = normalizeHeightMetrics({
    rows,
    baselines: heightBaselines,
    gridRows: Number.MAX_SAFE_INTEGER,
  })
  return {
    target: key,
    draftText: normalizedText,
    draftStyle: style,
    draftFxSize: getStyleSize(fxStyle),
    draftFxLeading: getStyleLeading(fxStyle),
    draftFont: baseFont,
    draftFontWeight: fontWeight,
    draftColumns: columns,
    draftRows: height.rows,
    draftHeightBaselines: height.baselines,
    draftAlign: align,
    draftVerticalAlign: verticalAlign,
    draftColor: defaultTextColor,
    draftReflow: reflow,
    draftSyllableDivision: syllableDivision,
    draftSnapToColumns: snapToColumns,
    draftSnapToBaseline: snapToBaseline,
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
    draftSelectionAnchor: 0,
    draftSelectionFocusIndex: 0,
  }
}
