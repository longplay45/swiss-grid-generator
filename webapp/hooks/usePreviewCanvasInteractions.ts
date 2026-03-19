import { useCallback, useMemo } from "react"
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react"
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react"

import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import { isImagePlaceholderColor } from "@/lib/config/color-schemes"
import { type FontFamily } from "@/lib/config/fonts"
import type { BlockRect, NoticeRequest, PagePoint } from "@/lib/preview-types"
import {
  clampTextBlockPosition,
  duplicateTextLayerInCollections,
  type PreviewTextLayerCollectionsState,
} from "@/lib/preview-text-layer-state"
import type { ModulePosition } from "@/lib/types/preview-layout"
import { usePreviewDrag, type DragState as PreviewDragState } from "@/hooks/usePreviewDrag"

type OpenImageEditorOptions = {
  recordHistory?: boolean
}

type GridMetrics = {
  maxBaselineRow: number
}

type Args<Key extends string, StyleKey extends string> = {
  showTypography: boolean
  showImagePlaceholders: boolean
  editorOpen: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
  blockRectsRef: RefObject<Record<Key, BlockRect>>
  imageRectsRef: RefObject<Record<Key, BlockRect>>
  blockModulePositions: Partial<Record<Key, ModulePosition>>
  imageModulePositions: Partial<Record<Key, ModulePosition>>
  toPagePoint: (x: number, y: number) => PagePoint | null
  toPagePointFromClient: (clientX: number, clientY: number) => PagePoint | null
  snapToModule: (x: number, y: number, key: Key) => ModulePosition
  snapToBaseline: (x: number, y: number, key: Key) => ModulePosition
  getGridMetrics: () => GridMetrics
  findTopmostDraggableAtPoint: (x: number, y: number) => Key | null
  findTopmostBlockAtPoint: (x: number, y: number) => Key | null
  findTopmostImageAtPoint: (x: number, y: number) => Key | null
  resolveSelectedLayerAtClientPoint: (clientX: number, clientY: number) => Key | null
  resolveModulePositionAtPagePoint: (pageX: number, pageY: number) => ModulePosition | null
  clampImageModulePosition: (position: ModulePosition, columns: number, rows: number) => ModulePosition
  isImagePlaceholderKey: (key: Key) => boolean
  getImageSpan: (key: Key) => number
  getImageRows: (key: Key) => number
  getImageColorReference: (key: Key) => string
  getBlockRows: (key: Key) => number
  getBlockSpan: (key: Key) => number
  getStyleKeyForBlock: (key: Key) => StyleKey
  isTextReflowEnabled: (key: Key) => boolean
  isSyllableDivisionEnabled: (key: Key) => boolean
  blockOrder: Key[]
  textContent: Record<Key, string>
  blockCustomSizes: Partial<Record<Key, number>>
  blockCustomLeadings: Partial<Record<Key, number>>
  blockTextColors: Partial<Record<Key, string>>
  baseFont: FontFamily
  gridCols: number
  gridRows: number
  recordHistoryBeforeChange: () => void
  insertImagePlaceholder: (key: Key, options: {
    position: ModulePosition
    columns?: number
    rows?: number
    color?: string
    afterKey?: Key | null
  }) => void
  setImageModulePositions: Dispatch<SetStateAction<Partial<Record<Key, ModulePosition>>>>
  setBlockCollections: (
    updater: (
      prev: PreviewTextLayerCollectionsState<Key, StyleKey>,
    ) => PreviewTextLayerCollectionsState<Key, StyleKey>,
  ) => void
  setBlockCustomSizes: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  setBlockCustomLeadings: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  setBlockTextColors: Dispatch<SetStateAction<Partial<Record<Key, string>>>>
  setBlockModulePositions: Dispatch<SetStateAction<Partial<Record<Key, ModulePosition>>>>
  onSelectLayer?: (key: Key | null) => void
  onRequestNotice?: (notice: NoticeRequest) => void
  getNextCustomBlockId: () => Key
  getNextImagePlaceholderId: () => Key
  handleTextCanvasDoubleClick: (event: ReactMouseEvent<HTMLCanvasElement>) => void
  openImageEditor: (key: Key, options?: OpenImageEditorOptions) => void
  closeImageEditorPanel: () => void
  clearHover: () => void
  dragEndedAtRef: MutableRefObject<number>
  touchLongPressMs: number
  touchCancelDistancePx: number
}

export function usePreviewCanvasInteractions<Key extends string, StyleKey extends string>({
  showTypography,
  showImagePlaceholders,
  editorOpen,
  canvasRef,
  blockRectsRef,
  imageRectsRef,
  blockModulePositions,
  imageModulePositions,
  toPagePoint,
  toPagePointFromClient,
  snapToModule,
  snapToBaseline,
  getGridMetrics,
  findTopmostDraggableAtPoint,
  findTopmostBlockAtPoint,
  findTopmostImageAtPoint,
  resolveSelectedLayerAtClientPoint,
  resolveModulePositionAtPagePoint,
  clampImageModulePosition,
  isImagePlaceholderKey,
  getImageSpan,
  getImageRows,
  getImageColorReference,
  getBlockRows,
  getBlockSpan,
  getStyleKeyForBlock,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  blockOrder,
  textContent,
  blockCustomSizes,
  blockCustomLeadings,
  blockTextColors,
  baseFont,
  gridCols,
  gridRows,
  recordHistoryBeforeChange,
  insertImagePlaceholder,
  setImageModulePositions,
  setBlockCollections,
  setBlockCustomSizes,
  setBlockCustomLeadings,
  setBlockTextColors,
  setBlockModulePositions,
  onSelectLayer,
  onRequestNotice,
  getNextCustomBlockId,
  getNextImagePlaceholderId,
  handleTextCanvasDoubleClick,
  openImageEditor,
  closeImageEditorPanel,
  clearHover,
  dragEndedAtRef,
  touchLongPressMs,
  touchCancelDistancePx,
}: Args<Key, StyleKey>) {
  const draggableModulePositions = useMemo(
    () => ({
      ...blockModulePositions,
      ...imageModulePositions,
    }),
    [blockModulePositions, imageModulePositions],
  )

  const applyDragDrop = useCallback((drag: PreviewDragState<Key>, nextPreview: ModulePosition, copyOnDrop: boolean) => {
    if (isImagePlaceholderKey(drag.key)) {
      const sourceColumns = getImageSpan(drag.key)
      const sourceRows = getImageRows(drag.key)
      const sourceColor = getImageColorReference(drag.key)
      const metrics = getGridMetrics()
      const minCol = -Math.max(0, sourceColumns - 1)
      const minRow = -Math.max(0, metrics.maxBaselineRow)
      const resolvedPosition = {
        col: Math.max(minCol, Math.min(Math.max(0, gridCols - 1), nextPreview.col)),
        row: Math.max(minRow, Math.min(metrics.maxBaselineRow, nextPreview.row)),
      }

      if (copyOnDrop) {
        const newKey = getNextImagePlaceholderId()
        recordHistoryBeforeChange()
        insertImagePlaceholder(newKey, {
          position: resolvedPosition,
          columns: sourceColumns,
          rows: sourceRows,
          color: sourceColor,
          afterKey: drag.key,
        })
        onSelectLayer?.(newKey)
        return
      }

      recordHistoryBeforeChange()
      setImageModulePositions((current) => ({
        ...current,
        [drag.key]: resolvedPosition,
      }))
      return
    }

    if (copyOnDrop) {
      const sourceText = textContent[drag.key] ?? ""
      const maxParagraphCount = gridCols * gridRows
      const activeParagraphCount = blockOrder.filter((key) => (textContent[key] ?? "").trim().length > 0).length
      if (sourceText.trim().length > 0 && activeParagraphCount >= maxParagraphCount) {
        onRequestNotice?.({
          title: "Paragraph Limit Reached",
          message: `Maximum paragraphs reached (${maxParagraphCount}).`,
        })
        return
      }

      const styleKey = getStyleKeyForBlock(drag.key)
      const sourceRows = getBlockRows(drag.key)
      const sourceReflow = isTextReflowEnabled(drag.key)
      const sourceSyllableDivision = isSyllableDivisionEnabled(drag.key)
      const sourceSpan = getBlockSpan(drag.key)
      const sourceCustomSize = blockCustomSizes[drag.key]
      const sourceCustomLeading = blockCustomLeadings[drag.key]
      const sourceTextColor = blockTextColors[drag.key]
      const metrics = getGridMetrics()
      const resolvedPosition = clampTextBlockPosition({
        position: nextPreview,
        span: sourceSpan,
        gridCols,
        maxBaselineRow: metrics.maxBaselineRow,
      })
      const newKey = getNextCustomBlockId()

      recordHistoryBeforeChange()
      setBlockCollections((current) => duplicateTextLayerInCollections(current, {
        sourceKey: drag.key,
        newKey,
        styleKey,
        columns: sourceSpan,
        rows: sourceRows,
        reflow: sourceReflow,
        syllableDivision: sourceSyllableDivision,
        position: resolvedPosition,
        baseFont,
      }))
      setBlockCustomSizes((current) => {
        const next = { ...current }
        if (styleKey === "fx" && typeof sourceCustomSize === "number" && Number.isFinite(sourceCustomSize) && sourceCustomSize > 0) {
          next[newKey] = clampFxSize(sourceCustomSize)
        } else {
          delete next[newKey]
        }
        return next
      })
      setBlockCustomLeadings((current) => {
        const next = { ...current }
        if (styleKey === "fx" && typeof sourceCustomLeading === "number" && Number.isFinite(sourceCustomLeading) && sourceCustomLeading > 0) {
          next[newKey] = clampFxLeading(sourceCustomLeading)
        } else {
          delete next[newKey]
        }
        return next
      })
      setBlockTextColors((current) => {
        const next = { ...current }
        if (isImagePlaceholderColor(sourceTextColor)) next[newKey] = sourceTextColor
        else delete next[newKey]
        return next
      })
      onSelectLayer?.(newKey)
      return
    }

    recordHistoryBeforeChange()
    const span = getBlockSpan(drag.key)
    const metrics = getGridMetrics()
    setBlockModulePositions((current) => ({
      ...current,
      [drag.key]: clampTextBlockPosition({
        position: nextPreview,
        span,
        gridCols,
        maxBaselineRow: metrics.maxBaselineRow,
      }),
    }))
  }, [
    baseFont,
    blockCustomLeadings,
    blockCustomSizes,
    blockOrder,
    blockTextColors,
    getBlockRows,
    getBlockSpan,
    getGridMetrics,
    getImageColorReference,
    getImageRows,
    getImageSpan,
    getNextCustomBlockId,
    getNextImagePlaceholderId,
    getStyleKeyForBlock,
    gridCols,
    gridRows,
    insertImagePlaceholder,
    isImagePlaceholderKey,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    onRequestNotice,
    onSelectLayer,
    recordHistoryBeforeChange,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockCustomSizes,
    setBlockModulePositions,
    setBlockTextColors,
    setImageModulePositions,
    textContent,
  ])

  const {
    dragState,
    setDragState,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
  } = usePreviewDrag<Key>({
    showTypography,
    isEditorOpen: editorOpen,
    canvasRef,
    blockRectsRef,
    getBlockRect: (key) => blockRectsRef.current[key] ?? imageRectsRef.current[key] ?? null,
    blockModulePositions: draggableModulePositions,
    findTopmostBlockAtPoint: findTopmostDraggableAtPoint,
    toPagePoint,
    snapToModule,
    snapToBaseline,
    onDrop: applyDragDrop,
    onClearHover: clearHover,
    touchLongPressMs,
    touchCancelDistancePx,
    dragEndedAtRef,
  })

  const handlePreviewPointerDown = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    onSelectLayer?.(resolveSelectedLayerAtClientPoint(event.clientX, event.clientY))
    handleCanvasPointerDown(event)
  }, [handleCanvasPointerDown, onSelectLayer, resolveSelectedLayerAtClientPoint])

  const handleCanvasDoubleClick = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < 250) return
    const pagePoint = toPagePointFromClient(event.clientX, event.clientY)
    if (!pagePoint) return

    const textKey = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (textKey) {
      closeImageEditorPanel()
      handleTextCanvasDoubleClick(event)
      return
    }

    if (!showImagePlaceholders) {
      closeImageEditorPanel()
      handleTextCanvasDoubleClick(event)
      return
    }

    const imageKey = findTopmostImageAtPoint(pagePoint.x, pagePoint.y)
    if (imageKey) {
      openImageEditor(imageKey)
      return
    }

    if (!(event.shiftKey || event.ctrlKey)) {
      closeImageEditorPanel()
      handleTextCanvasDoubleClick(event)
      return
    }

    const rawPosition = resolveModulePositionAtPagePoint(pagePoint.x, pagePoint.y)
    if (!rawPosition) return
    const newKey = getNextImagePlaceholderId()
    const snapped = clampImageModulePosition(rawPosition, 1, 1)
    recordHistoryBeforeChange()
    insertImagePlaceholder(newKey, { position: snapped })
    openImageEditor(newKey, { recordHistory: false })
  }, [
    clampImageModulePosition,
    closeImageEditorPanel,
    dragEndedAtRef,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    getNextImagePlaceholderId,
    handleTextCanvasDoubleClick,
    insertImagePlaceholder,
    openImageEditor,
    recordHistoryBeforeChange,
    resolveModulePositionAtPagePoint,
    showImagePlaceholders,
    showTypography,
    toPagePointFromClient,
  ])

  return {
    dragState,
    setDragState,
    handlePreviewPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
    handleCanvasDoubleClick,
  }
}
