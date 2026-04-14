"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"

import { EditorSidebarSection } from "@/components/layout/EditorSidebarSection"
import { Button } from "@/components/ui/button"
import { FontSelect } from "@/components/ui/font-select"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
import { usePersistedSectionState } from "@/hooks/usePersistedSectionState"

type TextEditorPanelProps<StyleKey extends string> = {
  controls: SharedTextEditorControls<StyleKey>
  showRolloverInfo?: boolean
  isDarkMode?: boolean
}

type SectionKey = "layout" | "type" | "info"

const TEXT_EDITOR_COLLAPSED_DEFAULTS: Record<SectionKey, boolean> = {
  layout: false,
  type: true,
  info: true,
}

export function TextEditorPanel<StyleKey extends string>({
  controls,
  showRolloverInfo = true,
  isDarkMode = false,
}: TextEditorPanelProps<StyleKey>) {
  const [fxSizeInput, setFxSizeInput] = useState("")
  const [fxLeadingInput, setFxLeadingInput] = useState("")
  const [trackingInput, setTrackingInput] = useState("")
  const [editorColorScheme, setEditorColorScheme] = useState<ImageColorSchemeId>(controls.selectedColorScheme)
  const [previewColorScheme, setPreviewColorScheme] = useState<ImageColorSchemeId | null>(null)
  const [collapsed, setCollapsed] = usePersistedSectionState(
    "swiss-grid-generator:text-editor-sections",
    TEXT_EDITOR_COLLAPSED_DEFAULTS,
  )
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

  const maxHeightBaselines = Math.max(1, controls.baselinesPerGridModule)
  const setTextEditorState = controls.setEditorState

  useEffect(() => {
    if (controls.editorState.draftHeightBaselines <= maxHeightBaselines) return
    setTextEditorState((prev) => (
      prev
        ? {
          ...prev,
          draftHeightBaselines: maxHeightBaselines,
        }
        : prev
    ))
  }, [
    controls.editorState.draftHeightBaselines,
    maxHeightBaselines,
    setTextEditorState,
  ])

  const activeColorScheme = previewColorScheme ?? editorColorScheme
  const previewPalette = controls.colorSchemes.find((scheme) => scheme.id === activeColorScheme)?.colors ?? controls.palette
  const resolvedHeightBaselines = Math.max(0, Math.min(maxHeightBaselines, controls.editorState.draftHeightBaselines))

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

  const getStyleOptionLabel = (styleKey: StyleKey, label: string) => (
    controls.isFxStyle(styleKey) ? label : `${label} (${controls.getStyleSizeLabel(styleKey)})`
  )
  const toggleSection = (key: SectionKey) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const tone = isDarkMode
    ? {
      border: "border-gray-700",
      input: "border-gray-700 bg-gray-900 text-gray-100 focus:border-gray-500",
      body: "text-gray-300",
      muted: "text-gray-400",
      panel: "bg-gray-900",
      infoFrame: "border-gray-700 bg-gray-900/60",
      infoRow: "border-gray-800",
      infoLabel: "text-gray-400",
      infoValue: "text-gray-100",
      button: "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-gray-100",
      buttonActive: "border-gray-600 bg-gray-800 text-gray-100",
      destructive: "border-red-700/70 text-red-200 hover:bg-red-950/40 hover:text-red-100",
      ringOffset: "ring-offset-gray-900",
      selectContent: "dark",
    }
    : {
      border: "border-gray-200",
      input: "border-gray-200 bg-white text-gray-900 focus:border-gray-400",
      body: "text-gray-700",
      muted: "text-gray-600",
      panel: "bg-white",
      infoFrame: "border-gray-200 bg-gray-50/80",
      infoRow: "border-gray-200",
      infoLabel: "text-gray-500",
      infoValue: "text-gray-900",
      button: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900",
      buttonActive: "border-gray-400 bg-gray-100 text-gray-900",
      destructive: "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-900",
      ringOffset: "ring-offset-white",
      selectContent: "",
    }

  const triggerClassName = `h-9 ${tone.input}`
  const textInputClassName = `h-9 w-full rounded-md border px-3 text-sm outline-none ${tone.input}`
  const sectionLabelClassName = `text-sm ${tone.muted}`
  const segmentButtonClassName = (active: boolean) => (
    `h-8 rounded-sm border px-3 text-xs ${active ? tone.buttonActive : tone.button}`
  )
  const inlineSwitchClassName = "h-3 w-6 rounded-none border border-black bg-white data-[state=checked]:bg-white data-[state=unchecked]:bg-white"
  const inlineSwitchThumbClassName = "h-3 w-3 rounded-none border border-black bg-gray-300 shadow-none data-[state=checked]:translate-x-3"
  const infoRows = [
    ["Rows", String(controls.editorState.draftRows)],
    ["Baselines", String(controls.editorState.draftHeightBaselines)],
    ["Cols", String(controls.editorState.draftColumns)],
    ["Rotation", `${Math.round(controls.editorState.draftRotation)}deg`],
    ["Align", controls.editorState.draftAlign.charAt(0).toUpperCase() + controls.editorState.draftAlign.slice(1)],
    ["Reflow", controls.editorState.draftReflow && canUseNewspaperReflow ? "On" : "Off"],
    ["Hyphen", controls.editorState.draftSyllableDivision ? "On" : "Off"],
    ["Font", selectionFontFamily ?? "Mixed"],
    ["Cut", selectedFontVariantForSelection?.label ?? "Mixed"],
    ["Hierarchy", selectedStyleLabelForSelection],
    ["Kerning", controls.editorState.draftOpticalKerning ? "Optical" : "Metric"],
    ["Tracking", selectionTrackingScale !== null ? formatTrackingScale(selectionTrackingScale) : "Mixed"],
    ["Scheme", selectedSchemeLabel],
    ["Color", selectionColor ?? "Mixed"],
    ["Chars", String(characterCount)],
    ["Words", String(wordCount)],
    ["Max/Line", String(controls.maxCharsPerLine ?? 0)],
  ]

  return (
    <div data-text-editor-panel="true" className={`min-h-0 flex h-full flex-col overflow-hidden ${tone.panel}`}>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-4 md:p-6 md:pt-6">
        <EditorSidebarSection
          title="I. Paragraph"
          tooltip="Rows, baselines, columns, alignment, flow, and rotation"
          collapsed={collapsed.layout}
          collapsedSummary={`${controls.editorState.draftRows} rows, ${controls.editorState.draftColumns} cols`}
          onToggle={() => toggleSection("layout")}
          isDarkMode={isDarkMode}
          showRolloverInfo={showRolloverInfo}
        >
          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Rows</Label>
            <Select
              value={String(controls.editorState.draftRows)}
              onValueChange={(value) => {
                const nextRows = Math.max(0, Math.min(controls.gridRows, Number(value)))
                controls.setEditorState((prev) => prev ? {
                  ...prev,
                  draftRows: nextRows,
                  draftHeightBaselines: nextRows === 0 && prev.draftHeightBaselines === 0 ? 1 : prev.draftHeightBaselines,
                } : prev)
              }}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={tone.selectContent}>
                {Array.from({ length: controls.gridRows + 1 }, (_, index) => index).map((count) => (
                  <SelectItem key={count} value={String(count)}>
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
                controls.setEditorState((prev) => prev ? {
                  ...prev,
                  draftRows: prev.draftRows === 0 && nextBaselines === 0 ? 1 : prev.draftRows,
                  draftHeightBaselines: nextBaselines,
                } : prev)
              }}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={tone.selectContent}>
                <SelectItem value="0">0 baselines</SelectItem>
                {Array.from({ length: maxHeightBaselines }, (_, index) => index + 1).map((count) => (
                  <SelectItem key={`paragraph-baselines-${count}`} value={String(count)}>
                    {count} {count === 1 ? "baseline" : "baselines"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Columns</Label>
            <Select
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
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={tone.selectContent}>
                {Array.from({ length: controls.gridCols }, (_, index) => index + 1).map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count} {count === 1 ? "col" : "cols"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Alignment</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftAlign === "left")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "left" } : prev)}
              >
                Left
              </button>
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftAlign === "center")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "center" } : prev)}
              >
                Center
              </button>
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftAlign === "right")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftAlign: "right" } : prev)}
              >
                Right
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className={sectionLabelClassName}>Newspaper Reflow</Label>
                <p className={`mt-1 text-[11px] ${tone.muted}`}>
                  {canUseNewspaperReflow ? "Flow across configured columns." : "Requires at least two columns."}
                </p>
              </div>
              <Switch
                checked={controls.editorState.draftReflow && canUseNewspaperReflow}
                disabled={!canUseNewspaperReflow}
                onCheckedChange={(checked) => controls.setEditorState((prev) => prev ? { ...prev, draftReflow: checked } : prev)}
                className={inlineSwitchClassName}
                thumbClassName={inlineSwitchThumbClassName}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className={sectionLabelClassName}>Hyphenation</Label>
                <p className={`mt-1 text-[11px] ${tone.muted}`}>Enable syllable division.</p>
              </div>
              <Switch
                checked={controls.editorState.draftSyllableDivision}
                onCheckedChange={(checked) => controls.setEditorState((prev) => prev ? { ...prev, draftSyllableDivision: checked } : prev)}
                className={inlineSwitchClassName}
                thumbClassName={inlineSwitchThumbClassName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Rotation</Label>
            <input
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
              className={textInputClassName}
            />
          </div>
        </EditorSidebarSection>

        <EditorSidebarSection
          title="II. Typo"
          tooltip="Font family, cut, hierarchy, color, FX size, kerning, and tracking"
          collapsed={collapsed.type}
          collapsedSummary={`${selectionFontFamily ?? "Mixed"}, ${selectedStyleLabelForSelection}`}
          onToggle={() => toggleSection("type")}
          isDarkMode={isDarkMode}
          showRolloverInfo={showRolloverInfo}
        >
          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Font</Label>
            <FontSelect
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
              triggerClassName={triggerClassName}
              triggerStyle={{ width: "100%" }}
              contentClassName={tone.selectContent}
              placeholder="Mixed"
            />
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Cut</Label>
            <Select
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
              <SelectTrigger className={triggerClassName}>
                <SelectValue placeholder="Mixed" />
              </SelectTrigger>
              <SelectContent className={tone.selectContent}>
                {getFontVariants(selectionFontFamily ?? controls.editorState.draftFont).map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Hierarchy</Label>
            <Select
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
              <SelectTrigger className={triggerClassName}>
                <SelectValue placeholder="Mixed" />
              </SelectTrigger>
              <SelectContent className={tone.selectContent}>
                {controls.styleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {getStyleOptionLabel(option.value, option.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fxSelected ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={sectionLabelClassName}>FX Size</Label>
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
                  className={textInputClassName}
                />
              </div>

              <div className="space-y-2">
                <Label className={sectionLabelClassName}>FX Leading</Label>
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
                  className={textInputClassName}
                />
              </div>
            </div>
          ) : null}

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
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Color</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {previewPalette.map((color, index) => {
                const selected = (selectionColor ?? controls.editorState.draftColor).toLowerCase() === color.toLowerCase()
                const swatchKey = `${activeColorScheme}-${index}-${color}`
                return (
                  <button
                    key={swatchKey}
                    type="button"
                    onClick={() => {
                      applySelectionTextFormat({ color })
                    }}
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
            <Label className={sectionLabelClassName}>Kerning</Label>
            <Select
              value={controls.editorState.draftOpticalKerning ? "on" : "off"}
              onValueChange={(value) => {
                controls.setEditorState((prev) => prev ? {
                  ...prev,
                  draftOpticalKerning: value !== "off",
                } : prev)
              }}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={tone.selectContent}>
                <SelectItem value="on">Optical</SelectItem>
                <SelectItem value="off">Metric</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Tracking</Label>
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
              className={textInputClassName}
            />
          </div>
        </EditorSidebarSection>

        <EditorSidebarSection
          title="III. Info"
          tooltip="Paragraph summary and live metrics"
          collapsed={collapsed.info}
          collapsedSummary={`${characterCount} chars, ${wordCount} words`}
          onToggle={() => toggleSection("info")}
          isDarkMode={isDarkMode}
          showRolloverInfo={showRolloverInfo}
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
            onClick={controls.deleteEditorBlock}
          >
            <span className="font-medium">Delete Paragraph</span>
            <Trash2 className="h-4 w-4 shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  )
}
