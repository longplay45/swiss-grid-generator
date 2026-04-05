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
import {
  FONT_OPTIONS,
  getFontVariantById,
  getFontVariants,
  resolveFontVariant,
  type FontFamily,
} from "@/lib/config/fonts"
import { clampFxLeading, clampFxSize, clampRotation } from "@/lib/block-constraints"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { TextEditorControls as SharedTextEditorControls } from "@/lib/preview-overlay-controls"
import {
  formatTrackingScale,
  MAX_TRACKING_SCALE,
  MIN_TRACKING_SCALE,
} from "@/lib/text-rendering"
import {
  applyTrackingScaleToRange,
  getUniformTrackingScaleForRange,
  rebaseTextTrackingRuns,
} from "@/lib/text-tracking-runs"
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Baseline,
  CaseSensitive,
  Columns3,
  Info,
  Palette,
  RotateCw,
  Rows3,
  Trash2,
  Type,
  TypeOutline,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"

type TextEditorPanelProps<StyleKey extends string> = {
  controls: SharedTextEditorControls<StyleKey>
  isHelpActive?: boolean
  showRolloverInfo?: boolean
  isDarkMode?: boolean
}

type MainSubmenu = "geometry" | "type" | "align" | "color" | "info" | null

const SUBMENU_VERTICAL_ALIGN_OFFSET_PX = 4
const TYPE_ROW_TRIGGER_WIDTH_PX = 152
const FX_INPUT_WIDTH_PX = 54

export function TextEditorPanel<StyleKey extends string>({
  controls,
  isHelpActive = false,
  showRolloverInfo = true,
  isDarkMode = false,
}: TextEditorPanelProps<StyleKey>) {
  const [activeSubmenu, setActiveSubmenu] = useState<MainSubmenu>(null)
  const [activeSubmenuTop, setActiveSubmenuTop] = useState(0)
  const [fxSizeInput, setFxSizeInput] = useState("")
  const [fxLeadingInput, setFxLeadingInput] = useState("")
  const [trackingInput, setTrackingInput] = useState("")
  const [editorColorScheme, setEditorColorScheme] = useState<ImageColorSchemeId>(controls.selectedColorScheme)
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const fxSelected = controls.isFxStyle(controls.editorState.draftStyle)

  const editorText = controls.editorState.draftText ?? ""
  const characterCount = editorText.length
  const wordCount = editorText.trim() ? editorText.trim().split(/\s+/).length : 0
  const canUseNewspaperReflow = controls.editorState.draftColumns > 1
  const selectedStyleLabel = controls.styleOptions.find((option) => option.value === controls.editorState.draftStyle)?.label
    ?? controls.editorState.draftStyle
  const selectedFontVariant = resolveFontVariant(
    controls.editorState.draftFont,
    controls.editorState.draftFontWeight,
    controls.editorState.draftItalic,
  )
  const fontVariantOptions = getFontVariants(controls.editorState.draftFont)
  const selectionTrackingScale = controls.editorState.draftSelectionStart !== controls.editorState.draftSelectionEnd
    ? getUniformTrackingScaleForRange(
      controls.editorState.draftText,
      {
        start: controls.editorState.draftSelectionStart,
        end: controls.editorState.draftSelectionEnd,
      },
      controls.editorState.draftTrackingScale,
      controls.editorState.draftTrackingRuns,
    )
    : controls.editorState.draftTrackingScale
  const selectedSchemeLabel = controls.colorSchemes.find((scheme) => scheme.id === editorColorScheme)?.label
    ?? editorColorScheme
  const colorSchemeTriggerWidthCh = Math.max(
    ...controls.colorSchemes.map((scheme) => scheme.label.length),
    12,
  ) + 3
  const infoRows = [
    { label: "Rows", value: String(controls.editorState.draftRows) },
    { label: "Cols", value: String(controls.editorState.draftColumns) },
    { label: "Rotation", value: `${Math.round(controls.editorState.draftRotation)}deg` },
    { label: "Font", value: controls.editorState.draftFont },
    { label: "Font Cut", value: selectedFontVariant.label },
    { label: "Hierarchy", value: selectedStyleLabel },
    {
      label: "Size",
      value: `${controls.isFxStyle(controls.editorState.draftStyle)
        ? controls.editorState.draftFxSize
        : controls.getStyleSizeValue(controls.editorState.draftStyle)}pt`,
    },
    {
      label: "Leading",
      value: `${controls.isFxStyle(controls.editorState.draftStyle)
        ? controls.editorState.draftFxLeading
        : controls.getStyleLeadingValue(controls.editorState.draftStyle)}pt`,
    },
    {
      label: "Kerning",
      value: controls.editorState.draftOpticalKerning ? "Optical" : "Metric",
    },
    {
      label: "Tracking",
      value: selectionTrackingScale !== null
        ? formatTrackingScale(selectionTrackingScale)
        : "Mixed",
    },
    { label: "Color Scheme", value: selectedSchemeLabel },
    { label: "Text Color", value: controls.editorState.draftColor },
    {
      label: "Alignment",
      value: controls.editorState.draftAlign.charAt(0).toUpperCase() + controls.editorState.draftAlign.slice(1),
    },
    {
      label: "Reflow",
      value: controls.editorState.draftReflow && canUseNewspaperReflow ? "On" : "Off",
    },
    {
      label: "Hyphenation",
      value: controls.editorState.draftSyllableDivision ? "On" : "Off",
    },
    { label: "Characters", value: String(characterCount) },
    { label: "Words", value: String(wordCount) },
  ]

  useEffect(() => {
    setFxSizeInput(String(controls.editorState.draftFxSize))
    setFxLeadingInput(String(controls.editorState.draftFxLeading))
  }, [controls.editorState.draftFxLeading, controls.editorState.draftFxSize, controls.editorState.target])

  useEffect(() => {
    setTrackingInput(selectionTrackingScale === null ? "" : String(selectionTrackingScale))
  }, [controls.editorState.target, selectionTrackingScale])

  useEffect(() => {
    setEditorColorScheme(controls.selectedColorScheme)
    setPreviewColorScheme(null)
  }, [controls.editorState.target, controls.selectedColorScheme])

  const activeColorScheme = previewColorScheme ?? editorColorScheme
  const previewPalette = controls.colorSchemes.find((scheme) => scheme.id === activeColorScheme)?.colors ?? controls.palette

  const tone = isDarkMode
    ? {
      root: "dark",
      rail: "border-gray-700 bg-gray-900 text-gray-100",
      railButton: "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-gray-100",
      railButtonActive: "border-gray-600 bg-gray-800 text-gray-100",
      disabledButton: "cursor-not-allowed border-gray-700 bg-gray-800 text-gray-600",
      submenu: "border-gray-700 bg-gray-900 text-gray-100",
      input: "border-gray-700 bg-gray-900 text-gray-100 focus:border-gray-500",
      iconMuted: "text-gray-400",
      metaText: "text-gray-400",
      ringOffset: "ring-offset-gray-900",
      divider: "bg-gray-700",
      railTooltip: "w-max whitespace-nowrap border-gray-700 bg-gray-900/95 text-gray-200 shadow-lg",
      submenuTooltip: "w-max max-w-[24rem] whitespace-normal border-gray-700 bg-gray-900/95 text-gray-200 shadow-lg",
      submenuToken: "text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400",
      selectContent: "dark",
    }
    : {
      root: "",
      rail: "border-gray-300 bg-white",
      railButton: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900",
      railButtonActive: "border-gray-400 bg-gray-100 text-gray-900",
      disabledButton: "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400",
      submenu: "border-gray-300 bg-white text-gray-900",
      input: "border-gray-200 bg-white text-gray-900 focus:border-gray-400",
      iconMuted: "text-gray-500",
      metaText: "text-gray-600",
      ringOffset: "ring-offset-white",
      divider: "bg-gray-200",
      railTooltip: "w-max whitespace-nowrap border-gray-200 bg-white/95 text-gray-700 shadow-lg",
      submenuTooltip: "w-max max-w-[24rem] whitespace-normal border-gray-200 bg-white/95 text-gray-700 shadow-lg",
      submenuToken: "text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500",
      selectContent: "",
    }

  const railBtn = (active = false) => `h-8 w-8 rounded-sm border ${active ? tone.railButtonActive : tone.railButton}`
  const railTooltipClassName = tone.railTooltip
  const submenuTooltipClassName = tone.submenuTooltip
  const submenuTokenClassName = tone.submenuToken
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
  const getStyleOptionLabel = (styleKey: StyleKey, label: string) => (
    controls.isFxStyle(styleKey) ? label : `${label} (${controls.getStyleSizeLabel(styleKey)})`
  )
  const commitTrackingInput = () => {
    const parsed = Number(trackingInput)
    if (!Number.isFinite(parsed)) {
      setTrackingInput(selectionTrackingScale === null ? "" : String(selectionTrackingScale))
      return
    }
    const nextScale = Math.max(MIN_TRACKING_SCALE, Math.min(MAX_TRACKING_SCALE, Math.round(parsed)))
    controls.setEditorState((prev) => prev ? {
      ...prev,
      draftTrackingScale: (
        prev.draftSelectionStart !== prev.draftSelectionEnd
          && !(prev.draftSelectionStart === 0 && prev.draftSelectionEnd === prev.draftText.length)
      )
        ? prev.draftTrackingScale
        : nextScale,
      draftTrackingRuns: (
        prev.draftSelectionStart !== prev.draftSelectionEnd
          && !(prev.draftSelectionStart === 0 && prev.draftSelectionEnd === prev.draftText.length)
      )
        ? applyTrackingScaleToRange(
          prev.draftText,
          {
            start: prev.draftSelectionStart,
            end: prev.draftSelectionEnd,
          },
          nextScale,
          prev.draftTrackingScale,
          prev.draftTrackingRuns,
        )
        : rebaseTextTrackingRuns(
          prev.draftText,
          [],
          prev.draftTrackingScale,
          nextScale,
        ),
    } : prev)
    setTrackingInput(String(nextScale))
  }

  return (
    <div ref={panelRef} className={`relative ${tone.root}`.trim()}>
      <div className={`relative flex w-10 shrink-0 flex-col items-center gap-1 rounded-md border p-1 ${tone.rail}`}>
        {isHelpActive ? <HelpIndicatorLine /> : null}
        {withRailTooltip("Rows, columns, and rotation", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "geometry")}
          onClick={(event) => toggleSubmenu("geometry", event.currentTarget)}
          aria-label="Rows, columns, rotation"
        >
          <Rows3 className="h-4 w-4" />
        </Button>)}
        {withRailTooltip("Font family, font cut, hierarchy, kerning, tracking, and FX size/leading", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "type")}
          onClick={(event) => toggleSubmenu("type", event.currentTarget)}
          aria-label="Type controls"
        >
          <Type className="h-4 w-4" />
        </Button>)}
        {withRailTooltip("Color scheme and paragraph color", <Button
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

        {withRailTooltip("Text alignment", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "align")}
          onClick={(event) => toggleSubmenu("align", event.currentTarget)}
          aria-label="Text alignment"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>)}
        {withRailTooltip("Paragraph summary, words, and characters", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "info")}
          onClick={(event) => toggleSubmenu("info", event.currentTarget)}
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
          className={`absolute left-full ml-2 max-w-[min(62vw,44rem)] overflow-x-auto rounded-md border ${tone.submenu} ${
            activeSubmenu === "info"
              ? "min-h-10 px-2 py-1"
              : activeSubmenu === "type"
                ? "px-2 py-1"
                : "flex min-h-10 items-center gap-2 px-2 py-1"
          }`}
          style={{ top: activeSubmenuTop }}
        >
          {isHelpActive ? <HelpIndicatorLine /> : null}
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
                <SelectContent className={tone.selectContent}>
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
                <SelectContent className={tone.selectContent}>
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

          {activeSubmenu === "align" ? (
            <>
              {withSubmenuTooltip("Align text left", <Button
                type="button"
                size="icon"
                variant="ghost"
                className={railBtn(controls.editorState.draftAlign === "left")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "left" } : prev)}
                aria-label="Align left"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>)}
              {withSubmenuTooltip("Align text center", <Button
                type="button"
                size="icon"
                variant="ghost"
                className={railBtn(controls.editorState.draftAlign === "center")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "center" } : prev)}
                aria-label="Align center"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>)}
              {withSubmenuTooltip("Align text right", <Button
                type="button"
                size="icon"
                variant="ghost"
                className={railBtn(controls.editorState.draftAlign === "right")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "right" } : prev)}
                aria-label="Align right"
              >
                <AlignRight className="h-4 w-4" />
              </Button>)}
              {withSubmenuTooltip(canUseNewspaperReflow ? "Toggle newspaper reflow across columns" : "Newspaper reflow needs at least 2 columns", <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!canUseNewspaperReflow}
                className={`h-8 rounded-sm border px-2 text-xs ${
                  !canUseNewspaperReflow
                    ? tone.disabledButton
                    : (controls.editorState.draftReflow ? tone.railButtonActive : tone.railButton)
                }`}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftReflow: !prev.draftReflow } : prev)}
                aria-label={controls.editorState.draftReflow ? "Disable newspaper reflow" : "Enable newspaper reflow"}
                title={canUseNewspaperReflow ? "Toggle newspaper reflow" : "Newspaper reflow needs at least 2 columns"}
              >
                Re
              </Button>)}
              {withSubmenuTooltip(controls.editorState.draftSyllableDivision ? "Disable hyphenation" : "Enable hyphenation", <Button
                type="button"
                size="sm"
                variant="ghost"
                className={`h-8 rounded-sm border px-2 text-xs ${controls.editorState.draftSyllableDivision ? tone.railButtonActive : tone.railButton}`}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftSyllableDivision: !prev.draftSyllableDivision } : prev)}
                aria-label={controls.editorState.draftSyllableDivision ? "Disable syllable division" : "Enable syllable division"}
              >
                Hy
              </Button>)}
            </>
          ) : null}

          {activeSubmenu === "type" ? (
            <div
              className="grid w-max items-center gap-x-2 gap-y-2"
              style={{ gridTemplateColumns: `auto ${TYPE_ROW_TRIGGER_WIDTH_PX}px auto ${TYPE_ROW_TRIGGER_WIDTH_PX}px` }}
            >
              <div className="col-start-1 row-start-1 flex min-h-8 items-center">
                <CaseSensitive className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
              </div>
              <div className="col-start-2 row-start-1">
                {withSubmenuTooltip("Choose a font family override for this paragraph", <FontSelect
                  value={controls.editorState.draftFont}
                  onValueChange={(value) => {
                    const nextFont = value as FontFamily
                    controls.setEditorState((prev) => {
                      if (!prev) return prev
                      const resolvedVariant = resolveFontVariant(nextFont, prev.draftFontWeight, prev.draftItalic)
                      return {
                        ...prev,
                        draftFont: nextFont,
                        draftFontWeight: resolvedVariant.weight,
                        draftItalic: resolvedVariant.italic,
                      }
                    })
                  }}
                  options={FONT_OPTIONS}
                  triggerClassName={`h-8 text-xs ${tone.input}`}
                  triggerStyle={{ width: `${TYPE_ROW_TRIGGER_WIDTH_PX}px` }}
                  contentClassName={tone.selectContent}
                />)}
              </div>

              <div className="col-start-3 row-start-1 flex min-h-8 items-center">
                <TypeOutline className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
              </div>
              <div className="col-start-4 row-start-1">
                {withSubmenuTooltip("Choose the available cut for this paragraph", <Select
                  value={selectedFontVariant.id}
                  onValueChange={(value) => {
                    const nextVariant = getFontVariantById(controls.editorState.draftFont, value)
                    if (!nextVariant) return
                    controls.setEditorState((prev) => prev ? {
                      ...prev,
                      draftFontWeight: nextVariant.weight,
                      draftItalic: nextVariant.italic,
                    } : prev)
                  }}
                >
                  <SelectTrigger className={`h-8 text-xs ${tone.input}`} style={{ width: `${TYPE_ROW_TRIGGER_WIDTH_PX}px` }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={tone.selectContent}>
                    {fontVariantOptions.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>)}
              </div>

              <div className="col-start-1 row-start-2 flex min-h-8 items-center">
                <Type className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
              </div>
              <div className="col-start-2 row-start-2">
                {withSubmenuTooltip("Choose the typography hierarchy for this paragraph", <Select
                  value={controls.editorState.draftStyle}
                  onValueChange={(value) => {
                    const nextStyle = value as StyleKey
                    controls.setEditorState((prev) => {
                      if (!prev) return prev
                      const currentDefaultWeight = controls.getStyleDefaultFontWeight(prev.draftStyle)
                      const currentDefaultItalic = controls.getStyleDefaultItalic(prev.draftStyle)
                      const nextDefaultWeight = controls.getStyleDefaultFontWeight(nextStyle)
                      const nextDefaultItalic = controls.getStyleDefaultItalic(nextStyle)
                      const requestedWeight = prev.draftFontWeight === currentDefaultWeight
                        ? nextDefaultWeight
                        : prev.draftFontWeight
                      const requestedItalic = prev.draftItalic === currentDefaultItalic
                        ? nextDefaultItalic
                        : prev.draftItalic
                      const resolvedVariant = resolveFontVariant(prev.draftFont, requestedWeight, requestedItalic)
                      return {
                        ...prev,
                        draftStyle: nextStyle,
                        draftFontWeight: resolvedVariant.weight,
                        draftItalic: resolvedVariant.italic,
                        draftFxSize: controls.isFxStyle(nextStyle)
                          ? (controls.isFxStyle(prev.draftStyle) ? prev.draftFxSize : controls.getStyleSizeValue(nextStyle))
                          : prev.draftFxSize,
                        draftFxLeading: controls.isFxStyle(nextStyle)
                          ? (controls.isFxStyle(prev.draftStyle) ? prev.draftFxLeading : controls.getStyleLeadingValue(nextStyle))
                          : prev.draftFxLeading,
                        draftText: prev.draftTextEdited ? prev.draftText : controls.getDummyTextForStyle(nextStyle),
                      }
                    })
                  }}
                >
                  <SelectTrigger className={`h-8 text-xs ${tone.input}`} style={{ width: `${TYPE_ROW_TRIGGER_WIDTH_PX}px` }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={tone.selectContent}>
                    {controls.styleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {getStyleOptionLabel(option.value, option.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>)}
              </div>

              {fxSelected ? (
                <div className="col-start-3 row-start-2 col-span-2 flex min-h-8 w-full items-center gap-1.5">
                  {withSubmenuTooltip("Set the FX font size in points", <label className={`flex items-center gap-1.5 text-[11px] ${tone.metaText}`}>
                    <TypeOutline className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
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
                      className={`h-8 rounded-md border px-2 text-xs outline-none ${tone.input}`}
                      style={{ width: `${FX_INPUT_WIDTH_PX}px` }}
                      aria-label="FX font size"
                    />
                  </label>)}
                  {withSubmenuTooltip("Set the FX leading in points", <label className={`flex items-center gap-1.5 text-[11px] ${tone.metaText}`}>
                    <Baseline className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />
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
                      className={`h-8 rounded-md border px-2 text-xs outline-none ${tone.input}`}
                      style={{ width: `${FX_INPUT_WIDTH_PX}px` }}
                      aria-label="FX line leading"
                    />
                  </label>)}
                </div>
              ) : null}

              <div className="col-start-1 row-start-3 flex min-h-8 items-center">
                <span className={submenuTokenClassName}>Ke</span>
              </div>
              <div className="col-start-2 row-start-3">
                {withSubmenuTooltip("Choose optical or metric kerning", <Select
                  value={controls.editorState.draftOpticalKerning ? "on" : "off"}
                  onValueChange={(value) => {
                    controls.setEditorState((prev) => prev ? {
                      ...prev,
                      draftOpticalKerning: value !== "off",
                    } : prev)
                  }}
                >
                  <SelectTrigger className={`h-8 text-xs ${tone.input}`} style={{ width: `${TYPE_ROW_TRIGGER_WIDTH_PX}px` }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={tone.selectContent}>
                    <SelectItem value="on">Optical</SelectItem>
                    <SelectItem value="off">Metric</SelectItem>
                  </SelectContent>
                </Select>)}
              </div>

              <div className="col-start-3 row-start-3 flex min-h-8 items-center">
                <span className={submenuTokenClassName}>Tr</span>
              </div>
              <div className="col-start-4 row-start-3">
                {withSubmenuTooltip("Set paragraph tracking, or apply tracking to the current text selection (1/1000 em)", <label className="flex items-center gap-2">
                  <input
                    type="number"
                    min={MIN_TRACKING_SCALE}
                    max={MAX_TRACKING_SCALE}
                    step={1}
                    inputMode="numeric"
                    value={trackingInput}
                    placeholder={selectionTrackingScale === null ? "Mixed" : undefined}
                    onChange={(event) => {
                      setTrackingInput(event.target.value)
                    }}
                    onBlur={commitTrackingInput}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return
                      event.preventDefault()
                      commitTrackingInput()
                      ;(event.currentTarget as HTMLInputElement).blur()
                    }}
                    className={`h-8 rounded-md border px-2 text-xs outline-none ${tone.input}`}
                    style={{ width: `${TYPE_ROW_TRIGGER_WIDTH_PX}px` }}
                    aria-label={`Tracking from ${MIN_TRACKING_SCALE} to ${MAX_TRACKING_SCALE}`}
                  />
                </label>)}
              </div>

            </div>
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
                <SelectContent className={tone.selectContent} onPointerLeave={() => setPreviewColorScheme(null)}>
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
                  const swatchKey = `${activeColorScheme}-${index}-${color}`
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
                        className={`h-6 w-6 rounded border ${selected ? `ring-2 ring-gray-500 ring-offset-1 ${tone.ringOffset}` : ""}`}
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
            <div className="grid w-max grid-cols-[max-content_max-content] items-baseline gap-x-4 gap-y-1 text-xs leading-snug">
              {infoRows.map((row) => (
                <div key={row.label} className="contents">
                  <span className="whitespace-nowrap font-medium text-left">{row.label}:</span>
                  <span className="whitespace-nowrap text-right">{row.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
