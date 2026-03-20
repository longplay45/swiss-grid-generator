import { useCallback } from "react"
import type { Dispatch, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from "react"

import type { BlockEditorState } from "@/components/editor/block-editor-types"
import { buildExistingBlockEditorState, buildNewBlockEditorState } from "@/lib/preview-block-editor-state"
import { insertTextLayerIntoCollections, type PreviewTextLayerCollectionsState } from "@/lib/preview-text-layer-state"
import type { FontFamily } from "@/lib/config/fonts"
import type { NoticeRequest, PagePoint, TextAlignMode } from "@/lib/preview-types"

type ModulePosition = {
  col: number
  row: number
}

type Args = {
  showTypography: boolean
  dragEndedAtRef: RefObject<number>
  canvasRef: RefObject<HTMLCanvasElement | null>
  setEditorState: Dispatch<SetStateAction<BlockEditorState<string> | null>>
  baseFont: FontFamily
  resultGridCols: number
  resultGridRows: number
  blockOrder: string[]
  textContent: Record<string, string>
  blockTextEdited: Record<string, boolean>
  styleAssignments: Record<string, string>
  blockCustomSizes: Partial<Record<string, number>>
  blockCustomLeadings: Partial<Record<string, number>>
  blockTextAlignments: Partial<Record<string, TextAlignMode>>
  recordHistoryBeforeChange: () => void
  setBlockCollections: (
    updater: (prev: PreviewTextLayerCollectionsState) => PreviewTextLayerCollectionsState,
  ) => void
  getNextCustomBlockId: () => string
  getDummyTextForStyle: (style: string) => string
  getStyleSize: (style: string) => number
  getStyleLeading: (style: string) => number
  getBlockTextColor: (key: string) => string
  defaultTextColor: string
  getDefaultColumnSpan: (key: string, gridCols: number) => number
  toPagePoint: (canvasX: number, canvasY: number) => PagePoint | null
  findTopmostBlockAtPoint: (pageX: number, pageY: number) => string | null
  snapToModule: (pageX: number, pageY: number, key: string) => ModulePosition
  getBlockFont: (key: string) => FontFamily
  getBlockSpan: (key: string) => number
  getBlockRows: (key: string) => number
  isTextReflowEnabled: (key: string) => boolean
  isSyllableDivisionEnabled: (key: string) => boolean
  isBlockBold: (key: string) => boolean
  isBlockItalic: (key: string) => boolean
  getBlockRotation: (key: string) => number
  onRequestNotice?: (notice: NoticeRequest) => void
}

export function useBlockEditorCanvasDoubleClick({
  showTypography,
  dragEndedAtRef,
  canvasRef,
  setEditorState,
  baseFont,
  resultGridCols,
  resultGridRows,
  blockOrder,
  textContent,
  blockTextEdited,
  styleAssignments,
  blockCustomSizes,
  blockCustomLeadings,
  blockTextAlignments,
  recordHistoryBeforeChange,
  setBlockCollections,
  getNextCustomBlockId,
  getDummyTextForStyle,
  getStyleSize,
  getStyleLeading,
  getBlockTextColor,
  defaultTextColor,
  getDefaultColumnSpan,
  toPagePoint,
  findTopmostBlockAtPoint,
  snapToModule,
  getBlockFont,
  getBlockSpan,
  getBlockRows,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isBlockBold,
  isBlockItalic,
  getBlockRotation,
  onRequestNotice,
}: Args) {
  return useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < 250) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    const key = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (key) {
      recordHistoryBeforeChange()
      setEditorState(buildExistingBlockEditorState({
        key,
        styleAssignments,
        textContent,
        blockCustomSizes,
        blockCustomLeadings,
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
        fallbackStyle: "body",
        fxStyle: "fx",
      }))
      return
    }

    const maxParagraphCount = resultGridCols * resultGridRows
    const activeParagraphCount = blockOrder.filter((blockKey) => (textContent[blockKey] ?? "").trim().length > 0).length
    if (activeParagraphCount >= maxParagraphCount) {
      onRequestNotice?.({
        title: "Paragraph Limit Reached",
        message: `Maximum paragraphs reached (${maxParagraphCount}).`,
      })
      return
    }

    const newKey = getNextCustomBlockId()
    recordHistoryBeforeChange()
    const snapped = snapToModule(pagePoint.x, pagePoint.y, newKey)
    const defaultSpan = getDefaultColumnSpan(newKey, resultGridCols)
    const defaultText = getDummyTextForStyle("body")
    setBlockCollections((prev) => insertTextLayerIntoCollections(prev, {
      newKey,
      text: defaultText,
      styleKey: "body",
      columns: defaultSpan,
      rows: 1,
      position: snapped,
    }))
    setEditorState(buildNewBlockEditorState({
      key: newKey,
      style: "body",
      text: defaultText,
      columns: defaultSpan,
      rows: 1,
      baseFont,
      defaultTextColor,
      getStyleLeading,
      getStyleSize,
      fxStyle: "fx",
    }))
  }, [
    baseFont,
    blockCustomLeadings,
    blockCustomSizes,
    blockOrder,
    blockTextAlignments,
    blockTextEdited,
    canvasRef,
    defaultTextColor,
    dragEndedAtRef,
    findTopmostBlockAtPoint,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getBlockTextColor,
    getDefaultColumnSpan,
    getDummyTextForStyle,
    getNextCustomBlockId,
    getStyleLeading,
    getStyleSize,
    isBlockBold,
    isBlockItalic,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    onRequestNotice,
    recordHistoryBeforeChange,
    resultGridCols,
    resultGridRows,
    setBlockCollections,
    setEditorState,
    showTypography,
    snapToModule,
    styleAssignments,
    textContent,
    toPagePoint,
  ])
}
