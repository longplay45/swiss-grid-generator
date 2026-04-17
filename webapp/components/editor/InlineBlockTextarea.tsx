"use client"

import type { BlockEditorState } from "@/components/editor/block-editor-types"
import { getFontFamilyCss } from "@/lib/config/fonts"
import type { RenderedTextLine } from "@/lib/preview-types"
import {
  buildInlineEditorTransform,
  computeInlineEditorCaret,
  computeInlineEditorSelectionRects,
  computeInlineEditorTextBox,
  hitTestInlineEditorIndex,
  resolveInlineEditorLineNavigation,
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
  type PositionedTextFormatTrackingSegment,
} from "@/lib/text-format-runs"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import type { RefObject, SetStateAction, Dispatch } from "react"

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

function areSelectionStatesEqual(
  current: InlineEditorSelectionState,
  next: InlineEditorSelectionState,
): boolean {
  return current.start === next.start
    && current.end === next.end
    && current.anchor === next.anchor
    && current.focusIndex === next.focusIndex
    && current.focused === next.focused
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
  closeEditor: () => void
  saveEditor: () => void
  getStyleSizeValue: (styleKey: StyleKey) => number
  getStyleLeadingValue: (styleKey: StyleKey) => number
  isFxStyle: (styleKey: StyleKey) => boolean
}

function InlineEditorOverlayCanvas({
  width,
  height,
  selectionRects,
  caret,
  caretVisible,
}: {
  width: number
  height: number
  selectionRects: InlineEditorOverlayRect[]
  caret: InlineEditorOverlayCaret | null
  caretVisible: boolean
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

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)"
    ctx.fillRect(caretHaloLeft, caretTop, haloWidth, caretHeightPx)
    ctx.fillStyle = "#f97316"
    ctx.fillRect(caretCoreLeft, caretTop, coreWidth, caretHeightPx)
  }, [caret, caretVisible, height, selectionRects, width])

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
  closeEditor,
  saveEditor,
  getStyleSizeValue,
  getStyleLeadingValue,
  isFxStyle,
}: InlineBlockTextareaProps<StyleKey>) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [selection, setSelection] = useState<InlineEditorSelectionState>({
    start: 0,
    end: 0,
    anchor: 0,
    focusIndex: 0,
    focused: false,
  })
  const dragAnchorRef = useRef<number | null>(null)
  const dragPointerIdRef = useRef<number | null>(null)
  const keyboardDesiredXRef = useRef<number | null>(null)
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

  const commitSelectionState = useCallback((next: InlineEditorSelectionState) => {
    setSelection((current) => (areSelectionStatesEqual(current, next) ? current : next))
  }, [])

  const syncEditorSelection = useCallback((next: InlineEditorSelectionState) => {
    setEditorState((prev) => {
      if (!prev) return prev
      if (
        prev.draftSelectionStart === next.start
        && prev.draftSelectionEnd === next.end
      ) {
        return prev
      }
      return {
        ...prev,
        draftSelectionStart: next.start,
        draftSelectionEnd: next.end,
      }
    })
  }, [setEditorState])

  const syncSelectionFromTextarea = useCallback((focused = selection.focused) => {
    const element = textareaRef.current
    if (!element) return
    const nextSelection = readTextareaSelection(element, focused)
    commitSelectionState(nextSelection)
    syncEditorSelection(nextSelection)
  }, [commitSelectionState, readTextareaSelection, selection.focused, syncEditorSelection, textareaRef])

  useEffect(() => {
    if (!editorState) {
      keyboardDesiredXRef.current = null
      commitSelectionState({
        start: 0,
        end: 0,
        anchor: 0,
        focusIndex: 0,
        focused: false,
      })
      return
    }
    const frame = window.requestAnimationFrame(() => {
      const element = textareaRef.current
      if (!element) return
      commitSelectionState(readTextareaSelection(element, document.activeElement === element))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [commitSelectionState, editorState, readTextareaSelection, textareaRef])

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
    if (focused) {
      element.focus({ preventScroll: true })
    }
    element.setSelectionRange(start, end, direction)
    const nextSelection = buildSelectionState(start, end, focused, direction)
    commitSelectionState(nextSelection)
    syncEditorSelection(nextSelection)
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
            caret={localCaret}
            caretVisible={isCaretVisible}
          />
          <div
            className="pointer-events-auto absolute inset-0 cursor-text"
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
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
            onFocus={() => syncSelectionFromTextarea(true)}
            onBlur={() => syncSelectionFromTextarea(false)}
            onKeyUp={() => syncSelectionFromTextarea(true)}
            onChange={(event) => {
              const value = normalizeInlineEditorText(event.target.value)
              const nextSelection = readTextareaSelection(event.target, true)
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
              } : prev)
              keyboardDesiredXRef.current = null
              commitSelectionState(nextSelection)
            }}
            onKeyDown={(event) => {
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
