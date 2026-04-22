import { useCallback, useEffect, useRef, useState } from "react"
import type { MutableRefObject, PointerEvent as ReactPointerEvent, RefObject } from "react"

import { PREVIEW_DRAG_MOVE_THRESHOLD_PX } from "@/lib/preview-interaction-constants"
import type { BlockRect, PagePoint } from "@/lib/preview-types"
import type { ModulePosition } from "@/lib/types/layout-primitives"

export type DragModulePosition = ModulePosition

export type DragState<Key extends string = string> = {
  key: Key
  startPageX: number
  startPageY: number
  pointerOffsetX: number
  pointerOffsetY: number
  preview: DragModulePosition
  moved: boolean
  copyOnDrop: boolean
  detached?: boolean
}

type Args<Key extends string, DragPreviewContext = void> = {
  showTypography: boolean
  isEditorOpen: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
  blockRectsRef: RefObject<Record<Key, BlockRect>>
  getBlockRect?: (key: Key) => BlockRect | null
  blockModulePositions: Partial<Record<Key, DragModulePosition>>
  findTopmostBlockAtPoint: (x: number, y: number) => Key | null
  toPagePoint: (x: number, y: number) => PagePoint | null
  resolveDragPreviewPosition: (
    x: number,
    y: number,
    key: Key,
    context?: DragPreviewContext,
  ) => DragModulePosition
  getDragPreviewContext?: (
    event: ReactPointerEvent<HTMLCanvasElement>,
    key: Key,
  ) => DragPreviewContext
  onDrop: (drag: DragState<Key>, nextPreview: DragModulePosition, copyOnDrop: boolean) => void
  onClearHover: () => void
  touchLongPressMs: number
  touchCancelDistancePx: number
  dragEndedAtRef?: MutableRefObject<number>
}

export function usePreviewDrag<Key extends string, DragPreviewContext = void>({
  showTypography,
  isEditorOpen,
  canvasRef,
  blockRectsRef,
  getBlockRect,
  blockModulePositions,
  findTopmostBlockAtPoint,
  toPagePoint,
  resolveDragPreviewPosition,
  getDragPreviewContext,
  onDrop,
  onClearHover,
  touchLongPressMs,
  touchCancelDistancePx,
  dragEndedAtRef: externalDragEndedAtRef,
}: Args<Key, DragPreviewContext>) {
  const [dragState, setDragState] = useState<DragState<Key> | null>(null)
  const internalDragEndedAtRef = useRef<number>(0)
  const dragEndedAtRef = externalDragEndedAtRef ?? internalDragEndedAtRef
  const dragRafRef = useRef<number | null>(null)
  const pendingDragPreviewRef = useRef<{ preview: DragModulePosition; moved: boolean; copyOnDrop: boolean } | null>(null)
  const activeDragPointerIdRef = useRef<number | null>(null)
  const touchLongPressTimerRef = useRef<number | null>(null)
  const touchPendingDragRef = useRef<{
    pointerId: number
    dragState: DragState<Key>
    startClientX: number
    startClientY: number
  } | null>(null)

  const clearPendingTouchLongPress = useCallback(() => {
    if (touchLongPressTimerRef.current !== null) {
      window.clearTimeout(touchLongPressTimerRef.current)
      touchLongPressTimerRef.current = null
    }
    touchPendingDragRef.current = null
  }, [])

  const finishDrag = useCallback(() => {
    if (dragRafRef.current !== null) {
      window.cancelAnimationFrame(dragRafRef.current)
      dragRafRef.current = null
    }
    const pending = pendingDragPreviewRef.current
    pendingDragPreviewRef.current = null
    if (dragState) {
      const nextPreview = pending?.preview ?? dragState.preview
      const nextMoved = pending?.moved ?? dragState.moved
      const nextCopyOnDrop = pending?.copyOnDrop ?? dragState.copyOnDrop
      if (nextMoved) {
        onDrop(dragState, nextPreview, nextCopyOnDrop)
        dragEndedAtRef.current = Date.now()
      }
    }
    setDragState(null)
    activeDragPointerIdRef.current = null
  }, [dragState, onDrop])

  useEffect(() => {
    return () => {
      clearPendingTouchLongPress()
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current)
        dragRafRef.current = null
      }
      pendingDragPreviewRef.current = null
      activeDragPointerIdRef.current = null
    }
  }, [clearPendingTouchLongPress])

  const handleCanvasPointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragState?.detached) {
      if (event.pointerType === "mouse" && event.button !== 0) return
      event.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const point = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
      if (!point) return
      const dragPreviewContext = getDragPreviewContext?.(event, dragState.key)
      const preview = resolveDragPreviewPosition(
        point.x - dragState.pointerOffsetX,
        point.y - dragState.pointerOffsetY,
        dragState.key,
        dragPreviewContext,
      )
      pendingDragPreviewRef.current = { preview, moved: true, copyOnDrop: true }
      finishDrag()
      return
    }
    if (!showTypography || isEditorOpen) return
    if (event.pointerType === "mouse" && event.button !== 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    const key = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (!key) return
    const block = getBlockRect ? getBlockRect(key) : blockRectsRef.current[key]
    if (!block) return
    event.preventDefault()

    const snapped = blockModulePositions[key] ?? resolveDragPreviewPosition(block.x, block.y, key)
    const nextDragState: DragState<Key> = {
      key,
      startPageX: pagePoint.x,
      startPageY: pagePoint.y,
      pointerOffsetX: pagePoint.x - block.x,
      pointerOffsetY: pagePoint.y - block.y,
      preview: snapped,
      moved: false,
      copyOnDrop: event.pointerType !== "touch" && event.altKey,
    }

    const pointerId = event.pointerId
    if (event.pointerType === "touch") {
      clearPendingTouchLongPress()
      touchPendingDragRef.current = {
        pointerId,
        dragState: nextDragState,
        startClientX: event.clientX,
        startClientY: event.clientY,
      }
      touchLongPressTimerRef.current = window.setTimeout(() => {
        const pending = touchPendingDragRef.current
        if (!pending || pending.pointerId !== pointerId) return
        touchPendingDragRef.current = null
        touchLongPressTimerRef.current = null
        setDragState(pending.dragState)
        activeDragPointerIdRef.current = pending.pointerId
        const targetCanvas = canvasRef.current
        if (targetCanvas) {
          try {
            targetCanvas.setPointerCapture(pending.pointerId)
          } catch {
            // Pointer may already be released; ignore.
          }
        }
      }, touchLongPressMs)
      return
    }

    setDragState(nextDragState)
    activeDragPointerIdRef.current = pointerId
    try {
      event.currentTarget.setPointerCapture(pointerId)
    } catch {
      // Ignore unsupported pointer-capture failures.
    }
    onClearHover()
  }, [
    blockModulePositions,
    blockRectsRef,
    canvasRef,
    clearPendingTouchLongPress,
    dragState,
    findTopmostBlockAtPoint,
    finishDrag,
    getBlockRect,
    getDragPreviewContext,
    isEditorOpen,
    onClearHover,
    showTypography,
    resolveDragPreviewPosition,
    toPagePoint,
    touchLongPressMs,
  ])

  const handleCanvasPointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pendingTouchDrag = touchPendingDragRef.current
    if (!dragState && pendingTouchDrag && event.pointerId === pendingTouchDrag.pointerId) {
      const dx = event.clientX - pendingTouchDrag.startClientX
      const dy = event.clientY - pendingTouchDrag.startClientY
      if (Math.hypot(dx, dy) > touchCancelDistancePx) {
        clearPendingTouchLongPress()
      }
      return
    }

    if (!dragState) return
    if (!dragState.detached && activeDragPointerIdRef.current !== event.pointerId) return
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const point = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!point) return

    const dragPreviewContext = getDragPreviewContext?.(event, dragState.key)
    const snap = resolveDragPreviewPosition(
      point.x - dragState.pointerOffsetX,
      point.y - dragState.pointerOffsetY,
      dragState.key,
      dragPreviewContext,
    )
    const moved = dragState.moved
      || Math.abs(point.x - dragState.startPageX) > PREVIEW_DRAG_MOVE_THRESHOLD_PX
      || Math.abs(point.y - dragState.startPageY) > PREVIEW_DRAG_MOVE_THRESHOLD_PX
    const copyOnDrop = dragState.detached ? true : event.pointerType !== "touch" && event.altKey
    pendingDragPreviewRef.current = { preview: snap, moved, copyOnDrop }
    if (dragRafRef.current !== null) return
    dragRafRef.current = window.requestAnimationFrame(() => {
      dragRafRef.current = null
      const pending = pendingDragPreviewRef.current
      if (!pending) return
      pendingDragPreviewRef.current = null
      setDragState((prev) => (
        prev
          ? {
              ...prev,
              preview: pending.preview,
              moved: pending.moved,
              copyOnDrop: pending.copyOnDrop,
            }
          : prev
      ))
    })
  }, [
    touchCancelDistancePx,
    clearPendingTouchLongPress,
    dragState,
    getDragPreviewContext,
    resolveDragPreviewPosition,
    toPagePoint,
    canvasRef,
  ])

  const handleCanvasPointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pendingTouchDrag = touchPendingDragRef.current
    if (pendingTouchDrag && event.pointerId === pendingTouchDrag.pointerId) {
      clearPendingTouchLongPress()
      return
    }
    if (!dragState || activeDragPointerIdRef.current !== event.pointerId) return
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // No-op.
    }
    finishDrag()
  }, [clearPendingTouchLongPress, dragState, finishDrag])

  const handleCanvasPointerCancel = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pendingTouchDrag = touchPendingDragRef.current
    if (pendingTouchDrag && event.pointerId === pendingTouchDrag.pointerId) {
      clearPendingTouchLongPress()
      return
    }
    if (!dragState || activeDragPointerIdRef.current !== event.pointerId) return
    finishDrag()
  }, [clearPendingTouchLongPress, dragState, finishDrag])

  const handleCanvasLostPointerCapture = useCallback(() => {
    if (!dragState) return
    if (dragState.detached) return
    finishDrag()
  }, [dragState, finishDrag])

  const beginDetachedCopyDrag = useCallback((key: Key, clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    const block = getBlockRect ? getBlockRect(key) : blockRectsRef.current[key]
    if (!canvas || !block) return
    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(clientX - rect.left, clientY - rect.top)
    if (!pagePoint) return
    const snapped = blockModulePositions[key] ?? resolveDragPreviewPosition(block.x, block.y, key)
    setDragState({
      key,
      startPageX: pagePoint.x,
      startPageY: pagePoint.y,
      pointerOffsetX: pagePoint.x - block.x,
      pointerOffsetY: pagePoint.y - block.y,
      preview: snapped,
      moved: true,
      copyOnDrop: true,
      detached: true,
    })
    activeDragPointerIdRef.current = null
    onClearHover()
  }, [blockModulePositions, blockRectsRef, canvasRef, getBlockRect, onClearHover, resolveDragPreviewPosition, toPagePoint])

  return {
    dragState,
    setDragState,
    dragEndedAtRef,
    beginDetachedCopyDrag,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
  }
}
