import { findNearestAxisIndex } from "./grid-rhythm.ts"

export function resolveNearestPreviewColumn(
  relativeX: number,
  colStarts: readonly number[],
  firstColumnStep: number,
): number {
  if (relativeX >= 0) {
    return findNearestAxisIndex(Array.from(colStarts), relativeX)
  }
  if (!(firstColumnStep > 0)) return 0
  const snapped = Math.round(relativeX / firstColumnStep)
  return snapped === 0 ? 0 : snapped
}

export function resolveInterpolatedPreviewColumn(
  relativeX: number,
  colStarts: readonly number[],
  firstColumnStep: number,
): number {
  if (!(firstColumnStep > 0)) return 0
  if (relativeX < 0) return relativeX / firstColumnStep
  if (colStarts.length === 0) return relativeX / firstColumnStep
  const lastIndex = colStarts.length - 1
  for (let index = 0; index < lastIndex; index += 1) {
    const start = colStarts[index] ?? index * firstColumnStep
    const next = colStarts[index + 1] ?? start + firstColumnStep
    if (relativeX <= next) {
      const step = Math.max(0.0001, next - start)
      return index + (relativeX - start) / step
    }
  }
  const lastStart = colStarts[lastIndex] ?? lastIndex * firstColumnStep
  return lastIndex + (relativeX - lastStart) / firstColumnStep
}

export function resolvePreviewColumnX(
  column: number,
  colStarts: readonly number[],
  firstColumnStep: number,
): number {
  if (!Number.isFinite(column) || !(firstColumnStep > 0)) return 0
  if (column < 0) return column * firstColumnStep
  if (colStarts.length === 0) return column * firstColumnStep
  const lastIndex = colStarts.length - 1
  if (column > lastIndex) {
    const lastStart = colStarts[lastIndex] ?? lastIndex * firstColumnStep
    return lastStart + (column - lastIndex) * firstColumnStep
  }
  const baseIndex = Math.floor(column)
  const fraction = column - baseIndex
  const start = colStarts[baseIndex] ?? baseIndex * firstColumnStep
  const next = colStarts[baseIndex + 1] ?? start + firstColumnStep
  return start + fraction * (next - start)
}
