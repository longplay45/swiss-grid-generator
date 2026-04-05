import { useCallback, useEffect, useMemo, useState } from "react"

import { useImagePlaceholderState } from "@/hooks/useImagePlaceholderState"
import { usePreviewTextBlockState } from "@/hooks/usePreviewTextBlockState"
import { usePreviewTextBlockOverrides } from "@/hooks/usePreviewTextBlockOverrides"
import { type Updater } from "@/hooks/useStateCommands"
import {
  getDefaultImagePlaceholderColor,
  getDefaultTextSchemeColor,
  getImageColorScheme,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { type FontFamily } from "@/lib/config/fonts"
import type { GridResult } from "@/lib/grid-calculator"
import { reconcileLayerOrder } from "@/lib/preview-layer-order"
import {
  mapAbsolutePositionsToTextBlockPositions,
  mapTextBlockPositionsToAbsolute,
} from "@/lib/text-block-position"
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
  const {
    blockCollectionsState,
    setBlockCollections,
    blockOrder,
    textContent,
    blockTextEdited,
    styleAssignments,
    blockModulePositions: blockGridPositions,
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
    setBlockModulePositions: setBlockGridPositions,
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
  } = usePreviewTextBlockState({
    result,
    baseFont,
  })
  const imagePalette = useMemo(
    () => getImageColorScheme(imageColorScheme).colors,
    [imageColorScheme],
  )
  const rowStartBaselines = useMemo(
    () => getGridMetrics().rowStartBaselines,
    [getGridMetrics],
  )
  const blockModulePositions = useMemo(
    () => mapTextBlockPositionsToAbsolute(blockGridPositions, rowStartBaselines),
    [blockGridPositions, rowStartBaselines],
  )
  const setBlockModulePositions = useCallback((next: Updater<Partial<Record<BlockId, ModulePosition>>>) => {
    const activeRowStartBaselines = getGridMetrics().rowStartBaselines
    setBlockGridPositions((prev) => {
      const previousAbsolute = mapTextBlockPositionsToAbsolute(prev, activeRowStartBaselines)
      const resolvedNext = typeof next === "function" ? next(previousAbsolute) : next
      return mapAbsolutePositionsToTextBlockPositions(resolvedNext, activeRowStartBaselines)
    })
  }, [getGridMetrics, setBlockGridPositions])
  const defaultImageColor = useMemo(
    () => getDefaultImagePlaceholderColor(imageColorScheme),
    [imageColorScheme],
  )
  const defaultTextColor = useMemo(
    () => getDefaultTextSchemeColor(imageColorScheme),
    [imageColorScheme],
  )
  const {
    blockCustomSizes,
    setBlockCustomSizes,
    blockCustomLeadings,
    setBlockCustomLeadings,
    blockTextColors,
    setBlockTextColors,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    buildTextOverridesSnapshot,
    applyTextOverridesSnapshot,
  } = usePreviewTextBlockOverrides<BlockId, TypographyStyleKey>({
    blockOrder,
    styleAssignments,
    defaultTextColor,
    gridUnit: result.grid.gridUnit,
    getStyleSize,
    getStyleLeading,
    typographyStyles: result.typography.styles,
  })

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

  const buildSnapshot = useCallback((): PreviewLayoutState => ({
    ...buildTextSnapshot(),
    ...buildTextOverridesSnapshot(),
    layerOrder: [...resolvedLayerOrder],
    ...buildImageSnapshotState(),
  }), [
    buildImageSnapshotState,
    buildTextOverridesSnapshot,
    buildTextSnapshot,
    resolvedLayerOrder,
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

  const applySnapshot = useCallback((snapshot: PreviewLayoutState) => {
    applyTextSnapshot(snapshot)
    applyImageSnapshot(snapshot)
    applyLayerOrderSnapshot(snapshot)
    applyTextOverridesSnapshot(snapshot)
  }, [applyImageSnapshot, applyLayerOrderSnapshot, applyTextOverridesSnapshot, applyTextSnapshot])

  return {
    blockCollectionsState,
    setBlockCollections,
    blockOrder,
    textContent,
    blockTextEdited,
    styleAssignments,
    blockGridPositions,
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
    getBlockFontWeight,
    isBlockOpticalKerningEnabled,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    isBlockBold,
    isBlockItalic,
    getBlockRotation,
    buildSnapshot,
    applyLayerOrderSnapshot,
    applyCustomSizeSnapshot: applyTextOverridesSnapshot,
    applySnapshot,
  }
}
