import { useCallback } from "react"
import type { Dispatch, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from "react"

import { isImagePlaceholderColor } from "@/lib/config/color-schemes"
import type { FontFamily } from "@/lib/config/fonts"
import { clampFxLeading, clampFxSize, clampRotation, hasSignificantRotation } from "@/lib/block-constraints"
import { normalizeInlineEditorText } from "@/lib/inline-text-normalization"
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
  draftFxSize: number
  draftFxLeading: number
  draftFont: FontFamily
  draftColumns: number
  draftRows: number
  draftAlign: TextAlignMode
  draftColor: string
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
type NoticeRequest = {
  title: string
  message: string
}

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
  setBlockCollections: (updater: (prev: BlockCollectionsState) => BlockCollectionsState) => void
  setBlockOrder: (next: Updater<string[]>) => void
  setTextContent: (next: Updater<Record<string, string>>) => void
  setBlockTextEdited: (next: Updater<Record<string, boolean>>) => void
  setStyleAssignments: (next: Updater<Record<string, string>>) => void
  setBlockCustomSizes: (next: Updater<Partial<Record<string, number>>>) => void
  setBlockCustomLeadings: (next: Updater<Partial<Record<string, number>>>) => void
  setBlockTextColors: (next: Updater<Partial<Record<string, string>>>) => void
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
  setBlockOrder,
  setTextContent,
  setBlockTextEdited,
  setStyleAssignments,
  setBlockCustomSizes,
  setBlockCustomLeadings,
  setBlockTextColors,
  setBlockColumnSpans,
  setBlockTextAlignments,
  setBlockModulePositions,
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
    const nextSpan = draft.draftColumns
    setBlockCollections((prev) => {
      const nextTextContent = {
        ...prev.textContent,
        [draft.target]: draft.draftText,
      }
      const nextTextEdited = {
        ...prev.blockTextEdited,
        [draft.target]: draft.draftTextEdited,
      }
      const nextStyles = {
        ...prev.styleAssignments,
        [draft.target]: draft.draftStyle,
      }
      const nextFonts = { ...prev.blockFontFamilies }
      if (draft.draftFont === baseFont) {
        delete nextFonts[draft.target]
      } else {
        nextFonts[draft.target] = draft.draftFont
      }
      const nextColumnSpans = {
        ...prev.blockColumnSpans,
        [draft.target]: nextSpan,
      }
      const nextRowSpans = {
        ...prev.blockRowSpans,
        [draft.target]: draft.draftRows,
      }
      const nextAlignments = {
        ...prev.blockTextAlignments,
        [draft.target]: draft.draftAlign,
      }
      const nextReflow = {
        ...prev.blockTextReflow,
        [draft.target]: effectiveReflow,
      }
      const nextSyllableDivision = {
        ...prev.blockSyllableDivision,
        [draft.target]: draft.draftSyllableDivision,
      }
      const nextBold = { ...prev.blockBold }
      const defaultBold = resultTypographyStyles[draft.draftStyle]?.weight === "Bold"
      if (draft.draftBold === defaultBold) {
        delete nextBold[draft.target]
      } else {
        nextBold[draft.target] = draft.draftBold
      }
      const nextItalic = { ...prev.blockItalic }
      const defaultItalic = resultTypographyStyles[draft.draftStyle]?.blockItalic === true
      if (draft.draftItalic === defaultItalic) {
        delete nextItalic[draft.target]
      } else {
        nextItalic[draft.target] = draft.draftItalic
      }
      const nextRotations = { ...prev.blockRotations }
      const clampedRotation = clampRotation(draft.draftRotation)
      if (hasSignificantRotation(clampedRotation)) {
        nextRotations[draft.target] = clampedRotation
      } else {
        delete nextRotations[draft.target]
      }

      const nextPositions = { ...prev.blockModulePositions }
      const pos = nextPositions[draft.target]
      const desired = autoFit?.position ?? pos
      if (desired) {
        const metrics = getGridMetrics()
        const minCol = -Math.max(0, nextSpan - 1)
        const maxCol = Math.max(0, resultGridCols - nextSpan)
        const minRow = -Math.max(0, metrics.maxBaselineRow)
        const clamped = {
          col: Math.max(minCol, Math.min(maxCol, desired.col)),
          row: Math.max(minRow, Math.min(metrics.maxBaselineRow, desired.row)),
        }
        const original = pos ?? desired
        if (clamped.col !== original.col || clamped.row !== original.row) {
          nextPositions[draft.target] = clamped
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
    setBlockCollections((prev) => ({
      ...prev,
      blockTextReflow: {
        ...prev.blockTextReflow,
        [newKey]: false,
      },
      blockSyllableDivision: {
        ...prev.blockSyllableDivision,
        [newKey]: true,
      },
    }))
    setBlockModulePositions((prev) => ({
      ...prev,
      [newKey]: snapped,
    }))
    setEditorState({
      target: newKey,
      draftText: normalizeInlineEditorText(getDummyTextForStyle("body")),
      draftStyle: "body",
      draftFxSize: getStyleSize("fx"),
      draftFxLeading: getStyleLeading("fx"),
      draftFont: baseFont,
      draftColumns: defaultSpan,
      draftRows: 1,
      draftAlign: "left",
      draftColor: defaultTextColor,
      draftReflow: false,
      draftSyllableDivision: true,
      draftBold: false,
      draftItalic: false,
      draftRotation: 0,
      draftTextEdited: false,
    })
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
