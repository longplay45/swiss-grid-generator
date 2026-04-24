export type LayerColumnBoundsArgs = {
  span: number
  gridCols: number
  snapToColumns?: boolean
  fitWithinGrid?: boolean
}

export function resolveLayerColumnBounds({
  span,
  gridCols,
  snapToColumns = true,
  fitWithinGrid = false,
}: LayerColumnBoundsArgs): { minCol: number; maxCol: number } {
  const minCol = snapToColumns
    ? -Math.max(0, span - 1)
    : -Math.max(1, span - 1)
  const maxCol = fitWithinGrid
    ? Math.max(minCol, gridCols - span + (snapToColumns ? 0 : 1))
    : Math.max(0, gridCols - (snapToColumns ? 1 : 0))
  return { minCol, maxCol }
}

export function clampLayerColumn(column: number, args: LayerColumnBoundsArgs): number {
  const { minCol, maxCol } = resolveLayerColumnBounds(args)
  return Math.max(minCol, Math.min(maxCol, column))
}

export function resolveFreePlacementRowBounds(maxBaselineRow: number): { minRow: number; maxRow: number } {
  const safeMaxBaselineRow = Math.max(0, maxBaselineRow)
  return {
    minRow: -safeMaxBaselineRow,
    // Allow the same travel range below the content field that already exists above it.
    maxRow: safeMaxBaselineRow * 2,
  }
}

export function clampFreePlacementRow(row: number, maxBaselineRow: number): number {
  const { minRow, maxRow } = resolveFreePlacementRowBounds(maxBaselineRow)
  return Math.max(minRow, Math.min(maxRow, row))
}
