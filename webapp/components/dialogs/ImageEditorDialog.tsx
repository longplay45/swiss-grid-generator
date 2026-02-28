"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Image as ImageIcon, Rows3, Columns3, Palette, Save as SaveIcon, Trash2 } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

export type ImageEditorState = {
  target: string
  draftColumns: number
  draftRows: number
  draftColor: string
}

type ImageEditorDialogProps = {
  editorState: ImageEditorState | null
  setEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  closeEditor: () => void
  saveEditor: () => void
  deleteEditor: () => void
  gridRows: number
  gridCols: number
  palette: readonly string[]
  isDarkMode: boolean
}

export function ImageEditorDialog({
  editorState,
  setEditorState,
  closeEditor,
  saveEditor,
  deleteEditor,
  gridRows,
  gridCols,
  palette,
  isDarkMode,
}: ImageEditorDialogProps) {
  if (!editorState) return null

  return (
    <div
      className={`absolute inset-0 z-40 flex items-center justify-center p-4 ${isDarkMode ? "bg-black/45" : "bg-black/20"}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeEditor()
      }}
    >
      <div
        className={`w-full max-w-[420px] rounded-md border shadow-xl ${isDarkMode ? "border-gray-700 bg-gray-900 text-gray-100" : "border-gray-300 bg-white"}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b px-3 py-2 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ImageIcon className="h-4 w-4" />
            Image Placeholder
          </div>
          <div className="text-xs opacity-70">{editorState.target}</div>
        </div>

        <div className="space-y-3 px-3 py-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <div className="flex items-center gap-1 text-xs">
                <Rows3 className="h-3.5 w-3.5" />
                Rows
              </div>
              <Select
                value={String(editorState.draftRows)}
                onValueChange={(value) => {
                  const rows = Math.max(1, Math.min(gridRows, Number(value)))
                  setEditorState((prev) => (prev ? { ...prev, draftRows: rows } : prev))
                }}
              >
                <SelectTrigger className={`h-8 ${isDarkMode ? "border-gray-700 bg-gray-950 text-gray-100" : "border-gray-300 bg-white text-gray-900"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: gridRows }, (_, index) => index + 1).map((count) => (
                    <SelectItem key={`image-row-${count}`} value={String(count)}>
                      {count} {count === 1 ? "row" : "rows"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1">
              <div className="flex items-center gap-1 text-xs">
                <Columns3 className="h-3.5 w-3.5" />
                Columns
              </div>
              <Select
                value={String(editorState.draftColumns)}
                onValueChange={(value) => {
                  const cols = Math.max(1, Math.min(gridCols, Number(value)))
                  setEditorState((prev) => (prev ? { ...prev, draftColumns: cols } : prev))
                }}
              >
                <SelectTrigger className={`h-8 ${isDarkMode ? "border-gray-700 bg-gray-950 text-gray-100" : "border-gray-300 bg-white text-gray-900"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: gridCols }, (_, index) => index + 1).map((count) => (
                    <SelectItem key={`image-col-${count}`} value={String(count)}>
                      {count} {count === 1 ? "col" : "cols"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs">
              <Palette className="h-3.5 w-3.5" />
              Color
            </div>
            <div className="grid grid-cols-4 gap-2">
              {palette.map((color) => {
                const selected = editorState.draftColor.toLowerCase() === color.toLowerCase()
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditorState((prev) => (prev ? { ...prev, draftColor: color } : prev))}
                    className={`h-10 rounded border ${selected ? "ring-2 ring-offset-1 ring-gray-500" : ""} ${isDarkMode ? "ring-offset-gray-900" : "ring-offset-white"}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color}`}
                    title={color}
                  />
                )
              })}
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-between border-t px-3 py-2 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
          <Button type="button" variant="outline" className="h-8 px-2" onClick={deleteEditor}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-8 px-2" onClick={closeEditor}>
              Cancel
            </Button>
            <Button type="button" className="h-8 px-2" onClick={saveEditor}>
              <SaveIcon className="mr-1 h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
