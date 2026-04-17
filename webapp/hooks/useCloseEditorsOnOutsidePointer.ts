import { useEffect } from "react"
import type { MutableRefObject } from "react"

type Args = {
  isEditorOpen: boolean
  editorSidebarHost: HTMLDivElement | null
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  onCloseEditors: () => void
}

export function useCloseEditorsOnOutsidePointer({
  isEditorOpen,
  editorSidebarHost,
  textareaRef,
  onCloseEditors,
}: Args) {
  useEffect(() => {
    if (!isEditorOpen) return
    const isEditorOwnedTarget = (target: EventTarget | null): boolean => {
      if (target instanceof Node) {
        if (textareaRef.current?.contains(target)) return true
        if (editorSidebarHost?.contains(target)) return true
      }
      if (!(target instanceof Element)) return false
      return Boolean(
        target.closest('[data-editor-interactive-root="true"]')
      )
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isEditorOwnedTarget(event.target)) return

      const composedPath = typeof event.composedPath === "function"
        ? event.composedPath()
        : []
      for (const pathTarget of composedPath) {
        if (isEditorOwnedTarget(pathTarget)) return
      }

      onCloseEditors()
    }
    window.addEventListener("pointerdown", handlePointerDown, true)
    return () => window.removeEventListener("pointerdown", handlePointerDown, true)
  }, [editorSidebarHost, isEditorOpen, onCloseEditors, textareaRef])
}
