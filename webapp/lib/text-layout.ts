import { hyphenateWordEnglish } from "./english-hyphenation.ts"

export type MeasureWidth = (text: string) => number
const MIN_INLINE_HYPHEN_PREFIX_CHARS = 5
const MIN_INLINE_HYPHEN_SUFFIX_CHARS = 3

type InlineSplitResult = {
  leadingWithHyphen: string
  remainder: string
}

function trySplitWordAtLineEnd(
  word: string,
  currentLine: string,
  maxWidth: number,
  measureWidth: MeasureWidth,
): InlineSplitResult | null {
  const linePrefix = currentLine ? `${currentLine} ` : ""
  const remainingWidth = maxWidth - measureWidth(linePrefix)
  if (remainingWidth <= 0) return null

  const toSplitResult = (leading: string): InlineSplitResult | null => {
    const remainder = word.slice(leading.length)
    if (leading.length < MIN_INLINE_HYPHEN_PREFIX_CHARS) return null
    if (remainder.length < MIN_INLINE_HYPHEN_SUFFIX_CHARS) return null
    const leadingWithHyphen = `${leading}-`
    const candidate = `${linePrefix}${leadingWithHyphen}`
    if (measureWidth(candidate) > maxWidth) return null
    return { leadingWithHyphen, remainder }
  }

  const parts = hyphenateWordEnglish(word, remainingWidth, measureWidth)
  const first = parts[0]
  if (first && first.endsWith("-")) {
    const leading = first.slice(0, -1)
    const splitResult = toSplitResult(leading)
    if (splitResult) return splitResult
  }

  for (
    let splitAt = word.length - MIN_INLINE_HYPHEN_SUFFIX_CHARS;
    splitAt >= MIN_INLINE_HYPHEN_PREFIX_CHARS;
    splitAt -= 1
  ) {
    const leading = word.slice(0, splitAt)
    const splitResult = toSplitResult(leading)
    if (splitResult) return splitResult
  }

  return null
}

/**
 * Word-wrap text into lines that fit within `maxWidth`, respecting hard
 * line breaks (\n). Optionally applies English syllable hyphenation for
 * words that exceed the available width.
 *
 * This is the single canonical implementation used by canvas preview,
 * PDF vector export, and the autofit planner.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  hyphenate: boolean,
  measureWidth: MeasureWidth,
): string[] {
  const wrapSingleLine = (input: string): string[] => {
    const words = input.split(/\s+/).filter(Boolean)
    if (!words.length) return [""]

    const lines: string[] = []
    let current = ""

    for (let i = 0; i < words.length; i += 1) {
      const word = words[i]
      const testLine = current ? `${current} ${word}` : word
      if (measureWidth(testLine) <= maxWidth || current.length === 0) {
        if (measureWidth(word) > maxWidth && hyphenate) {
          if (current) {
            lines.push(current)
            current = ""
          }
          const parts = hyphenateWordEnglish(word, maxWidth, measureWidth)
          for (let i = 0; i < parts.length; i += 1) {
            if (i === parts.length - 1) current = parts[i]
            else lines.push(parts[i])
          }
        } else {
          current = testLine
        }
      } else {
        if (hyphenate && current) {
          const split = trySplitWordAtLineEnd(word, current, maxWidth, measureWidth)
          if (split) {
            lines.push(`${current} ${split.leadingWithHyphen}`)
            current = ""
            words.splice(i + 1, 0, split.remainder)
            continue
          }
        }

        lines.push(current)
        if (measureWidth(word) > maxWidth && hyphenate) {
          const parts = hyphenateWordEnglish(word, maxWidth, measureWidth)
          for (let i = 0; i < parts.length; i += 1) {
            if (i === parts.length - 1) current = parts[i]
            else lines.push(parts[i])
          }
        } else {
          current = word
        }
      }
    }

    if (current) lines.push(current)
    return lines
  }

  const hardBreakLines = text.replace(/\r\n/g, "\n").split("\n")
  const wrapped: string[] = []
  for (const line of hardBreakLines) wrapped.push(...wrapSingleLine(line))
  return wrapped
}

/**
 * Returns the default column span for a text block based on its style key
 * and the total number of grid columns.
 *
 * Canonical implementation shared by canvas preview, PDF export, and
 * reflow planner.
 */
export function getDefaultColumnSpan(key: string, gridCols: number): number {
  if (gridCols <= 1) return 1
  if (key === "display") return gridCols
  if (key === "headline") return gridCols >= 3 ? Math.min(gridCols, Math.floor(gridCols / 2) + 1) : gridCols
  if (key === "caption") return 1
  return Math.max(1, Math.floor(gridCols / 2))
}
