"use client"

import { Button } from "@/components/ui/button"
import { InlineBlockTextarea } from "@/components/editor/InlineBlockTextarea"
import { GridPreviewOverlays } from "@/components/preview/GridPreviewOverlays"
import {
  type BlockEditorStyleOption,
  type BlockEditorTextAlign,
} from "@/components/editor/block-editor-types"
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
  isFontFamily,
  type FontFamily,
} from "@/lib/config/fonts"
import {
  DEFAULT_IMAGE_COLOR_SCHEME_ID,
  IMAGE_COLOR_SCHEMES,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { usePreviewTextEditor } from "@/hooks/usePreviewTextEditor"
import { memo, useCallback, useMemo, useRef, useState } from "react"

type BlockId = string
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type TextAlignMode = BlockEditorTextAlign

type BlockRect = {
  x: number
  y: number
  width: number
  height: number
}

type TextDrawCommand = {
  text: string
  x: number
  y: number
}

type BlockRenderPlan = {
  key: BlockId
  rect: BlockRect
  signature: string
  font: string
  textColor: string
  textAlign: TextAlignMode
  blockRotation: number
  rotationOriginX: number
  rotationOriginY: number
  commands: TextDrawCommand[]
}

type OverflowLinesByBlock = Partial<Record<BlockId, number>>
type NoticeRequest = {
  title: string
  message: string
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

const STYLE_OPTIONS: BlockEditorStyleOption<TypographyStyleKey>[] = [
  { value: "fx", label: "FX" },
  { value: "display", label: "Display" },
  { value: "headline", label: "Headline" },
  { value: "subhead", label: "Subhead" },
  { value: "body", label: "Body" },
  { value: "caption", label: "Caption" },
]

const DUMMY_TEXT_BY_STYLE: Record<TypographyStyleKey, string> = {
  fx: "Swiss Design",
  display: "Swiss Design",
  headline: "Modular Grid Systems",
  subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
  body: "The modular grid allows designers to organize content with clarity and purpose. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide contrast and emphasis while preserving coherence across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet unified systems.",
  caption: "Based on Müller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
}

function formatPtSize(size: number): string {
  return Number.isInteger(size) ? `${size}pt` : `${size.toFixed(1)}pt`
}

function getDummyTextForStyle(style: TypographyStyleKey): string {
  return DUMMY_TEXT_BY_STYLE[style] ?? DUMMY_TEXT_BY_STYLE.body
}

interface GridPreviewProps {
  result: GridResult
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders?: boolean
  showTypography: boolean
  showRolloverInfo?: boolean
  initialLayout?: PreviewLayoutState | null
  initialLayoutToken?: number
  rotation?: number
  canvasBackground?: string | null
  undoNonce?: number
  redoNonce?: number
  historyResetToken?: number
  paragraphColorResetToken?: number
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  onLayoutChange?: (layout: PreviewLayoutState) => void
  onRequestGridRestore?: (cols: number, rows: number) => void
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
  onSelectLayer?: (key: BlockId | null) => void
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  onRequestNotice?: (notice: NoticeRequest) => void
  showEditorHelpIcon?: boolean
  baseFont?: FontFamily
  imageColorScheme?: ImageColorSchemeId
  onImageColorSchemeChange?: (value: ImageColorSchemeId) => void
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
  initialLayout = null,
  initialLayoutToken = 0,
  rotation = 0,
  canvasBackground = null,
  undoNonce = 0,
  redoNonce = 0,
  historyResetToken = 0,
  paragraphColorResetToken = 0,
  onCanvasReady,
  onLayoutChange,
  onRequestGridRestore,
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
  onSelectLayer,
  onOpenHelpSection,
  onRequestNotice,
  showEditorHelpIcon = false,
  baseFont = DEFAULT_BASE_FONT,
  imageColorScheme = DEFAULT_IMAGE_COLOR_SCHEME_ID,
  onImageColorSchemeChange,
  isDarkMode = false,
}: GridPreviewProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
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
  const typographyBufferRef = useRef<HTMLCanvasElement | null>(null)
  const previousPlansRef = useRef<Map<BlockId, BlockRenderPlan>>(new Map())
  const typographyBufferTransformRef = useRef("")
  const lastHistoryResetTokenRef = useRef(historyResetToken)
  const lastParagraphColorResetTokenRef = useRef(paragraphColorResetToken)
  const PERF_ENABLED = process.env.NODE_ENV !== "production"

  const [overflowLinesByBlock, setOverflowLinesByBlock] = useState<OverflowLinesByBlock>({})
  const [hoverState, setHoverState] = useState<PreviewHoverState<BlockId> | null>(null)
  const [hoverImageKey, setHoverImageKey] = useState<BlockId | null>(null)
  const HISTORY_LIMIT = 50
  const LAYOUT_CHANGE_DEBOUNCE_MS = 120
  const TOUCH_LONG_PRESS_MS = 180
  const TOUCH_CANCEL_DISTANCE_PX = 10
  const PERF_SAMPLE_LIMIT = 160
  const PERF_LOG_INTERVAL_MS = 10000

  const {
    scale,
    pixelRatio,
    isMobile,
    pageWidthCss,
    pageHeightCss,
    pageWidthPx,
    pageHeightPx,
  } = usePreviewViewport({
    previewContainerRef,
    pageWidthPt: result.pageSizePt.width,
    pageHeightPt: result.pageSizePt.height,
  })

  const { showPerfOverlay, perfOverlay, recordPerfMetric } = usePreviewPerf({
    enabled: PERF_ENABLED,
    logIntervalMs: PERF_LOG_INTERVAL_MS,
    sampleLimit: PERF_SAMPLE_LIMIT,
  })

  const handleOverflowLinesChange = useCallback((next: OverflowLinesByBlock) => {
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
    clampImageBaselinePosition,
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
    blockModulePositions,
    blockColumnSpans,
    blockTextAlignments,
    setBlockCollections,
    setBlockOrder,
    setTextContent,
    setBlockTextEdited,
    setStyleAssignments,
    setBlockColumnSpans,
    setBlockTextAlignments,
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
    defaultImageColor,
    defaultTextColor,
    imageOrder,
    setImageOrder,
    imageModulePositions,
    setImageModulePositions,
    setImageColumnSpans,
    setImageRowSpans,
    imageColors,
    setImageColors,
    imageEditorState,
    setImageEditorState,
    getImageSpan,
    getImageRows,
    getImageColorReference,
    getImageColor,
    isImagePlaceholderKey,
    applyImageSnapshot,
    openImageEditorState,
    closeImageEditorState,
    insertImagePlaceholder,
    deleteImagePlaceholderState,
    handleImageColorSchemeChange,
    resetImageTransientState,
    getBlockSpan,
    getBlockRows,
    getPlacementSpan,
    getPlacementRows,
    getStyleKeyForBlock,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    getBlockFont,
    getStyleSize,
    getStyleLeading,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    isBlockBold,
    isBlockItalic,
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
    clampImageBaselinePosition,
    onImageColorSchemeChange,
  })

  const {
    snapToModule,
    snapToBaseline,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    findTopmostDraggableAtPoint,
    resolveSelectedLayerAtClientPoint,
  } = usePreviewHitTesting({
    blockRectsRef,
    imageRectsRef,
    resolvedLayerOrder,
    imageOrder,
    showImagePlaceholders,
    getGridMetrics,
    getPlacementSpan,
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
    isBlockBold,
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
    isBlockBold,
    isBlockItalic,
  })

  const {
    editorState,
    setEditorState,
    closeEditor,
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
      resultGridUnit: result.grid.gridUnit,
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
    onSelectLayer,
    textareaRef,
    onUndoRequest,
    onRedoRequest,
    undo,
    redo,
  })

  const clearHover = useCallback(() => {
    setHoverState(null)
    setHoverImageKey(null)
  }, [])

  const {
    dragState,
    setDragState,
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
    onRequestNotice,
    getNextCustomBlockId,
    getNextImagePlaceholderId,
    handleTextCanvasDoubleClick,
    openImageEditor,
    closeImageEditorPanel: closeImageEditorState,
    clearHover,
    dragEndedAtRef,
    touchLongPressMs: TOUCH_LONG_PRESS_MS,
    touchCancelDistancePx: TOUCH_CANCEL_DISTANCE_PX,
  })

  const {
    handleCanvasMouseMove,
    canvasCursorClass,
  } = usePreviewHoverState<BlockId>({
    showTypography,
    editorOpen: Boolean(editorState || imageEditorState),
    dragState,
    hoverState,
    hoverImageKey,
    setHoverState,
    setHoverImageKey,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    toPagePointFromClient,
  })

  usePreviewDocumentLifecycle<TypographyStyleKey, BlockId, typeof dragState, NonNullable<typeof editorState>, typeof imageEditorState>({
    historyResetToken,
    paragraphColorResetToken,
    initialLayout,
    initialLayoutToken,
    requestedLayerOrder,
    requestedLayerOrderToken,
    lastHistoryResetTokenRef,
    lastParagraphColorResetTokenRef,
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
    blockTextColors,
    setBlockTextColors,
    imageOrder,
    imageColors,
    setImageColors,
    defaultImageColor,
    defaultTextColor,
    imageColorScheme,
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
    blockModulePositions,
    imageModulePositions,
    dragState,
    getBlockFont,
    isBlockItalic,
    isBlockBold,
    getBlockRotation,
    getBlockSpan,
    getBlockRows,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    getImageSpan,
    getImageRows,
    getImageColor,
    clampImageBaselinePosition,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    getWrappedText,
    getOpticalOffset,
    onOverflowLinesChange: handleOverflowLinesChange,
    onCanvasReady,
    recordPerfMetric,
    pixelRatio,
  })

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
    selectedLayerKey,
    overflowLinesByBlock,
    dragState,
    editorTarget: editorState?.target ?? null,
    blockModulePositions,
    getBlockRows,
    getBlockSpan,
    getPlacementRows,
    getPlacementSpan,
    getGridMetrics,
  })

  const {
    pendingReflow,
    reflowToast,
    applyPendingReflow,
    cancelPendingReflow,
    dismissReflowToast,
  } = usePreviewLayoutReflowController<BlockId, PreviewLayoutState>({
    suppressReflowCheckRef,
    blockOrder,
    blockColumnSpans,
    blockModulePositions,
    textContent,
    scale,
    result,
    getDefaultColumnSpan,
    getBlockRows,
    getBlockSpan,
    getStyleKeyForBlock,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    buildSnapshot,
    pushHistory,
    onRequestGridRestore,
    setBlockColumnSpans,
    setBlockModulePositions,
    canvasRef,
    recordPerfMetric,
  })

  const deleteImagePlaceholder = useCallback(() => {
    if (!imageEditorState) return
    recordHistoryBeforeChange()
    deleteImagePlaceholderState()
  }, [deleteImagePlaceholderState, imageEditorState, recordHistoryBeforeChange])

  usePreviewLayoutEmission({
    buildSnapshot,
    debounceMs: LAYOUT_CHANGE_DEBOUNCE_MS,
    onLayoutChange,
  })

  const hierarchyOptionLabels = useMemo(
    () =>
      STYLE_OPTIONS.map(
        (option) => `${option.label} (${formatPtSize(result.typography.styles[option.value].size)})`,
      ),
    [result.typography.styles],
  )
  const hierarchyTriggerMinWidthCh = useMemo(
    () => Math.max(12, hierarchyOptionLabels.reduce((max, label) => Math.max(max, label.length), 0) + 4),
    [hierarchyOptionLabels],
  )
  const rowTriggerMinWidthCh = 10
  const colTriggerMinWidthCh = 10
  const inlineEditorLayout = usePreviewInlineEditorLayout({
    editorState,
    blockRectsRef,
    previousPlansRef,
    gridUnit: result.grid.gridUnit,
    scale,
  })
  const textEditorControls = usePreviewOverlayControls({
    editorState,
    setEditorState,
    deleteEditorBlock,
    gridRows: result.settings.gridRows,
    gridCols: result.settings.gridCols,
    hierarchyTriggerMinWidthCh,
    rowTriggerMinWidthCh,
    colTriggerMinWidthCh,
    styleOptions: STYLE_OPTIONS,
    getStyleSizeLabel: (styleKey) => formatPtSize(getStyleSize(styleKey)),
    getStyleSizeValue: getStyleSize,
    getStyleLeadingValue: getStyleLeading,
    isFxStyle: (styleKey) => styleKey === "fx",
    getDummyTextForStyle,
    colorSchemes: IMAGE_COLOR_SCHEMES,
    selectedColorScheme: imageColorScheme,
    onColorSchemeChange: handleImageColorSchemeChange,
    palette: imagePalette,
  })

  return (
    <div
      ref={previewContainerRef}
      className={`relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="relative" style={{ width: pageWidthCss, height: pageHeightCss }}>
        <canvas
          ref={staticCanvasRef}
          width={pageWidthPx}
          height={pageHeightPx}
          style={{ width: pageWidthCss, height: pageHeightCss }}
          className="absolute inset-0 block shadow-lg"
        />
        <canvas
          ref={imageCanvasRef}
          width={pageWidthPx}
          height={pageHeightPx}
          style={{ width: pageWidthCss, height: pageHeightCss }}
          className="pointer-events-none absolute inset-0 block"
        />
        <canvas
          ref={canvasRef}
          width={pageWidthPx}
          height={pageHeightPx}
          style={{ width: pageWidthCss, height: pageHeightCss }}
          className={`absolute inset-0 block touch-none ${canvasCursorClass}`}
          onPointerDown={handlePreviewPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerCancel}
          onLostPointerCapture={handleCanvasLostPointerCapture}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={clearHover}
          onDoubleClick={handleCanvasDoubleClick}
        />
        <canvas
          ref={overlayCanvasRef}
          width={pageWidthPx}
          height={pageHeightPx}
          style={{ width: pageWidthCss, height: pageHeightCss }}
          className="pointer-events-none absolute inset-0 block"
        />
        <InlineBlockTextarea
          editorState={editorState}
          setEditorState={setEditorState}
          textareaRef={textareaRef}
          layout={inlineEditorLayout}
          pageWidth={pageWidthCss}
          pageHeight={pageHeightCss}
          pageRotation={rotation}
          scale={scale}
          baselineStep={result.grid.gridUnit * scale}
          closeEditor={closeEditor}
          saveEditor={saveEditor}
          getStyleSizeValue={getStyleSize}
          getStyleLeadingValue={getStyleLeading}
          isFxStyle={(styleKey) => styleKey === "fx"}
        />
      </div>

      {pendingReflow ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-md border border-gray-300 bg-white p-4 shadow-xl">
            <div className="text-sm font-semibold text-gray-900">Rearrange Layout?</div>
            <div className="mt-2 text-xs text-gray-600">
              This grid change will rearrange {pendingReflow.movedCount} block{pendingReflow.movedCount === 1 ? "" : "s"}.
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={cancelPendingReflow}>Cancel</Button>
              <Button size="sm" onClick={applyPendingReflow}>Apply</Button>
            </div>
          </div>
        </div>
      ) : null}

      {reflowToast ? (
        <div className="absolute bottom-3 right-3 z-30 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-lg">
          <div className="text-xs text-gray-700">Layout rearranged.</div>
          <div className="mt-1 flex items-center justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                const performUndo = onUndoRequest ?? undo
                performUndo()
                dismissReflowToast()
              }}
            >
              Undo
            </Button>
          </div>
        </div>
      ) : null}

      <GridPreviewOverlays
        showInteractionHint={showRolloverInfo && Boolean(hoverState)}
        showPerfOverlay={PERF_ENABLED && showPerfOverlay}
        perfOverlay={perfOverlay}
        showEditorHelpIcon={showEditorHelpIcon}
        showRolloverInfo={showRolloverInfo}
        editorState={editorState}
        imageEditorState={imageEditorState}
        textEditorControls={textEditorControls}
        setImageEditorState={setImageEditorState}
        deleteImagePlaceholder={deleteImagePlaceholder}
        gridRows={result.settings.gridRows}
        gridCols={result.settings.gridCols}
        imageColorScheme={imageColorScheme}
        handleImageColorSchemeChange={handleImageColorSchemeChange}
        imagePalette={imagePalette}
        rowTriggerMinWidthCh={rowTriggerMinWidthCh}
        colTriggerMinWidthCh={colTriggerMinWidthCh}
        imageColorSchemes={IMAGE_COLOR_SCHEMES}
        onOpenHelpSection={onOpenHelpSection}
      />

    </div>
  )
})

GridPreview.displayName = "GridPreview"
