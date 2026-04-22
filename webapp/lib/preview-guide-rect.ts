import type { BlockRect, BlockRenderPlan, PagePoint } from "@/lib/preview-types"

export type PreviewTextGuideGeometry = {
  horizontalX: number
  verticalX: number
  y: number
  width: number
  height: number
}

export function getPreviewTextGuideRect<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "guideRects" | "rect" | "rotationOriginX" | "rotationOriginY">,
): BlockRect {
  if (plan.guideRects.length > 0) return plan.guideRects[0]
  return {
    x: plan.rotationOriginX,
    y: plan.rotationOriginY,
    width: plan.rect.width,
    height: plan.rect.height,
  }
}

export function getHoveredPreviewTextGuideRect<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "guideRects" | "rect" | "rotationOriginX" | "rotationOriginY">,
  hoverPoint: PagePoint | null,
): BlockRect {
  const guideRects = plan.guideRects.length > 0
    ? plan.guideRects
    : [getPreviewTextGuideRect(plan)]
  if (!hoverPoint) return guideRects[0]

  let bestRect = guideRects[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const guideRect of guideRects) {
    const centerX = guideRect.x + guideRect.width / 2
    const distance = Math.abs(hoverPoint.x - centerX)
    if (distance < bestDistance) {
      bestDistance = distance
      bestRect = guideRect
    }
  }
  return bestRect
}

export function getPreviewTextGuideGeometry<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "guideRects" | "rect" | "rotationOriginX" | "rotationOriginY" | "textAlign"> & {
    renderedLines: { left: number; top: number; width: number; baselineY: number }[]
    commands: { x: number; y: number }[]
  },
  targetGuideRect?: BlockRect | null,
): PreviewTextGuideGeometry {
  const guideRect = targetGuideRect ?? getPreviewTextGuideRect(plan)

  return {
    horizontalX: guideRect.x,
    verticalX: guideRect.x,
    y: guideRect.y,
    width: guideRect.width,
    height: guideRect.height,
  }
}
