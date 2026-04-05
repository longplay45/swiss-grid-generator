import type { ModulePosition, TextBlockPosition } from "./types/layout-primitives.ts"

export type GridReductionAxis = "columns" | "rows" | "grid"

type ResolveBlockMetric<Key extends string> = (key: Key) => number

type FindTextLayerGridReductionConflictsArgs<Key extends string> = {
  blockOrder: readonly Key[]
  blockModulePositions: Partial<Record<Key, TextBlockPosition | ModulePosition>>
  resolveBlockSpan: ResolveBlockMetric<Key>
  resolveBlockRows: ResolveBlockMetric<Key>
  imageOrder?: readonly Key[]
  imageModulePositions?: Partial<Record<Key, TextBlockPosition | ModulePosition>>
  resolveImageSpan?: ResolveBlockMetric<Key>
  resolveImageRows?: ResolveBlockMetric<Key>
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

function getColumnIndex(position: TextBlockPosition | ModulePosition): number | null {
  if ("column" in position) {
    return Number.isFinite(position.column) ? Math.round(position.column) : null
  }
  return Number.isFinite(position.col) ? Math.round(position.col) : null
}

function getRowIndex(position: TextBlockPosition | ModulePosition): number | null {
  return Number.isFinite(position.row) ? Math.max(0, Math.round(position.row)) : null
}

function collectGridReductionConflicts<Key extends string>(
  order: readonly Key[],
  positions: Partial<Record<Key, TextBlockPosition | ModulePosition>>,
  resolveSpan: ResolveBlockMetric<Key>,
  resolveRows: ResolveBlockMetric<Key>,
  nextGridCols: number,
  nextGridRows: number,
  columnConflicts: Key[],
  rowConflicts: Key[],
) {
  for (const key of order) {
    const position = positions[key]
    if (!position) continue

    const column = getColumnIndex(position)
    const row = getRowIndex(position)
    if (column === null || row === null) continue

    const span = normalizeMetric(resolveSpan(key))
    const rows = normalizeMetric(resolveRows(key))

    if (column + span > nextGridCols) {
      columnConflicts.push(key)
    }
    if (row + rows > nextGridRows) {
      rowConflicts.push(key)
    }
  }
}

export function findTextLayerGridReductionConflicts<Key extends string>({
  blockOrder,
  blockModulePositions,
  resolveBlockSpan,
  resolveBlockRows,
  imageOrder = [],
  imageModulePositions = {},
  resolveImageSpan,
  resolveImageRows,
  nextGridCols,
  nextGridRows,
}: FindTextLayerGridReductionConflictsArgs<Key>): TextLayerGridReductionConflicts<Key> {
  const columnConflicts: Key[] = []
  const rowConflicts: Key[] = []

  collectGridReductionConflicts(
    blockOrder,
    blockModulePositions,
    resolveBlockSpan,
    resolveBlockRows,
    nextGridCols,
    nextGridRows,
    columnConflicts,
    rowConflicts,
  )

  if (resolveImageSpan && resolveImageRows) {
    collectGridReductionConflicts(
      imageOrder,
      imageModulePositions,
      resolveImageSpan,
      resolveImageRows,
      nextGridCols,
      nextGridRows,
      columnConflicts,
      rowConflicts,
    )
  }

  return {
    columnConflicts,
    rowConflicts,
  }
}

export function getGridReductionWarningMessage(axis: GridReductionAxis): string {
  switch (axis) {
    case "columns":
      return "Cannot reduce columns: Some paragraphs or image placeholders are positioned beyond the new grid size. Please reposition or delete them first."
    case "rows":
      return "Cannot reduce rows: Some paragraphs or image placeholders would fall outside the new grid. Please reposition or delete them first."
    default:
      return "Cannot reduce the grid: Some paragraphs or image placeholders would fall outside the new grid. Please reposition or delete them first."
  }
}
