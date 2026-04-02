import type { TextBlockPosition } from "./types/layout-primitives.ts"

export type GridReductionAxis = "columns" | "rows" | "grid"

type ResolveBlockMetric<Key extends string> = (key: Key) => number

type FindTextLayerGridReductionConflictsArgs<Key extends string> = {
  blockOrder: readonly Key[]
  blockModulePositions: Partial<Record<Key, TextBlockPosition>>
  resolveBlockSpan: ResolveBlockMetric<Key>
  resolveBlockRows: ResolveBlockMetric<Key>
  nextGridCols: number
  nextGridRows: number
}

export type TextLayerGridReductionConflicts<Key extends string> = {
  columnConflicts: Key[]
  rowConflicts: Key[]
}

function normalizeMetric(value: number, fallback = 1): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(1, Math.round(value))
}

export function findTextLayerGridReductionConflicts<Key extends string>({
  blockOrder,
  blockModulePositions,
  resolveBlockSpan,
  resolveBlockRows,
  nextGridCols,
  nextGridRows,
}: FindTextLayerGridReductionConflictsArgs<Key>): TextLayerGridReductionConflicts<Key> {
  const columnConflicts: Key[] = []
  const rowConflicts: Key[] = []

  for (const key of blockOrder) {
    const position = blockModulePositions[key]
    if (!position) continue
    if (!Number.isFinite(position.column) || !Number.isFinite(position.row)) continue

    const span = normalizeMetric(resolveBlockSpan(key))
    const rows = normalizeMetric(resolveBlockRows(key))
    const column = Math.round(position.column)
    const row = Math.max(0, Math.round(position.row))

    if (column + span > nextGridCols) {
      columnConflicts.push(key)
    }
    if (row + rows > nextGridRows) {
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
