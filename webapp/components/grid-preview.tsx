"use client"

import { Button } from "@/components/ui/button"
import { FontSelect } from "@/components/ui/font-select"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GridResult } from "@/lib/grid-calculator"
import { getOpticalMarginAnchorOffset } from "@/lib/optical-margin"
import { renderStaticGuides } from "@/lib/render-static-guides"
import type { HelpSectionId } from "@/lib/help-registry"
import { usePreviewDrag } from "@/hooks/usePreviewDrag"
import type { DragState as PreviewDragState } from "@/hooks/usePreviewDrag"
import { usePreviewHistory } from "@/hooks/usePreviewHistory"
import { useLayoutSnapshot } from "@/hooks/useLayoutSnapshot"
import { useLayoutReflow } from "@/hooks/useLayoutReflow"
import { useInitialLayoutHydration } from "@/hooks/useInitialLayoutHydration"
import { useTypographyRenderer } from "@/hooks/useTypographyRenderer"
import { usePreviewKeyboard } from "@/hooks/usePreviewKeyboard"
import { useBlockEditorActions } from "@/hooks/useBlockEditorActions"
import { useStateCommands } from "@/hooks/useStateCommands"
import type { Updater } from "@/hooks/useStateCommands"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { wrapText, getDefaultColumnSpan } from "@/lib/text-layout"
import {
  computeAutoFitBatch,
  type AutoFitPlannerInput,
} from "@/lib/autofit-planner"
import {
  computeReflowPlan as computeReflowPlanPure,
  createReflowPlanSignature,
  type ReflowPlan as PlannerReflowPlan,
  type ReflowPlannerInput,
} from "@/lib/reflow-planner"
import {
  DEFAULT_BASE_FONT,
  FONT_OPTIONS,
  getFontFamilyCss,
  isFontFamily,
  type FontFamily,
} from "@/lib/config/fonts"
import { useWorkerBridge } from "@/hooks/useWorkerBridge"
import { AlignLeft, AlignRight, Bold, CaseSensitive, Columns3, Italic, RotateCw, Rows3, Save as SaveIcon, Trash2, Type } from "lucide-react"
import { ReactNode, memo, useCallback, useEffect, useRef, useState } from "react"

type BlockId = string
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type TextAlignMode = "left" | "right"

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
  textAlign: TextAlignMode
  blockRotation: number
  commands: TextDrawCommand[]
}

type ReflowPlan = PlannerReflowPlan
type PerfMetricName = "drawMs" | "reflowMs" | "autofitMs"

type PerfSnapshot = {
  timestamp: number
  sampleCount: number
  p50: number
  p95: number
  avg: number
}

type PerfState = {
  drawMs: number[]
  reflowMs: number[]
  autofitMs: number[]
  lastLogAt: number
}

type ModulePosition = {
  col: number
  row: number
}

type DragState = PreviewDragState<BlockId>
type EditorState = {
  target: BlockId
  draftText: string
  draftStyle: TypographyStyleKey
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
  blockOrder: BlockId[]
  textContent: Record<BlockId, string>
  blockTextEdited: Record<BlockId, boolean>
  styleAssignments: Record<BlockId, TypographyStyleKey>
  blockModulePositions: Partial<Record<BlockId, ModulePosition>>
  blockColumnSpans: Partial<Record<BlockId, number>>
  blockRowSpans: Partial<Record<BlockId, number>>
  blockTextAlignments: Partial<Record<BlockId, TextAlignMode>>
  blockTextReflow: Partial<Record<BlockId, boolean>>
  blockSyllableDivision: Partial<Record<BlockId, boolean>>
  blockFontFamilies: Partial<Record<BlockId, FontFamily>>
  blockBold: Partial<Record<BlockId, boolean>>
  blockItalic: Partial<Record<BlockId, boolean>>
  blockRotations: Partial<Record<BlockId, number>>
}

type HoverState = {
  key: BlockId
  canvasX: number
  canvasY: number
}

function computePerfSnapshot(values: number[]): PerfSnapshot | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]
  const sum = sorted.reduce((acc, value) => acc + value, 0)
  return {
    timestamp: Date.now(),
    sampleCount: sorted.length,
    p50: pick(0.5),
    p95: pick(0.95),
    avg: sum / sorted.length,
  }
}

const BASE_BLOCK_IDS = ["display", "headline", "subhead", "body", "caption"] as const
type BaseBlockId = typeof BASE_BLOCK_IDS[number]

const DEFAULT_TEXT_CONTENT: Record<BaseBlockId, string> = {
  display: "Swiss Design",
  headline: "Modular Grid Systems",
  subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
  body: "The modular grid allows designers to organize content with clarity and purpose. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide contrast and emphasis while preserving coherence across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet unified systems.",
  caption: "Based on Müller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
}

const DEFAULT_STYLE_ASSIGNMENTS: Record<BaseBlockId, TypographyStyleKey> = {
  display: "display",
  headline: "headline",
  subhead: "subhead",
  body: "body",
  caption: "caption",
}

const getDefaultTextContent = (): Record<BlockId, string> => ({ ...DEFAULT_TEXT_CONTENT })
const getDefaultStyleAssignments = (): Record<BlockId, TypographyStyleKey> => ({ ...DEFAULT_STYLE_ASSIGNMENTS })
const isBaseBlockId = (key: string): key is BaseBlockId => (BASE_BLOCK_IDS as readonly string[]).includes(key)
const getNextCustomBlockId = () => `paragraph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function createInitialBlockCollectionsState(): BlockCollectionsState {
  return {
    blockOrder: [...BASE_BLOCK_IDS],
    textContent: getDefaultTextContent(),
    blockTextEdited: BASE_BLOCK_IDS.reduce((acc, key) => {
      acc[key] = true
      return acc
    }, {} as Record<BlockId, boolean>),
    styleAssignments: getDefaultStyleAssignments(),
    blockModulePositions: {},
    blockColumnSpans: {},
    blockRowSpans: {},
    blockTextAlignments: {},
    blockTextReflow: {},
    blockSyllableDivision: {},
    blockFontFamilies: {},
    blockBold: {},
    blockItalic: {},
    blockRotations: {},
  }
}

const STYLE_OPTIONS: Array<{ value: TypographyStyleKey; label: string }> = [
  { value: "display", label: "Display" },
  { value: "headline", label: "Headline" },
  { value: "subhead", label: "Subhead" },
  { value: "body", label: "Body" },
  { value: "caption", label: "Caption" },
]

const DUMMY_TEXT_BY_STYLE: Record<TypographyStyleKey, string> = {
  display: "Swiss Design",
  headline: "Modular Grid Systems",
  subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
  body: "The modular grid allows designers to organize content with clarity and purpose. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide contrast and emphasis while preserving coherence across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet unified systems.",
  caption: "Based on Müller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
}

function formatPtSize(size: number): string {
  return Number.isInteger(size) ? `${size}pt` : `${size.toFixed(1)}pt`
}

function EditorControlTooltip({
  label,
  children,
  className = "",
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <HoverTooltip
      label={label}
      className={`inline-flex ${className}`.trim()}
      tooltipClassName="-top-8 left-1/2 -translate-x-1/2 whitespace-nowrap border-gray-300 bg-white text-gray-700 transition-all duration-75 group-hover:-translate-y-0.5 group-focus-within:-translate-y-0.5"
    >
      {children}
    </HoverTooltip>
  )
}

function getDummyTextForStyle(style: TypographyStyleKey): string {
  return DUMMY_TEXT_BY_STYLE[style] ?? DUMMY_TEXT_BY_STYLE.body
}

interface GridPreviewProps {
  result: GridResult
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showTypography: boolean
  initialLayout?: PreviewLayoutState | null
  initialLayoutKey?: number
  rotation?: number
  undoNonce?: number
  redoNonce?: number
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  onLayoutChange?: (layout: PreviewLayoutState) => void
  onRequestGridRestore?: (cols: number, rows: number) => void
  onHistoryAvailabilityChange?: (canUndo: boolean, canRedo: boolean) => void
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  showEditorHelpIcon?: boolean
  baseFont?: FontFamily
  isDarkMode?: boolean
}

type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

export const GridPreview = memo(function GridPreview({
  result,
  showBaselines,
  showModules,
  showMargins,
  showTypography,
  initialLayout = null,
  initialLayoutKey = 0,
  rotation = 0,
  undoNonce = 0,
  redoNonce = 0,
  onCanvasReady,
  onLayoutChange,
  onRequestGridRestore,
  onHistoryAvailabilityChange,
  onOpenHelpSection,
  showEditorHelpIcon = false,
  baseFont = DEFAULT_BASE_FONT,
  isDarkMode = false,
}: GridPreviewProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRectsRef = useRef<Record<BlockId, BlockRect>>({})
  const lastAppliedLayoutKeyRef = useRef(0)
  const suppressReflowCheckRef = useRef(false)
  const measureWidthCacheRef = useRef<Map<string, number>>(new Map())
  const wrapTextCacheRef = useRef<Map<string, string[]>>(new Map())
  const opticalOffsetCacheRef = useRef<Map<string, number>>(new Map())
  const typographyBufferRef = useRef<HTMLCanvasElement | null>(null)
  const previousPlansRef = useRef<Map<BlockId, BlockRenderPlan>>(new Map())
  const typographyBufferTransformRef = useRef("")
  const reflowPlanCacheRef = useRef<Map<string, ReflowPlan>>(new Map())
  const onLayoutChangeDebounceRef = useRef<number | null>(null)
  const pendingLayoutEmissionRef = useRef<PreviewLayoutState | null>(null)
  const mouseMoveRafRef = useRef<number | null>(null)
  const perfStateRef = useRef<PerfState>({
    drawMs: [],
    reflowMs: [],
    autofitMs: [],
    lastLogAt: 0,
  })

  const [scale, setScale] = useState(1)
  const [pixelRatio, setPixelRatio] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const {
    state: blockCollectionsState,
    merge: setBlockCollections,
    setField: setBlockCollectionField,
  } = useStateCommands<BlockCollectionsState>(
    createInitialBlockCollectionsState,
  )
  const {
    blockOrder,
    textContent,
    blockTextEdited,
    styleAssignments,
    blockModulePositions,
    blockColumnSpans,
    blockRowSpans,
    blockTextAlignments,
    blockTextReflow,
    blockSyllableDivision,
    blockFontFamilies,
    blockBold,
    blockItalic,
    blockRotations,
  } = blockCollectionsState
  const [hoverState, setHoverState] = useState<HoverState | null>(null)
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const HISTORY_LIMIT = 50
  const TEXT_CACHE_LIMIT = 5000
  const REFLOW_PLAN_CACHE_LIMIT = 200
  const LAYOUT_CHANGE_DEBOUNCE_MS = 120
  const TOUCH_LONG_PRESS_MS = 180
  const TOUCH_CANCEL_DISTANCE_PX = 10
  const PERF_SAMPLE_LIMIT = 160
  const PERF_LOG_INTERVAL_MS = 10000
  const PERF_ENABLED = process.env.NODE_ENV !== "production"

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

  const setBlockOrder = useCallback((next: Updater<BlockId[]>) => {
    setBlockCollectionField("blockOrder", next)
  }, [setBlockCollectionField])

  const setTextContent = useCallback((next: Updater<Record<BlockId, string>>) => {
    setBlockCollectionField("textContent", next)
  }, [setBlockCollectionField])

  const setBlockTextEdited = useCallback((next: Updater<Record<BlockId, boolean>>) => {
    setBlockCollectionField("blockTextEdited", next)
  }, [setBlockCollectionField])

  const setStyleAssignments = useCallback((next: Updater<Record<BlockId, TypographyStyleKey>>) => {
    setBlockCollectionField("styleAssignments", next)
  }, [setBlockCollectionField])

  const setBlockColumnSpans = useCallback((next: Updater<Partial<Record<BlockId, number>>>) => {
    setBlockCollectionField("blockColumnSpans", next)
  }, [setBlockCollectionField])

  const setBlockTextAlignments = useCallback((next: Updater<Partial<Record<BlockId, TextAlignMode>>>) => {
    setBlockCollectionField("blockTextAlignments", next)
  }, [setBlockCollectionField])

  const setBlockModulePositions = useCallback((next: Updater<Partial<Record<BlockId, ModulePosition>>>) => {
    setBlockCollectionField("blockModulePositions", next)
  }, [setBlockCollectionField])

  const recordPerfMetric = useCallback((metric: PerfMetricName, valueMs: number) => {
    if (!PERF_ENABLED || !Number.isFinite(valueMs)) return
    const state = perfStateRef.current
    const bucket = state[metric]
    bucket.push(valueMs)
    if (bucket.length > PERF_SAMPLE_LIMIT) bucket.shift()
    const now = Date.now()
    if (now - state.lastLogAt < PERF_LOG_INTERVAL_MS) return
    state.lastLogAt = now
    const draw = computePerfSnapshot(state.drawMs)
    const reflow = computePerfSnapshot(state.reflowMs)
    const autofit = computePerfSnapshot(state.autofitMs)
    const payload = { draw, reflow, autofit }
    ;(window as unknown as { __sggPerf?: typeof payload }).__sggPerf = payload
    console.debug("[SGG perf]", payload)
  }, [PERF_ENABLED, PERF_LOG_INTERVAL_MS, PERF_SAMPLE_LIMIT])

  const getBlockSpan = useCallback((key: BlockId) => {
    const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, result.settings.gridCols)
    return Math.max(1, Math.min(result.settings.gridCols, raw))
  }, [blockColumnSpans, result.settings.gridCols])

  const getBlockRows = useCallback((key: BlockId) => {
    const raw = blockRowSpans[key] ?? 1
    return Math.max(1, Math.min(result.settings.gridRows, raw))
  }, [blockRowSpans, result.settings.gridRows])

  const getStyleKeyForBlock = useCallback((key: BlockId): TypographyStyleKey => {
    const assigned = styleAssignments[key]
    if (assigned === "display" || assigned === "headline" || assigned === "subhead" || assigned === "body" || assigned === "caption") {
      return assigned
    }
    return isBaseBlockId(key) ? DEFAULT_STYLE_ASSIGNMENTS[key] : "body"
  }, [styleAssignments])

  const isTextReflowEnabled = useCallback((key: BlockId) => {
    return blockTextReflow[key] ?? false
  }, [blockTextReflow])

  const isSyllableDivisionEnabled = useCallback((key: BlockId) => {
    if (blockSyllableDivision[key] !== undefined) return blockSyllableDivision[key] === true
    return key === "body" || key === "caption"
  }, [blockSyllableDivision])

  const getBlockFont = useCallback((key: BlockId): FontFamily => {
    return blockFontFamilies[key] ?? baseFont
  }, [baseFont, blockFontFamilies])

  const getStyleForBlock = useCallback((key: BlockId) => {
    const styleKey = getStyleKeyForBlock(key)
    return result.typography.styles[styleKey]
  }, [getStyleKeyForBlock, result.typography.styles])

  const getStyleDefaultBold = useCallback((key: BlockId): boolean => {
    return getStyleForBlock(key)?.weight === "Bold"
  }, [getStyleForBlock])

  const getStyleDefaultItalic = useCallback((key: BlockId): boolean => {
    return getStyleForBlock(key)?.blockItalic === true
  }, [getStyleForBlock])

  const isBlockBold = useCallback((key: BlockId): boolean => {
    const override = blockBold[key]
    if (override === true || override === false) return override
    return getStyleDefaultBold(key)
  }, [blockBold, getStyleDefaultBold])

  const isBlockItalic = useCallback((key: BlockId): boolean => {
    const override = blockItalic[key]
    if (override === true || override === false) return override
    return getStyleDefaultItalic(key)
  }, [blockItalic, getStyleDefaultItalic])

  const getBlockRotation = useCallback((key: BlockId): number => {
    const raw = blockRotations[key]
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 0
    return Math.max(-80, Math.min(80, raw))
  }, [blockRotations])

  const { buildSnapshot, applySnapshot } = useLayoutSnapshot<
    BlockId,
    TypographyStyleKey,
    FontFamily,
    TextAlignMode,
    ModulePosition,
    PreviewLayoutState
  >({
    state: blockCollectionsState,
    gridCols: result.settings.gridCols,
    baseFont,
    getDefaultColumnSpan,
    getBlockRows,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isBlockBold,
    isBlockItalic,
    getBlockRotation,
    isFontFamily,
    toSnapshot: (value) => value as PreviewLayoutState,
    fromSnapshot: (snapshot) => ({
      blockOrder: [...snapshot.blockOrder],
      textContent: { ...snapshot.textContent },
      blockTextEdited: { ...snapshot.blockTextEdited },
      styleAssignments: { ...snapshot.styleAssignments },
      blockFontFamilies: { ...(snapshot.blockFontFamilies ?? {}) },
      blockBold: { ...(snapshot.blockBold ?? {}) },
      blockItalic: { ...(snapshot.blockItalic ?? {}) },
      blockRotations: { ...(snapshot.blockRotations ?? {}) },
      blockColumnSpans: { ...snapshot.blockColumnSpans },
      blockRowSpans: { ...(snapshot.blockRowSpans ?? {}) },
      blockTextAlignments: { ...snapshot.blockTextAlignments },
      blockTextReflow: { ...(snapshot.blockTextReflow ?? {}) },
      blockSyllableDivision: { ...(snapshot.blockSyllableDivision ?? {}) },
      blockModulePositions: { ...snapshot.blockModulePositions },
    }),
    setState: setBlockCollections,
  })

  const {
    pushHistory,
    recordHistoryBeforeChange,
    undo,
    redo,
  } = usePreviewHistory<PreviewLayoutState>({
    historyLimit: HISTORY_LIMIT,
    undoNonce,
    redoNonce,
    buildSnapshot,
    applySnapshot,
    onHistoryAvailabilityChange,
  })

  const getGridMetrics = useCallback(() => {
    const { margins, gridMarginHorizontal, gridMarginVertical, gridUnit } = result.grid
    const { width: modW, height: modH } = result.module
    const { gridCols } = result.settings
    const contentHeight = (result.pageSizePt.height - margins.top - margins.bottom) * scale
    const baselineStep = gridUnit * scale
    const maxBaselineRow = Math.max(0, Math.floor(contentHeight / baselineStep))

    return {
      contentLeft: margins.left * scale,
      contentTop: margins.top * scale,
      moduleWidth: modW * scale,
      moduleHeight: modH * scale,
      xStep: (modW + gridMarginHorizontal) * scale,
      yStep: baselineStep,
      gridCols,
      maxBaselineRow,
      gutterX: gridMarginHorizontal * scale,
      baselineStep,
      baselineOriginTop: margins.top * scale - baselineStep,
      moduleYStep: (modH + gridMarginVertical) * scale,
    }
  }, [result.grid, result.module, result.pageSizePt.height, result.settings, scale])

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

  const toPagePoint = useCallback((canvasX: number, canvasY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const pageWidth = result.pageSizePt.width * scale
    const pageHeight = result.pageSizePt.height * scale
    const centerCanvasX = canvas.width / (2 * pixelRatio)
    const centerCanvasY = canvas.height / (2 * pixelRatio)
    const theta = (rotation * Math.PI) / 180
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    const dx = canvasX - centerCanvasX
    const dy = canvasY - centerCanvasY

    return {
      x: dx * cos + dy * sin + pageWidth / 2,
      y: -dx * sin + dy * cos + pageHeight / 2,
    }
  }, [pixelRatio, result.pageSizePt.height, result.pageSizePt.width, rotation, scale])

  const clampModulePosition = useCallback((position: ModulePosition, key: BlockId): ModulePosition => {
    const metrics = getGridMetrics()
    const span = getBlockSpan(key)
    const maxCol = Math.max(0, metrics.gridCols - span)
    return {
      col: Math.max(0, Math.min(maxCol, position.col)),
      row: Math.max(0, Math.min(metrics.maxBaselineRow, position.row)),
    }
  }, [getBlockSpan, getGridMetrics])

  const snapToModule = useCallback((pageX: number, pageY: number, key: BlockId): ModulePosition => {
    const metrics = getGridMetrics()
    const rawCol = Math.round((pageX - metrics.contentLeft) / metrics.xStep)
    const rowStep = metrics.moduleYStep / metrics.baselineStep
    const moduleIndex = Math.round((pageY - metrics.contentTop) / metrics.moduleYStep)
    const rawRow = moduleIndex * rowStep
    return clampModulePosition({ col: rawCol, row: rawRow }, key)
  }, [clampModulePosition, getGridMetrics])

  const snapToBaseline = useCallback((pageX: number, pageY: number, key: BlockId): ModulePosition => {
    const metrics = getGridMetrics()
    const rawCol = Math.round((pageX - metrics.contentLeft) / metrics.xStep)
    const rawRow = Math.round((pageY - metrics.baselineOriginTop) / metrics.baselineStep)
    return clampModulePosition({ col: rawCol, row: rawRow }, key)
  }, [clampModulePosition, getGridMetrics])

  const findTopmostBlockAtPoint = useCallback((pageX: number, pageY: number): BlockId | null => {
    // Hit-test in reverse draw order so visually top blocks win when overlaps happen.
    for (let index = blockOrder.length - 1; index >= 0; index -= 1) {
      const key = blockOrder[index]
      const block = blockRectsRef.current[key]
      if (!block || block.width <= 0 || block.height <= 0) continue
      if (
        pageX >= block.x
        && pageX <= block.x + block.width
        && pageY >= block.y
        && pageY <= block.y + block.height
      ) {
        return key
      }
    }
    return null
  }, [blockOrder])

  const getAutoFitForPlacement = useCallback(({
    key,
    text,
    styleKey,
    rowSpan,
    reflow,
    syllableDivision,
    position,
  }: {
      key: BlockId
      text: string
    styleKey: TypographyStyleKey
    rowSpan: number
    reflow: boolean
    syllableDivision: boolean
    position?: ModulePosition | null
  }): { span: number; position: ModulePosition | null } | null => {
    if (!reflow) return null
    void key
    const trimmed = text.trim()
    if (!trimmed) return null
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const style = result.typography.styles[styleKey]
    if (!style) return null

    const { margins, gridUnit, gridMarginVertical } = result.grid
    const baselinePx = gridUnit * scale
    const lineStep = style.baselineMultiplier * baselinePx
    const moduleHeightPx = rowSpan * result.module.height * scale + Math.max(rowSpan - 1, 0) * gridMarginVertical * scale
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

    const fontSize = style.size * scale
    ctx.font = `${style.weight === "Bold" ? "700" : "400"} ${fontSize}px Inter, system-ui, -apple-system, sans-serif`
    const columnWidth = result.module.width * scale
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
  }, [getWrappedText, result.grid, result.module.height, result.module.width, result.pageSizePt.height, result.settings.gridCols, result.typography.styles, scale])

  const getAutoFitDropUpdate = useCallback((key: BlockId, dropped: ModulePosition): { span: number; position: ModulePosition } | null => {
    const styleKey = getStyleKeyForBlock(key)
    const autoFit = getAutoFitForPlacement({
      key,
      text: textContent[key] ?? "",
      styleKey,
      rowSpan: getBlockRows(key),
      reflow: isTextReflowEnabled(key),
      syllableDivision: isSyllableDivisionEnabled(key),
      position: dropped,
    })
    if (!autoFit?.position) return null
    return { span: autoFit.span, position: autoFit.position }
  }, [getAutoFitForPlacement, getBlockRows, getStyleKeyForBlock, isSyllableDivisionEnabled, isTextReflowEnabled, textContent])

  const applyDragDrop = useCallback((drag: DragState, nextPreview: ModulePosition, copyOnDrop: boolean) => {
    if (copyOnDrop) {
      const sourceText = textContent[drag.key] ?? ""
      const maxParagraphCount = result.settings.gridCols * result.settings.gridRows
      const activeParagraphCount = blockOrder.filter((key) => (textContent[key] ?? "").trim().length > 0).length
      if (sourceText.trim().length > 0 && activeParagraphCount >= maxParagraphCount) {
        window.alert(`Maximum paragraphs reached (${maxParagraphCount}).`)
        return
      }

      const styleKey = getStyleKeyForBlock(drag.key)
      const sourceRows = getBlockRows(drag.key)
      const sourceReflow = isTextReflowEnabled(drag.key)
      const sourceSyllableDivision = isSyllableDivisionEnabled(drag.key)
      const sourceSpan = getBlockSpan(drag.key)
      const autoFit = getAutoFitForPlacement({
        key: drag.key,
        text: sourceText,
        styleKey,
        rowSpan: sourceRows,
        reflow: sourceReflow,
        syllableDivision: sourceSyllableDivision,
        position: nextPreview,
      })
      const nextSpan = autoFit?.span ?? sourceSpan
      const metrics = getGridMetrics()
      const maxCol = Math.max(0, result.settings.gridCols - nextSpan)
      const resolvedPosition = autoFit?.position
        ? {
            col: Math.max(0, Math.min(maxCol, autoFit.position.col)),
            row: Math.max(0, Math.min(metrics.maxBaselineRow, autoFit.position.row)),
          }
        : {
            col: Math.max(0, Math.min(maxCol, nextPreview.col)),
            row: Math.max(0, Math.min(metrics.maxBaselineRow, nextPreview.row)),
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
          nextRotations[newKey] = Math.max(-80, Math.min(80, sourceRotation))
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
    } else {
      recordHistoryBeforeChange()
      const autoFit = getAutoFitDropUpdate(drag.key, nextPreview)
      if (autoFit) {
        setBlockColumnSpans((current) => ({
          ...current,
          [drag.key]: autoFit.span,
        }))
        setBlockModulePositions((current) => ({
          ...current,
          [drag.key]: autoFit.position,
        }))
      } else {
        setBlockModulePositions((current) => ({
          ...current,
          [drag.key]: nextPreview,
        }))
      }
    }
  }, [
    baseFont,
    blockOrder,
    getAutoFitDropUpdate,
    getAutoFitForPlacement,
    getBlockRows,
    getBlockSpan,
    getGridMetrics,
    getStyleKeyForBlock,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    recordHistoryBeforeChange,
    result.settings.gridCols,
    result.settings.gridRows,
    setBlockCollections,
    setBlockColumnSpans,
    setBlockModulePositions,
    textContent,
  ])

  const {
    dragState,
    setDragState,
    dragEndedAtRef,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
  } = usePreviewDrag<BlockId>({
    showTypography,
    isEditorOpen: Boolean(editorState),
    canvasRef,
    blockRectsRef,
    blockModulePositions,
    findTopmostBlockAtPoint,
    toPagePoint,
    snapToModule,
    snapToBaseline,
    onDrop: applyDragDrop,
    onClearHover: () => setHoverState(null),
    touchLongPressMs: TOUCH_LONG_PRESS_MS,
    touchCancelDistancePx: TOUCH_CANCEL_DISTANCE_PX,
  })

  const buildReflowPlannerInput = useCallback((
    gridCols: number,
    gridRows: number,
    sourcePositions: Partial<Record<BlockId, ModulePosition>> = blockModulePositions,
  ): ReflowPlannerInput => ({
    gridCols,
    gridRows,
    blockOrder,
    blockColumnSpans,
    sourcePositions,
    pageHeight: result.pageSizePt.height,
    marginTop: result.grid.margins.top,
    marginBottom: result.grid.margins.bottom,
    gridUnit: result.grid.gridUnit,
    moduleHeight: result.module.height,
    gridMarginVertical: result.grid.gridMarginVertical,
  }), [
    blockColumnSpans,
    blockModulePositions,
    blockOrder,
    result.grid.gridMarginVertical,
    result.grid.gridUnit,
    result.grid.margins.bottom,
    result.grid.margins.top,
    result.module.height,
    result.pageSizePt.height,
  ])

  const computeReflowPlan = useCallback((input: ReflowPlannerInput): ReflowPlan => {
    const signature = createReflowPlanSignature(input)
    const cached = reflowPlanCacheRef.current.get(signature)
    if (cached) return cached
    const plan = computeReflowPlanPure(input)
    reflowPlanCacheRef.current.set(signature, plan)
    if (reflowPlanCacheRef.current.size > REFLOW_PLAN_CACHE_LIMIT) {
      const firstKey = reflowPlanCacheRef.current.keys().next().value
      if (firstKey) reflowPlanCacheRef.current.delete(firstKey)
    }
    return plan
  }, [])

  const {
    postRequest: postReflowWorkerRequest,
    cancelRequest: cancelReflowWorkerRequest,
  } = useWorkerBridge<ReflowPlannerInput, ReflowPlan>({
    strategy: "latest",
    createWorker: () => new Worker(new URL("../workers/reflowPlanner.worker.ts", import.meta.url)),
    parseMessage: (data) => {
      if (!data || typeof data !== "object") return null
      const typed = data as { id?: unknown; plan?: ReflowPlan }
      if (typeof typed.id !== "number" || !typed.plan) return null
      return { id: typed.id, result: typed.plan }
    },
  })

  const postReflowPlanRequest = useCallback((input: ReflowPlannerInput) => {
    const workerRequest = postReflowWorkerRequest(input)
    if (!workerRequest) {
      return {
        requestId: -1,
        promise: Promise.resolve(computeReflowPlan(input)),
      }
    }
    return workerRequest
  }, [computeReflowPlan, postReflowWorkerRequest])

  const {
    postRequest: postAutoFitWorkerRequest,
    cancelRequest: cancelAutoFitWorkerRequest,
  } = useWorkerBridge<
    AutoFitPlannerInput,
    {
      spanUpdates: Partial<Record<string, number>>
      positionUpdates: Partial<Record<string, ModulePosition>>
    }
  >({
    enabled: typeof OffscreenCanvas !== "undefined",
    strategy: "latest",
    createWorker: () => new Worker(new URL("../workers/autoFit.worker.ts", import.meta.url)),
    parseMessage: (data) => {
      if (!data || typeof data !== "object") return null
      const typed = data as {
        id?: unknown
        output?: {
          spanUpdates: Partial<Record<string, number>>
          positionUpdates: Partial<Record<string, ModulePosition>>
        }
      }
      if (typeof typed.id !== "number" || !typed.output) return null
      return { id: typed.id, result: typed.output }
    },
  })

  const postAutoFitRequest = useCallback((input: AutoFitPlannerInput) => {
    const workerRequest = postAutoFitWorkerRequest(input)
    if (!workerRequest) {
      return {
        requestId: -1,
        promise: Promise.resolve(computeAutoFitBatch(input, (font, text) => {
          const canvas = canvasRef.current
          if (!canvas) return 0
          const ctx = canvas.getContext("2d")
          if (!ctx) return 0
          ctx.font = font
          return ctx.measureText(text).width
        })),
      }
    }
    return workerRequest
  }, [postAutoFitWorkerRequest])

  useInitialLayoutHydration<TypographyStyleKey, BlockId>({
    initialLayout,
    initialLayoutKey,
    lastAppliedLayoutKeyRef,
    pushHistory,
    buildSnapshot,
    baseFont,
    gridCols: result.settings.gridCols,
    gridRows: result.settings.gridRows,
    typographyStyles: result.typography.styles,
    isBaseBlockId,
    defaultTextContent: DEFAULT_TEXT_CONTENT,
    defaultStyleAssignments: DEFAULT_STYLE_ASSIGNMENTS,
    isFontFamily,
    getDefaultColumnSpan,
    getGridMetrics,
    setBlockCollections,
    onBeforeApply: () => {
      suppressReflowCheckRef.current = true
    },
    onAfterApply: () => {
      setDragState(null)
      setHoverState(null)
      setEditorState(null)
    },
  })

  useEffect(() => {
    const canvas = staticCanvasRef.current
    if (!canvas) return

    const frame = window.requestAnimationFrame(() => {
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
        showMargins,
        showModules,
        showBaselines,
        isMobile,
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isMobile, pixelRatio, result, rotation, scale, showBaselines, showMargins, showModules])

  useTypographyRenderer<BlockId>({
    canvasRef,
    blockRectsRef,
    typographyBufferRef,
    previousPlansRef,
    typographyBufferTransformRef,
    result,
    scale,
    rotation,
    showTypography,
    blockOrder,
    textContent,
    styleAssignments,
    blockTextAlignments,
    blockModulePositions,
    dragState,
    clampModulePosition,
    getBlockFont,
    isBlockItalic,
    isBlockBold,
    getBlockRotation,
    getBlockSpan,
    getBlockRows,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    getWrappedText,
    getOpticalOffset,
    onCanvasReady,
    recordPerfMetric,
    pixelRatio,
  })

  useEffect(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const frame = window.requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const cssWidth = canvas.width / pixelRatio
      const cssHeight = canvas.height / pixelRatio
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, cssWidth, cssHeight)
      if (!showTypography || !dragState) return

      const { width, height } = result.pageSizePt
      const { margins, gridUnit, gridMarginHorizontal } = result.grid
      const { width: modW } = result.module
      const pageWidth = width * scale
      const pageHeight = height * scale
      const moduleXStep = (modW + gridMarginHorizontal) * scale
      const baselineStep = gridUnit * scale
      const baselineOriginTop = margins.top * scale - baselineStep
      const contentLeft = margins.left * scale

      const dragSpan = getBlockSpan(dragState.key)
      const snapX = contentLeft + dragState.preview.col * moduleXStep
      const snapY = baselineOriginTop + dragState.preview.row * baselineStep
      const snapWidth = dragSpan * modW * scale + Math.max(dragSpan - 1, 0) * gridMarginHorizontal * scale

      ctx.save()
      ctx.translate(cssWidth / 2, cssHeight / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-pageWidth / 2, -pageHeight / 2)
      ctx.strokeStyle = "#f97316"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(snapX, snapY + baselineStep)
      ctx.lineTo(snapX + snapWidth, snapY + baselineStep)
      ctx.stroke()
      ctx.restore()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [dragState, getBlockSpan, pixelRatio, result, rotation, scale, showTypography])

  useEffect(() => {
    const calculateScale = () => {
      const container = previewContainerRef.current
      if (!container) return

      const { width, height } = result.pageSizePt
      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40

      const nextScale = Math.min(containerWidth / width, containerHeight / height)
      setScale((prev) => (Math.abs(prev - nextScale) < 0.0001 ? prev : nextScale))
      const nextRatio = Math.max(1, window.devicePixelRatio || 1)
      setPixelRatio((prev) => (Math.abs(prev - nextRatio) < 0.01 ? prev : nextRatio))
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
  } = useLayoutReflow<BlockId, ReflowPlannerInput, PreviewLayoutState>({
    suppressReflowCheckRef,
    blockOrder,
    blockColumnSpans,
    blockModulePositions,
    textContent,
    scale,
    gridCols: result.settings.gridCols,
    gridRows: result.settings.gridRows,
    moduleWidth: result.module.width,
    moduleHeight: result.module.height,
    gridUnit: result.grid.gridUnit,
    gridMarginVertical: result.grid.gridMarginVertical,
    marginTop: result.grid.margins.top,
    marginBottom: result.grid.margins.bottom,
    pageHeight: result.pageSizePt.height,
    typographyStyles: result.typography.styles,
    getDefaultColumnSpan,
    getBlockRows,
    getBlockSpan,
    getStyleKeyForBlock,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    buildSnapshot,
    pushHistory,
    onRequestGridRestore,
    setBlockColumnSpans,
    setBlockModulePositions,
    buildReflowPlannerInput,
    postReflowPlanRequest,
    cancelReflowWorkerRequest,
    computeReflowPlan,
    postAutoFitRequest,
    cancelAutoFitWorkerRequest,
    computeAutoFitFallback: (input) => computeAutoFitBatch(input, (font, text) => {
      const canvas = canvasRef.current
      if (!canvas) return 0
      const ctx = canvas.getContext("2d")
      if (!ctx) return 0
      ctx.font = font
      return ctx.measureText(text).width
    }),
    recordPerfMetric,
  })

  const {
    closeEditor,
    saveEditor,
    deleteEditorBlock,
    handleCanvasDoubleClick,
  } = useBlockEditorActions({
    showTypography,
    dragEndedAtRef,
    canvasRef,
    editorState,
    setEditorState,
    baseFont,
    resultGridCols: result.settings.gridCols,
    resultGridRows: result.settings.gridRows,
    resultTypographyStyles: result.typography.styles,
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
  })

  usePreviewKeyboard({
    editorTarget: editorState?.target ?? null,
    isEditorOpen: Boolean(editorState),
    focusEditor: () => textareaRef.current?.focus(),
    onCloseEditor: closeEditor,
    undo,
    redo,
  })

  const handleCanvasMouseMoveInner = useCallback((clientX: number, clientY: number) => {
    mouseMoveRafRef.current = null

    if (!showTypography || editorState || dragState) {
      if (hoverState) setHoverState(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = clientX - rect.left
    const canvasY = clientY - rect.top
    const pagePoint = toPagePoint(canvasX, canvasY)
    if (!pagePoint) {
      if (hoverState) setHoverState(null)
      return
    }

    const key = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (key) {
      setHoverState((prev) => {
        if (prev && prev.key === key && Math.abs(prev.canvasX - canvasX) < 1 && Math.abs(prev.canvasY - canvasY) < 1) {
          return prev
        }
        return { key, canvasX, canvasY }
      })
      return
    }

    if (hoverState) setHoverState(null)
  }, [dragState, editorState, findTopmostBlockAtPoint, hoverState, showTypography, toPagePoint])

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (mouseMoveRafRef.current !== null) return
    const { clientX, clientY } = event
    mouseMoveRafRef.current = requestAnimationFrame(() => handleCanvasMouseMoveInner(clientX, clientY))
  }, [handleCanvasMouseMoveInner])

  useEffect(() => {
    return () => {
      if (mouseMoveRafRef.current !== null) cancelAnimationFrame(mouseMoveRafRef.current)
    }
  }, [])
  const hoveredStyle = hoverState ? (styleAssignments[hoverState.key] ?? "body") : null
  const hoveredSpan = hoverState ? getBlockSpan(hoverState.key) : null
  const hoveredAlign = hoverState ? (blockTextAlignments[hoverState.key] ?? "left") : null

  useEffect(() => {
    if (!onLayoutChange) {
      if (onLayoutChangeDebounceRef.current !== null) {
        window.clearTimeout(onLayoutChangeDebounceRef.current)
        onLayoutChangeDebounceRef.current = null
      }
      pendingLayoutEmissionRef.current = null
      return
    }

    const resolvedSpans = blockOrder.reduce((acc, key) => {
      acc[key] = getBlockSpan(key)
      return acc
    }, {} as Record<BlockId, number>)
    const resolvedAlignments = blockOrder.reduce((acc, key) => {
      acc[key] = blockTextAlignments[key] ?? "left"
      return acc
    }, {} as Record<BlockId, TextAlignMode>)

    pendingLayoutEmissionRef.current = {
      blockOrder,
      textContent,
      blockTextEdited,
      styleAssignments,
      blockFontFamilies: { ...blockFontFamilies },
      blockColumnSpans: resolvedSpans,
      blockRowSpans: blockOrder.reduce((acc, key) => {
        acc[key] = getBlockRows(key)
        return acc
      }, {} as Record<BlockId, number>),
      blockTextAlignments: resolvedAlignments,
      blockTextReflow: blockOrder.reduce((acc, key) => {
        acc[key] = isTextReflowEnabled(key)
        return acc
      }, {} as Record<BlockId, boolean>),
      blockSyllableDivision: blockOrder.reduce((acc, key) => {
        acc[key] = isSyllableDivisionEnabled(key)
        return acc
      }, {} as Record<BlockId, boolean>),
      blockBold: blockOrder.reduce((acc, key) => {
        acc[key] = isBlockBold(key)
        return acc
      }, {} as Record<BlockId, boolean>),
      blockItalic: blockOrder.reduce((acc, key) => {
        acc[key] = isBlockItalic(key)
        return acc
      }, {} as Record<BlockId, boolean>),
      blockRotations: blockOrder.reduce((acc, key) => {
        acc[key] = getBlockRotation(key)
        return acc
      }, {} as Record<BlockId, number>),
      blockModulePositions,
    }
    if (onLayoutChangeDebounceRef.current !== null) {
      window.clearTimeout(onLayoutChangeDebounceRef.current)
    }
    onLayoutChangeDebounceRef.current = window.setTimeout(() => {
      if (!pendingLayoutEmissionRef.current) return
      onLayoutChange(pendingLayoutEmissionRef.current)
      pendingLayoutEmissionRef.current = null
      onLayoutChangeDebounceRef.current = null
    }, LAYOUT_CHANGE_DEBOUNCE_MS)
    return () => {
      if (onLayoutChangeDebounceRef.current !== null) {
        window.clearTimeout(onLayoutChangeDebounceRef.current)
        onLayoutChangeDebounceRef.current = null
      }
    }
  }, [blockFontFamilies, blockModulePositions, blockOrder, blockTextAlignments, blockTextEdited, getBlockRotation, getBlockRows, getBlockSpan, isBlockBold, isBlockItalic, isSyllableDivisionEnabled, isTextReflowEnabled, onLayoutChange, styleAssignments, textContent])

  const pageWidthCss = result.pageSizePt.width * scale
  const pageHeightCss = result.pageSizePt.height * scale
  const pageWidthPx = Math.max(1, Math.round(pageWidthCss * pixelRatio))
  const pageHeightPx = Math.max(1, Math.round(pageHeightCss * pixelRatio))

  const canvasCursorClass = dragState
    ? (dragState.copyOnDrop ? "cursor-copy" : "cursor-grabbing")
    : hoverState
      ? "cursor-grab"
      : "cursor-default"
  const editorText = editorState?.draftText ?? ""
  const editorCharacterCount = editorText.length
  const editorWordCount = editorText.trim() ? editorText.trim().split(/\s+/).length : 0

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
          ref={canvasRef}
          width={pageWidthPx}
          height={pageHeightPx}
          style={{ width: pageWidthCss, height: pageHeightCss }}
          className={`absolute inset-0 block touch-none ${canvasCursorClass}`}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerCancel}
          onLostPointerCapture={handleCanvasLostPointerCapture}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoverState(null)}
          onDoubleClick={handleCanvasDoubleClick}
        />
        <canvas
          ref={overlayCanvasRef}
          width={pageWidthPx}
          height={pageHeightPx}
          style={{ width: pageWidthCss, height: pageHeightCss }}
          className="pointer-events-none absolute inset-0 block"
        />
        {hoverState && hoveredStyle && hoveredSpan && hoveredAlign ? (
          <div
            className="pointer-events-none absolute z-20 w-64 rounded-md border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm"
            style={{
              left: Math.min(Math.max(8, hoverState.canvasX + 10), Math.max(8, pageWidthCss - 268)),
              top: Math.min(Math.max(8, hoverState.canvasY + 10), Math.max(8, pageHeightCss - 120)),
            }}
          >
            <div className="text-[11px] font-medium text-gray-900">
              {STYLE_OPTIONS.find((option) => option.value === hoveredStyle)?.label ?? hoveredStyle} ({formatPtSize(result.typography.styles[hoveredStyle].size)})
            </div>
            <div className="mt-1 text-[11px] text-gray-600">
              Align: {hoveredAlign} • Span: {hoveredSpan} {hoveredSpan === 1 ? "col" : "cols"}
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              Double-click to edit • Shift-drag duplicate • Ctrl-drag baseline snap • Touch: long-press then drag
            </div>
          </div>
        ) : null}
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
                undo()
                dismissReflowToast()
              }}
            >
              Undo
            </Button>
          </div>
        </div>
      ) : null}

      {editorState ? (
        <div
          className={`absolute inset-0 flex items-center justify-center p-4 ${isDarkMode ? "bg-black/45" : "bg-black/20"}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor()
          }}
        >
          <div
            className={`w-full max-w-[500px] rounded-md border shadow-xl ${isDarkMode ? "dark border-gray-700 bg-gray-900 text-gray-100" : "border-gray-300 bg-white"}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={`space-y-2 border-b px-3 py-2 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
                <div className="space-y-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_8rem] items-center gap-2">
                    <EditorControlTooltip label="Paragraph row span">
                      <div className="flex min-w-0 items-center gap-1">
                        <Rows3 className="h-4 w-4 shrink-0 text-gray-500" />
                        <Select
                          value={String(editorState.draftRows)}
                          onValueChange={(value) => {
                            setEditorState((prev) => prev ? {
                              ...prev,
                              draftRows: Math.max(1, Math.min(result.settings.gridRows, Number(value))),
                            } : prev)
                          }}
                        >
                          <SelectTrigger className="h-8 min-w-0 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: result.settings.gridRows }, (_, index) => index + 1).map((count) => (
                              <SelectItem key={count} value={String(count)}>
                                {count} {count === 1 ? "row" : "rows"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </EditorControlTooltip>
                    <EditorControlTooltip label="Paragraph column span">
                      <div className="flex min-w-0 items-center gap-1">
                        <Columns3 className="h-4 w-4 shrink-0 text-gray-500" />
                        <Select
                          value={String(editorState.draftColumns)}
                          onValueChange={(value) => {
                            setEditorState((prev) => prev ? {
                              ...prev,
                              draftColumns: Math.max(1, Math.min(result.settings.gridCols, Number(value))),
                            } : prev)
                          }}
                        >
                          <SelectTrigger className="h-8 min-w-0 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: result.settings.gridCols }, (_, index) => index + 1).map((count) => (
                              <SelectItem key={count} value={String(count)}>
                                {count} {count === 1 ? "col" : "cols"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </EditorControlTooltip>
                    <div
                      className={`mx-0.5 h-6 w-px ${isDarkMode ? "bg-gray-600" : "bg-gray-300"}`}
                      aria-hidden="true"
                    />
                    <EditorControlTooltip label={`Paragraph rotation: ${Math.round(editorState.draftRotation)}deg`} className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <RotateCw className="h-4 w-4 shrink-0 text-gray-500" />
                        <input
                          type="number"
                          min={-80}
                          max={80}
                          step={1}
                          value={Math.round(editorState.draftRotation)}
                          onChange={(event) => {
                            const parsed = Number(event.target.value)
                            const next = Number.isFinite(parsed) ? parsed : 0
                            setEditorState((prev) => prev ? {
                              ...prev,
                              draftRotation: Math.max(-80, Math.min(80, next)),
                            } : prev)
                          }}
                          className={`h-8 w-24 rounded-md border px-2 text-xs outline-none ${
                            isDarkMode
                              ? "border-gray-700 bg-gray-950 text-gray-100 focus:border-gray-600"
                              : "border-gray-200 bg-gray-50 text-gray-900 focus:border-gray-300"
                          }`}
                        />
                      </div>
                    </EditorControlTooltip>
                  </div>
                  <div className="grid grid-cols-2 items-center gap-2">
                    <EditorControlTooltip label="Font hierarchy" className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1">
                        <Type className="h-4 w-4 shrink-0 text-gray-500" />
                        <Select
                          value={editorState.draftStyle}
                          onValueChange={(value) => {
                            const nextStyle = value as TypographyStyleKey
                            setEditorState((prev) => prev ? {
                              ...prev,
                              draftStyle: nextStyle,
                              draftText: prev.draftTextEdited ? prev.draftText : getDummyTextForStyle(nextStyle),
                            } : prev)
                          }}
                        >
                          <SelectTrigger className="h-8 min-w-0 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STYLE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label} ({formatPtSize(result.typography.styles[option.value].size)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </EditorControlTooltip>
                    <EditorControlTooltip label="Font family" className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1">
                        <CaseSensitive className="h-4 w-4 shrink-0 text-gray-500" />
                        <FontSelect
                          value={editorState.draftFont}
                          onValueChange={(value) => {
                            setEditorState((prev) => prev ? {
                              ...prev,
                              draftFont: value as FontFamily,
                            } : prev)
                          }}
                          options={FONT_OPTIONS}
                          fitToLongestOption
                          triggerClassName="h-8 w-full text-xs"
                        />
                      </div>
                    </EditorControlTooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center rounded-md border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <EditorControlTooltip label={editorState.draftBold ? "Bold: On" : "Bold: Off"}>
                      <Button
                        type="button"
                        size="icon"
                        variant={editorState.draftBold ? "secondary" : "ghost"}
                        className={`h-8 w-8 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                        onClick={() => {
                          setEditorState((prev) => prev ? { ...prev, draftBold: !prev.draftBold } : prev)
                        }}
                        aria-label={editorState.draftBold ? "Disable bold" : "Enable bold"}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                    </EditorControlTooltip>
                    <EditorControlTooltip label={editorState.draftItalic ? "Italic: On" : "Italic: Off"}>
                      <Button
                        type="button"
                        size="icon"
                        variant={editorState.draftItalic ? "secondary" : "ghost"}
                        className={`h-8 w-8 rounded-none border-l ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                        onClick={() => {
                          setEditorState((prev) => prev ? { ...prev, draftItalic: !prev.draftItalic } : prev)
                        }}
                        aria-label={editorState.draftItalic ? "Disable italic" : "Enable italic"}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </EditorControlTooltip>
                    <div className={`h-5 w-px ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`} aria-hidden="true" />
                    <EditorControlTooltip label="Align left">
                      <Button
                        type="button"
                        size="icon"
                        variant={editorState.draftAlign === "left" ? "secondary" : "ghost"}
                        className={`h-8 w-8 rounded-none border-l ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                        onClick={() => {
                          setEditorState((prev) => prev ? { ...prev, draftAlign: "left" } : prev)
                        }}
                        aria-label="Align left"
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                    </EditorControlTooltip>
                    <EditorControlTooltip label="Align right">
                      <Button
                        type="button"
                        size="icon"
                        variant={editorState.draftAlign === "right" ? "secondary" : "ghost"}
                        className={`h-8 w-8 rounded-l-none border-l ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                        onClick={() => {
                          setEditorState((prev) => prev ? { ...prev, draftAlign: "right" } : prev)
                        }}
                        aria-label="Align right"
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </EditorControlTooltip>
                  </div>
                  <div className={`h-5 w-px ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`} aria-hidden="true" />
                  <EditorControlTooltip label={editorState.draftReflow ? "Reflow: On" : "Reflow: Off"}>
                    <Button
                      type="button"
                      size="icon"
                      variant={editorState.draftReflow ? "secondary" : "ghost"}
                      className="h-8 w-8"
                      onClick={() => {
                        setEditorState((prev) => prev ? { ...prev, draftReflow: !prev.draftReflow } : prev)
                      }}
                      aria-label={editorState.draftReflow ? "Disable reflow" : "Enable reflow"}
                    >
                      <Rows3 className="h-4 w-4" />
                    </Button>
                  </EditorControlTooltip>
                  <EditorControlTooltip label={editorState.draftSyllableDivision ? "Syllable division: On" : "Syllable division: Off"}>
                    <Button
                      type="button"
                      size="sm"
                      variant={editorState.draftSyllableDivision ? "secondary" : "ghost"}
                      className="h-8 px-2 text-xs"
                      onClick={() => {
                        setEditorState((prev) => prev ? { ...prev, draftSyllableDivision: !prev.draftSyllableDivision } : prev)
                      }}
                      aria-label={editorState.draftSyllableDivision ? "Disable syllable division" : "Enable syllable division"}
                    >
                      Hy
                    </Button>
                  </EditorControlTooltip>
                  </div>
                </div>
                <div className="grid grid-rows-3 gap-2 justify-items-end">
                  <div className="flex h-8 w-8 items-center justify-center">
                    {showEditorHelpIcon ? (
                      <button
                        type="button"
                        aria-label="Open help for text editor"
                        onClick={() => onOpenHelpSection?.("help-editor")}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-[10px] font-semibold leading-none text-gray-700 hover:bg-gray-200"
                      >
                        ?
                      </button>
                    ) : null}
                  </div>
                  <EditorControlTooltip label="Delete paragraph">
                    <Button
                      size="icon"
                      variant="outline"
                      className={`h-8 w-8 ${isDarkMode ? "text-gray-300 hover:text-red-400" : "text-gray-500 hover:text-red-600"}`}
                      onClick={deleteEditorBlock}
                      aria-label="Delete paragraph"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </EditorControlTooltip>
                  <EditorControlTooltip label="Save changes">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={saveEditor}
                      aria-label="Save changes"
                    >
                      <SaveIcon className="h-4 w-4" />
                    </Button>
                  </EditorControlTooltip>
                </div>
              </div>
            </div>
            <div className="p-3">
              <textarea
                ref={textareaRef}
                value={editorState.draftText}
                onChange={(event) => {
                  const value = event.target.value
                  setEditorState((prev) => prev ? {
                    ...prev,
                    draftText: value,
                    draftTextEdited: true,
                  } : prev)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault()
                    closeEditor()
                    return
                  }
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault()
                    saveEditor()
                  }
                }}
                style={{ fontFamily: getFontFamilyCss(editorState.draftFont) }}
                className={`min-h-40 w-full resize-y rounded-md border p-3 outline-none ring-0 ${
                  isDarkMode
                    ? "border-gray-700 bg-gray-950 text-gray-100 focus:border-gray-600"
                    : "border-gray-200 bg-gray-50 text-gray-900 focus:border-gray-300"
                }`}
              />
            </div>
            <div className={`flex items-center justify-between gap-3 border-t px-3 py-2 text-[11px] ${
              isDarkMode ? "border-gray-700 text-gray-400" : "border-gray-100 text-gray-500"
            }`}>
              <div className="flex items-center gap-3">
                <span>Characters: {editorCharacterCount}</span>
                <span>Words: {editorWordCount}</span>
              </div>
              <span className="text-right">Esc or click outside to close without saving.</span>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
})

GridPreview.displayName = "GridPreview"
