import { useCallback } from "react"
import type { Dispatch, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from "react"

import type { BlockEditorState } from "@/components/editor/block-editor-types"
import { isImagePlaceholderColor } from "@/lib/config/color-schemes"
import type { FontFamily } from "@/lib/config/fonts"
import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import { buildExistingBlockEditorState, buildNewBlockEditorState } from "@/lib/preview-block-editor-state"
import { removeTextLayerFromCollections } from "@/lib/preview-layer-state"
import {
  applyBlockEditorDraftToCollections,
  insertTextLayerIntoCollections,
  type PreviewTextLayerCollectionsState,
} from "@/lib/preview-text-layer-state"
import type { NoticeRequest, PagePoint, TextAlignMode } from "@/lib/preview-types"
import type { Updater } from "@/hooks/useStateCommands"

type ModulePosition = {
  col: number
  row: number
}

type EditorState = BlockEditorState<string>

type AutoFitResult = { span: number; position: ModulePosition | null } | null

type Args = {
  showTypography: boolean
  dragEndedAtRef: RefObject<number>
  canvasRef: RefObject<HTMLCanvasElement | null>
  editorState: EditorState | null
  setEditorState: Dispatch<SetStateAction<EditorState | null>>
  baseFont: FontFamily
  resultGridCols: number
  resultGridRows: number
  resultTypographyStyles: Record<string, { weight?: string; blockItalic?: boolean }>
  blockOrder: string[]
  textContent: Record<string, string>
  blockTextEdited: Record<string, boolean>
  styleAssignments: Record<string, string>
  blockCustomSizes: Partial<Record<string, number>>
  blockCustomLeadings: Partial<Record<string, number>>
  blockTextAlignments: Partial<Record<string, TextAlignMode>>
  blockModulePositions: Partial<Record<string, ModulePosition>>
  recordHistoryBeforeChange: () => void
  setBlockCollections: (
    updater: (prev: PreviewTextLayerCollectionsState) => PreviewTextLayerCollectionsState,
  ) => void
  setBlockCustomSizes: (next: Updater<Partial<Record<string, number>>>) => void
  setBlockCustomLeadings: (next: Updater<Partial<Record<string, number>>>) => void
  setBlockTextColors: (next: Updater<Partial<Record<string, string>>>) => void
  getAutoFitForPlacement: (args: {
    key: string
    text: string
    styleKey: string
    rowSpan: number
    reflow: boolean
    syllableDivision: boolean
    baselineMultiplierOverride?: number
    position?: ModulePosition
  }) => AutoFitResult
  getGridMetrics: () => { maxBaselineRow: number }
  isBaseBlockId: (key: string) => boolean
  getNextCustomBlockId: () => string
  getDummyTextForStyle: (style: string) => string
  getStyleSize: (style: string) => number
  getStyleLeading: (style: string) => number
  getBlockTextColor: (key: string) => string
  defaultTextColor: string
  getDefaultColumnSpan: (key: string, gridCols: number) => number
  resultGridUnit: number
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

export function useBlockEditorActions({
  showTypography,
  dragEndedAtRef,
  canvasRef,
  editorState,
  setEditorState,
  baseFont,
  resultGridCols,
  resultGridRows,
  resultTypographyStyles,
  blockOrder,
  textContent,
  blockTextEdited,
  styleAssignments,
  blockCustomSizes,
  blockCustomLeadings,
  blockTextAlignments,
  blockModulePositions,
  recordHistoryBeforeChange,
  setBlockCollections,
  setBlockCustomSizes,
  setBlockCustomLeadings,
  setBlockTextColors,
  getAutoFitForPlacement,
  getGridMetrics,
  isBaseBlockId,
  getNextCustomBlockId,
  getDummyTextForStyle,
  getStyleSize,
  getStyleLeading,
  getBlockTextColor,
  defaultTextColor,
  getDefaultColumnSpan,
  resultGridUnit,
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
  const applyEditorDraftLive = useCallback((draft: EditorState) => {
    const effectiveReflow = draft.draftReflow && draft.draftColumns > 1
    const existingPosition = blockModulePositions[draft.target]
    const autoFit = getAutoFitForPlacement({
      key: draft.target,
      text: draft.draftText,
      styleKey: draft.draftStyle,
      rowSpan: draft.draftRows,
      reflow: effectiveReflow,
      syllableDivision: draft.draftSyllableDivision,
      baselineMultiplierOverride: draft.draftStyle === "fx"
        ? clampFxLeading(draft.draftFxLeading) / resultGridUnit
        : undefined,
      position: existingPosition,
    })
    const metrics = getGridMetrics()
    setBlockCollections((prev) => {
      return applyBlockEditorDraftToCollections(prev, {
        draft: {
          ...draft,
          draftReflow: effectiveReflow,
        },
        baseFont,
        gridCols: resultGridCols,
        maxBaselineRow: metrics.maxBaselineRow,
        desiredPosition: autoFit?.position ?? null,
        typographyStyles: resultTypographyStyles,
      })
    })
    setBlockCustomSizes((prev) => {
      const next = { ...prev }
      if (draft.draftStyle === "fx") {
        next[draft.target] = clampFxSize(draft.draftFxSize)
      } else {
        delete next[draft.target]
      }
      return next
    })
    setBlockCustomLeadings((prev) => {
      const next = { ...prev }
      if (draft.draftStyle === "fx") {
        next[draft.target] = clampFxLeading(draft.draftFxLeading)
      } else {
        delete next[draft.target]
      }
      return next
    })
    setBlockTextColors((prev) => {
      const next = { ...prev }
      if (draft.draftColor.toLowerCase() === defaultTextColor.toLowerCase()) {
        delete next[draft.target]
      } else if (isImagePlaceholderColor(draft.draftColor)) {
        next[draft.target] = draft.draftColor
      } else {
        delete next[draft.target]
      }
      return next
    })
  }, [
    baseFont,
    blockModulePositions,
    getAutoFitForPlacement,
    getGridMetrics,
    resultGridCols,
    resultGridUnit,
    resultTypographyStyles,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockTextColors,
    setBlockCustomSizes,
  ])

  const closeEditor = useCallback(() => {
    setEditorState(null)
  }, [setEditorState])

  const saveEditor = useCallback(() => {
    setEditorState(null)
  }, [setEditorState])

  const deleteEditorBlock = useCallback(() => {
    if (!editorState) return
    recordHistoryBeforeChange()

    const target = editorState.target
    setBlockCollections((prev) => {
      if (isBaseBlockId(target)) {
        return {
          ...prev,
          textContent: {
            ...prev.textContent,
            [target]: "",
          },
          blockModulePositions: (() => {
            const next = { ...prev.blockModulePositions }
            delete next[target]
            return next
          })(),
        }
      }
      return removeTextLayerFromCollections(prev, target)
    })
    if (!isBaseBlockId(target)) {
      setBlockCustomSizes((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setBlockCustomLeadings((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setBlockTextColors((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
    }
    setEditorState(null)
  }, [editorState, isBaseBlockId, recordHistoryBeforeChange, setBlockCollections, setBlockCustomLeadings, setBlockCustomSizes, setBlockTextColors, setEditorState])

  const handleCanvasDoubleClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
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
    setBlockCollections((prev) => insertTextLayerIntoCollections(prev, {
      newKey,
      text: getDummyTextForStyle("body"),
      styleKey: "body",
      columns: defaultSpan,
      rows: 1,
      position: snapped,
    }))
    setEditorState(buildNewBlockEditorState({
      key: newKey,
      style: "body",
      text: getDummyTextForStyle("body"),
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
    dragEndedAtRef,
    findTopmostBlockAtPoint,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getDefaultColumnSpan,
    getDummyTextForStyle,
    getBlockTextColor,
    getStyleLeading,
    getStyleSize,
    getNextCustomBlockId,
    isBlockBold,
    isBlockItalic,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    recordHistoryBeforeChange,
    resultGridCols,
    resultGridRows,
    defaultTextColor,
    setEditorState,
    showTypography,
    snapToModule,
    styleAssignments,
    textContent,
    toPagePoint,
    onRequestNotice,
  ])

  return {
    closeEditor,
    saveEditor,
    applyEditorDraftLive,
    deleteEditorBlock,
    handleCanvasDoubleClick,
  }
}
