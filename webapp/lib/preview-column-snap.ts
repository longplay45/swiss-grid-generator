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
