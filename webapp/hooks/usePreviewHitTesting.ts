import { useCallback, useMemo } from "react"
import type { RefObject } from "react"

import type { BlockRect, PagePoint } from "@/lib/preview-types"
import type { ModulePosition } from "@/lib/types/preview-layout"

import type { PreviewGridMetrics } from "@/hooks/usePreviewGeometry"

type Args<Key extends string> = {
  blockRectsRef: RefObject<Record<Key, BlockRect>>
  imageRectsRef: RefObject<Record<Key, BlockRect>>
  resolvedLayerOrder: readonly Key[]
  imageOrder: readonly Key[]
  showImagePlaceholders: boolean
  getGridMetrics: () => PreviewGridMetrics
  getPlacementSpan: (key: Key) => number
  toPagePointFromClient: (clientX: number, clientY: number) => PagePoint | null
}

function isPointWithinRect(pageX: number, pageY: number, rect: BlockRect | undefined): boolean {
  if (!rect || rect.width <= 0 || rect.height <= 0) return false
  return (
    pageX >= rect.x
    && pageX <= rect.x + rect.width
    && pageY >= rect.y
    && pageY <= rect.y + rect.height
  )
}

export function usePreviewHitTesting<Key extends string>({
  blockRectsRef,
  imageRectsRef,
  resolvedLayerOrder,
  imageOrder,
  showImagePlaceholders,
  getGridMetrics,
  getPlacementSpan,
  toPagePointFromClient,
}: Args<Key>) {
  const imageKeySet = useMemo(() => new Set(imageOrder), [imageOrder])

  const clampModulePosition = useCallback((position: ModulePosition, key: Key): ModulePosition => {
    const metrics = getGridMetrics()
    const span = getPlacementSpan(key)
    const maxCol = Math.max(0, metrics.gridCols - span)
    return {
      col: Math.max(0, Math.min(maxCol, position.col)),
      row: Math.max(0, Math.min(metrics.maxBaselineRow, position.row)),
    }
  }, [getGridMetrics, getPlacementSpan])

  const clampBaselinePosition = useCallback((position: ModulePosition, key: Key): ModulePosition => {
    const metrics = getGridMetrics()
    const span = getPlacementSpan(key)
    const minCol = -Math.max(0, span - 1)
    const maxCol = Math.max(0, metrics.gridCols - 1)
    const minRow = -Math.max(0, metrics.maxBaselineRow)
    return {
      col: Math.max(minCol, Math.min(maxCol, position.col)),
      row: Math.max(minRow, Math.min(metrics.maxBaselineRow, position.row)),
    }
  }, [getGridMetrics, getPlacementSpan])

  const snapToModule = useCallback((pageX: number, pageY: number, key: Key): ModulePosition => {
    const metrics = getGridMetrics()
    const rawCol = metrics.getNearestCol(pageX)
    const moduleIndex = metrics.getNearestRowIndex(pageY)
    const rawRow = metrics.getRowStartBaseline(moduleIndex)
    return clampModulePosition({ col: rawCol, row: rawRow }, key)
  }, [clampModulePosition, getGridMetrics])

  const snapToBaseline = useCallback((pageX: number, pageY: number, key: Key): ModulePosition => {
    const metrics = getGridMetrics()
    const rawCol = metrics.getNearestCol(pageX)
    const rawRow = Math.round((pageY - metrics.baselineOriginTop) / metrics.baselineStep)
    return clampBaselinePosition({ col: rawCol, row: rawRow }, key)
  }, [clampBaselinePosition, getGridMetrics])

  const findTopmostLayerAtPoint = useCallback((pageX: number, pageY: number): Key | null => {
    for (let index = resolvedLayerOrder.length - 1; index >= 0; index -= 1) {
      const key = resolvedLayerOrder[index]
      const isImage = imageKeySet.has(key)
      if (isImage && !showImagePlaceholders) continue
      const rect = isImage ? imageRectsRef.current[key] : blockRectsRef.current[key]
      if (isPointWithinRect(pageX, pageY, rect)) {
        return key
      }
    }
    return null
  }, [blockRectsRef, imageKeySet, imageRectsRef, resolvedLayerOrder, showImagePlaceholders])

  const findTopmostBlockAtPoint = useCallback((pageX: number, pageY: number): Key | null => {
    const key = findTopmostLayerAtPoint(pageX, pageY)
    if (!key || imageKeySet.has(key)) return null
    return key
  }, [findTopmostLayerAtPoint, imageKeySet])

  const findTopmostImageAtPoint = useCallback((pageX: number, pageY: number): Key | null => {
    const key = findTopmostLayerAtPoint(pageX, pageY)
    if (!key || !imageKeySet.has(key)) return null
    return key
  }, [findTopmostLayerAtPoint, imageKeySet])

  const findTopmostDraggableAtPoint = useCallback((pageX: number, pageY: number): Key | null => (
    findTopmostLayerAtPoint(pageX, pageY)
  ), [findTopmostLayerAtPoint])

  const resolveSelectedLayerAtClientPoint = useCallback((clientX: number, clientY: number): Key | null => {
    const pagePoint = toPagePointFromClient(clientX, clientY)
    if (!pagePoint) return null
    return findTopmostDraggableAtPoint(pagePoint.x, pagePoint.y)
  }, [findTopmostDraggableAtPoint, toPagePointFromClient])

  return {
    clampModulePosition,
    clampBaselinePosition,
    snapToModule,
    snapToBaseline,
    findTopmostLayerAtPoint,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    findTopmostDraggableAtPoint,
    resolveSelectedLayerAtClientPoint,
  }
}
