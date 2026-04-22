import type { BlockEditorState, BlockEditorTextAlign } from "@/components/editor/block-editor-types"
import { normalizeHeightMetrics } from "@/lib/block-height"
import { clampRotation, hasSignificantRotation } from "@/lib/block-constraints"
import type { FontFamily } from "@/lib/config/fonts"
import { getStyleDefaultFontWeight, resolveFontVariant } from "@/lib/config/fonts"
import type { TextLayerCollections } from "@/lib/preview-layer-state"
import { normalizeTextFormatRuns } from "@/lib/text-format-runs"
import { toTextBlockPosition } from "@/lib/text-block-position"
import { clampTextBlockAnchorPosition } from "./text-block-anchor-clamp.ts"
import {
  DEFAULT_OPTICAL_KERNING,
  DEFAULT_TRACKING_SCALE,
  normalizeTrackingScale,
} from "@/lib/text-rendering"
import { normalizeTextTrackingRuns } from "@/lib/text-tracking-runs"
import type { ModulePosition, TextBlockPosition, TextVerticalAlignMode } from "@/lib/types/layout-primitives"
import { clampFreePlacementRow, clampLayerColumn } from "@/lib/layer-placement"

export type PreviewTextLayerCollectionsState<
  Key extends string = string,
  StyleKey extends string = string,
> = TextLayerCollections<Key, StyleKey, FontFamily, BlockEditorTextAlign, TextBlockPosition>

type TypographyStyleDefaults = {
  weight?: string
  blockItalic?: boolean
}

type ClampTextBlockPositionArgs = {
  position: ModulePosition
  span: number
  gridCols: number
  maxBaselineRow: number
  fitWithinGrid?: boolean
  snapToColumns?: boolean
}

type ApplyDraftArgs<StyleKey extends string> = {
  draft: BlockEditorState<StyleKey>
  baseFont: FontFamily
  gridCols: number
  gridRows: number
  rowStartBaselines: readonly number[]
  desiredPosition?: ModulePosition | TextBlockPosition | null
  typographyStyles: Record<string, TypographyStyleDefaults>
}

type InsertTextLayerArgs<Key extends string, StyleKey extends string> = {
  newKey: Key
  text: string
  styleKey: StyleKey
  gridCols: number
  gridRows: number
  columns: number
  rows: number
  heightBaselines: number
  position: ModulePosition | TextBlockPosition
  rowStartBaselines: readonly number[]
  afterKey?: Key | null
  textEdited?: boolean
  textAlign?: BlockEditorTextAlign
  verticalAlign?: TextVerticalAlignMode
  reflow?: boolean
  syllableDivision?: boolean
  snapToColumns?: boolean
  snapToBaseline?: boolean
}

type DuplicateTextLayerArgs<Key extends string, StyleKey extends string> = {
  sourceKey: Key
  newKey: Key
  styleKey: StyleKey
  gridCols: number
  gridRows: number
  columns: number
  rows: number
  heightBaselines: number
  reflow: boolean
  syllableDivision: boolean
  snapToColumns: boolean
  snapToBaseline: boolean
  position: ModulePosition | TextBlockPosition
  rowStartBaselines: readonly number[]
  baseFont: FontFamily
}

export function clampTextBlockPosition({
  position,
  span,
  gridCols,
  maxBaselineRow,
  fitWithinGrid = false,
  snapToColumns = true,
}: ClampTextBlockPositionArgs): ModulePosition {
  return {
    col: clampLayerColumn(position.col, { span, gridCols, snapToColumns, fitWithinGrid }),
    row: clampFreePlacementRow(position.row, maxBaselineRow),
  }
}

export function applyBlockEditorDraftToCollections<
  Key extends string,
  StyleKey extends string,
>(
  current: PreviewTextLayerCollectionsState<Key, StyleKey>,
  {
    draft,
    baseFont,
    gridCols,
    gridRows,
    rowStartBaselines,
    desiredPosition,
    typographyStyles,
  }: ApplyDraftArgs<StyleKey>,
): PreviewTextLayerCollectionsState<Key, StyleKey> {
  const height = normalizeHeightMetrics({
    rows: draft.draftRows,
    baselines: draft.draftHeightBaselines,
    gridRows,
  })
  const nextFonts = { ...current.blockFontFamilies }
  if (draft.draftFont === baseFont) {
    delete nextFonts[draft.target as Key]
  } else {
    nextFonts[draft.target as Key] = draft.draftFont
  }

  const resolvedVariant = resolveFontVariant(draft.draftFont, draft.draftFontWeight, draft.draftItalic)
  const nextFontWeights = { ...current.blockFontWeights }
  const defaultWeight = getStyleDefaultFontWeight(typographyStyles[draft.draftStyle]?.weight)
  if (resolvedVariant.weight === defaultWeight) {
    delete nextFontWeights[draft.target as Key]
  } else {
    nextFontWeights[draft.target as Key] = resolvedVariant.weight
  }

  const nextItalic = { ...current.blockItalic }
  const defaultItalic = typographyStyles[draft.draftStyle]?.blockItalic === true
  if (resolvedVariant.italic === defaultItalic) {
    delete nextItalic[draft.target as Key]
  } else {
    nextItalic[draft.target as Key] = resolvedVariant.italic
  }

  const nextOpticalKerning = { ...current.blockOpticalKerning }
  if (draft.draftOpticalKerning === DEFAULT_OPTICAL_KERNING) {
    delete nextOpticalKerning[draft.target as Key]
  } else {
    nextOpticalKerning[draft.target as Key] = draft.draftOpticalKerning
  }

  const nextTrackingScales = { ...current.blockTrackingScales }
  const normalizedTrackingScale = normalizeTrackingScale(draft.draftTrackingScale)
  if (normalizedTrackingScale === DEFAULT_TRACKING_SCALE) {
    delete nextTrackingScales[draft.target as Key]
  } else {
    nextTrackingScales[draft.target as Key] = normalizedTrackingScale
  }
  const nextTrackingRuns = { ...current.blockTrackingRuns }
  const normalizedTrackingRuns = normalizeTextTrackingRuns(
    draft.draftText,
    draft.draftTrackingRuns,
    normalizedTrackingScale,
  )
  if (normalizedTrackingRuns.length === 0) {
    delete nextTrackingRuns[draft.target as Key]
  } else {
    nextTrackingRuns[draft.target as Key] = normalizedTrackingRuns
  }
  const nextTextFormatRuns = { ...current.blockTextFormatRuns }
  const normalizedTextFormatRuns = normalizeTextFormatRuns(
    draft.draftText,
    draft.draftTextFormatRuns,
    {
      fontFamily: draft.draftFont,
      fontWeight: resolvedVariant.weight,
      italic: resolvedVariant.italic,
      styleKey: draft.draftStyle,
      color: draft.draftColor,
    },
  )
  if (normalizedTextFormatRuns.length === 0) {
    delete nextTextFormatRuns[draft.target as Key]
  } else {
    nextTextFormatRuns[draft.target as Key] = normalizedTextFormatRuns
  }

  const nextRotations = { ...current.blockRotations }
  const clampedRotation = clampRotation(draft.draftRotation)
  if (hasSignificantRotation(clampedRotation)) {
    nextRotations[draft.target as Key] = clampedRotation
  } else {
    delete nextRotations[draft.target as Key]
  }

  const nextPositions = { ...current.blockModulePositions }
  const existingPosition = nextPositions[draft.target as Key]
  const candidatePosition = desiredPosition
    ? toTextBlockPosition(desiredPosition, rowStartBaselines)
    : existingPosition
  if (candidatePosition) {
    const clampedPosition = clampTextBlockAnchorPosition({
      position: candidatePosition,
      span: draft.draftColumns,
      rows: height.rows,
      gridCols,
      gridRows,
      fitColsWithinGrid: false,
      fitRowsWithinGrid: true,
      snapToColumns: draft.draftSnapToColumns,
      snapToBaseline: draft.draftSnapToBaseline,
    })
    const originalPosition = existingPosition ?? candidatePosition
    if (
      clampedPosition.column !== originalPosition.column
      || clampedPosition.row !== originalPosition.row
      || clampedPosition.baselineOffset !== originalPosition.baselineOffset
    ) {
      nextPositions[draft.target as Key] = clampedPosition
    }
  }

  return {
    ...current,
    textContent: {
      ...current.textContent,
      [draft.target as Key]: draft.draftText,
    },
    blockTextEdited: {
      ...current.blockTextEdited,
      [draft.target as Key]: draft.draftTextEdited,
    },
    styleAssignments: {
      ...current.styleAssignments,
      [draft.target as Key]: draft.draftStyle,
    },
    blockFontFamilies: nextFonts,
    blockFontWeights: nextFontWeights,
    blockOpticalKerning: nextOpticalKerning,
    blockTrackingScales: nextTrackingScales,
    blockTrackingRuns: nextTrackingRuns,
    blockTextFormatRuns: nextTextFormatRuns,
    blockColumnSpans: {
      ...current.blockColumnSpans,
      [draft.target as Key]: draft.draftColumns,
    },
    blockRowSpans: {
      ...current.blockRowSpans,
      [draft.target as Key]: height.rows,
    },
    blockHeightBaselines: {
      ...current.blockHeightBaselines,
      [draft.target as Key]: height.baselines,
    },
    blockTextAlignments: {
      ...current.blockTextAlignments,
      [draft.target as Key]: draft.draftAlign,
    },
    blockVerticalAlignments: {
      ...current.blockVerticalAlignments,
      [draft.target as Key]: draft.draftVerticalAlign,
    },
    blockTextReflow: {
      ...current.blockTextReflow,
      [draft.target as Key]: draft.draftReflow && draft.draftColumns > 1,
    },
    blockSyllableDivision: {
      ...current.blockSyllableDivision,
      [draft.target as Key]: draft.draftSyllableDivision,
    },
    blockSnapToColumns: {
      ...current.blockSnapToColumns,
      [draft.target as Key]: draft.draftSnapToColumns,
    },
    blockSnapToBaseline: {
      ...current.blockSnapToBaseline,
      [draft.target as Key]: draft.draftSnapToBaseline,
    },
    blockItalic: nextItalic,
    blockRotations: nextRotations,
    blockModulePositions: nextPositions,
  }
}

export function insertTextLayerIntoCollections<
  Key extends string,
  StyleKey extends string,
>(
  current: PreviewTextLayerCollectionsState<Key, StyleKey>,
  {
    newKey,
    text,
    styleKey,
    gridCols,
    gridRows,
    columns,
    rows,
    heightBaselines,
    position,
    rowStartBaselines,
    afterKey = null,
    textEdited = false,
    textAlign = "left",
    verticalAlign = "top",
    reflow = false,
    syllableDivision = true,
    snapToColumns = true,
    snapToBaseline = true,
  }: InsertTextLayerArgs<Key, StyleKey>,
): PreviewTextLayerCollectionsState<Key, StyleKey> {
  const height = normalizeHeightMetrics({
    rows,
    baselines: heightBaselines,
    gridRows,
  })
  const nextOrder = [...current.blockOrder]
  if (afterKey) {
    const afterIndex = nextOrder.indexOf(afterKey)
    if (afterIndex >= 0) nextOrder.splice(afterIndex + 1, 0, newKey)
    else nextOrder.push(newKey)
  } else {
    nextOrder.push(newKey)
  }

  return {
    ...current,
    blockOrder: nextOrder,
    textContent: {
      ...current.textContent,
      [newKey]: text,
    },
    blockTextEdited: {
      ...current.blockTextEdited,
      [newKey]: textEdited,
    },
    styleAssignments: {
      ...current.styleAssignments,
      [newKey]: styleKey,
    },
    blockColumnSpans: {
      ...current.blockColumnSpans,
      [newKey]: columns,
    },
    blockRowSpans: {
      ...current.blockRowSpans,
      [newKey]: height.rows,
    },
    blockHeightBaselines: {
      ...current.blockHeightBaselines,
      [newKey]: height.baselines,
    },
    blockTextAlignments: {
      ...current.blockTextAlignments,
      [newKey]: textAlign,
    },
    blockVerticalAlignments: {
      ...current.blockVerticalAlignments,
      [newKey]: verticalAlign,
    },
    blockTextReflow: {
      ...current.blockTextReflow,
      [newKey]: reflow,
    },
    blockSyllableDivision: {
      ...current.blockSyllableDivision,
      [newKey]: syllableDivision,
    },
    blockSnapToColumns: {
      ...current.blockSnapToColumns,
      [newKey]: snapToColumns,
    },
    blockSnapToBaseline: {
      ...current.blockSnapToBaseline,
      [newKey]: snapToBaseline,
    },
    blockTrackingRuns: {
      ...current.blockTrackingRuns,
    },
    blockTextFormatRuns: {
      ...current.blockTextFormatRuns,
    },
    blockModulePositions: {
      ...current.blockModulePositions,
      [newKey]: clampTextBlockAnchorPosition({
        position: toTextBlockPosition(position, rowStartBaselines),
        span: columns,
        rows: height.rows,
        gridCols,
        gridRows,
        snapToColumns,
        snapToBaseline,
      }),
    },
  }
}

export function duplicateTextLayerInCollections<
  Key extends string,
  StyleKey extends string,
>(
  current: PreviewTextLayerCollectionsState<Key, StyleKey>,
  {
    sourceKey,
    newKey,
    styleKey,
    gridCols,
    gridRows,
    columns,
    rows,
    heightBaselines,
    reflow,
    syllableDivision,
    snapToColumns,
    snapToBaseline,
    position,
    rowStartBaselines,
    baseFont,
  }: DuplicateTextLayerArgs<Key, StyleKey>,
): PreviewTextLayerCollectionsState<Key, StyleKey> {
  const height = normalizeHeightMetrics({
    rows,
    baselines: heightBaselines,
    gridRows,
  })
  const nextOrder = [...current.blockOrder]
  const sourceIndex = nextOrder.indexOf(sourceKey)
  if (sourceIndex >= 0) nextOrder.splice(sourceIndex + 1, 0, newKey)
  else nextOrder.push(newKey)

  const sourceFont = current.blockFontFamilies[sourceKey] ?? baseFont
  const nextFonts = { ...current.blockFontFamilies }
  if (sourceFont === baseFont) delete nextFonts[newKey]
  else nextFonts[newKey] = sourceFont

  const nextFontWeights = { ...current.blockFontWeights }
  if (typeof current.blockFontWeights[sourceKey] === "number" && Number.isFinite(current.blockFontWeights[sourceKey])) {
    nextFontWeights[newKey] = current.blockFontWeights[sourceKey]
  } else {
    delete nextFontWeights[newKey]
  }

  const nextItalic = { ...current.blockItalic }
  if (current.blockItalic[sourceKey] === true || current.blockItalic[sourceKey] === false) {
    nextItalic[newKey] = current.blockItalic[sourceKey]
  } else {
    delete nextItalic[newKey]
  }

  const nextOpticalKerning = { ...current.blockOpticalKerning }
  if (current.blockOpticalKerning[sourceKey] === true || current.blockOpticalKerning[sourceKey] === false) {
    nextOpticalKerning[newKey] = current.blockOpticalKerning[sourceKey]
  } else {
    delete nextOpticalKerning[newKey]
  }

  const nextTrackingScales = { ...current.blockTrackingScales }
  if (typeof current.blockTrackingScales[sourceKey] === "number" && Number.isFinite(current.blockTrackingScales[sourceKey])) {
    nextTrackingScales[newKey] = normalizeTrackingScale(current.blockTrackingScales[sourceKey])
  } else {
    delete nextTrackingScales[newKey]
  }
  const nextTrackingRuns = { ...current.blockTrackingRuns }
  const sourceTrackingRuns = current.blockTrackingRuns[sourceKey]
  if (Array.isArray(sourceTrackingRuns) && sourceTrackingRuns.length > 0) {
    nextTrackingRuns[newKey] = normalizeTextTrackingRuns(
      current.textContent[sourceKey] ?? "",
      sourceTrackingRuns,
      current.blockTrackingScales[sourceKey] ?? DEFAULT_TRACKING_SCALE,
    )
  } else {
    delete nextTrackingRuns[newKey]
  }
  const nextTextFormatRuns = { ...current.blockTextFormatRuns }
  const sourceTextFormatRuns = current.blockTextFormatRuns[sourceKey]
  if (Array.isArray(sourceTextFormatRuns) && sourceTextFormatRuns.length > 0) {
    nextTextFormatRuns[newKey] = sourceTextFormatRuns.map((run) => ({ ...run }))
  } else {
    delete nextTextFormatRuns[newKey]
  }

  const nextRotations = { ...current.blockRotations }
  const sourceRotation = current.blockRotations[sourceKey]
  if (typeof sourceRotation === "number" && Number.isFinite(sourceRotation) && hasSignificantRotation(sourceRotation)) {
    nextRotations[newKey] = clampRotation(sourceRotation)
  } else {
    delete nextRotations[newKey]
  }

  return {
    ...current,
    blockOrder: nextOrder,
    textContent: {
      ...current.textContent,
      [newKey]: current.textContent[sourceKey] ?? "",
    },
    blockTextEdited: {
      ...current.blockTextEdited,
      [newKey]: current.blockTextEdited[sourceKey] ?? true,
    },
    styleAssignments: {
      ...current.styleAssignments,
      [newKey]: styleKey,
    },
    blockFontFamilies: nextFonts,
    blockFontWeights: nextFontWeights,
    blockOpticalKerning: nextOpticalKerning,
    blockTrackingScales: nextTrackingScales,
    blockTrackingRuns: nextTrackingRuns,
    blockTextFormatRuns: nextTextFormatRuns,
    blockItalic: nextItalic,
    blockRotations: nextRotations,
    blockColumnSpans: {
      ...current.blockColumnSpans,
      [newKey]: columns,
    },
    blockRowSpans: {
      ...current.blockRowSpans,
      [newKey]: height.rows,
    },
    blockHeightBaselines: {
      ...current.blockHeightBaselines,
      [newKey]: height.baselines,
    },
    blockTextAlignments: {
      ...current.blockTextAlignments,
      [newKey]: current.blockTextAlignments[sourceKey] ?? "left",
    },
    blockVerticalAlignments: {
      ...current.blockVerticalAlignments,
      [newKey]: current.blockVerticalAlignments[sourceKey] ?? "top",
    },
    blockTextReflow: {
      ...current.blockTextReflow,
      [newKey]: reflow,
    },
    blockSyllableDivision: {
      ...current.blockSyllableDivision,
      [newKey]: syllableDivision,
    },
    blockSnapToColumns: {
      ...current.blockSnapToColumns,
      [newKey]: snapToColumns,
    },
    blockSnapToBaseline: {
      ...current.blockSnapToBaseline,
      [newKey]: snapToBaseline,
    },
    blockModulePositions: {
      ...current.blockModulePositions,
      [newKey]: clampTextBlockAnchorPosition({
        position: toTextBlockPosition(position, rowStartBaselines),
        span: columns,
        rows: height.rows,
        gridCols,
        gridRows,
        snapToColumns,
        snapToBaseline,
      }),
    },
  }
}
