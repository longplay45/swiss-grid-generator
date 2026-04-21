"use client"

import type { BlockEditorState } from "@/components/editor/block-editor-types"
import { getFontFamilyCss } from "@/lib/config/fonts"
import {
  resolveTextSchemeColor,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import type { RenderedTextLine } from "@/lib/preview-types"
import {
  buildInlineEditorTransform,
  computeInlineEditorSpecialCharMarkers,
  computeInlineEditorCaret,
  computeInlineEditorSelectionRects,
  computeInlineEditorTextBox,
  hitTestInlineEditorIndex,
  resolveInlineEditorSentenceSelection,
  resolveInlineEditorLineNavigation,
  resolveInlineEditorWordSelection,
} from "@/lib/inline-editor"
import { normalizeInlineEditorText } from "@/lib/inline-text-normalization"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  measureCanvasTextWidth,
  normalizeTrackingScale,
} from "@/lib/text-rendering"
import {
  remapTrackingRunsForTextEdit,
} from "@/lib/text-tracking-runs"
import {
  measureFormattedTextRangeWidth,
  rebaseTextFormatRunsForTextEdit,
  resolveTextFormatAtIndex,
  type PositionedTextFormatTrackingSegment,
} from "@/lib/text-format-runs"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import type { Dispatch, RefObject, SetStateAction } from "react"

type SelectionDirection = "forward" | "backward" | "none"

type InlineEditorSelectionState = {
  start: number
  end: number
  anchor: number
  focusIndex: number
  focused: boolean
}

type InlineEditorOverlayRect = {
  left: number
  top: number
  width: number
  height: number
}

type InlineEditorOverlayCaret = {
  left: number
  top: number
  height: number
}

type InlineEditorSpecialCharMarker = {
  glyph: string
  x: number
  baselineY: number
  fontSize: number
}

export type InlineEditorLayout = {
  rect: {
    x: number
    y: number
    width: number
    height: number
  }
  blockRotation: number
  rotationOriginX: number
  rotationOriginY: number
  textAscent: number
  textAlign: "left" | "center" | "right"
  commands: Array<{
    text: string
    x: number
    y: number
    sourceStart?: number
    sourceEnd?: number
    leadingBoundaryWhitespace?: number
  }>
  segmentLines: PositionedTextFormatTrackingSegment<string, string>[][]
  renderedLines: RenderedTextLine[]
}

type InlineBlockTextareaProps<StyleKey extends string> = {
  editorState: BlockEditorState<StyleKey> | null
  setEditorState: Dispatch<SetStateAction<BlockEditorState<StyleKey> | null>>
  textareaRef: RefObject<HTMLTextAreaElement | null>
  layout: InlineEditorLayout | null
  pageWidth: number
  pageHeight: number
  pageRotation: number
  scale: number
  baselineStep: number
  imageColorScheme: ImageColorSchemeId
  pageBackgroundColor: string | null
  closeEditor: () => void
  saveEditor: () => void
  getStyleSizeValue: (styleKey: StyleKey) => number
  getStyleLeadingValue: (styleKey: StyleKey) => number
  isFxStyle: (styleKey: StyleKey) => boolean
}

type RgbColor = {
  r: number
  g: number
  b: number
}

const FALLBACK_DARK_COLOR = "#111111"
const FALLBACK_LIGHT_COLOR = "#ffffff"

function parseCanvasColor(value: string): RgbColor | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.fillStyle = "#000000"
  ctx.fillStyle = value
  const normalized = ctx.fillStyle.trim().toLowerCase()

  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1)
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16)
      const g = Number.parseInt(hex[1] + hex[1], 16)
      const b = Number.parseInt(hex[2] + hex[2], 16)
      return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) ? null : { r, g, b }
    }
    if (hex.length === 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16)
      const g = Number.parseInt(hex.slice(2, 4), 16)
      const b = Number.parseInt(hex.slice(4, 6), 16)
      return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) ? null : { r, g, b }
    }
    return null
  }

  const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/)
  if (!rgbMatch) return null
  const [rString = "", gString = "", bString = ""] = rgbMatch[1].split(",")
  const r = Number.parseFloat(rString)
  const g = Number.parseFloat(gString)
  const b = Number.parseFloat(bString)
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null
  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
  }
}

function toRelativeLuminance({ r, g, b }: RgbColor): number {
  const transformChannel = (channel: number) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  return (
    0.2126 * transformChannel(r)
    + 0.7152 * transformChannel(g)
    + 0.0722 * transformChannel(b)
  )
}

function getContrastRatio(left: RgbColor, right: RgbColor): number {
  const leftLuminance = toRelativeLuminance(left)
  const rightLuminance = toRelativeLuminance(right)
  const lighter = Math.max(leftLuminance, rightLuminance)
  const darker = Math.min(leftLuminance, rightLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

function formatRgba(color: RgbColor, alpha: number): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`
}

function resolveInlineCaretColors(
  textColor: string,
  backgroundColor: string,
): {
  core: string
  halo: string
} {
  const resolvedTextColor = parseCanvasColor(textColor) ?? parseCanvasColor(FALLBACK_DARK_COLOR)
  const resolvedBackgroundColor = parseCanvasColor(backgroundColor) ?? parseCanvasColor(FALLBACK_LIGHT_COLOR)
  const fallbackDark = parseCanvasColor(FALLBACK_DARK_COLOR)
  const fallbackLight = parseCanvasColor(FALLBACK_LIGHT_COLOR)

  if (!resolvedTextColor || !resolvedBackgroundColor || !fallbackDark || !fallbackLight) {
    return {
      core: textColor,
      halo: "rgba(255, 255, 255, 0.82)",
    }
  }

  const textContrast = getContrastRatio(resolvedTextColor, resolvedBackgroundColor)
  const darkContrast = getContrastRatio(fallbackDark, resolvedBackgroundColor)
  const lightContrast = getContrastRatio(fallbackLight, resolvedBackgroundColor)
  const coreColor = textContrast >= 2.5
    ? resolvedTextColor
    : darkContrast >= lightContrast
      ? fallbackDark
      : fallbackLight

  const haloCandidate = getContrastRatio(fallbackLight, coreColor) >= getContrastRatio(fallbackDark, coreColor)
    ? fallbackLight
    : fallbackDark

  const haloScore = Math.min(
    getContrastRatio(haloCandidate, resolvedBackgroundColor),
    getContrastRatio(haloCandidate, coreColor),
  )
  const alternateHaloCandidate = haloCandidate === fallbackLight ? fallbackDark : fallbackLight
  const alternateHaloScore = Math.min(
    getContrastRatio(alternateHaloCandidate, resolvedBackgroundColor),
    getContrastRatio(alternateHaloCandidate, coreColor),
  )
  const haloColor = alternateHaloScore > haloScore ? alternateHaloCandidate : haloCandidate

  return {
    core: `rgb(${Math.round(coreColor.r)}, ${Math.round(coreColor.g)}, ${Math.round(coreColor.b)})`,
    halo: formatRgba(haloColor, 0.82),
  }
}

function resolveInlineSpecialCharacterColor(textColor: string, backgroundColor: string): string {
  const resolvedTextColor = parseCanvasColor(textColor) ?? parseCanvasColor(FALLBACK_DARK_COLOR)
  const resolvedBackgroundColor = parseCanvasColor(backgroundColor) ?? parseCanvasColor(FALLBACK_LIGHT_COLOR)
  const fallbackDark = parseCanvasColor(FALLBACK_DARK_COLOR)
  const fallbackLight = parseCanvasColor(FALLBACK_LIGHT_COLOR)

  if (!resolvedTextColor || !resolvedBackgroundColor || !fallbackDark || !fallbackLight) {
    return "rgba(17, 17, 17, 0.55)"
  }

  const textContrast = getContrastRatio(resolvedTextColor, resolvedBackgroundColor)
  const darkContrast = getContrastRatio(fallbackDark, resolvedBackgroundColor)
  const lightContrast = getContrastRatio(fallbackLight, resolvedBackgroundColor)
  const markerColor = textContrast >= 2.2
    ? resolvedTextColor
    : darkContrast >= lightContrast
      ? fallbackDark
      : fallbackLight

  return formatRgba(markerColor, 0.55)
}

function InlineEditorOverlayCanvas({
  width,
  height,
  selectionRects,
  specialCharMarkers,
  specialCharColor,
  specialCharFontFamily,
  caret,
  caretVisible,
  caretCoreColor,
  caretHaloColor,
}: {
  width: number
  height: number
  selectionRects: InlineEditorOverlayRect[]
  specialCharMarkers: InlineEditorSpecialCharMarker[]
  specialCharColor: string
  specialCharFontFamily: string
  caret: InlineEditorOverlayCaret | null
  caretVisible: boolean
  caretCoreColor: string
  caretHaloColor: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pixelRatio = window.devicePixelRatio || 1
    const widthCss = Math.max(1, Math.ceil(width))
    const heightCss = Math.max(1, Math.ceil(height))
    const widthPx = Math.max(1, Math.round(widthCss * pixelRatio))
    const heightPx = Math.max(1, Math.round(heightCss * pixelRatio))

    if (canvas.width !== widthPx) canvas.width = widthPx
    if (canvas.height !== heightPx) canvas.height = heightPx

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, widthPx, heightPx)

    for (const rect of selectionRects) {
      const left = Math.round(rect.left * pixelRatio)
      const top = Math.round(rect.top * pixelRatio)
      const rectWidth = Math.max(1, Math.round(rect.width * pixelRatio))
      const rectHeight = Math.max(1, Math.round(rect.height * pixelRatio))
      ctx.fillStyle = "rgba(14, 165, 233, 0.18)"
      ctx.fillRect(left, top, rectWidth, rectHeight)
    }

    if (specialCharMarkers.length > 0) {
      ctx.fillStyle = specialCharColor
      ctx.textAlign = "center"
      ctx.textBaseline = "alphabetic"
      for (const marker of specialCharMarkers) {
        ctx.font = `${Math.max(1, marker.fontSize * pixelRatio)}px ${specialCharFontFamily}`
        ctx.fillText(
          marker.glyph,
          marker.x * pixelRatio,
          marker.baselineY * pixelRatio,
        )
      }
    }

    if (!caret || !caretVisible) return
    const caretX = Math.round(caret.left * pixelRatio)
    const caretTop = Math.round(caret.top * pixelRatio)
    const caretHeightPx = Math.max(1, Math.round(caret.height * pixelRatio))
    const caretCoreWidthPx = Math.max(1, Math.round(pixelRatio))
    const caretHaloWidthPx = caretCoreWidthPx + 2
    const caretHaloLeft = Math.max(0, caretX - Math.floor((caretHaloWidthPx - caretCoreWidthPx) / 2))
    const caretCoreLeft = Math.max(0, Math.min(widthPx - caretCoreWidthPx, caretX))
    const haloWidth = Math.max(1, Math.min(caretHaloWidthPx, widthPx - caretHaloLeft))
    const coreWidth = Math.max(1, Math.min(caretCoreWidthPx, widthPx - caretCoreLeft))

    ctx.fillStyle = caretHaloColor
    ctx.fillRect(caretHaloLeft, caretTop, haloWidth, caretHeightPx)
    ctx.fillStyle = caretCoreColor
    ctx.fillRect(caretCoreLeft, caretTop, coreWidth, caretHeightPx)
  }, [
    caret,
    caretCoreColor,
    caretHaloColor,
    caretVisible,
    height,
    selectionRects,
    specialCharColor,
    specialCharFontFamily,
    specialCharMarkers,
    width,
  ])

  return (
    <canvas
      ref={canvasRef}
      width={Math.max(1, Math.round(width))}
      height={Math.max(1, Math.round(height))}
      style={{
        width,
        height,
      }}
      className="pointer-events-none absolute inset-0 block"
      aria-hidden="true"
    />
  )
}

export function InlineBlockTextarea<StyleKey extends string>({
  editorState,
  setEditorState,
  textareaRef,
  layout,
  pageWidth,
  pageHeight,
  pageRotation,
  scale,
  baselineStep,
  imageColorScheme,
  pageBackgroundColor,
  closeEditor,
  saveEditor,
  getStyleSizeValue,
  getStyleLeadingValue,
  isFxStyle,
}: InlineBlockTextareaProps<StyleKey>) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [selectionFocused, setSelectionFocused] = useState(false)
  const dragAnchorRef = useRef<number | null>(null)
  const dragPointerIdRef = useRef<number | null>(null)
  const keyboardDesiredXRef = useRef<number | null>(null)
  const shouldRestoreSelectionOnFocusRef = useRef(true)
  const measureContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const [isCaretVisible, setIsCaretVisible] = useState(true)

  const buildSelectionState = useCallback((
    start: number,
    end: number,
    focused: boolean,
    direction: SelectionDirection = "none",
  ): InlineEditorSelectionState => {
    const nextStart = Math.min(start, end)
    const nextEnd = Math.max(start, end)
    if (nextStart === nextEnd) {
      return {
        start: nextStart,
        end: nextEnd,
        anchor: nextStart,
        focusIndex: nextEnd,
        focused,
      }
    }
    if (direction === "backward") {
      return {
        start: nextStart,
        end: nextEnd,
        anchor: nextEnd,
        focusIndex: nextStart,
        focused,
      }
    }
    return {
      start: nextStart,
      end: nextEnd,
      anchor: nextStart,
      focusIndex: nextEnd,
      focused,
    }
  }, [])

  const readTextareaSelection = useCallback((
    element: HTMLTextAreaElement,
    focused: boolean,
  ): InlineEditorSelectionState => {
    const selectionStart = element.selectionStart ?? 0
    const selectionEnd = element.selectionEnd ?? selectionStart
    const selectionDirection = (element.selectionDirection ?? "none") as SelectionDirection
    return buildSelectionState(selectionStart, selectionEnd, focused, selectionDirection)
  }, [buildSelectionState])

  const getSelectionDirection = useCallback((selection: InlineEditorSelectionState): SelectionDirection => {
    if (selection.start === selection.end) return "none"
    return selection.focusIndex < selection.anchor ? "backward" : "forward"
  }, [])

  const getEditorSelectionState = useCallback((
    state: BlockEditorState<StyleKey> | null,
    focused: boolean,
  ): InlineEditorSelectionState => {
    if (!state) {
      return {
        start: 0,
        end: 0,
        anchor: 0,
        focusIndex: 0,
        focused,
      }
    }
    return buildSelectionState(
      state.draftSelectionAnchor,
      state.draftSelectionFocusIndex,
      focused,
      state.draftSelectionFocusIndex < state.draftSelectionAnchor ? "backward" : "forward",
    )
  }, [buildSelectionState])

  const updateEditorSelection = useCallback((next: InlineEditorSelectionState) => {
    setSelectionFocused(next.focused)
    setEditorState((prev) => {
      if (!prev) return prev
      if (
        prev.draftSelectionStart === next.start
        && prev.draftSelectionEnd === next.end
        && prev.draftSelectionAnchor === next.anchor
        && prev.draftSelectionFocusIndex === next.focusIndex
      ) {
        return prev
      }
      return {
        ...prev,
        draftSelectionStart: next.start,
        draftSelectionEnd: next.end,
        draftSelectionAnchor: next.anchor,
        draftSelectionFocusIndex: next.focusIndex,
      }
    })
  }, [setEditorState])

  const syncSelectionFromTextarea = useCallback((focused = selectionFocused) => {
    const element = textareaRef.current
    if (!element) return
    const nextSelection = readTextareaSelection(element, focused)
    updateEditorSelection(nextSelection)
  }, [readTextareaSelection, selectionFocused, textareaRef, updateEditorSelection])

  const restoreSelectionFromEditorState = useCallback((focused: boolean) => {
    const element = textareaRef.current
    if (!element || !editorState) return false
    const nextSelection = getEditorSelectionState(editorState, focused)
    if (
      (element.selectionStart ?? 0) === nextSelection.start
      && (element.selectionEnd ?? 0) === nextSelection.end
    ) {
      setSelectionFocused(focused)
      return false
    }
    element.setSelectionRange(
      nextSelection.start,
      nextSelection.end,
      getSelectionDirection(nextSelection),
    )
    setSelectionFocused(focused)
    return true
  }, [
    editorState,
    getEditorSelectionState,
    getSelectionDirection,
    textareaRef,
  ])

  const selection = getEditorSelectionState(editorState, selectionFocused)

  useEffect(() => {
    if (!editorState) {
      keyboardDesiredXRef.current = null
      shouldRestoreSelectionOnFocusRef.current = true
      setSelectionFocused(false)
      return
    }
    shouldRestoreSelectionOnFocusRef.current = true
  }, [editorState])

  useLayoutEffect(() => {
    const element = textareaRef.current
    if (!element || document.activeElement !== element) return
    const direction = getSelectionDirection(selection)
    if (
      (element.selectionStart ?? 0) === selection.start
      && (element.selectionEnd ?? 0) === selection.end
      && (element.selectionDirection ?? "none") === direction
    ) {
      return
    }
    element.setSelectionRange(selection.start, selection.end, direction)
  }, [getSelectionDirection, selection, textareaRef])

  useEffect(() => {
    const shouldBlink = Boolean(editorState) && selection.focused && selection.start === selection.end
    setIsCaretVisible(true)
    if (!shouldBlink) return

    let blinkInterval: number | null = null
    const initialDelay = window.setTimeout(() => {
      setIsCaretVisible(false)
      blinkInterval = window.setInterval(() => {
        setIsCaretVisible((current) => !current)
      }, 530)
    }, 530)

    return () => {
      window.clearTimeout(initialDelay)
      if (blinkInterval !== null) {
        window.clearInterval(blinkInterval)
      }
    }
  }, [editorState, selection.end, selection.focused, selection.start])

  if (!editorState || !layout) return null
  const fallbackStyleSize = getStyleSizeValue(editorState.draftStyle)
  const styleFontSize = isFxStyle(editorState.draftStyle) ? editorState.draftFxSize : fallbackStyleSize
  const fallbackStyleLeading = getStyleLeadingValue(editorState.draftStyle)
  const styleLeading = isFxStyle(editorState.draftStyle) ? editorState.draftFxLeading : fallbackStyleLeading
  const fontWeight = editorState.draftFontWeight
  const scaledFontSize = Math.max(1, styleFontSize * scale)
  const scaledLeading = Math.max(scaledFontSize, styleLeading * scale)
  const trackingScale = normalizeTrackingScale(editorState.draftTrackingScale)
  const canvasFont = buildCanvasFont(editorState.draftFont, fontWeight, editorState.draftItalic, scaledFontSize)
  measureContextRef.current ??= typeof document !== "undefined"
    ? document.createElement("canvas").getContext("2d")
    : null
  if (measureContextRef.current) {
    applyCanvasTextConfig(measureContextRef.current, {
      font: canvasFont,
      opticalKerning: editorState.draftOpticalKerning,
    })
  }
  const fontMetrics = measureContextRef.current?.measureText("Hgyp")
  const editorTextAscent = fontMetrics?.actualBoundingBoxAscent && fontMetrics.actualBoundingBoxAscent > 0
    ? fontMetrics.actualBoundingBoxAscent
    : layout.textAscent > 0
      ? layout.textAscent
      : scaledFontSize * 0.8
  const editorTextDescent = fontMetrics?.actualBoundingBoxDescent && fontMetrics.actualBoundingBoxDescent > 0
    ? fontMetrics.actualBoundingBoxDescent
    : Math.max(1, scaledLeading - editorTextAscent)
  const caretHeight = Math.max(1, Math.min(scaledLeading, editorTextAscent + editorTextDescent))
  const measureText = (text: string, range?: { start: number; end: number }) => {
    if (typeof document === "undefined") return 0
    if (!measureContextRef.current) {
      measureContextRef.current = document.createElement("canvas").getContext("2d")
    }
    const ctx = measureContextRef.current
    if (!ctx) return 0
    applyCanvasTextConfig(ctx, {
      font: canvasFont,
      opticalKerning: editorState.draftOpticalKerning,
    })
    if (range && (editorState.draftTrackingRuns.length > 0 || editorState.draftTextFormatRuns.length > 0)) {
      return measureFormattedTextRangeWidth(ctx, {
        sourceText: editorState.draftText,
        renderedText: text,
        range,
        baseFormat: {
          fontFamily: editorState.draftFont,
          fontWeight,
          italic: editorState.draftItalic,
          styleKey: editorState.draftStyle,
          color: editorState.draftColor,
        },
        formatRuns: editorState.draftTextFormatRuns,
        baseTrackingScale: trackingScale,
        trackingRuns: editorState.draftTrackingRuns,
        resolveFontSize: (styleKey) => (
          styleKey === editorState.draftStyle && isFxStyle(styleKey)
            ? editorState.draftFxSize * scale
            : getStyleSizeValue(styleKey) * scale
        ),
        opticalKerning: editorState.draftOpticalKerning,
      })
    }
    return measureCanvasTextWidth(ctx, text, trackingScale, scaledFontSize, editorState.draftOpticalKerning)
  }
  const fxCaretOffsetY = isFxStyle(editorState.draftStyle)
    ? Math.max(0, (scaledLeading - editorTextAscent) / 2)
    : 0
  const visualCommands = layout.commands.length
    ? layout.commands
    : [{
      text: "",
      x: layout.textAlign === "right"
        ? layout.rect.x + layout.rect.width
        : layout.textAlign === "center"
          ? layout.rect.x + layout.rect.width / 2
          : layout.rect.x,
      y: layout.rotationOriginY + baselineStep + editorTextAscent,
    }]
  const firstVisualBaselineY = visualCommands[0]?.y ?? (layout.rotationOriginY + baselineStep + editorTextAscent)
  const renderedTextBoxTop = layout.renderedLines.length > 0
    ? Math.min(...layout.renderedLines.map((line) => line.top))
    : null
  const textBoxTop = renderedTextBoxTop ?? (firstVisualBaselineY - editorTextAscent - fxCaretOffsetY)
  const textBox = computeInlineEditorTextBox({
    rect: layout.rect,
    textAlign: layout.textAlign,
    commands: visualCommands,
    renderedLines: layout.renderedLines,
    measureText,
  })
  const consumedTop = Math.max(0, textBoxTop - layout.rect.y)
  const minHeight = Math.max(Math.max(0, layout.rect.height - consumedTop), scaledLeading * 3)
  const transform = buildInlineEditorTransform({
    pageWidth,
    pageHeight,
    pageRotation,
    blockRotation: layout.blockRotation,
    rectX: textBox.left,
    rectY: textBoxTop,
    rotationOriginX: layout.rotationOriginX,
    rotationOriginY: layout.rotationOriginY,
  })
  const caret = selection.focused && selection.start === selection.end
    ? computeInlineEditorCaret({
      text: editorState.draftText,
      textAlign: layout.textAlign,
      commands: visualCommands,
      renderedLines: layout.renderedLines,
      segmentLines: layout.segmentLines,
      selectionStart: selection.start,
      textAscent: editorTextAscent,
      textBoxTop,
      lineHeight: scaledLeading,
      caretHeight,
      measureText,
    })
    : null
  const selectionRects = computeInlineEditorSelectionRects({
    text: editorState.draftText,
    textAlign: layout.textAlign,
    commands: visualCommands,
    renderedLines: layout.renderedLines,
    segmentLines: layout.segmentLines,
    selectionStart: selection.start,
    selectionEnd: selection.end,
    textAscent: editorTextAscent,
    lineHeight: scaledLeading,
    measureText,
  })
  const hiddenCaret = caret ?? computeInlineEditorCaret({
    text: editorState.draftText,
    textAlign: layout.textAlign,
    commands: visualCommands,
    renderedLines: layout.renderedLines,
    segmentLines: layout.segmentLines,
    selectionStart: selection.focusIndex,
    textAscent: editorTextAscent,
    textBoxTop,
    lineHeight: scaledLeading,
    caretHeight,
    measureText,
  })
  const localSelectionRects = selectionRects.map((rect) => ({
    left: rect.left - textBox.left,
    top: rect.top - textBoxTop,
    width: rect.width,
    height: rect.height,
  }))
  const localCaret = caret
    ? {
      left: caret.x - textBox.left,
      top: caret.top,
      height: caret.height,
    }
    : null
  const caretFormat = resolveTextFormatAtIndex(
    editorState.draftText,
    selection.focusIndex,
    {
      fontFamily: editorState.draftFont,
      fontWeight,
      italic: editorState.draftItalic,
      styleKey: editorState.draftStyle,
      color: editorState.draftColor,
    },
    editorState.draftTextFormatRuns,
  )
  const caretTextColor = resolveTextSchemeColor(caretFormat.color, imageColorScheme)
  const effectiveBackgroundColor = pageBackgroundColor ?? FALLBACK_LIGHT_COLOR
  const caretColors = resolveInlineCaretColors(caretTextColor, effectiveBackgroundColor)
  const specialCharacterColor = resolveInlineSpecialCharacterColor(caretTextColor, effectiveBackgroundColor)
  const specialCharacterFontFamily = `${getFontFamilyCss(editorState.draftFont)}, system-ui, sans-serif`
  const specialCharacterFontSize = Math.max(8, Math.min(scaledFontSize * 0.62, scaledLeading * 0.72, 18))
  const specialCharMarkers = computeInlineEditorSpecialCharMarkers({
    text: editorState.draftText,
    textAlign: layout.textAlign,
    commands: visualCommands,
    renderedLines: layout.renderedLines,
    segmentLines: layout.segmentLines,
    textAscent: editorTextAscent,
    lineHeight: scaledLeading,
    measureText,
    markerFontSize: specialCharacterFontSize,
    newlineMarkerOffset: Math.min(Math.max(3, specialCharacterFontSize * 0.4), 8),
  })
  const localSpecialCharMarkers = specialCharMarkers.map((marker) => ({
    ...marker,
    x: marker.x - textBox.left,
    baselineY: marker.baselineY - textBoxTop,
  }))

  const setTextareaSelection = (
    anchor: number,
    focusIndex: number,
    focused = true,
  ) => {
    const element = textareaRef.current
    if (!element) return
    const direction: SelectionDirection = anchor === focusIndex
      ? "none"
      : focusIndex < anchor
        ? "backward"
        : "forward"
    const start = Math.min(anchor, focusIndex)
    const end = Math.max(anchor, focusIndex)
    shouldRestoreSelectionOnFocusRef.current = !focused
    element.setSelectionRange(start, end, direction)
    if (focused) {
      element.focus({ preventScroll: true })
    }
    const nextSelection = buildSelectionState(start, end, focused, direction)
    updateEditorSelection(nextSelection)
  }

  const handleTextareaBlur = () => {
    shouldRestoreSelectionOnFocusRef.current = true
    setSelectionFocused(false)
  }

  const handleTextareaFocus = () => {
    if (!shouldRestoreSelectionOnFocusRef.current) {
      shouldRestoreSelectionOnFocusRef.current = true
      syncSelectionFromTextarea(true)
      return
    }
    if (restoreSelectionFromEditorState(true)) {
      shouldRestoreSelectionOnFocusRef.current = true
      return
    }
    shouldRestoreSelectionOnFocusRef.current = true
    setSelectionFocused(true)
  }

  const rotatePoint = (x: number, y: number, originX: number, originY: number, angleDeg: number) => {
    const radians = (angleDeg * Math.PI) / 180
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    const dx = x - originX
    const dy = y - originY
    return {
      x: originX + dx * cos - dy * sin,
      y: originY + dx * sin + dy * cos,
    }
  }

  const toEditorLocalPoint = (clientX: number, clientY: number) => {
    const root = rootRef.current
    if (!root) return null
    const rect = root.getBoundingClientRect()
    const pagePoint = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
    const pageUnrotated = rotatePoint(pagePoint.x, pagePoint.y, pageWidth / 2, pageHeight / 2, -pageRotation)
    const blockUnrotated = rotatePoint(
      pageUnrotated.x,
      pageUnrotated.y,
      layout.rotationOriginX,
      layout.rotationOriginY,
      -layout.blockRotation,
    )
    return {
      x: blockUnrotated.x - textBox.left,
      y: blockUnrotated.y - textBoxTop,
    }
  }

  const updateSelectionFromPointer = (clientX: number, clientY: number, extendFromAnchor: boolean) => {
    const localPoint = toEditorLocalPoint(clientX, clientY)
    if (!localPoint) return
    const nextIndex = hitTestInlineEditorIndex({
      text: editorState.draftText,
      textAlign: layout.textAlign,
      commands: visualCommands,
      renderedLines: layout.renderedLines,
      segmentLines: layout.segmentLines,
      x: localPoint.x + textBox.left,
      y: localPoint.y + textBoxTop,
      textAscent: editorTextAscent,
      lineHeight: scaledLeading,
      measureText,
    })
    const anchor = extendFromAnchor && dragAnchorRef.current !== null
      ? dragAnchorRef.current
      : nextIndex
    keyboardDesiredXRef.current = null
    setTextareaSelection(anchor, nextIndex, true)
  }

  const selectRangeForMultiClick = (
    clientX: number,
    clientY: number,
    mode: "word" | "sentence",
  ) => {
    const localPoint = toEditorLocalPoint(clientX, clientY)
    if (!localPoint) return
    const nextIndex = hitTestInlineEditorIndex({
      text: editorState.draftText,
      textAlign: layout.textAlign,
      commands: visualCommands,
      renderedLines: layout.renderedLines,
      segmentLines: layout.segmentLines,
      x: localPoint.x + textBox.left,
      y: localPoint.y + textBoxTop,
      textAscent: editorTextAscent,
      lineHeight: scaledLeading,
      measureText,
    })
    const range = mode === "sentence"
      ? resolveInlineEditorSentenceSelection(editorState.draftText, nextIndex)
      : resolveInlineEditorWordSelection(editorState.draftText, nextIndex)
    keyboardDesiredXRef.current = null
    dragPointerIdRef.current = null
    dragAnchorRef.current = null
    setTextareaSelection(range.start, range.end, true)
  }

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 z-20"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: transform.pageTransform,
          transformOrigin: transform.pageTransformOrigin,
        }}
      >
        <div
          className="pointer-events-auto absolute"
          data-editor-interactive-root="true"
          data-inline-editor-layer="true"
          style={{
            left: textBox.left,
            top: textBoxTop,
            width: textBox.width,
            minHeight,
            transform: transform.blockTransform,
            transformOrigin: transform.blockTransformOrigin,
          }}
        >
          <InlineEditorOverlayCanvas
            width={textBox.width}
            height={minHeight}
            selectionRects={localSelectionRects}
            specialCharMarkers={localSpecialCharMarkers}
            specialCharColor={specialCharacterColor}
            specialCharFontFamily={specialCharacterFontFamily}
            caret={localCaret}
            caretVisible={isCaretVisible}
            caretCoreColor={caretColors.core}
            caretHaloColor={caretColors.halo}
          />
          <div
            className="pointer-events-auto absolute inset-0 cursor-text"
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              const clickCount = event.pointerType === "mouse" ? event.detail : 1
              if (clickCount >= 3) {
                selectRangeForMultiClick(event.clientX, event.clientY, "sentence")
                return
              }
              if (clickCount === 2) {
                selectRangeForMultiClick(event.clientX, event.clientY, "word")
                return
              }
              dragPointerIdRef.current = event.pointerId
              event.currentTarget.setPointerCapture(event.pointerId)
              updateSelectionFromPointer(event.clientX, event.clientY, false)
              const element = textareaRef.current
              dragAnchorRef.current = element ? readTextareaSelection(element, true).anchor : selection.anchor
            }}
            onPointerMove={(event) => {
              if (dragPointerIdRef.current !== event.pointerId) return
              updateSelectionFromPointer(event.clientX, event.clientY, true)
            }}
            onPointerUp={(event) => {
              if (dragPointerIdRef.current !== event.pointerId) return
              updateSelectionFromPointer(event.clientX, event.clientY, true)
              dragPointerIdRef.current = null
              dragAnchorRef.current = null
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
            }}
            onLostPointerCapture={() => {
              dragPointerIdRef.current = null
              dragAnchorRef.current = null
            }}
          />
          <textarea
            ref={textareaRef}
            value={editorState.draftText}
            spellCheck={false}
            wrap="off"
            onSelect={() => syncSelectionFromTextarea(true)}
            onFocus={handleTextareaFocus}
            onBlur={handleTextareaBlur}
            onKeyUp={() => syncSelectionFromTextarea(true)}
            onChange={(event) => {
              const value = normalizeInlineEditorText(event.target.value)
              const nextSelection = readTextareaSelection(event.target, true)
              setSelectionFocused(true)
              setEditorState((prev) => prev ? {
                ...prev,
                draftText: value,
                draftTrackingRuns: remapTrackingRunsForTextEdit(
                  prev.draftText,
                  value,
                  prev.draftTrackingRuns,
                  prev.draftTrackingScale,
                ),
                draftTextFormatRuns: rebaseTextFormatRunsForTextEdit(
                  prev.draftText,
                  value,
                  prev.draftTextFormatRuns,
                  {
                    fontFamily: prev.draftFont,
                    fontWeight: prev.draftFontWeight,
                    italic: prev.draftItalic,
                    styleKey: prev.draftStyle,
                    color: prev.draftColor,
                  },
                ),
                draftTextEdited: true,
                draftSelectionStart: nextSelection.start,
                draftSelectionEnd: nextSelection.end,
                draftSelectionAnchor: nextSelection.anchor,
                draftSelectionFocusIndex: nextSelection.focusIndex,
              } : prev)
              keyboardDesiredXRef.current = null
            }}
            onKeyDown={(event) => {
              const key = event.key.toLowerCase()
              const isAltGraph = typeof event.getModifierState === "function" && event.getModifierState("AltGraph")
              const isSelectAllShortcut = key === "a"
                && !event.shiftKey
                && !isAltGraph
                && (
                  event.metaKey
                  || event.ctrlKey
                  || (event.altKey && !event.metaKey && !event.ctrlKey)
                )
              if (isSelectAllShortcut) {
                event.preventDefault()
                setTextareaSelection(0, editorState.draftText.length, true)
                return
              }
              const isVisualNavigationKey = event.key === "Home"
                || event.key === "End"
                || event.key === "ArrowUp"
                || event.key === "ArrowDown"
              if (isVisualNavigationKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
                event.preventDefault()
                const result = resolveInlineEditorLineNavigation({
                  text: editorState.draftText,
                  textAlign: layout.textAlign,
                  commands: visualCommands,
                  renderedLines: layout.renderedLines,
                  segmentLines: layout.segmentLines,
                  selectionIndex: selection.focusIndex,
                  direction: event.key === "Home"
                    ? "home"
                    : event.key === "End"
                      ? "end"
                      : event.key === "ArrowUp"
                        ? "up"
                        : "down",
                  desiredX: keyboardDesiredXRef.current,
                  textAscent: editorTextAscent,
                  lineHeight: scaledLeading,
                  measureText,
                })
                keyboardDesiredXRef.current = result.desiredX
                if (event.shiftKey) {
                  setTextareaSelection(selection.anchor, result.index, true)
                } else {
                  setTextareaSelection(result.index, result.index, true)
                }
                return
              }
              if (event.key !== "Shift") {
                keyboardDesiredXRef.current = null
              }
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
              left: hiddenCaret ? hiddenCaret.x - textBox.left : 0,
              top: hiddenCaret ? hiddenCaret.top : 0,
              width: 1,
              height: hiddenCaret?.height ?? caretHeight,
              fontFamily: getFontFamilyCss(editorState.draftFont),
              fontStyle: editorState.draftItalic ? "italic" : "normal",
              fontWeight,
              fontKerning: editorState.draftOpticalKerning ? "none" : "normal",
              textAlign: editorState.draftAlign,
              color: "transparent",
              fontSize: `${scaledFontSize}px`,
              lineHeight: `${scaledLeading}px`,
              opacity: 0,
              pointerEvents: "none",
              resize: "none",
              overflow: "hidden",
              border: 0,
              padding: 0,
              margin: 0,
            }}
            className="absolute bg-transparent outline-none"
            aria-label={`Inline editor for ${editorState.target}`}
          />
        </div>
      </div>
    </div>
  )
}
