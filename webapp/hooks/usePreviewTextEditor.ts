import { useCallback, useEffect, useRef, useState } from "react"
import type { Dispatch, MutableRefObject, SetStateAction } from "react"

import { type BlockEditorState } from "@/components/editor/block-editor-types"
import { type ImageEditorState } from "@/components/dialogs/ImageEditorDialog"
import { buildExistingBlockEditorState } from "@/lib/preview-block-editor-state"
import { useBlockEditorActions } from "@/hooks/useBlockEditorActions"
import { useCloseEditorsOnOutsidePointer } from "@/hooks/useCloseEditorsOnOutsidePointer"
import { usePreviewKeyboard } from "@/hooks/usePreviewKeyboard"

type BlockEditorActionsArgs = Omit<
  Parameters<typeof useBlockEditorActions>[0],
  "editorState" | "editorStateRef" | "setEditorState"
>

type EditorState = BlockEditorState<string>
type OpenEditorOptions = { recordHistory?: boolean }

type Args = {
  blockEditorArgs: BlockEditorActionsArgs
  blockOrder: string[]
  imageOrder: readonly string[]
  imageEditorState: ImageEditorState | null
  setImageEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  openImageEditorState: (key: string) => void
  closeImageEditorState: () => void
  requestedLayerEditorTarget: string | null
  requestedLayerEditorToken: number
  lastAppliedLayerEditorRequestKeyRef: MutableRefObject<number>
  editorSidebarHost: HTMLDivElement | null
  onSelectLayer?: (key: string | null) => void
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
  shouldKeepEditorsOpenForPointerDown?: (event: PointerEvent) => boolean
  onUndoRequest?: () => void
  onRedoRequest?: () => void
  undo: () => void
  redo: () => void
}

export function usePreviewTextEditor({
  blockEditorArgs,
  blockOrder,
  imageOrder,
  imageEditorState,
  setImageEditorState,
  openImageEditorState,
  closeImageEditorState,
  requestedLayerEditorTarget,
  requestedLayerEditorToken,
  lastAppliedLayerEditorRequestKeyRef,
  editorSidebarHost,
  onSelectLayer,
  textareaRef,
  shouldKeepEditorsOpenForPointerDown,
  onUndoRequest,
  onRedoRequest,
  undo,
  redo,
}: Args) {
  const [editorState, setEditorStateState] = useState<EditorState | null>(null)
  const editorStateRef = useRef<EditorState | null>(null)
  const lastLiveEditorSignatureRef = useRef("")

  const setEditorState = useCallback((next: SetStateAction<EditorState | null>) => {
    const resolved = typeof next === "function"
      ? (next as (prev: EditorState | null) => EditorState | null)(editorStateRef.current)
      : next
    editorStateRef.current = resolved
    setEditorStateState(resolved)
  }, [])

  const {
    blockCustomLeadings,
    blockCustomSizes,
    blockTextAlignments,
    blockVerticalAlignments,
    blockTextEdited,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getBlockTextColor,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    getStyleLeading,
    getStyleSize,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    recordHistoryBeforeChange,
    styleAssignments,
    textContent,
  } = blockEditorArgs

  const {
    closeEditor,
    saveEditor,
    applyEditorDraftLive,
    deleteEditorBlock,
    handleCanvasDoubleClick: handleTextCanvasDoubleClick,
  } = useBlockEditorActions({
    ...blockEditorArgs,
    editorState,
    editorStateRef,
    setEditorState,
  })

  useEffect(() => {
    editorStateRef.current = editorState
  }, [editorState])

  useEffect(() => {
    if (!editorState) {
      lastLiveEditorSignatureRef.current = ""
      return
    }
    const signature = [
      editorState.target,
      editorState.draftStyle,
      editorState.draftFont,
      editorState.draftFontWeight,
      editorState.draftColumns,
      editorState.draftRows,
      editorState.draftHeightBaselines,
      editorState.draftAlign,
      editorState.draftVerticalAlign,
      editorState.draftColor,
      editorState.draftReflow ? "1" : "0",
      editorState.draftSyllableDivision ? "1" : "0",
      editorState.draftItalic ? "1" : "0",
      editorState.draftOpticalKerning ? "1" : "0",
      editorState.draftTrackingScale,
      editorState.draftTrackingRuns.map((run) => `${run.start}:${run.end}:${run.trackingScale}`).join(","),
      editorState.draftTextFormatRuns.map((run) => `${run.start}:${run.end}:${run.fontFamily ?? ""}:${run.fontWeight ?? ""}:${run.italic === true ? 1 : run.italic === false ? 0 : ""}:${run.styleKey ?? ""}:${run.color ?? ""}`).join(","),
      editorState.draftRotation.toFixed(3),
      editorState.draftFxSize,
      editorState.draftFxLeading,
      editorState.draftTextEdited ? "1" : "0",
      editorState.draftText,
    ].join("|")
    if (lastLiveEditorSignatureRef.current === signature) return
    lastLiveEditorSignatureRef.current = signature
    applyEditorDraftLive(editorState)
  }, [applyEditorDraftLive, editorState])

  const openImageEditor = useCallback((key: string, options?: OpenEditorOptions) => {
    setEditorState(null)
    if (options?.recordHistory !== false) {
      recordHistoryBeforeChange()
    }
    openImageEditorState(key)
  }, [openImageEditorState, recordHistoryBeforeChange])

  const closeImageEditor = useCallback(() => {
    closeImageEditorState()
  }, [closeImageEditorState])

  const openTextEditor = useCallback((key: string, options?: OpenEditorOptions) => {
    setImageEditorState(null)
    if (options?.recordHistory !== false) {
      recordHistoryBeforeChange()
    }
    setEditorState(buildExistingBlockEditorState({
      key,
      styleAssignments,
      textContent,
      blockCustomSizes,
      blockCustomLeadings,
      blockTextAlignments,
      blockVerticalAlignments,
      blockTextEdited,
      getBlockFont,
      getBlockRotation,
      getBlockRows,
      getBlockHeightBaselines,
      getBlockSpan,
      getBlockTextColor,
      getBlockFontWeight,
      getBlockTrackingScale,
      getBlockTrackingRuns,
      getBlockTextFormatRuns,
      getStyleLeading,
      getStyleSize,
      isBlockItalic,
      isBlockOpticalKerningEnabled,
      isSyllableDivisionEnabled,
      isTextReflowEnabled,
      fallbackStyle: "body",
      fxStyle: "fx",
    }))
  }, [
    blockCustomLeadings,
    blockCustomSizes,
    blockTextAlignments,
    blockVerticalAlignments,
    blockTextEdited,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getBlockTextColor,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    getStyleLeading,
    getStyleSize,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    recordHistoryBeforeChange,
    setImageEditorState,
    styleAssignments,
    textContent,
  ])

  useEffect(() => {
    if (!requestedLayerEditorTarget || requestedLayerEditorToken === 0) return
    if (lastAppliedLayerEditorRequestKeyRef.current === requestedLayerEditorToken) return
    lastAppliedLayerEditorRequestKeyRef.current = requestedLayerEditorToken

    if (imageOrder.includes(requestedLayerEditorTarget)) {
      if (imageEditorState?.target === requestedLayerEditorTarget && !editorState) return
      openImageEditor(requestedLayerEditorTarget)
      return
    }

    if (!blockOrder.includes(requestedLayerEditorTarget)) return
    if (editorState?.target === requestedLayerEditorTarget && !imageEditorState) return
    openTextEditor(requestedLayerEditorTarget)
  }, [
    blockOrder,
    editorState,
    imageEditorState,
    editorState?.target,
    imageEditorState?.target,
    imageOrder,
    lastAppliedLayerEditorRequestKeyRef,
    openImageEditor,
    openTextEditor,
    requestedLayerEditorToken,
    requestedLayerEditorTarget,
  ])

  useEffect(() => {
    if (imageEditorState?.target) {
      onSelectLayer?.(imageEditorState.target)
      return
    }
    if (editorState?.target) {
      onSelectLayer?.(editorState.target)
    }
  }, [editorState?.target, imageEditorState?.target, onSelectLayer])

  const focusEditor = useCallback(() => {
    if (!editorStateRef.current) return
    const element = textareaRef.current
    if (!element || document.activeElement === element) return
    element.focus({ preventScroll: true })
  }, [textareaRef])

  const closeAnyEditor = useCallback(() => {
    closeEditor()
    closeImageEditor()
  }, [closeEditor, closeImageEditor])

  usePreviewKeyboard({
    editorTarget: editorState?.target ?? imageEditorState?.target ?? null,
    isEditorOpen: Boolean(editorState || imageEditorState),
    focusEditor,
    onCloseEditor: closeAnyEditor,
    undo: onUndoRequest ?? undo,
    redo: onRedoRequest ?? redo,
  })

  useCloseEditorsOnOutsidePointer({
    isEditorOpen: Boolean(editorState || imageEditorState),
    editorSidebarHost,
    textareaRef,
    onCloseEditors: closeAnyEditor,
    shouldKeepEditorsOpenForPointerDown,
  })

  return {
    editorState,
    setEditorState,
    closeEditor,
    closeImageEditor,
    openImageEditor,
    saveEditor,
    deleteEditorBlock,
    handleTextCanvasDoubleClick,
    openTextEditor,
  }
}
