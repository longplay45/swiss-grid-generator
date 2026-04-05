import { useCallback } from "react"

import type { BlockEditorTextAlign } from "@/components/editor/block-editor-types"
import { useLayoutSnapshot } from "@/hooks/useLayoutSnapshot"
import { useStateCommands, type Updater } from "@/hooks/useStateCommands"
import { clampRotation } from "@/lib/block-constraints"
import {
  getStyleDefaultFontWeight,
  isFontFamily,
  resolveFontVariant,
  type FontFamily,
} from "@/lib/config/fonts"
import {
  BASE_BLOCK_IDS,
  DEFAULT_STYLE_ASSIGNMENTS,
  createDefaultTextContent,
  isBaseBlockId,
} from "@/lib/document-defaults"
import type { GridResult } from "@/lib/grid-calculator"
import type { PreviewTextLayerCollectionsState } from "@/lib/preview-text-layer-state"
import {
  DEFAULT_OPTICAL_KERNING,
  DEFAULT_TRACKING_SCALE,
  normalizeOpticalKerning,
  normalizeTrackingScale,
} from "@/lib/text-rendering"
import { normalizeTextFormatRuns, type TextFormatRun } from "@/lib/text-format-runs"
import { normalizeTextTrackingRuns, type TextTrackingRun } from "@/lib/text-tracking-runs"
import type { PreviewLayoutState as SharedPreviewLayoutState, TextBlockPosition } from "@/lib/types/preview-layout"
import { getDefaultColumnSpan } from "@/lib/text-layout"
import { resolveSyllableDivisionEnabled, resolveTextReflowEnabled } from "@/lib/typography-behavior"

type BlockId = string
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type TextAlignMode = BlockEditorTextAlign
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

export type PreviewTextBlockCollectionsState = PreviewTextLayerCollectionsState<BlockId, TypographyStyleKey>

type Args = {
  result: GridResult
  baseFont: FontFamily
}

function createInitialBlockCollectionsState(): PreviewTextBlockCollectionsState {
  return {
    blockOrder: [...BASE_BLOCK_IDS],
    textContent: createDefaultTextContent() as Record<BlockId, string>,
    blockTextEdited: BASE_BLOCK_IDS.reduce((acc, key) => {
      acc[key] = true
      return acc
    }, {} as Record<BlockId, boolean>),
    styleAssignments: Object.fromEntries(BASE_BLOCK_IDS.map((key) => [key, key])) as Record<BlockId, TypographyStyleKey>,
    blockModulePositions: {},
    blockColumnSpans: {},
    blockRowSpans: {},
    blockTextAlignments: {},
    blockTextReflow: {},
    blockSyllableDivision: {},
    blockFontFamilies: {},
    blockFontWeights: {},
    blockOpticalKerning: {},
    blockTrackingScales: {},
    blockTrackingRuns: {},
    blockTextFormatRuns: {},
    blockItalic: {},
    blockRotations: {},
  }
}

export function usePreviewTextBlockState({
  result,
  baseFont,
}: Args) {
  const {
    state: blockCollectionsState,
    merge: setBlockCollections,
    setField: setBlockCollectionField,
  } = useStateCommands<PreviewTextBlockCollectionsState>(createInitialBlockCollectionsState)
  const {
    blockOrder,
    textContent,
    blockTextEdited,
    styleAssignments,
    blockModulePositions,
    blockColumnSpans,
    blockRowSpans,
    blockTextAlignments,
    blockTextReflow,
    blockSyllableDivision,
    blockFontFamilies,
    blockFontWeights,
    blockOpticalKerning,
    blockTrackingScales,
    blockTrackingRuns,
    blockTextFormatRuns,
    blockItalic,
    blockRotations,
  } = blockCollectionsState

  const setBlockOrder = useCallback((next: Updater<BlockId[]>) => {
    setBlockCollectionField("blockOrder", next)
  }, [setBlockCollectionField])

  const setTextContent = useCallback((next: Updater<Record<BlockId, string>>) => {
    setBlockCollectionField("textContent", next)
  }, [setBlockCollectionField])

  const setBlockTextEdited = useCallback((next: Updater<Record<BlockId, boolean>>) => {
    setBlockCollectionField("blockTextEdited", next)
  }, [setBlockCollectionField])

  const setStyleAssignments = useCallback((next: Updater<Record<BlockId, TypographyStyleKey>>) => {
    setBlockCollectionField("styleAssignments", next)
  }, [setBlockCollectionField])

  const setBlockColumnSpans = useCallback((next: Updater<Partial<Record<BlockId, number>>>) => {
    setBlockCollectionField("blockColumnSpans", next)
  }, [setBlockCollectionField])

  const setBlockTextAlignments = useCallback((next: Updater<Partial<Record<BlockId, TextAlignMode>>>) => {
    setBlockCollectionField("blockTextAlignments", next)
  }, [setBlockCollectionField])

  const setBlockModulePositions = useCallback((next: Updater<Partial<Record<BlockId, TextBlockPosition>>>) => {
    setBlockCollectionField("blockModulePositions", next)
  }, [setBlockCollectionField])

  const getBlockSpan = useCallback((key: BlockId) => {
    const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, result.settings.gridCols)
    return Math.max(1, Math.min(result.settings.gridCols, raw))
  }, [blockColumnSpans, result.settings.gridCols])

  const getBlockRows = useCallback((key: BlockId) => {
    const raw = blockRowSpans[key] ?? 1
    return Math.max(1, Math.min(result.settings.gridRows, raw))
  }, [blockRowSpans, result.settings.gridRows])

  const getStyleKeyForBlock = useCallback((key: BlockId): TypographyStyleKey => {
    const assigned = styleAssignments[key]
    if (
      assigned === "fx"
      || assigned === "display"
      || assigned === "headline"
      || assigned === "subhead"
      || assigned === "body"
      || assigned === "caption"
    ) {
      return assigned
    }
    return isBaseBlockId(key) ? DEFAULT_STYLE_ASSIGNMENTS[key] : "body"
  }, [styleAssignments])

  const isTextReflowEnabled = useCallback((key: BlockId) => {
    const styleKey = getStyleKeyForBlock(key)
    return resolveTextReflowEnabled(key, styleKey, getBlockSpan(key), blockTextReflow)
  }, [blockTextReflow, getBlockSpan, getStyleKeyForBlock])

  const isSyllableDivisionEnabled = useCallback((key: BlockId) => {
    const styleKey = getStyleKeyForBlock(key)
    return resolveSyllableDivisionEnabled(key, styleKey, blockSyllableDivision)
  }, [blockSyllableDivision, getStyleKeyForBlock])

  const getBlockFont = useCallback((key: BlockId): FontFamily => {
    return blockFontFamilies[key] ?? baseFont
  }, [baseFont, blockFontFamilies])

  const getResolvedFontVariantForBlock = useCallback((key: BlockId) => {
    const styleKey = getStyleKeyForBlock(key)
    const requestedWeight = blockFontWeights[key] ?? getStyleDefaultFontWeight(result.typography.styles[styleKey]?.weight)
    const requestedItalic = (blockItalic[key] ?? result.typography.styles[styleKey]?.blockItalic) === true
    return resolveFontVariant(getBlockFont(key), requestedWeight, requestedItalic)
  }, [blockFontWeights, blockItalic, getBlockFont, getStyleKeyForBlock, result.typography.styles])

  const isBlockOpticalKerningEnabled = useCallback((key: BlockId): boolean => {
    return normalizeOpticalKerning(blockOpticalKerning[key] ?? DEFAULT_OPTICAL_KERNING)
  }, [blockOpticalKerning])

  const getBlockTrackingScale = useCallback((key: BlockId): number => {
    return normalizeTrackingScale(blockTrackingScales[key] ?? DEFAULT_TRACKING_SCALE)
  }, [blockTrackingScales])

  const getBlockTrackingRuns = useCallback((key: BlockId): TextTrackingRun[] => {
    return normalizeTextTrackingRuns(
      textContent[key] ?? "",
      blockTrackingRuns[key],
      getBlockTrackingScale(key),
    )
  }, [blockTrackingRuns, getBlockTrackingScale, textContent])

  const getStyleSize = useCallback((styleKey: TypographyStyleKey): number => {
    const fallback = result.typography.styles.body?.size ?? result.grid.gridUnit
    return result.typography.styles[styleKey]?.size ?? fallback
  }, [result.grid.gridUnit, result.typography.styles])

  const getStyleLeading = useCallback((styleKey: TypographyStyleKey): number => {
    const fallback = result.typography.styles.body?.leading ?? result.grid.gridUnit
    return result.typography.styles[styleKey]?.leading ?? fallback
  }, [result.grid.gridUnit, result.typography.styles])

  const isBlockBold = useCallback((key: BlockId): boolean => {
    return getResolvedFontVariantForBlock(key).weight >= 700
  }, [getResolvedFontVariantForBlock])

  const isBlockItalic = useCallback((key: BlockId): boolean => {
    return getResolvedFontVariantForBlock(key).italic
  }, [getResolvedFontVariantForBlock])

  const getBlockFontWeight = useCallback((key: BlockId): number => {
    return getResolvedFontVariantForBlock(key).weight
  }, [getResolvedFontVariantForBlock])

  const getBlockRotation = useCallback((key: BlockId): number => {
    const raw = blockRotations[key]
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 0
    return clampRotation(raw)
  }, [blockRotations])

  const getBlockTextFormatRuns = useCallback((key: BlockId, color: string): TextFormatRun<TypographyStyleKey, FontFamily>[] => {
    const styleKey = getStyleKeyForBlock(key)
    const fontFamily = getBlockFont(key)
    const fontWeight = getBlockFontWeight(key)
    const italic = isBlockItalic(key)
    return normalizeTextFormatRuns(
      textContent[key] ?? "",
      blockTextFormatRuns[key],
      {
        fontFamily,
        fontWeight,
        italic,
        styleKey,
        color,
      },
    )
  }, [
    blockTextFormatRuns,
    getBlockFont,
    getBlockFontWeight,
    getStyleKeyForBlock,
    isBlockItalic,
    textContent,
  ])

  const { buildSnapshot: buildTextSnapshot, applySnapshot: applyTextSnapshot } = useLayoutSnapshot<
    BlockId,
    TypographyStyleKey,
    FontFamily,
    TextAlignMode,
    TextBlockPosition,
    PreviewLayoutState
  >({
    state: blockCollectionsState,
    gridCols: result.settings.gridCols,
    baseFont,
    getDefaultColumnSpan,
    getBlockRows,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    getBlockFontWeight,
    isBlockOpticalKerningEnabled,
    getBlockTrackingScale,
    isBlockItalic,
    getBlockRotation,
    isFontFamily,
    toSnapshot: (value) => value as PreviewLayoutState,
    fromSnapshot: (snapshot) => ({
      blockOrder: [...snapshot.blockOrder],
      textContent: { ...snapshot.textContent },
      blockTextEdited: { ...snapshot.blockTextEdited },
      styleAssignments: { ...snapshot.styleAssignments },
      blockFontFamilies: { ...(snapshot.blockFontFamilies ?? {}) },
      blockFontWeights: { ...(snapshot.blockFontWeights ?? {}) },
      blockOpticalKerning: { ...(snapshot.blockOpticalKerning ?? {}) },
      blockTrackingScales: { ...(snapshot.blockTrackingScales ?? {}) },
      blockTrackingRuns: { ...(snapshot.blockTrackingRuns ?? {}) },
      blockTextFormatRuns: { ...(snapshot.blockTextFormatRuns ?? {}) },
      blockItalic: { ...(snapshot.blockItalic ?? {}) },
      blockRotations: { ...(snapshot.blockRotations ?? {}) },
      blockColumnSpans: { ...snapshot.blockColumnSpans },
      blockRowSpans: { ...(snapshot.blockRowSpans ?? {}) },
      blockTextAlignments: { ...snapshot.blockTextAlignments },
      blockTextReflow: { ...(snapshot.blockTextReflow ?? {}) },
      blockSyllableDivision: { ...(snapshot.blockSyllableDivision ?? {}) },
      blockModulePositions: { ...snapshot.blockModulePositions },
    }),
    setState: setBlockCollections,
  })

  return {
    blockCollectionsState,
    setBlockCollections,
    blockOrder,
    textContent,
    blockTextEdited,
    styleAssignments,
    blockModulePositions,
    blockColumnSpans,
    blockRowSpans,
    blockTextAlignments,
    blockTextReflow,
    blockSyllableDivision,
    blockFontFamilies,
    blockFontWeights,
    blockOpticalKerning,
    blockTrackingScales,
    blockTrackingRuns,
    blockTextFormatRuns,
    blockItalic,
    blockRotations,
    setBlockOrder,
    setTextContent,
    setBlockTextEdited,
    setStyleAssignments,
    setBlockColumnSpans,
    setBlockTextAlignments,
    setBlockModulePositions,
    getBlockSpan,
    getBlockRows,
    getStyleKeyForBlock,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    getBlockFont,
    getStyleSize,
    getStyleLeading,
    getBlockFontWeight,
    isBlockOpticalKerningEnabled,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    isBlockBold,
    isBlockItalic,
    getBlockRotation,
    buildTextSnapshot,
    applyTextSnapshot,
  }
}
