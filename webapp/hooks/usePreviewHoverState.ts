import { useCallback, useEffect, useMemo, useRef } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import type { CSSProperties, Dispatch, SetStateAction } from "react"
import type { PagePoint } from "@/lib/preview-types"
export type PreviewHoverState<Key extends string> = {
  key: Key
  point: PagePoint
}

const COPY_CURSOR_STYLE_VALUE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath fill='%23000' d='M4 3v17l4.8-4.2 3.5 8.2 2.2-.9-3.5-8.1H18L4 3z'/%3E%3Ccircle cx='20' cy='8' r='5.25' fill='%23fff' stroke='%23000' stroke-width='1.5'/%3E%3Cpath d='M20 5.25v5.5M17.25 8h5.5' stroke='%23000' stroke-width='1.5' stroke-linecap='square'/%3E%3C/svg%3E") 2 2, copy`

type DragCursorState = {
  copyOnDrop: boolean
}

type Args<Key extends string> = {
  showTypography: boolean
  editorOpen: boolean
  dragState: DragCursorState | null
  hoverState: PreviewHoverState<Key> | null
  hoverImageKey: Key | null
  hoverCopyIntent: boolean
  setHoverState: Dispatch<SetStateAction<PreviewHoverState<Key> | null>>
  setHoverImageKey: Dispatch<SetStateAction<Key | null>>
  setHoverCopyIntent: Dispatch<SetStateAction<boolean>>
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
  hoverCopyIntent,
  setHoverState,
  setHoverImageKey,
  setHoverCopyIntent,
  findTopmostBlockAtPoint,
  findTopmostImageAtPoint,
  toPagePointFromClient,
}: Args<Key>) {
  const mouseMoveRafRef = useRef<number | null>(null)
  const hasHoverTarget = Boolean(hoverState || hoverImageKey)
  const hasTextHoverTarget = Boolean(hoverState)

  const clearHover = useCallback(() => {
    setHoverState(null)
    setHoverImageKey(null)
    setHoverCopyIntent(false)
  }, [setHoverCopyIntent, setHoverImageKey, setHoverState])

  const handleCanvasMouseMoveInner = useCallback((clientX: number, clientY: number, altKey: boolean) => {
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
      setHoverCopyIntent(altKey)
      setHoverState((prev) => (
        prev?.key === textKey
        && prev.point.x === pagePoint.x
        && prev.point.y === pagePoint.y
          ? prev
          : { key: textKey, point: pagePoint }
      ))
      return
    }

    const imageKey = findTopmostImageAtPoint(pagePoint.x, pagePoint.y)
    if (imageKey) {
      setHoverState(null)
      setHoverCopyIntent(false)
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
    setHoverCopyIntent,
    showTypography,
    toPagePointFromClient,
  ])

  const handleCanvasMouseMove = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (mouseMoveRafRef.current !== null) return
    const { altKey, clientX, clientY } = event
    mouseMoveRafRef.current = requestAnimationFrame(() => handleCanvasMouseMoveInner(clientX, clientY, altKey))
  }, [handleCanvasMouseMoveInner])

  useEffect(() => {
    if (!hasTextHoverTarget) {
      if (hoverCopyIntent) setHoverCopyIntent(false)
      return
    }
    if (!showTypography || editorOpen || dragState) {
      if (hoverCopyIntent) setHoverCopyIntent(false)
      return
    }

    const handleModifierKeyChange = (event: KeyboardEvent) => {
      setHoverCopyIntent(event.altKey)
    }

    window.addEventListener("keydown", handleModifierKeyChange)
    window.addEventListener("keyup", handleModifierKeyChange)
    return () => {
      window.removeEventListener("keydown", handleModifierKeyChange)
      window.removeEventListener("keyup", handleModifierKeyChange)
    }
  }, [dragState, editorOpen, hasTextHoverTarget, hoverCopyIntent, setHoverCopyIntent, showTypography])

  useEffect(() => {
    return () => {
      if (mouseMoveRafRef.current !== null) cancelAnimationFrame(mouseMoveRafRef.current)
    }
  }, [])

  const canvasCursorClass = useMemo(() => (
    dragState
      ? (dragState.copyOnDrop ? "cursor-default" : "cursor-grabbing")
      : hasHoverTarget
        ? (hoverCopyIntent ? "cursor-default" : "cursor-grab")
        : "cursor-default"
  ), [dragState, hasHoverTarget, hoverCopyIntent])

  const canvasCursorStyle = useMemo<CSSProperties | undefined>(() => (
    (dragState?.copyOnDrop || hoverCopyIntent)
      ? { cursor: COPY_CURSOR_STYLE_VALUE }
      : undefined
  ), [dragState?.copyOnDrop, hoverCopyIntent])

  return {
    clearHover,
    handleCanvasMouseMove,
    canvasCursorClass,
    canvasCursorStyle,
  }
}
