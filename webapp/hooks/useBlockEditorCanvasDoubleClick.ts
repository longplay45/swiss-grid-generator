import { useCallback } from "react"
import type { Dispatch, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from "react"

import type { BlockEditorState } from "@/components/editor/block-editor-types"
import { buildExistingBlockEditorState, buildNewBlockEditorState } from "@/lib/preview-block-editor-state"
import { PREVIEW_DRAG_CLICK_GUARD_MS } from "@/lib/preview-interaction-constants"
import { insertTextLayerIntoCollections, type PreviewTextLayerCollectionsState } from "@/lib/preview-text-layer-state"
import type { FontFamily } from "@/lib/config/fonts"
import type { NoticeRequest, PagePoint } from "@/lib/preview-types"
import {
  DEFAULT_OPTICAL_KERNING,
  DEFAULT_TRACKING_SCALE,
} from "@/lib/text-rendering"
import type { ModulePosition, TextAlignMode } from "@/lib/types/layout-primitives"

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
  getBlockFontWeight: (key: string) => number
  getBlockTrackingScale: (key: string) => number
  getBlockSpan: (key: string) => number
  getBlockRows: (key: string) => number
  isTextReflowEnabled: (key: string) => boolean
  isSyllableDivisionEnabled: (key: string) => boolean
  isBlockItalic: (key: string) => boolean
  isBlockOpticalKerningEnabled: (key: string) => boolean
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
  getBlockFontWeight,
  getBlockTrackingScale,
  getBlockSpan,
  getBlockRows,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  getBlockRotation,
  onRequestNotice,
}: Args) {
  return useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < PREVIEW_DRAG_CLICK_GUARD_MS) return

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
        getBlockFontWeight,
        getBlockTrackingScale,
        getStyleLeading,
        getStyleSize,
        isBlockItalic,
        isBlockOpticalKerningEnabled,
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
      fontWeight: 400,
      opticalKerning: DEFAULT_OPTICAL_KERNING,
      trackingScale: DEFAULT_TRACKING_SCALE,
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
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getBlockTextColor,
    getDefaultColumnSpan,
    getDummyTextForStyle,
    getNextCustomBlockId,
    getStyleLeading,
    getStyleSize,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
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
