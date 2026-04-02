export function resolveScaledCanvasFontSize(
  requestedSize: number,
  scale: number,
  defaultSize: number,
): number {
  const scaledSize = requestedSize * scale
  return Number.isFinite(scaledSize) && scaledSize > 0 ? scaledSize : defaultSize
}
