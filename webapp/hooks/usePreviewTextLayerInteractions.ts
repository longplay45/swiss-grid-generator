import { useCallback } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"

import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import { isImagePlaceholderColor } from "@/lib/config/color-schemes"
import type { PreviewCanvasInteractionArgs } from "@/hooks/preview-canvas-interaction-types"
import type { DragState as PreviewDragState } from "@/hooks/usePreviewDrag"
import {
  clampTextBlockPosition,
  duplicateTextLayerInCollections,
} from "@/lib/preview-text-layer-state"
import type { ModulePosition } from "@/lib/types/preview-layout"

type Args<Key extends string, StyleKey extends string> = Pick<
  PreviewCanvasInteractionArgs<Key, StyleKey>,
  | "blockOrder"
  | "textContent"
  | "getBlockRows"
  | "getBlockHeightBaselines"
  | "getBlockSpan"
  | "getStyleKeyForBlock"
  | "isTextReflowEnabled"
  | "isSyllableDivisionEnabled"
  | "blockCustomSizes"
  | "blockCustomLeadings"
  | "blockTextColors"
  | "baseFont"
  | "gridCols"
  | "gridRows"
  | "getGridMetrics"
  | "recordHistoryBeforeChange"
  | "setBlockCollections"
  | "setBlockCustomSizes"
  | "setBlockCustomLeadings"
  | "setBlockTextColors"
  | "setBlockModulePositions"
  | "onSelectLayer"
  | "promoteLayerToTop"
  | "onRequestNotice"
  | "getNextCustomBlockId"
  | "handleTextCanvasDoubleClick"
  | "closeImageEditorPanel"
>

export function usePreviewTextLayerInteractions<Key extends string, StyleKey extends string>({
  blockOrder,
  textContent,
  getBlockRows,
  getBlockHeightBaselines,
  getBlockSpan,
  getStyleKeyForBlock,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  blockCustomSizes,
  blockCustomLeadings,
  blockTextColors,
  baseFont,
  gridCols,
  gridRows,
  getGridMetrics,
  recordHistoryBeforeChange,
  setBlockCollections,
  setBlockCustomSizes,
  setBlockCustomLeadings,
  setBlockTextColors,
  setBlockModulePositions,
  onSelectLayer,
  promoteLayerToTop,
  onRequestNotice,
  getNextCustomBlockId,
  handleTextCanvasDoubleClick,
  closeImageEditorPanel,
}: Args<Key, StyleKey>) {
  const handleTextDrop = useCallback((drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => {
    if (copyOnDrop) {
      const sourceText = textContent[drag.key] ?? ""
      const maxParagraphCount = gridCols * gridRows
      const activeParagraphCount = blockOrder.filter((key) => (textContent[key] ?? "").trim().length > 0).length
      if (sourceText.trim().length > 0 && activeParagraphCount >= maxParagraphCount) {
        onRequestNotice?.({
          title: "Paragraph Limit Reached",
          message: `Maximum paragraphs reached (${maxParagraphCount}).`,
        })
        return
      }

      const styleKey = getStyleKeyForBlock(drag.key)
      const sourceRows = getBlockRows(drag.key)
      const sourceHeightBaselines = getBlockHeightBaselines(drag.key)
      const sourceReflow = isTextReflowEnabled(drag.key)
      const sourceSyllableDivision = isSyllableDivisionEnabled(drag.key)
      const sourceSpan = getBlockSpan(drag.key)
      const sourceCustomSize = blockCustomSizes[drag.key]
      const sourceCustomLeading = blockCustomLeadings[drag.key]
      const sourceTextColor = blockTextColors[drag.key]
      const metrics = getGridMetrics()
      const resolvedPosition = clampTextBlockPosition({
        position: nextPreview,
        span: sourceSpan,
        gridCols,
        maxBaselineRow: metrics.maxBaselineRow,
      })
      const newKey = getNextCustomBlockId()

      recordHistoryBeforeChange()
      setBlockCollections((current) => duplicateTextLayerInCollections(current, {
        sourceKey: drag.key,
        newKey,
        styleKey,
        gridCols,
        gridRows,
        columns: sourceSpan,
        rows: sourceRows,
        heightBaselines: sourceHeightBaselines,
        reflow: sourceReflow,
        syllableDivision: sourceSyllableDivision,
        position: resolvedPosition,
        rowStartBaselines: metrics.rowStartBaselines,
        baseFont,
      }))
      setBlockCustomSizes((current) => {
        const next = { ...current }
        if (styleKey === "fx" && typeof sourceCustomSize === "number" && Number.isFinite(sourceCustomSize) && sourceCustomSize > 0) {
          next[newKey] = clampFxSize(sourceCustomSize)
        } else {
          delete next[newKey]
        }
        return next
      })
      setBlockCustomLeadings((current) => {
        const next = { ...current }
        if (styleKey === "fx" && typeof sourceCustomLeading === "number" && Number.isFinite(sourceCustomLeading) && sourceCustomLeading > 0) {
          next[newKey] = clampFxLeading(sourceCustomLeading)
        } else {
          delete next[newKey]
        }
        return next
      })
      setBlockTextColors((current) => {
        const next = { ...current }
        if (isImagePlaceholderColor(sourceTextColor)) next[newKey] = sourceTextColor
        else delete next[newKey]
        return next
      })
      promoteLayerToTop(newKey)
      onSelectLayer?.(newKey)
      return
    }

    recordHistoryBeforeChange()
    const span = getBlockSpan(drag.key)
    const metrics = getGridMetrics()
    setBlockModulePositions((current) => ({
      ...current,
      [drag.key]: clampTextBlockPosition({
        position: nextPreview,
        span,
        gridCols,
        maxBaselineRow: metrics.maxBaselineRow,
      }),
    }))
  }, [
    baseFont,
    blockCustomLeadings,
    blockCustomSizes,
    blockOrder,
    blockTextColors,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getGridMetrics,
    getNextCustomBlockId,
    getStyleKeyForBlock,
    gridCols,
    gridRows,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    onRequestNotice,
    onSelectLayer,
    promoteLayerToTop,
    recordHistoryBeforeChange,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockCustomSizes,
    setBlockModulePositions,
    setBlockTextColors,
    textContent,
  ])

  const openTextEditorFromCanvas = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    closeImageEditorPanel()
    handleTextCanvasDoubleClick(event)
  }, [closeImageEditorPanel, handleTextCanvasDoubleClick])

  return {
    handleTextDrop,
    openTextEditorFromCanvas,
  }
}
