export function getDefaultColumnSpan(key: string, gridCols: number): number {
  if (gridCols <= 1) return 1
  if (key === "display") return gridCols
  if (key === "headline") return gridCols >= 3 ? Math.min(gridCols, Math.floor(gridCols / 2) + 1) : gridCols
  if (key === "caption") return 1
  return Math.max(1, Math.floor(gridCols / 2))
}
