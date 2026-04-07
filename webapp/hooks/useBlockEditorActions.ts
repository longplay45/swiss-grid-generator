import { useCallback } from "react"
import type { Dispatch, RefObject, SetStateAction } from "react"

import type { BlockEditorState } from "@/components/editor/block-editor-types"
import type { FontFamily } from "@/lib/config/fonts"
import { clampFxLeading } from "@/lib/block-constraints"
import { removeTextLayerFromCollections } from "@/lib/preview-layer-state"
import {
  applyEditorDraftLeadingOverride,
  applyEditorDraftSizeOverride,
  applyEditorDraftTextColorOverride,
  removeEditorOverrideKey,
} from "@/lib/preview-block-editor-overrides"
import {
  applyBlockEditorDraftToCollections,
  type PreviewTextLayerCollectionsState,
} from "@/lib/preview-text-layer-state"
import type { NoticeRequest, PagePoint } from "@/lib/preview-types"
import type { TextFormatRun } from "@/lib/text-format-runs"
import type { ModulePosition, TextAlignMode } from "@/lib/types/layout-primitives"
import { useBlockEditorCanvasDoubleClick } from "@/hooks/useBlockEditorCanvasDoubleClick"
import type { Updater } from "@/hooks/useStateCommands"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"

type EditorState = BlockEditorState<string>

type AutoFitResult = { span: number; position: ModulePosition | null } | null

type Args = {
  showTypography: boolean
  dragEndedAtRef: RefObject<number>
  canvasRef: RefObject<HTMLCanvasElement | null>
  editorState: EditorState | null
  editorStateRef: RefObject<EditorState | null>
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
    fontFamily?: FontFamily
    fontWeight?: number
    italic?: boolean
    opticalKerning?: boolean
    trackingScale?: number
    trackingRuns?: readonly TextTrackingRun[]
    baselineMultiplierOverride?: number
    position?: ModulePosition
  }) => AutoFitResult
  getGridMetrics: () => { maxBaselineRow: number; rowStartBaselines: number[] }
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
  getBlockFontWeight: (key: string) => number
  getBlockTrackingScale: (key: string) => number
  getBlockTrackingRuns: (key: string) => TextTrackingRun[]
  getBlockTextFormatRuns: (key: string, color: string) => TextFormatRun<string, FontFamily>[]
  getBlockSpan: (key: string) => number
  getBlockRows: (key: string) => number
  isTextReflowEnabled: (key: string) => boolean
  isSyllableDivisionEnabled: (key: string) => boolean
  isBlockItalic: (key: string) => boolean
  isBlockOpticalKerningEnabled: (key: string) => boolean
  getBlockRotation: (key: string) => number
  promoteLayerToTop: (key: string) => void
  onRequestNotice?: (notice: NoticeRequest) => void
}

export function useBlockEditorActions({
  showTypography,
  dragEndedAtRef,
  canvasRef,
  editorState,
  editorStateRef,
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
  getBlockFontWeight,
  getBlockTrackingScale,
  getBlockTrackingRuns,
  getBlockTextFormatRuns,
  getBlockSpan,
  getBlockRows,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  getBlockRotation,
  promoteLayerToTop,
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
      fontFamily: draft.draftFont,
      fontWeight: draft.draftFontWeight,
      italic: draft.draftItalic,
      opticalKerning: draft.draftOpticalKerning,
      trackingScale: draft.draftTrackingScale,
      trackingRuns: draft.draftTrackingRuns,
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
        gridRows: resultGridRows,
        rowStartBaselines: metrics.rowStartBaselines,
        desiredPosition: autoFit?.position ?? null,
        typographyStyles: resultTypographyStyles,
      })
    })
    setBlockCustomSizes((prev) => {
      return applyEditorDraftSizeOverride(prev, draft, "fx")
    })
    setBlockCustomLeadings((prev) => {
      return applyEditorDraftLeadingOverride(prev, draft, "fx")
    })
    setBlockTextColors((prev) => {
      return applyEditorDraftTextColorOverride(prev, draft, defaultTextColor)
    })
  }, [
    baseFont,
    blockModulePositions,
    getAutoFitForPlacement,
    getGridMetrics,
    resultGridCols,
    resultGridRows,
    resultGridUnit,
    resultTypographyStyles,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockTextColors,
    setBlockCustomSizes,
  ])

  const commitLiveEditorDraft = useCallback(() => {
    const draft = editorStateRef.current
    if (!draft) return
    applyEditorDraftLive(draft)
  }, [applyEditorDraftLive, editorStateRef])

  const closeEditor = useCallback(() => {
    commitLiveEditorDraft()
    setEditorState(null)
  }, [commitLiveEditorDraft, setEditorState])

  const saveEditor = useCallback(() => {
    commitLiveEditorDraft()
    setEditorState(null)
  }, [commitLiveEditorDraft, setEditorState])

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
      setBlockCustomSizes((prev) => removeEditorOverrideKey(prev, target))
      setBlockCustomLeadings((prev) => removeEditorOverrideKey(prev, target))
      setBlockTextColors((prev) => removeEditorOverrideKey(prev, target))
    }
    setEditorState(null)
  }, [editorState, isBaseBlockId, recordHistoryBeforeChange, setBlockCollections, setBlockCustomLeadings, setBlockCustomSizes, setBlockTextColors, setEditorState])

  const handleCanvasDoubleClick = useBlockEditorCanvasDoubleClick({
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
    blockCustomLeadings,
    blockCustomSizes,
    blockTextAlignments,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getBlockTextColor,
    recordHistoryBeforeChange,
    setBlockCollections,
    getNextCustomBlockId,
    getDummyTextForStyle,
    getStyleLeading,
    getStyleSize,
    defaultTextColor,
    getDefaultColumnSpan,
    getGridMetrics,
    toPagePoint,
    findTopmostBlockAtPoint,
    snapToModule,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    promoteLayerToTop,
    onRequestNotice,
  })

  return {
    closeEditor,
    saveEditor,
    applyEditorDraftLive,
    deleteEditorBlock,
    handleCanvasDoubleClick,
  }
}
