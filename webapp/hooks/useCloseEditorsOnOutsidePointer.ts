import { useEffect } from "react"
import type { MutableRefObject } from "react"

type Args = {
  isEditorOpen: boolean
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  onCloseEditors: () => void
}

export function useCloseEditorsOnOutsidePointer({
  isEditorOpen,
  textareaRef,
  onCloseEditors,
}: Args) {
  useEffect(() => {
    if (!isEditorOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {
        onCloseEditors()
        return
      }
      if (textareaRef.current?.contains(target)) return
      if (target.closest('[data-inline-editor-layer="true"]')) return
      if (target.closest('[data-text-editor-panel="true"]')) return
      if (target.closest('[data-image-editor-panel="true"]')) return
      if (target.closest('[data-text-editor-select-content="true"]')) return
      if (target.closest('[data-project-layer-card="true"]')) return
      if (target.closest('[data-preview-header-action="help"]')) return
      onCloseEditors()
    }
    window.addEventListener("pointerdown", handlePointerDown, true)
    return () => window.removeEventListener("pointerdown", handlePointerDown, true)
  }, [isEditorOpen, onCloseEditors, textareaRef])
}
