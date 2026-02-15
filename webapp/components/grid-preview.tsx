"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GridResult } from "@/lib/grid-calculator"
import { AlignLeft, AlignRight, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

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
  body: "The modular grid allows designers to organize content hierarchically and rhythmically. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide rhythm, contrast, and emphasis while preserving clarity across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet coherent systems.",
  caption: "Figure 5: Based on Müller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
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

const DUMMY_TEXT_BY_STYLE: Record<TypographyStyleKey, string> = {
  display: "DISPLAY DUMMY TEXT",
  headline: "Headline dummy text",
  subhead: "Subhead dummy text for structured layouts.",
  body: "Body dummy text. Replace this paragraph with your own copy.",
  caption: "Caption dummy text.",
}

function formatPtSize(size: number): string {
  return Number.isInteger(size) ? `${size}pt` : `${size.toFixed(1)}pt`
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

function hyphenateWord(ctx: CanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  const parts: string[] = []
  let start = 0

  while (start < word.length) {
    let end = start + 1
    let lastGood = start

    while (end <= word.length) {
      const slice = word.slice(start, end)
      const withHyphen = end < word.length ? `${slice}-` : slice
      if (ctx.measureText(withHyphen).width <= maxWidth) {
        lastGood = end
        end += 1
      } else {
        break
      }
    }

    if (lastGood === start) {
      lastGood = Math.min(start + 1, word.length)
    }

    const chunk = word.slice(start, lastGood)
    parts.push(lastGood < word.length ? `${chunk}-` : chunk)
    start = lastGood
  }

  return parts
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  { hyphenate = false }: { hyphenate?: boolean } = {}
): string[] {
  const wrapSingleLine = (input: string): string[] => {
    const words = input.split(/\s+/).filter(Boolean)
    if (!words.length) return [""]

    const lines: string[] = []
    let current = ""

    for (const word of words) {
      const testLine = current ? `${current} ${word}` : word
      if (ctx.measureText(testLine).width <= maxWidth || current.length === 0) {
        if (ctx.measureText(word).width > maxWidth && hyphenate) {
          if (current) {
            lines.push(current)
            current = ""
          }
          const parts = hyphenateWord(ctx, word, maxWidth)
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
        if (ctx.measureText(word).width > maxWidth && hyphenate) {
          const parts = hyphenateWord(ctx, word, maxWidth)
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
}

export interface PreviewLayoutState {
  blockOrder: BlockId[]
  textContent: Record<BlockId, string>
  blockTextEdited: Record<BlockId, boolean>
  styleAssignments: Record<BlockId, TypographyStyleKey>
  blockColumnSpans: Record<BlockId, number>
  blockTextAlignments: Record<BlockId, TextAlignMode>
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
}: GridPreviewProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRectsRef = useRef<Record<BlockId, BlockRect>>({})
  const dragEndedAtRef = useRef<number>(0)
  const lastAppliedLayoutKeyRef = useRef(0)
  const suppressReflowCheckRef = useRef(false)

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
  const [blockTextAlignments, setBlockTextAlignments] = useState<Partial<Record<BlockId, TextAlignMode>>>({})
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
    draftColumns: number
    draftAlign: TextAlignMode
    draftTextEdited: boolean
  } | null>(null)
  const previousGridRef = useRef<{ cols: number; rows: number } | null>(null)
  const lastUndoNonceRef = useRef(undoNonce)
  const lastRedoNonceRef = useRef(redoNonce)
  const HISTORY_LIMIT = 50

  const getBlockSpan = useCallback((key: BlockId) => {
    const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, result.settings.gridCols)
    return Math.max(1, Math.min(result.settings.gridCols, raw))
  }, [blockColumnSpans, result.settings.gridCols])

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
    return {
      blockOrder: [...blockOrder],
      textContent: { ...textContent },
      blockTextEdited: { ...blockTextEdited },
      styleAssignments: { ...styleAssignments },
      blockColumnSpans: resolvedSpans,
      blockTextAlignments: resolvedAlignments,
      blockModulePositions: { ...blockModulePositions },
    }
  }, [blockColumnSpans, blockModulePositions, blockOrder, blockTextAlignments, blockTextEdited, result.settings.gridCols, styleAssignments, textContent])

  const applySnapshot = useCallback((snapshot: PreviewLayoutState) => {
    setBlockOrder([...snapshot.blockOrder])
    setTextContent({ ...snapshot.textContent })
    setBlockTextEdited({ ...snapshot.blockTextEdited })
    setStyleAssignments({ ...snapshot.styleAssignments })
    setBlockColumnSpans({ ...snapshot.blockColumnSpans })
    setBlockTextAlignments({ ...snapshot.blockTextAlignments })
    setBlockModulePositions({ ...snapshot.blockModulePositions })
  }, [])

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
    const rawRow = Math.round((pageY - metrics.baselineOriginTop) / metrics.yStep)
    return clampModulePosition({ col: rawCol, row: rawRow }, key)
  }, [clampModulePosition, getGridMetrics])

  const computeReflowPlan = useCallback((gridCols: number, gridRows: number) => {
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
    const sortedKeys = [...blockOrder].sort((a, b) => {
      const pa = isBaseBlockId(a) ? (priority.get(a) ?? 100) : 100
      const pb = isBaseBlockId(b) ? (priority.get(b) ?? 100) : 100
      if (pa !== pb) return pa - pb
      return blockOrder.indexOf(a) - blockOrder.indexOf(b)
    })

    const occupied = new Set<string>()
    const markOccupied = (row: number, col: number, span: number) => {
      for (let c = col; c < col + span; c += 1) occupied.add(`${row}:${c}`)
    }
    const canPlace = (row: number, col: number, span: number) => {
      if (col < 0 || row < 0) return false
      if (col + span > gridCols) return false
      for (let c = col; c < col + span; c += 1) {
        if (occupied.has(`${row}:${c}`)) return false
      }
      return true
    }

    const nextPositions: Partial<Record<BlockId, ModulePosition>> = {}
    let movedCount = 0
    let maxPlacedRow = 0

    if (gridRows === 1) {
      let rowCursor = 1
      for (const key of sortedKeys) {
        const next = { col: 0, row: rowCursor }
        const current = blockModulePositions[key]
        if (!current || current.col !== next.col || current.row !== next.row) movedCount += 1
        nextPositions[key] = next
        markOccupied(next.row, next.col, resolvedSpans[key])
        maxPlacedRow = Math.max(maxPlacedRow, next.row)
        rowCursor += 2
      }
      return { movedCount, resolvedSpans, nextPositions }
    }

    for (const key of sortedKeys) {
      const span = resolvedSpans[key]
      const maxCol = Math.max(0, gridCols - span)
      const current = blockModulePositions[key]
      const desired: ModulePosition = current
        ? {
            col: Math.max(0, Math.min(maxCol, Math.round(current.col))),
            row: Math.max(0, Math.min(maxBaselineRow, Math.round(current.row))),
          }
        : { col: 0, row: 1 }

      let placed: ModulePosition | null = null
      if (canPlace(desired.row, desired.col, span)) {
        placed = desired
      } else {
        for (let row = desired.row; row <= maxBaselineRow && !placed; row += 1) {
          const startCol = row === desired.row ? Math.min(maxCol, desired.col + 1) : 0
          for (let col = startCol; col <= maxCol; col += 1) {
            if (canPlace(row, col, span)) {
              placed = { col, row }
              break
            }
          }
        }
      }

      if (!placed) {
        let stackRow = Math.max(maxPlacedRow + 1, 1)
        while (!canPlace(stackRow, 0, span)) stackRow += 1
        placed = { col: 0, row: stackRow }
      }

      if (!current || current.col !== placed.col || current.row !== placed.row) movedCount += 1
      nextPositions[key] = placed
      markOccupied(placed.row, placed.col, span)
      maxPlacedRow = Math.max(maxPlacedRow, placed.row)
    }

    return { movedCount, resolvedSpans, nextPositions }
  }, [blockColumnSpans, blockModulePositions, blockOrder, result.grid.gridUnit, result.grid.margins.bottom, result.grid.margins.top, result.pageSizePt.height])

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

    const metrics = getGridMetrics()
    const nextPositions = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockModulePositions?.[key]
      if (!raw || typeof raw.col !== "number" || typeof raw.row !== "number") return acc
      const maxCol = Math.max(0, result.settings.gridCols - nextSpans[key])
      acc[key] = {
        col: Math.max(0, Math.min(maxCol, Math.round(raw.col))),
        row: Math.max(0, Math.min(metrics.maxBaselineRow, Math.round(raw.row))),
      }
      return acc
    }, {} as Partial<Record<BlockId, ModulePosition>>)

    setBlockOrder(normalizedKeys)
    setTextContent(nextTextContent)
    setBlockTextEdited(nextTextEdited)
    setStyleAssignments(nextStyleAssignments)
    setBlockColumnSpans(nextSpans)
    setBlockTextAlignments(nextAlignments)
    setBlockModulePositions(nextPositions)
    setDragState(null)
    setHoverState(null)
    setEditorState(null)
  }, [buildSnapshot, getGridMetrics, initialLayout, initialLayoutKey, pushHistory, result.settings.gridCols, result.typography.styles])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    onCanvasReady?.(canvas)

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
        pageHeight - (margins.top + margins.bottom) * scale
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

    if (showTypography) {
      const { styles } = result.typography
      const contentTop = margins.top * scale
      const contentLeft = margins.left * scale
      const contentWidth = (result.pageSizePt.width - margins.left - margins.right) * scale
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

      // Swiss book-style placement: line top sits on baseline rows.
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

        ctx.font = `${style.weight === "Bold" ? "700" : "400"} ${fontSize}px Inter, system-ui, -apple-system, sans-serif`

        const span = getBlockSpan(block.key)
        const wrapWidth = span * modW * scale + Math.max(span - 1, 0) * gutterX
        const textLines = wrapText(ctx, blockText, wrapWidth, { hyphenate: block.key === "body" })

        const autoBlockX = contentLeft
        const autoBlockY = contentTop + (blockStartOffset - 1) * baselinePx
        const origin = getOriginForBlock(block.key, autoBlockX, autoBlockY)
        const textAlign = blockTextAlignments[block.key] ?? "left"
        const textAnchorX = textAlign === "right" ? origin.x + wrapWidth : origin.x
        ctx.textAlign = textAlign
        ctx.textBaseline = "alphabetic"
        const textAscentPx = getTextAscentPx(ctx, fontSize)
        const hitTopPadding = Math.max(baselinePx, textAscentPx)

        nextRects[block.key] = {
          x: origin.x,
          y: origin.y - hitTopPadding,
          width: wrapWidth,
          height: (textLines.length * baselineMult + 1) * baselinePx + hitTopPadding,
        }

        textLines.forEach((line, lineIndex) => {
          const lineTopY = origin.y + baselinePx + lineIndex * baselineMult * baselinePx
          const y = lineTopY + textAscentPx
          if (lineTopY < pageHeight - margins.bottom * scale) {
            ctx.fillText(line, textAnchorX, y)
          }
        })

        if (!useParagraphRows) {
          if (!useRowPlacement || block.key !== "display") {
            currentBaselineOffset = blockStartOffset + textLines.length * baselineMult
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

        ctx.font = `${captionStyle.weight === "Bold" ? "700" : "400"} ${captionFontSize}px Inter, system-ui, -apple-system, sans-serif`
        const captionAlign = blockTextAlignments.caption ?? "left"
        ctx.textBaseline = "alphabetic"

        const captionSpan = getBlockSpan("caption")
        const captionWidth = captionSpan * modW * scale + Math.max(captionSpan - 1, 0) * gutterX
        const captionLines = wrapText(ctx, captionText, captionWidth)
        const captionLineCount = captionLines.length

        const pageHeightPt = result.pageSizePt.height
        const availableHeight = pageHeightPt - margins.top - margins.bottom
        const totalBaselinesFromTop = Math.floor(availableHeight / gridUnit)
        const firstLineBaselineUnit = totalBaselinesFromTop - (captionLineCount - 1) * captionBaselineMult

        const autoCaptionY = contentTop + (firstLineBaselineUnit - 1) * baselinePx
        const captionOrigin = getOriginForBlock("caption", contentLeft, autoCaptionY)
        const captionAnchorX = captionAlign === "right" ? captionOrigin.x + captionWidth : captionOrigin.x
        ctx.textAlign = captionAlign
        const captionAscentPx = getTextAscentPx(ctx, captionFontSize)
        const captionHitTopPadding = Math.max(baselinePx, captionAscentPx)

        captionLines.forEach((line, lineIndex) => {
          const lineTopY = captionOrigin.y + baselinePx + lineIndex * captionBaselineMult * baselinePx
          const y = lineTopY + captionAscentPx
          if (lineTopY < pageHeight - margins.bottom * scale) {
            ctx.fillText(line, captionAnchorX, y)
          }
        })

        nextRects.caption = {
          x: captionOrigin.x,
          y: captionOrigin.y - captionHitTopPadding,
          width: captionWidth,
          height: (captionLineCount * captionBaselineMult + 1) * baselinePx + captionHitTopPadding,
        }
      }

      blockRectsRef.current = nextRects
    }

    ctx.restore()
  }, [
    blockColumnSpans,
    blockTextAlignments,
    blockModulePositions,
    clampModulePosition,
    dragState,
    getBlockSpan,
    isMobile,
    onCanvasReady,
    result,
    rotation,
    scale,
    showBaselines,
    showMargins,
    showModules,
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
    if (!previousGridRef.current) {
      previousGridRef.current = currentGrid
      return
    }
    if (suppressReflowCheckRef.current) {
      previousGridRef.current = currentGrid
      suppressReflowCheckRef.current = false
      return
    }
    if (pendingReflow) return

    const previousGrid = previousGridRef.current
    const gridChanged = previousGrid.cols !== currentGrid.cols || previousGrid.rows !== currentGrid.rows
    if (!gridChanged) return

    const plan = computeReflowPlan(currentGrid.cols, currentGrid.rows)
    const spanChanged = blockOrder.some((key) => {
      const currentSpan = blockColumnSpans[key] ?? getDefaultColumnSpan(key, previousGrid.cols)
      return plan.resolvedSpans[key] !== currentSpan
    })
    const positionChanged = blockOrder.some((key) => {
      const a = blockModulePositions[key]
      const b = plan.nextPositions[key]
      if (!a && !b) return false
      if (!a || !b) return true
      return a.col !== b.col || a.row !== b.row
    })

    if (!spanChanged && !positionChanged) {
      previousGridRef.current = currentGrid
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
  }, [blockColumnSpans, blockModulePositions, blockOrder, buildSnapshot, computeReflowPlan, pendingReflow, pushHistory, result.settings.gridCols, result.settings.gridRows])

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

      setDragState((prev) => (prev ? { ...prev, preview: snap, moved } : prev))
    }

    const handleMouseUp = () => {
      setDragState((prev) => {
        if (!prev) return null
        if (prev.moved) {
          recordHistoryBeforeChange()
          setBlockModulePositions((current) => ({
            ...current,
            [prev.key]: prev.preview,
          }))
          dragEndedAtRef.current = Date.now()
        }
        return null
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragState, recordHistoryBeforeChange, snapToModule, toPagePoint])

  const closeEditor = useCallback(() => {
    setEditorState(null)
  }, [])

  const saveEditor = useCallback(() => {
    if (!editorState) return
    recordHistoryBeforeChange()

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
    setBlockColumnSpans((prev) => ({
      ...prev,
      [editorState.target]: editorState.draftColumns,
    }))
    setBlockTextAlignments((prev) => ({
      ...prev,
      [editorState.target]: editorState.draftAlign,
    }))
    setBlockModulePositions((prev) => {
      const pos = prev[editorState.target]
      if (!pos) return prev
      const clamped = clampModulePosition(pos, editorState.target)
      if (clamped.col === pos.col && clamped.row === pos.row) return prev
      return {
        ...prev,
        [editorState.target]: clamped,
      }
    })
    setEditorState(null)
  }, [clampModulePosition, editorState, recordHistoryBeforeChange])

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
      setBlockColumnSpans((prev) => {
        const next = { ...prev }
        delete next[target]
        return next
      })
      setBlockTextAlignments((prev) => {
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
          draftColumns: getBlockSpan(key),
          draftAlign: blockTextAlignments[key] ?? "left",
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
      draftColumns: defaultSpan,
      draftAlign: "left",
      draftTextEdited: false,
    })
  }, [blockOrder, blockTextAlignments, blockTextEdited, getBlockSpan, recordHistoryBeforeChange, result.settings.gridCols, result.settings.gridRows, showTypography, snapToModule, styleAssignments, textContent, toPagePoint])

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
      blockColumnSpans: resolvedSpans,
      blockTextAlignments: resolvedAlignments,
      blockModulePositions,
    })
  }, [blockModulePositions, blockOrder, blockTextAlignments, blockTextEdited, getBlockSpan, onLayoutChange, styleAssignments, textContent])

  const canvasCursorClass = dragState ? "cursor-grabbing" : hoverState ? "cursor-grab" : "cursor-default"

  return (
    <div ref={previewContainerRef} className="relative w-full h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
      <div className="relative" style={{ width: result.pageSizePt.width * scale, height: result.pageSizePt.height * scale }}>
        <canvas
          ref={canvasRef}
          width={result.pageSizePt.width * scale}
          height={result.pageSizePt.height * scale}
          className={`block shadow-lg ${canvasCursorClass}`}
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
            className="w-full max-w-md rounded-md border border-gray-300 bg-white shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
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
                <SelectTrigger className="h-8 text-xs flex-1">
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
              <div className="flex items-center rounded-md border border-gray-200">
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
              </div>
              <Button size="sm" onClick={saveEditor}>
                Save
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={deleteEditorBlock} aria-label="Delete paragraph">
                <Trash2 className="h-4 w-4" />
              </Button>
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
