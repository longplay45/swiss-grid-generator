import type { GridResult } from "./grid-calculator.ts"
import { buildAxisStarts, findNearestAxisIndex, resolveAxisSizes } from "./grid-rhythm.ts"
import type { ModulePosition } from "./types/layout-primitives.ts"

export type GridReductionAxis = "columns" | "rows" | "grid"

type ResolveBlockMetric<Key extends string> = (key: Key) => number

type FindTextLayerGridReductionConflictsArgs<Key extends string> = {
  blockOrder: readonly Key[]
  blockModulePositions: Partial<Record<Key, ModulePosition>>
  resolveBlockSpan: ResolveBlockMetric<Key>
  resolveBlockRows: ResolveBlockMetric<Key>
  nextGridCols: number
  nextGridRows: number
  nextRowStartsInBaselines: readonly number[]
}

export type TextLayerGridReductionConflicts<Key extends string> = {
  columnConflicts: Key[]
  rowConflicts: Key[]
}

function normalizeMetric(value: number, fallback = 1): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(1, Math.round(value))
}

export function getGridRowStartsInBaselines(
  result: Pick<GridResult, "module" | "settings" | "grid">,
): number[] {
  const moduleHeights = resolveAxisSizes(
    result.module.heights,
    result.settings.gridRows,
    result.module.height,
  )
  return buildAxisStarts(moduleHeights, result.grid.gridMarginVertical)
    .map((value) => value / Math.max(0.0001, result.grid.gridUnit))
}

export function findTextLayerGridReductionConflicts<Key extends string>({
  blockOrder,
  blockModulePositions,
  resolveBlockSpan,
  resolveBlockRows,
  nextGridCols,
  nextGridRows,
  nextRowStartsInBaselines,
}: FindTextLayerGridReductionConflictsArgs<Key>): TextLayerGridReductionConflicts<Key> {
  const columnConflicts: Key[] = []
  const rowConflicts: Key[] = []
  const resolvedRowStarts = Array.from(
    nextRowStartsInBaselines.length > 0 ? nextRowStartsInBaselines : [0],
  )

  for (const key of blockOrder) {
    const position = blockModulePositions[key]
    if (!position) continue
    if (!Number.isFinite(position.col) || !Number.isFinite(position.row)) continue

    const span = normalizeMetric(resolveBlockSpan(key))
    const rows = normalizeMetric(resolveBlockRows(key))
    const col = Math.round(position.col)
    if (col + span > nextGridCols) {
      columnConflicts.push(key)
    }

    const rowStartIndex = Math.max(
      0,
      Math.min(nextGridRows - 1, findNearestAxisIndex(resolvedRowStarts, position.row)),
    )
    if (rowStartIndex + rows > nextGridRows) {
      rowConflicts.push(key)
    }
  }

  return {
    columnConflicts,
    rowConflicts,
  }
}

export function getGridReductionWarningMessage(axis: GridReductionAxis): string {
  switch (axis) {
    case "columns":
      return "Cannot reduce columns: Some paragraphs are positioned beyond the new grid size. Please reposition or delete them first."
    case "rows":
      return "Cannot reduce rows: Some paragraphs would fall outside the new grid. Please reposition or delete them first."
    default:
      return "Cannot reduce the grid: Some paragraphs would fall outside the new grid. Please reposition or delete them first."
  }
}
