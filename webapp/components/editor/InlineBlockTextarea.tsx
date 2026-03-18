"use client"

import type { BlockEditorState } from "@/components/editor/block-editor-types"
import { getFontFamilyCss } from "@/lib/config/fonts"
import {
  buildInlineEditorTransform,
  computeInlineEditorCaret,
  computeInlineEditorTextBox,
} from "@/lib/inline-editor"
import { normalizeInlineEditorText } from "@/lib/inline-text-normalization"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import type { RefObject, SetStateAction, Dispatch } from "react"

type InlineEditorLayout = {
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
  textAlign: "left" | "right"
  font: string
  commands: Array<{
    text: string
    x: number
    y: number
  }>
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
  const [selection, setSelection] = useState({ start: 0, end: 0, focused: false })
  const measureContextRef = useRef<CanvasRenderingContext2D | null>(null)

  const syncSelectionFromTextarea = useCallback((focused = selection.focused) => {
    const element = textareaRef.current
    if (!element) return
    setSelection({
      start: element.selectionStart ?? 0,
      end: element.selectionEnd ?? element.selectionStart ?? 0,
      focused,
    })
  }, [selection.focused, textareaRef])

  useEffect(() => {
    if (!editorState) {
      setSelection({ start: 0, end: 0, focused: false })
      return
    }
    const frame = window.requestAnimationFrame(() => {
      const element = textareaRef.current
      if (!element) return
      setSelection({
        start: element.selectionStart ?? editorState.draftText.length,
        end: element.selectionEnd ?? element.selectionStart ?? editorState.draftText.length,
        focused: document.activeElement === element,
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [editorState, textareaRef])

  const measureText = useCallback((text: string) => {
    if (!layout || typeof document === "undefined") return 0
    if (!measureContextRef.current) {
      measureContextRef.current = document.createElement("canvas").getContext("2d")
    }
    const ctx = measureContextRef.current
    if (!ctx) return 0
    ctx.font = layout.font
    return ctx.measureText(text).width
  }, [layout])

  if (!editorState || !layout) return null

  const fallbackStyleSize = getStyleSizeValue(editorState.draftStyle)
  const styleFontSize = isFxStyle(editorState.draftStyle) ? editorState.draftFxSize : fallbackStyleSize
  const fallbackStyleLeading = getStyleLeadingValue(editorState.draftStyle)
  const styleLeading = isFxStyle(editorState.draftStyle) ? editorState.draftFxLeading : fallbackStyleLeading
  const scaledFontSize = Math.max(1, styleFontSize * scale)
  const scaledLeading = Math.max(scaledFontSize, styleLeading * scale)
  const firstLineTop = layout.rotationOriginY + baselineStep
  const fxCaretOffsetY = isFxStyle(editorState.draftStyle)
    ? Math.max(0, (scaledLeading - layout.textAscent) / 2)
    : 0
  const textBoxTop = firstLineTop - fxCaretOffsetY
  const textBox = computeInlineEditorTextBox({
    rect: layout.rect,
    textAlign: layout.textAlign,
    commands: layout.commands,
    measureText,
  })
  const consumedTop = Math.max(0, firstLineTop - layout.rect.y)
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
      commands: layout.commands,
      selectionStart: selection.start,
      textAscent: layout.textAscent,
      textBoxTop,
      lineHeight: scaledLeading,
      measureText,
    })
    : null

  return (
    <div
      className="absolute inset-0 z-20"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeEditor()
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: transform.pageTransform,
          transformOrigin: transform.pageTransformOrigin,
        }}
      >
        <div
          className="absolute"
          style={{
            left: textBox.left,
            top: textBoxTop,
            width: textBox.width,
            minHeight,
            transform: transform.blockTransform,
            transformOrigin: transform.blockTransformOrigin,
          }}
        >
          {caret ? (
            <div
              className="pointer-events-none absolute"
              style={{
                left: caret.x - textBox.left,
                top: caret.top,
                width: 1,
                height: caret.height,
                backgroundColor: editorState.draftColor,
                opacity: 0.95,
              }}
            />
          ) : null}
          <textarea
            ref={textareaRef}
            value={editorState.draftText}
            spellCheck={false}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={() => syncSelectionFromTextarea(true)}
            onSelect={() => syncSelectionFromTextarea(true)}
            onFocus={() => syncSelectionFromTextarea(true)}
            onBlur={() => syncSelectionFromTextarea(false)}
            onKeyUp={() => syncSelectionFromTextarea(true)}
            onChange={(event) => {
              const value = normalizeInlineEditorText(event.target.value)
              setEditorState((prev) => prev ? {
                ...prev,
                draftText: value,
                draftTextEdited: true,
              } : prev)
              setSelection({
                start: event.target.selectionStart ?? value.length,
                end: event.target.selectionEnd ?? event.target.selectionStart ?? value.length,
                focused: true,
              })
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
              left: 0,
              top: 0,
              width: "100%",
              minHeight,
              fontFamily: getFontFamilyCss(editorState.draftFont),
              fontStyle: editorState.draftItalic ? "italic" : "normal",
              fontWeight: editorState.draftBold ? 700 : 400,
              textAlign: editorState.draftAlign,
              color: "transparent",
              fontSize: `${scaledFontSize}px`,
              lineHeight: `${scaledLeading}px`,
              fontKerning: "normal",
              textRendering: "geometricPrecision",
              hyphens: "none",
              overflowWrap: "normal",
              wordBreak: "normal",
              whiteSpace: "pre-wrap",
              caretColor: "transparent",
              WebkitTextFillColor: "transparent",
            }}
            className="scrollbar-none pointer-events-auto absolute resize-none overflow-x-hidden overflow-y-auto border-0 bg-transparent p-0 outline-none focus:outline-none"
            aria-label={`Inline editor for ${editorState.target}`}
          />
        </div>
      </div>
    </div>
  )
}
