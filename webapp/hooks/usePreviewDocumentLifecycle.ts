import { useEffect } from "react"
import type { Dispatch, MutableRefObject, SetStateAction } from "react"

import type { FontFamily } from "@/lib/config/fonts"
import { areLayerOrdersEqual, reconcileLayerOrder } from "@/lib/preview-layer-order"
import type { TextFormatRun } from "@/lib/text-format-runs"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"
import type { PreviewLayoutState, TextAlignMode, TextBlockPosition, TextVerticalAlignMode } from "@/lib/types/preview-layout"
import { useInitialLayoutHydration } from "@/hooks/useInitialLayoutHydration"

type BlockCollectionsState<StyleKey extends string, Key extends string> = {
  blockOrder: Key[]
  textContent: Record<Key, string>
  blockTextEdited: Record<Key, boolean>
  styleAssignments: Record<Key, StyleKey>
  blockFontFamilies: Partial<Record<Key, FontFamily>>
  blockFontWeights: Partial<Record<Key, number>>
  blockOpticalKerning: Partial<Record<Key, boolean>>
  blockTrackingScales: Partial<Record<Key, number>>
  blockTrackingRuns: Partial<Record<Key, TextTrackingRun[]>>
  blockTextFormatRuns: Partial<Record<Key, TextFormatRun<StyleKey, FontFamily>[]>>
  blockColumnSpans: Partial<Record<Key, number>>
  blockRowSpans: Partial<Record<Key, number>>
  blockHeightBaselines: Partial<Record<Key, number>>
  blockTextAlignments: Partial<Record<Key, TextAlignMode>>
  blockVerticalAlignments: Partial<Record<Key, TextVerticalAlignMode>>
  blockTextReflow: Partial<Record<Key, boolean>>
  blockSyllableDivision: Partial<Record<Key, boolean>>
  blockSnapToColumns: Partial<Record<Key, boolean>>
  blockSnapToBaseline: Partial<Record<Key, boolean>>
  blockItalic: Partial<Record<Key, boolean>>
  blockRotations: Partial<Record<Key, number>>
  blockModulePositions: Partial<Record<Key, TextBlockPosition>>
}

type Args<StyleKey extends string, Key extends string, DragState, TextEditorState, ImageEditorState> = {
  historyResetToken: number
  initialLayout: PreviewLayoutState<StyleKey, FontFamily, Key> | null
  initialLayoutToken: number
  requestedLayerOrder: Key[] | null
  requestedLayerOrderToken: number
  lastHistoryResetTokenRef: MutableRefObject<number>
  lastAppliedLayoutKeyRef: MutableRefObject<number>
  lastAppliedImageLayoutKeyRef: MutableRefObject<number>
  lastAppliedCustomSizeLayoutKeyRef: MutableRefObject<number>
  lastAppliedLayerLayoutKeyRef: MutableRefObject<number>
  lastAppliedLayerRequestKeyRef: MutableRefObject<number>
  lastAppliedLayerDeleteRequestKeyRef: MutableRefObject<number>
  suppressReflowCheckRef: MutableRefObject<boolean>
  resetHistory: () => void
  resetImageTransientState: () => void
  clearHover: () => void
  setDragState: Dispatch<SetStateAction<DragState | null>>
  setEditorState: Dispatch<SetStateAction<TextEditorState | null>>
  setImageEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  defaultTextColor: string
  recordHistoryBeforeChange: () => void
  pushHistory: (snapshot: PreviewLayoutState<StyleKey, FontFamily, Key>) => void
  buildSnapshot: () => PreviewLayoutState<StyleKey, FontFamily, Key>
  baseFont: FontFamily
  gridCols: number
  gridRows: number
  typographyStyles: Record<StyleKey, unknown>
  isBaseBlockId: (key: string) => boolean
  defaultTextContent: Record<string, string>
  defaultStyleAssignments: Record<string, StyleKey>
  isFontFamily: (value: unknown) => value is FontFamily
  getDefaultColumnSpan: (key: Key, gridCols: number) => number
  getGridMetrics: () => { rowStartBaselines: number[] }
  setBlockCollections: (updater: () => BlockCollectionsState<StyleKey, Key>) => void
  applyImageSnapshot: (snapshot: PreviewLayoutState<StyleKey, FontFamily, Key>) => void
  applyLayerOrderSnapshot: (snapshot: PreviewLayoutState<StyleKey, FontFamily, Key>) => void
  applyCustomSizeSnapshot: (snapshot: PreviewLayoutState<StyleKey, FontFamily, Key>) => void
  blockOrder: Key[]
  imageOrder: Key[]
  layerOrder: Key[]
  setLayerOrder: Dispatch<SetStateAction<Key[]>>
}

export function usePreviewDocumentLifecycle<
  StyleKey extends string,
  Key extends string,
  DragState,
  TextEditorState,
  ImageEditorState,
>({
  historyResetToken,
  initialLayout,
  initialLayoutToken,
  requestedLayerOrder,
  requestedLayerOrderToken,
  lastHistoryResetTokenRef,
  lastAppliedLayoutKeyRef,
  lastAppliedImageLayoutKeyRef,
  lastAppliedCustomSizeLayoutKeyRef,
  lastAppliedLayerLayoutKeyRef,
  lastAppliedLayerRequestKeyRef,
  lastAppliedLayerDeleteRequestKeyRef,
  suppressReflowCheckRef,
  resetHistory,
  resetImageTransientState,
  clearHover,
  setDragState,
  setEditorState,
  setImageEditorState,
  defaultTextColor,
  recordHistoryBeforeChange,
  pushHistory,
  buildSnapshot,
  baseFont,
  gridCols,
  gridRows,
  typographyStyles,
  isBaseBlockId,
  defaultTextContent,
  defaultStyleAssignments,
  isFontFamily,
  getDefaultColumnSpan,
  getGridMetrics,
  setBlockCollections,
  applyImageSnapshot,
  applyLayerOrderSnapshot,
  applyCustomSizeSnapshot,
  blockOrder,
  imageOrder,
  layerOrder,
  setLayerOrder,
}: Args<StyleKey, Key, DragState, TextEditorState, ImageEditorState>) {
  useEffect(() => {
    if (historyResetToken === lastHistoryResetTokenRef.current) return
    lastHistoryResetTokenRef.current = historyResetToken
    resetHistory()
    lastAppliedLayoutKeyRef.current = 0
    lastAppliedImageLayoutKeyRef.current = 0
    lastAppliedCustomSizeLayoutKeyRef.current = 0
    lastAppliedLayerLayoutKeyRef.current = 0
    lastAppliedLayerRequestKeyRef.current = 0
    lastAppliedLayerDeleteRequestKeyRef.current = 0
    suppressReflowCheckRef.current = true
    resetImageTransientState()
    setDragState(null)
    clearHover()
    setEditorState(null)
  }, [
    clearHover,
    historyResetToken,
    lastAppliedCustomSizeLayoutKeyRef,
    lastAppliedImageLayoutKeyRef,
    lastAppliedLayerDeleteRequestKeyRef,
    lastAppliedLayerLayoutKeyRef,
    lastAppliedLayerRequestKeyRef,
    lastAppliedLayoutKeyRef,
    lastHistoryResetTokenRef,
    resetHistory,
    resetImageTransientState,
    setDragState,
    setEditorState,
    suppressReflowCheckRef,
  ])

  useInitialLayoutHydration<StyleKey, Key>({
    initialLayout,
    initialLayoutToken,
    lastAppliedLayoutTokenRef: lastAppliedLayoutKeyRef,
    pushHistory,
    buildSnapshot,
    baseFont,
    defaultTextColor,
    gridCols,
    gridRows,
    typographyStyles,
    isBaseBlockId,
    defaultTextContent,
    defaultStyleAssignments,
    isFontFamily,
    getDefaultColumnSpan,
    getGridMetrics,
    setBlockCollections,
    onBeforeApply: () => {
      suppressReflowCheckRef.current = true
    },
    onAfterApply: () => {
      setDragState(null)
      clearHover()
      setEditorState(null)
      setImageEditorState(null)
    },
  })

  useEffect(() => {
    if (!initialLayout || initialLayoutToken === 0) return
    if (lastAppliedImageLayoutKeyRef.current === initialLayoutToken) return
    lastAppliedImageLayoutKeyRef.current = initialLayoutToken
    applyImageSnapshot(initialLayout)
  }, [applyImageSnapshot, initialLayout, initialLayoutToken, lastAppliedImageLayoutKeyRef])

  useEffect(() => {
    if (!initialLayout || initialLayoutToken === 0) return
    if (lastAppliedLayerLayoutKeyRef.current === initialLayoutToken) return
    lastAppliedLayerLayoutKeyRef.current = initialLayoutToken
    applyLayerOrderSnapshot(initialLayout)
  }, [applyLayerOrderSnapshot, initialLayout, initialLayoutToken, lastAppliedLayerLayoutKeyRef])

  useEffect(() => {
    if (!initialLayout || initialLayoutToken === 0) return
    if (lastAppliedCustomSizeLayoutKeyRef.current === initialLayoutToken) return
    lastAppliedCustomSizeLayoutKeyRef.current = initialLayoutToken
    applyCustomSizeSnapshot(initialLayout)
  }, [applyCustomSizeSnapshot, initialLayout, initialLayoutToken, lastAppliedCustomSizeLayoutKeyRef])

  useEffect(() => {
    if (!requestedLayerOrder || requestedLayerOrderToken === 0) return
    if (lastAppliedLayerRequestKeyRef.current === requestedLayerOrderToken) return
    lastAppliedLayerRequestKeyRef.current = requestedLayerOrderToken
    const nextLayerOrder = reconcileLayerOrder(requestedLayerOrder, blockOrder, imageOrder)
    if (areLayerOrdersEqual(layerOrder, nextLayerOrder)) return
    recordHistoryBeforeChange()
    setLayerOrder(nextLayerOrder)
  }, [
    blockOrder,
    imageOrder,
    lastAppliedLayerRequestKeyRef,
    layerOrder,
    recordHistoryBeforeChange,
    requestedLayerOrder,
    requestedLayerOrderToken,
    setLayerOrder,
  ])
}
