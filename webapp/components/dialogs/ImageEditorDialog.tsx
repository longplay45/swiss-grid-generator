"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Columns3, Palette, Rows3, Trash2 } from "lucide-react"
import { useState, type Dispatch, type SetStateAction } from "react"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"

export type ImageEditorState = {
  target: string
  draftColumns: number
  draftRows: number
  draftColor: string
}

type MainSubmenu = "geometry" | "color" | null

type ImageEditorDialogProps = {
  editorState: ImageEditorState | null
  setEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  deleteEditor: () => void
  gridRows: number
  gridCols: number
  colorSchemes: readonly { id: ImageColorSchemeId; label: string; colors: readonly string[] }[]
  selectedColorScheme: ImageColorSchemeId
  onColorSchemeChange: (value: ImageColorSchemeId) => void
  palette: readonly string[]
  rowTriggerMinWidthCh?: number
  colTriggerMinWidthCh?: number
  isHelpActive?: boolean
}

export function ImageEditorDialog({
  editorState,
  setEditorState,
  deleteEditor,
  gridRows,
  gridCols,
  colorSchemes,
  selectedColorScheme,
  onColorSchemeChange,
  palette,
  rowTriggerMinWidthCh = 10,
  colTriggerMinWidthCh = 10,
  isHelpActive = false,
}: ImageEditorDialogProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<MainSubmenu>(null)
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)

  if (!editorState) return null

  const colorSchemeTriggerWidthCh = Math.max(
    ...colorSchemes.map((scheme) => scheme.label.length),
    12,
  ) + 3
  const previewPalette = previewColorScheme
    ? (colorSchemes.find((scheme) => scheme.id === previewColorScheme)?.colors ?? palette)
    : palette

  const tone = {
    rail: isHelpActive ? "border-blue-500 bg-white" : "border-gray-300 bg-white",
    railButton: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900",
    railButtonActive: "border-gray-400 bg-gray-100 text-gray-900",
    submenu: isHelpActive ? "border-blue-500 bg-white text-gray-900" : "border-gray-300 bg-white text-gray-900",
    input: "border-gray-200 bg-white text-gray-900 focus:border-gray-400",
    iconMuted: "text-gray-500",
    ringOffset: "ring-offset-white",
    divider: isHelpActive ? "bg-blue-300" : "bg-gray-200",
  }

  const railBtn = (active = false) => `h-8 w-8 rounded-sm border ${active ? tone.railButtonActive : tone.railButton}`
  const toggleSubmenu = (next: Exclude<MainSubmenu, null>) => {
    setActiveSubmenu((prev) => (prev === next ? null : next))
  }

  return (
    <div className="flex items-start gap-2">
      <div className={`flex w-10 shrink-0 flex-col items-center gap-1 rounded-md border p-1 ${tone.rail}`}>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "geometry")}
          onClick={() => toggleSubmenu("geometry")}
          aria-label="Rows and columns"
        >
          <Rows3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "color")}
          onClick={() => toggleSubmenu("color")}
          aria-label="Color controls"
        >
          <Palette className="h-4 w-4" />
        </Button>

        <div className={`my-1 h-px w-full ${tone.divider}`} />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(false)}
          onClick={deleteEditor}
          aria-label="Delete image placeholder"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {activeSubmenu ? (
        <div className={`max-w-[min(62vw,32rem)] overflow-x-auto rounded-md border ${tone.submenu} flex h-10 items-center gap-2 px-2`}>
          {activeSubmenu === "geometry" ? (
            <>
              <Rows3 className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
              <Select
                value={String(editorState.draftRows)}
                onValueChange={(value) => {
                  const rows = Math.max(1, Math.min(gridRows, Number(value)))
                  setEditorState((prev) => (prev ? { ...prev, draftRows: rows } : prev))
                }}
              >
                <SelectTrigger className={`h-8 text-xs ${tone.input}`} style={{ minWidth: `${rowTriggerMinWidthCh}ch` }}>
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

              <Columns3 className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
              <Select
                value={String(editorState.draftColumns)}
                onValueChange={(value) => {
                  const columns = Math.max(1, Math.min(gridCols, Number(value)))
                  setEditorState((prev) => (prev ? { ...prev, draftColumns: columns } : prev))
                }}
              >
                <SelectTrigger className={`h-8 text-xs ${tone.input}`} style={{ minWidth: `${colTriggerMinWidthCh}ch` }}>
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
            </>
          ) : null}

          {activeSubmenu === "color" ? (
            <>
              <Select
                value={selectedColorScheme}
                onOpenChange={(open) => {
                  if (!open) setPreviewColorScheme(null)
                }}
                onValueChange={(value) => onColorSchemeChange(value as ImageColorSchemeId)}
              >
                <SelectTrigger
                  className={`h-8 text-xs ${tone.input}`}
                  style={{ width: `${colorSchemeTriggerWidthCh}ch` }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent onPointerLeave={() => setPreviewColorScheme(null)}>
                  {colorSchemes.map((scheme) => (
                    <SelectItem
                      key={scheme.id}
                      value={scheme.id}
                      onFocus={() => setPreviewColorScheme(scheme.id)}
                      onPointerMove={() => setPreviewColorScheme(scheme.id)}
                    >
                      {scheme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                {previewPalette.map((color, index) => {
                  const selected = editorState.draftColor.toLowerCase() === color.toLowerCase()
                  return (
                    <button
                      key={`${previewColorScheme ?? selectedColorScheme}-${index}-${color}`}
                      type="button"
                      onClick={() => setEditorState((prev) => (prev ? { ...prev, draftColor: color } : prev))}
                      className={`h-6 w-6 rounded border ${selected ? `ring-2 ${isHelpActive ? "ring-blue-500" : "ring-gray-500"} ring-offset-1 ${tone.ringOffset}` : ""}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select ${color}`}
                      title={color}
                    />
                  )
                })}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
