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

function getLeadingOpticalOffsetEm(char: string): number {
  const punctuationOffset = LEADING_PUNCTUATION_OFFSETS_EM[char]
  if (typeof punctuationOffset === "number") return punctuationOffset

  // Apply a subtle hang for letters/digits so display words like "Swiss"
  // also benefit from optical edge alignment.
  if (/^[A-ZÄÖÜ]$/.test(char)) return 0.055
  if (/^[a-zäöüß]$/.test(char)) return 0.03
  if (/^\d$/.test(char)) return 0.024
  return 0
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
    const emOffset = getLeadingOpticalOffsetEm(first)
    if (!emOffset) return 0
    const desired = emOffset * fontSize
    const glyphWidth = measureWidth(first)
    return -clampHangingOffset(desired, glyphWidth)
  }

  // Keep right-aligned punctuation inside the column edge.
  void last
  return 0
}
