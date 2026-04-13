import { useCallback } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"

import type { PreviewCanvasInteractionArgs } from "@/hooks/preview-canvas-interaction-types"
import type { DragState as PreviewDragState } from "@/hooks/usePreviewDrag"
import type { PagePoint } from "@/lib/preview-types"
import type { ModulePosition } from "@/lib/types/preview-layout"

type Args<Key extends string, StyleKey extends string> = Pick<
  PreviewCanvasInteractionArgs<Key, StyleKey>,
  | "findTopmostImageAtPoint"
  | "resolveModulePositionAtPagePoint"
  | "clampImageModulePosition"
  | "getGridMetrics"
  | "getImageSpan"
  | "getImageRows"
  | "getImageHeightBaselines"
  | "getImageColorReference"
  | "gridCols"
  | "recordHistoryBeforeChange"
  | "insertImagePlaceholder"
  | "setImageModulePositions"
  | "onSelectLayer"
  | "promoteLayerToTop"
  | "getNextImagePlaceholderId"
  | "ensureImagePlaceholdersVisible"
  | "openImageEditor"
>

type DoubleClickArgs = {
  event: ReactMouseEvent<HTMLCanvasElement>
  pagePoint: PagePoint
}

export function usePreviewImagePlaceholderInteractions<Key extends string, StyleKey extends string>({
  findTopmostImageAtPoint,
  resolveModulePositionAtPagePoint,
  clampImageModulePosition,
  getGridMetrics,
  getImageSpan,
  getImageRows,
  getImageHeightBaselines,
  getImageColorReference,
  gridCols,
  recordHistoryBeforeChange,
  insertImagePlaceholder,
  setImageModulePositions,
  onSelectLayer,
  promoteLayerToTop,
  getNextImagePlaceholderId,
  ensureImagePlaceholdersVisible,
  openImageEditor,
}: Args<Key, StyleKey>) {
  const handleImageDrop = useCallback((drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => {
    const sourceColumns = getImageSpan(drag.key)
    const sourceRows = getImageRows(drag.key)
    const sourceHeightBaselines = getImageHeightBaselines(drag.key)
    const sourceColor = getImageColorReference(drag.key)
    const metrics = getGridMetrics()
    const minCol = -Math.max(0, sourceColumns - 1)
    const minRow = -Math.max(0, metrics.maxBaselineRow)
    const resolvedPosition = {
      col: Math.max(minCol, Math.min(Math.max(0, gridCols - 1), nextPreview.col)),
      row: Math.max(minRow, Math.min(metrics.maxBaselineRow, nextPreview.row)),
    }

    if (copyOnDrop) {
      const newKey = getNextImagePlaceholderId()
      ensureImagePlaceholdersVisible?.()
      recordHistoryBeforeChange()
      insertImagePlaceholder(newKey, {
        position: resolvedPosition,
        columns: sourceColumns,
        rows: sourceRows,
        heightBaselines: sourceHeightBaselines,
        color: sourceColor,
        afterKey: drag.key,
      })
      promoteLayerToTop(newKey)
      onSelectLayer?.(newKey)
      return
    }

    recordHistoryBeforeChange()
    setImageModulePositions((current) => ({
      ...current,
      [drag.key]: resolvedPosition,
    }))
  }, [
    getGridMetrics,
    getImageHeightBaselines,
    getImageColorReference,
    getImageRows,
    getImageSpan,
    getNextImagePlaceholderId,
    gridCols,
    insertImagePlaceholder,
    onSelectLayer,
    promoteLayerToTop,
    recordHistoryBeforeChange,
    setImageModulePositions,
  ])

  const handleImageDoubleClick = useCallback(({ event, pagePoint }: DoubleClickArgs): boolean => {
    if (!(event.shiftKey || event.ctrlKey)) {
      return false
    }

    if (findTopmostImageAtPoint(pagePoint.x, pagePoint.y)) {
      return true
    }

    const rawPosition = resolveModulePositionAtPagePoint(pagePoint.x, pagePoint.y)
    if (!rawPosition) return true

    const newKey = getNextImagePlaceholderId()
    const snapped = clampImageModulePosition(rawPosition, 1, 1)
    ensureImagePlaceholdersVisible?.()
    recordHistoryBeforeChange()
    insertImagePlaceholder(newKey, { position: snapped })
    promoteLayerToTop(newKey)
    openImageEditor(newKey, { recordHistory: false })
    return true
  }, [
    clampImageModulePosition,
    findTopmostImageAtPoint,
    getNextImagePlaceholderId,
    insertImagePlaceholder,
    ensureImagePlaceholdersVisible,
    openImageEditor,
    promoteLayerToTop,
    recordHistoryBeforeChange,
    resolveModulePositionAtPagePoint,
  ])

  return {
    handleImageDrop,
    handleImageDoubleClick,
  }
}
