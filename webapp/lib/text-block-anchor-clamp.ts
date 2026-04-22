import { getPlacementRowCapacity } from "./block-height.ts"
import { clampLayerColumn } from "./layer-placement.ts"

export type TextBlockAnchorPosition = {
  column: number
  row: number
  baselineOffset: number
}

type ClampTextBlockAnchorPositionArgs = {
  position: TextBlockAnchorPosition
  span: number
  rows: number
  gridCols: number
  gridRows: number
  fitWithinGrid?: boolean
  fitColsWithinGrid?: boolean
  fitRowsWithinGrid?: boolean
  snapToColumns?: boolean
  snapToBaseline?: boolean
}

export function clampTextBlockAnchorPosition({
  position,
  span,
  rows,
  gridCols,
  gridRows,
  fitWithinGrid = false,
  fitColsWithinGrid = fitWithinGrid,
  fitRowsWithinGrid = fitWithinGrid,
  snapToColumns = true,
  snapToBaseline = true,
}: ClampTextBlockAnchorPositionArgs): TextBlockAnchorPosition {
  const occupiedRows = getPlacementRowCapacity(rows)
  const maxRow = fitRowsWithinGrid
    ? Math.max(0, gridRows - occupiedRows)
    : Math.max(0, gridRows - 1)

  return {
    column: clampLayerColumn(snapToColumns ? Math.round(position.column) : position.column, {
      span,
      gridCols,
      snapToColumns,
      fitWithinGrid: fitColsWithinGrid,
    }),
    row: Math.max(0, Math.min(maxRow, Math.round(position.row))),
    baselineOffset: snapToBaseline ? Math.round(position.baselineOffset) : position.baselineOffset,
  }
}
