"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GridResult } from "@/lib/grid-calculator"
import { useCallback, useEffect, useRef, useState } from "react"

const PT_TO_MM = 0.352778
const PT_TO_PX = 96 / 72

type TextContent = {
  display: string
  headline: string
  subhead: string
  body: string
  caption: string
}

type BlockKey = keyof TextContent
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
  key: BlockKey
  startPageX: number
  startPageY: number
  pointerOffsetX: number
  pointerOffsetY: number
  preview: ModulePosition
  moved: boolean
}

type HoverState = {
  key: BlockKey
  canvasX: number
  canvasY: number
}

const DEFAULT_TEXT_CONTENT: TextContent = {
  display: "Swiss Design",
  headline: "Modular Grid Systems",
  subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
  body: "The modular grid allows designers to organize content hierarchically and rhythmically. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide rhythm, contrast, and emphasis while preserving clarity across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet coherent systems.",
  caption: "Figure 5: Based on Müller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
}

const DEFAULT_STYLE_ASSIGNMENTS: Record<BlockKey, TypographyStyleKey> = {
  display: "display",
  headline: "headline",
  subhead: "subhead",
  body: "body",
  caption: "caption",
}

const STYLE_OPTIONS: Array<{ value: TypographyStyleKey; label: string }> = [
  { value: "display", label: "Display" },
  { value: "headline", label: "Headline" },
  { value: "subhead", label: "Subhead" },
  { value: "body", label: "Body" },
  { value: "caption", label: "Caption" },
]

function ptToMm(pt: number): number {
  return pt * PT_TO_MM
}

function ptToPx(pt: number): number {
  return pt * PT_TO_PX
}

function formatValue(value: number, unit: "pt" | "mm" | "px"): string {
  const converted = unit === "mm" ? ptToMm(value) : unit === "px" ? ptToPx(value) : value
  return converted.toFixed(3)
}

function formatPtSize(size: number): string {
  return Number.isInteger(size) ? `${size}pt` : `${size.toFixed(1)}pt`
}

function getDefaultColumnSpan(key: BlockKey, gridCols: number): number {
  if (gridCols <= 1) return 1
  if (key === "display") return gridCols
  if (key === "headline") return gridCols >= 3 ? Math.min(gridCols, Math.floor(gridCols / 2) + 1) : gridCols
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
  const words = text.split(/\s+/).filter(Boolean)
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

interface GridPreviewProps {
  result: GridResult
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showTypography: boolean
  displayUnit: "pt" | "mm" | "px"
  rotation?: number
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  onLayoutChange?: (layout: PreviewLayoutState) => void
}

export interface PreviewLayoutState {
  textContent: TextContent
  styleAssignments: Record<BlockKey, TypographyStyleKey>
  blockColumnSpans: Record<BlockKey, number>
  blockTextAlignments: Record<BlockKey, TextAlignMode>
  blockModulePositions: Partial<Record<BlockKey, ModulePosition>>
}

export function GridPreview({
  result,
  showBaselines,
  showModules,
  showMargins,
  showTypography,
  displayUnit,
  rotation = 0,
  onCanvasReady,
  onLayoutChange,
}: GridPreviewProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRectsRef = useRef<Record<BlockKey, BlockRect>>({
    display: { x: 0, y: 0, width: 0, height: 0 },
    headline: { x: 0, y: 0, width: 0, height: 0 },
    subhead: { x: 0, y: 0, width: 0, height: 0 },
    body: { x: 0, y: 0, width: 0, height: 0 },
    caption: { x: 0, y: 0, width: 0, height: 0 },
  })
  const dragEndedAtRef = useRef<number>(0)

  const [scale, setScale] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [textContent, setTextContent] = useState<TextContent>(DEFAULT_TEXT_CONTENT)
  const [styleAssignments, setStyleAssignments] = useState<Record<BlockKey, TypographyStyleKey>>(DEFAULT_STYLE_ASSIGNMENTS)
  const [blockModulePositions, setBlockModulePositions] = useState<Partial<Record<BlockKey, ModulePosition>>>({})
  const [blockColumnSpans, setBlockColumnSpans] = useState<Partial<Record<BlockKey, number>>>({})
  const [blockTextAlignments, setBlockTextAlignments] = useState<Partial<Record<BlockKey, TextAlignMode>>>({})
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [hoverState, setHoverState] = useState<HoverState | null>(null)
  const [editorState, setEditorState] = useState<{
    target: BlockKey
    draftText: string
    draftStyle: TypographyStyleKey
    draftColumns: number
    draftAlign: TextAlignMode
  } | null>(null)

  const getBlockSpan = useCallback((key: BlockKey) => {
    const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, result.settings.gridCols)
    return Math.max(1, Math.min(result.settings.gridCols, raw))
  }, [blockColumnSpans, result.settings.gridCols])

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

  const clampModulePosition = useCallback((position: ModulePosition, key: BlockKey): ModulePosition => {
    const metrics = getGridMetrics()
    const span = getBlockSpan(key)
    const maxCol = Math.max(0, metrics.gridCols - span)
    return {
      col: Math.max(0, Math.min(maxCol, position.col)),
      row: Math.max(0, Math.min(metrics.maxBaselineRow, position.row)),
    }
  }, [getBlockSpan, getGridMetrics])

  const snapToModule = useCallback((pageX: number, pageY: number, key: BlockKey): ModulePosition => {
    const metrics = getGridMetrics()
    const rawCol = Math.round((pageX - metrics.contentLeft) / metrics.xStep)
    const rawRow = Math.round((pageY - metrics.baselineOriginTop) / metrics.yStep)
    return clampModulePosition({ col: rawCol, row: rawRow }, key)
  }, [clampModulePosition, getGridMetrics])

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
        ctx.fillStyle = "rgba(249, 115, 22, 0.15)"
        ctx.lineWidth = 1.2
        ctx.fillRect(snapX, snapY, snapWidth, baselineStep)
        ctx.strokeRect(snapX, snapY, snapWidth, baselineStep)
        ctx.restore()
        ctx.fillStyle = "#1f2937"
      }

      const getMinOffset = (fontSizePt: number): number => {
        const ascentRatio = 0.85
        const textAboveBaseline = fontSizePt * ascentRatio
        const baselineUnitsNeeded = Math.ceil(textAboveBaseline / gridUnit)
        return Math.max(baselineUnitsNeeded, 1)
      }

      const textBlocks: Array<{ key: BlockKey; extraOffset: number; spaceBefore: number; lines: string[] }> = [
        { key: "display", extraOffset: 0, spaceBefore: 0, lines: [textContent.display] },
        { key: "headline", extraOffset: 0, spaceBefore: 0, lines: [textContent.headline] },
        { key: "subhead", extraOffset: 0, spaceBefore: 0, lines: [textContent.subhead] },
        { key: "body", extraOffset: 0, spaceBefore: 1, lines: [textContent.body] },
      ]

      const captionBlock = { key: "caption" as BlockKey, lines: [textContent.caption] }

      const useRowPlacement = gridRows >= 2
      const useParagraphRows = gridRows >= 5
      const rowHeightBaselines = modH / gridUnit
      const gutterBaselines = gridMarginVertical / gridUnit
      const rowStepBaselines = rowHeightBaselines + gutterBaselines
      const row2TopBaselines = rowStepBaselines
      const row3TopBaselines = rowStepBaselines * 2

      const displayStartOffset = getMinOffset(styles[styleAssignments[textBlocks[0].key]]?.size ?? gridUnit)
      const restStartOffset = gridRows > 6
        ? row3TopBaselines + getMinOffset(styles[styleAssignments[textBlocks[1].key]]?.size ?? gridUnit)
        : row2TopBaselines + getMinOffset(styles[styleAssignments[textBlocks[1].key]]?.size ?? gridUnit)

      let currentBaselineOffset = useRowPlacement ? restStartOffset : displayStartOffset
      let currentRowIndex = 0

      const nextRects: Record<BlockKey, BlockRect> = {
        display: { x: 0, y: 0, width: 0, height: 0 },
        headline: { x: 0, y: 0, width: 0, height: 0 },
        subhead: { x: 0, y: 0, width: 0, height: 0 },
        body: { x: 0, y: 0, width: 0, height: 0 },
        caption: { x: 0, y: 0, width: 0, height: 0 },
      }

      const getOriginForBlock = (key: BlockKey, fallbackX: number, fallbackY: number) => {
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
        const style = styles[styleAssignments[block.key]]
        if (!style) continue

        const fontSize = style.size * scale
        const baselineMult = style.baselineMultiplier

        let blockStartOffset = currentBaselineOffset + block.spaceBefore + block.extraOffset
        if (useParagraphRows) {
          const minOffset = getMinOffset(style.size ?? gridUnit)
          blockStartOffset = currentRowIndex * rowStepBaselines + minOffset + block.extraOffset
        } else if (useRowPlacement && block.key === "display") {
          blockStartOffset = displayStartOffset + block.extraOffset
        }

        ctx.font = `${style.weight === "Bold" ? "700" : "400"} ${fontSize}px Inter, system-ui, -apple-system, sans-serif`

        const span = getBlockSpan(block.key)
        const wrapWidth = span * modW * scale + Math.max(span - 1, 0) * gutterX
        const textLines = wrapText(ctx, block.lines.join(" "), wrapWidth, { hyphenate: block.key === "body" })

        const autoBlockX = contentLeft
        const autoBlockY = contentTop + (blockStartOffset - 1) * baselinePx
        const origin = getOriginForBlock(block.key, autoBlockX, autoBlockY)
        const textAlign = blockTextAlignments[block.key] ?? "left"
        const textAnchorX = textAlign === "right" ? origin.x + wrapWidth : origin.x
        ctx.textAlign = textAlign
        ctx.textBaseline = "alphabetic"
        const hitTopPadding = Math.max(baselinePx, fontSize * 0.9)

        nextRects[block.key] = {
          x: origin.x,
          y: origin.y - hitTopPadding,
          width: wrapWidth,
          height: (textLines.length * baselineMult + 1) * baselinePx + hitTopPadding,
        }

        textLines.forEach((line, lineIndex) => {
          const y = origin.y + baselinePx + lineIndex * baselineMult * baselinePx
          if (y < pageHeight - margins.bottom * scale) {
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

      const captionStyle = styles[styleAssignments[captionBlock.key]]
      if (captionStyle) {
        const captionFontSize = captionStyle.size * scale
        const captionBaselineMult = captionStyle.baselineMultiplier

        ctx.font = `${captionStyle.weight === "Bold" ? "700" : "400"} ${captionFontSize}px Inter, system-ui, -apple-system, sans-serif`
        const captionAlign = blockTextAlignments.caption ?? "left"
        ctx.textBaseline = "alphabetic"

        const captionSpan = getBlockSpan(captionBlock.key)
        const captionWidth = captionSpan * modW * scale + Math.max(captionSpan - 1, 0) * gutterX
        const captionLines = wrapText(ctx, captionBlock.lines.join(" "), captionWidth)
        const captionLineCount = captionLines.length

        const pageHeightPt = result.pageSizePt.height
        const availableHeight = pageHeightPt - margins.top - margins.bottom
        const totalBaselinesFromTop = Math.floor(availableHeight / gridUnit)
        const firstLineBaselineUnit = totalBaselinesFromTop - (captionLineCount - 1) * captionBaselineMult

        const autoCaptionY = contentTop + (firstLineBaselineUnit - 1) * baselinePx
        const captionOrigin = getOriginForBlock("caption", contentLeft, autoCaptionY)
        const captionAnchorX = captionAlign === "right" ? captionOrigin.x + captionWidth : captionOrigin.x
        ctx.textAlign = captionAlign
        const captionHitTopPadding = Math.max(baselinePx, captionFontSize * 0.9)

        captionLines.forEach((line, lineIndex) => {
          const y = captionOrigin.y + baselinePx + lineIndex * captionBaselineMult * baselinePx
          if (y < pageHeight - margins.bottom * scale) {
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
    const { gridCols } = result.settings
    const maxBaselineRow = Math.max(
      0,
      Math.floor((result.pageSizePt.height - result.grid.margins.top - result.grid.margins.bottom) / result.grid.gridUnit)
    )
    setBlockColumnSpans((prev) => {
      let changed = false
      const next: Partial<Record<BlockKey, number>> = { ...prev }
      for (const key of Object.keys(DEFAULT_TEXT_CONTENT) as BlockKey[]) {
        const value = prev[key]
        if (value == null) continue
        const clamped = Math.max(1, Math.min(gridCols, value))
        if (clamped !== value) {
          next[key] = clamped
          changed = true
        }
      }
      return changed ? next : prev
    })

    setBlockModulePositions((prev) => {
      let changed = false
      const next: Partial<Record<BlockKey, ModulePosition>> = { ...prev }
      for (const key of Object.keys(prev) as BlockKey[]) {
        const pos = prev[key]
        if (!pos) continue
        const span = Math.max(1, Math.min(gridCols, blockColumnSpans[key] ?? getDefaultColumnSpan(key, gridCols)))
        const maxCol = Math.max(0, gridCols - span)
        const clamped = {
          col: Math.max(0, Math.min(maxCol, pos.col)),
          row: Math.max(0, Math.min(maxBaselineRow, pos.row)),
        }
        if (clamped.col !== pos.col || clamped.row !== pos.row) {
          next[key] = clamped
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [blockColumnSpans, result.grid.gridUnit, result.grid.margins.bottom, result.grid.margins.top, result.pageSizePt.height, result.settings])

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
  }, [dragState, snapToModule, toPagePoint])

  const closeEditor = useCallback(() => {
    setEditorState(null)
  }, [])

  const saveEditor = useCallback(() => {
    if (!editorState) return

    setTextContent((prev) => ({
      ...prev,
      [editorState.target]: editorState.draftText,
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
  }, [clampModulePosition, editorState])

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || editorState) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    for (const key of Object.keys(blockRectsRef.current) as BlockKey[]) {
      const block = blockRectsRef.current[key]
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
  }, [blockModulePositions, editorState, showTypography, snapToModule, toPagePoint])

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

    for (const key of Object.keys(blockRectsRef.current) as BlockKey[]) {
      const block = blockRectsRef.current[key]
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
  }, [dragState, editorState, hoverState, showTypography, toPagePoint])

  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < 250) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    for (const key of Object.keys(blockRectsRef.current) as BlockKey[]) {
      const block = blockRectsRef.current[key]
      if (pagePoint.x >= block.x && pagePoint.x <= block.x + block.width && pagePoint.y >= block.y && pagePoint.y <= block.y + block.height) {
        setEditorState({
          target: key,
          draftText: textContent[key],
          draftStyle: styleAssignments[key],
          draftColumns: getBlockSpan(key),
          draftAlign: blockTextAlignments[key] ?? "left",
        })
        break
      }
    }
  }, [blockTextAlignments, getBlockSpan, showTypography, styleAssignments, textContent, toPagePoint])

  const isDirty = editorState
    ? editorState.draftText !== textContent[editorState.target]
      || editorState.draftStyle !== styleAssignments[editorState.target]
      || editorState.draftColumns !== getBlockSpan(editorState.target)
      || editorState.draftAlign !== (blockTextAlignments[editorState.target] ?? "left")
    : false

  const hoveredStyle = hoverState ? styleAssignments[hoverState.key] : null
  const hoveredSpan = hoverState ? getBlockSpan(hoverState.key) : null
  const hoveredAlign = hoverState ? (blockTextAlignments[hoverState.key] ?? "left") : null

  useEffect(() => {
    if (!onLayoutChange) return

    const keys = Object.keys(DEFAULT_TEXT_CONTENT) as BlockKey[]
    const resolvedSpans = keys.reduce((acc, key) => {
      acc[key] = getBlockSpan(key)
      return acc
    }, {} as Record<BlockKey, number>)
    const resolvedAlignments = keys.reduce((acc, key) => {
      acc[key] = blockTextAlignments[key] ?? "left"
      return acc
    }, {} as Record<BlockKey, TextAlignMode>)

    onLayoutChange({
      textContent,
      styleAssignments,
      blockColumnSpans: resolvedSpans,
      blockTextAlignments: resolvedAlignments,
      blockModulePositions,
    })
  }, [blockModulePositions, blockTextAlignments, getBlockSpan, onLayoutChange, styleAssignments, textContent])

  return (
    <div ref={previewContainerRef} className="relative w-full h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
      <div className="relative" style={{ width: result.pageSizePt.width * scale, height: result.pageSizePt.height * scale }}>
        <canvas
          ref={canvasRef}
          width={result.pageSizePt.width * scale}
          height={result.pageSizePt.height * scale}
          className="block shadow-lg cursor-grab active:cursor-grabbing"
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
              <span className="text-xs text-gray-600 whitespace-nowrap">Font Hierarchie &gt;</span>
              <Select
                value={editorState.draftStyle}
                onValueChange={(value) => {
                  setEditorState((prev) => prev ? {
                    ...prev,
                    draftStyle: value as TypographyStyleKey,
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
              <Select
                value={editorState.draftAlign}
                onValueChange={(value) => {
                  setEditorState((prev) => prev ? {
                    ...prev,
                    draftAlign: value as TextAlignMode,
                  } : prev)
                }}
              >
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={saveEditor} disabled={!isDirty}>
                Save
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
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600">
        Hint: Drag text to snap to modules • Double-click text to edit • Esc cancels • Cmd/Ctrl+Enter saves • Scale: {(scale * 100).toFixed(0)}% • {formatValue(result.pageSizePt.width, displayUnit)} × {formatValue(result.pageSizePt.height, displayUnit)} {displayUnit}
      </div>
    </div>
  )
}
