export type GridRhythm = "repetitive" | "fibonacci"
export type GridRhythmRotation = 0 | 90 | 180 | 360

// NEW: Grid Rhythm (Fibonacci)
export function calculateModuleSizes(
  totalWidth: number,
  totalHeight: number,
  columns: number,
  rows: number,
  rhythm: GridRhythm,
  rotation: GridRhythmRotation,
): { widths: number[]; heights: number[] } {
  if (rhythm === "repetitive") {
    return {
      widths: Array(columns).fill(totalWidth / columns),
      heights: Array(rows).fill(totalHeight / rows),
    }
  }

  const fib = (n: number) => {
    const seq = [1]
    for (let i = 1; i < n; i += 1) seq.push(seq[i - 1] + (seq[i - 2] || 1))
    return seq
  }

  let seq = fib(columns)
  let totalParts = seq.reduce((a, b) => a + b, 0)
  let widths = seq.map((v) => totalWidth * (v / totalParts))

  seq = fib(rows)
  totalParts = seq.reduce((a, b) => a + b, 0)
  let heights = seq.map((v) => totalHeight * (v / totalParts))

  switch (rotation) {
    case 90:
      ;[widths, heights] = [
        normalizeAxisToTotal([...heights].reverse(), columns, totalWidth),
        normalizeAxisToTotal([...widths].reverse(), rows, totalHeight),
      ]
      break
    case 180:
      widths = normalizeAxisToTotal([...widths].reverse(), columns, totalWidth)
      heights = normalizeAxisToTotal([...heights].reverse(), rows, totalHeight)
      break
    case 360:
    case 0:
    default:
      break
  }

  return { widths, heights }
}

function normalizeAxisToTotal(values: number[], count: number, total: number): number[] {
  if (count <= 0) return []
  if (values.length === count) {
    const sum = values.reduce((acc, value) => acc + value, 0)
    if (sum <= 0) return Array(count).fill(total / count)
    return values.map((value) => total * (value / sum))
  }
  const source = values.length > 0 ? values : [1]
  const sampled: number[] = []
  for (let index = 0; index < count; index += 1) {
    const ratio = count === 1 ? 0 : index / (count - 1)
    const sourceIndex = ratio * (source.length - 1)
    const left = Math.floor(sourceIndex)
    const right = Math.min(source.length - 1, Math.ceil(sourceIndex))
    if (left === right) {
      sampled.push(source[left])
    } else {
      const mix = sourceIndex - left
      sampled.push(source[left] * (1 - mix) + source[right] * mix)
    }
  }
  const sum = sampled.reduce((acc, value) => acc + value, 0)
  if (sum <= 0) return Array(count).fill(total / count)
  return sampled.map((value) => total * (value / sum))
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
