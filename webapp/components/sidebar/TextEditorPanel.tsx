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
  applyTextFormatToRange,
  getUniformTextFormatValueForRange,
  rebaseTextFormatRuns,
  type BaseTextFormat,
} from "@/lib/text-format-runs"
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
  Droplets,
  Info,
  LetterText,
  MoveHorizontal,
  Palette,
  Pilcrow,
  RotateCw,
  Rows3,
  TextCursorInput,
  Trash2,
  Type,
  TypeOutline,
  WholeWord,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"

type TextEditorPanelProps<StyleKey extends string> = {
  controls: SharedTextEditorControls<StyleKey>
  isHelpActive?: boolean
  showRolloverInfo?: boolean
  isDarkMode?: boolean
  dockSide?: "left" | "right"
}

type MainSubmenu = "geometry" | "type" | "info" | null

const SUBMENU_VERTICAL_ALIGN_OFFSET_PX = 4
const SUBMENU_PANEL_WIDTH_PX = 304
const SUBMENU_LABEL_WIDTH_PX = 76
const SUBMENU_TOOLTIP_ANCHOR_SELECTOR = '[data-submenu-tooltip-anchor="text-editor"]'
const PREVIEW_TOOLTIP_BOUNDARY_SELECTOR = '[data-tooltip-boundary="preview-workspace"]'

export function TextEditorPanel<StyleKey extends string>({
  controls,
  isHelpActive = false,
  showRolloverInfo = true,
  isDarkMode = false,
  dockSide = "left",
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
  const selectionRange = controls.editorState.draftSelectionStart !== controls.editorState.draftSelectionEnd
    ? {
      start: controls.editorState.draftSelectionStart,
      end: controls.editorState.draftSelectionEnd,
    }
    : null
  const selectionCoversWholeText = Boolean(
    selectionRange
    && selectionRange.start === 0
    && selectionRange.end === editorText.length,
  )
  const selectionUsesScopedRuns = Boolean(selectionRange && !selectionCoversWholeText)
  const currentBaseTextFormat: BaseTextFormat<StyleKey, FontFamily> = {
    fontFamily: controls.editorState.draftFont,
    fontWeight: controls.editorState.draftFontWeight,
    italic: controls.editorState.draftItalic,
    styleKey: controls.editorState.draftStyle,
    color: controls.editorState.draftColor,
  }
  const getSelectionFormatValue = <Prop extends keyof BaseTextFormat<StyleKey, FontFamily>>(prop: Prop) => (
    selectionRange
      ? getUniformTextFormatValueForRange(
        controls.editorState.draftText,
        selectionRange,
        currentBaseTextFormat,
        controls.editorState.draftTextFormatRuns,
        prop,
      )
      : currentBaseTextFormat[prop]
  )
  const selectionFontFamily = getSelectionFormatValue("fontFamily")
  const selectionFontWeight = getSelectionFormatValue("fontWeight")
  const selectionItalic = getSelectionFormatValue("italic")
  const selectionStyleKey = getSelectionFormatValue("styleKey")
  const selectionColor = getSelectionFormatValue("color")
  const selectedFontVariantForSelection = (
    selectionFontFamily
    && selectionFontWeight !== null
    && selectionItalic !== null
  )
    ? resolveFontVariant(selectionFontFamily, selectionFontWeight, selectionItalic)
    : null
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
  const selectedStyleLabelForSelection = selectionStyleKey
    ? controls.styleOptions.find((option) => option.value === selectionStyleKey)?.label ?? selectionStyleKey
    : "Mixed"

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

  const rebaseDraftTextFormatRuns = (
    state: typeof controls.editorState,
    nextBase: BaseTextFormat<StyleKey, FontFamily>,
  ) => rebaseTextFormatRuns(
    state.draftText,
    state.draftTextFormatRuns,
    {
      fontFamily: state.draftFont,
      fontWeight: state.draftFontWeight,
      italic: state.draftItalic,
      styleKey: state.draftStyle,
      color: state.draftColor,
    },
    nextBase,
  )

  const applySelectionTextFormat = (
    patch: Partial<BaseTextFormat<StyleKey, FontFamily>>,
  ) => {
    controls.setEditorState((prev) => {
      if (!prev) return prev
      if (selectionUsesScopedRuns && selectionRange) {
        return {
          ...prev,
          draftTextFormatRuns: applyTextFormatToRange(
            prev.draftText,
            selectionRange,
            patch,
            {
              fontFamily: prev.draftFont,
              fontWeight: prev.draftFontWeight,
              italic: prev.draftItalic,
              styleKey: prev.draftStyle,
              color: prev.draftColor,
            },
            prev.draftTextFormatRuns,
          ),
        }
      }
      const nextBase: BaseTextFormat<StyleKey, FontFamily> = {
        fontFamily: patch.fontFamily ?? prev.draftFont,
        fontWeight: patch.fontWeight ?? prev.draftFontWeight,
        italic: patch.italic ?? prev.draftItalic,
        styleKey: patch.styleKey ?? prev.draftStyle,
        color: patch.color ?? prev.draftColor,
      }
      return {
        ...prev,
        draftFont: nextBase.fontFamily,
        draftFontWeight: nextBase.fontWeight,
        draftItalic: nextBase.italic,
        draftStyle: nextBase.styleKey,
        draftColor: nextBase.color,
        draftTextFormatRuns: rebaseDraftTextFormatRuns(prev, nextBase),
      }
    })
  }

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
      selectContent: "",
    }

  const railBtn = (active = false) => `h-8 w-8 rounded-sm border ${active ? tone.railButtonActive : tone.railButton}`
  const railTooltipClassName = tone.railTooltip
  const submenuTooltipClassName = tone.submenuTooltip
  const tooltipHorizontalAlign = dockSide === "left" ? "start" : "end"
  const submenuPositionClassName = dockSide === "left" ? "left-full ml-2" : "right-full mr-2"
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
      horizontalAlign={tooltipHorizontalAlign}
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
      horizontalAlign={tooltipHorizontalAlign}
      tooltipClassName={submenuTooltipClassName}
    >
      {child}
    </HoverTooltip>
  )
  const getStyleOptionLabel = (styleKey: StyleKey, label: string) => (
    controls.isFxStyle(styleKey) ? label : `${label} (${controls.getStyleSizeLabel(styleKey)})`
  )
  const settingRowLabelClassName = `text-[11px] leading-none ${tone.metaText}`
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
  const infoRows = [
    { label: "Rows", value: String(controls.editorState.draftRows), icon: Rows3 },
    { label: "Cols", value: String(controls.editorState.draftColumns), icon: Columns3 },
    { label: "Rotation", value: `${Math.round(controls.editorState.draftRotation)}deg`, icon: RotateCw },
    { label: "Align", value: controls.editorState.draftAlign.charAt(0).toUpperCase() + controls.editorState.draftAlign.slice(1), icon: AlignCenter },
    { label: "Reflow", value: controls.editorState.draftReflow && canUseNewspaperReflow ? "On" : "Off", icon: Pilcrow },
    { label: "Hyphen", value: controls.editorState.draftSyllableDivision ? "On" : "Off", icon: WholeWord },
    { label: "Font", value: selectionFontFamily ?? "Mixed", icon: CaseSensitive },
    { label: "Cut", value: selectedFontVariantForSelection?.label ?? "Mixed", icon: TypeOutline },
    { label: "Hierarchy", value: selectedStyleLabelForSelection, icon: Type },
    {
      label: "Size",
      value: `${controls.isFxStyle(controls.editorState.draftStyle)
        ? controls.editorState.draftFxSize
        : controls.getStyleSizeValue(controls.editorState.draftStyle)}pt`,
      icon: LetterText,
    },
    {
      label: "Leading",
      value: `${controls.isFxStyle(controls.editorState.draftStyle)
        ? controls.editorState.draftFxLeading
        : controls.getStyleLeadingValue(controls.editorState.draftStyle)}pt`,
      icon: Baseline,
    },
    {
      label: "Kerning",
      value: controls.editorState.draftOpticalKerning ? "Optical" : "Metric",
      icon: TextCursorInput,
    },
    {
      label: "Tracking",
      value: selectionTrackingScale !== null
        ? formatTrackingScale(selectionTrackingScale)
        : "Mixed",
      icon: MoveHorizontal,
    },
    { label: "Scheme", value: selectedSchemeLabel, icon: Palette },
    { label: "Color", value: selectionColor ?? "Mixed", icon: Droplets },
    { label: "Chars", value: String(characterCount), icon: LetterText },
    { label: "Words", value: String(wordCount), icon: WholeWord },
    { label: "Max/Line", value: String(controls.maxCharsPerLine ?? 0), icon: MoveHorizontal },
  ]

  return (
    <div ref={panelRef} className={`relative ${tone.root}`.trim()}>
      <div className={`relative flex w-10 shrink-0 flex-col items-center gap-1 rounded-md border p-1 ${tone.rail}`}>
        {isHelpActive ? <HelpIndicatorLine /> : null}
        {withRailTooltip("Rows, columns, paragraph flow, and rotation", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "geometry")}
          onClick={(event) => toggleSubmenu("geometry", event.currentTarget)}
          aria-label="Rows, columns, and paragraph settings"
        >
          <Rows3 className="h-4 w-4" />
        </Button>)}
        {withRailTooltip("Font family, cut, hierarchy, kerning, tracking, and color", <Button
          type="button"
          size="icon"
          variant="ghost"
          className={railBtn(activeSubmenu === "type")}
          onClick={(event) => toggleSubmenu("type", event.currentTarget)}
          aria-label="Type controls"
        >
          <Type className="h-4 w-4" />
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
          data-submenu-tooltip-anchor="text-editor"
          className={`absolute ${submenuPositionClassName} max-w-[min(76vw,24rem)] overflow-x-auto rounded-md border px-2 py-2 ${tone.submenu}`}
          style={{ top: activeSubmenuTop }}
        >
          {isHelpActive ? <HelpIndicatorLine /> : null}
          {activeSubmenu === "geometry" ? (
            <div className="flex flex-col gap-0" style={{ width: `${SUBMENU_PANEL_WIDTH_PX}px` }}>
              {renderSettingRow(
                <Rows3 className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Rows",
                withSubmenuTooltip("Set the row span of this paragraph", <Select
                  value={String(controls.editorState.draftRows)}
                  onValueChange={(value) => {
                    controls.setEditorState((prev) => prev ? {
                      ...prev,
                      draftRows: Math.max(1, Math.min(controls.gridRows, Number(value))),
                    } : prev)
                  }}
                >
                  <SelectTrigger className={`h-8 w-full text-xs ${tone.input}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={tone.selectContent}>
                    {Array.from({ length: controls.gridRows }, (_, index) => index + 1).map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count} {count === 1 ? "row" : "rows"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>),
              )}
              {renderSettingRow(
                <Columns3 className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Cols",
                withSubmenuTooltip("Set the column span of this paragraph", <Select
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
                  <SelectTrigger className={`h-8 w-full text-xs ${tone.input}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={tone.selectContent}>
                    {Array.from({ length: controls.gridCols }, (_, index) => index + 1).map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count} {count === 1 ? "col" : "cols"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>),
              )}
              {renderSettingRow(
                <AlignCenter className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Align",
                <div className="flex items-center justify-end gap-1">
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
                </div>,
              )}
              {renderSettingRow(
                <Pilcrow className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Reflow",
                withSubmenuTooltip(canUseNewspaperReflow ? "Toggle newspaper reflow across columns" : "Newspaper reflow needs at least 2 columns", <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!canUseNewspaperReflow}
                  className={`h-8 w-full rounded-sm border px-2 text-xs ${
                    !canUseNewspaperReflow
                      ? tone.disabledButton
                      : (controls.editorState.draftReflow ? tone.railButtonActive : tone.railButton)
                  }`}
                  onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftReflow: !prev.draftReflow } : prev)}
                  aria-label={controls.editorState.draftReflow ? "Disable newspaper reflow" : "Enable newspaper reflow"}
                  title={canUseNewspaperReflow ? "Toggle newspaper reflow" : "Newspaper reflow needs at least 2 columns"}
                >
                  {controls.editorState.draftReflow ? "On" : "Off"}
                </Button>),
              )}
              {renderSettingRow(
                <WholeWord className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Hyphen",
                withSubmenuTooltip(controls.editorState.draftSyllableDivision ? "Disable hyphenation" : "Enable hyphenation", <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={`h-8 w-full rounded-sm border px-2 text-xs ${controls.editorState.draftSyllableDivision ? tone.railButtonActive : tone.railButton}`}
                  onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftSyllableDivision: !prev.draftSyllableDivision } : prev)}
                  aria-label={controls.editorState.draftSyllableDivision ? "Disable syllable division" : "Enable syllable division"}
                >
                  {controls.editorState.draftSyllableDivision ? "On" : "Off"}
                </Button>),
              )}
              {renderSettingRow(
                <RotateCw className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Rotate",
                withSubmenuTooltip("Rotate the paragraph in degrees", <input
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
                  className={fullWidthInputClassName}
                />),
              )}
            </div>
          ) : null}

          {activeSubmenu === "type" ? (
            <div className="flex flex-col gap-0" style={{ width: `${SUBMENU_PANEL_WIDTH_PX}px` }}>
              {renderSettingRow(
                <CaseSensitive className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Font",
                withSubmenuTooltip("Choose a font family override for this paragraph", <FontSelect
                  value={selectionFontFamily ?? undefined}
                  onValueChange={(value) => {
                    const nextFont = value as FontFamily
                    const requestedWeight = selectionFontWeight ?? controls.editorState.draftFontWeight
                    const requestedItalic = selectionItalic ?? controls.editorState.draftItalic
                    const resolvedVariant = resolveFontVariant(nextFont, requestedWeight, requestedItalic)
                    applySelectionTextFormat({
                      fontFamily: nextFont,
                      fontWeight: resolvedVariant.weight,
                      italic: resolvedVariant.italic,
                    })
                  }}
                  options={FONT_OPTIONS}
                  triggerClassName={`h-8 w-full text-xs ${tone.input}`}
                  triggerStyle={{ width: "100%" }}
                  contentClassName={tone.selectContent}
                  placeholder="Mixed"
                />),
              )}
              {renderSettingRow(
                <TypeOutline className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Cut",
                withSubmenuTooltip("Choose the available cut for this paragraph", <Select
                  value={selectedFontVariantForSelection?.id}
                  onValueChange={(value) => {
                    const fontFamily = selectionFontFamily ?? controls.editorState.draftFont
                    const nextVariant = getFontVariantById(fontFamily, value)
                    if (!nextVariant) return
                    applySelectionTextFormat({
                      fontWeight: nextVariant.weight,
                      italic: nextVariant.italic,
                    })
                  }}
                >
                  <SelectTrigger className={`h-8 w-full text-xs ${tone.input}`}>
                    <SelectValue placeholder="Mixed" />
                  </SelectTrigger>
                  <SelectContent className={tone.selectContent}>
                    {getFontVariants(selectionFontFamily ?? controls.editorState.draftFont).map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>),
              )}
              {renderSettingRow(
                <Type className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Typo",
                withSubmenuTooltip("Choose the typography hierarchy for this paragraph", <Select
                  value={selectionStyleKey ?? undefined}
                  onValueChange={(value) => {
                    const nextStyle = value as StyleKey
                    if (selectionUsesScopedRuns && selectionRange) {
                      applySelectionTextFormat({ styleKey: nextStyle })
                      return
                    }
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
                      const nextBase: BaseTextFormat<StyleKey, FontFamily> = {
                        fontFamily: prev.draftFont,
                        fontWeight: resolvedVariant.weight,
                        italic: resolvedVariant.italic,
                        styleKey: nextStyle,
                        color: prev.draftColor,
                      }
                      return {
                        ...prev,
                        draftStyle: nextStyle,
                        draftFontWeight: resolvedVariant.weight,
                        draftItalic: resolvedVariant.italic,
                        draftTextFormatRuns: rebaseDraftTextFormatRuns(prev, nextBase),
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
                  <SelectTrigger className={`h-8 w-full text-xs ${tone.input}`}>
                    <SelectValue placeholder="Mixed" />
                  </SelectTrigger>
                  <SelectContent className={tone.selectContent}>
                    {controls.styleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {getStyleOptionLabel(option.value, option.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>),
              )}
              {fxSelected ? renderSettingRow(
                <LetterText className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "FX Size",
                withSubmenuTooltip("Set the FX font size in points", <input
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
                  className={fullWidthInputClassName}
                  aria-label="FX font size"
                />),
              ) : null}
              {fxSelected ? renderSettingRow(
                <Baseline className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "FX Lead",
                withSubmenuTooltip("Set the FX leading in points", <input
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
                  className={fullWidthInputClassName}
                  aria-label="FX line leading"
                />),
              ) : null}
              {renderSettingRow(
                <TextCursorInput className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Kerning",
                withSubmenuTooltip("Choose optical or metric kerning", <Select
                  value={controls.editorState.draftOpticalKerning ? "on" : "off"}
                  onValueChange={(value) => {
                    controls.setEditorState((prev) => prev ? {
                      ...prev,
                      draftOpticalKerning: value !== "off",
                    } : prev)
                  }}
                >
                  <SelectTrigger className={`h-8 w-full text-xs ${tone.input}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={tone.selectContent}>
                    <SelectItem value="on">Optical</SelectItem>
                    <SelectItem value="off">Metric</SelectItem>
                  </SelectContent>
                </Select>),
              )}
              {renderSettingRow(
                <MoveHorizontal className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Tracking",
                withSubmenuTooltip("Set paragraph tracking, or apply tracking to the current text selection (1/1000 em)", <input
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
                  className={fullWidthInputClassName}
                  aria-label={`Tracking from ${MIN_TRACKING_SCALE} to ${MAX_TRACKING_SCALE}`}
                />),
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
                  <SelectTrigger className={`h-8 w-full text-xs ${tone.input}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className={tone.selectContent}
                    side="top"
                    sideOffset={4}
                    avoidCollisions={false}
                    onPointerLeave={() => setPreviewColorScheme(null)}
                  >
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
                </Select>),
              )}
              {renderSettingRow(
                <Droplets className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                "Color",
                <div className="flex flex-wrap items-center gap-1">
                  {previewPalette.map((color, index) => {
                    const selected = (selectionColor ?? controls.editorState.draftColor).toLowerCase() === color.toLowerCase()
                    const swatchKey = `${activeColorScheme}-${index}-${color}`
                    return (
                      <HoverTooltip
                        key={swatchKey}
                        className="block"
                        label={`Set the paragraph color to ${color}`}
                        disabled={!showRolloverInfo}
                        anchorToClosestSelector={SUBMENU_TOOLTIP_ANCHOR_SELECTOR}
                        constrainToClosestSelector={PREVIEW_TOOLTIP_BOUNDARY_SELECTOR}
                        horizontalAlign="start"
                        tooltipClassName={submenuTooltipClassName}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            applySelectionTextFormat({ color })
                          }}
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
            </div>
          ) : null}

          {activeSubmenu === "info" ? (
            <div className="flex flex-col gap-0" style={{ width: `${SUBMENU_PANEL_WIDTH_PX}px` }}>
              {infoRows.map((row) => (
                <div key={row.label}>
                  {renderSettingRow(
                    <row.icon className={`h-4 w-4 shrink-0 ${tone.iconMuted}`} />,
                    row.label,
                    <span className="block truncate text-right text-xs">{row.value}</span>,
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
