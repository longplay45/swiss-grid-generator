"use client"

import type { BlockEditorState } from "@/components/editor/block-editor-types"
import { getFontFamilyCss } from "@/lib/config/fonts"
import { buildInlineEditorTransform } from "@/lib/inline-editor"
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
  isDarkMode: boolean
  closeEditor: () => void
  saveEditor: () => void
  getStyleSizeValue: (styleKey: StyleKey) => number
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
  isDarkMode,
  closeEditor,
  saveEditor,
  getStyleSizeValue,
  isFxStyle,
}: InlineBlockTextareaProps<StyleKey>) {
  if (!editorState || !layout) return null

  const transform = buildInlineEditorTransform({
    pageWidth,
    pageHeight,
    pageRotation,
    blockRotation: layout.blockRotation,
    rectX: layout.rect.x,
    rectY: layout.rect.y,
    rotationOriginX: layout.rotationOriginX,
    rotationOriginY: layout.rotationOriginY,
  })
  const fallbackStyleSize = getStyleSizeValue(editorState.draftStyle)
  const styleFontSize = isFxStyle(editorState.draftStyle) ? editorState.draftFxSize : fallbackStyleSize
  const styleLeading = isFxStyle(editorState.draftStyle) ? editorState.draftFxLeading : Math.max(styleFontSize * 1.2, styleFontSize + 2)
  const scaledFontSize = Math.max(1, styleFontSize * scale)
  const scaledLeading = Math.max(scaledFontSize, styleLeading * scale)
  const firstLineTop = layout.rotationOriginY + baselineStep
  const consumedTop = Math.max(0, firstLineTop - layout.rect.y)
  const minHeight = Math.max(Math.max(0, layout.rect.height - consumedTop), scaledLeading * 3)

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
        <textarea
          ref={textareaRef}
          value={editorState.draftText}
          spellCheck={false}
          onMouseDown={(event) => event.stopPropagation()}
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
            left: layout.rect.x,
            top: firstLineTop,
            width: layout.rect.width,
            minHeight,
            transform: transform.blockTransform,
            transformOrigin: transform.blockTransformOrigin,
            fontFamily: getFontFamilyCss(editorState.draftFont),
            fontStyle: editorState.draftItalic ? "italic" : "normal",
            fontWeight: editorState.draftBold ? 700 : 400,
            textAlign: editorState.draftAlign,
            color: "transparent",
            fontSize: `${scaledFontSize}px`,
            lineHeight: `${scaledLeading}px`,
            fontKerning: "normal",
            textRendering: "geometricPrecision",
            caretColor: editorState.draftColor,
            WebkitTextFillColor: "transparent",
          }}
          className={`pointer-events-auto absolute resize-none overflow-x-hidden overflow-y-auto border-0 bg-transparent p-0 outline-none focus:outline-none ${
            isDarkMode
              ? "text-gray-100"
              : "text-gray-900"
          }`}
          aria-label={`Inline editor for ${editorState.target}`}
        />
      </div>
    </div>
  )
}
