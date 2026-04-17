import { useCallback, useMemo } from "react"
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react"

import type { PreviewCanvasInteractionArgs } from "@/hooks/preview-canvas-interaction-types"
import { usePreviewDrag, type DragState as PreviewDragState } from "@/hooks/usePreviewDrag"
import { PREVIEW_DRAG_CLICK_GUARD_MS } from "@/lib/preview-interaction-constants"
import type { ModulePosition } from "@/lib/types/layout-primitives"

type Args<Key extends string, StyleKey extends string> = Pick<
  PreviewCanvasInteractionArgs<Key, StyleKey>,
  | "showTypography"
  | "editorOpen"
  | "canvasRef"
  | "blockRectsRef"
  | "imageRectsRef"
  | "blockModulePositions"
  | "imageModulePositions"
  | "toPagePoint"
  | "toPagePointFromClient"
  | "snapToModule"
  | "snapToBaseline"
  | "findTopmostDraggableAtPoint"
  | "findTopmostBlockAtPoint"
  | "resolveSelectedLayerAtClientPoint"
  | "isImagePlaceholderKey"
  | "onSelectLayer"
  | "clearHover"
  | "dragEndedAtRef"
  | "touchLongPressMs"
  | "touchCancelDistancePx"
> & {
  handleTextDrop: (drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => void
  handleImageDrop: (drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => void
  openTextEditorFromCanvas: (event: ReactMouseEvent<HTMLCanvasElement>) => void
  handleImageDoubleClick: (args: {
    event: ReactMouseEvent<HTMLCanvasElement>
    pagePoint: { x: number; y: number }
  }) => boolean
}

export function usePreviewPointerSelectionRouting<Key extends string, StyleKey extends string>({
  showTypography,
  editorOpen,
  canvasRef,
  blockRectsRef,
  imageRectsRef,
  blockModulePositions,
  imageModulePositions,
  toPagePoint,
  toPagePointFromClient,
  snapToModule,
  snapToBaseline,
  findTopmostDraggableAtPoint,
  findTopmostBlockAtPoint,
  resolveSelectedLayerAtClientPoint,
  isImagePlaceholderKey,
  onSelectLayer,
  clearHover,
  dragEndedAtRef,
  touchLongPressMs,
  touchCancelDistancePx,
  handleTextDrop,
  handleImageDrop,
  openTextEditorFromCanvas,
  handleImageDoubleClick,
}: Args<Key, StyleKey>) {
  const draggableModulePositions = useMemo(
    () => ({
      ...blockModulePositions,
      ...imageModulePositions,
    }),
    [blockModulePositions, imageModulePositions],
  )

  const applyDragDrop = useCallback((drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => {
    if (isImagePlaceholderKey(drag.key)) {
      handleImageDrop(drag, nextPreview, copyOnDrop)
      return
    }
    handleTextDrop(drag, nextPreview, copyOnDrop)
  }, [handleImageDrop, handleTextDrop, isImagePlaceholderKey])

  const {
    dragState,
    setDragState,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
  } = usePreviewDrag<Key>({
    showTypography,
    isEditorOpen: editorOpen,
    canvasRef,
    blockRectsRef,
    getBlockRect: (key) => blockRectsRef.current[key] ?? imageRectsRef.current[key] ?? null,
    blockModulePositions: draggableModulePositions,
    findTopmostBlockAtPoint: findTopmostDraggableAtPoint,
    toPagePoint,
    snapToModule,
    snapToBaseline,
    onDrop: applyDragDrop,
    onClearHover: clearHover,
    touchLongPressMs,
    touchCancelDistancePx,
    dragEndedAtRef,
  })

  const handlePreviewPointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    onSelectLayer?.(resolveSelectedLayerAtClientPoint(event.clientX, event.clientY))
    handleCanvasPointerDown(event)
  }, [handleCanvasPointerDown, onSelectLayer, resolveSelectedLayerAtClientPoint])

  const handleCanvasDoubleClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < PREVIEW_DRAG_CLICK_GUARD_MS) return
    const pagePoint = toPagePointFromClient(event.clientX, event.clientY)
    if (!pagePoint) return

    const existingLayerKey = findTopmostDraggableAtPoint(pagePoint.x, pagePoint.y)
    if (existingLayerKey && isImagePlaceholderKey(existingLayerKey)) {
      return
    }

    if (handleImageDoubleClick({ event, pagePoint })) {
      return
    }

    openTextEditorFromCanvas(event)
  }, [
    dragEndedAtRef,
    findTopmostDraggableAtPoint,
    handleImageDoubleClick,
    isImagePlaceholderKey,
    openTextEditorFromCanvas,
    showTypography,
    toPagePointFromClient,
  ])

  return {
    dragState,
    setDragState,
    handlePreviewPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
    handleCanvasDoubleClick,
  }
}
