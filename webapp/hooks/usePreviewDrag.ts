import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent, RefObject } from "react"

export type DragModulePosition = {
  col: number
  row: number
}

type PagePoint = {
  x: number
  y: number
}

type BlockRect = {
  x: number
  y: number
  width: number
  height: number
}

export type DragState<Key extends string = string> = {
  key: Key
  startPageX: number
  startPageY: number
  pointerOffsetX: number
  pointerOffsetY: number
  preview: DragModulePosition
  moved: boolean
  copyOnDrop: boolean
}

type Args<Key extends string> = {
  showTypography: boolean
  isEditorOpen: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
  blockRectsRef: RefObject<Record<Key, BlockRect>>
  blockModulePositions: Partial<Record<Key, DragModulePosition>>
  findTopmostBlockAtPoint: (x: number, y: number) => Key | null
  toPagePoint: (x: number, y: number) => PagePoint | null
  snapToModule: (x: number, y: number, key: Key) => DragModulePosition
  snapToBaseline: (x: number, y: number, key: Key) => DragModulePosition
  onDrop: (drag: DragState<Key>, nextPreview: DragModulePosition, copyOnDrop: boolean) => void
  onClearHover: () => void
  touchLongPressMs: number
  touchCancelDistancePx: number
}

export function usePreviewDrag<Key extends string>({
  showTypography,
  isEditorOpen,
  canvasRef,
  blockRectsRef,
  blockModulePositions,
  findTopmostBlockAtPoint,
  toPagePoint,
  snapToModule,
  snapToBaseline,
  onDrop,
  onClearHover,
  touchLongPressMs,
  touchCancelDistancePx,
}: Args<Key>) {
  const [dragState, setDragState] = useState<DragState<Key> | null>(null)
  const dragEndedAtRef = useRef<number>(0)
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
    setDragState((prev) => {
      if (!prev) return null
      const nextPreview = pending?.preview ?? prev.preview
      const nextMoved = pending?.moved ?? prev.moved
      const nextCopyOnDrop = pending?.copyOnDrop ?? prev.copyOnDrop
      if (nextMoved) {
        onDrop(prev, nextPreview, nextCopyOnDrop)
        dragEndedAtRef.current = Date.now()
      }
      return null
    })
    activeDragPointerIdRef.current = null
  }, [onDrop])

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
    if (!showTypography || isEditorOpen) return
    if (event.pointerType === "mouse" && event.button !== 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    const key = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (!key) return
    const block = blockRectsRef.current[key]
    if (!block) return
    event.preventDefault()

    const snapped = blockModulePositions[key] ?? snapToModule(block.x, block.y, key)
    const nextDragState: DragState<Key> = {
      key,
      startPageX: pagePoint.x,
      startPageY: pagePoint.y,
      pointerOffsetX: pagePoint.x - block.x,
      pointerOffsetY: pagePoint.y - block.y,
      preview: snapped,
      moved: false,
      copyOnDrop: event.pointerType !== "touch" && event.shiftKey,
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
    findTopmostBlockAtPoint,
    isEditorOpen,
    onClearHover,
    showTypography,
    snapToModule,
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

    if (!dragState || activeDragPointerIdRef.current !== event.pointerId) return
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const point = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!point) return

    const useBaselineSnap = event.pointerType !== "touch" && event.ctrlKey
    const snap = useBaselineSnap
      ? snapToBaseline(point.x - dragState.pointerOffsetX, point.y - dragState.pointerOffsetY, dragState.key)
      : snapToModule(point.x - dragState.pointerOffsetX, point.y - dragState.pointerOffsetY, dragState.key)
    const moved = dragState.moved || Math.abs(point.x - dragState.startPageX) > 3 || Math.abs(point.y - dragState.startPageY) > 3
    const copyOnDrop = event.pointerType !== "touch" && event.shiftKey
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
  }, [touchCancelDistancePx, clearPendingTouchLongPress, dragState, snapToBaseline, snapToModule, toPagePoint, canvasRef])

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
    finishDrag()
  }, [dragState, finishDrag])

  return {
    dragState,
    setDragState,
    dragEndedAtRef,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
  }
}
