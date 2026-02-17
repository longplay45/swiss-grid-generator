import type { GridResult } from "@/lib/grid-calculator"

type StaticGuidesRenderOptions = {
  ctx: CanvasRenderingContext2D
  canvasWidth: number
  canvasHeight: number
  result: GridResult
  scale: number
  rotation: number
  showMargins: boolean
  showModules: boolean
  showBaselines: boolean
  isMobile: boolean
}

export function renderStaticGuides({
  ctx,
  canvasWidth,
  canvasHeight,
  result,
  scale,
  rotation,
  showMargins,
  showModules,
  showBaselines,
  isMobile,
}: StaticGuidesRenderOptions): void {
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

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  ctx.save()
  ctx.translate(canvasWidth / 2, canvasHeight / 2)
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

    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
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
}
