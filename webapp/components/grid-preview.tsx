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
import { AlignLeft, AlignRight, Bold, Columns3, Italic, ListOrdered, RotateCw, Rows3, Trash2, Type } from "lucide-react"
import { ReactNode, useCallback, useEffect, useReducer, useRef, useState } from "react"

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

type DragState = {
  key: BlockId
  startPageX: number
  startPageY: number
  pointerOffsetX: number
  pointerOffsetY: number
  preview: ModulePosition
  moved: boolean
  copyOnDrop: boolean
}

type Updater<T> = T | ((prev: T) => T)

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

type BlockCollectionsAction = {
  type: "merge"
  updater: (prev: BlockCollectionsState) => BlockCollectionsState
}

function blockCollectionsReducer(
  state: BlockCollectionsState,
  action: BlockCollectionsAction,
): BlockCollectionsState {
  if (action.type === "merge") return action.updater(state)
  return state
}

function resolveUpdater<T>(prev: T, next: Updater<T>): T {
  return typeof next === "function" ? (next as (value: T) => T)(prev) : next
}

type HoverState = {
  key: BlockId
  canvasX: number
  canvasY: number
}

function rectsIntersect(a: BlockRect, b: BlockRect): boolean {
  return !(
    a.x + a.width < b.x
    || b.x + b.width < a.x
    || a.y + a.height < b.y
    || b.y + b.height < a.y
  )
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

function getTextAscentPx(ctx: CanvasRenderingContext2D, fallbackFontSizePx: number): number {
  const metrics = ctx.measureText("Hg")
  return metrics.actualBoundingBoxAscent > 0 ? metrics.actualBoundingBoxAscent : fallbackFontSizePx * 0.8
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
  baseFont?: FontFamily
  isDarkMode?: boolean
}

export interface PreviewLayoutState {
  blockOrder: BlockId[]
  textContent: Record<BlockId, string>
  blockTextEdited: Record<BlockId, boolean>
  styleAssignments: Record<BlockId, TypographyStyleKey>
  blockFontFamilies?: Partial<Record<BlockId, FontFamily>>
  blockColumnSpans: Record<BlockId, number>
  blockRowSpans?: Record<BlockId, number>
  blockTextAlignments: Record<BlockId, TextAlignMode>
  blockTextReflow?: Record<BlockId, boolean>
  blockSyllableDivision?: Record<BlockId, boolean>
  blockBold?: Record<BlockId, boolean>
  blockItalic?: Record<BlockId, boolean>
  blockRotations?: Record<BlockId, number>
  blockModulePositions: Partial<Record<BlockId, ModulePosition>>
}

export function GridPreview({
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
  baseFont = DEFAULT_BASE_FONT,
  isDarkMode = false,
}: GridPreviewProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRectsRef = useRef<Record<BlockId, BlockRect>>({})
  const dragEndedAtRef = useRef<number>(0)
  const lastAppliedLayoutKeyRef = useRef(0)
  const suppressReflowCheckRef = useRef(false)
  const dragRafRef = useRef<number | null>(null)
  const pendingDragPreviewRef = useRef<{ preview: ModulePosition; moved: boolean; copyOnDrop: boolean } | null>(null)
  const activeDragPointerIdRef = useRef<number | null>(null)
  const touchLongPressTimerRef = useRef<number | null>(null)
  const touchPendingDragRef = useRef<{
    pointerId: number
    dragState: DragState
    startClientX: number
    startClientY: number
  } | null>(null)
  const measureWidthCacheRef = useRef<Map<string, number>>(new Map())
  const wrapTextCacheRef = useRef<Map<string, string[]>>(new Map())
  const opticalOffsetCacheRef = useRef<Map<string, number>>(new Map())
  const typographyBufferRef = useRef<HTMLCanvasElement | null>(null)
  const previousPlansRef = useRef<Map<BlockId, BlockRenderPlan>>(new Map())
  const typographyBufferTransformRef = useRef("")
  const reflowPlanCacheRef = useRef<Map<string, ReflowPlan>>(new Map())
  const reflowWorkerRef = useRef<Worker | null>(null)
  const reflowWorkerResolversRef = useRef<Map<number, (plan: ReflowPlan) => void>>(new Map())
  const reflowWorkerRequestIdRef = useRef(0)
  const autoFitWorkerRef = useRef<Worker | null>(null)
  const autoFitWorkerResolversRef = useRef<Map<number, (output: {
    spanUpdates: Partial<Record<string, number>>
    positionUpdates: Partial<Record<string, ModulePosition>>
  }) => void>>(new Map())
  const autoFitWorkerRequestIdRef = useRef(0)
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
  const [isMobile, setIsMobile] = useState(false)
  const [blockCollectionsState, dispatchBlockCollections] = useReducer(
    blockCollectionsReducer,
    undefined,
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
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [hoverState, setHoverState] = useState<HoverState | null>(null)
  const [historyPast, setHistoryPast] = useState<PreviewLayoutState[]>([])
  const [historyFuture, setHistoryFuture] = useState<PreviewLayoutState[]>([])
  const [reflowToast, setReflowToast] = useState<{ movedCount: number } | null>(null)
  const [pendingReflow, setPendingReflow] = useState<{
    previousGrid: { cols: number; rows: number }
    nextGrid: { cols: number; rows: number }
    movedCount: number
    resolvedSpans: Record<BlockId, number>
    nextPositions: Partial<Record<BlockId, ModulePosition>>
  } | null>(null)
  const [editorState, setEditorState] = useState<{
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
  } | null>(null)
  const previousGridRef = useRef<{ cols: number; rows: number } | null>(null)
  const previousModuleRowStepRef = useRef<number | null>(null)
  const lastAutoFitSettingsRef = useRef<string>("")
  const lastUndoNonceRef = useRef(undoNonce)
  const lastRedoNonceRef = useRef(redoNonce)
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

  const setBlockCollections = useCallback((updater: (prev: BlockCollectionsState) => BlockCollectionsState) => {
    dispatchBlockCollections({ type: "merge", updater })
  }, [])

  const setBlockOrder = useCallback((next: Updater<BlockId[]>) => {
    setBlockCollections((prev) => ({ ...prev, blockOrder: resolveUpdater(prev.blockOrder, next) }))
  }, [setBlockCollections])

  const setTextContent = useCallback((next: Updater<Record<BlockId, string>>) => {
    setBlockCollections((prev) => ({ ...prev, textContent: resolveUpdater(prev.textContent, next) }))
  }, [setBlockCollections])

  const setBlockTextEdited = useCallback((next: Updater<Record<BlockId, boolean>>) => {
    setBlockCollections((prev) => ({ ...prev, blockTextEdited: resolveUpdater(prev.blockTextEdited, next) }))
  }, [setBlockCollections])

  const setStyleAssignments = useCallback((next: Updater<Record<BlockId, TypographyStyleKey>>) => {
    setBlockCollections((prev) => ({ ...prev, styleAssignments: resolveUpdater(prev.styleAssignments, next) }))
  }, [setBlockCollections])

  const setBlockFontFamilies = useCallback((next: Updater<Partial<Record<BlockId, FontFamily>>>) => {
    setBlockCollections((prev) => ({ ...prev, blockFontFamilies: resolveUpdater(prev.blockFontFamilies, next) }))
  }, [setBlockCollections])

  const setBlockColumnSpans = useCallback((next: Updater<Partial<Record<BlockId, number>>>) => {
    setBlockCollections((prev) => ({ ...prev, blockColumnSpans: resolveUpdater(prev.blockColumnSpans, next) }))
  }, [setBlockCollections])

  const setBlockRowSpans = useCallback((next: Updater<Partial<Record<BlockId, number>>>) => {
    setBlockCollections((prev) => ({ ...prev, blockRowSpans: resolveUpdater(prev.blockRowSpans, next) }))
  }, [setBlockCollections])

  const setBlockTextAlignments = useCallback((next: Updater<Partial<Record<BlockId, TextAlignMode>>>) => {
    setBlockCollections((prev) => ({
      ...prev,
      blockTextAlignments: resolveUpdater(prev.blockTextAlignments, next),
    }))
  }, [setBlockCollections])

  const setBlockTextReflow = useCallback((next: Updater<Partial<Record<BlockId, boolean>>>) => {
    setBlockCollections((prev) => ({ ...prev, blockTextReflow: resolveUpdater(prev.blockTextReflow, next) }))
  }, [setBlockCollections])

  const setBlockSyllableDivision = useCallback((next: Updater<Partial<Record<BlockId, boolean>>>) => {
    setBlockCollections((prev) => ({
      ...prev,
      blockSyllableDivision: resolveUpdater(prev.blockSyllableDivision, next),
    }))
  }, [setBlockCollections])

  const setBlockModulePositions = useCallback((next: Updater<Partial<Record<BlockId, ModulePosition>>>) => {
    setBlockCollections((prev) => ({
      ...prev,
      blockModulePositions: resolveUpdater(prev.blockModulePositions, next),
    }))
  }, [setBlockCollections])

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

  const buildSnapshot = useCallback((): PreviewLayoutState => {
    const resolvedSpans = blockOrder.reduce((acc, key) => {
      const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, result.settings.gridCols)
      acc[key] = Math.max(1, Math.min(result.settings.gridCols, raw))
      return acc
    }, {} as Record<BlockId, number>)
    const resolvedAlignments = blockOrder.reduce((acc, key) => {
      acc[key] = blockTextAlignments[key] ?? "left"
      return acc
    }, {} as Record<BlockId, TextAlignMode>)
    const resolvedRows = blockOrder.reduce((acc, key) => {
      acc[key] = getBlockRows(key)
      return acc
    }, {} as Record<BlockId, number>)
    const resolvedReflow = blockOrder.reduce((acc, key) => {
      acc[key] = isTextReflowEnabled(key)
      return acc
    }, {} as Record<BlockId, boolean>)
    const resolvedSyllableDivision = blockOrder.reduce((acc, key) => {
      acc[key] = isSyllableDivisionEnabled(key)
      return acc
    }, {} as Record<BlockId, boolean>)
    const resolvedBold = blockOrder.reduce((acc, key) => {
      acc[key] = isBlockBold(key)
      return acc
    }, {} as Record<BlockId, boolean>)
    const resolvedItalic = blockOrder.reduce((acc, key) => {
      acc[key] = isBlockItalic(key)
      return acc
    }, {} as Record<BlockId, boolean>)
    const resolvedRotations = blockOrder.reduce((acc, key) => {
      acc[key] = getBlockRotation(key)
      return acc
    }, {} as Record<BlockId, number>)
    return {
      blockOrder: [...blockOrder],
      textContent: { ...textContent },
      blockTextEdited: { ...blockTextEdited },
      styleAssignments: { ...styleAssignments },
      blockFontFamilies: { ...blockFontFamilies },
      blockColumnSpans: resolvedSpans,
      blockRowSpans: resolvedRows,
      blockTextAlignments: resolvedAlignments,
      blockTextReflow: resolvedReflow,
      blockSyllableDivision: resolvedSyllableDivision,
      blockBold: resolvedBold,
      blockItalic: resolvedItalic,
      blockRotations: resolvedRotations,
      blockModulePositions: { ...blockModulePositions },
    }
  }, [blockColumnSpans, blockFontFamilies, blockModulePositions, blockOrder, blockTextAlignments, blockTextEdited, getBlockRotation, getBlockRows, isBlockBold, isBlockItalic, isSyllableDivisionEnabled, isTextReflowEnabled, result.settings.gridCols, styleAssignments, textContent])

  const applySnapshot = useCallback((snapshot: PreviewLayoutState) => {
    const nextFonts = snapshot.blockOrder.reduce((acc, key) => {
      const raw = snapshot.blockFontFamilies?.[key]
      if (isFontFamily(raw) && raw !== baseFont) acc[key] = raw
      return acc
    }, {} as Partial<Record<BlockId, FontFamily>>)
    const nextBold = snapshot.blockOrder.reduce((acc, key) => {
      const raw = snapshot.blockBold?.[key]
      if (raw === true || raw === false) acc[key] = raw
      return acc
    }, {} as Partial<Record<BlockId, boolean>>)
    const nextItalic = snapshot.blockOrder.reduce((acc, key) => {
      const raw = snapshot.blockItalic?.[key]
      if (raw === true || raw === false) acc[key] = raw
      return acc
    }, {} as Partial<Record<BlockId, boolean>>)
    const nextRotations = snapshot.blockOrder.reduce((acc, key) => {
      const raw = snapshot.blockRotations?.[key]
      if (typeof raw === "number" && Number.isFinite(raw) && Math.abs(raw) > 0.001) {
        acc[key] = Math.max(-80, Math.min(80, raw))
      }
      return acc
    }, {} as Partial<Record<BlockId, number>>)
    setBlockCollections(() => ({
      blockOrder: [...snapshot.blockOrder],
      textContent: { ...snapshot.textContent },
      blockTextEdited: { ...snapshot.blockTextEdited },
      styleAssignments: { ...snapshot.styleAssignments },
      blockFontFamilies: nextFonts,
      blockBold: nextBold,
      blockItalic: nextItalic,
      blockRotations: nextRotations,
      blockColumnSpans: { ...snapshot.blockColumnSpans },
      blockRowSpans: { ...(snapshot.blockRowSpans ?? {}) },
      blockTextAlignments: { ...snapshot.blockTextAlignments },
      blockTextReflow: { ...snapshot.blockTextReflow },
      blockSyllableDivision: { ...snapshot.blockSyllableDivision },
      blockModulePositions: { ...snapshot.blockModulePositions },
    }))
  }, [baseFont, setBlockCollections])

  const pushHistory = useCallback((snapshot: PreviewLayoutState) => {
    setHistoryPast((prev) => {
      const next = [...prev, snapshot]
      return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
    })
    setHistoryFuture([])
  }, [])

  const recordHistoryBeforeChange = useCallback(() => {
    pushHistory(buildSnapshot())
    setPendingReflow(null)
    setReflowToast(null)
  }, [buildSnapshot, pushHistory])

  const undo = useCallback(() => {
    setHistoryPast((prev) => {
      if (!prev.length) return prev
      const current = buildSnapshot()
      const nextPast = prev.slice(0, -1)
      const previous = prev[prev.length - 1]
      setHistoryFuture((future) => [current, ...future].slice(0, HISTORY_LIMIT))
      applySnapshot(previous)
      setPendingReflow(null)
      setReflowToast(null)
      return nextPast
    })
  }, [applySnapshot, buildSnapshot])

  const redo = useCallback(() => {
    setHistoryFuture((future) => {
      if (!future.length) return future
      const current = buildSnapshot()
      const [nextSnapshot, ...rest] = future
      setHistoryPast((prev) => {
        const next = [...prev, current]
        return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
      })
      applySnapshot(nextSnapshot)
      setPendingReflow(null)
      setReflowToast(null)
      return rest
    })
  }, [applySnapshot, buildSnapshot])

  const applyPendingReflow = useCallback(() => {
    if (!pendingReflow) return
    pushHistory(buildSnapshot())
    setBlockColumnSpans((prev) => ({ ...prev, ...pendingReflow.resolvedSpans }))
    setBlockModulePositions((prev) => ({ ...prev, ...pendingReflow.nextPositions }))
    previousGridRef.current = pendingReflow.nextGrid
    setReflowToast({ movedCount: pendingReflow.movedCount })
    setPendingReflow(null)
  }, [buildSnapshot, pendingReflow, pushHistory])

  const cancelPendingReflow = useCallback(() => {
    if (!pendingReflow) return
    previousGridRef.current = pendingReflow.previousGrid
    setPendingReflow(null)
    onRequestGridRestore?.(pendingReflow.previousGrid.cols, pendingReflow.previousGrid.rows)
  }, [onRequestGridRestore, pendingReflow])

  useEffect(() => {
    onHistoryAvailabilityChange?.(historyPast.length > 0, historyFuture.length > 0)
  }, [historyFuture.length, historyPast.length, onHistoryAvailabilityChange])

  useEffect(() => {
    if (undoNonce === lastUndoNonceRef.current) return
    lastUndoNonceRef.current = undoNonce
    undo()
  }, [undo, undoNonce])

  useEffect(() => {
    if (redoNonce === lastRedoNonceRef.current) return
    lastRedoNonceRef.current = redoNonce
    redo()
  }, [redo, redoNonce])

  const getGridMetrics = useCallback(() => {
    const { margins, gridMarginHorizontal, gridMarginVertical, gridUnit } = result.grid
    const { width: modW, height: modH } = result.module
    const { gridCols, gridRows } = result.settings
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
    const centerCanvasX = canvas.width / 2
    const centerCanvasY = canvas.height / 2
    const theta = (rotation * Math.PI) / 180
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    const dx = canvasX - centerCanvasX
    const dy = canvasY - centerCanvasY

    return {
      x: dx * cos + dy * sin + pageWidth / 2,
      y: -dx * sin + dy * cos + pageHeight / 2,
    }
  }, [result.pageSizePt.height, result.pageSizePt.width, rotation, scale])

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

  useEffect(() => {
    if (typeof Worker === "undefined") return
    const worker = new Worker(new URL("../workers/reflowPlanner.worker.ts", import.meta.url))
    reflowWorkerRef.current = worker
    worker.onmessage = (event: MessageEvent<{ id: number; plan: ReflowPlan }>) => {
      const { id, plan } = event.data
      const resolve = reflowWorkerResolversRef.current.get(id)
      if (!resolve) return
      reflowWorkerResolversRef.current.delete(id)
      resolve(plan)
    }
    worker.onerror = () => {
      worker.terminate()
      reflowWorkerRef.current = null
      reflowWorkerResolversRef.current.clear()
    }
    return () => {
      worker.terminate()
      reflowWorkerRef.current = null
      reflowWorkerResolversRef.current.clear()
    }
  }, [])

  const postReflowPlanRequest = useCallback((input: ReflowPlannerInput) => {
    const worker = reflowWorkerRef.current
    if (!worker) {
      return {
        requestId: -1,
        promise: Promise.resolve(computeReflowPlan(input)),
      }
    }
    const requestId = reflowWorkerRequestIdRef.current + 1
    reflowWorkerRequestIdRef.current = requestId
    const promise = new Promise<ReflowPlan>((resolve) => {
      reflowWorkerResolversRef.current.set(requestId, resolve)
      worker.postMessage({ id: requestId, input })
    })
    return { requestId, promise }
  }, [computeReflowPlan])

  useEffect(() => {
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return
    const worker = new Worker(new URL("../workers/autoFit.worker.ts", import.meta.url))
    autoFitWorkerRef.current = worker
    worker.onmessage = (event: MessageEvent<{
      id: number
      output: {
        spanUpdates: Partial<Record<string, number>>
        positionUpdates: Partial<Record<string, ModulePosition>>
      }
    }>) => {
      const { id, output } = event.data
      const resolve = autoFitWorkerResolversRef.current.get(id)
      if (!resolve) return
      autoFitWorkerResolversRef.current.delete(id)
      resolve(output)
    }
    worker.onerror = () => {
      worker.terminate()
      autoFitWorkerRef.current = null
      autoFitWorkerResolversRef.current.clear()
    }
    return () => {
      worker.terminate()
      autoFitWorkerRef.current = null
      autoFitWorkerResolversRef.current.clear()
    }
  }, [])

  const postAutoFitRequest = useCallback((input: AutoFitPlannerInput) => {
    const worker = autoFitWorkerRef.current
    if (!worker) {
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
    const requestId = autoFitWorkerRequestIdRef.current + 1
    autoFitWorkerRequestIdRef.current = requestId
    const promise = new Promise<{
      spanUpdates: Partial<Record<string, number>>
      positionUpdates: Partial<Record<string, ModulePosition>>
    }>((resolve) => {
      autoFitWorkerResolversRef.current.set(requestId, resolve)
      worker.postMessage({ id: requestId, input })
    })
    return { requestId, promise }
  }, [])

  useEffect(() => {
    if (!initialLayout || initialLayoutKey === 0) return
    if (lastAppliedLayoutKeyRef.current === initialLayoutKey) return
    if (lastAppliedLayoutKeyRef.current !== 0) {
      pushHistory(buildSnapshot())
    }
    lastAppliedLayoutKeyRef.current = initialLayoutKey
    suppressReflowCheckRef.current = true

    const normalizedKeys = (Array.isArray(initialLayout.blockOrder) ? initialLayout.blockOrder : [])
      .filter((key): key is BlockId => typeof key === "string" && key.length > 0)
      .filter((key, idx, arr) => arr.indexOf(key) === idx)
    if (!normalizedKeys.length) return
    const validStyles = new Set(Object.keys(result.typography.styles))

    const nextTextContent = normalizedKeys.reduce((acc, key) => {
      const value = initialLayout.textContent?.[key]
      acc[key] = typeof value === "string" ? value : (isBaseBlockId(key) ? DEFAULT_TEXT_CONTENT[key] : "")
      return acc
    }, {} as Record<BlockId, string>)

    const nextTextEdited = normalizedKeys.reduce((acc, key) => {
      const value = initialLayout.blockTextEdited?.[key]
      acc[key] = typeof value === "boolean" ? value : true
      return acc
    }, {} as Record<BlockId, boolean>)

    const nextStyleAssignments = normalizedKeys.reduce((acc, key) => {
      const value = initialLayout.styleAssignments?.[key]
      acc[key] = validStyles.has(String(value))
        ? value as TypographyStyleKey
        : (isBaseBlockId(key) ? DEFAULT_STYLE_ASSIGNMENTS[key] : "body")
      return acc
    }, {} as Record<BlockId, TypographyStyleKey>)
    const nextFontFamilies = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockFontFamilies?.[key]
      if (isFontFamily(raw) && raw !== baseFont) acc[key] = raw
      return acc
    }, {} as Partial<Record<BlockId, FontFamily>>)

    const nextSpans = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockColumnSpans?.[key]
      const fallback = getDefaultColumnSpan(key, result.settings.gridCols)
      const value = typeof raw === "number" ? raw : fallback
      acc[key] = Math.max(1, Math.min(result.settings.gridCols, Math.round(value)))
      return acc
    }, {} as Record<BlockId, number>)

    const nextAlignments = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockTextAlignments?.[key]
      acc[key] = raw === "right" ? "right" : "left"
      return acc
    }, {} as Record<BlockId, TextAlignMode>)
    const nextRows = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockRowSpans?.[key]
      const value = typeof raw === "number" ? raw : 1
      acc[key] = Math.max(1, Math.min(result.settings.gridRows, Math.round(value)))
      return acc
    }, {} as Record<BlockId, number>)
    const nextReflow = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockTextReflow?.[key]
      acc[key] = raw === true
      return acc
    }, {} as Record<BlockId, boolean>)
    const nextSyllableDivision = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockSyllableDivision?.[key]
      if (raw === true || raw === false) {
        acc[key] = raw
      }
      return acc
    }, {} as Record<BlockId, boolean>)
    const nextBold = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockBold?.[key]
      if (raw === true || raw === false) acc[key] = raw
      return acc
    }, {} as Record<BlockId, boolean>)
    const nextItalic = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockItalic?.[key]
      if (raw === true || raw === false) acc[key] = raw
      return acc
    }, {} as Record<BlockId, boolean>)
    const nextRotations = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockRotations?.[key]
      if (typeof raw === "number" && Number.isFinite(raw) && Math.abs(raw) > 0.001) {
        acc[key] = Math.max(-80, Math.min(80, raw))
      }
      return acc
    }, {} as Record<BlockId, number>)

    const metrics = getGridMetrics()
    const nextPositions = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockModulePositions?.[key]
      if (!raw || typeof raw.col !== "number" || typeof raw.row !== "number") return acc
      const maxCol = Math.max(0, result.settings.gridCols - nextSpans[key])
      acc[key] = {
        col: Math.max(0, Math.min(maxCol, Math.round(raw.col))),
        row: Math.max(0, Math.min(metrics.maxBaselineRow, raw.row)),
      }
      return acc
    }, {} as Partial<Record<BlockId, ModulePosition>>)

    setBlockCollections(() => ({
      blockOrder: normalizedKeys,
      textContent: nextTextContent,
      blockTextEdited: nextTextEdited,
      styleAssignments: nextStyleAssignments,
      blockFontFamilies: nextFontFamilies,
      blockColumnSpans: nextSpans,
      blockRowSpans: nextRows,
      blockTextAlignments: nextAlignments,
      blockTextReflow: nextReflow,
      blockSyllableDivision: nextSyllableDivision,
      blockBold: nextBold,
      blockItalic: nextItalic,
      blockRotations: nextRotations,
      blockModulePositions: nextPositions,
    }))
    setDragState(null)
    setHoverState(null)
    setEditorState(null)
  }, [
    baseFont,
    buildSnapshot,
    getGridMetrics,
    initialLayout,
    initialLayoutKey,
    pushHistory,
    result.settings.gridCols,
    result.typography.styles,
    setBlockCollections,
  ])

  useEffect(() => {
    const canvas = staticCanvasRef.current
    if (!canvas) return

    const frame = window.requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const { width, height } = result.pageSizePt
      const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
      const { width: modW, height: modH } = result.module
      const { gridCols, gridRows } = result.settings
      const pageWidth = width * scale
      const pageHeight = height * scale
      const contentTop = margins.top * scale
      const baselineSpacing = gridUnit * scale
      const baselineRows = Math.max(
        0,
        Math.round((pageHeight - (margins.top + margins.bottom) * scale) / baselineSpacing),
      )
      const contentBottom = contentTop + baselineRows * baselineSpacing

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-pageWidth / 2, -pageHeight / 2)

      ctx.strokeStyle = "#e5e5e5"
      ctx.lineWidth = 1
      ctx.strokeRect(0, 0, pageWidth, pageHeight)

      if (showMargins) {
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 0.5
        ctx.setLineDash([4, 4])
        ctx.strokeRect(
          margins.left * scale,
          contentTop,
          pageWidth - (margins.left + margins.right) * scale,
          contentBottom - contentTop,
        )
        ctx.setLineDash([])
      }

      if (showModules) {
        ctx.strokeStyle = "#06b6d4"
        ctx.lineWidth = 0.5
        ctx.globalAlpha = 0.7

        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < gridCols; col++) {
            const x = margins.left * scale + col * (modW + gridMarginHorizontal) * scale
            const y = margins.top * scale + row * (modH + gridMarginVertical) * scale
            const w = modW * scale
            const h = modH * scale
            ctx.strokeRect(x, y, w, h)

            if ((row + col) % 2 === 0) {
              ctx.fillStyle = "rgba(0, 0, 0, 0.02)"
              ctx.fillRect(x, y, w, h)
            }
          }
        }
        ctx.globalAlpha = 1
      }

      if (showBaselines) {
        const startY = contentTop
        const baselineStep = isMobile ? 2 : 1

        ctx.strokeStyle = "#ec4899"
        ctx.lineWidth = 0.3
        ctx.globalAlpha = 0.5

        for (let row = 0; row <= baselineRows; row += baselineStep) {
          const y = startY + row * baselineSpacing
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(pageWidth, y)
          ctx.stroke()
        }

        if (baselineRows % baselineStep !== 0) {
          ctx.beginPath()
          ctx.moveTo(0, contentBottom)
          ctx.lineTo(pageWidth, contentBottom)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }

      ctx.restore()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isMobile, result, rotation, scale, showBaselines, showMargins, showModules])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)

    const frame = window.requestAnimationFrame(() => {
      const drawStartedAt = performance.now()
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }

      const { width, height } = result.pageSizePt
      const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
      const { width: modW, height: modH } = result.module
      const { gridRows } = result.settings
      const pageWidth = width * scale
      const pageHeight = height * scale

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      blockRectsRef.current = {}
      if (!showTypography) {
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }

      const { styles } = result.typography
      const contentTop = margins.top * scale
      const contentLeft = margins.left * scale
      const baselinePx = gridUnit * scale
      const moduleXStep = (modW + gridMarginHorizontal) * scale
      const baselineStep = gridUnit * scale
      const baselineOriginTop = contentTop - baselineStep
      const gutterX = gridMarginHorizontal * scale

      const getMinOffset = (): number => 1
      const draftPlans = new Map<BlockId, BlockRenderPlan>()

      const textBlocks = blockOrder
        .filter((key) => key !== "caption")
        .map((key) => ({
          key,
          extraOffset: 0,
          spaceBefore: key === "body" ? 1 : 0,
          lines: [textContent[key] ?? ""],
        }))

      const useRowPlacement = gridRows >= 2
      const useParagraphRows = gridRows >= 5
      const rowHeightBaselines = modH / gridUnit
      const gutterBaselines = gridMarginVertical / gridUnit
      const rowStepBaselines = rowHeightBaselines + gutterBaselines
      const row2TopBaselines = rowStepBaselines
      const row3TopBaselines = rowStepBaselines * 2

      const displayStartOffset = getMinOffset()
      const restStartOffset = gridRows > 6
        ? row3TopBaselines + getMinOffset()
        : row2TopBaselines + getMinOffset()

      let currentBaselineOffset = useRowPlacement ? restStartOffset : displayStartOffset
      let currentRowIndex = 0

      const nextRects: Record<BlockId, BlockRect> = {}
      for (const key of blockOrder) {
        nextRects[key] = { x: 0, y: 0, width: 0, height: 0 }
      }

      const getOriginForBlock = (key: BlockId, fallbackX: number, fallbackY: number) => {
        const dragged = dragState?.key === key ? dragState.preview : undefined
        const manual = dragged ?? blockModulePositions[key]
        if (!manual) return { x: fallbackX, y: fallbackY }
        const clamped = clampModulePosition(manual, key)
        return {
          x: contentLeft + clamped.col * moduleXStep,
          y: baselineOriginTop + clamped.row * baselineStep,
        }
      }

      for (const block of textBlocks) {
        const blockText = block.lines.join(" ")
        if (!blockText.trim()) continue

        const styleKey = styleAssignments[block.key] ?? "body"
        const style = styles[styleKey]
        if (!style) continue

        const fontSize = style.size * scale
        const baselineMult = style.baselineMultiplier

        let blockStartOffset = currentBaselineOffset + block.spaceBefore + block.extraOffset
        if (useParagraphRows) {
          const minOffset = getMinOffset()
          blockStartOffset = currentRowIndex * rowStepBaselines + minOffset + block.extraOffset
        } else if (useRowPlacement && block.key === "display") {
          blockStartOffset = displayStartOffset + block.extraOffset
        }

        const blockFont = getBlockFont(block.key)
        const blockFontStyle = isBlockItalic(block.key) ? "italic " : ""
        const blockFontWeight = isBlockBold(block.key) ? "700" : "400"
        const blockRotation = getBlockRotation(block.key)
        ctx.font = `${blockFontStyle}${blockFontWeight} ${fontSize}px ${getFontFamilyCss(blockFont)}`
        const planFont = ctx.font

        const span = getBlockSpan(block.key)
        const wrapWidth = span * modW * scale + Math.max(span - 1, 0) * gutterX
        const rowSpan = getBlockRows(block.key)
        const columnReflow = isTextReflowEnabled(block.key)
        const textLines = getWrappedText(
          ctx,
          blockText,
          columnReflow ? modW * scale : wrapWidth,
          isSyllableDivisionEnabled(block.key),
        )

        const autoBlockX = contentLeft
        const autoBlockY = contentTop + (blockStartOffset - 1) * baselinePx
        const origin = getOriginForBlock(block.key, autoBlockX, autoBlockY)
        const textAlign = blockTextAlignments[block.key] ?? "left"
        const textAscentPx = getTextAscentPx(ctx, fontSize)
        const hitTopPadding = Math.max(baselinePx, textAscentPx)
        const lineStep = baselineMult * baselinePx
        const pageBottomY = pageHeight - margins.bottom * scale
        const moduleHeightPx = rowSpan * modH * scale + Math.max(rowSpan - 1, 0) * gridMarginVertical * scale
        const maxLinesPerColumn = Math.max(1, Math.floor(moduleHeightPx / lineStep))
        let maxUsedRows = 0

        nextRects[block.key] = {
          x: origin.x,
          y: origin.y - hitTopPadding,
          width: wrapWidth,
          height: columnReflow
            ? moduleHeightPx + hitTopPadding
            : (Math.max(textLines.length, 1) * baselineMult + 1) * baselinePx + hitTopPadding,
        }
        const commands: TextDrawCommand[] = []

        if (!columnReflow) {
          const textAnchorX = textAlign === "right" ? origin.x + wrapWidth : origin.x
          textLines.forEach((line, lineIndex) => {
            const lineTopY = origin.y + baselinePx + lineIndex * baselineMult * baselinePx
            const y = lineTopY + textAscentPx
            if (lineTopY < pageBottomY) {
              maxUsedRows = Math.max(maxUsedRows, lineIndex + 1)
              const opticalOffsetX = getOpticalOffset(ctx, line, textAlign, fontSize)
              commands.push({ text: line, x: textAnchorX + opticalOffsetX, y })
            }
          })
        } else {
          const columnWidth = modW * scale
          for (let lineIndex = 0; lineIndex < textLines.length; lineIndex += 1) {
            const columnIndex = Math.floor(lineIndex / maxLinesPerColumn)
            if (columnIndex >= span) break
            const rowIndex = lineIndex % maxLinesPerColumn
            const columnX = origin.x + columnIndex * (columnWidth + gutterX)
            const textAnchorX = textAlign === "right" ? columnX + columnWidth : columnX
            const line = textLines[lineIndex]
            const lineTopY = origin.y + baselinePx + rowIndex * lineStep
            const y = lineTopY + textAscentPx
            if (lineTopY >= pageBottomY) continue
            maxUsedRows = Math.max(maxUsedRows, rowIndex + 1)
            const opticalOffsetX = getOpticalOffset(ctx, line, textAlign, fontSize)
            commands.push({ text: line, x: textAnchorX + opticalOffsetX, y })
          }
        }

        if (maxUsedRows > 0 && !columnReflow) {
          nextRects[block.key].height = (maxUsedRows * baselineMult + 1) * baselinePx + hitTopPadding
        }

        draftPlans.set(block.key, {
          key: block.key,
          rect: nextRects[block.key],
          signature: [
            styleKey,
            blockFont,
            blockFontWeight === "700" ? "bold" : "regular",
            blockFontStyle ? "italic" : "normal",
            textAlign,
            blockRotation.toFixed(2),
            span,
            rowSpan,
            columnReflow ? 1 : 0,
            origin.x.toFixed(3),
            origin.y.toFixed(3),
            nextRects[block.key].width.toFixed(3),
            nextRects[block.key].height.toFixed(3),
            commands.map((command) => `${command.text}@${command.x.toFixed(3)},${command.y.toFixed(3)}`).join("||"),
          ].join("|"),
          font: planFont,
          textAlign,
          blockRotation,
          commands,
        })

        if (!useParagraphRows) {
          const usedLineRows = maxUsedRows || textLines.length
          if (!useRowPlacement || block.key !== "display") {
            currentBaselineOffset = blockStartOffset + usedLineRows * baselineMult
          } else {
            currentBaselineOffset = restStartOffset
          }
        } else {
          const blockEnd = blockStartOffset + textLines.length * baselineMult
          currentRowIndex = Math.ceil(blockEnd / rowStepBaselines)
        }
      }

      const hasCaptionBlock = blockOrder.includes("caption")
      const captionStyleKey = styleAssignments.caption ?? "caption"
      const captionStyle = styles[captionStyleKey]
      const captionText = textContent.caption ?? ""
      if (hasCaptionBlock && captionStyle && captionText.trim()) {
        const captionFontSize = captionStyle.size * scale
        const captionBaselineMult = captionStyle.baselineMultiplier
        const captionFont = getBlockFont("caption")

        const captionFontStyle = isBlockItalic("caption") ? "italic " : ""
        const captionFontWeight = isBlockBold("caption") ? "700" : "400"
        const captionRotation = getBlockRotation("caption")
        ctx.font = `${captionFontStyle}${captionFontWeight} ${captionFontSize}px ${getFontFamilyCss(captionFont)}`
        const captionPlanFont = ctx.font
        const captionAlign = blockTextAlignments.caption ?? "left"

        const captionSpan = getBlockSpan("caption")
        const captionRowSpan = getBlockRows("caption")
        const captionWidth = captionSpan * modW * scale + Math.max(captionSpan - 1, 0) * gutterX
        const captionColumnReflow = isTextReflowEnabled("caption")
        const captionLines = getWrappedText(
          ctx,
          captionText,
          captionColumnReflow ? modW * scale : captionWidth,
          isSyllableDivisionEnabled("caption"),
        )
        const captionLineCount = captionLines.length

        const pageHeightPt = result.pageSizePt.height
        const availableHeight = pageHeightPt - margins.top - margins.bottom
        const totalBaselinesFromTop = Math.floor(availableHeight / gridUnit)
        const firstLineBaselineUnit = totalBaselinesFromTop - (captionLineCount - 1) * captionBaselineMult

        const autoCaptionY = contentTop + (firstLineBaselineUnit - 1) * baselinePx
        const captionOrigin = getOriginForBlock("caption", contentLeft, autoCaptionY)
        ctx.textAlign = captionAlign
        const captionAscentPx = getTextAscentPx(ctx, captionFontSize)
        const captionHitTopPadding = Math.max(baselinePx, captionAscentPx)
        const captionLineStep = captionBaselineMult * baselinePx
        const captionPageBottomY = pageHeight - margins.bottom * scale
        const captionModuleHeightPx = captionRowSpan * modH * scale + Math.max(captionRowSpan - 1, 0) * gridMarginVertical * scale
        const captionMaxLinesPerColumn = Math.max(1, Math.floor(captionModuleHeightPx / captionLineStep))
        let captionMaxUsedRows = 0
        const captionCommands: TextDrawCommand[] = []

        if (!captionColumnReflow) {
          const captionAnchorX = captionAlign === "right" ? captionOrigin.x + captionWidth : captionOrigin.x
          captionLines.forEach((line, lineIndex) => {
            const lineTopY = captionOrigin.y + baselinePx + lineIndex * captionBaselineMult * baselinePx
            const y = lineTopY + captionAscentPx
            if (lineTopY < captionPageBottomY) {
              captionMaxUsedRows = Math.max(captionMaxUsedRows, lineIndex + 1)
              const opticalOffsetX = getOpticalOffset(ctx, line, captionAlign, captionFontSize)
              captionCommands.push({ text: line, x: captionAnchorX + opticalOffsetX, y })
            }
          })
        } else {
          const columnWidth = modW * scale
          for (let lineIndex = 0; lineIndex < captionLines.length; lineIndex += 1) {
            const columnIndex = Math.floor(lineIndex / captionMaxLinesPerColumn)
            if (columnIndex >= captionSpan) break
            const rowIndex = lineIndex % captionMaxLinesPerColumn
            const columnX = captionOrigin.x + columnIndex * (columnWidth + gutterX)
            const captionAnchorX = captionAlign === "right" ? columnX + columnWidth : columnX
            const line = captionLines[lineIndex]
            const lineTopY = captionOrigin.y + baselinePx + rowIndex * captionLineStep
            const y = lineTopY + captionAscentPx
            if (lineTopY >= captionPageBottomY) continue
            captionMaxUsedRows = Math.max(captionMaxUsedRows, rowIndex + 1)
            const opticalOffsetX = getOpticalOffset(ctx, line, captionAlign, captionFontSize)
            captionCommands.push({ text: line, x: captionAnchorX + opticalOffsetX, y })
          }
        }

        const captionRect: BlockRect = {
          x: captionOrigin.x,
          y: captionOrigin.y - captionHitTopPadding,
          width: captionWidth,
          height: captionColumnReflow
            ? captionModuleHeightPx + captionHitTopPadding
            : ((captionMaxUsedRows || captionLineCount) * captionBaselineMult + 1) * baselinePx + captionHitTopPadding,
        }
        nextRects.caption = captionRect
        draftPlans.set("caption", {
          key: "caption",
          rect: captionRect,
          signature: [
            captionStyleKey,
            captionFont,
            captionFontWeight === "700" ? "bold" : "regular",
            captionFontStyle ? "italic" : "normal",
            captionAlign,
            captionRotation.toFixed(2),
            captionSpan,
            captionRowSpan,
            captionColumnReflow ? 1 : 0,
            captionOrigin.x.toFixed(3),
            captionOrigin.y.toFixed(3),
            captionRect.width.toFixed(3),
            captionRect.height.toFixed(3),
            captionCommands
              .map((command) => `${command.text}@${command.x.toFixed(3)},${command.y.toFixed(3)}`)
              .join("||"),
          ].join("|"),
          font: captionPlanFont,
          textAlign: captionAlign,
          blockRotation: captionRotation,
          commands: captionCommands,
        })
      }

      blockRectsRef.current = nextRects

      let typographyBuffer = typographyBufferRef.current
      if (!typographyBuffer) {
        typographyBuffer = document.createElement("canvas")
        typographyBufferRef.current = typographyBuffer
      }
      const resized = typographyBuffer.width !== canvas.width || typographyBuffer.height !== canvas.height
      if (resized) {
        typographyBuffer.width = canvas.width
        typographyBuffer.height = canvas.height
        previousPlansRef.current.clear()
      }
      const transformSignature = `${rotation}|${pageWidth.toFixed(4)}|${pageHeight.toFixed(4)}`
      const transformChanged = typographyBufferTransformRef.current !== transformSignature
      if (transformChanged) {
        typographyBufferTransformRef.current = transformSignature
        previousPlansRef.current.clear()
      }
      const bufferCtx = typographyBuffer.getContext("2d")
      if (!bufferCtx) {
        recordPerfMetric("drawMs", performance.now() - drawStartedAt)
        return
      }

      const drawPlans = (plans: BlockRenderPlan[]) => {
        bufferCtx.fillStyle = "#1f2937"
        bufferCtx.textBaseline = "alphabetic"
        for (const plan of plans) {
          bufferCtx.font = plan.font
          bufferCtx.textAlign = plan.textAlign
          const angle = (plan.blockRotation * Math.PI) / 180
          for (const command of plan.commands) {
            if (Math.abs(angle) > 0.0001) {
              bufferCtx.save()
              bufferCtx.translate(command.x, command.y)
              bufferCtx.rotate(angle)
              bufferCtx.fillText(command.text, 0, 0)
              bufferCtx.restore()
            } else {
              bufferCtx.fillText(command.text, command.x, command.y)
            }
          }
        }
      }

      const previousPlans = previousPlansRef.current
      const fullRedraw = resized || transformChanged || previousPlans.size === 0
      const allCurrentPlans = [...draftPlans.values()]

      if (fullRedraw) {
        bufferCtx.setTransform(1, 0, 0, 1, 0, 0)
        bufferCtx.clearRect(0, 0, typographyBuffer.width, typographyBuffer.height)
        bufferCtx.save()
        bufferCtx.translate(typographyBuffer.width / 2, typographyBuffer.height / 2)
        bufferCtx.rotate((rotation * Math.PI) / 180)
        bufferCtx.translate(-pageWidth / 2, -pageHeight / 2)
        drawPlans(allCurrentPlans)
        bufferCtx.restore()
      } else {
        const dirtyKeys = new Set<BlockId>()
        const mergedKeys = new Set<BlockId>([
          ...Array.from(previousPlans.keys()),
          ...Array.from(draftPlans.keys()),
        ])
        for (const key of mergedKeys) {
          const prev = previousPlans.get(key)
          const next = draftPlans.get(key)
          if (!prev || !next) {
            dirtyKeys.add(key)
            continue
          }
          if (
            prev.signature !== next.signature
            || prev.rect.x !== next.rect.x
            || prev.rect.y !== next.rect.y
            || prev.rect.width !== next.rect.width
            || prev.rect.height !== next.rect.height
          ) {
            dirtyKeys.add(key)
          }
        }
        if (!dirtyKeys.size) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(typographyBuffer, 0, 0)
          previousPlansRef.current = draftPlans
          recordPerfMetric("drawMs", performance.now() - drawStartedAt)
          return
        }
        const dirtyRegions: BlockRect[] = []
        for (const key of dirtyKeys) {
          const prev = previousPlans.get(key)
          const next = draftPlans.get(key)
          if (prev) dirtyRegions.push(prev.rect)
          if (next) dirtyRegions.push(next.rect)
        }
        if (dirtyRegions.length > 0) {
          const redrawPlans = allCurrentPlans.filter((plan) =>
            dirtyRegions.some((region) => rectsIntersect(plan.rect, region)),
          )
          bufferCtx.save()
          bufferCtx.translate(typographyBuffer.width / 2, typographyBuffer.height / 2)
          bufferCtx.rotate((rotation * Math.PI) / 180)
          bufferCtx.translate(-pageWidth / 2, -pageHeight / 2)
          const clearPadding = 2
          for (const region of dirtyRegions) {
            bufferCtx.clearRect(
              region.x - clearPadding,
              region.y - clearPadding,
              region.width + clearPadding * 2,
              region.height + clearPadding * 2,
            )
          }
          drawPlans(redrawPlans)
          bufferCtx.restore()
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(typographyBuffer, 0, 0)
      previousPlansRef.current = draftPlans
      recordPerfMetric("drawMs", performance.now() - drawStartedAt)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    blockModulePositions,
    blockOrder,
    blockRowSpans,
    blockTextAlignments,
    clampModulePosition,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getOpticalOffset,
    getWrappedText,
    isSyllableDivisionEnabled,
    isBlockItalic,
    isTextReflowEnabled,
    onCanvasReady,
    result,
    rotation,
    scale,
    showTypography,
    styleAssignments,
    textContent,
    recordPerfMetric,
  ])

  useEffect(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const frame = window.requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
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
      ctx.translate(canvas.width / 2, canvas.height / 2)
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
  }, [dragState, getBlockSpan, result, rotation, scale, showTypography])

  useEffect(() => {
    const calculateScale = () => {
      const container = previewContainerRef.current
      if (!container) return

      const { width, height } = result.pageSizePt
      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40

      setScale(Math.min(containerWidth / width, containerHeight / height))
    }

    calculateScale()
    window.addEventListener("resize", calculateScale)
    return () => window.removeEventListener("resize", calculateScale)
  }, [result])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const currentGrid = { cols: result.settings.gridCols, rows: result.settings.gridRows }
    const currentModuleRowStep = Math.max(0.0001, (result.module.height + result.grid.gridMarginVertical) / result.grid.gridUnit)
    if (!previousGridRef.current) {
      previousGridRef.current = currentGrid
      previousModuleRowStepRef.current = currentModuleRowStep
      return
    }
    if (suppressReflowCheckRef.current) {
      previousGridRef.current = currentGrid
      previousModuleRowStepRef.current = currentModuleRowStep
      suppressReflowCheckRef.current = false
      return
    }
    if (pendingReflow) return

    const previousGrid = previousGridRef.current
    const previousModuleRowStep = previousModuleRowStepRef.current ?? currentModuleRowStep
    const gridChanged = previousGrid.cols !== currentGrid.cols || previousGrid.rows !== currentGrid.rows
    const moduleRowStepChanged = Math.abs(previousModuleRowStep - currentModuleRowStep) > 0.0001
    if (!gridChanged && !moduleRowStepChanged) return
    const isPureColIncrease = (
      currentGrid.cols >= previousGrid.cols
      && currentGrid.rows === previousGrid.rows
      && currentGrid.cols > previousGrid.cols
      && !moduleRowStepChanged
    )
    if (isPureColIncrease) {
      // Expanding the grid appends capacity to the right/bottom; keep existing layout untouched.
      previousGridRef.current = currentGrid
      previousModuleRowStepRef.current = currentModuleRowStep
      return
    }
    const rowsChanged = currentGrid.rows !== previousGrid.rows || moduleRowStepChanged
    const maxBaselineRow = Math.max(
      0,
      Math.floor((result.pageSizePt.height - result.grid.margins.top - result.grid.margins.bottom) / result.grid.gridUnit)
    )
    const remapRowBetweenGrids = (row: number): number => {
      const clamped = Math.max(0, Math.min(maxBaselineRow, row))
      if (!rowsChanged) return clamped
      const moduleIndex = Math.max(0, Math.round(clamped / previousModuleRowStep))
      const next = moduleIndex * currentModuleRowStep
      return Math.max(0, Math.min(maxBaselineRow, next))
    }
    const sourcePositions = rowsChanged
      ? Object.keys(blockModulePositions).reduce((acc, key) => {
          const position = blockModulePositions[key]
          if (!position) return acc
          acc[key] = { col: position.col, row: remapRowBetweenGrids(position.row) }
          return acc
        }, {} as Partial<Record<BlockId, ModulePosition>>)
      : blockModulePositions

    const applyComputedPlan = (plan: ReflowPlan) => {
      const spanChanged = blockOrder.some((key) => {
        const currentSpan = blockColumnSpans[key] ?? getDefaultColumnSpan(key, previousGrid.cols)
        return plan.resolvedSpans[key] !== currentSpan
      })
      const positionChanged = blockOrder.some((key) => {
        const a = blockModulePositions[key]
        const b = plan.nextPositions[key]
        if (!a && !b) return false
        if (!a || !b) return true
        return a.col !== b.col || Math.abs(a.row - b.row) > 0.0001
      })

      if (!spanChanged && !positionChanged) {
        previousGridRef.current = currentGrid
        previousModuleRowStepRef.current = currentModuleRowStep
        return
      }

      if (rowsChanged) {
        pushHistory(buildSnapshot())
        setBlockColumnSpans((prev) => ({ ...prev, ...plan.resolvedSpans }))
        setBlockModulePositions((prev) => ({ ...prev, ...plan.nextPositions }))
        previousGridRef.current = currentGrid
        previousModuleRowStepRef.current = currentModuleRowStep
        return
      }

      if (plan.movedCount > 0) {
        setPendingReflow({
          previousGrid,
          nextGrid: currentGrid,
          movedCount: plan.movedCount,
          resolvedSpans: plan.resolvedSpans,
          nextPositions: plan.nextPositions,
        })
        return
      }

      pushHistory(buildSnapshot())
      setBlockColumnSpans((prev) => ({ ...prev, ...plan.resolvedSpans }))
      setBlockModulePositions((prev) => ({ ...prev, ...plan.nextPositions }))
      previousGridRef.current = currentGrid
      previousModuleRowStepRef.current = currentModuleRowStep
    }

    const plannerInput = buildReflowPlannerInput(currentGrid.cols, currentGrid.rows, sourcePositions)
    const reflowStartedAt = performance.now()
    const { requestId, promise } = postReflowPlanRequest(plannerInput)
    let cancelled = false
    promise
      .then((plan) => {
        if (cancelled) return
        recordPerfMetric("reflowMs", performance.now() - reflowStartedAt)
        applyComputedPlan(plan)
      })
      .catch(() => {
        if (cancelled) return
        recordPerfMetric("reflowMs", performance.now() - reflowStartedAt)
        applyComputedPlan(computeReflowPlan(plannerInput))
      })
    return () => {
      cancelled = true
      if (requestId > 0) reflowWorkerResolversRef.current.delete(requestId)
    }
  }, [
    blockColumnSpans,
    blockModulePositions,
    blockOrder,
    buildReflowPlannerInput,
    buildSnapshot,
    computeReflowPlan,
    pendingReflow,
    postReflowPlanRequest,
    pushHistory,
    recordPerfMetric,
    result.grid.gridMarginVertical,
    result.grid.gridUnit,
    result.grid.margins.bottom,
    result.grid.margins.top,
    result.module.height,
    result.pageSizePt.height,
    result.settings.gridCols,
    result.settings.gridRows,
  ])

  useEffect(() => {
    if (pendingReflow) return
    const signature = [
      result.settings.gridCols,
      result.settings.gridRows,
      result.module.width,
      result.module.height,
      result.grid.gridUnit,
      result.grid.gridMarginVertical,
      scale,
    ].join("|")
    if (lastAutoFitSettingsRef.current === signature) return
    lastAutoFitSettingsRef.current = signature

    const items: AutoFitPlannerInput["items"] = []
    for (const key of blockOrder) {
      if (!isTextReflowEnabled(key)) continue
      const currentPosition = blockModulePositions[key]
      if (!currentPosition) continue
      const styleKey = getStyleKeyForBlock(key)
      const style = result.typography.styles[styleKey]
      if (!style) continue
      items.push({
        key,
        text: textContent[key] ?? "",
        style: {
          size: style.size,
          baselineMultiplier: style.baselineMultiplier,
          weight: style.weight,
        },
        rowSpan: getBlockRows(key),
        syllableDivision: isSyllableDivisionEnabled(key),
        position: currentPosition,
        currentSpan: getBlockSpan(key),
      })
    }
    if (!items.length) return

    const input: AutoFitPlannerInput = {
      items,
      scale,
      gridCols: result.settings.gridCols,
      moduleWidth: result.module.width,
      moduleHeight: result.module.height,
      gridMarginVertical: result.grid.gridMarginVertical,
      gridUnit: result.grid.gridUnit,
      marginTop: result.grid.margins.top,
      marginBottom: result.grid.margins.bottom,
      pageHeight: result.pageSizePt.height,
    }

    const autoFitStartedAt = performance.now()
    const { requestId, promise } = postAutoFitRequest(input)
    let cancelled = false
    promise.then((output) => {
      if (cancelled) return
      recordPerfMetric("autofitMs", performance.now() - autoFitStartedAt)
      const hasSpanChanges = Object.keys(output.spanUpdates).length > 0
      const hasPositionChanges = Object.keys(output.positionUpdates).length > 0
      if (hasSpanChanges) {
        setBlockColumnSpans((prev) => ({ ...prev, ...output.spanUpdates }))
      }
      if (hasPositionChanges) {
        setBlockModulePositions((prev) => ({ ...prev, ...output.positionUpdates }))
      }
    }).catch(() => {
      if (cancelled) return
      recordPerfMetric("autofitMs", performance.now() - autoFitStartedAt)
      const fallback = computeAutoFitBatch(input, (font, text) => {
        const canvas = canvasRef.current
        if (!canvas) return 0
        const ctx = canvas.getContext("2d")
        if (!ctx) return 0
        ctx.font = font
        return ctx.measureText(text).width
      })
      if (Object.keys(fallback.spanUpdates).length > 0) {
        setBlockColumnSpans((prev) => ({ ...prev, ...fallback.spanUpdates }))
      }
      if (Object.keys(fallback.positionUpdates).length > 0) {
        setBlockModulePositions((prev) => ({ ...prev, ...fallback.positionUpdates }))
      }
    })
    return () => {
      cancelled = true
      if (requestId > 0) autoFitWorkerResolversRef.current.delete(requestId)
    }
  }, [
    blockModulePositions,
    blockOrder,
    getBlockRows,
    getBlockSpan,
    getStyleKeyForBlock,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    pendingReflow,
    result.grid.gridMarginVertical,
    result.grid.gridUnit,
    result.module.height,
    result.module.width,
    result.settings.gridCols,
    result.settings.gridRows,
    scale,
    textContent,
    postAutoFitRequest,
    recordPerfMetric,
    result.pageSizePt.height,
    result.typography.styles,
  ])

  useEffect(() => {
    if (!editorState) return
    textareaRef.current?.focus()
  }, [editorState?.target])

  useEffect(() => {
    if (!editorState) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        setEditorState(null)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [editorState])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (!(event.metaKey || event.ctrlKey)) return
      if (editorState) return
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }
      if ((event.key.toLowerCase() === "y") || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [editorState, redo, undo])

  const clearPendingTouchLongPress = useCallback(() => {
    if (touchLongPressTimerRef.current !== null) {
      window.clearTimeout(touchLongPressTimerRef.current)
      touchLongPressTimerRef.current = null
    }
    touchPendingDragRef.current = null
  }, [])

  const finishDrag = useCallback(() => {
    if (dragRafRef.current !== null) {
      window.cancelAnimationFrame(dragRafRef.current)
      dragRafRef.current = null
    }
    const pending = pendingDragPreviewRef.current
    pendingDragPreviewRef.current = null
    setDragState((prev) => {
      if (!prev) return null
      const nextPreview = pending?.preview ?? prev.preview
      const nextMoved = pending?.moved ?? prev.moved
      const nextCopyOnDrop = pending?.copyOnDrop ?? prev.copyOnDrop
      if (nextMoved) {
        if (nextCopyOnDrop) {
          const sourceText = textContent[prev.key] ?? ""
          const maxParagraphCount = result.settings.gridCols * result.settings.gridRows
          const activeParagraphCount = blockOrder.filter((key) => (textContent[key] ?? "").trim().length > 0).length
          if (sourceText.trim().length > 0 && activeParagraphCount >= maxParagraphCount) {
            window.alert(`Maximum paragraphs reached (${maxParagraphCount}).`)
            return null
          }

          const styleKey = getStyleKeyForBlock(prev.key)
          const sourceRows = getBlockRows(prev.key)
          const sourceReflow = isTextReflowEnabled(prev.key)
          const sourceSyllableDivision = isSyllableDivisionEnabled(prev.key)
          const sourceSpan = getBlockSpan(prev.key)
          const autoFit = getAutoFitForPlacement({
            key: prev.key,
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
            const sourceIndex = current.blockOrder.indexOf(prev.key)
            const nextOrder = [...current.blockOrder]
            if (sourceIndex >= 0) nextOrder.splice(sourceIndex + 1, 0, newKey)
            else nextOrder.push(newKey)

            const sourceFont = current.blockFontFamilies[prev.key] ?? baseFont
            const nextFonts = { ...current.blockFontFamilies }
            if (sourceFont === baseFont) {
              delete nextFonts[newKey]
            } else {
              nextFonts[newKey] = sourceFont
            }
            const nextItalic = { ...current.blockItalic }
            if (current.blockItalic[prev.key] === true || current.blockItalic[prev.key] === false) {
              nextItalic[newKey] = current.blockItalic[prev.key]
            } else {
              delete nextItalic[newKey]
            }
            const nextBold = { ...current.blockBold }
            if (current.blockBold[prev.key] === true || current.blockBold[prev.key] === false) {
              nextBold[newKey] = current.blockBold[prev.key]
            } else {
              delete nextBold[newKey]
            }
            const nextRotations = { ...current.blockRotations }
            const sourceRotation = current.blockRotations[prev.key]
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
                [newKey]: current.textContent[prev.key] ?? "",
              },
              blockTextEdited: {
                ...current.blockTextEdited,
                [newKey]: current.blockTextEdited[prev.key] ?? true,
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
                [newKey]: current.blockTextAlignments[prev.key] ?? "left",
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
          const autoFit = getAutoFitDropUpdate(prev.key, nextPreview)
          if (autoFit) {
            setBlockColumnSpans((current) => ({
              ...current,
              [prev.key]: autoFit.span,
            }))
            setBlockModulePositions((current) => ({
              ...current,
              [prev.key]: autoFit.position,
            }))
          } else {
            setBlockModulePositions((current) => ({
              ...current,
              [prev.key]: nextPreview,
            }))
          }
        }
        dragEndedAtRef.current = Date.now()
      }
      return null
    })
    activeDragPointerIdRef.current = null
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
    textContent,
  ])

  useEffect(() => {
    return () => {
      clearPendingTouchLongPress()
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current)
        dragRafRef.current = null
      }
      pendingDragPreviewRef.current = null
      activeDragPointerIdRef.current = null
    }
  }, [clearPendingTouchLongPress])

  const closeEditor = useCallback(() => {
    setEditorState(null)
  }, [])

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
      const defaultBold = result.typography.styles[editorState.draftStyle]?.weight === "Bold"
      if (editorState.draftBold === defaultBold) {
        delete nextBold[editorState.target]
      } else {
        nextBold[editorState.target] = editorState.draftBold
      }
      const nextItalic = { ...prev.blockItalic }
      const defaultItalic = result.typography.styles[editorState.draftStyle]?.blockItalic === true
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
        const maxCol = Math.max(0, result.settings.gridCols - nextSpan)
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
    result.settings.gridCols,
    result.typography.styles,
    setBlockCollections,
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
        textContent: omitTarget(prev.textContent) as Record<BlockId, string>,
        blockTextEdited: omitTarget(prev.blockTextEdited) as Record<BlockId, boolean>,
        styleAssignments: omitTarget(prev.styleAssignments) as Record<BlockId, TypographyStyleKey>,
        blockFontFamilies: omitTarget(prev.blockFontFamilies) as Partial<Record<BlockId, FontFamily>>,
        blockColumnSpans: omitTarget(prev.blockColumnSpans) as Partial<Record<BlockId, number>>,
        blockRowSpans: omitTarget(prev.blockRowSpans) as Partial<Record<BlockId, number>>,
        blockTextAlignments: omitTarget(prev.blockTextAlignments) as Partial<Record<BlockId, TextAlignMode>>,
        blockTextReflow: omitTarget(prev.blockTextReflow) as Partial<Record<BlockId, boolean>>,
        blockSyllableDivision: omitTarget(prev.blockSyllableDivision) as Partial<Record<BlockId, boolean>>,
        blockBold: omitTarget(prev.blockBold) as Partial<Record<BlockId, boolean>>,
        blockItalic: omitTarget(prev.blockItalic) as Partial<Record<BlockId, boolean>>,
        blockRotations: omitTarget(prev.blockRotations) as Partial<Record<BlockId, number>>,
        blockModulePositions: omitTarget(prev.blockModulePositions) as Partial<Record<BlockId, ModulePosition>>,
      }
    })
    setEditorState(null)
  }, [editorState, recordHistoryBeforeChange, setBlockCollections])

  const handleCanvasPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!showTypography || editorState) return
    if (event.pointerType === "mouse" && event.button !== 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    const key = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (key) {
      const block = blockRectsRef.current[key]
      if (!block) return
      event.preventDefault()
      const snapped = blockModulePositions[key] ?? snapToModule(block.x, block.y, key)
      const nextDragState: DragState = {
        key,
        startPageX: pagePoint.x,
        startPageY: pagePoint.y,
        pointerOffsetX: pagePoint.x - block.x,
        pointerOffsetY: pagePoint.y - block.y,
        preview: snapped,
        moved: false,
        copyOnDrop: event.pointerType !== "touch" && event.shiftKey,
      }
      if (event.pointerType === "touch") {
        clearPendingTouchLongPress()
        touchPendingDragRef.current = {
          pointerId: event.pointerId,
          dragState: nextDragState,
          startClientX: event.clientX,
          startClientY: event.clientY,
        }
        touchLongPressTimerRef.current = window.setTimeout(() => {
          const pending = touchPendingDragRef.current
          if (!pending || pending.pointerId !== event.pointerId) return
          touchPendingDragRef.current = null
          touchLongPressTimerRef.current = null
          setDragState(pending.dragState)
          activeDragPointerIdRef.current = pending.pointerId
          const targetCanvas = canvasRef.current
          if (targetCanvas) {
            try {
              targetCanvas.setPointerCapture(pending.pointerId)
            } catch {
              // Pointer may already be released; ignore.
            }
          }
        }, TOUCH_LONG_PRESS_MS)
        return
      }
      setDragState(nextDragState)
      activeDragPointerIdRef.current = event.pointerId
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Ignore unsupported pointer-capture failures.
      }
      setHoverState(null)
    }
  }, [
    blockModulePositions,
    clearPendingTouchLongPress,
    editorState,
    findTopmostBlockAtPoint,
    showTypography,
    snapToModule,
    toPagePoint,
    TOUCH_LONG_PRESS_MS,
  ])

  const handleCanvasPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const pendingTouchDrag = touchPendingDragRef.current
    if (!dragState && pendingTouchDrag && event.pointerId === pendingTouchDrag.pointerId) {
      const dx = event.clientX - pendingTouchDrag.startClientX
      const dy = event.clientY - pendingTouchDrag.startClientY
      if (Math.hypot(dx, dy) > TOUCH_CANCEL_DISTANCE_PX) {
        clearPendingTouchLongPress()
      }
      return
    }

    if (!dragState || activeDragPointerIdRef.current !== event.pointerId) return
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const point = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!point) return

    const useBaselineSnap = event.pointerType !== "touch" && event.ctrlKey
    const snap = useBaselineSnap
      ? snapToBaseline(point.x - dragState.pointerOffsetX, point.y - dragState.pointerOffsetY, dragState.key)
      : snapToModule(point.x - dragState.pointerOffsetX, point.y - dragState.pointerOffsetY, dragState.key)
    const moved = dragState.moved || Math.abs(point.x - dragState.startPageX) > 3 || Math.abs(point.y - dragState.startPageY) > 3
    const copyOnDrop = event.pointerType !== "touch" && event.shiftKey
    pendingDragPreviewRef.current = { preview: snap, moved, copyOnDrop }
    if (dragRafRef.current !== null) return
    dragRafRef.current = window.requestAnimationFrame(() => {
      dragRafRef.current = null
      const pending = pendingDragPreviewRef.current
      if (!pending) return
      pendingDragPreviewRef.current = null
      setDragState((prev) => (
        prev
          ? {
              ...prev,
              preview: pending.preview,
              moved: pending.moved,
              copyOnDrop: pending.copyOnDrop,
            }
          : prev
      ))
    })
  }, [TOUCH_CANCEL_DISTANCE_PX, clearPendingTouchLongPress, dragState, snapToBaseline, snapToModule, toPagePoint])

  const handleCanvasPointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const pendingTouchDrag = touchPendingDragRef.current
    if (pendingTouchDrag && event.pointerId === pendingTouchDrag.pointerId) {
      clearPendingTouchLongPress()
      return
    }
    if (!dragState || activeDragPointerIdRef.current !== event.pointerId) return
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // No-op.
    }
    finishDrag()
  }, [clearPendingTouchLongPress, dragState, finishDrag])

  const handleCanvasPointerCancel = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const pendingTouchDrag = touchPendingDragRef.current
    if (pendingTouchDrag && event.pointerId === pendingTouchDrag.pointerId) {
      clearPendingTouchLongPress()
      return
    }
    if (!dragState || activeDragPointerIdRef.current !== event.pointerId) return
    finishDrag()
  }, [clearPendingTouchLongPress, dragState, finishDrag])

  const handleCanvasLostPointerCapture = useCallback(() => {
    if (!dragState) return
    finishDrag()
  }, [dragState, finishDrag])

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

  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
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

    const maxParagraphCount = result.settings.gridCols * result.settings.gridRows
    const activeParagraphCount = blockOrder.filter((key) => (textContent[key] ?? "").trim().length > 0).length
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
    const defaultSpan = getDefaultColumnSpan(newKey, result.settings.gridCols)
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
  }, [baseFont, blockOrder, blockTextAlignments, blockTextEdited, findTopmostBlockAtPoint, getBlockFont, getBlockRotation, getBlockRows, getBlockSpan, isBlockBold, isBlockItalic, isSyllableDivisionEnabled, isTextReflowEnabled, recordHistoryBeforeChange, result.settings.gridCols, result.settings.gridRows, showTypography, snapToModule, styleAssignments, textContent, toPagePoint])

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
      <div className="relative" style={{ width: result.pageSizePt.width * scale, height: result.pageSizePt.height * scale }}>
        <canvas
          ref={staticCanvasRef}
          width={result.pageSizePt.width * scale}
          height={result.pageSizePt.height * scale}
          className="absolute inset-0 block shadow-lg"
        />
        <canvas
          ref={canvasRef}
          width={result.pageSizePt.width * scale}
          height={result.pageSizePt.height * scale}
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
          width={result.pageSizePt.width * scale}
          height={result.pageSizePt.height * scale}
          className="pointer-events-none absolute inset-0 block"
        />
        {hoverState && hoveredStyle && hoveredSpan && hoveredAlign ? (
          <div
            className="pointer-events-none absolute z-20 w-64 rounded-md border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm"
            style={{
              left: Math.min(Math.max(8, hoverState.canvasX + 10), Math.max(8, result.pageSizePt.width * scale - 268)),
              top: Math.min(Math.max(8, hoverState.canvasY + 10), Math.max(8, result.pageSizePt.height * scale - 120)),
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
                setReflowToast(null)
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
              <div className="grid grid-cols-3 items-center gap-2">
                <EditorControlTooltip label="Font hierarchy" className="min-w-0 w-full">
                  <div className="flex min-w-0 items-center gap-1">
                    <ListOrdered className="h-4 w-4 shrink-0 text-gray-500" />
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
                <EditorControlTooltip label="Font family" className="col-span-2 min-w-0 w-full">
                  <div className="flex min-w-0 items-center gap-1">
                    <RotateCw className="h-4 w-4 shrink-0 text-gray-500" />
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
                <EditorControlTooltip label="Paragraph row span">
                  <div className="flex items-center gap-1">
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
                      <SelectTrigger className="h-8 w-28 text-xs">
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
                  <div className="flex items-center gap-1">
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
                      <SelectTrigger className="h-8 w-28 text-xs">
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
                <EditorControlTooltip label={`Paragraph rotation: ${Math.round(editorState.draftRotation)}deg`} className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Type className="h-4 w-4 shrink-0 text-gray-500" />
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
              <div className="flex items-center justify-between gap-2">
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
                <div className="flex items-center gap-2">
                  <EditorControlTooltip label="Delete paragraph">
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 ${isDarkMode ? "text-gray-300 hover:text-red-400" : "text-gray-500 hover:text-red-600"}`}
                      onClick={deleteEditorBlock}
                      aria-label="Delete paragraph"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </EditorControlTooltip>
                  <div className={`h-6 w-px ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`} aria-hidden="true" />
                  <EditorControlTooltip label="Save changes">
                    <Button size="sm" onClick={saveEditor}>
                      Save
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
}
