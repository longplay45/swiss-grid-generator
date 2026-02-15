type TextAlignMode = "left" | "right"

type OpticalMarginOptions = {
  line: string
  align: TextAlignMode
  fontSize: number
  measureWidth: (text: string) => number
}

const LEADING_PUNCTUATION_OFFSETS_EM: Record<string, number> = {
  "\"": 0.36,
  "'": 0.3,
  "“": 0.5,
  "‘": 0.44,
  "«": 0.44,
  "‹": 0.38,
  "(": 0.32,
  "[": 0.28,
  "{": 0.24,
}

const TRAILING_PUNCTUATION_OFFSETS_EM: Record<string, number> = {
  ".": 0.38,
  ",": 0.38,
  ":": 0.34,
  ";": 0.34,
  "!": 0.34,
  "?": 0.34,
  "-": 0.28,
  "–": 0.24,
  "—": 0.2,
  "\"": 0.26,
  "'": 0.24,
  "”": 0.34,
  "’": 0.32,
  "»": 0.3,
  "›": 0.28,
  ")": 0.2,
  "]": 0.2,
  "}": 0.2,
}

function getEdgeCharacters(line: string): { first: string | null; last: string | null } {
  const trimmed = line.trim()
  if (!trimmed) {
    return { first: null, last: null }
  }
  const chars = Array.from(trimmed)
  return {
    first: chars[0] ?? null,
    last: chars[chars.length - 1] ?? null,
  }
}

function clampHangingOffset(desired: number, glyphWidth: number): number {
  if (desired <= 0 || glyphWidth <= 0) return 0
  return Math.min(desired, glyphWidth * 0.9)
}

export function getOpticalMarginAnchorOffset({
  line,
  align,
  fontSize,
  measureWidth,
}: OpticalMarginOptions): number {
  const { first, last } = getEdgeCharacters(line)
  if (!first || !last || fontSize <= 0) return 0

  // Left-aligned lines hang opening punctuation into the left margin.
  if (align === "left") {
    const emOffset = LEADING_PUNCTUATION_OFFSETS_EM[first]
    if (!emOffset) return 0
    const desired = emOffset * fontSize
    const glyphWidth = measureWidth(first)
    return -clampHangingOffset(desired, glyphWidth)
  }

  // Right-aligned lines hang terminal punctuation into the right margin.
  const emOffset = TRAILING_PUNCTUATION_OFFSETS_EM[last]
  if (!emOffset) return 0
  const desired = emOffset * fontSize
  const glyphWidth = measureWidth(last)
  return clampHangingOffset(desired, glyphWidth)
}

