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

function lineBelongsToGuideRect(
  guideRect: BlockRect,
  line: { left: number; top: number; width: number; baselineY: number },
): boolean {
  const lineRight = line.left + line.width
  const guideRight = guideRect.x + guideRect.width
  const overlapsY = line.baselineY >= guideRect.y && line.top <= guideRect.y + guideRect.height
  const overlapsX = lineRight >= guideRect.x - 1 && line.left <= guideRight + 1
  return overlapsY && overlapsX
}

function commandBelongsToGuideRect(
  guideRect: BlockRect,
  command: { x: number; y: number },
): boolean {
  return command.y >= guideRect.y && command.y <= guideRect.y + guideRect.height
}

export function getPreviewTextGuideGeometry<Key extends string>(
  plan: Pick<BlockRenderPlan<Key>, "guideRects" | "rect" | "rotationOriginX" | "rotationOriginY" | "textAlign"> & {
    renderedLines: { left: number; top: number; width: number; baselineY: number }[]
    commands: { x: number; y: number }[]
  },
  baselineStep: number,
  targetGuideRect?: BlockRect | null,
): PreviewTextGuideGeometry {
  const guideRect = targetGuideRect ?? getPreviewTextGuideRect(plan, baselineStep)
  const verticalX = guideRect.x
  if (plan.textAlign !== "left") {
    return {
      horizontalX: guideRect.x,
      verticalX,
      y: guideRect.y,
      width: guideRect.width,
      height: guideRect.height,
    }
  }

  const matchingLineLefts = plan.renderedLines
    .filter((line) => lineBelongsToGuideRect(guideRect, line))
    .map((line) => line.left)
  const matchingCommandXs = plan.commands
    .filter((command) => commandBelongsToGuideRect(guideRect, command))
    .map((command) => command.x)
  const horizontalX = Math.min(
    guideRect.x,
    ...(matchingLineLefts.length > 0 ? matchingLineLefts : []),
    ...(matchingCommandXs.length > 0 ? matchingCommandXs : []),
  )
  const right = guideRect.x + guideRect.width

  return {
    horizontalX,
    verticalX,
    y: guideRect.y,
    width: right - horizontalX,
    height: guideRect.height,
  }
}
