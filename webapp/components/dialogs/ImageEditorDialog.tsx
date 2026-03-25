"use client"

import { Button } from "@/components/ui/button"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Columns3, Palette, Rows3, Trash2 } from "lucide-react"
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"

export type ImageEditorState = {
  target: string
  draftColumns: number
  draftRows: number
  draftColor: string
}

type MainSubmenu = "geometry" | "color" | null

const SUBMENU_VERTICAL_ALIGN_OFFSET_PX = 4

type ImageEditorDialogProps = {
  editorState: ImageEditorState | null
  setEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  deleteEditor: () => void
  gridRows: number
  gridCols: number
  colorSchemes: readonly { id: ImageColorSchemeId; label: string; colors: readonly string[] }[]
  selectedColorScheme: ImageColorSchemeId
  palette: readonly string[]
  rowTriggerMinWidthCh?: number
  colTriggerMinWidthCh?: number
  isHelpActive?: boolean
  showRolloverInfo?: boolean
}

export function ImageEditorDialog({
  editorState,
  setEditorState,
  deleteEditor,
  gridRows,
  gridCols,
  colorSchemes,
  selectedColorScheme,
  palette,
  rowTriggerMinWidthCh = 10,
  colTriggerMinWidthCh = 10,
  isHelpActive = false,
  showRolloverInfo = true,
}: ImageEditorDialogProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<MainSubmenu>(null)
  const [activeSubmenuTop, setActiveSubmenuTop] = useState(0)
  const [editorColorScheme, setEditorColorScheme] = useState<ImageColorSchemeId>(selectedColorScheme)
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const editorTarget = editorState?.target ?? null

  useEffect(() => {
    if (!editorTarget) return
    setEditorColorScheme(selectedColorScheme)
    setPreviewColorScheme(null)
  }, [editorTarget, selectedColorScheme])

  if (!editorState) return null

  const colorSchemeTriggerWidthCh = Math.max(
    ...colorSchemes.map((scheme) => scheme.label.length),
    12,
  ) + 3
  const activeColorScheme = previewColorScheme ?? editorColorScheme
  const previewPalette = colorSchemes.find((scheme) => scheme.id === activeColorScheme)?.colors ?? palette

  const tone = {
    rail: "border-gray-300 bg-white",
    railButton: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900",
    railButtonActive: "border-gray-400 bg-gray-100 text-gray-900",
    submenu: "border-gray-300 bg-white text-gray-900",
    input: "border-gray-200 bg-white text-gray-900 focus:border-gray-400",
    iconMuted: "text-gray-500",
    ringOffset: "ring-offset-white",
    divider: "bg-gray-200",
  }

  const railBtn = (active = false) => `h-8 w-8 rounded-sm border ${active ? tone.railButtonActive : tone.railButton}`
  const railTooltipClassName = "w-max whitespace-nowrap border-gray-200 bg-white/95 text-gray-700 shadow-lg"
  const submenuTooltipClassName = "w-max max-w-[24rem] whitespace-normal border-gray-200 bg-white/95 text-gray-700 shadow-lg"
  const positionSubmenu = (anchor: HTMLElement) => {
    const panelRect = panelRef.current?.getBoundingClientRect()
    if (!panelRect) return
    const anchorRect = anchor.getBoundingClientRect()
    setActiveSubmenuTop(anchorRect.top - panelRect.top - SUBMENU_VERTICAL_ALIGN_OFFSET_PX)
  }
  const toggleSubmenu = (next: Exclude<MainSubmenu, null>, anchor?: HTMLElement) => {
    setActiveSubmenu((prev) => {
      if (prev === next) return null
      if (anchor) positionSubmenu(anchor)
      return next
    })
  }
  const withRailTooltip = (label: string, child: React.ReactNode) => (
    <HoverTooltip className="block" label={label} disabled={!showRolloverInfo} tooltipClassName={railTooltipClassName}>
      {child}
    </HoverTooltip>
  )
  const withSubmenuTooltip = (label: string, child: React.ReactNode) => (
    <HoverTooltip className="block" label={label} disabled={!showRolloverInfo} tooltipClassName={submenuTooltipClassName}>
      {child}
    </HoverTooltip>
  )

  return (
    <div ref={panelRef} className="relative">
      <div className={`relative flex w-10 shrink-0 flex-col items-center gap-1 rounded-md border p-1 ${tone.rail}`}>
        {isHelpActive ? <HelpIndicatorLine /> : null}
        {withRailTooltip("Rows and columns for the image placeholder", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "geometry")}
          onClick={(event) => toggleSubmenu("geometry", event.currentTarget)}
          aria-label="Rows and columns"
        >
          <Rows3 className="h-4 w-4" />
        </Button>)}
        {withRailTooltip("Color scheme and placeholder color", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "color")}
          onClick={(event) => toggleSubmenu("color", event.currentTarget)}
          aria-label="Color controls"
        >
          <Palette className="h-4 w-4" />
        </Button>)}

        <div className={`my-1 h-px w-full ${tone.divider}`} />

        {withRailTooltip("Delete image placeholder", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(false)}
          onClick={deleteEditor}
          aria-label="Delete image placeholder"
        >
          <Trash2 className="h-4 w-4" />
        </Button>)}
      </div>

      {activeSubmenu ? (
        <div
          className={`absolute left-full ml-2 max-w-[min(62vw,32rem)] overflow-x-auto rounded-md border ${tone.submenu} flex min-h-10 items-center gap-2 px-2 py-1`}
          style={{ top: activeSubmenuTop }}
        >
          {isHelpActive ? <HelpIndicatorLine /> : null}
          {activeSubmenu === "geometry" ? (
            <>
              <Rows3 className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
              {withSubmenuTooltip("Set the row span of this image placeholder", <Select
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
              </Select>)}

              <Columns3 className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
              {withSubmenuTooltip("Set the column span of this image placeholder", <Select
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
              </Select>)}
            </>
          ) : null}

          {activeSubmenu === "color" ? (
            <>
              {withSubmenuTooltip("Choose the active color scheme", <Select
                value={editorColorScheme}
                onOpenChange={(open) => {
                  if (!open) setPreviewColorScheme(null)
                }}
                onValueChange={(value) => {
                  setEditorColorScheme(value as ImageColorSchemeId)
                  setPreviewColorScheme(null)
                }}
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
              </Select>)}
              <div className="flex items-center gap-1">
                {previewPalette.map((color, index) => {
                  const selected = editorState.draftColor.toLowerCase() === color.toLowerCase()
                  return (
                    withSubmenuTooltip(`Set the placeholder color to ${color}`, <button
                      key={`${activeColorScheme}-${index}-${color}`}
                      type="button"
                      onClick={() => setEditorState((prev) => (prev ? { ...prev, draftColor: color } : prev))}
                      className={`h-6 w-6 rounded border ${selected ? `ring-2 ring-gray-500 ring-offset-1 ${tone.ringOffset}` : ""}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select ${color}`}
                      title={color}
                    />)
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
