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
import { Columns3, Droplets, Info, Palette, Percent, Rows3, Trash2 } from "lucide-react"
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"
import {
  clampTransparencyPercent,
  opacityToTransparencyPercent,
  transparencyPercentToOpacity,
} from "@/lib/image-placeholder-opacity"

export type ImageEditorState = {
  target: string
  draftColumns: number
  draftRows: number
  draftColor: string
  draftOpacity: number
}

type MainSubmenu = "geometry" | "info" | null

const SUBMENU_VERTICAL_ALIGN_OFFSET_PX = 4
const SUBMENU_PANEL_WIDTH_PX = 304
const SUBMENU_LABEL_WIDTH_PX = 76
const SUBMENU_TOOLTIP_ANCHOR_SELECTOR = '[data-submenu-tooltip-anchor="image-editor"]'
const PREVIEW_TOOLTIP_BOUNDARY_SELECTOR = '[data-tooltip-boundary="preview-workspace"]'

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
  isDarkMode?: boolean
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
  rowTriggerMinWidthCh = 12,
  colTriggerMinWidthCh = 12,
  isHelpActive = false,
  showRolloverInfo = true,
  isDarkMode = false,
}: ImageEditorDialogProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<MainSubmenu>(null)
  const [activeSubmenuTop, setActiveSubmenuTop] = useState(0)
  const [editorColorScheme, setEditorColorScheme] = useState<ImageColorSchemeId>(selectedColorScheme)
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)
  const [transparencyInput, setTransparencyInput] = useState("")
  const panelRef = useRef<HTMLDivElement | null>(null)
  const editorTarget = editorState?.target ?? null

  useEffect(() => {
    if (!editorTarget) return
    setEditorColorScheme(selectedColorScheme)
    setPreviewColorScheme(null)
  }, [editorTarget, selectedColorScheme])

  useEffect(() => {
    if (!editorState) return
    setTransparencyInput(String(opacityToTransparencyPercent(editorState.draftOpacity)))
  }, [editorState])

  if (!editorState) return null

  const colorSchemeTriggerWidthCh = Math.max(
    ...colorSchemes.map((scheme) => scheme.label.length),
    12,
  ) + 3
  const activeColorScheme = previewColorScheme ?? editorColorScheme
  const previewPalette = colorSchemes.find((scheme) => scheme.id === activeColorScheme)?.colors ?? palette
  const transparencyPercent = opacityToTransparencyPercent(editorState.draftOpacity)

  const tone = isDarkMode
    ? {
      root: "dark",
      rail: "border-gray-700 bg-gray-900 text-gray-100",
      railButton: "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-gray-100",
      railButtonActive: "border-gray-600 bg-gray-800 text-gray-100",
      submenu: "border-gray-700 bg-gray-900 text-gray-100",
      input: "border-gray-700 bg-gray-900 text-gray-100 focus:border-gray-500",
      iconMuted: "text-gray-400",
      ringOffset: "ring-offset-gray-900",
      divider: "bg-gray-700",
      railTooltip: "w-max whitespace-nowrap border-gray-700 bg-gray-900/95 text-gray-200 shadow-lg",
      submenuTooltip: "w-max max-w-[24rem] whitespace-normal border-gray-700 bg-gray-900/95 text-gray-200 shadow-lg",
      selectContent: "dark",
    }
    : {
      root: "",
      rail: "border-gray-300 bg-white",
      railButton: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900",
      railButtonActive: "border-gray-400 bg-gray-100 text-gray-900",
      submenu: "border-gray-300 bg-white text-gray-900",
      input: "border-gray-200 bg-white text-gray-900 focus:border-gray-400",
      iconMuted: "text-gray-500",
      ringOffset: "ring-offset-white",
      divider: "bg-gray-200",
      railTooltip: "w-max whitespace-nowrap border-gray-200 bg-white/95 text-gray-700 shadow-lg",
      submenuTooltip: "w-max max-w-[24rem] whitespace-normal border-gray-200 bg-white/95 text-gray-700 shadow-lg",
      selectContent: "",
    }

  const railBtn = (active = false) => `h-8 w-8 rounded-sm border ${active ? tone.railButtonActive : tone.railButton}`
  const railTooltipClassName = tone.railTooltip
  const submenuTooltipClassName = tone.submenuTooltip
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
    <HoverTooltip
      className="block"
      label={label}
      disabled={!showRolloverInfo}
      constrainToClosestSelector={PREVIEW_TOOLTIP_BOUNDARY_SELECTOR}
      horizontalAlign="start"
      tooltipClassName={railTooltipClassName}
    >
      {child}
    </HoverTooltip>
  )
  const withSubmenuTooltip = (label: string, child: React.ReactNode) => (
    <HoverTooltip
      className="block"
      label={label}
      disabled={!showRolloverInfo}
      anchorToClosestSelector={SUBMENU_TOOLTIP_ANCHOR_SELECTOR}
      constrainToClosestSelector={PREVIEW_TOOLTIP_BOUNDARY_SELECTOR}
      horizontalAlign="start"
      tooltipClassName={submenuTooltipClassName}
    >
      {child}
    </HoverTooltip>
  )
  const settingRowLabelClassName = `text-[11px] leading-none ${isDarkMode ? "text-gray-400" : "text-gray-600"}`
  const settingValueClassName = `text-xs ${isDarkMode ? "text-gray-100" : "text-gray-900"}`
  const fullWidthInputClassName = `h-8 w-full rounded-md border px-2 text-xs outline-none ${tone.input}`
  const renderSettingRow = (icon: React.ReactNode, label: string, control: React.ReactNode) => (
    <div
      className="grid min-h-8 items-center gap-x-2"
      style={{ gridTemplateColumns: `16px ${SUBMENU_LABEL_WIDTH_PX}px minmax(0, 1fr)` }}
    >
      <div className="flex items-center justify-center">{icon}</div>
      <span className={settingRowLabelClassName}>{label}</span>
      <div className="min-w-0">{control}</div>
    </div>
  )
  const commitTransparencyInput = () => {
    const parsed = Number(transparencyInput)
    if (!Number.isFinite(parsed)) {
      setTransparencyInput(String(transparencyPercent))
      return
    }
    const nextTransparency = clampTransparencyPercent(parsed)
    setEditorState((prev) => (prev ? {
      ...prev,
      draftOpacity: transparencyPercentToOpacity(nextTransparency),
    } : prev))
    setTransparencyInput(String(nextTransparency))
  }
  const infoRows = [
    { label: "Rows", value: String(editorState.draftRows), icon: Rows3 },
    { label: "Cols", value: String(editorState.draftColumns), icon: Columns3 },
    { label: "Scheme", value: colorSchemes.find((scheme) => scheme.id === editorColorScheme)?.label ?? editorColorScheme, icon: Palette },
    { label: "Color", value: editorState.draftColor, icon: Droplets },
    { label: "Transparency", value: `${transparencyPercent}%`, icon: Percent },
  ]

  return (
    <div ref={panelRef} className={`relative ${tone.root}`.trim()}>
      <div className={`relative flex w-10 shrink-0 flex-col items-center gap-1 rounded-md border p-1 ${tone.rail}`}>
        {isHelpActive ? <HelpIndicatorLine /> : null}
        {withRailTooltip("Rows, columns, color, and transparency", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "geometry")}
          onClick={(event) => toggleSubmenu("geometry", event.currentTarget)}
          aria-label="Image placeholder geometry"
        >
          <Rows3 className="h-4 w-4" />
        </Button>)}
        {withRailTooltip("Image placeholder summary", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "info")}
          onClick={(event) => toggleSubmenu("info", event.currentTarget)}
          aria-label="Image placeholder info"
        >
          <Info className="h-4 w-4" />
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
          data-submenu-tooltip-anchor="image-editor"
          className={`absolute left-full ml-2 max-w-[min(76vw,24rem)] overflow-x-auto rounded-md border px-2 py-2 ${tone.submenu}`}
          style={{ top: activeSubmenuTop }}
        >
          {isHelpActive ? <HelpIndicatorLine /> : null}
          {activeSubmenu === "geometry" ? (
            <div className="flex flex-col gap-0" style={{ width: `${SUBMENU_PANEL_WIDTH_PX}px` }}>
              {renderSettingRow(
                <Rows3 className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Rows",
                withSubmenuTooltip("Set the row span of this image placeholder", <Select
                  value={String(editorState.draftRows)}
                  onValueChange={(value) => {
                    const rows = Math.max(1, Math.min(gridRows, Number(value)))
                    setEditorState((prev) => (prev ? { ...prev, draftRows: rows } : prev))
                  }}
                >
                  <SelectTrigger className={`h-8 text-xs ${tone.input}`} style={{ minWidth: `${rowTriggerMinWidthCh}ch` }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={tone.selectContent}>
                    {Array.from({ length: gridRows }, (_, index) => index + 1).map((count) => (
                      <SelectItem key={`image-row-${count}`} value={String(count)}>
                        {count} {count === 1 ? "row" : "rows"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>),
              )}
              {renderSettingRow(
                <Columns3 className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Cols",
                withSubmenuTooltip("Set the column span of this image placeholder", <Select
                  value={String(editorState.draftColumns)}
                  onValueChange={(value) => {
                    const columns = Math.max(1, Math.min(gridCols, Number(value)))
                    setEditorState((prev) => (prev ? { ...prev, draftColumns: columns } : prev))
                  }}
                >
                  <SelectTrigger className={`h-8 text-xs ${tone.input}`} style={{ minWidth: `${colTriggerMinWidthCh}ch` }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={tone.selectContent}>
                    {Array.from({ length: gridCols }, (_, index) => index + 1).map((count) => (
                      <SelectItem key={`image-col-${count}`} value={String(count)}>
                        {count} {count === 1 ? "col" : "cols"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>),
              )}
              {renderSettingRow(
                <Palette className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Scheme",
                withSubmenuTooltip("Choose the active color scheme", <Select
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
                    className={`h-8 w-full text-xs ${tone.input}`}
                    style={{ minWidth: `${colorSchemeTriggerWidthCh}ch` }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className={tone.selectContent}
                    side="top"
                    sideOffset={4}
                    avoidCollisions={false}
                    onPointerLeave={() => setPreviewColorScheme(null)}
                  >
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
                </Select>),
              )}
              {renderSettingRow(
                <Droplets className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Color",
                <div className="flex flex-wrap items-center gap-1">
                  {previewPalette.map((color, index) => {
                    const selected = editorState.draftColor.toLowerCase() === color.toLowerCase()
                    const swatchKey = `${activeColorScheme}-${index}-${color}`
                    return (
                      <HoverTooltip
                        key={swatchKey}
                        className="block"
                        label={`Set the placeholder color to ${color}`}
                        disabled={!showRolloverInfo}
                        anchorToClosestSelector={SUBMENU_TOOLTIP_ANCHOR_SELECTOR}
                        constrainToClosestSelector={PREVIEW_TOOLTIP_BOUNDARY_SELECTOR}
                        horizontalAlign="start"
                        tooltipClassName={submenuTooltipClassName}
                      >
                        <button
                          type="button"
                          onClick={() => setEditorState((prev) => (prev ? { ...prev, draftColor: color } : prev))}
                          className={`h-6 w-6 rounded border ${selected ? `ring-2 ring-gray-500 ring-offset-1 ${tone.ringOffset}` : ""}`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select ${color}`}
                          title={color}
                        />
                      </HoverTooltip>
                    )
                  })}
                </div>,
              )}
              {renderSettingRow(
                <Percent className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Transparency",
                withSubmenuTooltip("Set image placeholder transparency in percent", <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  value={transparencyInput}
                  onChange={(event) => setTransparencyInput(event.target.value)}
                  onBlur={commitTransparencyInput}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return
                    event.preventDefault()
                    commitTransparencyInput()
                    ;(event.currentTarget as HTMLInputElement).blur()
                  }}
                  className={fullWidthInputClassName}
                  aria-label="Transparency from 0 to 100 percent"
                />),
              )}
            </div>
          ) : null}

          {activeSubmenu === "info" ? (
            <div className="flex flex-col gap-0" style={{ width: `${SUBMENU_PANEL_WIDTH_PX}px` }}>
              {infoRows.map((row) => (
                <div key={row.label}>
                  {renderSettingRow(
                    <row.icon className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                    row.label,
                    <span className={settingValueClassName}>{row.value}</span>,
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
