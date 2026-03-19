"use client"

import type { MouseEventHandler, PointerEventHandler, RefObject } from "react"
import type { Dispatch, SetStateAction } from "react"

import { InlineBlockTextarea, type InlineEditorLayout } from "@/components/editor/InlineBlockTextarea"
import type { BlockEditorState } from "@/components/editor/block-editor-types"

type Props<StyleKey extends string> = {
  staticCanvasRef: RefObject<HTMLCanvasElement | null>
  imageCanvasRef: RefObject<HTMLCanvasElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>
  textareaRef: RefObject<HTMLTextAreaElement | null>
  pageWidthCss: number
  pageHeightCss: number
  pageWidthPx: number
  pageHeightPx: number
  canvasCursorClass: string
  handlePreviewPointerDown: PointerEventHandler<HTMLCanvasElement>
  handleCanvasPointerMove: PointerEventHandler<HTMLCanvasElement>
  handleCanvasPointerUp: PointerEventHandler<HTMLCanvasElement>
  handleCanvasPointerCancel: PointerEventHandler<HTMLCanvasElement>
  handleCanvasLostPointerCapture: PointerEventHandler<HTMLCanvasElement>
  handleCanvasMouseMove: MouseEventHandler<HTMLCanvasElement>
  handleCanvasDoubleClick: MouseEventHandler<HTMLCanvasElement>
  clearHover: () => void
  editorState: BlockEditorState<StyleKey> | null
  setEditorState: Dispatch<SetStateAction<BlockEditorState<StyleKey> | null>>
  inlineEditorLayout: InlineEditorLayout | null
  rotation: number
  scale: number
  baselineStep: number
  closeEditor: () => void
  saveEditor: () => void
  getStyleSizeValue: (styleKey: StyleKey) => number
  getStyleLeadingValue: (styleKey: StyleKey) => number
  isFxStyle: (styleKey: StyleKey) => boolean
}

export function GridPreviewCanvasStage<StyleKey extends string>({
  staticCanvasRef,
  imageCanvasRef,
  canvasRef,
  overlayCanvasRef,
  textareaRef,
  pageWidthCss,
  pageHeightCss,
  pageWidthPx,
  pageHeightPx,
  canvasCursorClass,
  handlePreviewPointerDown,
  handleCanvasPointerMove,
  handleCanvasPointerUp,
  handleCanvasPointerCancel,
  handleCanvasLostPointerCapture,
  handleCanvasMouseMove,
  handleCanvasDoubleClick,
  clearHover,
  editorState,
  setEditorState,
  inlineEditorLayout,
  rotation,
  scale,
  baselineStep,
  closeEditor,
  saveEditor,
  getStyleSizeValue,
  getStyleLeadingValue,
  isFxStyle,
}: Props<StyleKey>) {
  return (
    <div className="relative" style={{ width: pageWidthCss, height: pageHeightCss }}>
      <canvas
        ref={staticCanvasRef}
        width={pageWidthPx}
        height={pageHeightPx}
        style={{ width: pageWidthCss, height: pageHeightCss }}
        className="absolute inset-0 block shadow-lg"
      />
      <canvas
        ref={imageCanvasRef}
        width={pageWidthPx}
        height={pageHeightPx}
        style={{ width: pageWidthCss, height: pageHeightCss }}
        className="pointer-events-none absolute inset-0 block"
      />
      <canvas
        ref={canvasRef}
        width={pageWidthPx}
        height={pageHeightPx}
        style={{ width: pageWidthCss, height: pageHeightCss }}
        className={`absolute inset-0 block touch-none ${canvasCursorClass}`}
        onPointerDown={handlePreviewPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerCancel}
        onLostPointerCapture={handleCanvasLostPointerCapture}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={clearHover}
        onDoubleClick={handleCanvasDoubleClick}
      />
      <canvas
        ref={overlayCanvasRef}
        width={pageWidthPx}
        height={pageHeightPx}
        style={{ width: pageWidthCss, height: pageHeightCss }}
        className="pointer-events-none absolute inset-0 block"
      />
      <InlineBlockTextarea
        editorState={editorState}
        setEditorState={setEditorState}
        textareaRef={textareaRef}
        layout={inlineEditorLayout}
        pageWidth={pageWidthCss}
        pageHeight={pageHeightCss}
        pageRotation={rotation}
        scale={scale}
        baselineStep={baselineStep}
        closeEditor={closeEditor}
        saveEditor={saveEditor}
        getStyleSizeValue={getStyleSizeValue}
        getStyleLeadingValue={getStyleLeadingValue}
        isFxStyle={isFxStyle}
      />
    </div>
  )
}
