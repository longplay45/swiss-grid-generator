"use client"

import { Button } from "@/components/ui/button"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import { FontSelect } from "@/components/ui/font-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FONT_OPTIONS, type FontFamily } from "@/lib/config/fonts"
import { clampFxLeading, clampFxSize, clampRotation } from "@/lib/block-constraints"
import type {
  BlockEditorState,
  BlockEditorStyleOption,
} from "@/components/editor/block-editor-types"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import {
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  CaseSensitive,
  Columns3,
  Info,
  Italic,
  Palette,
  RotateCw,
  Rows3,
  Trash2,
  Type,
  TypeOutline,
} from "lucide-react"
import { useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"

type TextEditorPanelProps<StyleKey extends string> = {
  controls: TextEditorPanelControls<StyleKey>
  isHelpActive?: boolean
  showRolloverInfo?: boolean
}

type MainSubmenu = "geometry" | "type" | "color" | "info" | null

type TextEditorPanelControls<StyleKey extends string> = {
  editorState: BlockEditorState<StyleKey>
  setEditorState: Dispatch<SetStateAction<BlockEditorState<StyleKey> | null>>
  deleteEditorBlock: () => void
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

export function TextEditorPanel<StyleKey extends string>({
  controls,
  isHelpActive = false,
  showRolloverInfo = true,
}: TextEditorPanelProps<StyleKey>) {
  const [activeSubmenu, setActiveSubmenu] = useState<MainSubmenu>(null)
  const [fxSizeInput, setFxSizeInput] = useState("")
  const [fxLeadingInput, setFxLeadingInput] = useState("")
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)
  const fxSelected = controls.isFxStyle(controls.editorState.draftStyle)

  const editorText = controls.editorState.draftText ?? ""
  const characterCount = editorText.length
  const wordCount = editorText.trim() ? editorText.trim().split(/\s+/).length : 0
  const canUseNewspaperReflow = controls.editorState.draftColumns > 1
  const selectedStyleLabel = controls.styleOptions.find((option) => option.value === controls.editorState.draftStyle)?.label
    ?? controls.editorState.draftStyle
  const selectedSchemeLabel = controls.colorSchemes.find((scheme) => scheme.id === controls.selectedColorScheme)?.label
    ?? controls.selectedColorScheme
  const colorSchemeTriggerWidthCh = Math.max(
    ...controls.colorSchemes.map((scheme) => scheme.label.length),
    12,
  ) + 3
  const previewPalette = previewColorScheme
    ? (controls.colorSchemes.find((scheme) => scheme.id === previewColorScheme)?.colors ?? controls.palette)
    : controls.palette

  useEffect(() => {
    setFxSizeInput(String(controls.editorState.draftFxSize))
    setFxLeadingInput(String(controls.editorState.draftFxLeading))
  }, [controls.editorState.draftFxLeading, controls.editorState.draftFxSize, controls.editorState.target])

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
  const railTooltipClassName = "left-full top-1/2 ml-2 w-max -translate-y-1/2 whitespace-nowrap border-gray-200 bg-white/95 text-gray-700 shadow-lg"
  const submenuTooltipClassName = "left-1/2 top-full mt-2 w-max max-w-[24rem] -translate-x-1/2 whitespace-normal border-gray-200 bg-white/95 text-gray-700 shadow-lg"
  const toggleSubmenu = (next: Exclude<MainSubmenu, null>) => {
    setActiveSubmenu((prev) => (prev === next ? null : next))
  }
  const withRailTooltip = (label: string, child: React.ReactNode) => (
    <HoverTooltip
      className="block"
      label={label}
      disabled={!showRolloverInfo}
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
      tooltipClassName={submenuTooltipClassName}
    >
      {child}
    </HoverTooltip>
  )

  return (
    <div className="flex items-start gap-2">
      <div className={`flex w-10 shrink-0 flex-col items-center gap-1 rounded-md border p-1 ${tone.rail}`}>
        {withRailTooltip("Rows, columns, and rotation", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "geometry")}
          onClick={() => toggleSubmenu("geometry")}
          aria-label="Rows, columns, rotation"
        >
          <Rows3 className="h-4 w-4" />
        </Button>)}
        {withRailTooltip("Font family, hierarchy, and FX size/leading", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "type")}
          onClick={() => toggleSubmenu("type")}
          aria-label="Font and hierarchy"
        >
          <Type className="h-4 w-4" />
        </Button>)}
        {withRailTooltip("Color scheme and paragraph color", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "color")}
          onClick={() => toggleSubmenu("color")}
          aria-label="Color controls"
        >
          <Palette className="h-4 w-4" />
        </Button>)}

        <div className={`my-1 h-px w-full ${tone.divider}`} />

        {withRailTooltip(controls.editorState.draftBold ? "Disable bold" : "Enable bold", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(controls.editorState.draftBold)}
          onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftBold: !prev.draftBold } : prev)}
          aria-label={controls.editorState.draftBold ? "Disable bold" : "Enable bold"}
        >
          <Bold className="h-4 w-4" />
        </Button>)}
        {withRailTooltip(controls.editorState.draftItalic ? "Disable italic" : "Enable italic", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(controls.editorState.draftItalic)}
          onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftItalic: !prev.draftItalic } : prev)}
          aria-label={controls.editorState.draftItalic ? "Disable italic" : "Enable italic"}
        >
          <Italic className="h-4 w-4" />
        </Button>)}
        {withRailTooltip("Align text left", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(controls.editorState.draftAlign === "left")}
          onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "left" } : prev)}
          aria-label="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>)}
        {withRailTooltip("Align text right", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(controls.editorState.draftAlign === "right")}
          onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "right" } : prev)}
          aria-label="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>)}
        {withRailTooltip(canUseNewspaperReflow ? "Toggle newspaper reflow across columns" : "Newspaper reflow needs at least 2 columns", <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!canUseNewspaperReflow}
          className={`h-8 rounded-sm border px-2 text-xs ${
            !canUseNewspaperReflow
              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
              : (controls.editorState.draftReflow ? tone.railButtonActive : tone.railButton)
          }`}
          onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftReflow: !prev.draftReflow } : prev)}
          aria-label={controls.editorState.draftReflow ? "Disable newspaper reflow" : "Enable newspaper reflow"}
          title={canUseNewspaperReflow ? "Toggle newspaper reflow" : "Newspaper reflow needs at least 2 columns"}
        >
          Re
        </Button>)}
        {withRailTooltip(controls.editorState.draftSyllableDivision ? "Disable hyphenation" : "Enable hyphenation", <Button
          type="button"
          size="sm"
          variant="ghost"
          className={`h-8 rounded-sm border px-2 text-xs ${controls.editorState.draftSyllableDivision ? tone.railButtonActive : tone.railButton}`}
          onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftSyllableDivision: !prev.draftSyllableDivision } : prev)}
          aria-label={controls.editorState.draftSyllableDivision ? "Disable syllable division" : "Enable syllable division"}
        >
          Hy
        </Button>)}
        {withRailTooltip("Paragraph summary, words, and characters", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "info")}
          onClick={() => toggleSubmenu("info")}
          aria-label="Word and character count"
        >
          <Info className="h-4 w-4" />
        </Button>)}

        <div className={`my-1 h-px w-full ${tone.divider}`} />
        {withRailTooltip("Delete paragraph", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(false)}
          onClick={controls.deleteEditorBlock}
          aria-label="Delete paragraph"
        >
          <Trash2 className="h-4 w-4" />
        </Button>)}
      </div>

      {activeSubmenu ? (
        <div
          className={`max-w-[min(62vw,44rem)] overflow-x-auto rounded-md border ${tone.submenu} ${
            activeSubmenu === "info"
              ? "min-h-10 px-2 py-2"
              : activeSubmenu === "type"
                ? "px-2 py-2"
              : "flex h-10 items-center gap-2 px-2"
          }`}
        >
          {activeSubmenu === "geometry" ? (
            <>
              <Rows3 className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
              {withSubmenuTooltip("Set the row span of this paragraph", <Select
                value={String(controls.editorState.draftRows)}
                onValueChange={(value) => {
                  controls.setEditorState((prev) => prev ? {
                    ...prev,
                    draftRows: Math.max(1, Math.min(controls.gridRows, Number(value))),
                  } : prev)
                }}
              >
                <SelectTrigger className={`h-8 text-xs ${tone.input}`} style={{ minWidth: `${controls.rowTriggerMinWidthCh}ch` }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: controls.gridRows }, (_, index) => index + 1).map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} {count === 1 ? "row" : "rows"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>)}

              <Columns3 className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
              {withSubmenuTooltip("Set the column span of this paragraph", <Select
                value={String(controls.editorState.draftColumns)}
                onValueChange={(value) => {
                  const nextColumns = Math.max(1, Math.min(controls.gridCols, Number(value)))
                  controls.setEditorState((prev) => prev ? {
                    ...prev,
                    draftColumns: nextColumns,
                    draftReflow: nextColumns > 1 ? prev.draftReflow : false,
                  } : prev)
                }}
              >
                <SelectTrigger className={`h-8 text-xs ${tone.input}`} style={{ minWidth: `${controls.colTriggerMinWidthCh}ch` }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: controls.gridCols }, (_, index) => index + 1).map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} {count === 1 ? "col" : "cols"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>)}

              <RotateCw className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
              {withSubmenuTooltip("Rotate the paragraph in degrees", <input
                type="number"
                min={-180}
                max={180}
                step={1}
                value={Math.round(controls.editorState.draftRotation)}
                onChange={(event) => {
                  const parsed = Number(event.target.value)
                  const next = Number.isFinite(parsed) ? parsed : 0
                  controls.setEditorState((prev) => prev ? {
                    ...prev,
                    draftRotation: clampRotation(next),
                  } : prev)
                }}
                className={`h-8 w-16 rounded-md border px-2 text-xs outline-none ${tone.input}`}
              />)}
            </>
          ) : null}

          {activeSubmenu === "type" ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CaseSensitive className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
                {withSubmenuTooltip("Choose a font family override for this paragraph", <FontSelect
                  value={controls.editorState.draftFont}
                  onValueChange={(value) => {
                    controls.setEditorState((prev) => prev ? { ...prev, draftFont: value as FontFamily } : prev)
                  }}
                  options={FONT_OPTIONS}
                  fitToLongestOption
                  triggerClassName={`h-8 text-xs ${tone.input}`}
                />)}

                <Type className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
                {withSubmenuTooltip("Choose the typography hierarchy for this paragraph", <Select
                  value={controls.editorState.draftStyle}
                  onValueChange={(value) => {
                    const nextStyle = value as StyleKey
                    controls.setEditorState((prev) => prev ? {
                      ...prev,
                      draftStyle: nextStyle,
                      draftFxSize: controls.isFxStyle(nextStyle)
                        ? (controls.isFxStyle(prev.draftStyle) ? prev.draftFxSize : controls.getStyleSizeValue(nextStyle))
                        : prev.draftFxSize,
                      draftFxLeading: controls.isFxStyle(nextStyle)
                        ? (controls.isFxStyle(prev.draftStyle) ? prev.draftFxLeading : controls.getStyleLeadingValue(nextStyle))
                        : prev.draftFxLeading,
                      draftText: prev.draftTextEdited ? prev.draftText : controls.getDummyTextForStyle(nextStyle),
                    } : prev)
                  }}
                >
                  <SelectTrigger className={`h-8 text-xs ${tone.input}`} style={{ minWidth: `${controls.hierarchyTriggerMinWidthCh}ch` }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {controls.styleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} ({controls.getStyleSizeLabel(option.value)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>)}
              </div>

              {fxSelected ? (
                <div className="flex items-center gap-2">
                  {withSubmenuTooltip("Set the FX font size in points", <label className="flex items-center gap-1 text-[11px] text-gray-600">
                    <TypeOutline className="h-4 w-4 shrink-0 text-gray-500" />
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
                          setFxSizeInput(String(controls.editorState.draftFxSize))
                          return
                        }
                        const clamped = clampFxSize(Math.round(parsed * 10) / 10)
                        controls.setEditorState((prev) => prev ? { ...prev, draftFxSize: clamped } : prev)
                        setFxSizeInput(String(clamped))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return
                        event.preventDefault()
                        ;(event.currentTarget as HTMLInputElement).blur()
                      }}
                      className={`h-8 w-16 rounded-md border px-2 text-xs outline-none ${tone.input}`}
                      aria-label="FX font size"
                    />
                  </label>)}
                  {withSubmenuTooltip("Set the FX leading in points", <label className="flex items-center gap-1 text-[11px] text-gray-600">
                    <Baseline className="h-4 w-4 shrink-0 text-gray-500" />
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
                          setFxLeadingInput(String(controls.editorState.draftFxLeading))
                          return
                        }
                        const clamped = clampFxLeading(Math.round(parsed * 10) / 10)
                        controls.setEditorState((prev) => prev ? { ...prev, draftFxLeading: clamped } : prev)
                        setFxLeadingInput(String(clamped))
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return
                        event.preventDefault()
                        ;(event.currentTarget as HTMLInputElement).blur()
                      }}
                      className={`h-8 w-16 rounded-md border px-2 text-xs outline-none ${tone.input}`}
                      aria-label="FX line leading"
                    />
                  </label>)}
                </div>
              ) : null}
            </div>
          ) : null}

          {activeSubmenu === "color" ? (
            <>
              {withSubmenuTooltip("Choose the active color scheme", <Select
                value={controls.selectedColorScheme}
                onOpenChange={(open) => {
                  if (!open) setPreviewColorScheme(null)
                }}
                onValueChange={(value) => {
                  const nextScheme = value as typeof controls.selectedColorScheme
                  controls.onColorSchemeChange(nextScheme)
                  const nextPalette = controls.colorSchemes.find((scheme) => scheme.id === nextScheme)?.colors ?? controls.palette
                  const hasCurrentColor = nextPalette.some((color) => color.toLowerCase() === controls.editorState.draftColor.toLowerCase())
                  if (!hasCurrentColor && nextPalette.length) {
                    controls.setEditorState((prev) => (prev ? { ...prev, draftColor: nextPalette[0] } : prev))
                  }
                }}
              >
                <SelectTrigger
                  className={`h-8 text-xs ${tone.input}`}
                  style={{ width: `${colorSchemeTriggerWidthCh}ch` }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent onPointerLeave={() => setPreviewColorScheme(null)}>
                  {controls.colorSchemes.map((scheme) => (
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
                  const selected = controls.editorState.draftColor.toLowerCase() === color.toLowerCase()
                  const swatchKey = `${previewColorScheme ?? controls.selectedColorScheme}-${index}-${color}`
                  return (
                    <HoverTooltip
                      key={swatchKey}
                      className="block"
                      label={`Set the paragraph color to ${color}`}
                      disabled={!showRolloverInfo}
                      tooltipClassName={submenuTooltipClassName}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          controls.setEditorState((prev) => (prev ? { ...prev, draftColor: color } : prev))
                        }}
                        className={`h-6 w-6 rounded border ${selected ? `ring-2 ${isHelpActive ? "ring-blue-500" : "ring-gray-500"} ring-offset-1 ${tone.ringOffset}` : ""}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select ${color}`}
                        title={color}
                      />
                    </HoverTooltip>
                  )
                })}
              </div>
            </>
          ) : null}

          {activeSubmenu === "info" ? (
            <div className="space-y-1 text-xs leading-snug">
              <div><span className="font-medium">Style:</span> {selectedStyleLabel}</div>
              <div><span className="font-medium">Font:</span> {controls.editorState.draftFont}</div>
              <div>
                <span className="font-medium">Size/Leading:</span>{" "}
                {controls.isFxStyle(controls.editorState.draftStyle)
                  ? `${controls.editorState.draftFxSize}pt / ${controls.editorState.draftFxLeading}pt`
                  : `${controls.getStyleSizeValue(controls.editorState.draftStyle)}pt / ${controls.getStyleLeadingValue(controls.editorState.draftStyle)}pt`}
              </div>
              <div><span className="font-medium">Rows/Cols:</span> {controls.editorState.draftRows} / {controls.editorState.draftColumns}</div>
              <div><span className="font-medium">Align/Rotation:</span> {controls.editorState.draftAlign}, {Math.round(controls.editorState.draftRotation)}deg</div>
              <div><span className="font-medium">Weight/Slant:</span> {controls.editorState.draftBold ? "bold" : "regular"}, {controls.editorState.draftItalic ? "italic" : "roman"}</div>
              <div><span className="font-medium">Newspaper Reflow/Hyphenation:</span> {controls.editorState.draftReflow && canUseNewspaperReflow ? "on" : "off"}, {controls.editorState.draftSyllableDivision ? "on" : "off"}</div>
              <div><span className="font-medium">Color Scheme:</span> {selectedSchemeLabel}</div>
              <div><span className="font-medium">Text Color:</span> {controls.editorState.draftColor}</div>
              <div><span className="font-medium">Characters/Words:</span> {characterCount} / {wordCount}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
