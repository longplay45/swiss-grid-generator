"use client"

import { GridResult } from "@/lib/grid-calculator"
import { useEffect, useRef, useState } from "react"

// Conversion factors
const PT_TO_MM = 0.352778  // 1 point = 0.352778 mm
const PT_TO_PX = 96 / 72   // 1 point = 1.333... px (at 96dpi: 1in = 72pt = 96px)

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
      // Fallback: force at least one character to avoid infinite loop.
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

type TextContent = {
  display: string
  headline: string
  subhead: string
  body: string
  caption: string
}

type BlockRect = {
  x: number
  y: number
  width: number
  height: number
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
}: GridPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [textContent, setTextContent] = useState<TextContent>({
    display: "Swiss Design",
    headline: "Modular Grid Systems",
    subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
    body: "The modular grid allows designers to organize content hierarchically and rhythmically. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide rhythm, contrast, and emphasis while preserving clarity across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet coherent systems.",
    caption: "Figure 5: Based on Müller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
  })
  const [editingKey, setEditingKey] = useState<keyof TextContent | null>(null)
  const [blockRects, setBlockRects] = useState<Record<string, BlockRect>>({})
  const blockRectsRef = useRef<Record<string, BlockRect>>({})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    onCanvasReady?.(canvas)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = result.pageSizePt
    const { margins } = result.grid
    const { gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
    const { width: modW, height: modH } = result.module
    const { gridCols, gridRows } = result.settings
    const pageWidth = width * scale
    const pageHeight = height * scale
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Draw page background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.save()
    ctx.translate(canvasWidth / 2, canvasHeight / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-pageWidth / 2, -pageHeight / 2)

    // Draw page border
    ctx.strokeStyle = "#e5e5e5"
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, pageWidth, pageHeight)

    // Draw margins if enabled (outline only)
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

    // Draw content area boundary handled above when margins are shown

    // Draw modules if enabled
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

          // Alternate shading
          if ((row + col) % 2 === 0) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.02)"
            ctx.fillRect(x, y, w, h)
          }
        }
      }
      ctx.globalAlpha = 1
    }

    // Draw baseline grid if enabled
    if (showBaselines) {
      const startY = margins.top * scale
      const endY = pageHeight - margins.bottom * scale
      const baselineSpacing = gridUnit * scale

      // Mobile optimization: skip every other line on small screens
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

    // Draw typography preview if enabled
    if (showTypography) {
      const { styles } = result.typography
      const contentTop = margins.top * scale
      const contentLeft = margins.left * scale
      const contentWidth = (result.pageSizePt.width - margins.left - margins.right) * scale
      const baselinePx = gridUnit * scale
      const isMultiCol = gridCols >= 2
      const halfCols = Math.max(1, Math.floor(gridCols / 2))
      const columnGroupWidth = isMultiCol
        ? (halfCols * modW + Math.max(halfCols - 1, 0) * gridMarginHorizontal) * scale
        : contentWidth
      const textColumnWidth = columnGroupWidth
      const headlineCols = gridCols >= 3 ? Math.min(gridCols, halfCols + 1) : gridCols
      const headlineWidth = gridCols >= 3
        ? (headlineCols * modW + Math.max(headlineCols - 1, 0) * gridMarginHorizontal) * scale
        : contentWidth
      const columnGap = isMultiCol ? gridMarginHorizontal * scale : 0
      const columnXs = isMultiCol
        ? [contentLeft, contentLeft + columnGroupWidth + columnGap]
        : [contentLeft]

      // Text colors
      ctx.fillStyle = "#1f2937" // gray-800

      // Calculate minimum offset for each style to prevent top clipping
      // Text extends above baseline by approximately 0.8-0.9 of font size
      const getMinOffset = (fontSizePt: number): number => {
        const ascentRatio = 0.85 // Approximate text height above baseline
        const textAboveBaseline = fontSizePt * ascentRatio
        const baselineUnitsNeeded = Math.ceil(textAboveBaseline / gridUnit)
        return Math.max(baselineUnitsNeeded, 1) // At least 1 baseline unit
      }

      // Define text blocks with relative offsets (additional space beyond minimum)
      // Caption is handled separately (positioned from bottom)
      const textBlocks: Array<{
        styleKey: string
        extraOffset: number
        spaceBefore: number
        lines: string[]
      }> = [
        { styleKey: "display", extraOffset: 0, spaceBefore: 0, lines: [
          textContent.display,
        ]},
        { styleKey: "headline", extraOffset: 0, spaceBefore: 0, lines: [
          textContent.headline,
        ]},
        { styleKey: "subhead", extraOffset: 0, spaceBefore: 0, lines: [
          textContent.subhead,
        ]},
        { styleKey: "body", extraOffset: 0, spaceBefore: 1, lines: [
          textContent.body,
        ]},
      ]

      // Caption block - positioned from bottom
      const captionBlock = {
        styleKey: "caption",
        lines: [
          textContent.caption,
        ]
      }

      const useRowPlacement = gridRows >= 2
      const useParagraphRows = gridRows >= 5
      const rowHeightBaselines = modH / gridUnit
      const gutterBaselines = gridMarginVertical / gridUnit
      const rowStepBaselines = rowHeightBaselines + gutterBaselines
      const row2TopBaselines = rowStepBaselines
      const row3TopBaselines = rowStepBaselines * 2

      const displayStartOffset = getMinOffset(styles[textBlocks[0]?.styleKey]?.size ?? gridUnit)
      const restStartOffset = gridRows > 6
        ? row3TopBaselines + getMinOffset(styles[textBlocks[1]?.styleKey]?.size ?? gridUnit)
        : row2TopBaselines + getMinOffset(styles[textBlocks[1]?.styleKey]?.size ?? gridUnit)

      // Ensure the first block clears the top edge; subsequent blocks use spacing only.
      let currentBaselineOffset = useRowPlacement
        ? restStartOffset
        : displayStartOffset
      let currentRowIndex = 0

      // Draw each text block (top-aligned)
      const nextRects: Record<string, BlockRect> = {}

      for (const block of textBlocks) {
        const style = styles[block.styleKey]
        if (!style) continue

        const fontSize = style.size * scale
        const baselineMult = style.baselineMultiplier

        // Calculate position: spaceBefore baselines plus any extra offset
        let blockStartOffset = currentBaselineOffset + block.spaceBefore + block.extraOffset
        if (useParagraphRows) {
          const minOffset = getMinOffset(style.size ?? gridUnit)
          blockStartOffset = currentRowIndex * rowStepBaselines + minOffset + block.extraOffset
        } else if (useRowPlacement && block.styleKey === "display") {
          blockStartOffset = displayStartOffset + block.extraOffset
        }

        // Set font
        ctx.font = `${style.weight === "Bold" ? "700" : "400"} ${fontSize}px Inter, system-ui, -apple-system, sans-serif`
        ctx.textAlign = "left"
        ctx.textBaseline = "alphabetic"

        const useColumns = isMultiCol && (block.styleKey === "subhead" || block.styleKey === "body")
        const shouldWrap = (block.styleKey === "subhead" || block.styleKey === "body")
          ? true
          : true
        const wrapWidth = (block.styleKey === "subhead" || block.styleKey === "body")
          ? (isMultiCol ? textColumnWidth : contentWidth)
          : block.styleKey === "headline"
            ? headlineWidth
            : contentWidth
        const textLines = shouldWrap
          ? wrapText(ctx, block.lines.join(" "), wrapWidth, { hyphenate: block.styleKey === "body" })
          : block.lines

        const blockY = contentTop + (blockStartOffset - 1) * baselinePx
        const blockHeight = (textLines.length * baselineMult + 1) * baselinePx
        nextRects[block.styleKey] = {
          x: contentLeft,
          y: blockY,
          width: wrapWidth,
          height: blockHeight,
        }

        if (!useParagraphRows && useRowPlacement && block.styleKey === "display") {
          textLines.forEach((line, lineIndex) => {
            const y = contentTop + (blockStartOffset + lineIndex * baselineMult) * baselinePx
            if (y < pageHeight - margins.bottom * scale) {
              ctx.fillText(line, contentLeft, y)
            }
          })
          // Continue sequentially after the display block.
          currentBaselineOffset = restStartOffset
          continue
        }

        if (!useColumns) {
          // Draw each line
          textLines.forEach((line, lineIndex) => {
            const y = contentTop + (blockStartOffset + lineIndex * baselineMult) * baselinePx
            const x = contentLeft

            if (y < pageHeight - margins.bottom * scale) {
              ctx.fillText(line, x, y)
            }
          })

          if (!useParagraphRows) {
            currentBaselineOffset = blockStartOffset + textLines.length * baselineMult
          } else {
            const blockEnd = blockStartOffset + textLines.length * baselineMult
            currentRowIndex = Math.ceil(blockEnd / rowStepBaselines)
          }
        } else {
          const availableHeightPx = pageHeight - margins.bottom * scale - contentTop
          const availableBaselines = Math.floor(availableHeightPx / baselinePx)
          const remainingBaselines = Math.max(availableBaselines - blockStartOffset, 0)
          const maxLinesPerColumn = Math.max(Math.floor(remainingBaselines / baselineMult), 1)

          let lineIndex = 0
          let maxUsedLines = 0

          for (let colIndex = 0; colIndex < columnXs.length && lineIndex < textLines.length; colIndex += 1) {
            const x = columnXs[colIndex]
            let usedInColumn = 0

            while (usedInColumn < maxLinesPerColumn && lineIndex < textLines.length) {
              const y = contentTop + (blockStartOffset + usedInColumn * baselineMult) * baselinePx
              if (y < pageHeight - margins.bottom * scale) {
                ctx.fillText(textLines[lineIndex], x, y)
              }
              usedInColumn += 1
              lineIndex += 1
            }

            maxUsedLines = Math.max(maxUsedLines, usedInColumn)
          }

          if (!useParagraphRows) {
            currentBaselineOffset = blockStartOffset + maxUsedLines * baselineMult
          } else {
            const blockEnd = blockStartOffset + maxUsedLines * baselineMult
            currentRowIndex = Math.ceil(blockEnd / rowStepBaselines)
          }
        }
      }

      // Draw caption at the last available baseline just inside the bottom margin
      const captionStyle = styles[captionBlock.styleKey]
      if (captionStyle) {
        const captionFontSize = captionStyle.size * scale
        const captionBaselineMult = captionStyle.baselineMultiplier

        ctx.font = `${captionStyle.weight === "Bold" ? "700" : "400"} ${captionFontSize}px Inter, system-ui, -apple-system, sans-serif`
        ctx.textAlign = "left"
        ctx.textBaseline = "alphabetic"

        const captionWidth = isMultiCol ? textColumnWidth : contentWidth
        const captionLines = wrapText(ctx, captionBlock.lines.join(" "), captionWidth)
        const captionLineCount = captionLines.length

        // Calculate last baseline: from margins.top to (pageHeight - margins.bottom)
      const pageHeightPt = result.pageSizePt.height
      const availableHeight = pageHeightPt - margins.top - margins.bottom
      const totalBaselinesFromTop = Math.floor(availableHeight / gridUnit)

        // Last baseline position (in baseline units from content top)
        const lastBaselineUnit = totalBaselinesFromTop

        // Position: last line on the last baseline, work backwards for previous lines
        const firstLineBaselineUnit = lastBaselineUnit - (captionLineCount - 1) * captionBaselineMult

        captionLines.forEach((line, lineIndex) => {
          const baselineUnit = firstLineBaselineUnit + lineIndex * captionBaselineMult
          const y = contentTop + baselineUnit * baselinePx
          ctx.fillText(line, contentLeft, y)
        })

        const captionY = contentTop + (firstLineBaselineUnit - 1) * baselinePx
        const captionHeight = (captionLineCount * captionBaselineMult + 1) * baselinePx
        nextRects.caption = {
          x: contentLeft,
          y: captionY,
          width: captionWidth,
          height: captionHeight,
        }
      }

      const prevRects = blockRectsRef.current
      const rectKeys = Object.keys(nextRects)
      const prevKeys = Object.keys(prevRects)
      let rectsChanged = rectKeys.length !== prevKeys.length
      if (!rectsChanged) {
        for (const key of rectKeys) {
          const a = prevRects[key]
          const b = nextRects[key]
          if (!a || !b || a.x !== b.x || a.y !== b.y || a.width !== b.width || a.height !== b.height) {
            rectsChanged = true
            break
          }
        }
      }

      if (rectsChanged) {
        blockRectsRef.current = nextRects
        setBlockRects(nextRects)
      }
    }
    ctx.restore()
  }, [result, scale, showBaselines, showModules, showMargins, showTypography, displayUnit, isMobile, rotation, textContent, onCanvasReady])

  useEffect(() => {
    const calculateScale = () => {
      const container = canvasRef.current?.parentElement
      if (!container) return

      const { width, height } = result.pageSizePt
      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40

      const scaleX = containerWidth / width
      const scaleY = containerHeight / height

      setScale(Math.min(scaleX, scaleY))
    }

    calculateScale()
    window.addEventListener("resize", calculateScale)
    return () => window.removeEventListener("resize", calculateScale)
  }, [result])

  // Detect mobile state and update on resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    for (const [key, block] of Object.entries(blockRects)) {
      if (x >= block.x && x <= block.x + block.width && y >= block.y && y <= block.y + block.height) {
        setEditingKey(key as keyof TextContent)
        return
      }
    }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={result.pageSizePt.width * scale}
        height={result.pageSizePt.height * scale}
        className="max-w-full max-h-full shadow-lg"
        onDoubleClick={handleDoubleClick}
      />
      {editingKey && blockRects[editingKey] ? (
        <textarea
          value={textContent[editingKey]}
          onChange={(event) => setTextContent({ ...textContent, [editingKey]: event.target.value })}
          onBlur={() => setEditingKey(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setEditingKey(null)
            }
          }}
          style={{
            left: blockRects[editingKey].x,
            top: blockRects[editingKey].y,
            width: blockRects[editingKey].width,
            height: blockRects[editingKey].height,
          }}
          className="absolute resize-none border border-blue-500 bg-white/95 px-2 py-1 text-xs text-gray-900 shadow focus:outline-none"
        />
      ) : null}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600">
        Tip: Doubleclick to edit • Scale: {(scale * 100).toFixed(0)}% • {formatValue(result.pageSizePt.width, displayUnit)} × {formatValue(result.pageSizePt.height, displayUnit)} {displayUnit}
      </div>
    </div>
  )
}
