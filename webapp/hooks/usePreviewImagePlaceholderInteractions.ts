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
  | "getImageColorReference"
  | "gridCols"
  | "recordHistoryBeforeChange"
  | "insertImagePlaceholder"
  | "setImageModulePositions"
  | "onSelectLayer"
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
  getImageColorReference,
  gridCols,
  recordHistoryBeforeChange,
  insertImagePlaceholder,
  setImageModulePositions,
  onSelectLayer,
  getNextImagePlaceholderId,
  ensureImagePlaceholdersVisible,
  openImageEditor,
}: Args<Key, StyleKey>) {
  const handleImageDrop = useCallback((drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => {
    const sourceColumns = getImageSpan(drag.key)
    const sourceRows = getImageRows(drag.key)
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
        color: sourceColor,
        afterKey: drag.key,
      })
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
    getImageColorReference,
    getImageRows,
    getImageSpan,
    getNextImagePlaceholderId,
    gridCols,
    insertImagePlaceholder,
    onSelectLayer,
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
    openImageEditor(newKey, { recordHistory: false })
    return true
  }, [
    clampImageModulePosition,
    findTopmostImageAtPoint,
    getNextImagePlaceholderId,
    insertImagePlaceholder,
    ensureImagePlaceholdersVisible,
    openImageEditor,
    recordHistoryBeforeChange,
    resolveModulePositionAtPagePoint,
  ])

  return {
    handleImageDrop,
    handleImageDoubleClick,
  }
}
