import { hyphenateWordEnglish } from "./english-hyphenation"

export type MeasureWidth = (text: string) => number

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

    for (const word of words) {
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
