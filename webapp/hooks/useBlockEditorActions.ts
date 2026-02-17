import { useCallback } from "react"
import type { Dispatch, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from "react"

import type { FontFamily } from "@/lib/config/fonts"
import type { Updater } from "@/hooks/useStateCommands"

type TextAlignMode = "left" | "right"

type ModulePosition = {
  col: number
  row: number
}

type EditorState = {
  target: string
  draftText: string
  draftStyle: string
  draftFont: FontFamily
  draftColumns: number
  draftRows: number
  draftAlign: TextAlignMode
  draftReflow: boolean
  draftSyllableDivision: boolean
  draftBold: boolean
  draftItalic: boolean
  draftRotation: number
  draftTextEdited: boolean
}

type BlockCollectionsState = {
  blockOrder: string[]
  textContent: Record<string, string>
  blockTextEdited: Record<string, boolean>
  styleAssignments: Record<string, string>
  blockModulePositions: Partial<Record<string, ModulePosition>>
  blockColumnSpans: Partial<Record<string, number>>
  blockRowSpans: Partial<Record<string, number>>
  blockTextAlignments: Partial<Record<string, TextAlignMode>>
  blockTextReflow: Partial<Record<string, boolean>>
  blockSyllableDivision: Partial<Record<string, boolean>>
  blockFontFamilies: Partial<Record<string, FontFamily>>
  blockBold: Partial<Record<string, boolean>>
  blockItalic: Partial<Record<string, boolean>>
  blockRotations: Partial<Record<string, number>>
}

type PagePoint = {
  x: number
  y: number
}

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
  blockTextAlignments: Partial<Record<string, TextAlignMode>>
  blockModulePositions: Partial<Record<string, ModulePosition>>
  recordHistoryBeforeChange: () => void
  setBlockCollections: (updater: (prev: BlockCollectionsState) => BlockCollectionsState) => void
  setBlockOrder: (next: Updater<string[]>) => void
  setTextContent: (next: Updater<Record<string, string>>) => void
  setBlockTextEdited: (next: Updater<Record<string, boolean>>) => void
  setStyleAssignments: (next: Updater<Record<string, string>>) => void
  setBlockColumnSpans: (next: Updater<Partial<Record<string, number>>>) => void
  setBlockTextAlignments: (next: Updater<Partial<Record<string, TextAlignMode>>>) => void
  setBlockModulePositions: (next: Updater<Partial<Record<string, ModulePosition>>>) => void
  getAutoFitForPlacement: (args: {
    key: string
    text: string
    styleKey: string
    rowSpan: number
    reflow: boolean
    syllableDivision: boolean
    position?: ModulePosition
  }) => AutoFitResult
  getGridMetrics: () => { maxBaselineRow: number }
  isBaseBlockId: (key: string) => boolean
  getNextCustomBlockId: () => string
  getDummyTextForStyle: (style: string) => string
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
  blockTextAlignments,
  blockModulePositions,
  recordHistoryBeforeChange,
  setBlockCollections,
  setBlockOrder,
  setTextContent,
  setBlockTextEdited,
  setStyleAssignments,
  setBlockColumnSpans,
  setBlockTextAlignments,
  setBlockModulePositions,
  getAutoFitForPlacement,
  getGridMetrics,
  isBaseBlockId,
  getNextCustomBlockId,
  getDummyTextForStyle,
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
}: Args) {
  const closeEditor = useCallback(() => {
    setEditorState(null)
  }, [setEditorState])

  const saveEditor = useCallback(() => {
    if (!editorState) return
    recordHistoryBeforeChange()
    const existingPosition = blockModulePositions[editorState.target]
    const autoFit = getAutoFitForPlacement({
      key: editorState.target,
      text: editorState.draftText,
      styleKey: editorState.draftStyle,
      rowSpan: editorState.draftRows,
      reflow: editorState.draftReflow,
      syllableDivision: editorState.draftSyllableDivision,
      position: existingPosition,
    })
    const nextSpan = autoFit?.span ?? editorState.draftColumns
    setBlockCollections((prev) => {
      const nextTextContent = {
        ...prev.textContent,
        [editorState.target]: editorState.draftText,
      }
      const nextTextEdited = {
        ...prev.blockTextEdited,
        [editorState.target]: editorState.draftTextEdited,
      }
      const nextStyles = {
        ...prev.styleAssignments,
        [editorState.target]: editorState.draftStyle,
      }
      const nextFonts = { ...prev.blockFontFamilies }
      if (editorState.draftFont === baseFont) {
        delete nextFonts[editorState.target]
      } else {
        nextFonts[editorState.target] = editorState.draftFont
      }
      const nextColumnSpans = {
        ...prev.blockColumnSpans,
        [editorState.target]: nextSpan,
      }
      const nextRowSpans = {
        ...prev.blockRowSpans,
        [editorState.target]: editorState.draftRows,
      }
      const nextAlignments = {
        ...prev.blockTextAlignments,
        [editorState.target]: editorState.draftAlign,
      }
      const nextReflow = {
        ...prev.blockTextReflow,
        [editorState.target]: editorState.draftReflow,
      }
      const nextSyllableDivision = {
        ...prev.blockSyllableDivision,
        [editorState.target]: editorState.draftSyllableDivision,
      }
      const nextBold = { ...prev.blockBold }
      const defaultBold = resultTypographyStyles[editorState.draftStyle]?.weight === "Bold"
      if (editorState.draftBold === defaultBold) {
        delete nextBold[editorState.target]
      } else {
        nextBold[editorState.target] = editorState.draftBold
      }
      const nextItalic = { ...prev.blockItalic }
      const defaultItalic = resultTypographyStyles[editorState.draftStyle]?.blockItalic === true
      if (editorState.draftItalic === defaultItalic) {
        delete nextItalic[editorState.target]
      } else {
        nextItalic[editorState.target] = editorState.draftItalic
      }
      const nextRotations = { ...prev.blockRotations }
      const clampedRotation = Math.max(-80, Math.min(80, editorState.draftRotation))
      if (Math.abs(clampedRotation) > 0.001) {
        nextRotations[editorState.target] = clampedRotation
      } else {
        delete nextRotations[editorState.target]
      }

      const nextPositions = { ...prev.blockModulePositions }
      const pos = nextPositions[editorState.target]
      const desired = autoFit?.position ?? pos
      if (desired) {
        const maxCol = Math.max(0, resultGridCols - nextSpan)
        const clamped = {
          col: Math.max(0, Math.min(maxCol, desired.col)),
          row: Math.max(0, Math.min(getGridMetrics().maxBaselineRow, desired.row)),
        }
        const original = pos ?? desired
        if (clamped.col !== original.col || clamped.row !== original.row) {
          nextPositions[editorState.target] = clamped
        }
      }

      return {
        ...prev,
        textContent: nextTextContent,
        blockTextEdited: nextTextEdited,
        styleAssignments: nextStyles,
        blockFontFamilies: nextFonts,
        blockColumnSpans: nextColumnSpans,
        blockRowSpans: nextRowSpans,
        blockTextAlignments: nextAlignments,
        blockTextReflow: nextReflow,
        blockSyllableDivision: nextSyllableDivision,
        blockBold: nextBold,
        blockItalic: nextItalic,
        blockRotations: nextRotations,
        blockModulePositions: nextPositions,
      }
    })
    setEditorState(null)
  }, [
    baseFont,
    blockModulePositions,
    editorState,
    getAutoFitForPlacement,
    getGridMetrics,
    recordHistoryBeforeChange,
    resultGridCols,
    resultTypographyStyles,
    setBlockCollections,
    setEditorState,
  ])

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
      const nextOrder = prev.blockOrder.filter((key) => key !== target)
      const omitTarget = <T extends object>(source: T) => {
        const next = { ...source } as Record<string, unknown>
        delete next[target]
        return next
      }
      return {
        ...prev,
        blockOrder: nextOrder,
        textContent: omitTarget(prev.textContent) as Record<string, string>,
        blockTextEdited: omitTarget(prev.blockTextEdited) as Record<string, boolean>,
        styleAssignments: omitTarget(prev.styleAssignments) as Record<string, string>,
        blockFontFamilies: omitTarget(prev.blockFontFamilies) as Partial<Record<string, FontFamily>>,
        blockColumnSpans: omitTarget(prev.blockColumnSpans) as Partial<Record<string, number>>,
        blockRowSpans: omitTarget(prev.blockRowSpans) as Partial<Record<string, number>>,
        blockTextAlignments: omitTarget(prev.blockTextAlignments) as Partial<Record<string, TextAlignMode>>,
        blockTextReflow: omitTarget(prev.blockTextReflow) as Partial<Record<string, boolean>>,
        blockSyllableDivision: omitTarget(prev.blockSyllableDivision) as Partial<Record<string, boolean>>,
        blockBold: omitTarget(prev.blockBold) as Partial<Record<string, boolean>>,
        blockItalic: omitTarget(prev.blockItalic) as Partial<Record<string, boolean>>,
        blockRotations: omitTarget(prev.blockRotations) as Partial<Record<string, number>>,
        blockModulePositions: omitTarget(prev.blockModulePositions) as Partial<Record<string, ModulePosition>>,
      }
    })
    setEditorState(null)
  }, [editorState, isBaseBlockId, recordHistoryBeforeChange, setBlockCollections, setEditorState])

  const handleCanvasDoubleClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < 250) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    const key = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (key) {
      setEditorState({
        target: key,
        draftText: textContent[key] ?? "",
        draftStyle: styleAssignments[key] ?? "body",
        draftFont: getBlockFont(key),
        draftColumns: getBlockSpan(key),
        draftRows: getBlockRows(key),
        draftAlign: blockTextAlignments[key] ?? "left",
        draftReflow: isTextReflowEnabled(key),
        draftSyllableDivision: isSyllableDivisionEnabled(key),
        draftBold: isBlockBold(key),
        draftItalic: isBlockItalic(key),
        draftRotation: getBlockRotation(key),
        draftTextEdited: blockTextEdited[key] ?? true,
      })
      return
    }

    const maxParagraphCount = resultGridCols * resultGridRows
    const activeParagraphCount = blockOrder.filter((blockKey) => (textContent[blockKey] ?? "").trim().length > 0).length
    if (activeParagraphCount >= maxParagraphCount) {
      window.alert(`Maximum paragraphs reached (${maxParagraphCount}).`)
      return
    }

    const newKey = getNextCustomBlockId()
    recordHistoryBeforeChange()
    const snapped = snapToModule(pagePoint.x, pagePoint.y, newKey)
    setBlockOrder((prev) => [...prev, newKey])
    setTextContent((prev) => ({
      ...prev,
      [newKey]: getDummyTextForStyle("body"),
    }))
    setBlockTextEdited((prev) => ({
      ...prev,
      [newKey]: false,
    }))
    setStyleAssignments((prev) => ({
      ...prev,
      [newKey]: "body",
    }))
    const defaultSpan = getDefaultColumnSpan(newKey, resultGridCols)
    setBlockColumnSpans((prev) => ({
      ...prev,
      [newKey]: defaultSpan,
    }))
    setBlockTextAlignments((prev) => ({
      ...prev,
      [newKey]: "left",
    }))
    setBlockModulePositions((prev) => ({
      ...prev,
      [newKey]: snapped,
    }))
    setEditorState({
      target: newKey,
      draftText: getDummyTextForStyle("body"),
      draftStyle: "body",
      draftFont: baseFont,
      draftColumns: defaultSpan,
      draftRows: 1,
      draftAlign: "left",
      draftReflow: false,
      draftSyllableDivision: false,
      draftBold: false,
      draftItalic: false,
      draftRotation: 0,
      draftTextEdited: false,
    })
  }, [
    baseFont,
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
    getNextCustomBlockId,
    isBlockBold,
    isBlockItalic,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    recordHistoryBeforeChange,
    resultGridCols,
    resultGridRows,
    setBlockColumnSpans,
    setBlockModulePositions,
    setBlockOrder,
    setBlockTextAlignments,
    setBlockTextEdited,
    setEditorState,
    setStyleAssignments,
    setTextContent,
    showTypography,
    snapToModule,
    styleAssignments,
    textContent,
    toPagePoint,
  ])

  return {
    closeEditor,
    saveEditor,
    deleteEditorBlock,
    handleCanvasDoubleClick,
  }
}
