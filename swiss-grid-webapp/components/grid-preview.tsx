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
  displayUnit: "pt" | "mm" | "px"
}

export function GridPreview({ result, showBaselines, showModules, showMargins, displayUnit }: GridPreviewProps) {
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
      ctx.fillStyle = "#f9fafb"
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
  }, [result, scale, showBaselines, showModules, showMargins, displayUnit, isMobile])

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
