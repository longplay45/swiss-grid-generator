import { useEffect } from "react"

export type PreviewNudgeDirection = "left" | "right" | "up" | "down"

export type PreviewNudgeRequest = {
  direction: PreviewNudgeDirection
  shiftKey: boolean
}

type Args = {
  editorTarget: string | null
  isEditorOpen: boolean
  focusEditor: () => void
  onCloseEditor: () => void
  undo: () => void
  redo: () => void
  selectedLayerKey?: string | null
  onNudgeSelectedLayer?: (request: PreviewNudgeRequest) => boolean
}

export function usePreviewKeyboard({
  editorTarget,
  isEditorOpen,
  focusEditor,
  onCloseEditor,
  undo,
  redo,
  selectedLayerKey = null,
  onNudgeSelectedLayer,
}: Args) {
  useEffect(() => {
    if (!isEditorOpen) return
    focusEditor()
  }, [editorTarget, focusEditor, isEditorOpen])

  useEffect(() => {
    if (!isEditorOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseEditor()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isEditorOpen, onCloseEditor])

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      if (
        !isEditorOpen
        && selectedLayerKey
        && !event.metaKey
        && !event.ctrlKey
        && !event.altKey
      ) {
        const direction = event.key === "ArrowLeft"
          ? "left"
          : event.key === "ArrowRight"
            ? "right"
            : event.key === "ArrowUp"
              ? "up"
              : event.key === "ArrowDown"
                ? "down"
                : null
        if (direction && onNudgeSelectedLayer?.({ direction, shiftKey: event.shiftKey })) {
          event.preventDefault()
          return
        }
      }

      if (event.defaultPrevented) return
      if (!(event.metaKey || event.ctrlKey)) return
      if (isEditorOpen) return
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }
      if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isEditorOpen, onNudgeSelectedLayer, redo, selectedLayerKey, undo])
}
