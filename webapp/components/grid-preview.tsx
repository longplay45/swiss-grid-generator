"use client"

import { Button } from "@/components/ui/button"
import { InlineBlockTextarea } from "@/components/editor/InlineBlockTextarea"
import { GridPreviewOverlays } from "@/components/preview/GridPreviewOverlays"
import {
  type BlockEditorStyleOption,
  type BlockEditorTextAlign,
} from "@/components/editor/block-editor-types"
import { GridResult } from "@/lib/grid-calculator"
import { getOpticalMarginAnchorOffset } from "@/lib/optical-margin"
import { renderStaticGuides } from "@/lib/render-static-guides"
import type { HelpSectionId } from "@/lib/help-registry"
import {
  findNearestAxisIndex,
  sumAxisSpan,
} from "@/lib/grid-rhythm"
import { usePreviewDrag } from "@/hooks/usePreviewDrag"
import type { DragState as PreviewDragState } from "@/hooks/usePreviewDrag"
import { useGridPreviewDocumentState } from "@/hooks/useGridPreviewDocumentState"
import { usePreviewGeometry } from "@/hooks/usePreviewGeometry"
import { usePreviewHoverState, type PreviewHoverState } from "@/hooks/usePreviewHoverState"
import { usePreviewHistory } from "@/hooks/usePreviewHistory"
import { usePreviewHitTesting } from "@/hooks/usePreviewHitTesting"
import { usePreviewLayoutReflowController } from "@/hooks/usePreviewLayoutReflowController"
import { usePreviewOverlayCanvas } from "@/hooks/usePreviewOverlayCanvas"
import { useInitialLayoutHydration } from "@/hooks/useInitialLayoutHydration"
import { usePreviewLayerDelete } from "@/hooks/usePreviewLayerDelete"
import { usePreviewLayoutEmission } from "@/hooks/usePreviewLayoutEmission"
import { usePreviewPerf } from "@/hooks/usePreviewPerf"
import { useTypographyRenderer } from "@/hooks/useTypographyRenderer"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { wrapText, getDefaultColumnSpan } from "@/lib/text-layout"
import {
  BASE_BLOCK_IDS,
  DEFAULT_STYLE_ASSIGNMENTS,
  DEFAULT_TEXT_CONTENT,
  isBaseBlockId,
} from "@/lib/document-defaults"
import { clampFxLeading, clampFxSize, clampRotation } from "@/lib/block-constraints"
import {
  DEFAULT_BASE_FONT,
  getFontFamilyCss,
  isFontFamily,
  type FontFamily,
} from "@/lib/config/fonts"
import {
  getClosestImageSchemeColorToken,
  DEFAULT_IMAGE_COLOR_SCHEME_ID,
  IMAGE_COLOR_SCHEMES,
  isImagePlaceholderColor,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { areLayerOrdersEqual, reconcileLayerOrder } from "@/lib/preview-layer-order"
import { usePreviewTextEditor } from "@/hooks/usePreviewTextEditor"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"

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

type ModulePosition = {
  col: number
  row: number
}

type DragState = PreviewDragState<BlockId>

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
  const measureWidthCacheRef = useRef<Map<string, number>>(new Map())
  const wrapTextCacheRef = useRef<Map<string, string[]>>(new Map())
  const opticalOffsetCacheRef = useRef<Map<string, number>>(new Map())
  const typographyBufferRef = useRef<HTMLCanvasElement | null>(null)
  const previousPlansRef = useRef<Map<BlockId, BlockRenderPlan>>(new Map())
  const typographyBufferTransformRef = useRef("")
  const lastHistoryResetTokenRef = useRef(historyResetToken)
  const lastParagraphColorResetTokenRef = useRef(paragraphColorResetToken)
  const PERF_ENABLED = process.env.NODE_ENV !== "production"

  const [scale, setScale] = useState(1)
  const [pixelRatio, setPixelRatio] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [overflowLinesByBlock, setOverflowLinesByBlock] = useState<OverflowLinesByBlock>({})
  const [fontRenderEpoch, setFontRenderEpoch] = useState(0)
  const [hoverState, setHoverState] = useState<PreviewHoverState<BlockId> | null>(null)
  const [hoverImageKey, setHoverImageKey] = useState<BlockId | null>(null)
  const HISTORY_LIMIT = 50
  const TEXT_CACHE_LIMIT = 5000
  const LAYOUT_CHANGE_DEBOUNCE_MS = 120
  const TOUCH_LONG_PRESS_MS = 180
  const TOUCH_CANCEL_DISTANCE_PX = 10
  const PERF_SAMPLE_LIMIT = 160
  const PERF_LOG_INTERVAL_MS = 10000

  const makeCachedValue = useCallback(
    <T,>(cache: Map<string, T>, key: string, compute: () => T): T => {
      const existing = cache.get(key)
      if (existing !== undefined) return existing
      const value = compute()
      cache.set(key, value)
      if (cache.size > TEXT_CACHE_LIMIT) cache.clear()
      return value
    },
    [],
  )

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

  useEffect(() => {
    if (!showTypography || typeof document === "undefined" || !("fonts" in document)) return

    let cancelled = false
    const fontFaceSet = document.fonts
    const specs = new Set<string>()
    for (const key of blockOrder) {
      const styleKey = getStyleKeyForBlock(key)
      const style = result.typography.styles[styleKey]
      if (!style) continue
      const fontFamily = getBlockFont(key)
      const fontWeight = isBlockBold(key) ? "700" : "400"
      const fontStyle = isBlockItalic(key) ? "italic" : "normal"
      const fontSize = getBlockFontSize(key, styleKey) * scale
      specs.add(`${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`)
    }

    if (!specs.size) return

    void Promise
      .allSettled([...specs].map((spec) => fontFaceSet.load(spec)))
      .then(() => {
        if (cancelled) return
        measureWidthCacheRef.current.clear()
        wrapTextCacheRef.current.clear()
        opticalOffsetCacheRef.current.clear()
        setFontRenderEpoch((value) => value + 1)
      })

    return () => {
      cancelled = true
    }
  }, [
    blockOrder,
    getBlockFont,
    getBlockFontSize,
    getStyleKeyForBlock,
    isBlockBold,
    isBlockItalic,
    result.typography.styles,
    scale,
    showTypography,
  ])

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

  const getMeasuredTextWidth = useCallback((ctx: CanvasRenderingContext2D, text: string): number => {
    const key = `${ctx.font}::${text}`
    return makeCachedValue(measureWidthCacheRef.current, key, () => ctx.measureText(text).width)
  }, [makeCachedValue])

  const getWrappedText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
  ): string[] => {
    const key = `${ctx.font}::${maxWidth.toFixed(4)}::${hyphenate ? 1 : 0}::${text}`
    const cached = makeCachedValue(wrapTextCacheRef.current, key, () =>
      wrapText(text, maxWidth, hyphenate, (sample) => getMeasuredTextWidth(ctx, sample)),
    )
    return [...cached]
  }, [getMeasuredTextWidth, makeCachedValue])

  const getOpticalOffset = useCallback((
    ctx: CanvasRenderingContext2D,
    line: string,
    align: TextAlignMode,
    fontSize: number,
  ): number => {
    const key = `${ctx.font}::${line}::${align}::${fontSize.toFixed(4)}`
    return makeCachedValue(opticalOffsetCacheRef.current, key, () =>
      getOpticalMarginAnchorOffset({
        line,
        align,
        fontSize,
        measureWidth: (sample) => getMeasuredTextWidth(ctx, sample),
      }),
    )
  }, [getMeasuredTextWidth, makeCachedValue])

  const getAutoFitForPlacement = useCallback(({
    key,
    text,
    styleKey,
    rowSpan,
    reflow,
    syllableDivision,
    baselineMultiplierOverride,
    position,
  }: {
      key: BlockId
      text: string
    styleKey: TypographyStyleKey
    rowSpan: number
    reflow: boolean
    syllableDivision: boolean
    baselineMultiplierOverride?: number
    position?: ModulePosition | null
  }): { span: number; position: ModulePosition | null } | null => {
    if (!reflow) return null
    const trimmed = text.trim()
    if (!trimmed) return null
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const style = result.typography.styles[styleKey]
    if (!style) return null

    const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
    const metrics = getGridMetrics()
    const baselinePx = gridUnit * scale
    const baselineMultiplier = (typeof baselineMultiplierOverride === "number" && Number.isFinite(baselineMultiplierOverride) && baselineMultiplierOverride > 0)
      ? baselineMultiplierOverride
      : style.baselineMultiplier
    const lineStep = baselineMultiplier * baselinePx
    const startRowIndex = position
      ? Math.max(0, Math.min(result.settings.gridRows - 1, findNearestAxisIndex(metrics.rowStartBaselines, position.row)))
      : 0
    const moduleHeightPx = sumAxisSpan(metrics.moduleHeights, startRowIndex, rowSpan, gridMarginVertical) * scale
    let maxLinesPerColumn = Math.max(1, Math.floor(moduleHeightPx / lineStep))

    if (position) {
      const contentTop = margins.top * scale
      const baselineOriginTop = contentTop - baselinePx
      const originY = baselineOriginTop + position.row * baselinePx
      const pageBottomY = result.pageSizePt.height * scale - margins.bottom * scale
      const firstLineTop = originY + baselinePx
      const availableByPage = Math.max(0, Math.floor((pageBottomY - firstLineTop) / lineStep) + 1)
      maxLinesPerColumn = Math.min(maxLinesPerColumn, availableByPage)
    }
    if (maxLinesPerColumn <= 0) return null

    const fontSize = getBlockFontSize(key, styleKey) * scale
    const fontFamily = getBlockFont(key)
    const fontWeight = isBlockBold(key) ? "700" : "400"
    const fontStyle = isBlockItalic(key) ? "italic " : ""
    ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${getFontFamilyCss(fontFamily)}`
    const startCol = position
      ? Math.max(0, Math.min(result.settings.gridCols - 1, position.col))
      : 0
    const columnWidth = sumAxisSpan(metrics.moduleWidths, startCol, 1, gridMarginHorizontal) * scale
    const lines = getWrappedText(ctx, trimmed, columnWidth, syllableDivision)
    const neededCols = Math.max(1, Math.ceil(lines.length / maxLinesPerColumn))

    const maxColsFromPlacement = position
      ? Math.max(1, result.settings.gridCols - Math.max(0, Math.min(result.settings.gridCols - 1, position.col)))
      : result.settings.gridCols
    const nextSpan = Math.max(1, Math.min(neededCols, maxColsFromPlacement))
    const nextPosition = position
      ? {
          col: Math.max(0, Math.min(Math.max(0, result.settings.gridCols - nextSpan), position.col)),
          row: position.row,
        }
      : null

    return { span: nextSpan, position: nextPosition }
  }, [
    getBlockFontSize,
    getBlockFont,
    getWrappedText,
    isBlockBold,
    isBlockItalic,
    getGridMetrics,
    result.grid,
    result.pageSizePt.height,
    result.settings.gridCols,
    result.settings.gridRows,
    result.typography.styles,
    scale,
  ])

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

  const applyDragDrop = useCallback((drag: DragState, nextPreview: ModulePosition, copyOnDrop: boolean) => {
    if (isImagePlaceholderKey(drag.key)) {
      const sourceColumns = getImageSpan(drag.key)
      const sourceRows = getImageRows(drag.key)
      const sourceColor = getImageColorReference(drag.key)
      const metrics = getGridMetrics()
      const minCol = -Math.max(0, sourceColumns - 1)
      const minRow = -Math.max(0, metrics.maxBaselineRow)
      const resolvedPosition = {
        col: Math.max(minCol, Math.min(Math.max(0, result.settings.gridCols - 1), nextPreview.col)),
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
      const maxParagraphCount = result.settings.gridCols * result.settings.gridRows
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
      const nextSpan = sourceSpan
      const metrics = getGridMetrics()
      const minCol = -Math.max(0, nextSpan - 1)
      const minRow = -Math.max(0, metrics.maxBaselineRow)
      const resolvedPosition = {
        col: Math.max(minCol, Math.min(Math.max(0, result.settings.gridCols - 1), nextPreview.col)),
        row: Math.max(minRow, Math.min(metrics.maxBaselineRow, nextPreview.row)),
      }
      const newKey = getNextCustomBlockId()

      recordHistoryBeforeChange()
      setBlockCollections((current) => {
        const sourceIndex = current.blockOrder.indexOf(drag.key)
        const nextOrder = [...current.blockOrder]
        if (sourceIndex >= 0) nextOrder.splice(sourceIndex + 1, 0, newKey)
        else nextOrder.push(newKey)

        const sourceFont = current.blockFontFamilies[drag.key] ?? baseFont
        const nextFonts = { ...current.blockFontFamilies }
        if (sourceFont === baseFont) {
          delete nextFonts[newKey]
        } else {
          nextFonts[newKey] = sourceFont
        }
        const nextItalic = { ...current.blockItalic }
        if (current.blockItalic[drag.key] === true || current.blockItalic[drag.key] === false) {
          nextItalic[newKey] = current.blockItalic[drag.key]
        } else {
          delete nextItalic[newKey]
        }
        const nextBold = { ...current.blockBold }
        if (current.blockBold[drag.key] === true || current.blockBold[drag.key] === false) {
          nextBold[newKey] = current.blockBold[drag.key]
        } else {
          delete nextBold[newKey]
        }
        const nextRotations = { ...current.blockRotations }
        const sourceRotation = current.blockRotations[drag.key]
        if (typeof sourceRotation === "number" && Number.isFinite(sourceRotation) && Math.abs(sourceRotation) > 0.001) {
          nextRotations[newKey] = clampRotation(sourceRotation)
        } else {
          delete nextRotations[newKey]
        }

        return {
          ...current,
          blockOrder: nextOrder,
          textContent: {
            ...current.textContent,
            [newKey]: current.textContent[drag.key] ?? "",
          },
          blockTextEdited: {
            ...current.blockTextEdited,
            [newKey]: current.blockTextEdited[drag.key] ?? true,
          },
          styleAssignments: {
            ...current.styleAssignments,
            [newKey]: styleKey,
          },
          blockFontFamilies: nextFonts,
          blockBold: nextBold,
          blockItalic: nextItalic,
          blockRotations: nextRotations,
          blockColumnSpans: {
            ...current.blockColumnSpans,
            [newKey]: nextSpan,
          },
          blockRowSpans: {
            ...current.blockRowSpans,
            [newKey]: sourceRows,
          },
          blockTextAlignments: {
            ...current.blockTextAlignments,
            [newKey]: current.blockTextAlignments[drag.key] ?? "left",
          },
          blockTextReflow: {
            ...current.blockTextReflow,
            [newKey]: sourceReflow,
          },
          blockSyllableDivision: {
            ...current.blockSyllableDivision,
            [newKey]: sourceSyllableDivision,
          },
          blockModulePositions: {
            ...current.blockModulePositions,
            [newKey]: resolvedPosition,
          },
        }
      })
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
        if (isImagePlaceholderColor(sourceTextColor)) {
          next[newKey] = sourceTextColor
        } else {
          delete next[newKey]
        }
        return next
      })
      onSelectLayer?.(newKey)
    } else {
      recordHistoryBeforeChange()
      const span = getBlockSpan(drag.key)
      const metrics = getGridMetrics()
      const minCol = -Math.max(0, span - 1)
      const minRow = -Math.max(0, metrics.maxBaselineRow)
      setBlockModulePositions((current) => ({
        ...current,
        [drag.key]: {
          col: Math.max(minCol, Math.min(Math.max(0, result.settings.gridCols - 1), nextPreview.col)),
          row: Math.max(minRow, Math.min(metrics.maxBaselineRow, nextPreview.row)),
        },
      }))
    }
  }, [
    baseFont,
    blockCustomLeadings,
    blockTextColors,
    blockCustomSizes,
    blockOrder,
    getBlockRows,
    getBlockSpan,
    getImageColorReference,
    getImageRows,
    getImageSpan,
    getGridMetrics,
    getStyleKeyForBlock,
    isImagePlaceholderKey,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    onRequestNotice,
    onSelectLayer,
    recordHistoryBeforeChange,
    result.settings.gridCols,
    result.settings.gridRows,
    insertImagePlaceholder,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockTextColors,
    setBlockCustomSizes,
    setImageModulePositions,
    setBlockModulePositions,
    textContent,
  ])

  const draggableModulePositions = useMemo(
    () => ({
      ...blockModulePositions,
      ...imageModulePositions,
    }),
    [blockModulePositions, imageModulePositions],
  )

  const clearHover = useCallback(() => {
    setHoverState(null)
    setHoverImageKey(null)
  }, [])

  const {
    dragState,
    setDragState,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
  } = usePreviewDrag<BlockId>({
    showTypography,
    isEditorOpen: Boolean(editorState || imageEditorState),
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
    touchLongPressMs: TOUCH_LONG_PRESS_MS,
    touchCancelDistancePx: TOUCH_CANCEL_DISTANCE_PX,
    dragEndedAtRef,
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
  }, [clearHover, historyResetToken, resetHistory, resetImageTransientState, setDragState, setEditorState])

  useEffect(() => {
    if (paragraphColorResetToken === lastParagraphColorResetTokenRef.current) return
    lastParagraphColorResetTokenRef.current = paragraphColorResetToken
    const hasCustomParagraphColors = Object.keys(blockTextColors).length > 0
    const nextImageColors = imageOrder.reduce((acc, key) => {
      acc[key] = getClosestImageSchemeColorToken(imageColors[key] ?? defaultImageColor, imageColorScheme)
      return acc
    }, {} as Partial<Record<BlockId, string>>)
    const hasCustomImageColors = imageOrder.some((key) => nextImageColors[key] !== imageColors[key])
      || Object.keys(imageColors).some((key) => !imageOrder.includes(key))
    setEditorState((prev) => {
      if (!prev) return prev
      if (prev.draftColor.toLowerCase() === defaultTextColor.toLowerCase()) return prev
      return { ...prev, draftColor: defaultTextColor }
    })
    if (!hasCustomParagraphColors && !hasCustomImageColors) return
    recordHistoryBeforeChange()
    if (hasCustomParagraphColors) {
      setBlockTextColors({})
    }
    if (hasCustomImageColors) {
      setImageColors(nextImageColors)
    }
  }, [
    blockTextColors,
    defaultImageColor,
    defaultTextColor,
    imageColorScheme,
    imageColors,
    imageOrder,
    paragraphColorResetToken,
    recordHistoryBeforeChange,
    setBlockTextColors,
    setEditorState,
    setImageColors,
  ])

  useInitialLayoutHydration<TypographyStyleKey, BlockId>({
    initialLayout,
    initialLayoutToken,
    lastAppliedLayoutTokenRef: lastAppliedLayoutKeyRef,
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
  }, [applyImageSnapshot, initialLayout, initialLayoutToken])

  useEffect(() => {
    if (!initialLayout || initialLayoutToken === 0) return
    if (lastAppliedLayerLayoutKeyRef.current === initialLayoutToken) return
    lastAppliedLayerLayoutKeyRef.current = initialLayoutToken
    applyLayerOrderSnapshot(initialLayout)
  }, [applyLayerOrderSnapshot, initialLayout, initialLayoutToken])

  useEffect(() => {
    if (!initialLayout || initialLayoutToken === 0) return
    if (lastAppliedCustomSizeLayoutKeyRef.current === initialLayoutToken) return
    lastAppliedCustomSizeLayoutKeyRef.current = initialLayoutToken
    applyCustomSizeSnapshot(initialLayout)
  }, [applyCustomSizeSnapshot, initialLayout, initialLayoutToken])

  useEffect(() => {
    if (!requestedLayerOrder || requestedLayerOrderToken === 0) return
    if (lastAppliedLayerRequestKeyRef.current === requestedLayerOrderToken) return
    lastAppliedLayerRequestKeyRef.current = requestedLayerOrderToken
    const nextLayerOrder = reconcileLayerOrder(requestedLayerOrder, blockOrder, imageOrder)
    if (areLayerOrdersEqual(layerOrder, nextLayerOrder)) return
    recordHistoryBeforeChange()
    setLayerOrder(nextLayerOrder)
  }, [blockOrder, imageOrder, layerOrder, recordHistoryBeforeChange, requestedLayerOrder, requestedLayerOrderToken, setLayerOrder])
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

  const handlePreviewPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    onSelectLayer?.(resolveSelectedLayerAtClientPoint(event.clientX, event.clientY))
    handleCanvasPointerDown(event)
  }, [handleCanvasPointerDown, onSelectLayer, resolveSelectedLayerAtClientPoint])

  useEffect(() => {
    const canvas = staticCanvasRef.current
    if (!canvas) return

    const frame = window.requestAnimationFrame(() => {
      const markName = "sgg:guides"
      if (typeof performance.mark === "function") performance.mark(`${markName}:start`)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const cssWidth = canvas.width / pixelRatio
      const cssHeight = canvas.height / pixelRatio
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      renderStaticGuides({
        ctx,
        canvasWidth: cssWidth,
        canvasHeight: cssHeight,
        result,
        scale,
        rotation,
        backgroundColor: canvasBackground,
        showMargins,
        showModules,
        showBaselines,
        isMobile,
      })
      if (typeof performance.mark === "function" && typeof performance.measure === "function") {
        performance.mark(`${markName}:end`)
        try {
          performance.measure(markName, `${markName}:start`, `${markName}:end`)
        } catch {
          // Ignore missing/invalid marks.
        }
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [canvasBackground, isMobile, pixelRatio, result, rotation, scale, showBaselines, showMargins, showModules])

  useEffect(() => {
    const canvas = imageCanvasRef.current
    if (!canvas) return

    const frame = window.requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const cssWidth = canvas.width / pixelRatio
      const cssHeight = canvas.height / pixelRatio
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, cssWidth, cssHeight)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pixelRatio])

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

  useEffect(() => {
    const calculateScale = () => {
      const container = previewContainerRef.current
      if (!container) return

      const { width, height } = result.pageSizePt
      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40

      const nextScale = Math.min(containerWidth / width, containerHeight / height)
      setScale((prev) => (Math.abs(prev - nextScale) < 0.0001 ? prev : nextScale))
    }

    calculateScale()
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(calculateScale)
      : null
    if (observer && previewContainerRef.current) observer.observe(previewContainerRef.current)
    window.addEventListener("resize", calculateScale)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", calculateScale)
    }
  }, [result])

  useEffect(() => {
    const readDevicePixelRatio = () => Math.max(1, window.devicePixelRatio || 1)
    const applyDevicePixelRatio = () => {
      const nextRatio = readDevicePixelRatio()
      setPixelRatio((prev) => (Math.abs(prev - nextRatio) < 0.01 ? prev : nextRatio))
    }

    applyDevicePixelRatio()
    let mediaQuery = window.matchMedia(`(resolution: ${readDevicePixelRatio()}dppx)`)
    const handleDprChange = () => {
      applyDevicePixelRatio()
      mediaQuery.removeEventListener("change", handleDprChange)
      mediaQuery = window.matchMedia(`(resolution: ${readDevicePixelRatio()}dppx)`)
      mediaQuery.addEventListener("change", handleDprChange)
    }

    mediaQuery.addEventListener("change", handleDprChange)
    window.addEventListener("resize", applyDevicePixelRatio)
    window.addEventListener("orientationchange", applyDevicePixelRatio)
    window.visualViewport?.addEventListener("resize", applyDevicePixelRatio)
    return () => {
      mediaQuery.removeEventListener("change", handleDprChange)
      window.removeEventListener("resize", applyDevicePixelRatio)
      window.removeEventListener("orientationchange", applyDevicePixelRatio)
      window.visualViewport?.removeEventListener("resize", applyDevicePixelRatio)
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

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

  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < 250) return
    const pagePoint = toPagePointFromClient(event.clientX, event.clientY)
    if (!pagePoint) return

    const textKey = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (textKey) {
      setImageEditorState(null)
      handleTextCanvasDoubleClick(event)
      return
    }

    if (!showImagePlaceholders) {
      setImageEditorState(null)
      handleTextCanvasDoubleClick(event)
      return
    }

    const imageKey = findTopmostImageAtPoint(pagePoint.x, pagePoint.y)
    if (imageKey) {
      openImageEditor(imageKey)
      return
    }

    if (!(event.shiftKey || event.ctrlKey)) {
      setImageEditorState(null)
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
    dragEndedAtRef,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    handleTextCanvasDoubleClick,
    insertImagePlaceholder,
    openImageEditor,
    recordHistoryBeforeChange,
    resolveModulePositionAtPagePoint,
    setImageEditorState,
    showImagePlaceholders,
    showTypography,
    toPagePointFromClient,
  ])

  usePreviewLayoutEmission({
    buildSnapshot,
    debounceMs: LAYOUT_CHANGE_DEBOUNCE_MS,
    onLayoutChange,
  })

  const pageWidthCss = result.pageSizePt.width * scale
  const pageHeightCss = result.pageSizePt.height * scale
  const pageWidthPx = Math.max(1, Math.round(pageWidthCss * pixelRatio))
  const pageHeightPx = Math.max(1, Math.round(pageHeightCss * pixelRatio))

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
  const inlineEditorLayout = editorState ? (() => {
    const rect = blockRectsRef.current[editorState.target]
    if (!rect) return null
    const plan = previousPlansRef.current.get(editorState.target)
    const textAscent = plan?.commands[0]
      ? Math.max(0, plan.commands[0].y - ((plan?.rotationOriginY ?? rect.y) + result.grid.gridUnit * scale))
      : result.grid.gridUnit * scale
    return {
      rect,
      blockRotation: plan?.blockRotation ?? editorState.draftRotation,
      rotationOriginX: plan?.rotationOriginX ?? rect.x,
      rotationOriginY: plan?.rotationOriginY ?? rect.y,
      textAscent,
      textAlign: plan?.textAlign ?? editorState.draftAlign,
      commands: plan?.commands ?? [],
    }
  })() : null

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
        textEditorControls={editorState ? {
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
        } : null}
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
