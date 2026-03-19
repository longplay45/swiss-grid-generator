import { useCallback, useEffect, useMemo, useState } from "react"

import type { BlockEditorTextAlign } from "@/components/editor/block-editor-types"
import { useImagePlaceholderState } from "@/hooks/useImagePlaceholderState"
import { useLayoutSnapshot } from "@/hooks/useLayoutSnapshot"
import { useStateCommands } from "@/hooks/useStateCommands"
import { clampFxLeading, clampFxSize, clampRotation } from "@/lib/block-constraints"
import {
  getDefaultImagePlaceholderColor,
  getDefaultTextSchemeColor,
  getImageColorScheme,
  isImagePlaceholderColor,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { isFontFamily, type FontFamily } from "@/lib/config/fonts"
import {
  BASE_BLOCK_IDS,
  DEFAULT_STYLE_ASSIGNMENTS,
  createDefaultTextContent,
  isBaseBlockId,
} from "@/lib/document-defaults"
import type { GridResult } from "@/lib/grid-calculator"
import { reconcileLayerOrder } from "@/lib/preview-layer-order"
import type { ModulePosition, PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { getDefaultColumnSpan } from "@/lib/text-layout"
import { resolveSyllableDivisionEnabled, resolveTextReflowEnabled } from "@/lib/typography-behavior"

type BlockId = string
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type TextAlignMode = BlockEditorTextAlign
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

type GridMetrics = {
  gridCols: number
  gridRows: number
  maxBaselineRow: number
  rowStartBaselines: number[]
}

type BlockCollectionsState = {
  blockOrder: BlockId[]
  textContent: Record<BlockId, string>
  blockTextEdited: Record<BlockId, boolean>
  styleAssignments: Record<BlockId, TypographyStyleKey>
  blockModulePositions: Partial<Record<BlockId, ModulePosition>>
  blockColumnSpans: Partial<Record<BlockId, number>>
  blockRowSpans: Partial<Record<BlockId, number>>
  blockTextAlignments: Partial<Record<BlockId, TextAlignMode>>
  blockTextReflow: Partial<Record<BlockId, boolean>>
  blockSyllableDivision: Partial<Record<BlockId, boolean>>
  blockFontFamilies: Partial<Record<BlockId, FontFamily>>
  blockBold: Partial<Record<BlockId, boolean>>
  blockItalic: Partial<Record<BlockId, boolean>>
  blockRotations: Partial<Record<BlockId, number>>
}

type Args = {
  result: GridResult
  baseFont: FontFamily
  imageColorScheme: ImageColorSchemeId
  getGridMetrics: () => GridMetrics
  clampImageBaselinePosition: (position: ModulePosition, columns: number) => ModulePosition
  onImageColorSchemeChange?: (value: ImageColorSchemeId) => void
}

function createInitialBlockCollectionsState(): BlockCollectionsState {
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
    blockBold: {},
    blockItalic: {},
    blockRotations: {},
  }
}

export function useGridPreviewDocumentState({
  result,
  baseFont,
  imageColorScheme,
  getGridMetrics,
  clampImageBaselinePosition,
  onImageColorSchemeChange,
}: Args) {
  const [layerOrder, setLayerOrder] = useState<BlockId[]>([...BASE_BLOCK_IDS])
  const [blockCustomSizes, setBlockCustomSizes] = useState<Partial<Record<BlockId, number>>>({})
  const [blockCustomLeadings, setBlockCustomLeadings] = useState<Partial<Record<BlockId, number>>>({})
  const [blockTextColors, setBlockTextColors] = useState<Partial<Record<BlockId, string>>>({})
  const {
    state: blockCollectionsState,
    merge: setBlockCollections,
    setField: setBlockCollectionField,
  } = useStateCommands<BlockCollectionsState>(createInitialBlockCollectionsState)
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
    blockBold,
    blockItalic,
    blockRotations,
  } = blockCollectionsState
  const imagePalette = useMemo(
    () => getImageColorScheme(imageColorScheme).colors,
    [imageColorScheme],
  )
  const defaultImageColor = useMemo(
    () => getDefaultImagePlaceholderColor(imageColorScheme),
    [imageColorScheme],
  )
  const defaultTextColor = useMemo(
    () => getDefaultTextSchemeColor(imageColorScheme),
    [imageColorScheme],
  )

  const setBlockOrder = useCallback((next: BlockId[] | ((prev: BlockId[]) => BlockId[])) => {
    setBlockCollectionField("blockOrder", next)
  }, [setBlockCollectionField])

  const setTextContent = useCallback((next: Record<BlockId, string> | ((prev: Record<BlockId, string>) => Record<BlockId, string>)) => {
    setBlockCollectionField("textContent", next)
  }, [setBlockCollectionField])

  const setBlockTextEdited = useCallback((next: Record<BlockId, boolean> | ((prev: Record<BlockId, boolean>) => Record<BlockId, boolean>)) => {
    setBlockCollectionField("blockTextEdited", next)
  }, [setBlockCollectionField])

  const setStyleAssignments = useCallback((next: Record<BlockId, TypographyStyleKey> | ((prev: Record<BlockId, TypographyStyleKey>) => Record<BlockId, TypographyStyleKey>)) => {
    setBlockCollectionField("styleAssignments", next)
  }, [setBlockCollectionField])

  const setBlockColumnSpans = useCallback((next: Partial<Record<BlockId, number>> | ((prev: Partial<Record<BlockId, number>>) => Partial<Record<BlockId, number>>)) => {
    setBlockCollectionField("blockColumnSpans", next)
  }, [setBlockCollectionField])

  const setBlockTextAlignments = useCallback((next: Partial<Record<BlockId, TextAlignMode>> | ((prev: Partial<Record<BlockId, TextAlignMode>>) => Partial<Record<BlockId, TextAlignMode>>)) => {
    setBlockCollectionField("blockTextAlignments", next)
  }, [setBlockCollectionField])

  const setBlockModulePositions = useCallback((next: Partial<Record<BlockId, ModulePosition>> | ((prev: Partial<Record<BlockId, ModulePosition>>) => Partial<Record<BlockId, ModulePosition>>)) => {
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

  const {
    imageOrder,
    setImageOrder,
    imageModulePositions,
    setImageModulePositions,
    setImageColumnSpans,
    setImageRowSpans,
    imageColors,
    setImageColors,
    imageEditorState,
    setImageEditorState,
    getImageSpan,
    getImageRows,
    getImageColorReference,
    getImageColor,
    isImagePlaceholderKey,
    buildImageSnapshotState,
    applyImageSnapshot,
    openImageEditor,
    closeImageEditor,
    insertImagePlaceholder,
    deleteImagePlaceholder,
    handleImageColorSchemeChange,
    resetImageTransientState,
  } = useImagePlaceholderState<BlockId>({
    imageColorScheme,
    defaultImageColor,
    gridCols: result.settings.gridCols,
    gridRows: result.settings.gridRows,
    getGridMetrics,
    clampImageBaselinePosition,
    onImageColorSchemeChange,
  })

  const resolvedLayerOrder = useMemo(
    () => reconcileLayerOrder(layerOrder, blockOrder, imageOrder),
    [blockOrder, imageOrder, layerOrder],
  )

  useEffect(() => {
    setLayerOrder((prev) => {
      const next = reconcileLayerOrder(prev, blockOrder, imageOrder)
      if (prev.length === next.length && prev.every((key, index) => key === next[index])) {
        return prev
      }
      return next
    })
  }, [blockOrder, imageOrder])

  const getPlacementSpan = useCallback((key: BlockId): number => (
    isImagePlaceholderKey(key) ? getImageSpan(key) : getBlockSpan(key)
  ), [getBlockSpan, getImageSpan, isImagePlaceholderKey])

  const getPlacementRows = useCallback((key: BlockId): number => (
    isImagePlaceholderKey(key) ? getImageRows(key) : getBlockRows(key)
  ), [getBlockRows, getImageRows, isImagePlaceholderKey])

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

  const getStyleSize = useCallback((styleKey: TypographyStyleKey): number => {
    const fallback = result.typography.styles.body?.size ?? result.grid.gridUnit
    return result.typography.styles[styleKey]?.size ?? fallback
  }, [result.grid.gridUnit, result.typography.styles])

  const getStyleLeading = useCallback((styleKey: TypographyStyleKey): number => {
    const fallback = result.typography.styles.body?.leading ?? result.grid.gridUnit
    return result.typography.styles[styleKey]?.leading ?? fallback
  }, [result.grid.gridUnit, result.typography.styles])

  const getBlockFontSize = useCallback((key: BlockId, styleKey: TypographyStyleKey): number => {
    const defaultSize = getStyleSize(styleKey)
    if (styleKey !== "fx") return defaultSize
    const raw = blockCustomSizes[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultSize
    return clampFxSize(raw)
  }, [blockCustomSizes, getStyleSize])

  const getBlockBaselineMultiplier = useCallback((key: BlockId, styleKey: TypographyStyleKey): number => {
    const defaultLeading = getStyleLeading(styleKey)
    const defaultMultiplier = result.typography.styles[styleKey]?.baselineMultiplier
      ?? Math.max(0.01, defaultLeading / result.grid.gridUnit)
    if (styleKey !== "fx") return defaultMultiplier
    const raw = blockCustomLeadings[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultMultiplier
    return Math.max(0.01, Math.min(800, raw) / result.grid.gridUnit)
  }, [blockCustomLeadings, getStyleLeading, result.grid.gridUnit, result.typography.styles])

  const getBlockTextColor = useCallback((key: BlockId): string => {
    const raw = blockTextColors[key]
    if (isImagePlaceholderColor(raw)) return raw
    return defaultTextColor
  }, [blockTextColors, defaultTextColor])

  const isBlockBold = useCallback((key: BlockId): boolean => {
    const override = blockBold[key]
    if (override === true || override === false) return override
    return result.typography.styles[getStyleKeyForBlock(key)]?.weight === "Bold"
  }, [blockBold, getStyleKeyForBlock, result.typography.styles])

  const isBlockItalic = useCallback((key: BlockId): boolean => {
    const override = blockItalic[key]
    if (override === true || override === false) return override
    return result.typography.styles[getStyleKeyForBlock(key)]?.blockItalic === true
  }, [blockItalic, getStyleKeyForBlock, result.typography.styles])

  const getBlockRotation = useCallback((key: BlockId): number => {
    const raw = blockRotations[key]
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 0
    return clampRotation(raw)
  }, [blockRotations])

  const { buildSnapshot: buildTextSnapshot, applySnapshot: applyTextSnapshot } = useLayoutSnapshot<
    BlockId,
    TypographyStyleKey,
    FontFamily,
    TextAlignMode,
    ModulePosition,
    PreviewLayoutState
  >({
    state: blockCollectionsState,
    gridCols: result.settings.gridCols,
    baseFont,
    getDefaultColumnSpan,
    getBlockRows,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isBlockBold,
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
      blockBold: { ...(snapshot.blockBold ?? {}) },
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

  const buildSnapshot = useCallback((): PreviewLayoutState => ({
    ...buildTextSnapshot(),
    blockCustomSizes: blockOrder.reduce((acc, key) => {
      const styleKey = styleAssignments[key] ?? "body"
      if (styleKey !== "fx") return acc
      const raw = blockCustomSizes[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
      acc[key] = clampFxSize(raw)
      return acc
    }, {} as Partial<Record<BlockId, number>>),
    blockCustomLeadings: blockOrder.reduce((acc, key) => {
      const styleKey = styleAssignments[key] ?? "body"
      if (styleKey !== "fx") return acc
      const raw = blockCustomLeadings[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
      acc[key] = clampFxLeading(raw)
      return acc
    }, {} as Partial<Record<BlockId, number>>),
    blockTextColors: blockOrder.reduce((acc, key) => {
      const raw = blockTextColors[key]
      if (!isImagePlaceholderColor(raw)) return acc
      acc[key] = raw
      return acc
    }, {} as Partial<Record<BlockId, string>>),
    layerOrder: [...resolvedLayerOrder],
    ...buildImageSnapshotState(),
  }), [
    blockCustomLeadings,
    blockCustomSizes,
    blockOrder,
    blockTextColors,
    buildImageSnapshotState,
    buildTextSnapshot,
    resolvedLayerOrder,
    styleAssignments,
  ])

  const applyLayerOrderSnapshot = useCallback((snapshot: PreviewLayoutState) => {
    const rawLayerOrder = Array.isArray(snapshot.layerOrder) ? snapshot.layerOrder : []
    const normalizedLayerOrder = rawLayerOrder
      .filter((key): key is BlockId => typeof key === "string" && key.length > 0)
      .filter((key, index, source) => source.indexOf(key) === index)
    const fallbackBlockOrder = (Array.isArray(snapshot.blockOrder) ? snapshot.blockOrder : [])
      .filter((key): key is BlockId => typeof key === "string" && key.length > 0)
    const fallbackImageOrder = (Array.isArray(snapshot.imageOrder) ? snapshot.imageOrder : [])
      .filter((key): key is BlockId => typeof key === "string" && key.length > 0)
    setLayerOrder(reconcileLayerOrder(normalizedLayerOrder, fallbackBlockOrder, fallbackImageOrder))
  }, [])

  const applyCustomSizeSnapshot = useCallback((snapshot: PreviewLayoutState) => {
    const normalizedOrder = (Array.isArray(snapshot.blockOrder) ? snapshot.blockOrder : [])
      .filter((key): key is BlockId => typeof key === "string" && key.length > 0)
    const nextSizes = normalizedOrder.reduce((acc, key) => {
      const styleKey = snapshot.styleAssignments?.[key] ?? "body"
      if (styleKey !== "fx") return acc
      const raw = snapshot.blockCustomSizes?.[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
      acc[key] = clampFxSize(raw)
      return acc
    }, {} as Partial<Record<BlockId, number>>)
    const nextLeadings = normalizedOrder.reduce((acc, key) => {
      const styleKey = snapshot.styleAssignments?.[key] ?? "body"
      if (styleKey !== "fx") return acc
      const raw = snapshot.blockCustomLeadings?.[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
      acc[key] = clampFxLeading(raw)
      return acc
    }, {} as Partial<Record<BlockId, number>>)
    const nextTextColors = normalizedOrder.reduce((acc, key) => {
      const raw = snapshot.blockTextColors?.[key]
      if (!isImagePlaceholderColor(raw)) return acc
      acc[key] = raw
      return acc
    }, {} as Partial<Record<BlockId, string>>)
    setBlockCustomSizes(nextSizes)
    setBlockCustomLeadings(nextLeadings)
    setBlockTextColors(nextTextColors)
  }, [])

  const applySnapshot = useCallback((snapshot: PreviewLayoutState) => {
    applyTextSnapshot(snapshot)
    applyImageSnapshot(snapshot)
    applyLayerOrderSnapshot(snapshot)
    applyCustomSizeSnapshot(snapshot)
  }, [applyCustomSizeSnapshot, applyImageSnapshot, applyLayerOrderSnapshot, applyTextSnapshot])

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
    blockBold,
    blockItalic,
    blockRotations,
    setBlockOrder,
    setTextContent,
    setBlockTextEdited,
    setStyleAssignments,
    setBlockColumnSpans,
    setBlockTextAlignments,
    setBlockModulePositions,
    layerOrder,
    setLayerOrder,
    resolvedLayerOrder,
    blockCustomSizes,
    setBlockCustomSizes,
    blockCustomLeadings,
    setBlockCustomLeadings,
    blockTextColors,
    setBlockTextColors,
    imagePalette,
    defaultImageColor,
    defaultTextColor,
    imageOrder,
    setImageOrder,
    imageModulePositions,
    setImageModulePositions,
    setImageColumnSpans,
    setImageRowSpans,
    imageColors,
    setImageColors,
    imageEditorState,
    setImageEditorState,
    getImageSpan,
    getImageRows,
    getImageColorReference,
    getImageColor,
    isImagePlaceholderKey,
    buildImageSnapshotState,
    applyImageSnapshot,
    openImageEditorState: openImageEditor,
    closeImageEditorState: closeImageEditor,
    insertImagePlaceholder,
    deleteImagePlaceholderState: deleteImagePlaceholder,
    handleImageColorSchemeChange,
    resetImageTransientState,
    getBlockSpan,
    getBlockRows,
    getPlacementSpan,
    getPlacementRows,
    getStyleKeyForBlock,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    getBlockFont,
    getStyleSize,
    getStyleLeading,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    isBlockBold,
    isBlockItalic,
    getBlockRotation,
    buildSnapshot,
    applyLayerOrderSnapshot,
    applyCustomSizeSnapshot,
    applySnapshot,
  }
}
