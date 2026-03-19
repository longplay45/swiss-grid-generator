import { useCallback, useEffect, useMemo, useRef } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { PagePoint } from "@/lib/preview-types"

export type PreviewHoverState<Key extends string> = {
  key: Key
}

type DragCursorState = {
  copyOnDrop: boolean
}

type Args<Key extends string> = {
  showTypography: boolean
  editorOpen: boolean
  dragState: DragCursorState | null
  hoverState: PreviewHoverState<Key> | null
  hoverImageKey: Key | null
  setHoverState: Dispatch<SetStateAction<PreviewHoverState<Key> | null>>
  setHoverImageKey: Dispatch<SetStateAction<Key | null>>
  findTopmostBlockAtPoint: (pageX: number, pageY: number) => Key | null
  findTopmostImageAtPoint: (pageX: number, pageY: number) => Key | null
  toPagePointFromClient: (clientX: number, clientY: number) => PagePoint | null
}

export function usePreviewHoverState<Key extends string>({
  showTypography,
  editorOpen,
  dragState,
  hoverState,
  hoverImageKey,
  setHoverState,
  setHoverImageKey,
  findTopmostBlockAtPoint,
  findTopmostImageAtPoint,
  toPagePointFromClient,
}: Args<Key>) {
  const mouseMoveRafRef = useRef<number | null>(null)

  const clearHover = useCallback(() => {
    setHoverState(null)
    setHoverImageKey(null)
  }, [setHoverImageKey, setHoverState])

  const handleCanvasMouseMoveInner = useCallback((clientX: number, clientY: number) => {
    mouseMoveRafRef.current = null

    if (!showTypography || editorOpen || dragState) {
      clearHover()
      return
    }

    const pagePoint = toPagePointFromClient(clientX, clientY)
    if (!pagePoint) {
      clearHover()
      return
    }

    const textKey = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (textKey) {
      setHoverImageKey(null)
      setHoverState((prev) => (prev?.key === textKey ? prev : { key: textKey }))
      return
    }

    const imageKey = findTopmostImageAtPoint(pagePoint.x, pagePoint.y)
    if (imageKey) {
      setHoverState(null)
      setHoverImageKey((prev) => (prev === imageKey ? prev : imageKey))
      return
    }

    clearHover()
  }, [
    clearHover,
    dragState,
    editorOpen,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    showTypography,
    toPagePointFromClient,
  ])

  const handleCanvasMouseMove = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (mouseMoveRafRef.current !== null) return
    const { clientX, clientY } = event
    mouseMoveRafRef.current = requestAnimationFrame(() => handleCanvasMouseMoveInner(clientX, clientY))
  }, [handleCanvasMouseMoveInner])

  useEffect(() => {
    return () => {
      if (mouseMoveRafRef.current !== null) cancelAnimationFrame(mouseMoveRafRef.current)
    }
  }, [])

  const canvasCursorClass = useMemo(() => (
    dragState
      ? (dragState.copyOnDrop ? "cursor-copy" : "cursor-grabbing")
      : (hoverState || hoverImageKey)
        ? "cursor-grab"
        : "cursor-default"
  ), [dragState, hoverImageKey, hoverState])

  return {
    clearHover,
    handleCanvasMouseMove,
    canvasCursorClass,
  }
}
