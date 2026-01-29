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

interface GridPreviewProps {
  result: GridResult
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showTypography: boolean
  displayUnit: "pt" | "mm" | "px"
}

export function GridPreview({ result, showBaselines, showModules, showMargins, showTypography, displayUnit }: GridPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = result.pageSizePt
    const { margins } = result.grid
    const { gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
    const { width: modW, height: modH } = result.module
    const { gridCols, gridRows } = result.settings

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw page background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw page border
    ctx.strokeStyle = "#e5e5e5"
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, canvas.width, canvas.height)

    // Draw margins if enabled
    if (showMargins) {
      ctx.fillStyle = "#fffdec"  // Subtle yellow
      ctx.fillRect(0, 0, margins.left * scale, canvas.height)
      ctx.fillRect(canvas.width - margins.right * scale, 0, margins.right * scale, canvas.height)
      ctx.fillRect(0, 0, canvas.width, margins.top * scale)
      ctx.fillRect(0, canvas.height - margins.bottom * scale, canvas.width, margins.bottom * scale)

      // Draw margin labels
      ctx.fillStyle = "#9ca3af"
      ctx.font = "10px Inter, system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(`${formatValue(margins.top, displayUnit)} ${displayUnit}`, canvas.width / 2, margins.top * scale / 2)
      ctx.fillText(`${formatValue(margins.bottom, displayUnit)} ${displayUnit}`, canvas.width / 2, canvas.height - margins.bottom * scale / 2)
      ctx.save()
      ctx.translate(margins.left * scale / 2, canvas.height / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(`${formatValue(margins.left, displayUnit)} ${displayUnit}`, 0, 0)
      ctx.restore()
      ctx.save()
      ctx.translate(canvas.width - margins.right * scale / 2, canvas.height / 2)
      ctx.rotate(Math.PI / 2)
      ctx.fillText(`${formatValue(margins.right, displayUnit)} ${displayUnit}`, 0, 0)
      ctx.restore()
    }

    // Draw content area boundary
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 0.5
    ctx.setLineDash([4, 4])
    ctx.strokeRect(
      margins.left * scale,
      margins.top * scale,
      canvas.width - (margins.left + margins.right) * scale,
      canvas.height - (margins.top + margins.bottom) * scale
    )
    ctx.setLineDash([])

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
      const endY = canvas.height - margins.bottom * scale
      const baselineSpacing = gridUnit * scale

      // Mobile optimization: skip every other line on small screens
      const baselineStep = isMobile ? 2 : 1

      let currentY = startY

      ctx.strokeStyle = "#ec4899"
      ctx.lineWidth = 0.3
      ctx.globalAlpha = 0.5

      while (currentY <= endY) {
        ctx.beginPath()
        ctx.moveTo(margins.left * scale, currentY)
        ctx.lineTo(canvas.width - margins.right * scale, currentY)
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
      const textBlocks: Array<{
        styleKey: string
        extraOffset: number
        lines: string[]
      }> = [
        { styleKey: "headline_1", extraOffset: 0, lines: ["Swiss Design"] },
        { styleKey: "headline_2", extraOffset: 0, lines: ["Grid Systems"] },
        { styleKey: "lead", extraOffset: 0, lines: ["A grid system creates coherent visual", "structure for organized communication."] },
        { styleKey: "body", extraOffset: 0, lines: [
          "The modular grid allows designers to organize content",
          "hierarchically and rhythmically. All typography aligns",
          "to the baseline grid, ensuring harmony across the page."
        ]},
        { styleKey: "subhead_medium", extraOffset: 3, lines: ["Typographic Hierarchy"] },
      ]

      let currentBaselineOffset = 0

      // Draw each text block
      for (const block of textBlocks) {
        const style = styles[block.styleKey]
        if (!style) continue

        const fontSize = style.size * scale
        const leading = style.leading * scale
        const baselineMult = style.baselineMultiplier
        const lineSpacing = baselinePx * baselineMult

        // Calculate position: ensure no clipping, add extra spacing
        const minOffset = getMinOffset(style.size)
        // Ensure at least 1 baseline unit spacing from previous block
        const spacingAfterPrev = currentBaselineOffset > 0 ? 1 : 0
        const blockStartOffset = Math.max(currentBaselineOffset + spacingAfterPrev, minOffset) + block.extraOffset

        // Set font
        ctx.font = `${style.weight === "Bold" ? "700" : "400"} ${fontSize}px Inter, system-ui, -apple-system, sans-serif`
        ctx.textAlign = "left"
        ctx.textBaseline = "alphabetic"

        // Draw each line
        block.lines.forEach((line, lineIndex) => {
          const y = contentTop + (blockStartOffset + lineIndex * baselineMult) * baselinePx
          const x = contentLeft // Start exactly at content area (after left margin)

          // Ensure text doesn't go below content area
          if (y < canvas.height - margins.bottom * scale) {
            ctx.fillText(line, x, y)
          }
        })

        // Update current position for next block (end of last line)
        currentBaselineOffset = blockStartOffset + block.lines.length * baselineMult
      }

      // Draw typography overview table
      // Table aligned to baseline grid - starts 2 baseline units after last text block
      const tableStartY = contentTop + (currentBaselineOffset + 2) * baselinePx
      const tableX = contentLeft
      // Calculate column widths as percentages of content width
      const contentWidthPt = result.pageSizePt.width - result.grid.margins.left - result.grid.margins.right
      const contentWidthPx = contentWidthPt * scale
      // Column ratios: Style 35%, Size 25%, Leading 25%, Weight 15%
      const colRatios = [0.35, 0.25, 0.25, 0.15]
      const colWidths = colRatios.map(r => contentWidthPx * r)
      const rowHeight = baselinePx // Each row is exactly 1 baseline unit
      // Use body style font for the table
      const bodyStyle = styles.body
      const tableFontSize = Math.max(bodyStyle?.size ?? 10, 7) * scale
      const headerFont = `700 ${tableFontSize}px Inter, system-ui, sans-serif`
      const rowFont = `400 ${tableFontSize}px Inter, system-ui, sans-serif`

      // Table headers
      ctx.fillStyle = "#374151" // gray-700
      ctx.font = headerFont
      ctx.textBaseline = "alphabetic"

      const headers = ["Style", "Size (pt)", "Leading (pt)", "Weight"]
      let headerX = tableX
      headers.forEach((header, i) => {
        // First column (Style) left aligned, rest right aligned
        ctx.textAlign = i === 0 ? "left" : "right"
        const xPos = i === 0 ? headerX : headerX + colWidths[i]
        ctx.fillText(header, xPos, tableStartY)
        headerX += colWidths[i]
      })

      // Table rows - sorted by size (largest to smallest) with human-readable names
      const styleOrder = [
        { key: "display", name: "Display" },
        { key: "headline_1", name: "Headline 1" },
        { key: "headline_2", name: "Headline 2" },
        { key: "headline_3", name: "Headline 3" },
        { key: "subhead_medium", name: "Subhead Medium" },
        { key: "subhead_small", name: "Subhead Small" },
        { key: "lead", name: "Lead" },
        { key: "body", name: "Body" },
        { key: "caption", name: "Caption" },
        { key: "footnote", name: "Footnote" }
      ]

      let rowY = tableStartY
      ctx.fillStyle = "#4b5563" // gray-600

      // Get body font for consistent size in numeric columns
      const bodyFont = bodyStyle ? `400 ${bodyStyle.size * scale}px Inter, system-ui, sans-serif` : rowFont

      for (const { key: styleKey, name: styleName } of styleOrder) {
        const style = styles[styleKey]
        if (!style) continue

        // Calculate row height based on the style's leading
        const rowLeading = style.leading * scale
        const nextRowY = rowY + rowLeading

        // Account for text height above baseline (ascent ~0.85 of font size)
        // Position baseline so text fits properly within the row
        const ascentRatio = 0.85
        const textAscent = style.size * scale * ascentRatio
        const textY = rowY + textAscent

        let colX = tableX
        // Style name - use the actual font size for this row, left aligned
        // No padding - text starts exactly at tableX (contentLeft)
        ctx.textAlign = "left"
        ctx.font = `${style.weight === "Bold" ? "700" : "400"} ${style.size * scale}px Inter, system-ui, -apple-system, sans-serif`
        ctx.fillText(styleName, colX, textY)
        colX += colWidths[0]

        // Rest of columns - use body font size, right aligned
        ctx.font = bodyFont
        ctx.textAlign = "right"
        // Size
        ctx.fillText(style.size.toFixed(1), colX + colWidths[1], textY)
        colX += colWidths[1]
        // Leading
        ctx.fillText(style.leading.toFixed(1), colX + colWidths[2], textY)
        colX += colWidths[2]
        // Weight
        ctx.fillText(style.weight, colX + colWidths[3], textY)

        rowY = nextRowY

        // Stop if we're running out of space
        if (rowY > canvas.height - margins.bottom * scale - baselinePx) {
          break
        }
      }

      // Draw caption below table
      const captionStyle = styles.caption
      if (captionStyle) {
        ctx.font = `400 ${captionStyle.size * scale}px Inter, system-ui, sans-serif`
        ctx.fillStyle = "#6b7280" // gray-500
        ctx.textAlign = "left"
        ctx.textBaseline = "alphabetic"
        const captionY = rowY + baselinePx * 2 // 2 baseline units after table
        ctx.fillText("Table 1: Typography system with scaled sizes and leadings", tableX, captionY)

        // Update currentBaselineOffset for footnote
        currentBaselineOffset = (captionY - contentTop) / baselinePx + captionStyle.baselineMultiplier
      }
    }
  }, [result, scale, showBaselines, showModules, showMargins, showTypography, displayUnit, isMobile])

  useEffect(() => {
    const calculateScale = () => {
      const container = canvasRef.current?.parentElement
      if (!container) return

      const { width, height } = result.pageSizePt
      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40

      const scaleX = containerWidth / width
      const scaleY = containerHeight / height
      setScale(Math.min(scaleX, scaleY, 1))
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

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={result.pageSizePt.width * scale}
        height={result.pageSizePt.height * scale}
        className="max-w-full max-h-full shadow-lg"
      />
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600">
        Scale: {(scale * 100).toFixed(0)}% • {formatValue(result.pageSizePt.width, displayUnit)} × {formatValue(result.pageSizePt.height, displayUnit)} {displayUnit}
      </div>
    </div>
  )
}
