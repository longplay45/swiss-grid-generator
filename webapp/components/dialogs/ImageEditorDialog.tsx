"use client"

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"

import { EditorSidebarSection } from "@/components/layout/EditorSidebarSection"
import { EditorColorSchemeControls } from "@/components/ui/editor-color-scheme-controls"
import { Label } from "@/components/ui/label"
import { DebouncedSlider } from "@/components/ui/slider"
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TopSelectContent,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { clampRotation } from "@/lib/block-constraints"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import {
  clampTransparencyPercent,
  opacityToTransparencyPercent,
  transparencyPercentToOpacity,
} from "@/lib/image-placeholder-opacity"
import {
  EDITOR_PANEL_PERSISTENCE_RESET_EVENT,
  IMAGE_EDITOR_SCROLL_STORAGE_KEY,
  IMAGE_EDITOR_SECTIONS_STORAGE_KEY,
} from "@/lib/editor-panel-persistence"
import { useAutoScrollOpenedSection } from "@/hooks/useAutoScrollOpenedSection"
import { usePersistedSectionState } from "@/hooks/usePersistedSectionState"
import { useStateSnapshotSelectPreview } from "@/hooks/useStateSnapshotSelectPreview"
import type { HelpSectionId } from "@/lib/help-registry"
import { LabeledControlRow } from "@/components/ui/labeled-control-row"

export type ImageEditorState = {
  target: string
  draftColumns: number
  draftRows: number
  draftHeightBaselines: number
  draftSnapToColumns: boolean
  draftSnapToBaseline: boolean
  draftRotation: number
  draftColor: string
  draftOpacity: number
}

type SectionKey = "geometry" | "color" | "info"
const SECTION_HEADER_CLICK_DELAY_MS = 180
const IMAGE_EDITOR_SECTION_KEYS: SectionKey[] = ["geometry", "color", "info"]

const IMAGE_EDITOR_COLLAPSED_DEFAULTS: Record<SectionKey, boolean> = {
  geometry: true,
  color: true,
  info: true,
}

type ImageEditorDialogProps = {
  editorState: ImageEditorState | null
  setEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
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
    IMAGE_EDITOR_SECTIONS_STORAGE_KEY,
    IMAGE_EDITOR_COLLAPSED_DEFAULTS,
    { resetEventName: EDITOR_PANEL_PERSISTENCE_RESET_EVENT },
  )
  const { scrollRootRef, registerSectionRef } = useAutoScrollOpenedSection(collapsed, {
    resetEventName: EDITOR_PANEL_PERSISTENCE_RESET_EVENT,
    restoreKey: editorState?.target ?? null,
    scrollStorageKey: IMAGE_EDITOR_SCROLL_STORAGE_KEY,
  })
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

  const maxHeightBaselines = Math.max(0, baselinesPerGridModule - 1)
  const applyDraftRowsValue = (value: string, state: ImageEditorState | null) => {
    if (!state) return state
    const rows = Math.max(0, Math.min(gridRows, Number(value)))
    return {
      ...state,
      draftRows: rows,
    }
  }

  const applyDraftColumnsValue = (value: string, state: ImageEditorState | null) => {
    if (!state) return state
    const columns = Math.max(1, Math.min(gridCols, Number(value)))
    return { ...state, draftColumns: columns }
  }

  const applyDraftBaselinesValue = (value: string, state: ImageEditorState | null) => {
    if (!state) return state
    const nextBaselines = Math.max(0, Math.min(maxHeightBaselines, Number(value)))
    return {
      ...state,
      draftHeightBaselines: nextBaselines,
    }
  }

  const rowsSelectPreview = useStateSnapshotSelectPreview({
    state: editorState,
    setState: setEditorState,
    applyValue: applyDraftRowsValue,
    committedValue: String(editorState?.draftRows ?? 0),
  })
  const columnsSelectPreview = useStateSnapshotSelectPreview({
    state: editorState,
    setState: setEditorState,
    applyValue: applyDraftColumnsValue,
    committedValue: String(editorState?.draftColumns ?? 1),
  })
  const baselinesSelectPreview = useStateSnapshotSelectPreview({
    state: editorState,
    setState: setEditorState,
    applyValue: applyDraftBaselinesValue,
    committedValue: String(editorState?.draftHeightBaselines ?? 0),
  })

  if (!editorState) return null

  const activeColorScheme = previewColorScheme ?? editorColorScheme
  const previewPalette = colorSchemes.find((scheme) => scheme.id === activeColorScheme)?.colors ?? palette
  const transparencyPercent = opacityToTransparencyPercent(editorState.draftOpacity)
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
      panel: "bg-transparent",
      surface: "bg-transparent",
      infoFrame: "border-gray-700 bg-gray-900/60",
      infoRow: "border-gray-800",
      infoLabel: "text-gray-400",
      infoValue: "text-gray-100",
      button: "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-gray-100",
      ringOffset: "ring-offset-gray-900",
      selectContent: "dark",
    }
    : {
      input: "border-gray-200 bg-white text-gray-900 focus:border-gray-400",
      muted: "text-gray-600",
      panel: "bg-transparent",
      surface: "bg-transparent",
      infoFrame: "border-gray-200 bg-gray-50/80",
      infoRow: "border-gray-200",
      infoLabel: "text-gray-500",
      infoValue: "text-gray-900",
      button: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900",
      ringOffset: "ring-offset-white",
      selectContent: "",
    }

  const triggerClassName = `h-9 ${tone.input}`
  const textInputClassName = `h-9 w-full rounded-md border px-3 text-sm outline-none ${tone.input}`
  const sectionLabelClassName = `text-sm ${tone.muted}`
  const inlineSwitchClassName = "h-3 w-6 rounded-none border border-black bg-gray-300 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
  const inlineSwitchThumbClassName = "h-3 w-3 rounded-none border border-black bg-white shadow-none data-[state=checked]:translate-x-3"
  const infoRows = [
    ["Rows", String(editorState.draftRows)],
    ["Baselines", String(editorState.draftHeightBaselines)],
    ["Cols", String(editorState.draftColumns)],
    ["Snap X", editorState.draftSnapToColumns ? "On" : "Off"],
    ["Snap Y", editorState.draftSnapToBaseline ? "On" : "Off"],
    ["Rotation", `${Math.round(editorState.draftRotation)}deg`],
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
    <div
      data-image-editor-panel="true"
      data-editor-interactive-root="true"
      className={`min-h-0 flex h-full flex-col overflow-hidden ${tone.panel}`}
    >
      <div ref={scrollRootRef} className={`min-h-0 flex-1 overflow-y-auto p-4 pt-4 md:p-6 md:pt-6 ${tone.surface}`}>
        <div ref={registerSectionRef("geometry")}>
        <EditorSidebarSection
          title={(
            <span className="inline-flex items-center gap-2">
              <span>I. Paragraph</span>
              <span className={`inline-flex items-center gap-2 ${isDarkMode ? "text-[#F4F6F8]" : "text-gray-900"}`}>
                <span>IMAGE</span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm border border-black/10"
                  style={{ backgroundColor: editorState.draftColor }}
                  aria-hidden="true"
                />
              </span>
            </span>
          )}
          tooltip="Rows, baselines, columns, axis snap, and rotation; geometry dropdowns preview on rollover"
          collapsed={collapsed.geometry}
          collapsedSummary={`${editorState.draftRows} rows, ${editorState.draftColumns} cols, ${Math.round(editorState.draftRotation)}deg`}
          onHeaderClick={handleSectionHeaderClick("geometry")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(IMAGE_EDITOR_HELP_SECTION_BY_KEY.geometry)}
        >
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <Label className={sectionLabelClassName}>Rows</Label>
            <Label className={`${sectionLabelClassName} text-right`}>Cols</Label>

            <Select
              value={rowsSelectPreview.value}
              onOpenChange={rowsSelectPreview.handleOpenChange}
              onValueChange={rowsSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent className={tone.selectContent} onPointerLeave={rowsSelectPreview.handleContentPointerLeave}>
                {Array.from({ length: gridRows + 1 }, (_, index) => index).map((count) => (
                  <SelectItem
                    key={`image-row-${count}`}
                    value={String(count)}
                    {...rowsSelectPreview.getItemPreviewProps(String(count))}
                  >
                    {count} {count === 1 ? "row" : "rows"}
                  </SelectItem>
                ))}
              </TopSelectContent>
            </Select>

            <Select
              value={columnsSelectPreview.value}
              onOpenChange={columnsSelectPreview.handleOpenChange}
              onValueChange={columnsSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent className={tone.selectContent} onPointerLeave={columnsSelectPreview.handleContentPointerLeave}>
                {Array.from({ length: gridCols }, (_, index) => index + 1).map((count) => (
                  <SelectItem
                    key={`image-col-${count}`}
                    value={String(count)}
                    {...columnsSelectPreview.getItemPreviewProps(String(count))}
                  >
                    {count} {count === 1 ? "col" : "cols"}
                  </SelectItem>
                ))}
              </TopSelectContent>
            </Select>

            <Label className={sectionLabelClassName}>Baselines</Label>
            <div aria-hidden="true" />

            <Select
              value={baselinesSelectPreview.value}
              onOpenChange={baselinesSelectPreview.handleOpenChange}
              onValueChange={baselinesSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <TopSelectContent className={tone.selectContent} onPointerLeave={baselinesSelectPreview.handleContentPointerLeave}>
                <SelectItem value="0" {...baselinesSelectPreview.getItemPreviewProps("0")}>0 baselines</SelectItem>
                {Array.from({ length: maxHeightBaselines }, (_, index) => index + 1).map((count) => (
                  <SelectItem
                    key={`image-baselines-${count}`}
                    value={String(count)}
                    {...baselinesSelectPreview.getItemPreviewProps(String(count))}
                  >
                    {count} {count === 1 ? "baseline" : "baselines"}
                  </SelectItem>
                ))}
              </TopSelectContent>
            </Select>
          </div>

          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={sectionLabelClassName}>Rotation</Label>
                <span className={`rounded px-1.5 py-0.5 text-xs font-mono ${isDarkMode ? "bg-gray-800 text-gray-100" : "bg-gray-100 text-gray-900"}`}>
                  {Math.round(editorState.draftRotation)}°
                </span>
              </div>
              <DebouncedSlider
                value={[editorState.draftRotation]}
                min={-180}
                max={180}
                step={1}
                onValueCommit={([value]) => {
                  setEditorState((prev) => prev ? {
                    ...prev,
                    draftRotation: clampRotation(value),
                  } : prev)
                }}
                onThumbDoubleClick={() => {
                  setEditorState((prev) => prev ? {
                    ...prev,
                    draftRotation: 0,
                  } : prev)
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className={sectionLabelClassName}>Snap to Columns (X)</Label>
                <p className={`mt-1 text-[11px] ${tone.muted}`}>Lock horizontal placement to column anchors.</p>
              </div>
              <Switch
                checked={editorState.draftSnapToColumns}
                onCheckedChange={(checked) => setEditorState((prev) => prev ? { ...prev, draftSnapToColumns: checked } : prev)}
                className={inlineSwitchClassName}
                thumbClassName={inlineSwitchThumbClassName}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className={sectionLabelClassName}>Snap to Baseline (Y)</Label>
                <p className={`mt-1 text-[11px] ${tone.muted}`}>Lock vertical placement to baseline steps.</p>
              </div>
              <Switch
                checked={editorState.draftSnapToBaseline}
                onCheckedChange={(checked) => setEditorState((prev) => prev ? { ...prev, draftSnapToBaseline: checked } : prev)}
                className={inlineSwitchClassName}
                thumbClassName={inlineSwitchThumbClassName}
              />
            </div>
          </div>
        </EditorSidebarSection>
        </div>

        <div ref={registerSectionRef("color")}>
        <EditorSidebarSection
          title="II. Color"
          tooltip="Scheme, swatch color, and transparency; scheme dropdown previews on rollover"
          collapsed={collapsed.color}
          collapsedSummary={`${colorSchemes.find((scheme) => scheme.id === editorColorScheme)?.label ?? editorColorScheme}, ${transparencyPercent}%`}
          onHeaderClick={handleSectionHeaderClick("color")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(IMAGE_EDITOR_HELP_SECTION_BY_KEY.color)}
        >
          <EditorColorSchemeControls
            schemes={colorSchemes}
            schemeValue={editorColorScheme}
            onSchemeOpenChange={(open) => {
              if (!open) setPreviewColorScheme(null)
            }}
            onSchemeValueChange={(value) => {
              setEditorColorScheme(value as ImageColorSchemeId)
              setPreviewColorScheme(null)
            }}
            onSchemeContentPointerLeave={() => setPreviewColorScheme(null)}
            getSchemeItemPreviewProps={(value) => ({
              onFocus: () => setPreviewColorScheme(value as ImageColorSchemeId),
              onPointerMove: () => setPreviewColorScheme(value as ImageColorSchemeId),
            })}
            displayedColors={previewPalette}
            selectedColor={editorState.draftColor}
            onColorSelect={(color) => setEditorState((prev) => (prev ? { ...prev, draftColor: color } : prev))}
            isDarkMode={isDarkMode}
            labelClassName={sectionLabelClassName}
            triggerClassName={triggerClassName}
            selectContentClassName={tone.selectContent}
            ringOffsetClassName={tone.ringOffset}
          />

          <div className="space-y-2">
            <LabeledControlRow label={<Label className={sectionLabelClassName}>Transparency</Label>}>
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
            </LabeledControlRow>
          </div>
        </EditorSidebarSection>
        </div>

        <div ref={registerSectionRef("info")}>
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
        </div>
      </div>
    </div>
  )
}
