type SingleColumnLinePlacementInput = {
  firstLineTopY: number
  lineStep: number
  pageBottomY: number
  lineCount: number
  contentTop: number
  moduleHeightPx: number
  moduleCyclePx: number
}

function isWithinModuleBand(
  lineTopY: number,
  contentTop: number,
  moduleHeightPx: number,
  moduleCyclePx: number,
): boolean {
  const relativeY = lineTopY - contentTop
  if (relativeY < -0.0001) return false
  const cycleOffset = ((relativeY % moduleCyclePx) + moduleCyclePx) % moduleCyclePx
  return cycleOffset <= moduleHeightPx - 0.0001
}

export function computeSingleColumnLineTops(input: SingleColumnLinePlacementInput): number[] {
  const safeLineStep = Math.max(0.0001, input.lineStep)
  const safeModuleHeightPx = Math.max(0.0001, input.moduleHeightPx)
  const safeModuleCyclePx = Math.max(safeModuleHeightPx, input.moduleCyclePx)

  const tops: number[] = []
  let lineTopY = input.firstLineTopY
  for (let lineIndex = 0; lineIndex < input.lineCount; lineIndex += 1) {
    while (
      lineTopY < input.pageBottomY
      && !isWithinModuleBand(lineTopY, input.contentTop, safeModuleHeightPx, safeModuleCyclePx)
    ) {
      lineTopY += safeLineStep
    }
    if (lineTopY >= input.pageBottomY) break
    tops.push(lineTopY)
    lineTopY += safeLineStep
  }
  return tops
}
