"use client"

import { GridPreviewCanvasStage } from "@/components/preview/GridPreviewCanvasStage"
import { GridPreviewFeedback } from "@/components/preview/GridPreviewFeedback"
import { GridPreviewOverlays } from "@/components/preview/GridPreviewOverlays"
import type { BlockEditorStyleOption } from "@/components/editor/block-editor-types"
import { GridResult } from "@/lib/grid-calculator"
import type { HelpSectionId } from "@/lib/help-registry"
import { usePreviewAutoFitPlacement } from "@/hooks/usePreviewAutoFitPlacement"
import { usePreviewCanvasInteractions } from "@/hooks/usePreviewCanvasInteractions"
import { usePreviewDocumentLifecycle } from "@/hooks/usePreviewDocumentLifecycle"
import { usePreviewGuideCanvases } from "@/hooks/usePreviewGuideCanvases"
import { useGridPreviewDocumentState } from "@/hooks/useGridPreviewDocumentState"
import { usePreviewGeometry } from "@/hooks/usePreviewGeometry"
import { usePreviewHoverState, type PreviewHoverState } from "@/hooks/usePreviewHoverState"
import { usePreviewHistory } from "@/hooks/usePreviewHistory"
import { usePreviewHitTesting } from "@/hooks/usePreviewHitTesting"
import { usePreviewInlineEditorLayout } from "@/hooks/usePreviewInlineEditorLayout"
import { usePreviewLayoutReflowController } from "@/hooks/usePreviewLayoutReflowController"
import { usePreviewOverlayControls } from "@/hooks/usePreviewOverlayControls"
import { usePreviewOverlayCanvas } from "@/hooks/usePreviewOverlayCanvas"
import { usePreviewTypographyMetrics } from "@/hooks/usePreviewTypographyMetrics"
import { usePreviewViewport } from "@/hooks/usePreviewViewport"
import { usePreviewLayerDelete } from "@/hooks/usePreviewLayerDelete"
import { usePreviewLayoutEmission } from "@/hooks/usePreviewLayoutEmission"
import { usePreviewPerf } from "@/hooks/usePreviewPerf"
import { useTypographyRenderer } from "@/hooks/useTypographyRenderer"
import {
  PREVIEW_LAYOUT_CHANGE_DEBOUNCE_MS,
  PREVIEW_TOUCH_CANCEL_DISTANCE_PX,
  PREVIEW_TOUCH_LONG_PRESS_MS,
} from "@/lib/preview-interaction-constants"
import { buildSmartTextZoomGeometrySignature } from "@/lib/preview-smart-text-zoom"
import { getHoveredPreviewTextGuideRect, getPreviewTextGuideRect } from "@/lib/preview-guide-rect"
import { removeTextLayerFromCollections } from "@/lib/preview-layer-state"
import { omitOptionalRecordKey } from "@/lib/record-helpers"
import {
  type BlockRect,
  type BlockRenderPlan,
  type NoticeRequest,
  type OverflowLinesByBlock,
} from "@/lib/preview-types"
import { PREVIEW_STYLE_OPTIONS, formatPtSize, getDummyTextForStyle } from "@/lib/preview-text-config"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { getDefaultColumnSpan } from "@/lib/text-layout"
import {
  BASE_BLOCK_IDS,
  DEFAULT_STYLE_ASSIGNMENTS,
  DEFAULT_TEXT_CONTENT,
  isBaseBlockId,
} from "@/lib/document-defaults"
import {
  DEFAULT_BASE_FONT,
  getStyleDefaultFontWeight,
  isFontFamily,
  type FontFamily,
} from "@/lib/config/fonts"
import {
  DEFAULT_IMAGE_COLOR_SCHEME_ID,
  IMAGE_COLOR_SCHEMES,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { usePreviewTextEditor } from "@/hooks/usePreviewTextEditor"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

type BlockId = string
type TypographyStyleKey = keyof GridResult["typography"]["styles"]

function unionRects(rects: BlockRect[]): BlockRect | null {
  if (rects.length === 0) return null
  const left = Math.min(...rects.map((rect) => rect.x))
  const top = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  }
}

function isPointWithinRect(pageX: number, pageY: number, rect: BlockRect | null | undefined): boolean {
  if (!rect || rect.width <= 0 || rect.height <= 0) return false
  return (
    pageX >= rect.x
    && pageX <= rect.x + rect.width
    && pageY >= rect.y
    && pageY <= rect.y + rect.height
  )
}

let runtimeIdCounter = 0
function createRuntimeId(prefix: "paragraph" | "image"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  runtimeIdCounter += 1
  return `${prefix}-${Date.now()}-${runtimeIdCounter}`
}
const getNextCustomBlockId = () => createRuntimeId("paragraph")
const getNextImagePlaceholderId = () => createRuntimeId("image")

function toPageSpaceRect(rect: BlockRect, scale: number): BlockRect {
  const safeScale = Math.max(scale, 0.0001)
  return {
    x: rect.x / safeScale,
    y: rect.y / safeScale,
    width: rect.width / safeScale,
    height: rect.height / safeScale,
  }
}

interface GridPreviewProps {
  result: GridResult
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders?: boolean
  showTypography: boolean
  showRolloverInfo?: boolean
  smartTextEditZoomEnabled?: boolean
  initialLayout?: PreviewLayoutState | null
  initialLayoutToken?: number
  rotation?: number
  canvasBackground?: string | null
  undoNonce?: number
  redoNonce?: number
  historyResetToken?: number
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  onLayoutChange?: (layout: PreviewLayoutState) => void
  onSnapshotGetterChange?: (getSnapshot: (() => PreviewLayoutState) | null) => void
  onRequestGridRestore?: (cols: number, rows: number) => void
  gridReductionWarningToast?: { id: number; message: string } | null
  onDismissGridReductionWarningToast?: () => void
  onRequestGridReductionWarning?: (message: string) => void
  onHistoryAvailabilityChange?: (canUndo: boolean, canRedo: boolean) => void
  onHistoryRecord?: () => void
  onUndoRequest?: () => void
  onRedoRequest?: () => void
  requestedLayerOrder?: BlockId[] | null
  requestedLayerOrderToken?: number
  requestedLayerDeleteTarget?: BlockId | null
  requestedLayerDeleteToken?: number
  requestedLayerEditorTarget?: BlockId | null
  requestedLayerEditorToken?: number
  selectedLayerKey?: BlockId | null
  hoveredLayerKey?: BlockId | null
  onHoverLayerChange?: (key: BlockId | null) => void
  onSelectLayer?: (key: BlockId | null) => void
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  onRequestNotice?: (notice: NoticeRequest) => void
  showEditorHelpIcon?: boolean
  showPreviewHelpIndicator?: boolean
  baseFont?: FontFamily
  imageColorScheme?: ImageColorSchemeId
  onImageColorSchemeChange?: (value: ImageColorSchemeId) => void
  onShowImagePlaceholdersChange?: (value: boolean) => void
  editorSidebarHost?: HTMLDivElement | null
  onEditorModeChange?: (mode: "text" | "image" | null) => void
  onPreviewEditorOpen?: () => void
  isDarkMode?: boolean
}

type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

export const GridPreview = memo(function GridPreview({
  result,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders = true,
  showTypography,
  showRolloverInfo = true,
  smartTextEditZoomEnabled = false,
  initialLayout = null,
  initialLayoutToken = 0,
  rotation = 0,
  canvasBackground = null,
  undoNonce = 0,
  redoNonce = 0,
  historyResetToken = 0,
  onCanvasReady,
  onLayoutChange,
  onSnapshotGetterChange,
  onRequestGridRestore,
  gridReductionWarningToast = null,
  onDismissGridReductionWarningToast,
  onRequestGridReductionWarning,
  onHistoryAvailabilityChange,
  onHistoryRecord,
  onUndoRequest,
  onRedoRequest,
  requestedLayerOrder = null,
  requestedLayerOrderToken = 0,
  requestedLayerDeleteTarget = null,
  requestedLayerDeleteToken = 0,
  requestedLayerEditorTarget = null,
  requestedLayerEditorToken = 0,
  selectedLayerKey = null,
  hoveredLayerKey = null,
  onHoverLayerChange,
  onSelectLayer,
  onOpenHelpSection,
  onRequestNotice,
  showEditorHelpIcon = false,
  showPreviewHelpIndicator = false,
  baseFont = DEFAULT_BASE_FONT,
  imageColorScheme = DEFAULT_IMAGE_COLOR_SCHEME_ID,
  onImageColorSchemeChange,
  onShowImagePlaceholdersChange,
  editorSidebarHost = null,
  onEditorModeChange,
  onPreviewEditorOpen,
  isDarkMode = false,
}: GridPreviewProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const previewScaleRef = useRef(1)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRectsRef = useRef<Record<BlockId, BlockRect>>({})
  const imageRectsRef = useRef<Record<BlockId, BlockRect>>({})
  const lastAppliedLayoutKeyRef = useRef(0)
  const lastAppliedImageLayoutKeyRef = useRef(0)
  const lastAppliedCustomSizeLayoutKeyRef = useRef(0)
  const lastAppliedLayerLayoutKeyRef = useRef(0)
  const lastAppliedLayerRequestKeyRef = useRef(0)
  const lastAppliedLayerDeleteRequestKeyRef = useRef(0)
  const lastAppliedLayerEditorRequestKeyRef = useRef(0)
  const suppressReflowCheckRef = useRef(false)
  const dragEndedAtRef = useRef(0)
  const layoutEmissionFrameRef = useRef<number | null>(null)
  const typographyBufferRef = useRef<HTMLCanvasElement | null>(null)
  const previousPlansRef = useRef<Map<BlockId, BlockRenderPlan<BlockId>>>(new Map())
  const typographyBufferTransformRef = useRef("")
  const lastHistoryResetTokenRef = useRef(historyResetToken)
  const smartTextZoomGeometrySignatureRef = useRef<string | null>(null)
  const lastAppliedSmartTextZoomGeometrySignatureRef = useRef<string | null>(null)
  const PERF_ENABLED = process.env.NODE_ENV !== "production"

  const [overflowLinesByBlock, setOverflowLinesByBlock] = useState<OverflowLinesByBlock<BlockId>>({})
  const [hoverState, setHoverState] = useState<PreviewHoverState<BlockId> | null>(null)
  const [hoverImageKey, setHoverImageKey] = useState<BlockId | null>(null)
  const [hoverCopyIntent, setHoverCopyIntent] = useState(false)
  const [layoutEmissionEnabled, setLayoutEmissionEnabled] = useState(initialLayoutToken === 0)
  const [pendingLayerEditorMode, setPendingLayerEditorMode] = useState<"text" | "image" | null>(null)
  const [activeTextZoomTarget, setActiveTextZoomTarget] = useState<BlockId | null>(null)
  const [smartTextZoomTargetVersion, setSmartTextZoomTargetVersion] = useState(0)
  const HISTORY_LIMIT = 50
  const PERF_SAMPLE_LIMIT = 160
  const PERF_LOG_INTERVAL_MS = 10000

  const getSmartTextZoomTargetRect = useCallback(() => {
    if (!activeTextZoomTarget) return null
    const plan = previousPlansRef.current.get(activeTextZoomTarget)
    const currentScale = Math.max(previewScaleRef.current, 0.0001)
    const guideBoundsScaled = plan?.guideRects.length
      ? unionRects(plan.guideRects)
      : blockRectsRef.current[activeTextZoomTarget] ?? plan?.rect ?? null
    if (!guideBoundsScaled) return null

    const zoomBounds = toPageSpaceRect(guideBoundsScaled, currentScale)
    const renderedBoundsScaled = plan?.renderedLines.length
      ? unionRects(plan.renderedLines.map((line) => ({
          x: line.left,
          y: line.top,
          width: line.width,
          height: line.height,
        })))
      : null

    if (renderedBoundsScaled) {
      const guideRight = guideBoundsScaled.x + guideBoundsScaled.width
      const renderedRight = renderedBoundsScaled.x + renderedBoundsScaled.width
      const overflowLeft = guideBoundsScaled.x - renderedBoundsScaled.x
      const overflowRight = renderedRight - guideRight
      const overflowThreshold = Math.max(4, guideBoundsScaled.width * 0.01)
      const extraModuleWidth = result.module.width

      if (overflowLeft > overflowThreshold) {
        zoomBounds.x -= extraModuleWidth
        zoomBounds.width += extraModuleWidth
      }
      if (overflowRight > overflowThreshold) {
        zoomBounds.width += extraModuleWidth
      }
    }

    return zoomBounds
  }, [activeTextZoomTarget, result.module.width])

  const {
    scale,
    pixelRatio,
    isMobile,
    stageLeftCss,
    stageTopCss,
    pageWidthCss,
    pageHeightCss,
    pageWidthPx,
    pageHeightPx,
  } = usePreviewViewport({
    previewContainerRef,
    pageWidthPt: result.pageSizePt.width,
    pageHeightPt: result.pageSizePt.height,
    smartTextZoomEnabled: smartTextEditZoomEnabled && activeTextZoomTarget !== null,
    smartTextZoomTargetKey: activeTextZoomTarget,
    smartTextZoomTargetVersion,
    getSmartTextZoomTargetRect,
  })

  useEffect(() => {
    previewScaleRef.current = scale
  }, [scale])

  const { recordPerfMetric } = usePreviewPerf({
    enabled: PERF_ENABLED,
    logIntervalMs: PERF_LOG_INTERVAL_MS,
    sampleLimit: PERF_SAMPLE_LIMIT,
  })

  const handleOverflowLinesChange = useCallback((next: OverflowLinesByBlock<BlockId>) => {
    setOverflowLinesByBlock((prev) => {
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (prevKeys.length !== nextKeys.length) return next
      for (const key of nextKeys) {
        if ((prev[key] ?? 0) !== (next[key] ?? 0)) return next
      }
      return prev
    })
  }, [])

  const {
    getGridMetrics,
    toPagePoint,
    toPagePointFromClient,
    clampImageModulePosition,
    resolveModulePositionAtPagePoint,
  } = usePreviewGeometry({
    canvasRef,
    result,
    scale,
    pixelRatio,
    rotation,
  })

  const {
    blockOrder,
    textContent,
    blockTextEdited,
    styleAssignments,
    blockGridPositions,
    blockModulePositions,
    blockColumnSpans,
    blockTextAlignments,
    blockVerticalAlignments,
    setBlockCollections,
    setBlockColumnSpans,
    setBlockModulePositions,
    layerOrder,
    setLayerOrder,
    resolvedLayerOrder,
    blockCustomSizes,
    setBlockCustomSizes,
    blockCustomLeadings,
    setBlockCustomLeadings,
    blockTextColors,
    setBlockTextColors,
    imagePalette,
    defaultTextColor,
    imageOrder,
    setImageOrder,
    imageGridPositions,
    imageModulePositions,
    setImageModulePositions,
    setImageColumnSpans,
    setImageRowSpans,
    setImageHeightBaselines,
    setImageSnapToColumns,
    setImageSnapToBaseline,
    setImageRotations,
    setImageColors,
    setImageOpacities,
    imageEditorState,
    setImageEditorState,
    getImageSpan,
    getImageRows,
    getImageHeightBaselines,
    isImageSnapToColumnsEnabled,
    isImageSnapToBaselineEnabled,
    getImageRotation,
    getImageColorReference,
    getImageColor,
    getImageOpacity,
    isImagePlaceholderKey,
    applyImageSnapshot,
    openImageEditorState,
    closeImageEditorState,
    insertImagePlaceholder,
    resetImageTransientState,
    getBlockSpan,
    getBlockRows,
    getBlockHeightBaselines,
    getPlacementSpan,
    getPlacementRows,
    getPlacementHeightBaselines,
    getStyleKeyForBlock,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    getBlockFont,
    getStyleSize,
    getStyleLeading,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    getBlockRotation,
    buildSnapshot,
    applyLayerOrderSnapshot,
    applyCustomSizeSnapshot,
    applySnapshot,
  } = useGridPreviewDocumentState({
    result,
    baseFont,
    imageColorScheme,
    getGridMetrics,
    onImageColorSchemeChange,
  })

  const {
    snapToModule,
    snapToBaseline,
    resolveLayerPlacement,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    findTopmostDraggableAtPoint,
    resolveSelectedLayerAtClientPoint,
  } = usePreviewHitTesting({
    blockRectsRef,
    imageRectsRef,
    previousPlansRef,
    resolvedLayerOrder,
    imageOrder,
    showImagePlaceholders,
    getGridMetrics,
    getPlacementSpan,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
    isImageSnapToBaselineEnabled,
    toPagePointFromClient,
  })

  const {
    fontRenderEpoch,
    getWrappedText,
    getOpticalOffset,
  } = usePreviewTypographyMetrics<BlockId, TypographyStyleKey>({
    showTypography,
    blockOrder,
    typographyStyles: result.typography.styles,
    getStyleKeyForBlock,
    getBlockFont,
    getBlockFontWeight,
    isBlockItalic,
    getBlockFontSize,
    scale,
  })

  const {
    pushHistory,
    recordHistoryBeforeChange,
    resetHistory,
    undo,
    redo,
  } = usePreviewHistory<PreviewLayoutState>({
    historyLimit: HISTORY_LIMIT,
    undoNonce,
    redoNonce,
    buildSnapshot,
    applySnapshot,
    onHistoryAvailabilityChange,
    onRecordHistory: onHistoryRecord,
  })

  const getAutoFitForPlacement = usePreviewAutoFitPlacement<BlockId, TypographyStyleKey>({
    canvasRef,
    result,
    scale,
    getGridMetrics,
    getWrappedText,
    getBlockFontSize,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
  })

  const promoteLayerToTop = useCallback((key: BlockId) => {
    setLayerOrder((current) => [...current.filter((item) => item !== key), key])
  }, [setLayerOrder])

  const {
    editorState,
    setEditorState,
    closeEditor,
    openTextEditor,
    openImageEditor,
    saveEditor,
    deleteEditorBlock,
    handleTextCanvasDoubleClick,
  } = usePreviewTextEditor({
    blockEditorArgs: {
      showTypography,
      dragEndedAtRef,
      canvasRef,
      baseFont,
      resultGridCols: result.settings.gridCols,
      resultGridRows: result.settings.gridRows,
      resultTypographyStyles: result.typography.styles,
      blockOrder,
      textContent,
      blockTextEdited,
      styleAssignments,
      blockCustomSizes,
      blockCustomLeadings,
      blockTextAlignments,
      blockVerticalAlignments,
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
      resultGridUnit: result.grid.gridUnit,
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
      getBlockHeightBaselines,
      isTextReflowEnabled,
      isSyllableDivisionEnabled,
      isSnapToColumnsEnabled,
      isSnapToBaselineEnabled,
      isBlockItalic,
      isBlockOpticalKerningEnabled,
      getBlockRotation,
      promoteLayerToTop,
      onRequestNotice,
    },
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
    shouldKeepEditorsOpenForPointerDown: (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof HTMLCanvasElement) && !(target instanceof HTMLElement && target.closest("canvas"))) {
        return false
      }
      return resolveSelectedLayerAtClientPoint(event.clientX, event.clientY) !== null
    },
    onUndoRequest,
    onRedoRequest,
    undo,
    redo,
  })
  const smartTextZoomGeometrySignature = useMemo(() => {
    if (!smartTextEditZoomEnabled || !editorState?.target) return null
    return buildSmartTextZoomGeometrySignature({
      target: editorState.target,
      columns: editorState.draftColumns,
      rows: editorState.draftRows,
      heightBaselines: editorState.draftHeightBaselines,
    })
  }, [
    editorState?.draftColumns,
    editorState?.draftHeightBaselines,
    editorState?.draftRows,
    editorState?.target,
    smartTextEditZoomEnabled,
  ])

  const clearHover = useCallback(() => {
    setHoverState(null)
    setHoverImageKey(null)
    setHoverCopyIntent(false)
  }, [])

  const handleCanvasMouseLeave = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof HTMLElement && nextTarget.closest("[data-preview-edit-affordance='true']")) {
      return
    }
    clearHover()
  }, [clearHover])

  const handlePreviewWorkspacePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (
      target.closest("[data-preview-document-root='true']")
      || target.closest("[data-preview-edit-affordance='true']")
    ) {
      return
    }
    clearHover()
    onSelectLayer?.(null)
  }, [clearHover, onSelectLayer])

  const {
    dragState,
    setDragState,
    beginDetachedCopyDrag,
    handlePreviewPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
    handleCanvasDoubleClick,
  } = usePreviewCanvasInteractions<BlockId, TypographyStyleKey>({
    showTypography,
    showImagePlaceholders,
    editorOpen: Boolean(editorState || imageEditorState),
    activeEditorTarget: editorState?.target ?? imageEditorState?.target ?? null,
    canvasRef,
    blockRectsRef,
    imageRectsRef,
    blockModulePositions,
    imageModulePositions,
    toPagePoint,
    toPagePointFromClient,
    snapToModule,
    snapToBaseline,
    resolveLayerPlacement,
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
    getImageHeightBaselines,
    getImageColorReference,
    getImageOpacity,
    getImageRotation,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getStyleKeyForBlock,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
    isImageSnapToBaselineEnabled,
    blockOrder,
    textContent,
    blockCustomSizes,
    blockCustomLeadings,
    blockTextColors,
    baseFont,
    gridCols: result.settings.gridCols,
    gridRows: result.settings.gridRows,
    recordHistoryBeforeChange,
    insertImagePlaceholder,
    setImageModulePositions,
    setBlockCollections,
    setBlockCustomSizes,
    setBlockCustomLeadings,
    setBlockTextColors,
    setBlockModulePositions,
    onSelectLayer,
    promoteLayerToTop,
    onRequestNotice,
    getNextCustomBlockId,
    getNextImagePlaceholderId,
    ensureImagePlaceholdersVisible: () => onShowImagePlaceholdersChange?.(true),
    handleTextCanvasDoubleClick,
    openTextEditor,
    openImageEditor,
    closeImageEditorPanel: closeImageEditorState,
    clearHover,
    dragEndedAtRef,
    touchLongPressMs: PREVIEW_TOUCH_LONG_PRESS_MS,
    touchCancelDistancePx: PREVIEW_TOUCH_CANCEL_DISTANCE_PX,
  })

  const {
    handleCanvasMouseMove,
    canvasCursorClass,
    canvasCursorStyle,
  } = usePreviewHoverState<BlockId>({
    showTypography,
    editorOpen: Boolean(editorState || imageEditorState),
    dragState,
    hoverState,
    hoverImageKey,
    hoverCopyIntent,
    setHoverState,
    setHoverImageKey,
    setHoverCopyIntent,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    isPointWithinHoverTarget: (key, pageX, pageY) => {
      if (isImagePlaceholderKey(key)) {
        return isPointWithinRect(pageX, pageY, imageRectsRef.current[key] ?? null)
      }
      const plan = previousPlansRef.current.get(key)
      if (plan?.guideRects.some((guideRect) => isPointWithinRect(pageX, pageY, guideRect))) {
        return true
      }
      return isPointWithinRect(pageX, pageY, blockRectsRef.current[key] ?? null)
    },
    toPagePointFromClient,
  })

  useEffect(() => {
    onHoverLayerChange?.(hoverState?.key ?? hoverImageKey ?? null)
  }, [hoverImageKey, hoverState?.key, onHoverLayerChange])

  useEffect(() => {
    if (layoutEmissionFrameRef.current !== null) {
      window.cancelAnimationFrame(layoutEmissionFrameRef.current)
      layoutEmissionFrameRef.current = null
    }
    if (initialLayoutToken === 0) {
      setLayoutEmissionEnabled(true)
      return
    }
    setLayoutEmissionEnabled(false)
  }, [initialLayoutToken])

  useEffect(() => {
    if (initialLayoutToken === 0) return
    if (
      lastAppliedLayoutKeyRef.current !== initialLayoutToken
      || lastAppliedImageLayoutKeyRef.current !== initialLayoutToken
      || lastAppliedLayerLayoutKeyRef.current !== initialLayoutToken
      || lastAppliedCustomSizeLayoutKeyRef.current !== initialLayoutToken
    ) {
      return
    }
    if (layoutEmissionEnabled) return
    if (layoutEmissionFrameRef.current !== null) {
      window.cancelAnimationFrame(layoutEmissionFrameRef.current)
    }
    layoutEmissionFrameRef.current = window.requestAnimationFrame(() => {
      layoutEmissionFrameRef.current = null
      setLayoutEmissionEnabled(true)
    })
    return () => {
      if (layoutEmissionFrameRef.current !== null) {
        window.cancelAnimationFrame(layoutEmissionFrameRef.current)
        layoutEmissionFrameRef.current = null
      }
    }
  }, [
    blockCustomLeadings,
    blockCustomSizes,
    blockOrder,
    blockTextColors,
    imageOrder,
    initialLayoutToken,
    layoutEmissionEnabled,
    layerOrder,
  ])

  useEffect(() => (
    () => {
      if (layoutEmissionFrameRef.current !== null) {
        window.cancelAnimationFrame(layoutEmissionFrameRef.current)
        layoutEmissionFrameRef.current = null
      }
    }
  ), [])

  useEffect(() => {
    if (initialLayoutToken === 0) return
    blockRectsRef.current = {} as Record<BlockId, BlockRect>
    imageRectsRef.current = {} as Record<BlockId, BlockRect>
    previousPlansRef.current.clear()
    clearHover()
  }, [clearHover, imageRectsRef, initialLayoutToken, previousPlansRef])

  usePreviewDocumentLifecycle<TypographyStyleKey, BlockId, typeof dragState, NonNullable<typeof editorState>, typeof imageEditorState>({
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
    imageOrder,
    defaultTextColor,
    recordHistoryBeforeChange,
    pushHistory,
    buildSnapshot,
    baseFont,
    gridCols: result.settings.gridCols,
    gridRows: result.settings.gridRows,
    typographyStyles: result.typography.styles,
    isBaseBlockId,
    defaultTextContent: DEFAULT_TEXT_CONTENT as Record<string, string>,
    defaultStyleAssignments: Object.fromEntries(
      BASE_BLOCK_IDS.map((key) => [key, DEFAULT_STYLE_ASSIGNMENTS[key]]),
    ) as Record<string, TypographyStyleKey>,
    isFontFamily,
    getDefaultColumnSpan,
    getGridMetrics,
    setBlockCollections,
    applyImageSnapshot,
    applyLayerOrderSnapshot,
    applyCustomSizeSnapshot,
    blockOrder,
    layerOrder,
    setLayerOrder,
  })
  usePreviewLayerDelete({
    imageOrder,
    requestedLayerDeleteTarget,
    requestedLayerDeleteToken,
    lastAppliedLayerDeleteRequestKeyRef,
    recordHistoryBeforeChange,
    setImageOrder,
    setImageModulePositions,
    setImageColumnSpans,
    setImageRowSpans,
    setImageHeightBaselines,
    setImageColors,
    setLayerOrder,
    setImageEditorState,
    setBlockCollections,
    setBlockCustomSizes,
    setBlockCustomLeadings,
    setBlockTextColors,
    setEditorState,
  })

  usePreviewGuideCanvases({
    staticCanvasRef,
    imageCanvasRef,
    pixelRatio,
    result,
    scale,
    rotation,
    canvasBackground,
    showMargins,
    showModules,
    showBaselines,
    isMobile,
  })

  const [typographyPlanVersion, setTypographyPlanVersion] = useState(0)
  const handleTypographyPlanCommit = useCallback(() => {
    setTypographyPlanVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    if (!smartTextEditZoomEnabled || !editorState?.target) {
      setActiveTextZoomTarget(null)
      return
    }
    setActiveTextZoomTarget((current) => (current === editorState.target ? current : editorState.target))
  }, [editorState?.target, smartTextEditZoomEnabled])

  useEffect(() => {
    smartTextZoomGeometrySignatureRef.current = smartTextZoomGeometrySignature
  }, [smartTextZoomGeometrySignature])

  useEffect(() => {
    if (!smartTextEditZoomEnabled || !activeTextZoomTarget) {
      lastAppliedSmartTextZoomGeometrySignatureRef.current = null
      return
    }
    lastAppliedSmartTextZoomGeometrySignatureRef.current = smartTextZoomGeometrySignatureRef.current
  }, [activeTextZoomTarget, smartTextEditZoomEnabled])

  useEffect(() => {
    if (!smartTextEditZoomEnabled || !activeTextZoomTarget) return
    const nextSignature = smartTextZoomGeometrySignatureRef.current
    if (!nextSignature || lastAppliedSmartTextZoomGeometrySignatureRef.current === nextSignature) return
    lastAppliedSmartTextZoomGeometrySignatureRef.current = nextSignature
    setSmartTextZoomTargetVersion((version) => version + 1)
  }, [activeTextZoomTarget, smartTextEditZoomEnabled, typographyPlanVersion])

  useTypographyRenderer<BlockId>({
    canvasRef,
    blockRectsRef,
    imageRectsRef,
    typographyBufferRef,
    previousPlansRef,
    typographyBufferTransformRef,
    result,
    scale,
    fontRenderEpoch,
    rotation,
    showTypography,
    showImagePlaceholders,
    blockOrder,
    imageOrder,
    layerOrder: resolvedLayerOrder,
    textContent,
    styleAssignments,
    blockTextAlignments,
    blockVerticalAlignments,
    blockModulePositions,
    imageModulePositions,
    dragState,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    getBlockRotation,
    getBlockSpan,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    getImageSpan,
    getImageRows,
    getImageHeightBaselines,
    getImageColor,
    getImageOpacity,
    getImageRotation,
    isImageSnapToColumnsEnabled,
    isImageSnapToBaselineEnabled,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    getWrappedText,
    getOpticalOffset,
    onOverflowLinesChange: handleOverflowLinesChange,
    onCanvasReady,
    onPlansCommit: handleTypographyPlanCommit,
    recordPerfMetric,
    pixelRatio,
  })

  const hoveredTextPlan = hoverState?.key ? previousPlansRef.current.get(hoverState.key) ?? null : null
  const hoveredTextRect = hoverState?.key ? blockRectsRef.current[hoverState.key] ?? null : null
  const linkedHoveredTextPlan = !hoverState?.key && hoveredLayerKey
    ? previousPlansRef.current.get(hoveredLayerKey) ?? null
    : null
  const linkedHoveredImageRect = !hoverState?.key && !hoverImageKey && hoveredLayerKey
    ? imageRectsRef.current[hoveredLayerKey] ?? null
    : null
  const hoveredTextGuideRect = hoveredTextPlan
    ? getHoveredPreviewTextGuideRect(hoveredTextPlan, hoverState?.point ?? null)
    : linkedHoveredTextPlan
      ? getPreviewTextGuideRect(linkedHoveredTextPlan)
      : hoveredTextRect
  const hoveredTextGuidePlan = hoveredTextPlan ?? linkedHoveredTextPlan
  const hoveredImageRect = hoverImageKey
    ? imageRectsRef.current[hoverImageKey] ?? null
    : linkedHoveredImageRect

  usePreviewOverlayCanvas({
    overlayCanvasRef,
    blockRectsRef,
    imageRectsRef,
    previousPlansRef,
    result,
    scale,
    pixelRatio,
    rotation,
    showTypography,
    blockOrder,
    imageOrder,
    hoveredTextGuideRect,
    hoveredTextGuidePlan,
    hoveredImageRect,
    selectedLayerKey,
    overflowLinesByBlock,
    dragState,
    editorTarget: editorState?.target ?? imageEditorState?.target ?? null,
    getPlacementRows,
    getPlacementHeightBaselines,
    getPlacementSpan,
    getGridMetrics,
    editorPlanVersion: typographyPlanVersion,
  })

  usePreviewLayoutReflowController<BlockId>({
    suppressReflowCheckRef,
    blockOrder,
    blockColumnSpans,
    blockGridPositions,
    blockModulePositions,
    imageOrder,
    imageGridPositions,
    textContent,
    scale,
    result,
    getDefaultColumnSpan,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getImageRows,
    getImageSpan,
    getStyleKeyForBlock,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    onRequestGridRestore,
    onRequestGridReductionWarning,
    setBlockColumnSpans,
    canvasRef,
    recordPerfMetric,
  })

  const deletePreviewTarget = useCallback((key: BlockId) => {
    clearHover()
    onSelectLayer?.(null)
    recordHistoryBeforeChange()

    if (isImagePlaceholderKey(key)) {
      setImageOrder((prev) => prev.filter((item) => item !== key))
      setImageModulePositions((prev) => omitOptionalRecordKey(prev, key))
      setImageColumnSpans((prev) => omitOptionalRecordKey(prev, key))
      setImageRowSpans((prev) => omitOptionalRecordKey(prev, key))
      setImageHeightBaselines((prev) => omitOptionalRecordKey(prev, key))
      setImageSnapToColumns((prev) => omitOptionalRecordKey(prev, key))
      setImageSnapToBaseline((prev) => omitOptionalRecordKey(prev, key))
      setImageRotations((prev) => omitOptionalRecordKey(prev, key))
      setImageColors((prev) => omitOptionalRecordKey(prev, key))
      setImageOpacities((prev) => omitOptionalRecordKey(prev, key))
      setLayerOrder((prev) => prev.filter((item) => item !== key))
      setImageEditorState((prev) => (prev?.target === key ? null : prev))
      return
    }

    setBlockCollections((prev) => {
      if (isBaseBlockId(key)) {
        return {
          ...prev,
          textContent: {
            ...prev.textContent,
            [key]: "",
          },
          blockModulePositions: omitOptionalRecordKey(prev.blockModulePositions, key),
        }
      }
      return removeTextLayerFromCollections(prev, key)
    })

    if (!isBaseBlockId(key)) {
      setBlockCustomSizes((prev) => omitOptionalRecordKey(prev, key))
      setBlockCustomLeadings((prev) => omitOptionalRecordKey(prev, key))
      setBlockTextColors((prev) => omitOptionalRecordKey(prev, key))
      setLayerOrder((prev) => prev.filter((item) => item !== key))
    }

    setEditorState((prev) => (prev?.target === key ? null : prev))
  }, [
    clearHover,
    isImagePlaceholderKey,
    onSelectLayer,
    recordHistoryBeforeChange,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockCustomSizes,
    setBlockTextColors,
    setEditorState,
    setImageColors,
    setImageColumnSpans,
    setImageEditorState,
    setImageHeightBaselines,
    setImageModulePositions,
    setImageOpacities,
    setImageOrder,
    setImageRowSpans,
    setImageRotations,
    setImageSnapToBaseline,
    setImageSnapToColumns,
    setLayerOrder,
  ])

  usePreviewLayoutEmission({
    buildSnapshot,
    debounceMs: PREVIEW_LAYOUT_CHANGE_DEBOUNCE_MS,
    enabled: layoutEmissionEnabled,
    onLayoutChange,
  })

  useEffect(() => {
    onSnapshotGetterChange?.(buildSnapshot)
    return () => {
      onSnapshotGetterChange?.(null)
    }
  }, [buildSnapshot, onSnapshotGetterChange])

  const baselinesPerGridModule = useMemo(
    () => Math.max(1, Math.round(result.module.height / Math.max(0.0001, result.grid.gridUnit))),
    [result.grid.gridUnit, result.module.height],
  )
  const inlineEditorLayout = usePreviewInlineEditorLayout({
    editorState,
    blockRectsRef,
    previousPlansRef,
    gridUnit: result.grid.gridUnit,
    scale,
    planVersion: typographyPlanVersion,
  })
  const maxCharsPerLine = useMemo(() => {
    if (!inlineEditorLayout) return null
    if (inlineEditorLayout.commands.length === 0) return 0
    return inlineEditorLayout.commands.reduce((max, command) => {
      const characterCount = Array.from(command.text.replace(/\u00AD/g, "")).length
      return Math.max(max, characterCount)
    }, 0)
  }, [inlineEditorLayout])
  const textEditorControls = usePreviewOverlayControls({
    editorState,
    setEditorState,
    deleteEditorBlock,
    maxCharsPerLine,
    baselinesPerGridModule,
    gridRows: result.settings.gridRows,
    gridCols: result.settings.gridCols,
    styleOptions: PREVIEW_STYLE_OPTIONS as BlockEditorStyleOption<TypographyStyleKey>[],
    getStyleSizeLabel: (styleKey) => formatPtSize(getStyleSize(styleKey)),
    getStyleSizeValue: getStyleSize,
    getStyleLeadingValue: getStyleLeading,
    getStyleDefaultFontWeight: (styleKey) => getStyleDefaultFontWeight(result.typography.styles[styleKey]?.weight),
    getStyleDefaultItalic: (styleKey) => result.typography.styles[styleKey]?.blockItalic === true,
    isFxStyle: (styleKey) => styleKey === "fx",
    getDummyTextForStyle,
    colorSchemes: IMAGE_COLOR_SCHEMES,
    selectedColorScheme: imageColorScheme,
    palette: imagePalette,
  })

  useEffect(() => {
    if (!requestedLayerEditorTarget || requestedLayerEditorToken === 0) {
      setPendingLayerEditorMode(null)
      return
    }
    if (imageOrder.includes(requestedLayerEditorTarget)) {
      setPendingLayerEditorMode("image")
      return
    }
    if (blockOrder.includes(requestedLayerEditorTarget)) {
      setPendingLayerEditorMode("text")
      return
    }
    setPendingLayerEditorMode(null)
  }, [blockOrder, imageOrder, requestedLayerEditorTarget, requestedLayerEditorToken])

  useEffect(() => {
    if (!pendingLayerEditorMode || !requestedLayerEditorTarget) return
    const isRequestedTargetOpen = editorState?.target === requestedLayerEditorTarget
      || imageEditorState?.target === requestedLayerEditorTarget
    if (!isRequestedTargetOpen) return
    setPendingLayerEditorMode(null)
  }, [
    editorState?.target,
    imageEditorState?.target,
    pendingLayerEditorMode,
    requestedLayerEditorTarget,
  ])

  useEffect(() => {
    const resolvedEditorMode = editorState
      ? "text"
      : imageEditorState
        ? "image"
        : pendingLayerEditorMode
    onEditorModeChange?.(
      resolvedEditorMode,
    )
  }, [editorState, imageEditorState, onEditorModeChange, pendingLayerEditorMode])

  useEffect(() => (
    () => {
      onEditorModeChange?.(null)
    }
  ), [onEditorModeChange])

  return (
    <div
      ref={previewContainerRef}
      data-tooltip-boundary="preview-workspace"
      className={`relative h-full w-full min-w-0 overflow-hidden rounded-lg ${
        isDarkMode ? "bg-[#161A22]" : "bg-gray-100"
      }`}
      onPointerDown={handlePreviewWorkspacePointerDown}
    >
      <div
        className="absolute"
        style={{
          left: stageLeftCss,
          top: stageTopCss,
          width: pageWidthCss,
          height: pageHeightCss,
        }}
      >
        <GridPreviewCanvasStage
          staticCanvasRef={staticCanvasRef}
          imageCanvasRef={imageCanvasRef}
          canvasRef={canvasRef}
          overlayCanvasRef={overlayCanvasRef}
          textareaRef={textareaRef}
          pageWidthCss={pageWidthCss}
          pageHeightCss={pageHeightCss}
          pageWidthPx={pageWidthPx}
          pageHeightPx={pageHeightPx}
          canvasCursorClass={canvasCursorClass}
          canvasCursorStyle={canvasCursorStyle}
          handlePreviewPointerDown={handlePreviewPointerDown}
          handleCanvasPointerMove={handleCanvasPointerMove}
          handleCanvasPointerUp={handleCanvasPointerUp}
          handleCanvasPointerCancel={handleCanvasPointerCancel}
          handleCanvasLostPointerCapture={handleCanvasLostPointerCapture}
          handleCanvasMouseMove={handleCanvasMouseMove}
          handleCanvasMouseLeave={handleCanvasMouseLeave}
          handleCanvasDoubleClick={handleCanvasDoubleClick}
          editorState={editorState}
          setEditorState={setEditorState}
          inlineEditorLayout={inlineEditorLayout}
          rotation={rotation}
          scale={scale}
          baselineStep={result.grid.gridUnit * scale}
          imageColorScheme={imageColorScheme}
          pageBackgroundColor={canvasBackground}
          closeEditor={closeEditor}
          saveEditor={saveEditor}
          getStyleSizeValue={getStyleSize}
          getStyleLeadingValue={getStyleLeading}
          isFxStyle={(styleKey) => styleKey === "fx"}
          showDocumentHelpIndicator={showPreviewHelpIndicator}
          onDocumentHelpHover={showPreviewHelpIndicator ? () => onOpenHelpSection?.("help-preview-workspace") : undefined}
        />
      </div>

      <GridPreviewFeedback
        warningToast={gridReductionWarningToast}
        dismissWarningToast={onDismissGridReductionWarningToast ?? (() => {})}
        isDarkMode={isDarkMode}
      />

      <GridPreviewOverlays
        showEditorHelpIcon={showEditorHelpIcon}
        showRolloverInfo={showRolloverInfo}
        editorSidebarHost={editorSidebarHost}
        stageLeftCss={stageLeftCss}
        stageTopCss={stageTopCss}
        pageWidthCss={pageWidthCss}
        pageHeightCss={pageHeightCss}
        pageRotation={rotation}
        editorState={editorState}
        imageEditorState={imageEditorState}
        textEditorControls={textEditorControls}
        hoveredTextKey={hoverState?.key ?? null}
        hoveredTextRect={hoveredTextGuideRect}
        hoveredImageKey={hoverImageKey}
        hoveredImageRect={hoveredImageRect}
        openTextEditor={openTextEditor}
        openImageEditor={openImageEditor}
        beginDetachedCopyDrag={beginDetachedCopyDrag}
        deletePreviewTarget={deletePreviewTarget}
        clearHover={clearHover}
        setImageEditorState={setImageEditorState}
        baselinesPerGridModule={baselinesPerGridModule}
        gridRows={result.settings.gridRows}
        gridCols={result.settings.gridCols}
        imageColorScheme={imageColorScheme}
        imagePalette={imagePalette}
        imageColorSchemes={IMAGE_COLOR_SCHEMES}
        onPreviewEditorOpen={onPreviewEditorOpen}
        onOpenHelpSection={onOpenHelpSection}
        isDarkMode={isDarkMode}
      />

    </div>
  )
})

GridPreview.displayName = "GridPreview"
