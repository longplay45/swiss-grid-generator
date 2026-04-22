import { useCallback, useMemo } from "react"
import type { RefObject } from "react"

import type { BlockRect, BlockRenderPlan, PagePoint } from "@/lib/preview-types"
import type { ModulePosition } from "@/lib/types/preview-layout"

import type { PreviewGridMetrics } from "@/hooks/usePreviewGeometry"
import type { TextBlockDragYMode, TextBlockPlacementOptions } from "@/hooks/preview-canvas-interaction-types"

type Args<Key extends string> = {
  blockRectsRef: RefObject<Record<Key, BlockRect>>
  imageRectsRef: RefObject<Record<Key, BlockRect>>
  previousPlansRef: RefObject<Map<Key, BlockRenderPlan<Key>>>
  resolvedLayerOrder: readonly Key[]
  imageOrder: readonly Key[]
  showImagePlaceholders: boolean
  getGridMetrics: () => PreviewGridMetrics
  getPlacementSpan: (key: Key) => number
  isSnapToColumnsEnabled: (key: Key) => boolean
  isSnapToBaselineEnabled: (key: Key) => boolean
  toPagePointFromClient: (clientX: number, clientY: number) => PagePoint | null
}

const TEXT_LINE_HIT_PADDING_X = 6
const TEXT_LINE_HIT_PADDING_Y = 4

function isPointWithinRect(pageX: number, pageY: number, rect: BlockRect | undefined): boolean {
  if (!rect || rect.width <= 0 || rect.height <= 0) return false
  return (
    pageX >= rect.x
    && pageX <= rect.x + rect.width
    && pageY >= rect.y
    && pageY <= rect.y + rect.height
  )
}

function isPointWithinRenderedLine(
  pageX: number,
  pageY: number,
  line: { left: number; top: number; width: number; height: number },
): boolean {
  return (
    pageX >= line.left - TEXT_LINE_HIT_PADDING_X
    && pageX <= line.left + line.width + TEXT_LINE_HIT_PADDING_X
    && pageY >= line.top - TEXT_LINE_HIT_PADDING_Y
    && pageY <= line.top + line.height + TEXT_LINE_HIT_PADDING_Y
  )
}

export function usePreviewHitTesting<Key extends string>({
  blockRectsRef,
  imageRectsRef,
  previousPlansRef,
  resolvedLayerOrder,
  imageOrder,
  showImagePlaceholders,
  getGridMetrics,
  getPlacementSpan,
  isSnapToColumnsEnabled,
  isSnapToBaselineEnabled,
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

  const resolveTextBlockPlacement = useCallback((
    pageX: number,
    pageY: number,
    key: Key,
    options: TextBlockPlacementOptions = {},
  ): ModulePosition => {
    const metrics = getGridMetrics()
    const span = getPlacementSpan(key)
    const snapToColumns = isSnapToColumnsEnabled(key)
    const snapToBaseline = isSnapToBaselineEnabled(key)
    const dragYMode: TextBlockDragYMode = options.dragYMode ?? (snapToBaseline ? "moduleTop" : "free")
    const minCol = -Math.max(0, span - 1)
    const maxCol = Math.max(0, metrics.gridCols - (snapToColumns ? 1 : 0))
    const minRow = -Math.max(0, metrics.maxBaselineRow)
    const rawCol = snapToColumns
      ? metrics.getNearestCol(pageX)
      : metrics.getInterpolatedCol(pageX)
    const rawRow = dragYMode === "baseline"
      ? Math.round((pageY - metrics.baselineOriginTop) / metrics.baselineStep)
      : dragYMode === "moduleTop"
        ? metrics.getRowStartBaseline(metrics.getNearestRowIndex(pageY))
        : (pageY - metrics.baselineOriginTop) / Math.max(metrics.baselineStep, 0.0001)
    return {
      col: Math.max(minCol, Math.min(maxCol, rawCol)),
      row: Math.max(minRow, Math.min(metrics.maxBaselineRow, rawRow)),
    }
  }, [getGridMetrics, getPlacementSpan, isSnapToBaselineEnabled, isSnapToColumnsEnabled])

  const findTopmostLayerAtPoint = useCallback((pageX: number, pageY: number): Key | null => {
    for (let index = resolvedLayerOrder.length - 1; index >= 0; index -= 1) {
      const key = resolvedLayerOrder[index]
      const isImage = imageKeySet.has(key)
      if (isImage && !showImagePlaceholders) continue

      if (isImage) {
        const rect = imageRectsRef.current[key]
        if (isPointWithinRect(pageX, pageY, rect)) return key
        continue
      }

      const plan = previousPlansRef.current.get(key)
      const lineHit = plan?.renderedLines.some((line) => isPointWithinRenderedLine(pageX, pageY, line)) ?? false
      if (lineHit) {
        return key
      }

      const guideHit = plan?.guideRects.some((guideRect) => isPointWithinRect(pageX, pageY, guideRect)) ?? false
      if (guideHit) {
        return key
      }

      const hasPlan = Boolean(plan)
      if (!hasPlan) {
        const rect = blockRectsRef.current[key]
        if (isPointWithinRect(pageX, pageY, rect)) {
          return key
        }
      }
    }
    return null
  }, [blockRectsRef, imageKeySet, imageRectsRef, previousPlansRef, resolvedLayerOrder, showImagePlaceholders])

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
    resolveTextBlockPlacement,
    findTopmostLayerAtPoint,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    findTopmostDraggableAtPoint,
    resolveSelectedLayerAtClientPoint,
  }
}
