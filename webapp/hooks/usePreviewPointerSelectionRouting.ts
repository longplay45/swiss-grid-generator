import { useCallback, useMemo } from "react"
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react"

import type {
  PreviewCanvasInteractionArgs,
  LayerPlacementOptions,
} from "@/hooks/preview-canvas-interaction-types"
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
  | "resolveLayerPlacement"
  | "findTopmostDraggableAtPoint"
  | "resolveSelectedLayerAtClientPoint"
  | "isImagePlaceholderKey"
  | "onSelectLayer"
  | "clearHover"
  | "dragEndedAtRef"
  | "touchLongPressMs"
  | "touchCancelDistancePx"
  | "openTextEditor"
  | "openImageEditor"
  | "isSnapToBaselineEnabled"
  | "isImageSnapToBaselineEnabled"
> & {
  handleTextDrop: (drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => void
  handleImageDrop: (drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => void
  openTextEditorFromCanvas: (event: ReactMouseEvent<HTMLCanvasElement>) => void
  handleImageDoubleClick: (args: {
    event: ReactMouseEvent<HTMLCanvasElement>
    pagePoint: { x: number; y: number }
  }) => boolean
  activeEditorTarget: Key | null
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
  resolveLayerPlacement,
  findTopmostDraggableAtPoint,
  resolveSelectedLayerAtClientPoint,
  isImagePlaceholderKey,
  onSelectLayer,
  clearHover,
  isSnapToBaselineEnabled,
  isImageSnapToBaselineEnabled,
  dragEndedAtRef,
  touchLongPressMs,
  touchCancelDistancePx,
  openTextEditor,
  openImageEditor,
  handleTextDrop,
  handleImageDrop,
  openTextEditorFromCanvas,
  handleImageDoubleClick,
  activeEditorTarget,
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
    beginDetachedCopyDrag: beginDetachedCopyDragInternal,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
  } = usePreviewDrag<Key, LayerPlacementOptions | undefined>({
    showTypography,
    isEditorOpen: editorOpen,
    canvasRef,
    blockRectsRef,
    getBlockRect: (key) => blockRectsRef.current[key] ?? imageRectsRef.current[key] ?? null,
    blockModulePositions: draggableModulePositions,
    findTopmostBlockAtPoint: findTopmostDraggableAtPoint,
    toPagePoint,
    resolveDragPreviewPosition: (pageX, pageY, key, context) => resolveLayerPlacement(pageX, pageY, key, context),
    getDragPreviewContext: (event, key) => {
      if (event.shiftKey || event.ctrlKey) {
        return { dragYMode: "baseline" }
      }
      return {
        dragYMode: isImagePlaceholderKey(key)
          ? (isImageSnapToBaselineEnabled(key) ? "moduleTop" : "free")
          : (isSnapToBaselineEnabled(key) ? "moduleTop" : "free"),
      }
    },
    onDrop: applyDragDrop,
    onClearHover: clearHover,
    touchLongPressMs,
    touchCancelDistancePx,
    dragEndedAtRef,
  })

  const handlePreviewPointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragState?.detached) {
      handleCanvasPointerDown(event)
      return
    }
    const target = resolveSelectedLayerAtClientPoint(event.clientX, event.clientY)
    onSelectLayer?.(target)
    if (editorOpen && target && target !== activeEditorTarget) {
      clearHover()
      if (isImagePlaceholderKey(target)) {
        openImageEditor(target, { recordHistory: false })
      } else {
        openTextEditor(target, { recordHistory: false })
      }
    }
    handleCanvasPointerDown(event)
  }, [
    activeEditorTarget,
    clearHover,
    editorOpen,
    handleCanvasPointerDown,
    isImageSnapToBaselineEnabled,
    isImagePlaceholderKey,
    onSelectLayer,
    openImageEditor,
    openTextEditor,
    resolveSelectedLayerAtClientPoint,
  ])

  const handleCanvasDoubleClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < PREVIEW_DRAG_CLICK_GUARD_MS) return
    const pagePoint = toPagePointFromClient(event.clientX, event.clientY)
    if (!pagePoint) return

    if (handleImageDoubleClick({ event, pagePoint })) {
      return
    }

    openTextEditorFromCanvas(event)
  }, [
    dragEndedAtRef,
    handleImageDoubleClick,
    openTextEditorFromCanvas,
    resolveLayerPlacement,
    showTypography,
    toPagePointFromClient,
  ])

  return {
    dragState,
    setDragState,
    beginDetachedCopyDrag: beginDetachedCopyDragInternal,
    handlePreviewPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
    handleCanvasDoubleClick,
  }
}
