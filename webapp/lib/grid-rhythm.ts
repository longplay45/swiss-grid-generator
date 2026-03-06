import type {
  GridRhythm,
  GridRhythmColsDirection,
  GridRhythmRowsDirection,
} from "./config/defaults.ts"

// NEW: Grid Rhythm (Fibonacci)
export function calculateModuleSizes(
  totalWidth: number,
  totalHeight: number,
  columns: number,
  rows: number,
  rhythm: GridRhythm,
  rhythmRowsEnabled: boolean,
  rhythmRowsDirection: GridRhythmRowsDirection,
  rhythmColsEnabled: boolean,
  rhythmColsDirection: GridRhythmColsDirection,
): { widths: number[]; heights: number[] } {
  const repetitiveWidths = Array(columns).fill(totalWidth / Math.max(columns, 1))
  const repetitiveHeights = Array(rows).fill(totalHeight / Math.max(rows, 1))

  if (rhythm === "repetitive") {
    return {
      widths: repetitiveWidths,
      heights: repetitiveHeights,
    }
  }

  const fib = (count: number) => {
    if (count <= 0) return []
    const sequence = [1]
    for (let i = 1; i < count; i += 1) sequence.push(sequence[i - 1] + (sequence[i - 2] || 1))
    const total = sequence.reduce((sum, value) => sum + value, 0)
    if (total <= 0) return Array(count).fill(1 / count)
    return sequence.map((value) => value / total)
  }

  const fibonacciWidthRatios = fib(columns)
  const fibonacciHeightRatios = fib(rows)
  let widths = rhythmRowsEnabled
    ? fibonacciWidthRatios.map((ratio) => totalWidth * ratio)
    : repetitiveWidths
  let heights = rhythmColsEnabled
    ? fibonacciHeightRatios.map((ratio) => totalHeight * ratio)
    : repetitiveHeights

  if (rhythmRowsDirection === "rtl") widths = [...widths].reverse()
  if (rhythmColsDirection === "btt") heights = [...heights].reverse()

  return { widths, heights }
}

export function resolveAxisSizes(
  sizes: number[] | undefined,
  count: number,
  fallbackSize: number,
): number[] {
  if (count <= 0) return []
  if (!Array.isArray(sizes) || sizes.length !== count) {
    return Array(count).fill(fallbackSize)
  }
  return sizes.map((value) => (Number.isFinite(value) && value > 0 ? value : fallbackSize))
}

export function buildAxisStarts(sizes: number[], gutter: number): number[] {
  const starts: number[] = []
  let cursor = 0
  for (let index = 0; index < sizes.length; index += 1) {
    starts.push(cursor)
    cursor += sizes[index] + gutter
  }
  return starts
}

export function sumAxisSpan(
  sizes: number[],
  startIndex: number,
  span: number,
  gutter: number,
): number {
  let total = 0
  for (let index = 0; index < span; index += 1) {
    const axisIndex = startIndex + index
    const clamped = Math.max(0, Math.min(sizes.length - 1, axisIndex))
    total += sizes[clamped] ?? 0
    if (index < span - 1) total += gutter
  }
  return total
}

export function findNearestAxisIndex(starts: number[], value: number): number {
  if (starts.length <= 1) return 0
  let bestIndex = 0
  let bestDistance = Math.abs(starts[0] - value)
  for (let index = 1; index < starts.length; index += 1) {
    const distance = Math.abs(starts[index] - value)
    if (distance < bestDistance) {
      bestIndex = index
      bestDistance = distance
    }
  }
  return bestIndex
}

export function findAxisIndexAtOffset(
  starts: number[],
  sizes: number[],
  value: number,
): number {
  if (!starts.length || !sizes.length) return -1
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index] ?? 0
    const size = sizes[index] ?? 0
    if (value >= start && value <= start + size) return index
  }
  return -1
}
