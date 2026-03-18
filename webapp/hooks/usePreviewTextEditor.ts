import { useCallback, useEffect, useRef, useState } from "react"
import type { Dispatch, MutableRefObject, SetStateAction } from "react"

import { type BlockEditorState } from "@/components/editor/block-editor-types"
import { type ImageEditorState } from "@/components/dialogs/ImageEditorDialog"
import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import { normalizeInlineEditorText } from "@/lib/inline-text-normalization"
import { useBlockEditorActions } from "@/hooks/useBlockEditorActions"
import { useCloseEditorsOnOutsidePointer } from "@/hooks/useCloseEditorsOnOutsidePointer"
import { usePreviewKeyboard } from "@/hooks/usePreviewKeyboard"

type BlockEditorActionsArgs = Omit<
  Parameters<typeof useBlockEditorActions>[0],
  "editorState" | "setEditorState"
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
  onSelectLayer?: (key: string | null) => void
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>
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
  onSelectLayer,
  textareaRef,
  onUndoRequest,
  onRedoRequest,
  undo,
  redo,
}: Args) {
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const lastLiveEditorSignatureRef = useRef("")

  const {
    blockCustomLeadings,
    blockCustomSizes,
    blockTextAlignments,
    blockTextEdited,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getBlockTextColor,
    getStyleLeading,
    getStyleSize,
    isBlockBold,
    isBlockItalic,
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
    setEditorState,
  })

  useEffect(() => {
    if (!editorState) {
      lastLiveEditorSignatureRef.current = ""
      return
    }
    const signature = [
      editorState.target,
      editorState.draftStyle,
      editorState.draftFont,
      editorState.draftColumns,
      editorState.draftRows,
      editorState.draftAlign,
      editorState.draftColor,
      editorState.draftReflow ? "1" : "0",
      editorState.draftSyllableDivision ? "1" : "0",
      editorState.draftBold ? "1" : "0",
      editorState.draftItalic ? "1" : "0",
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
    const styleKey = styleAssignments[key] ?? "body"
    setEditorState({
      target: key,
      draftText: normalizeInlineEditorText(textContent[key] ?? ""),
      draftStyle: styleKey,
      draftFxSize: styleKey === "fx"
        ? clampFxSize(blockCustomSizes[key] ?? getStyleSize("fx"))
        : getStyleSize("fx"),
      draftFxLeading: styleKey === "fx"
        ? clampFxLeading(blockCustomLeadings[key] ?? getStyleLeading("fx"))
        : getStyleLeading("fx"),
      draftFont: getBlockFont(key),
      draftColumns: getBlockSpan(key),
      draftRows: getBlockRows(key),
      draftAlign: blockTextAlignments[key] ?? "left",
      draftColor: getBlockTextColor(key),
      draftReflow: isTextReflowEnabled(key),
      draftSyllableDivision: isSyllableDivisionEnabled(key),
      draftBold: isBlockBold(key),
      draftItalic: isBlockItalic(key),
      draftRotation: getBlockRotation(key),
      draftTextEdited: blockTextEdited[key] ?? true,
    })
  }, [
    blockCustomLeadings,
    blockCustomSizes,
    blockTextAlignments,
    blockTextEdited,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getBlockTextColor,
    getStyleLeading,
    getStyleSize,
    isBlockBold,
    isBlockItalic,
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
      if (imageEditorState?.target === requestedLayerEditorTarget) {
        closeImageEditor()
      } else {
        openImageEditor(requestedLayerEditorTarget)
      }
      return
    }

    if (!blockOrder.includes(requestedLayerEditorTarget)) return
    if (editorState?.target === requestedLayerEditorTarget) {
      closeEditor()
    } else {
      openTextEditor(requestedLayerEditorTarget)
    }
  }, [
    blockOrder,
    closeEditor,
    closeImageEditor,
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
    if (!editorState) return
    textareaRef.current?.focus()
  }, [editorState, textareaRef])

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
    textareaRef,
    onCloseEditors: closeAnyEditor,
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
