import { useEffect } from "react"

type Args = {
  editorTarget: string | null
  isEditorOpen: boolean
  focusEditor: () => void
  onCloseEditor: () => void
  undo: () => void
  redo: () => void
}

export function usePreviewKeyboard({
  editorTarget,
  isEditorOpen,
  focusEditor,
  onCloseEditor,
  undo,
  redo,
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
    const onKeyDown = (event: KeyboardEvent) => {
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
  }, [isEditorOpen, redo, undo])
}
