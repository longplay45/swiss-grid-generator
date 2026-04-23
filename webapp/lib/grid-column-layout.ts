import type { GridResult } from "@/lib/grid-calculator"
import { buildAxisStarts, resolveAxisSizes, sumAxisSpan } from "@/lib/grid-rhythm"

export function resolveGridModuleWidths(result: GridResult): number[] {
  return resolveAxisSizes(result.module.widths, result.settings.gridCols, result.module.width)
}

export function resolveGridColumnStarts(
  result: GridResult,
  moduleWidths: number[] = resolveGridModuleWidths(result),
): number[] {
  const explicitStarts = result.grid.columnStarts
  if (Array.isArray(explicitStarts) && explicitStarts.length === result.settings.gridCols) {
    return explicitStarts
  }
  return buildAxisStarts(moduleWidths, result.grid.gridMarginHorizontal)
}

export function resolveGridFirstColumnStep(
  moduleWidths: number[],
  columnStarts: number[],
  gutterX: number,
  fallbackWidth: number,
): number {
  if (columnStarts.length >= 2) {
    const step = columnStarts[1] - columnStarts[0]
    if (Number.isFinite(step) && step > 0) return step
  }
  return (moduleWidths[0] ?? fallbackWidth) + gutterX
}

export function resolveGridColumnOffset(
  columnStarts: number[],
  startIndex: number,
  offset: number,
  moduleWidths: number[],
  gutterX: number,
): number {
  const targetIndex = startIndex + offset
  if (
    columnStarts.length === moduleWidths.length
    && startIndex >= 0
    && startIndex < columnStarts.length
    && targetIndex >= 0
    && targetIndex < columnStarts.length
  ) {
    return columnStarts[targetIndex] - columnStarts[startIndex]
  }

  let position = 0
  for (let index = 0; index < offset; index += 1) {
    position += (moduleWidths[startIndex + index] ?? moduleWidths[0] ?? 0) + gutterX
  }
  return position
}

export function sumGridColumnSpan(
  moduleWidths: number[],
  columnStarts: number[],
  startIndex: number,
  span: number,
  gutterX: number,
): number {
  if (span <= 0) return 0
  const lastIndex = startIndex + span - 1
  if (
    columnStarts.length === moduleWidths.length
    && startIndex >= 0
    && startIndex < columnStarts.length
    && lastIndex >= 0
    && lastIndex < columnStarts.length
  ) {
    return (columnStarts[lastIndex] - columnStarts[startIndex]) + (moduleWidths[lastIndex] ?? 0)
  }
  return sumAxisSpan(moduleWidths, startIndex, span, gutterX)
}
