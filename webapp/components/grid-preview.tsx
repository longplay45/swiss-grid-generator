"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GridResult } from "@/lib/grid-calculator"
import { hyphenateWordEnglish } from "@/lib/english-hyphenation"
import { getOpticalMarginAnchorOffset } from "@/lib/optical-margin"
import { AlignLeft, AlignRight, Rows3, Trash2 } from "lucide-react"
import { ReactNode, useCallback, useEffect, useRef, useState } from "react"

type BlockId = string
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type TextAlignMode = "left" | "right"

type BlockRect = {
  x: number
  y: number
  width: number
  height: number
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
}

type HoverState = {
  key: BlockId
  canvasX: number
  canvasY: number
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

const STYLE_OPTIONS: Array<{ value: TypographyStyleKey; label: string }> = [
  { value: "display", label: "Display" },
  { value: "headline", label: "Headline" },
  { value: "subhead", label: "Subhead" },
  { value: "body", label: "Body" },
  { value: "caption", label: "Caption" },
]

export type FontFamily = 
  | "Inter"
  | "EB Garamond"
  | "Libre Baskerville"
  | "Bodoni Moda"
  | "Besley"
  | "Work Sans"
  | "Nunito Sans"
  | "IBM Plex Sans"
  | "Libre Franklin"
  | "Fraunces"
  | "Playfair Display"
  | "Space Grotesk"
  | "DM Serif Display"

export const FONT_OPTIONS: Array<{ value: FontFamily; label: string; category: string }> = [
  // Sans-Serif (Grotesk)
  { value: "Inter", label: "Inter", category: "Sans-Serif" },
  { value: "Work Sans", label: "Work Sans", category: "Sans-Serif" },
  { value: "Nunito Sans", label: "Nunito Sans", category: "Sans-Serif" },
  { value: "IBM Plex Sans", label: "IBM Plex Sans", category: "Sans-Serif" },
  { value: "Libre Franklin", label: "Libre Franklin", category: "Sans-Serif" },
  // Serif (Antiqua)
  { value: "EB Garamond", label: "EB Garamond", category: "Serif" },
  { value: "Libre Baskerville", label: "Libre Baskerville", category: "Serif" },
  { value: "Bodoni Moda", label: "Bodoni Moda", category: "Serif" },
  { value: "Besley", label: "Besley", category: "Serif" },
  // Display
  { value: "Fraunces", label: "Fraunces", category: "Display" },
  { value: "Playfair Display", label: "Playfair Display", category: "Display" },
  { value: "Space Grotesk", label: "Space Grotesk", category: "Display" },
  { value: "DM Serif Display", label: "DM Serif Display", category: "Display" },
]
const FONT_FAMILY_SET = new Set<FontFamily>(FONT_OPTIONS.map((option) => option.value))

function isFontFamily(value: unknown): value is FontFamily {
  return typeof value === "string" && FONT_FAMILY_SET.has(value as FontFamily)
}

function getFontFamilyCss(fontFamily: FontFamily): string {
  const fontMap: Record<FontFamily, string> = {
    "Inter": "Inter, system-ui, -apple-system, sans-serif",
    "EB Garamond": "EB Garamond, serif",
    "Libre Baskerville": "Libre Baskerville, serif",
    "Bodoni Moda": "Bodoni Moda, serif",
    "Besley": "Besley, serif",
    "Work Sans": "Work Sans, sans-serif",
    "Nunito Sans": "Nunito Sans, sans-serif",
    "IBM Plex Sans": "IBM Plex Sans, sans-serif",
    "Libre Franklin": "Libre Franklin, sans-serif",
    "Fraunces": "Fraunces, serif",
    "Playfair Display": "Playfair Display, serif",
    "Space Grotesk": "Space Grotesk, sans-serif",
    "DM Serif Display": "DM Serif Display, serif",
  }
  return fontMap[fontFamily] || fontMap["Inter"]
}

const DUMMY_TEXT_BY_STYLE: Record<TypographyStyleKey, string> = {
  display: "Swiss Design",
  headline: "Modular Grid Systems",
  subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
  body: "The modular grid allows designers to organize content with clarity and purpose. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide contrast and emphasis while preserving coherence across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet unified systems.",
  caption: "Based on Müller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
}

// Reflow planner scoring weights.
const REPOSITION_COL_COST = 6
const REPOSITION_ROW_COST = 3
const REPOSITION_OVERFLOW_ROW_COST = 1000
const REPOSITION_DESIRED_COL_BIAS = 2
const REPOSITION_ORDER_VIOLATION_BASE = 250
const REPOSITION_ORDER_VIOLATION_STEP = 0.5
const REPOSITION_SEARCH_ROW_BUFFER = 60
const REPOSITION_NON_MODULE_ROW_PENALTY = 80
const REPOSITION_OUTSIDE_GRID_ROW_PENALTY = 600

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
    <div className={`group relative inline-flex ${className}`.trim()}>
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute -top-8 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700 opacity-0 shadow-sm transition-all duration-75 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-within:-translate-y-0.5 group-focus-within:opacity-100"
      >
        {label}
      </div>
    </div>
  )
}

function getDummyTextForStyle(style: TypographyStyleKey): string {
  return DUMMY_TEXT_BY_STYLE[style] ?? DUMMY_TEXT_BY_STYLE.body
}

function getDefaultColumnSpan(key: BlockId, gridCols: number): number {
  if (gridCols <= 1) return 1
  if (key === "display") return gridCols
  if (key === "headline") return gridCols >= 3 ? Math.min(gridCols, Math.floor(gridCols / 2) + 1) : gridCols
  if (key === "caption") return 1
  return Math.max(1, Math.floor(gridCols / 2))
}

function hyphenateWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
  measureWidth: (text: string) => number,
): string[] {
  return hyphenateWordEnglish(word, maxWidth, measureWidth)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  { hyphenate = false }: { hyphenate?: boolean } = {},
  measureWidth: (text: string) => number = (input) => ctx.measureText(input).width,
): string[] {
  const wrapSingleLine = (input: string): string[] => {
    const words = input.split(/\s+/).filter(Boolean)
    if (!words.length) return [""]

    const lines: string[] = []
    let current = ""

    for (const word of words) {
      const testLine = current ? `${current} ${word}` : word
      if (measureWidth(testLine) <= maxWidth || current.length === 0) {
        if (measureWidth(word) > maxWidth && hyphenate) {
          if (current) {
            lines.push(current)
            current = ""
          }
          const parts = hyphenateWord(ctx, word, maxWidth, measureWidth)
          for (let i = 0; i < parts.length; i += 1) {
            if (i === parts.length - 1) {
              current = parts[i]
            } else {
              lines.push(parts[i])
            }
          }
        } else {
          current = testLine
        }
      } else {
        lines.push(current)
        if (measureWidth(word) > maxWidth && hyphenate) {
          const parts = hyphenateWord(ctx, word, maxWidth, measureWidth)
          for (let i = 0; i < parts.length; i += 1) {
            if (i === parts.length - 1) {
              current = parts[i]
            } else {
              lines.push(parts[i])
            }
          }
        } else {
          current = word
        }
      }
    }

    if (current) lines.push(current)
    return lines
  }

  const hardBreakLines = text.replace(/\r\n/g, "\n").split("\n")
  const wrapped: string[] = []

  for (const line of hardBreakLines) {
    wrapped.push(...wrapSingleLine(line))
  }

  return wrapped
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
  baseFont = "Inter",
}: GridPreviewProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRectsRef = useRef<Record<BlockId, BlockRect>>({})
  const dragEndedAtRef = useRef<number>(0)
  const lastAppliedLayoutKeyRef = useRef(0)
  const suppressReflowCheckRef = useRef(false)
  const dragRafRef = useRef<number | null>(null)
  const pendingDragPreviewRef = useRef<{ preview: ModulePosition; moved: boolean } | null>(null)
  const measureWidthCacheRef = useRef<Map<string, number>>(new Map())
  const wrapTextCacheRef = useRef<Map<string, string[]>>(new Map())
  const opticalOffsetCacheRef = useRef<Map<string, number>>(new Map())

  const [scale, setScale] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [blockOrder, setBlockOrder] = useState<BlockId[]>([...BASE_BLOCK_IDS])
  const [textContent, setTextContent] = useState<Record<BlockId, string>>(getDefaultTextContent)
  const [blockTextEdited, setBlockTextEdited] = useState<Record<BlockId, boolean>>(() =>
    BASE_BLOCK_IDS.reduce((acc, key) => {
      acc[key] = true
      return acc
    }, {} as Record<BlockId, boolean>)
  )
  const [styleAssignments, setStyleAssignments] = useState<Record<BlockId, TypographyStyleKey>>(getDefaultStyleAssignments)
  const [blockModulePositions, setBlockModulePositions] = useState<Partial<Record<BlockId, ModulePosition>>>({})
  const [blockColumnSpans, setBlockColumnSpans] = useState<Partial<Record<BlockId, number>>>({})
  const [blockRowSpans, setBlockRowSpans] = useState<Partial<Record<BlockId, number>>>({})
  const [blockTextAlignments, setBlockTextAlignments] = useState<Partial<Record<BlockId, TextAlignMode>>>({})
  const [blockTextReflow, setBlockTextReflow] = useState<Partial<Record<BlockId, boolean>>>({})
  const [blockSyllableDivision, setBlockSyllableDivision] = useState<Partial<Record<BlockId, boolean>>>({})
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
  const [blockFontFamilies, setBlockFontFamilies] = useState<Partial<Record<BlockId, FontFamily>>>({})
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
    draftTextEdited: boolean
  } | null>(null)
  const previousGridRef = useRef<{ cols: number; rows: number } | null>(null)
  const previousModuleRowStepRef = useRef<number | null>(null)
  const lastAutoFitSettingsRef = useRef<string>("")
  const lastUndoNonceRef = useRef(undoNonce)
  const lastRedoNonceRef = useRef(redoNonce)
  const HISTORY_LIMIT = 50
  const TEXT_CACHE_LIMIT = 5000

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
      blockModulePositions: { ...blockModulePositions },
    }
  }, [blockColumnSpans, blockFontFamilies, blockModulePositions, blockOrder, blockTextAlignments, blockTextEdited, getBlockRows, isSyllableDivisionEnabled, isTextReflowEnabled, result.settings.gridCols, styleAssignments, textContent])

  const applySnapshot = useCallback((snapshot: PreviewLayoutState) => {
    const nextFonts = snapshot.blockOrder.reduce((acc, key) => {
      const raw = snapshot.blockFontFamilies?.[key]
      if (isFontFamily(raw) && raw !== baseFont) acc[key] = raw
      return acc
    }, {} as Partial<Record<BlockId, FontFamily>>)
    setBlockOrder([...snapshot.blockOrder])
    setTextContent({ ...snapshot.textContent })
    setBlockTextEdited({ ...snapshot.blockTextEdited })
    setStyleAssignments({ ...snapshot.styleAssignments })
    setBlockFontFamilies(nextFonts)
    setBlockColumnSpans({ ...snapshot.blockColumnSpans })
    setBlockRowSpans({ ...(snapshot.blockRowSpans ?? {}) })
    setBlockTextAlignments({ ...snapshot.blockTextAlignments })
    setBlockTextReflow({ ...snapshot.blockTextReflow })
    setBlockSyllableDivision({ ...snapshot.blockSyllableDivision })
    setBlockModulePositions({ ...snapshot.blockModulePositions })
  }, [baseFont])

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
      wrapText(ctx, text, maxWidth, { hyphenate }, (sample) => getMeasuredTextWidth(ctx, sample)),
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

  const computeReflowPlan = useCallback((
    gridCols: number,
    gridRows: number,
    sourcePositions: Partial<Record<BlockId, ModulePosition>> = blockModulePositions,
  ) => {
    const maxBaselineRow = Math.max(
      0,
      Math.floor((result.pageSizePt.height - result.grid.margins.top - result.grid.margins.bottom) / result.grid.gridUnit)
    )
    const resolvedSpans = blockOrder.reduce((acc, key) => {
      const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, gridCols)
      acc[key] = Math.max(1, Math.min(gridCols, Math.round(raw)))
      return acc
    }, {} as Record<BlockId, number>)

    const priority = new Map<BaseBlockId, number>([
      ["display", 0],
      ["headline", 1],
      ["subhead", 2],
      ["body", 3],
      ["caption", 4],
    ])
    const orderIndex = new Map(blockOrder.map((key, index) => [key, index]))
    const sortedKeys = [...blockOrder].sort((a, b) => {
      const pa = isBaseBlockId(a) ? (priority.get(a) ?? 100) : 100
      const pb = isBaseBlockId(b) ? (priority.get(b) ?? 100) : 100
      if (pa !== pb) return pa - pb
      return (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0)
    })

    const occupied = new Set<string>()
    const canPlace = (row: number, col: number, span: number) => {
      const rowKey = row.toFixed(4)
      if (col < 0 || row < 0) return false
      if (col + span > gridCols) return false
      for (let c = col; c < col + span; c += 1) {
        if (occupied.has(`${rowKey}:${c}`)) return false
      }
      return true
    }
    const getReadingIndex = (position: ModulePosition) => position.row * (gridCols + 1) + position.col
    const moduleRowStep = Math.max(0.0001, (result.module.height + result.grid.gridMarginVertical) / result.grid.gridUnit)
    const moduleRowStarts = Array.from({ length: Math.max(1, gridRows) }, (_, index) =>
      Math.max(0, index * moduleRowStep)
    ).filter((row, index, arr) => arr.indexOf(row) === index)
    const moduleRowSet = new Set(moduleRowStarts.map((row) => row.toFixed(4)))
    const maxGridAnchorRow = moduleRowStarts[moduleRowStarts.length - 1] ?? 1
    const snapToNearestModuleTop = (row: number): number => {
      const clamped = Math.max(0, row)
      if (moduleRowStarts.length === 0) return clamped
      if (clamped <= maxGridAnchorRow) {
        let best = moduleRowStarts[0]
        let bestDistance = Math.abs(best - clamped)
        for (let i = 1; i < moduleRowStarts.length; i += 1) {
          const candidate = moduleRowStarts[i]
          const distance = Math.abs(candidate - clamped)
          if (distance < bestDistance) {
            best = candidate
            bestDistance = distance
          }
        }
        return best
      }
      const overflowSteps = Math.round((clamped - maxGridAnchorRow) / moduleRowStep)
      return Math.max(0, maxGridAnchorRow + overflowSteps * moduleRowStep)
    }

    const nextPositions: Partial<Record<BlockId, ModulePosition>> = {}
    let movedCount = 0
    let previousPlaced: ModulePosition | null = null

    for (const key of sortedKeys) {
      const span = resolvedSpans[key]
      const maxCol = Math.max(0, gridCols - span)
      const current = sourcePositions[key]
      const desired: ModulePosition = current
        ? {
            col: Math.max(0, Math.min(maxCol, Math.round(current.col))),
            row: snapToNearestModuleTop(current.row),
          }
        : { col: 0, row: 0 }

      const searchMaxRow = Math.max(maxBaselineRow + REPOSITION_SEARCH_ROW_BUFFER, desired.row + REPOSITION_SEARCH_ROW_BUFFER)
      let best: { position: ModulePosition; score: number } | null = null
      const prioritizedRows = [...moduleRowStarts].sort((a, b) => {
        const da = Math.abs(a - desired.row)
        const db = Math.abs(b - desired.row)
        return da - db
      })
      let overflowCursor = moduleRowStarts[moduleRowStarts.length - 1] ?? 1
      while (overflowCursor <= searchMaxRow) {
        if (!moduleRowSet.has(overflowCursor.toFixed(4))) {
          prioritizedRows.push(overflowCursor)
        }
        overflowCursor += moduleRowStep
      }

      for (const row of prioritizedRows) {
        if (row > searchMaxRow) continue
        for (let col = 0; col <= maxCol; col += 1) {
          if (!canPlace(row, col, span)) continue
          const candidate: ModulePosition = { col, row }
          const movementScore = Math.abs(candidate.col - desired.col) * REPOSITION_COL_COST + Math.abs(candidate.row - desired.row) * REPOSITION_ROW_COST
          const overflowRows = Math.max(0, candidate.row - maxBaselineRow)
          const overflowScore = overflowRows * REPOSITION_OVERFLOW_ROW_COST
          const outsideGridRows = Math.max(0, candidate.row - maxGridAnchorRow)
          const outsideGridScore = outsideGridRows * REPOSITION_OUTSIDE_GRID_ROW_PENALTY
          const moduleRowScore = moduleRowSet.has(candidate.row.toFixed(4)) ? 0 : REPOSITION_NON_MODULE_ROW_PENALTY
          const desiredColBias = candidate.col === desired.col ? 0 : REPOSITION_DESIRED_COL_BIAS
          let orderScore = 0
          if (previousPlaced) {
            const prevIndex = getReadingIndex(previousPlaced)
            const candidateIndex = getReadingIndex(candidate)
            if (candidateIndex < prevIndex) {
              orderScore = REPOSITION_ORDER_VIOLATION_BASE + (prevIndex - candidateIndex) * REPOSITION_ORDER_VIOLATION_STEP
            }
          }
          const score = movementScore + overflowScore + outsideGridScore + moduleRowScore + desiredColBias + orderScore
          if (!best || score < best.score || (score === best.score && (candidate.row < best.position.row || (candidate.row === best.position.row && candidate.col < best.position.col)))) {
            best = { position: candidate, score }
          }
        }
      }

      let placed: ModulePosition
      if (best) {
        placed = best.position
      } else {
        // Safety fallback: place on the first available stacked row.
        let stackRow = Math.max(maxBaselineRow + moduleRowStep, desired.row)
        stackRow = snapToNearestModuleTop(stackRow)
        while (!canPlace(stackRow, 0, span)) stackRow += moduleRowStep
        placed = { col: 0, row: stackRow }
      }

      if (!current || current.col !== placed.col || Math.abs(current.row - placed.row) > 0.0001) movedCount += 1
      nextPositions[key] = placed
      for (let c = placed.col; c < placed.col + span; c += 1) occupied.add(`${placed.row.toFixed(4)}:${c}`)
      previousPlaced = placed
    }

    return { movedCount, resolvedSpans, nextPositions }
  }, [blockColumnSpans, blockModulePositions, blockOrder, result.grid.gridMarginVertical, result.grid.gridUnit, result.grid.margins.bottom, result.grid.margins.top, result.module.height, result.pageSizePt.height])

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

    setBlockOrder(normalizedKeys)
    setTextContent(nextTextContent)
    setBlockTextEdited(nextTextEdited)
    setStyleAssignments(nextStyleAssignments)
    setBlockFontFamilies(nextFontFamilies)
    setBlockColumnSpans(nextSpans)
    setBlockRowSpans(nextRows)
    setBlockTextAlignments(nextAlignments)
    setBlockTextReflow(nextReflow)
    setBlockSyllableDivision(nextSyllableDivision)
    setBlockModulePositions(nextPositions)
    setDragState(null)
    setHoverState(null)
    setEditorState(null)
  }, [baseFont, buildSnapshot, getGridMetrics, initialLayout, initialLayoutKey, pushHistory, result.settings.gridCols, result.typography.styles])

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
          margins.top * scale,
          pageWidth - (margins.left + margins.right) * scale,
          pageHeight - (margins.top + margins.bottom) * scale,
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
        const startY = margins.top * scale
        const endY = pageHeight - margins.bottom * scale
        const baselineSpacing = gridUnit * scale
        const baselineStep = isMobile ? 2 : 1

        let currentY = startY
        ctx.strokeStyle = "#ec4899"
        ctx.lineWidth = 0.3
        ctx.globalAlpha = 0.5

        while (currentY <= endY) {
          ctx.beginPath()
          ctx.moveTo(0, currentY)
          ctx.lineTo(pageWidth, currentY)
          ctx.stroke()
          currentY += baselineSpacing * baselineStep
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
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const { width, height } = result.pageSizePt
      const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
      const { width: modW, height: modH } = result.module
      const { gridRows } = result.settings
      const pageWidth = width * scale
      const pageHeight = height * scale

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      blockRectsRef.current = {}
      if (!showTypography) return

      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-pageWidth / 2, -pageHeight / 2)

      const { styles } = result.typography
      const contentTop = margins.top * scale
      const contentLeft = margins.left * scale
      const baselinePx = gridUnit * scale
      const moduleXStep = (modW + gridMarginHorizontal) * scale
      const baselineStep = gridUnit * scale
      const baselineOriginTop = contentTop - baselineStep
      const gutterX = gridMarginHorizontal * scale

      ctx.fillStyle = "#1f2937"

      if (dragState) {
        const dragSpan = getBlockSpan(dragState.key)
        const snapX = contentLeft + dragState.preview.col * moduleXStep
        const snapY = baselineOriginTop + dragState.preview.row * baselineStep
        const snapWidth = dragSpan * modW * scale + Math.max(dragSpan - 1, 0) * gutterX
        ctx.save()
        ctx.strokeStyle = "#f97316"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(snapX, snapY + baselineStep)
        ctx.lineTo(snapX + snapWidth, snapY + baselineStep)
        ctx.stroke()
        ctx.restore()
        ctx.fillStyle = "#1f2937"
      }

      const getMinOffset = (): number => 1

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
        ctx.font = `${style.weight === "Bold" ? "700" : "400"} ${fontSize}px ${getFontFamilyCss(blockFont)}`

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
        ctx.textAlign = textAlign
        ctx.textBaseline = "alphabetic"
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

        if (!columnReflow) {
          const textAnchorX = textAlign === "right" ? origin.x + wrapWidth : origin.x
          textLines.forEach((line, lineIndex) => {
            const lineTopY = origin.y + baselinePx + lineIndex * baselineMult * baselinePx
            const y = lineTopY + textAscentPx
            if (lineTopY < pageBottomY) {
              maxUsedRows = Math.max(maxUsedRows, lineIndex + 1)
              const opticalOffsetX = getOpticalOffset(ctx, line, textAlign, fontSize)
              ctx.fillText(line, textAnchorX + opticalOffsetX, y)
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
            ctx.fillText(line, textAnchorX + opticalOffsetX, y)
          }
        }

        if (maxUsedRows > 0 && !columnReflow) {
          nextRects[block.key].height = (maxUsedRows * baselineMult + 1) * baselinePx + hitTopPadding
        }

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

        ctx.font = `${captionStyle.weight === "Bold" ? "700" : "400"} ${captionFontSize}px ${getFontFamilyCss(captionFont)}`
        const captionAlign = blockTextAlignments.caption ?? "left"
        ctx.textBaseline = "alphabetic"

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

        if (!captionColumnReflow) {
          const captionAnchorX = captionAlign === "right" ? captionOrigin.x + captionWidth : captionOrigin.x
          captionLines.forEach((line, lineIndex) => {
            const lineTopY = captionOrigin.y + baselinePx + lineIndex * captionBaselineMult * baselinePx
            const y = lineTopY + captionAscentPx
            if (lineTopY < captionPageBottomY) {
              captionMaxUsedRows = Math.max(captionMaxUsedRows, lineIndex + 1)
              const opticalOffsetX = getOpticalOffset(ctx, line, captionAlign, captionFontSize)
              ctx.fillText(line, captionAnchorX + opticalOffsetX, y)
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
            ctx.fillText(line, captionAnchorX + opticalOffsetX, y)
          }
        }

        nextRects.caption = {
          x: captionOrigin.x,
          y: captionOrigin.y - captionHitTopPadding,
          width: captionWidth,
          height: captionColumnReflow
            ? captionModuleHeightPx + captionHitTopPadding
            : ((captionMaxUsedRows || captionLineCount) * captionBaselineMult + 1) * baselinePx + captionHitTopPadding,
        }
      }

      blockRectsRef.current = nextRects
      ctx.restore()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    blockModulePositions,
    blockOrder,
    blockRowSpans,
    blockTextAlignments,
    clampModulePosition,
    dragState,
    getBlockFont,
    getBlockRows,
    getBlockSpan,
    getOpticalOffset,
    getWrappedText,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    onCanvasReady,
    result,
    rotation,
    scale,
    showTypography,
    styleAssignments,
    textContent,
  ])

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

    const plan = computeReflowPlan(currentGrid.cols, currentGrid.rows, sourcePositions)
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
  }, [blockColumnSpans, blockModulePositions, blockOrder, buildSnapshot, computeReflowPlan, pendingReflow, pushHistory, result.grid.gridMarginVertical, result.grid.gridUnit, result.grid.margins.bottom, result.grid.margins.top, result.module.height, result.pageSizePt.height, result.settings.gridCols, result.settings.gridRows])

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

    const spanUpdates: Partial<Record<BlockId, number>> = {}
    const positionUpdates: Partial<Record<BlockId, ModulePosition>> = {}
    let hasSpanChanges = false
    let hasPositionChanges = false

    for (const key of blockOrder) {
      if (!isTextReflowEnabled(key)) continue
      const currentPosition = blockModulePositions[key]
      if (!currentPosition) continue
      const currentSpan = getBlockSpan(key)
      const autoFit = getAutoFitForPlacement({
        key,
        text: textContent[key] ?? "",
        styleKey: getStyleKeyForBlock(key),
        rowSpan: getBlockRows(key),
        reflow: true,
        syllableDivision: isSyllableDivisionEnabled(key),
        position: currentPosition,
      })
      if (!autoFit?.position) continue

      if (autoFit.span !== currentSpan) {
        spanUpdates[key] = autoFit.span
        hasSpanChanges = true
      }
      if (autoFit.position.col !== currentPosition.col || autoFit.position.row !== currentPosition.row) {
        positionUpdates[key] = autoFit.position
        hasPositionChanges = true
      }
    }

    if (hasSpanChanges) {
      setBlockColumnSpans((prev) => ({ ...prev, ...spanUpdates }))
    }
    if (hasPositionChanges) {
      setBlockModulePositions((prev) => ({ ...prev, ...positionUpdates }))
    }
  }, [
    blockModulePositions,
    blockOrder,
    getAutoFitForPlacement,
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
  ])

  useEffect(() => {
    if (!editorState) return
    textareaRef.current?.focus()
  }, [editorState])

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

  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (event: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const point = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
      if (!point) return

      const snap = snapToModule(point.x - dragState.pointerOffsetX, point.y - dragState.pointerOffsetY, dragState.key)
      const moved = dragState.moved || Math.abs(point.x - dragState.startPageX) > 3 || Math.abs(point.y - dragState.startPageY) > 3
      pendingDragPreviewRef.current = { preview: snap, moved }
      if (dragRafRef.current !== null) return
      dragRafRef.current = window.requestAnimationFrame(() => {
        dragRafRef.current = null
        const pending = pendingDragPreviewRef.current
        if (!pending) return
        pendingDragPreviewRef.current = null
        setDragState((prev) => (prev ? { ...prev, preview: pending.preview, moved: pending.moved } : prev))
      })
    }

    const handleMouseUp = () => {
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
        if (nextMoved) {
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
          dragEndedAtRef.current = Date.now()
        }
        return null
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current)
        dragRafRef.current = null
      }
      pendingDragPreviewRef.current = null
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragState, getAutoFitDropUpdate, recordHistoryBeforeChange, snapToModule, toPagePoint])

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

    setTextContent((prev) => ({
      ...prev,
      [editorState.target]: editorState.draftText,
    }))
    setBlockTextEdited((prev) => ({
      ...prev,
      [editorState.target]: editorState.draftTextEdited,
    }))
    setStyleAssignments((prev) => ({
      ...prev,
      [editorState.target]: editorState.draftStyle,
    }))
    setBlockFontFamilies((prev) => {
      const next = { ...prev }
      if (editorState.draftFont === baseFont) {
        delete next[editorState.target]
      } else {
        next[editorState.target] = editorState.draftFont
      }
      return next
    })
    setBlockColumnSpans((prev) => ({
      ...prev,
      [editorState.target]: nextSpan,
    }))
    setBlockRowSpans((prev) => ({
      ...prev,
      [editorState.target]: editorState.draftRows,
    }))
    setBlockTextAlignments((prev) => ({
      ...prev,
      [editorState.target]: editorState.draftAlign,
    }))
    setBlockTextReflow((prev) => ({
      ...prev,
      [editorState.target]: editorState.draftReflow,
    }))
    setBlockSyllableDivision((prev) => ({
      ...prev,
      [editorState.target]: editorState.draftSyllableDivision,
    }))
    setBlockModulePositions((prev) => {
      const pos = prev[editorState.target]
      if (!pos && !autoFit?.position) return prev
      const desired = autoFit?.position ?? pos
      if (!desired) return prev
      const maxCol = Math.max(0, result.settings.gridCols - nextSpan)
      const clamped = {
        col: Math.max(0, Math.min(maxCol, desired.col)),
        row: Math.max(0, Math.min(getGridMetrics().maxBaselineRow, desired.row)),
      }
      const original = pos ?? desired
      if (clamped.col === original.col && clamped.row === original.row) return prev
      return {
        ...prev,
        [editorState.target]: clamped,
      }
    })
    setEditorState(null)
  }, [baseFont, blockModulePositions, editorState, getAutoFitForPlacement, getGridMetrics, recordHistoryBeforeChange, result.settings.gridCols])

  const deleteEditorBlock = useCallback(() => {
    if (!editorState) return
    recordHistoryBeforeChange()

    const target = editorState.target
    if (isBaseBlockId(target)) {
      setTextContent((prev) => ({
        ...prev,
        [target]: "",
      }))
    } else {
      setBlockOrder((prev) => prev.filter((key) => key !== target))
      setTextContent((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setBlockTextEdited((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setStyleAssignments((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setBlockFontFamilies((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setBlockColumnSpans((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setBlockRowSpans((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setBlockTextAlignments((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setBlockTextReflow((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setBlockSyllableDivision((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
    }
    setBlockModulePositions((prev) => {
      const next = { ...prev }
      delete next[target]
      return next
    })
    setEditorState(null)
  }, [editorState, recordHistoryBeforeChange])

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || editorState) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    for (const key of blockOrder) {
      const block = blockRectsRef.current[key]
      if (!block || block.width <= 0 || block.height <= 0) continue
      if (pagePoint.x >= block.x && pagePoint.x <= block.x + block.width && pagePoint.y >= block.y && pagePoint.y <= block.y + block.height) {
        event.preventDefault()
        const snapped = blockModulePositions[key] ?? snapToModule(block.x, block.y, key)
        setDragState({
          key,
          startPageX: pagePoint.x,
          startPageY: pagePoint.y,
          pointerOffsetX: pagePoint.x - block.x,
          pointerOffsetY: pagePoint.y - block.y,
          preview: snapped,
          moved: false,
        })
        setHoverState(null)
        break
      }
    }
  }, [blockModulePositions, blockOrder, editorState, showTypography, snapToModule, toPagePoint])

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || editorState || dragState) {
      if (hoverState) setHoverState(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = event.clientX - rect.left
    const canvasY = event.clientY - rect.top
    const pagePoint = toPagePoint(canvasX, canvasY)
    if (!pagePoint) {
      if (hoverState) setHoverState(null)
      return
    }

    for (const key of blockOrder) {
      const block = blockRectsRef.current[key]
      if (!block || block.width <= 0 || block.height <= 0) continue
      if (pagePoint.x >= block.x && pagePoint.x <= block.x + block.width && pagePoint.y >= block.y && pagePoint.y <= block.y + block.height) {
        setHoverState((prev) => {
          if (prev && prev.key === key && Math.abs(prev.canvasX - canvasX) < 1 && Math.abs(prev.canvasY - canvasY) < 1) {
            return prev
          }
          return { key, canvasX, canvasY }
        })
        return
      }
    }

    if (hoverState) setHoverState(null)
  }, [blockOrder, dragState, editorState, hoverState, showTypography, toPagePoint])

  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < 250) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    for (const key of blockOrder) {
      const block = blockRectsRef.current[key]
      if (!block || block.width <= 0 || block.height <= 0) continue
      if (pagePoint.x >= block.x && pagePoint.x <= block.x + block.width && pagePoint.y >= block.y && pagePoint.y <= block.y + block.height) {
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
          draftTextEdited: blockTextEdited[key] ?? true,
        })
        return
      }
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
      draftTextEdited: false,
    })
  }, [baseFont, blockOrder, blockTextAlignments, blockTextEdited, getBlockFont, getBlockRows, getBlockSpan, isSyllableDivisionEnabled, isTextReflowEnabled, recordHistoryBeforeChange, result.settings.gridCols, result.settings.gridRows, showTypography, snapToModule, styleAssignments, textContent, toPagePoint])

  const hoveredStyle = hoverState ? (styleAssignments[hoverState.key] ?? "body") : null
  const hoveredSpan = hoverState ? getBlockSpan(hoverState.key) : null
  const hoveredAlign = hoverState ? (blockTextAlignments[hoverState.key] ?? "left") : null

  useEffect(() => {
    if (!onLayoutChange) return

    const resolvedSpans = blockOrder.reduce((acc, key) => {
      acc[key] = getBlockSpan(key)
      return acc
    }, {} as Record<BlockId, number>)
    const resolvedAlignments = blockOrder.reduce((acc, key) => {
      acc[key] = blockTextAlignments[key] ?? "left"
      return acc
    }, {} as Record<BlockId, TextAlignMode>)

    onLayoutChange({
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
      blockModulePositions,
    })
  }, [blockFontFamilies, blockModulePositions, blockOrder, blockTextAlignments, blockTextEdited, getBlockRows, getBlockSpan, isSyllableDivisionEnabled, isTextReflowEnabled, onLayoutChange, styleAssignments, textContent])

  const canvasCursorClass = dragState ? "cursor-grabbing" : hoverState ? "cursor-grab" : "cursor-default"

  return (
    <div ref={previewContainerRef} className="relative w-full h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
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
          className={`absolute inset-0 block ${canvasCursorClass}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoverState(null)}
          onDoubleClick={handleCanvasDoubleClick}
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
              Double-click to edit • Drag to move
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
          className="absolute inset-0 bg-black/20 flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor()
          }}
        >
          <div
            className="w-full max-w-[500px] rounded-md border border-gray-300 bg-white shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="space-y-2 border-b border-gray-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <EditorControlTooltip label="Font family">
                  <Select
                    value={editorState.draftFont}
                    onValueChange={(value) => {
                      setEditorState((prev) => prev ? {
                        ...prev,
                        draftFont: value as FontFamily,
                      } : prev)
                    }}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Work Sans">Work Sans</SelectItem>
                      <SelectItem value="Nunito Sans">Nunito Sans</SelectItem>
                      <SelectItem value="IBM Plex Sans">IBM Plex Sans</SelectItem>
                      <SelectItem value="Libre Franklin">Libre Franklin</SelectItem>
                      <SelectItem value="EB Garamond">EB Garamond</SelectItem>
                      <SelectItem value="Libre Baskerville">Libre Baskerville</SelectItem>
                      <SelectItem value="Bodoni Moda">Bodoni Moda</SelectItem>
                      <SelectItem value="Besley">Besley</SelectItem>
                      <SelectItem value="Fraunces">Fraunces</SelectItem>
                      <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                      <SelectItem value="Space Grotesk">Space Grotesk</SelectItem>
                      <SelectItem value="DM Serif Display">DM Serif Display</SelectItem>
                    </SelectContent>
                  </Select>
                </EditorControlTooltip>
                <EditorControlTooltip label="Typography style" className="min-w-0 flex-1">
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
                </EditorControlTooltip>
              </div>
              <div className="flex items-center gap-2">
                <EditorControlTooltip label="Paragraph row span">
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
                </EditorControlTooltip>
                <EditorControlTooltip label="Paragraph column span">
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
                </EditorControlTooltip>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-md border border-gray-200">
                    <EditorControlTooltip label="Align left">
                      <Button
                        type="button"
                        size="icon"
                        variant={editorState.draftAlign === "left" ? "secondary" : "ghost"}
                        className="h-8 w-8 rounded-r-none"
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
                        className="h-8 w-8 rounded-l-none border-l border-gray-200"
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
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={deleteEditorBlock} aria-label="Delete paragraph">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </EditorControlTooltip>
                  <div className="h-6 w-px bg-gray-200" aria-hidden="true" />
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
                className="min-h-40 w-full resize-y rounded-md border border-gray-200 bg-gray-50 p-3 text-gray-900 outline-none ring-0 focus:border-gray-300"
              />
            </div>
            <div className="border-t border-gray-100 px-3 py-2 text-[11px] text-gray-500">
              Esc or click outside to close without saving.
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}
