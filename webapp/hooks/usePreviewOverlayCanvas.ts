import { useEffect } from "react"
import type { MutableRefObject, RefObject } from "react"

import { resolveBlockHeight } from "@/lib/block-height"
import type { GridResult } from "@/lib/grid-calculator"
import { getPreviewTextGuideGeometry, getPreviewTextGuideRect } from "@/lib/preview-guide-rect"
import { findNearestAxisIndex, sumAxisSpan } from "@/lib/grid-rhythm"
import type { BlockRect } from "@/lib/typography-layout-plan"
import type { ModulePosition } from "@/lib/types/preview-layout"

import type { PreviewGridMetrics } from "@/hooks/usePreviewGeometry"

const OVERFLOW_BADGE_RADIUS = 11
const OVERFLOW_BADGE_PADDING = 6
const OVERFLOW_BADGE_FILL = "rgba(255, 80, 80, 0.85)"

type DragState<Key extends string> = {
  key: Key
  preview: ModulePosition
}

type OverlayPlan<Key extends string> = {
  key: Key
  rect: BlockRect
  guideRects: BlockRect[]
  rotationOriginX: number
  rotationOriginY: number
  textAlign: "left" | "center" | "right"
  commands: { x: number; y: number }[]
  renderedLines: {
    left: number
    top: number
    width: number
    height: number
    baselineY: number
  }[]
}

type Args<Key extends string, Plan extends OverlayPlan<Key>> = {
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>
  blockRectsRef: MutableRefObject<Record<Key, BlockRect>>
  imageRectsRef: MutableRefObject<Record<Key, BlockRect>>
  previousPlansRef: MutableRefObject<Map<Key, Plan>>
  result: GridResult
  scale: number
  pixelRatio: number
  rotation: number
  showTypography: boolean
  blockOrder: Key[]
  imageOrder: Key[]
  hoveredTextGuideRect: BlockRect | null
  hoveredTextGuidePlan: Plan | null
  hoveredImageRect: BlockRect | null
  selectedLayerKey: Key | null
  overflowLinesByBlock: Partial<Record<Key, number>>
  dragState: DragState<Key> | null
  editorTarget: Key | null
  getPlacementRows: (key: Key) => number
  getPlacementHeightBaselines: (key: Key) => number
  getPlacementSpan: (key: Key) => number
  getGridMetrics: () => PreviewGridMetrics
  editorPlanVersion?: number
}

export function usePreviewOverlayCanvas<Key extends string, Plan extends OverlayPlan<Key>>({
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
  hoveredTextGuideRect,
  hoveredTextGuidePlan,
  hoveredImageRect,
  selectedLayerKey,
  overflowLinesByBlock,
  dragState,
  editorTarget,
  getPlacementRows,
  getPlacementHeightBaselines,
  getPlacementSpan,
  getGridMetrics,
  editorPlanVersion = 0,
}: Args<Key, Plan>) {
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
      if (!showTypography) return

      const hasOverflow = blockOrder.some((key) => (overflowLinesByBlock[key] ?? 0) > 0)
      const activeEditorPlan = editorTarget ? previousPlansRef.current.get(editorTarget) ?? null : null
      const selectedImageRect = selectedLayerKey && imageOrder.includes(selectedLayerKey)
        ? imageRectsRef.current[selectedLayerKey]
        : null
      const selectedTextPlan = selectedLayerKey ? previousPlansRef.current.get(selectedLayerKey) ?? null : null
      const hasHoveredTextGuide = Boolean(hoveredTextGuideRect)
      const hasHoveredImageGuide = Boolean(hoveredImageRect)
      const hasSelectedLayer = Boolean(selectedImageRect || selectedTextPlan)
      if (!dragState && !hasOverflow && !activeEditorPlan && !hasHoveredTextGuide && !hasHoveredImageGuide && !hasSelectedLayer) return

      const { width, height } = result.pageSizePt
      const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
      const pageWidth = width * scale
      const pageHeight = height * scale
      const baselineStep = gridUnit * scale
      const baselineOriginTop = margins.top * scale - baselineStep
      const contentLeft = margins.left * scale
      const metrics = getGridMetrics()
      const firstColumnStepPt = (metrics.moduleWidths[0] ?? result.module.width) + gridMarginHorizontal

      ctx.save()
      ctx.translate(cssWidth / 2, cssHeight / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-pageWidth / 2, -pageHeight / 2)

      const drawPlacementGuide = (
        horizontalX: number,
        verticalX: number,
        lineY: number,
        widthPx: number,
        heightPx: number,
      ) => {
        ctx.strokeStyle = "#f97316"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(horizontalX, lineY)
        ctx.lineTo(horizontalX + widthPx, lineY)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(verticalX, lineY)
        ctx.lineTo(verticalX, lineY + heightPx)
        ctx.stroke()
      }

      if (dragState) {
        const dragSpan = getPlacementSpan(dragState.key)
        const dragRows = getPlacementRows(dragState.key)
        const dragHeightBaselines = getPlacementHeightBaselines(dragState.key)
        const snapX = dragState.preview.col < 0
          ? contentLeft + dragState.preview.col * firstColumnStepPt * scale
          : contentLeft + (metrics.colStarts[dragState.preview.col] ?? dragState.preview.col * firstColumnStepPt) * scale
        const snapY = baselineOriginTop + dragState.preview.row * baselineStep
        const dragRowStart = Math.max(
          0,
          Math.min(result.settings.gridRows - 1, findNearestAxisIndex(metrics.rowStartBaselines, dragState.preview.row)),
        )
        const snapWidth = sumAxisSpan(metrics.moduleWidths, dragState.preview.col, dragSpan, gridMarginHorizontal) * scale
        const snapHeight = resolveBlockHeight({
          rowStart: dragRowStart,
          rows: dragRows,
          baselines: dragHeightBaselines,
          gridRows: result.settings.gridRows,
          moduleHeights: metrics.moduleHeights,
          fallbackModuleHeight: result.module.height,
          gutterY: gridMarginVertical,
          baselineStep: gridUnit,
        }) * scale
        drawPlacementGuide(snapX, snapX, snapY + baselineStep, snapWidth, snapHeight)
      } else if (hoveredTextGuideRect && hoveredTextGuidePlan) {
        const hoveredGuide = getPreviewTextGuideGeometry(hoveredTextGuidePlan, baselineStep, hoveredTextGuideRect)
        drawPlacementGuide(
          hoveredGuide.horizontalX,
          hoveredGuide.verticalX,
          hoveredGuide.y,
          hoveredGuide.width,
          hoveredGuide.height,
        )
      } else if (hoveredImageRect) {
        drawPlacementGuide(
          hoveredImageRect.x,
          hoveredImageRect.x,
          hoveredImageRect.y,
          hoveredImageRect.width,
          hoveredImageRect.height,
        )
      } else if (selectedImageRect) {
        drawPlacementGuide(
          selectedImageRect.x,
          selectedImageRect.x,
          selectedImageRect.y,
          selectedImageRect.width,
          selectedImageRect.height,
        )
      } else if (selectedTextPlan) {
        const guideRect = getPreviewTextGuideRect(selectedTextPlan, baselineStep)
        const guide = getPreviewTextGuideGeometry(selectedTextPlan, baselineStep, guideRect)
        drawPlacementGuide(
          guide.horizontalX,
          guide.verticalX,
          guide.y,
          guide.width,
          guide.height,
        )
      }

      if (activeEditorPlan) {
        const guideRect = getPreviewTextGuideRect(activeEditorPlan, baselineStep)
        const activeGuide = getPreviewTextGuideGeometry(activeEditorPlan, baselineStep, guideRect)

        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.moveTo(activeGuide.horizontalX, activeGuide.y)
        ctx.lineTo(activeGuide.horizontalX + activeGuide.width, activeGuide.y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(activeGuide.verticalX, activeGuide.y)
        ctx.lineTo(activeGuide.verticalX, activeGuide.y + activeGuide.height)
        ctx.stroke()
      }

      if (hasOverflow) {
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.font = `700 ${Math.max(10, OVERFLOW_BADGE_RADIUS * 1.2)}px Inter, system-ui, -apple-system, sans-serif`
        for (const key of blockOrder) {
          const overflowLines = overflowLinesByBlock[key] ?? 0
          if (overflowLines <= 0) continue
          const rect = blockRectsRef.current[key]
          if (!rect || rect.width <= 0 || rect.height <= 0) continue
          const cx = rect.x + rect.width - OVERFLOW_BADGE_RADIUS - OVERFLOW_BADGE_PADDING
          const cy = rect.y + rect.height - OVERFLOW_BADGE_RADIUS - OVERFLOW_BADGE_PADDING
          ctx.save()
          ctx.beginPath()
          ctx.fillStyle = OVERFLOW_BADGE_FILL
          ctx.arc(cx, cy, OVERFLOW_BADGE_RADIUS, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#ffffff"
          ctx.fillText("…", cx, cy + 0.5)
          ctx.restore()
        }
      }

      ctx.restore()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    blockOrder,
    dragState,
    editorTarget,
    getGridMetrics,
    getPlacementHeightBaselines,
    getPlacementRows,
    getPlacementSpan,
    hoveredTextGuidePlan,
    hoveredTextGuideRect,
    hoveredImageRect,
    imageOrder,
    imageRectsRef,
    overflowLinesByBlock,
    overlayCanvasRef,
    pixelRatio,
    previousPlansRef,
    result,
    rotation,
    scale,
    selectedLayerKey,
    showTypography,
    blockRectsRef,
    editorPlanVersion,
  ])
}
