import { sumAxisSpan } from "./grid-rhythm.ts"

export type HeightMetrics = {
  rows: number
  baselines: number
}

type NormalizeHeightMetricsArgs = {
  rows: number | undefined
  baselines: number | undefined
  gridRows: number
  defaultRows?: number
}

function toRoundedNonNegativeInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.round(value))
}

export function normalizeHeightMetrics({
  rows,
  baselines,
  gridRows,
  defaultRows = 1,
}: NormalizeHeightMetricsArgs): HeightMetrics {
  const maxRows = Math.max(0, Math.round(gridRows))
  const fallbackRows = Math.max(0, Math.min(maxRows, Math.round(defaultRows)))
  const nextRows = Math.max(0, Math.min(maxRows, toRoundedNonNegativeInteger(rows, fallbackRows)))
  const nextBaselines = toRoundedNonNegativeInteger(baselines, 0)

  if (nextRows === 0 && nextBaselines === 0) {
    return {
      rows: fallbackRows > 0 ? fallbackRows : Math.min(1, maxRows),
      baselines: 0,
    }
  }

  return {
    rows: nextRows,
    baselines: nextBaselines,
  }
}

type ResolveHeightArgs = {
  rowStart: number
  rows: number | undefined
  baselines: number | undefined
  gridRows: number
  moduleHeights: readonly number[]
  fallbackModuleHeight: number
  gutterY: number
  baselineStep: number
}

export function resolveBlockHeight({
  rowStart,
  rows,
  baselines,
  gridRows,
  moduleHeights,
  fallbackModuleHeight,
  gutterY,
  baselineStep,
}: ResolveHeightArgs): number {
  const normalizedRows = typeof rows === "number" && Number.isFinite(rows)
    ? Math.max(0, Math.round(rows))
    : 0
  const normalizedBaselines = typeof baselines === "number" && Number.isFinite(baselines)
    ? Math.max(0, Math.round(baselines))
    : 0
  const extraBaselineHeight = normalizedBaselines * baselineStep

  if (normalizedRows === 0) {
    return extraBaselineHeight
  }

  const moduleHeight = (rowStart < 0 || rowStart >= gridRows)
    ? normalizedRows * fallbackModuleHeight + Math.max(normalizedRows - 1, 0) * gutterY
    : sumAxisSpan(Array.from(moduleHeights), rowStart, normalizedRows, gutterY)

  return moduleHeight + extraBaselineHeight
}

export function getPlacementRowCapacity(rows: number): number {
  return Math.max(1, Math.round(rows))
}
