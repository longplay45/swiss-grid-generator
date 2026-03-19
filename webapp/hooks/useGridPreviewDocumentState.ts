import { useCallback, useEffect, useMemo, useState } from "react"

import { useImagePlaceholderState } from "@/hooks/useImagePlaceholderState"
import { usePreviewTextBlockState } from "@/hooks/usePreviewTextBlockState"
import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import {
  getDefaultImagePlaceholderColor,
  getDefaultTextSchemeColor,
  getImageColorScheme,
  isImagePlaceholderColor,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { type FontFamily } from "@/lib/config/fonts"
import type { GridResult } from "@/lib/grid-calculator"
import { reconcileLayerOrder } from "@/lib/preview-layer-order"
import type { ModulePosition, PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { BASE_BLOCK_IDS } from "@/lib/document-defaults"

type BlockId = string
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

type GridMetrics = {
  gridCols: number
  gridRows: number
  maxBaselineRow: number
  rowStartBaselines: number[]
}

type Args = {
  result: GridResult
  baseFont: FontFamily
  imageColorScheme: ImageColorSchemeId
  getGridMetrics: () => GridMetrics
  clampImageBaselinePosition: (position: ModulePosition, columns: number) => ModulePosition
  onImageColorSchemeChange?: (value: ImageColorSchemeId) => void
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
    getBlockSpan,
    getBlockRows,
    getStyleKeyForBlock,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    getBlockFont,
    getStyleSize,
    getStyleLeading,
    isBlockBold,
    isBlockItalic,
    getBlockRotation,
    buildTextSnapshot,
    applyTextSnapshot,
  } = usePreviewTextBlockState({
    result,
    baseFont,
  })
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
