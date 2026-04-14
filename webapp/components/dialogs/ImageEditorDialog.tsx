"use client"

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Trash2 } from "lucide-react"

import { EditorSidebarSection } from "@/components/layout/EditorSidebarSection"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import {
  clampTransparencyPercent,
  opacityToTransparencyPercent,
  transparencyPercentToOpacity,
} from "@/lib/image-placeholder-opacity"
import { usePersistedSectionState } from "@/hooks/usePersistedSectionState"
import type { HelpSectionId } from "@/lib/help-registry"

export type ImageEditorState = {
  target: string
  draftColumns: number
  draftRows: number
  draftHeightBaselines: number
  draftColor: string
  draftOpacity: number
}

type SectionKey = "geometry" | "color" | "info"
const SECTION_HEADER_CLICK_DELAY_MS = 180
const IMAGE_EDITOR_SECTION_KEYS: SectionKey[] = ["geometry", "color", "info"]

const IMAGE_EDITOR_COLLAPSED_DEFAULTS: Record<SectionKey, boolean> = {
  geometry: false,
  color: true,
  info: true,
}

type ImageEditorDialogProps = {
  editorState: ImageEditorState | null
  setEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  deleteEditor: () => void
  baselinesPerGridModule: number
  gridRows: number
  gridCols: number
  colorSchemes: readonly { id: ImageColorSchemeId; label: string; colors: readonly string[] }[]
  selectedColorScheme: ImageColorSchemeId
  palette: readonly string[]
  showHelpIndicator?: boolean
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  showRolloverInfo?: boolean
  isDarkMode?: boolean
}

const IMAGE_EDITOR_HELP_SECTION_BY_KEY: Record<SectionKey, HelpSectionId> = {
  geometry: "help-image-editor-geometry",
  color: "help-image-editor-color",
  info: "help-image-editor-info",
}

export function ImageEditorDialog({
  editorState,
  setEditorState,
  deleteEditor,
  baselinesPerGridModule,
  gridRows,
  gridCols,
  colorSchemes,
  selectedColorScheme,
  palette,
  showHelpIndicator = false,
  onOpenHelpSection,
  showRolloverInfo = true,
  isDarkMode = false,
}: ImageEditorDialogProps) {
  const [editorColorScheme, setEditorColorScheme] = useState<ImageColorSchemeId>(selectedColorScheme)
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)
  const [transparencyInput, setTransparencyInput] = useState("")
  const [collapsed, setCollapsed] = usePersistedSectionState(
    "swiss-grid-generator:image-editor-sections",
    IMAGE_EDITOR_COLLAPSED_DEFAULTS,
  )
  const sectionHeaderClickTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!editorState?.target) return
    setEditorColorScheme(selectedColorScheme)
    setPreviewColorScheme(null)
  }, [editorState?.target, selectedColorScheme])

  useEffect(() => {
    if (!editorState) return
    setTransparencyInput(String(opacityToTransparencyPercent(editorState.draftOpacity)))
  }, [editorState])

  useEffect(() => {
    if (!editorState) return
    if (editorState.draftHeightBaselines <= baselinesPerGridModule) return
    setEditorState((prev) => (
      prev
        ? {
          ...prev,
          draftHeightBaselines: baselinesPerGridModule,
        }
        : prev
    ))
  }, [baselinesPerGridModule, editorState, setEditorState])

  useEffect(() => {
    return () => {
      if (sectionHeaderClickTimeoutRef.current !== null) {
        window.clearTimeout(sectionHeaderClickTimeoutRef.current)
      }
    }
  }, [])

  if (!editorState) return null

  const maxHeightBaselines = Math.max(1, baselinesPerGridModule)
  const activeColorScheme = previewColorScheme ?? editorColorScheme
  const previewPalette = colorSchemes.find((scheme) => scheme.id === activeColorScheme)?.colors ?? palette
  const transparencyPercent = opacityToTransparencyPercent(editorState.draftOpacity)
  const resolvedHeightBaselines = Math.max(0, Math.min(maxHeightBaselines, editorState.draftHeightBaselines))
  const toggleSection = (key: SectionKey) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }
  const handleSectionHeaderClick = (key: SectionKey) => (event: React.MouseEvent) => {
    if (event.detail > 1) return
    if (sectionHeaderClickTimeoutRef.current !== null) {
      window.clearTimeout(sectionHeaderClickTimeoutRef.current)
    }
    sectionHeaderClickTimeoutRef.current = window.setTimeout(() => {
      toggleSection(key)
      sectionHeaderClickTimeoutRef.current = null
    }, SECTION_HEADER_CLICK_DELAY_MS)
  }
  const handleSectionHeaderDoubleClick = (event: React.MouseEvent) => {
    event.preventDefault()
    if (sectionHeaderClickTimeoutRef.current !== null) {
      window.clearTimeout(sectionHeaderClickTimeoutRef.current)
      sectionHeaderClickTimeoutRef.current = null
    }
    setCollapsed((current) => {
      const allClosed = IMAGE_EDITOR_SECTION_KEYS.every((key) => current[key])
      return IMAGE_EDITOR_SECTION_KEYS.reduce((nextState, key) => {
        nextState[key] = !allClosed
        return nextState
      }, {} as Record<SectionKey, boolean>)
    })
  }

  const tone = isDarkMode
    ? {
      input: "border-gray-700 bg-gray-900 text-gray-100 focus:border-gray-500",
      muted: "text-gray-400",
      panel: "bg-gray-900",
      infoFrame: "border-gray-700 bg-gray-900/60",
      infoRow: "border-gray-800",
      infoLabel: "text-gray-400",
      infoValue: "text-gray-100",
      button: "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-gray-100",
      destructive: "border-red-700/70 text-red-200 hover:bg-red-950/40 hover:text-red-100",
      ringOffset: "ring-offset-gray-900",
      selectContent: "dark",
    }
    : {
      input: "border-gray-200 bg-white text-gray-900 focus:border-gray-400",
      muted: "text-gray-600",
      panel: "bg-white",
      infoFrame: "border-gray-200 bg-gray-50/80",
      infoRow: "border-gray-200",
      infoLabel: "text-gray-500",
      infoValue: "text-gray-900",
      button: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900",
      destructive: "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-900",
      ringOffset: "ring-offset-white",
      selectContent: "",
    }

  const triggerClassName = `h-9 ${tone.input}`
  const textInputClassName = `h-9 w-full rounded-md border px-3 text-sm outline-none ${tone.input}`
  const sectionLabelClassName = `text-sm ${tone.muted}`
  const infoRows = [
    ["Rows", String(editorState.draftRows)],
    ["Baselines", String(editorState.draftHeightBaselines)],
    ["Cols", String(editorState.draftColumns)],
    ["Scheme", colorSchemes.find((scheme) => scheme.id === editorColorScheme)?.label ?? editorColorScheme],
    ["Color", editorState.draftColor],
    ["Transparency", `${transparencyPercent}%`],
  ]

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

  return (
    <div data-image-editor-panel="true" className={`min-h-0 flex h-full flex-col overflow-hidden ${tone.panel}`}>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-4 md:p-6 md:pt-6">
        <EditorSidebarSection
          title="I. Geometry"
          tooltip="Rows, baselines, and column span"
          collapsed={collapsed.geometry}
          collapsedSummary={`${editorState.draftRows} rows, ${editorState.draftColumns} cols`}
          onHeaderClick={handleSectionHeaderClick("geometry")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(IMAGE_EDITOR_HELP_SECTION_BY_KEY.geometry)}
        >
          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Rows</Label>
            <Select
              value={String(editorState.draftRows)}
              onValueChange={(value) => {
                const rows = Math.max(0, Math.min(gridRows, Number(value)))
                setEditorState((prev) => (prev ? {
                  ...prev,
                  draftRows: rows,
                  draftHeightBaselines: rows === 0 && prev.draftHeightBaselines === 0 ? 1 : prev.draftHeightBaselines,
                } : prev))
              }}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={tone.selectContent}>
                {Array.from({ length: gridRows + 1 }, (_, index) => index).map((count) => (
                  <SelectItem key={`image-row-${count}`} value={String(count)}>
                    {count} {count === 1 ? "row" : "rows"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Baselines</Label>
            <Select
              value={String(resolvedHeightBaselines)}
              onValueChange={(value) => {
                const nextBaselines = Math.max(0, Math.min(maxHeightBaselines, Number(value)))
                setEditorState((prev) => (prev ? {
                  ...prev,
                  draftRows: prev.draftRows === 0 && nextBaselines === 0 ? 1 : prev.draftRows,
                  draftHeightBaselines: nextBaselines,
                } : prev))
              }}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={tone.selectContent}>
                <SelectItem value="0">0 baselines</SelectItem>
                {Array.from({ length: maxHeightBaselines }, (_, index) => index + 1).map((count) => (
                  <SelectItem key={`image-baselines-${count}`} value={String(count)}>
                    {count} {count === 1 ? "baseline" : "baselines"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Columns</Label>
            <Select
              value={String(editorState.draftColumns)}
              onValueChange={(value) => {
                const columns = Math.max(1, Math.min(gridCols, Number(value)))
                setEditorState((prev) => (prev ? { ...prev, draftColumns: columns } : prev))
              }}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={tone.selectContent}>
                {Array.from({ length: gridCols }, (_, index) => index + 1).map((count) => (
                  <SelectItem key={`image-col-${count}`} value={String(count)}>
                    {count} {count === 1 ? "col" : "cols"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </EditorSidebarSection>

        <EditorSidebarSection
          title="II. Color"
          tooltip="Scheme, swatch color, and transparency"
          collapsed={collapsed.color}
          collapsedSummary={`${colorSchemes.find((scheme) => scheme.id === editorColorScheme)?.label ?? editorColorScheme}, ${transparencyPercent}%`}
          onHeaderClick={handleSectionHeaderClick("color")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(IMAGE_EDITOR_HELP_SECTION_BY_KEY.color)}
        >
          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Scheme</Label>
            <Select
              value={editorColorScheme}
              onOpenChange={(open) => {
                if (!open) setPreviewColorScheme(null)
              }}
              onValueChange={(value) => {
                setEditorColorScheme(value as ImageColorSchemeId)
                setPreviewColorScheme(null)
              }}
            >
              <SelectTrigger className={triggerClassName}>
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
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Color</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {previewPalette.map((color, index) => {
                const selected = editorState.draftColor.toLowerCase() === color.toLowerCase()
                const swatchKey = `${activeColorScheme}-${index}-${color}`
                return (
                  <button
                    key={swatchKey}
                    type="button"
                    onClick={() => setEditorState((prev) => (prev ? { ...prev, draftColor: color } : prev))}
                    className={`h-7 w-7 rounded border ${selected ? `ring-2 ring-gray-500 ring-offset-1 ${tone.ringOffset}` : ""}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color}`}
                    title={color}
                  />
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Transparency</Label>
            <input
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
              className={textInputClassName}
            />
          </div>
        </EditorSidebarSection>

        <EditorSidebarSection
          title="III. Info"
          tooltip="Placeholder summary"
          collapsed={collapsed.info}
          collapsedSummary={`${editorState.draftColor}, ${transparencyPercent}%`}
          onHeaderClick={handleSectionHeaderClick("info")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(IMAGE_EDITOR_HELP_SECTION_BY_KEY.info)}
        >
          <div className={`border ${tone.infoFrame}`}>
            {infoRows.map(([label, value], index) => (
              <div
                key={label}
                className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-3 py-2 text-[11px] ${index > 0 ? `border-t ${tone.infoRow}` : ""}`}
              >
                <span className={tone.infoLabel}>{label}</span>
                <span className={`truncate text-right ${tone.infoValue}`}>{value}</span>
              </div>
            ))}
          </div>
        </EditorSidebarSection>

        <div className="pt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={`h-auto w-full justify-between rounded-md px-3 py-2 text-left text-[12px] ${tone.destructive}`}
            onClick={deleteEditor}
          >
            <span className="font-medium">Delete Image Placeholder</span>
            <Trash2 className="h-4 w-4 shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  )
}
