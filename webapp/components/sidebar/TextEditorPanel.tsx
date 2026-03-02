"use client"

import { TextEditorControls, type TextEditorControlsProps } from "@/components/editor/TextEditorControls"
import { X } from "lucide-react"

type TextEditorPanelProps<StyleKey extends string> = {
  isDarkMode: boolean
  closeEditor: () => void
  controls: Omit<TextEditorControlsProps<StyleKey>, "isDarkMode">
}

export function TextEditorPanel<StyleKey extends string>({
  isDarkMode,
  closeEditor,
  controls,
}: TextEditorPanelProps<StyleKey>) {
  const editorText = controls.editorState.draftText ?? ""
  const characterCount = editorText.length
  const wordCount = editorText.trim() ? editorText.trim().split(/\s+/).length : 0

  return (
    <div className="space-y-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Text Editor</h3>
          <p className={`text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Target: <span className="font-medium">{controls.editorState.target}</span>
          </p>
        </div>
        <button
          type="button"
          aria-label="Close text editor"
          onClick={closeEditor}
          className={`rounded-sm p-1 transition-colors ${isDarkMode ? "text-gray-300 hover:bg-gray-700 hover:text-gray-100" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className={`space-y-2 rounded-md border p-2 ${isDarkMode ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"}`}>
        <TextEditorControls
          {...controls}
          showSaveButton={false}
          isDarkMode={isDarkMode}
        />
      </div>

      <div className={`rounded-md border px-3 py-2 text-[11px] ${isDarkMode ? "border-gray-700 bg-gray-900 text-gray-400" : "border-gray-200 bg-white text-gray-500"}`}>
        <div className="flex items-center justify-between gap-3">
          <span>Characters: {characterCount}</span>
          <span>Words: {wordCount}</span>
        </div>
        <div className="mt-1">Changes apply live. Esc closes the editor.</div>
      </div>
    </div>
  )
}
