import type { BlockRect, BlockRenderPlan, PagePoint } from "@/lib/preview-types"

export function getPreviewTextGuideRect<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "guideRects" | "rect" | "rotationOriginX" | "rotationOriginY">,
  baselineStep: number,
): BlockRect {
  if (plan.guideRects.length > 0) return plan.guideRects[0]
  return {
    x: plan.rotationOriginX,
    y: plan.rotationOriginY + baselineStep,
    width: plan.rect.width,
    height: plan.rect.height,
  }
}

export function getHoveredPreviewTextGuideRect<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "guideRects" | "rect" | "rotationOriginX" | "rotationOriginY">,
  hoverPoint: PagePoint | null,
  baselineStep: number,
): BlockRect {
  const guideRects = plan.guideRects.length > 0
    ? plan.guideRects
    : [getPreviewTextGuideRect(plan, baselineStep)]
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
