"use client"

import { useEffect, useRef, useState } from "react"
import { Trash2 } from "lucide-react"

import { EditorSidebarSection } from "@/components/layout/EditorSidebarSection"
import { Button } from "@/components/ui/button"
import { FontSelect } from "@/components/ui/font-select"
import { EditorColorSchemeControls } from "@/components/ui/editor-color-scheme-controls"
import { Label } from "@/components/ui/label"
import { DebouncedSlider } from "@/components/ui/slider"
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
import { useStateSnapshotSelectPreview } from "@/hooks/useStateSnapshotSelectPreview"
import type { HelpSectionId } from "@/lib/help-registry"

type TextEditorPanelProps<StyleKey extends string> = {
  controls: SharedTextEditorControls<StyleKey>
  showHelpIndicator?: boolean
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  showRolloverInfo?: boolean
  isDarkMode?: boolean
}

type SectionKey = "layout" | "type" | "info"
const SECTION_HEADER_CLICK_DELAY_MS = 180
const TEXT_EDITOR_SECTION_KEYS: SectionKey[] = ["layout", "type", "info"]

const TEXT_EDITOR_COLLAPSED_DEFAULTS: Record<SectionKey, boolean> = {
  layout: false,
  type: true,
  info: true,
}

const TEXT_EDITOR_HELP_SECTION_BY_KEY: Record<SectionKey, HelpSectionId> = {
  layout: "help-editor-paragraph",
  type: "help-editor-typo",
  info: "help-editor-info",
}

export function TextEditorPanel<StyleKey extends string>({
  controls,
  showHelpIndicator = false,
  onOpenHelpSection,
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
  const sectionHeaderClickTimeoutRef = useRef<number | null>(null)
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

  useEffect(() => {
    return () => {
      if (sectionHeaderClickTimeoutRef.current !== null) {
        window.clearTimeout(sectionHeaderClickTimeoutRef.current)
      }
    }
  }, [])

  const maxHeightBaselines = Math.max(0, controls.baselinesPerGridModule - 1)
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

  const getSelectionRangeForState = (state: typeof controls.editorState | null) => (
    state && state.draftSelectionStart !== state.draftSelectionEnd
      ? {
          start: state.draftSelectionStart,
          end: state.draftSelectionEnd,
        }
      : null
  )

  const getBaseTextFormatForState = (state: typeof controls.editorState): BaseTextFormat<StyleKey, FontFamily> => ({
    fontFamily: state.draftFont,
    fontWeight: state.draftFontWeight,
    italic: state.draftItalic,
    styleKey: state.draftStyle,
    color: state.draftColor,
  })

  const getSelectionFormatValueForState = <Prop extends keyof BaseTextFormat<StyleKey, FontFamily>>(
    state: typeof controls.editorState | null,
    prop: Prop,
  ) => {
    if (!state) return null
    const nextSelectionRange = getSelectionRangeForState(state)
    const baseTextFormat = getBaseTextFormatForState(state)
    return nextSelectionRange
      ? getUniformTextFormatValueForRange(
          state.draftText,
          nextSelectionRange,
          baseTextFormat,
          state.draftTextFormatRuns,
          prop,
        )
      : baseTextFormat[prop]
  }

  const applyTextFormatPatchToState = (
    state: typeof controls.editorState | null,
    patch: Partial<BaseTextFormat<StyleKey, FontFamily>>,
  ) => {
    if (!state) return state
    const nextSelectionRange = getSelectionRangeForState(state)
    const selectionCoversWholeText = Boolean(
      nextSelectionRange
      && nextSelectionRange.start === 0
      && nextSelectionRange.end === state.draftText.length,
    )
    const nextSelectionUsesScopedRuns = Boolean(nextSelectionRange && !selectionCoversWholeText)
    if (nextSelectionUsesScopedRuns && nextSelectionRange) {
      return {
        ...state,
        draftTextFormatRuns: applyTextFormatToRange(
          state.draftText,
          nextSelectionRange,
          patch,
          getBaseTextFormatForState(state),
          state.draftTextFormatRuns,
        ),
      }
    }

    const nextBase: BaseTextFormat<StyleKey, FontFamily> = {
      fontFamily: patch.fontFamily ?? state.draftFont,
      fontWeight: patch.fontWeight ?? state.draftFontWeight,
      italic: patch.italic ?? state.draftItalic,
      styleKey: patch.styleKey ?? state.draftStyle,
      color: patch.color ?? state.draftColor,
    }

    return {
      ...state,
      draftFont: nextBase.fontFamily,
      draftFontWeight: nextBase.fontWeight,
      draftItalic: nextBase.italic,
      draftStyle: nextBase.styleKey,
      draftColor: nextBase.color,
      draftTextFormatRuns: rebaseDraftTextFormatRuns(state, nextBase),
    }
  }

  const applyDraftRowsValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const nextRows = Math.max(0, Math.min(controls.gridRows, Number(value)))
    return {
      ...state,
      draftRows: nextRows,
    }
  }

  const applyDraftColumnsValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const nextColumns = Math.max(1, Math.min(controls.gridCols, Number(value)))
    return {
      ...state,
      draftColumns: nextColumns,
      draftReflow: nextColumns > 1 ? state.draftReflow : false,
    }
  }

  const applyDraftBaselinesValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const nextBaselines = Math.max(0, Math.min(maxHeightBaselines, Number(value)))
    return {
      ...state,
      draftHeightBaselines: nextBaselines,
    }
  }

  const applyDraftFontValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const nextFont = value as FontFamily
    const requestedWeight = getSelectionFormatValueForState(state, "fontWeight") ?? state.draftFontWeight
    const requestedItalic = getSelectionFormatValueForState(state, "italic") ?? state.draftItalic
    const resolvedVariant = resolveFontVariant(nextFont, requestedWeight, requestedItalic)
    return applyTextFormatPatchToState(state, {
      fontFamily: nextFont,
      fontWeight: resolvedVariant.weight,
      italic: resolvedVariant.italic,
    })
  }

  const applyDraftFontCutValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const fontFamily = getSelectionFormatValueForState(state, "fontFamily") ?? state.draftFont
    const nextVariant = getFontVariantById(fontFamily, value)
    if (!nextVariant) return state
    return applyTextFormatPatchToState(state, {
      fontWeight: nextVariant.weight,
      italic: nextVariant.italic,
    })
  }

  const applyDraftHierarchyValue = (value: string, state: typeof controls.editorState | null) => {
    if (!state) return state
    const nextStyle = value as StyleKey
    const nextSelectionRange = getSelectionRangeForState(state)
    const selectionCoversWholeText = Boolean(
      nextSelectionRange
      && nextSelectionRange.start === 0
      && nextSelectionRange.end === state.draftText.length,
    )
    const nextSelectionUsesScopedRuns = Boolean(nextSelectionRange && !selectionCoversWholeText)
    if (nextSelectionUsesScopedRuns && nextSelectionRange) {
      return applyTextFormatPatchToState(state, { styleKey: nextStyle })
    }
    const currentDefaultWeight = controls.getStyleDefaultFontWeight(state.draftStyle)
    const currentDefaultItalic = controls.getStyleDefaultItalic(state.draftStyle)
    const nextDefaultWeight = controls.getStyleDefaultFontWeight(nextStyle)
    const nextDefaultItalic = controls.getStyleDefaultItalic(nextStyle)
    const requestedWeight = state.draftFontWeight === currentDefaultWeight
      ? nextDefaultWeight
      : state.draftFontWeight
    const requestedItalic = state.draftItalic === currentDefaultItalic
      ? nextDefaultItalic
      : state.draftItalic
    const resolvedVariant = resolveFontVariant(state.draftFont, requestedWeight, requestedItalic)
    const nextBase: BaseTextFormat<StyleKey, FontFamily> = {
      fontFamily: state.draftFont,
      fontWeight: resolvedVariant.weight,
      italic: resolvedVariant.italic,
      styleKey: nextStyle,
      color: state.draftColor,
    }
    return {
      ...state,
      draftStyle: nextStyle,
      draftFontWeight: resolvedVariant.weight,
      draftItalic: resolvedVariant.italic,
      draftTextFormatRuns: rebaseDraftTextFormatRuns(state, nextBase),
      draftFxSize: controls.isFxStyle(nextStyle)
        ? (controls.isFxStyle(state.draftStyle) ? state.draftFxSize : controls.getStyleSizeValue(nextStyle))
        : state.draftFxSize,
      draftFxLeading: controls.isFxStyle(nextStyle)
        ? (controls.isFxStyle(state.draftStyle) ? state.draftFxLeading : controls.getStyleLeadingValue(nextStyle))
        : state.draftFxLeading,
      draftText: state.draftTextEdited ? state.draftText : controls.getDummyTextForStyle(nextStyle),
    }
  }

  const applyDraftKerningValue = (value: string, state: typeof controls.editorState | null) => (
    state
      ? {
          ...state,
          draftOpticalKerning: value !== "off",
        }
      : state
  )

  const rowsSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftRowsValue,
    committedValue: String(controls.editorState.draftRows),
  })
  const columnsSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftColumnsValue,
    committedValue: String(controls.editorState.draftColumns),
  })
  const baselinesSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftBaselinesValue,
    committedValue: String(resolvedHeightBaselines),
  })
  const fontSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftFontValue,
    committedValue: selectionFontFamily ?? controls.editorState.draftFont,
  })
  const cutSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftFontCutValue,
    committedValue: selectedFontVariantForSelection?.id
      ?? resolveFontVariant(
        selectionFontFamily ?? controls.editorState.draftFont,
        selectionFontWeight ?? controls.editorState.draftFontWeight,
        selectionItalic ?? controls.editorState.draftItalic,
      ).id,
  })
  const hierarchySelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftHierarchyValue,
    committedValue: selectionStyleKey ?? controls.editorState.draftStyle,
  })
  const kerningSelectPreview = useStateSnapshotSelectPreview<typeof controls.editorState | null, string>({
    state: controls.editorState,
    setState: controls.setEditorState,
    applyValue: applyDraftKerningValue,
    committedValue: controls.editorState.draftOpticalKerning ? "on" : "off",
  })

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
      const allClosed = TEXT_EDITOR_SECTION_KEYS.every((key) => current[key])
      return TEXT_EDITOR_SECTION_KEYS.reduce((nextState, key) => {
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
      buttonActive: "border-gray-600 bg-gray-800 text-gray-100",
      destructive: "border-red-700/70 text-red-200 hover:bg-red-950/40 hover:text-red-100",
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
  const inlineSwitchClassName = "h-3 w-6 rounded-none border border-black bg-gray-300 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
  const inlineSwitchThumbClassName = "h-3 w-3 rounded-none border border-black bg-white shadow-none data-[state=checked]:translate-x-3"
  const infoRows = [
    ["Rows", String(controls.editorState.draftRows)],
    ["Baselines", String(controls.editorState.draftHeightBaselines)],
    ["Cols", String(controls.editorState.draftColumns)],
    ["Rotation", `${Math.round(controls.editorState.draftRotation)}deg`],
    ["Align", controls.editorState.draftAlign.charAt(0).toUpperCase() + controls.editorState.draftAlign.slice(1)],
    ["V Align", controls.editorState.draftVerticalAlign.charAt(0).toUpperCase() + controls.editorState.draftVerticalAlign.slice(1)],
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
    <div
      data-text-editor-panel="true"
      data-editor-interactive-root="true"
      className={`min-h-0 flex h-full flex-col overflow-hidden ${tone.panel}`}
    >
      <div className={`min-h-0 flex-1 overflow-y-auto p-4 pt-4 md:p-6 md:pt-6 ${tone.surface}`}>
        <EditorSidebarSection
          title="I. Geometry / Paragraph"
          tooltip="Rows, baselines, columns, alignment, flow, and rotation; geometry dropdowns preview on rollover"
          collapsed={collapsed.layout}
          collapsedSummary={`${controls.editorState.draftRows} rows, ${controls.editorState.draftColumns} cols`}
          onHeaderClick={handleSectionHeaderClick("layout")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(TEXT_EDITOR_HELP_SECTION_BY_KEY.layout)}
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
              <SelectContent className={tone.selectContent} onPointerLeave={rowsSelectPreview.handleContentPointerLeave}>
                {Array.from({ length: controls.gridRows + 1 }, (_, index) => index).map((count) => (
                  <SelectItem key={count} value={String(count)} {...rowsSelectPreview.getItemPreviewProps(String(count))}>
                    {count} {count === 1 ? "row" : "rows"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={columnsSelectPreview.value}
              onOpenChange={columnsSelectPreview.handleOpenChange}
              onValueChange={columnsSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={tone.selectContent} onPointerLeave={columnsSelectPreview.handleContentPointerLeave}>
                {Array.from({ length: controls.gridCols }, (_, index) => index + 1).map((count) => (
                  <SelectItem key={count} value={String(count)} {...columnsSelectPreview.getItemPreviewProps(String(count))}>
                    {count} {count === 1 ? "col" : "cols"}
                  </SelectItem>
                ))}
              </SelectContent>
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
              <SelectContent className={tone.selectContent} onPointerLeave={baselinesSelectPreview.handleContentPointerLeave}>
                <SelectItem value="0" {...baselinesSelectPreview.getItemPreviewProps("0")}>0 baselines</SelectItem>
                {Array.from({ length: maxHeightBaselines }, (_, index) => index + 1).map((count) => (
                  <SelectItem
                    key={`paragraph-baselines-${count}`}
                    value={String(count)}
                    {...baselinesSelectPreview.getItemPreviewProps(String(count))}
                  >
                    {count} {count === 1 ? "baseline" : "baselines"}
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

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Vertical Alignment</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftVerticalAlign === "top")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftVerticalAlign: "top" } : prev)}
              >
                Top
              </button>
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftVerticalAlign === "center")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftVerticalAlign: "center" } : prev)}
              >
                Center
              </button>
              <button
                type="button"
                className={segmentButtonClassName(controls.editorState.draftVerticalAlign === "bottom")}
                onClick={() => controls.setEditorState((prev) => prev ? { ...prev, draftVerticalAlign: "bottom" } : prev)}
              >
                Bottom
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
            <div className="flex items-center justify-between">
              <Label className={sectionLabelClassName}>Rotation</Label>
              <span className={`rounded px-1.5 py-0.5 text-xs font-mono ${isDarkMode ? "bg-gray-800 text-gray-100" : "bg-gray-100 text-gray-900"}`}>
                {Math.round(controls.editorState.draftRotation)}°
              </span>
            </div>
            <DebouncedSlider
              value={[controls.editorState.draftRotation]}
              min={-180}
              max={180}
              step={1}
              onValueCommit={([value]) => {
                controls.setEditorState((prev) => prev ? {
                  ...prev,
                  draftRotation: clampRotation(value),
                } : prev)
              }}
              onThumbDoubleClick={() => {
                controls.setEditorState((prev) => prev ? {
                  ...prev,
                  draftRotation: 0,
                } : prev)
              }}
            />
          </div>
        </EditorSidebarSection>

        <EditorSidebarSection
          title="II. Typo"
          tooltip="Font family, cut, hierarchy, color, FX size, kerning, and tracking; supported dropdowns preview on rollover"
          collapsed={collapsed.type}
          collapsedSummary={`${selectionFontFamily ?? "Mixed"}, ${selectedStyleLabelForSelection}`}
          onHeaderClick={handleSectionHeaderClick("type")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(TEXT_EDITOR_HELP_SECTION_BY_KEY.type)}
        >
          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Font</Label>
            <FontSelect
              value={fontSelectPreview.value}
              onValueChange={fontSelectPreview.handleValueChange}
              options={FONT_OPTIONS}
              triggerClassName={triggerClassName}
              triggerStyle={{ width: "100%" }}
              contentClassName={tone.selectContent}
              placeholder="Mixed"
              onOpenChange={fontSelectPreview.handleOpenChange}
              onContentPointerLeave={fontSelectPreview.handleContentPointerLeave}
              getItemPreviewProps={fontSelectPreview.getItemPreviewProps}
            />
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Cut</Label>
            <Select
              value={cutSelectPreview.value}
              onOpenChange={cutSelectPreview.handleOpenChange}
              onValueChange={cutSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue placeholder="Mixed" />
              </SelectTrigger>
              <SelectContent className={tone.selectContent} onPointerLeave={cutSelectPreview.handleContentPointerLeave}>
                {getFontVariants(selectionFontFamily ?? controls.editorState.draftFont).map((variant) => (
                  <SelectItem key={variant.id} value={variant.id} {...cutSelectPreview.getItemPreviewProps(variant.id)}>
                    {variant.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Hierarchy</Label>
            <Select
              value={hierarchySelectPreview.value}
              onOpenChange={hierarchySelectPreview.handleOpenChange}
              onValueChange={hierarchySelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue placeholder="Mixed" />
              </SelectTrigger>
              <SelectContent className={tone.selectContent} onPointerLeave={hierarchySelectPreview.handleContentPointerLeave}>
                {controls.styleOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    {...hierarchySelectPreview.getItemPreviewProps(option.value)}
                  >
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

          <EditorColorSchemeControls
            schemes={controls.colorSchemes}
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
            selectedColor={selectionColor ?? controls.editorState.draftColor}
            onColorSelect={(color) => {
              applySelectionTextFormat({ color })
            }}
            isDarkMode={isDarkMode}
            labelClassName={sectionLabelClassName}
            triggerClassName={triggerClassName}
            selectContentClassName={tone.selectContent}
            ringOffsetClassName={tone.ringOffset}
          />

          <div className="space-y-2">
            <Label className={sectionLabelClassName}>Kerning</Label>
            <Select
              value={kerningSelectPreview.value}
              onOpenChange={kerningSelectPreview.handleOpenChange}
              onValueChange={kerningSelectPreview.handleValueChange}
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={tone.selectContent} onPointerLeave={kerningSelectPreview.handleContentPointerLeave}>
                <SelectItem value="on" {...kerningSelectPreview.getItemPreviewProps("on")}>Optical</SelectItem>
                <SelectItem value="off" {...kerningSelectPreview.getItemPreviewProps("off")}>Metric</SelectItem>
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
          onHeaderClick={handleSectionHeaderClick("info")}
          onHeaderDoubleClick={handleSectionHeaderDoubleClick}
          isDarkMode={isDarkMode}
          showHelpIndicator={showHelpIndicator}
          showRolloverInfo={showRolloverInfo}
          onHelpNavigate={() => onOpenHelpSection?.(TEXT_EDITOR_HELP_SECTION_BY_KEY.info)}
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
