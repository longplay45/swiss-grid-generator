"use client"

import { Button } from "@/components/ui/button"
import { FontSelect } from "@/components/ui/font-select"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FontFamily } from "@/lib/config/fonts"
import { FONT_OPTIONS, getFontFamilyCss } from "@/lib/config/fonts"
import type { HelpSectionId } from "@/lib/help-registry"
import {
  AlignLeft,
  AlignRight,
  Bold,
  CaseSensitive,
  Columns3,
  Italic,
  Palette,
  RotateCw,
  Rows3,
  Save as SaveIcon,
  Trash2,
  Type,
} from "lucide-react"
import { useEffect, useState } from "react"
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"

export type BlockEditorTextAlign = "left" | "right"

export type BlockEditorState<StyleKey extends string = string> = {
  target: string
  draftText: string
  draftStyle: StyleKey
  draftFxSize: number
  draftFxLeading: number
  draftFont: FontFamily
  draftColumns: number
  draftRows: number
  draftAlign: BlockEditorTextAlign
  draftColor: string
  draftReflow: boolean
  draftSyllableDivision: boolean
  draftBold: boolean
  draftItalic: boolean
  draftRotation: number
  draftTextEdited: boolean
}

export type BlockEditorStyleOption<StyleKey extends string = string> = {
  value: StyleKey
  label: string
}

type BlockEditorDialogProps<StyleKey extends string> = {
  editorState: BlockEditorState<StyleKey> | null
  setEditorState: Dispatch<SetStateAction<BlockEditorState<StyleKey> | null>>
  closeEditor: () => void
  saveEditor: () => void
  deleteEditorBlock: () => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  isDarkMode: boolean
  showEditorHelpIcon: boolean
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  gridRows: number
  gridCols: number
  hierarchyTriggerMinWidthCh: number
  rowTriggerMinWidthCh: number
  colTriggerMinWidthCh: number
  styleOptions: Array<BlockEditorStyleOption<StyleKey>>
  getStyleSizeLabel: (styleKey: StyleKey) => string
  getStyleSizeValue: (styleKey: StyleKey) => number
  getStyleLeadingValue: (styleKey: StyleKey) => number
  isFxStyle: (styleKey: StyleKey) => boolean
  getDummyTextForStyle: (styleKey: StyleKey) => string
  colorSchemes: readonly { id: ImageColorSchemeId; label: string; colors: readonly string[] }[]
  selectedColorScheme: ImageColorSchemeId
  onColorSchemeChange: (value: ImageColorSchemeId) => void
  palette: readonly string[]
}

function EditorControlTooltip({
  label,
  children,
  className = "",
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <HoverTooltip
      label={label}
      className={`inline-flex ${className}`.trim()}
      tooltipClassName="-top-8 left-1/2 -translate-x-1/2 whitespace-nowrap border-gray-300 bg-white text-gray-700 transition-all duration-75 group-hover:-translate-y-0.5 group-focus-within:-translate-y-0.5"
    >
      {children}
    </HoverTooltip>
  )
}

export function BlockEditorDialog<StyleKey extends string>({
  editorState,
  setEditorState,
  closeEditor,
  saveEditor,
  deleteEditorBlock,
  textareaRef,
  isDarkMode,
  showEditorHelpIcon,
  onOpenHelpSection,
  gridRows,
  gridCols,
  hierarchyTriggerMinWidthCh,
  rowTriggerMinWidthCh,
  colTriggerMinWidthCh,
  styleOptions,
  getStyleSizeLabel,
  getStyleSizeValue,
  getStyleLeadingValue,
  isFxStyle,
  getDummyTextForStyle,
  colorSchemes,
  selectedColorScheme,
  onColorSchemeChange,
  palette,
}: BlockEditorDialogProps<StyleKey>) {
  const [fxSizeInput, setFxSizeInput] = useState("")
  const [fxLeadingInput, setFxLeadingInput] = useState("")

  useEffect(() => {
    if (!editorState) {
      setFxSizeInput("")
      setFxLeadingInput("")
      return
    }
    setFxSizeInput(String(editorState.draftFxSize))
    setFxLeadingInput(String(editorState.draftFxLeading))
  }, [editorState])

  if (!editorState) return null

  const editorText = editorState.draftText ?? ""
  const editorCharacterCount = editorText.length
  const editorWordCount = editorText.trim() ? editorText.trim().split(/\s+/).length : 0
  const fxSelected = isFxStyle(editorState.draftStyle)

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center p-4 ${isDarkMode ? "bg-black/45" : "bg-black/20"}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeEditor()
      }}
    >
      <div
        className={`w-full max-w-[500px] md:min-w-[460px] rounded-md border shadow-xl ${isDarkMode ? "dark border-gray-700 bg-gray-900 text-gray-100" : "border-gray-300 bg-white"} ${showEditorHelpIcon ? "ring-1 ring-blue-500" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseEnter={showEditorHelpIcon ? () => onOpenHelpSection?.("help-editor") : undefined}
      >
        <div className={`space-y-2 border-b px-3 py-2 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <EditorControlTooltip label="Paragraph row span">
                  <div className="flex min-w-0 items-center gap-1">
                    <Rows3 className="h-4 w-4 shrink-0 text-gray-500" />
                    <Select
                      value={String(editorState.draftRows)}
                      onValueChange={(value) => {
                        setEditorState((prev) => prev ? {
                          ...prev,
                          draftRows: Math.max(1, Math.min(gridRows, Number(value))),
                        } : prev)
                      }}
                      >
                        <SelectTrigger
                          className="h-8 text-xs"
                          style={{ minWidth: `${rowTriggerMinWidthCh}ch` }}
                        >
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: gridRows }, (_, index) => index + 1).map((count) => (
                          <SelectItem key={count} value={String(count)}>
                            {count} {count === 1 ? "row" : "rows"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </EditorControlTooltip>
              </div>
              <div className="shrink-0">
                <EditorControlTooltip label="Paragraph column span">
                  <div className="flex min-w-0 items-center gap-1">
                    <Columns3 className="h-4 w-4 shrink-0 text-gray-500" />
                    <Select
                      value={String(editorState.draftColumns)}
                      onValueChange={(value) => {
                        setEditorState((prev) => prev ? {
                          ...prev,
                          draftColumns: Math.max(1, Math.min(gridCols, Number(value))),
                        } : prev)
                      }}
                      >
                        <SelectTrigger
                          className="h-8 text-xs"
                          style={{ minWidth: `${colTriggerMinWidthCh}ch` }}
                        >
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: gridCols }, (_, index) => index + 1).map((count) => (
                          <SelectItem key={count} value={String(count)}>
                            {count} {count === 1 ? "col" : "cols"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </EditorControlTooltip>
              </div>
              <div className="shrink-0">
                <EditorControlTooltip label={`Paragraph rotation: ${Math.round(editorState.draftRotation)}deg`} className="min-w-0">
                  <div className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4 shrink-0 text-gray-500" />
                    <input
                      type="number"
                      min={-180}
                      max={180}
                      step={1}
                      value={Math.round(editorState.draftRotation)}
                      onChange={(event) => {
                        const parsed = Number(event.target.value)
                        const next = Number.isFinite(parsed) ? parsed : 0
                        setEditorState((prev) => prev ? {
                          ...prev,
                          draftRotation: Math.max(-180, Math.min(180, next)),
                        } : prev)
                      }}
                      className={`h-8 w-16 rounded-md border px-2 text-xs outline-none ${
                        isDarkMode
                          ? "border-gray-700 bg-gray-950 text-gray-100 focus:border-gray-600"
                          : "border-gray-200 bg-gray-50 text-gray-900 focus:border-gray-300"
                      }`}
                    />
                  </div>
                </EditorControlTooltip>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <EditorControlTooltip label="Save changes">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={saveEditor}
                  aria-label="Save changes"
                >
                  <SaveIcon className="h-4 w-4" />
                </Button>
              </EditorControlTooltip>
            </div>
          </div>
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <EditorControlTooltip label="Font hierarchy" className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1">
                    <Type className="h-4 w-4 shrink-0 text-gray-500" />
                    <Select
                      value={editorState.draftStyle}
                      onValueChange={(value) => {
                        const nextStyle = value as StyleKey
                        setEditorState((prev) => prev ? {
                          ...prev,
                          draftStyle: nextStyle,
                          draftFxSize: isFxStyle(nextStyle)
                            ? (isFxStyle(prev.draftStyle) ? prev.draftFxSize : getStyleSizeValue(nextStyle))
                            : prev.draftFxSize,
                          draftFxLeading: isFxStyle(nextStyle)
                            ? (isFxStyle(prev.draftStyle) ? prev.draftFxLeading : getStyleLeadingValue(nextStyle))
                            : prev.draftFxLeading,
                          draftText: prev.draftTextEdited ? prev.draftText : getDummyTextForStyle(nextStyle),
                        } : prev)
                      }}
                    >
                      <SelectTrigger
                        className="h-8 text-xs"
                        style={{ minWidth: `${hierarchyTriggerMinWidthCh}ch` }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {styleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label} ({getStyleSizeLabel(option.value)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </EditorControlTooltip>
              </div>
              <div className="shrink-0">
                <EditorControlTooltip label="Font family" className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1">
                    <CaseSensitive className="h-4 w-4 shrink-0 text-gray-500" />
                    <FontSelect
                      value={editorState.draftFont}
                      onValueChange={(value) => {
                        setEditorState((prev) => prev ? {
                          ...prev,
                          draftFont: value as FontFamily,
                        } : prev)
                      }}
                      options={FONT_OPTIONS}
                      fitToLongestOption
                      triggerClassName="h-8 text-xs"
                    />
                  </div>
                </EditorControlTooltip>
              </div>
            </div>
            {fxSelected ? (
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <EditorControlTooltip label="FX font size (pt)" className="min-w-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={fxSizeInput}
                        onChange={(event) => {
                          const normalized = event.target.value.replace(",", ".")
                          if (!/^\d*\.?\d*$/.test(normalized)) return
                          setFxSizeInput(normalized)
                        }}
                        onBlur={() => {
                          const parsed = Number(fxSizeInput)
                          if (!Number.isFinite(parsed) || parsed <= 0) {
                            setFxSizeInput(String(editorState.draftFxSize))
                            return
                          }
                          const clamped = Math.max(1, Math.min(400, Math.round(parsed * 10) / 10))
                          setEditorState((prev) => prev ? { ...prev, draftFxSize: clamped } : prev)
                          setFxSizeInput(String(clamped))
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return
                          event.preventDefault()
                          ;(event.currentTarget as HTMLInputElement).blur()
                        }}
                        className={`h-8 w-20 rounded-md border px-2 text-xs outline-none ${
                          isDarkMode
                            ? "border-gray-700 bg-gray-950 text-gray-100 focus:border-gray-600"
                            : "border-gray-200 bg-gray-50 text-gray-900 focus:border-gray-300"
                        }`}
                        aria-label="FX font size"
                      />
                      <span className="text-xs text-gray-500">pt</span>
                    </div>
                  </EditorControlTooltip>
                </div>
                <div className="shrink-0">
                  <EditorControlTooltip label="FX line leading (pt)" className="min-w-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={fxLeadingInput}
                        onChange={(event) => {
                          const normalized = event.target.value.replace(",", ".")
                          if (!/^\d*\.?\d*$/.test(normalized)) return
                          setFxLeadingInput(normalized)
                        }}
                        onBlur={() => {
                          const parsed = Number(fxLeadingInput)
                          if (!Number.isFinite(parsed) || parsed <= 0) {
                            setFxLeadingInput(String(editorState.draftFxLeading))
                            return
                          }
                          const clamped = Math.max(1, Math.min(800, Math.round(parsed * 10) / 10))
                          setEditorState((prev) => prev ? { ...prev, draftFxLeading: clamped } : prev)
                          setFxLeadingInput(String(clamped))
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return
                          event.preventDefault()
                          ;(event.currentTarget as HTMLInputElement).blur()
                        }}
                        className={`h-8 w-20 rounded-md border px-2 text-xs outline-none ${
                          isDarkMode
                            ? "border-gray-700 bg-gray-950 text-gray-100 focus:border-gray-600"
                            : "border-gray-200 bg-gray-50 text-gray-900 focus:border-gray-300"
                        }`}
                        aria-label="FX line leading"
                      />
                      <span className="text-xs text-gray-500">pt</span>
                    </div>
                  </EditorControlTooltip>
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex items-center rounded-md border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <EditorControlTooltip label={editorState.draftBold ? "Bold: On" : "Bold: Off"}>
                    <Button
                      type="button"
                      size="icon"
                      variant={editorState.draftBold ? "secondary" : "ghost"}
                      className={`h-8 w-8 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                      onClick={() => {
                        setEditorState((prev) => prev ? { ...prev, draftBold: !prev.draftBold } : prev)
                      }}
                      aria-label={editorState.draftBold ? "Disable bold" : "Enable bold"}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                  </EditorControlTooltip>
                  <EditorControlTooltip label={editorState.draftItalic ? "Italic: On" : "Italic: Off"}>
                    <Button
                      type="button"
                      size="icon"
                      variant={editorState.draftItalic ? "secondary" : "ghost"}
                      className={`h-8 w-8 rounded-none border-l ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                      onClick={() => {
                        setEditorState((prev) => prev ? { ...prev, draftItalic: !prev.draftItalic } : prev)
                      }}
                      aria-label={editorState.draftItalic ? "Disable italic" : "Enable italic"}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                  </EditorControlTooltip>
                </div>
                <div className={`flex items-center rounded-md border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <EditorControlTooltip label="Align left">
                    <Button
                      type="button"
                      size="icon"
                      variant={editorState.draftAlign === "left" ? "secondary" : "ghost"}
                      className={`h-8 w-8 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                      onClick={() => {
                        setEditorState((prev) => prev ? { ...prev, draftAlign: "left" } : prev)
                      }}
                      aria-label="Align left"
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                  </EditorControlTooltip>
                  <EditorControlTooltip label="Align right">
                    <Button
                      type="button"
                      size="icon"
                      variant={editorState.draftAlign === "right" ? "secondary" : "ghost"}
                      className={`h-8 w-8 rounded-none border-l ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                      onClick={() => {
                        setEditorState((prev) => prev ? { ...prev, draftAlign: "right" } : prev)
                      }}
                      aria-label="Align right"
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </EditorControlTooltip>
                </div>
                <div className={`flex items-center rounded-md border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <EditorControlTooltip label={editorState.draftReflow ? "Reflow: On" : "Reflow: Off"}>
                    <Button
                      type="button"
                      size="icon"
                      variant={editorState.draftReflow ? "secondary" : "ghost"}
                      className={`h-8 w-8 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                      onClick={() => {
                        setEditorState((prev) => prev ? { ...prev, draftReflow: !prev.draftReflow } : prev)
                      }}
                      aria-label={editorState.draftReflow ? "Disable reflow" : "Enable reflow"}
                    >
                      <Rows3 className={`h-4 w-4 transition-transform ${editorState.draftColumns > 1 ? "rotate-90" : ""}`} />
                    </Button>
                  </EditorControlTooltip>
                  <EditorControlTooltip label={editorState.draftSyllableDivision ? "Syllable division: On" : "Syllable division: Off"}>
                    <Button
                      type="button"
                      size="sm"
                      variant={editorState.draftSyllableDivision ? "secondary" : "ghost"}
                      className={`h-8 min-w-10 rounded-none border-l px-2 text-xs ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                      onClick={() => {
                        setEditorState((prev) => prev ? { ...prev, draftSyllableDivision: !prev.draftSyllableDivision } : prev)
                      }}
                      aria-label={editorState.draftSyllableDivision ? "Disable syllable division" : "Enable syllable division"}
                    >
                      Hy
                    </Button>
                  </EditorControlTooltip>
                </div>
              </div>
              <EditorControlTooltip label="Delete paragraph">
                <Button
                  size="icon"
                  variant="outline"
                  className={`h-8 w-8 ${isDarkMode ? "text-gray-300 hover:text-red-400" : "text-gray-500 hover:text-red-600"}`}
                  onClick={deleteEditorBlock}
                  aria-label="Delete paragraph"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </EditorControlTooltip>
            </div>
            <div className="flex items-center gap-2">
              <div className="shrink-0 min-w-[92px]">
                <EditorControlTooltip label="Color shema" className="min-w-0">
                  <Select
                    value={selectedColorScheme}
                    onValueChange={(value) => {
                      const nextScheme = value as ImageColorSchemeId
                      onColorSchemeChange(nextScheme)
                      const nextPalette = colorSchemes.find((scheme) => scheme.id === nextScheme)?.colors ?? palette
                      const hasCurrentColor = nextPalette.some((color) => color.toLowerCase() === editorState.draftColor.toLowerCase())
                      if (hasCurrentColor || !nextPalette.length) return
                      setEditorState((prev) => (prev ? { ...prev, draftColor: nextPalette[0] } : prev))
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorSchemes.map((scheme) => (
                        <SelectItem key={scheme.id} value={scheme.id}>
                          {scheme.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </EditorControlTooltip>
              </div>
              <div className="flex items-center gap-2">
                <EditorControlTooltip label="Text color palette" className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 shrink-0 text-gray-500" />
                    <div className="grid grid-cols-4 gap-2">
                      {palette.map((color, index) => {
                        const selected = editorState.draftColor.toLowerCase() === color.toLowerCase()
                        return (
                          <button
                            key={`${selectedColorScheme}-${index}-${color}`}
                            type="button"
                            onClick={() => setEditorState((prev) => (prev ? { ...prev, draftColor: color } : prev))}
                            className={`h-6 w-8 rounded border ${selected ? "ring-2 ring-offset-1 ring-gray-500" : ""} ${isDarkMode ? "ring-offset-gray-900" : "ring-offset-white"}`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select ${color}`}
                            title={color}
                          />
                        )
                      })}
                    </div>
                  </div>
                </EditorControlTooltip>
              </div>
            </div>
        </div>
        <div className="p-3">
          <textarea
            ref={textareaRef}
            value={editorState.draftText}
            onChange={(event) => {
              const value = event.target.value
              setEditorState((prev) => prev ? {
                ...prev,
                draftText: value,
                draftTextEdited: true,
              } : prev)
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                closeEditor()
                return
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                saveEditor()
              }
            }}
            style={{
              fontFamily: getFontFamilyCss(editorState.draftFont),
              fontStyle: editorState.draftItalic ? "italic" : "normal",
              fontWeight: editorState.draftBold ? 700 : 400,
              textAlign: editorState.draftAlign,
              color: editorState.draftColor,
            }}
            className={`min-h-40 w-full resize-y rounded-md border p-3 outline-none ring-0 ${
              isDarkMode
                ? "border-gray-700 bg-gray-950 text-gray-100 focus:border-gray-600"
                : "border-gray-200 bg-gray-50 text-gray-900 focus:border-gray-300"
            }`}
          />
        </div>
        <div className={`flex items-center justify-between gap-3 border-t px-3 py-2 text-[11px] ${
          isDarkMode ? "border-gray-700 text-gray-400" : "border-gray-100 text-gray-500"
        }`}>
          <div className="flex items-center gap-3">
            <span>Characters: {editorCharacterCount}</span>
            <span>Words: {editorWordCount}</span>
          </div>
          <span className="text-right">Esc or click outside to close without saving.</span>
        </div>
      </div>
    </div>
  )
}
