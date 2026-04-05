import { hyphenateWordEnglish } from "./english-hyphenation.ts"
import type { TextRange } from "./text-tracking-runs.ts"
export { getDefaultColumnSpan } from "./default-column-span.ts"

export type MeasureWidth = (text: string, range?: TextRange) => number

export type WrappedTextLine = {
  text: string
  sourceStart: number
  sourceEnd: number
}

const MIN_INLINE_HYPHEN_PREFIX_CHARS = 3
const MIN_INLINE_HYPHEN_SUFFIX_CHARS = 2

type WordToken = {
  text: string
  start: number
  end: number
}

type InlineSplitResult = {
  leadingWithHyphen: string
  leadingEnd: number
  remainder: WordToken
}

function joinTokens(tokens: readonly WordToken[]): string {
  return tokens.map((token) => token.text).join(" ")
}

function measureTokens(tokens: readonly WordToken[], measureWidth: MeasureWidth): number {
  if (!tokens.length) return 0
  return measureWidth(joinTokens(tokens), {
    start: tokens[0]?.start ?? 0,
    end: tokens[tokens.length - 1]?.end ?? tokens[0]?.start ?? 0,
  })
}

function hyphenateTokenToLines(
  token: WordToken,
  maxWidth: number,
  measureWidth: MeasureWidth,
): WrappedTextLine[] {
  const parts = hyphenateWordEnglish(
    token.text,
    maxWidth,
    (sample) => measureWidth(sample, {
      start: token.start,
      end: token.start + sample.replace(/-$/, "").length,
    }),
  )

  let cursor = token.start
  return parts.map((part) => {
    const sourceLength = part.replace(/-$/, "").length
    const line = {
      text: part,
      sourceStart: cursor,
      sourceEnd: cursor + sourceLength,
    }
    cursor += sourceLength
    return line
  })
}

function trySplitWordAtLineEnd(
  word: WordToken,
  currentTokens: readonly WordToken[],
  maxWidth: number,
  measureWidth: MeasureWidth,
): InlineSplitResult | null {
  const linePrefixText = currentTokens.length ? `${joinTokens(currentTokens)} ` : ""
  const linePrefixStart = currentTokens[0]?.start ?? word.start
  const linePrefixEnd = currentTokens.length ? (currentTokens[currentTokens.length - 1]?.end ?? word.start) : word.start
  const remainingWidth = maxWidth - (currentTokens.length
    ? measureWidth(linePrefixText, { start: linePrefixStart, end: linePrefixEnd })
    : 0)
  if (remainingWidth <= 0) return null

  const toSplitResult = (leading: string): InlineSplitResult | null => {
    const remainder = word.text.slice(leading.length)
    if (leading.length < MIN_INLINE_HYPHEN_PREFIX_CHARS) return null
    if (remainder.length < MIN_INLINE_HYPHEN_SUFFIX_CHARS) return null
    const leadingWithHyphen = `${leading}-`
    const candidateText = `${linePrefixText}${leadingWithHyphen}`
    const candidateEnd = word.start + leading.length
    if (measureWidth(candidateText, { start: linePrefixStart, end: candidateEnd }) > maxWidth) return null
    return {
      leadingWithHyphen,
      leadingEnd: candidateEnd,
      remainder: {
        text: remainder,
        start: candidateEnd,
        end: word.end,
      },
    }
  }

  const parts = hyphenateWordEnglish(
    word.text,
    remainingWidth,
    (sample) => measureWidth(sample, {
      start: word.start,
      end: word.start + sample.replace(/-$/, "").length,
    }),
  )
  const first = parts[0]
  if (first && first.endsWith("-")) {
    const splitResult = toSplitResult(first.slice(0, -1))
    if (splitResult) return splitResult
  }

  for (
    let splitAt = word.text.length - MIN_INLINE_HYPHEN_SUFFIX_CHARS;
    splitAt >= MIN_INLINE_HYPHEN_PREFIX_CHARS;
    splitAt -= 1
  ) {
    const splitResult = toSplitResult(word.text.slice(0, splitAt))
    if (splitResult) return splitResult
  }

  return null
}

function toWordTokens(text: string, offset: number): WordToken[] {
  const matches = text.matchAll(/\S+/g)
  const tokens: WordToken[] = []
  for (const match of matches) {
    const value = match[0]
    const index = match.index ?? 0
    tokens.push({
      text: value,
      start: offset + index,
      end: offset + index + value.length,
    })
  }
  return tokens
}

function wrapSingleLineDetailed(
  input: string,
  sourceOffset: number,
  maxWidth: number,
  hyphenate: boolean,
  measureWidth: MeasureWidth,
): WrappedTextLine[] {
  const words = toWordTokens(input, sourceOffset)
  if (!words.length) {
    return [{
      text: "",
      sourceStart: sourceOffset,
      sourceEnd: sourceOffset,
    }]
  }

  const lines: WrappedTextLine[] = []
  let currentTokens: WordToken[] = []

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]
    const testTokens = currentTokens.concat(word)
    if (measureTokens(testTokens, measureWidth) <= maxWidth || currentTokens.length === 0) {
      if (
        currentTokens.length === 0
        && hyphenate
        && measureWidth(word.text, { start: word.start, end: word.end }) > maxWidth
      ) {
        const hyphenated = hyphenateTokenToLines(word, maxWidth, measureWidth)
        if (hyphenated.length > 1) {
          lines.push(...hyphenated.slice(0, -1))
          const trailing = hyphenated[hyphenated.length - 1]
          if (trailing) {
            currentTokens = [{
              text: trailing.text,
              start: trailing.sourceStart,
              end: trailing.sourceEnd,
            }]
          }
        } else {
          currentTokens = [word]
        }
      } else {
        currentTokens = testTokens
      }
      continue
    }

    if (hyphenate && currentTokens.length > 0) {
      const split = trySplitWordAtLineEnd(word, currentTokens, maxWidth, measureWidth)
      if (split) {
        lines.push({
          text: `${joinTokens(currentTokens)} ${split.leadingWithHyphen}`,
          sourceStart: currentTokens[0]?.start ?? word.start,
          sourceEnd: split.leadingEnd,
        })
        currentTokens = []
        words.splice(index + 1, 0, split.remainder)
        continue
      }
    }

    if (currentTokens.length > 0) {
      lines.push({
        text: joinTokens(currentTokens),
        sourceStart: currentTokens[0]?.start ?? sourceOffset,
        sourceEnd: currentTokens[currentTokens.length - 1]?.end ?? sourceOffset,
      })
    }

    if (hyphenate && measureWidth(word.text, { start: word.start, end: word.end }) > maxWidth) {
      const hyphenated = hyphenateTokenToLines(word, maxWidth, measureWidth)
      if (hyphenated.length > 1) {
        lines.push(...hyphenated.slice(0, -1))
        const trailing = hyphenated[hyphenated.length - 1]
        currentTokens = trailing
          ? [{
            text: trailing.text,
            start: trailing.sourceStart,
            end: trailing.sourceEnd,
          }]
          : []
      } else {
        currentTokens = [word]
      }
    } else {
      currentTokens = [word]
    }
  }

  if (currentTokens.length > 0) {
    lines.push({
      text: joinTokens(currentTokens),
      sourceStart: currentTokens[0]?.start ?? sourceOffset,
      sourceEnd: currentTokens[currentTokens.length - 1]?.end ?? sourceOffset,
    })
  }

  return lines
}

export function wrapTextDetailed(
  text: string,
  maxWidth: number,
  hyphenate: boolean,
  measureWidth: MeasureWidth,
): WrappedTextLine[] {
  const hardBreakLines = text.replace(/\r\n/g, "\n").split("\n")
  const wrapped: WrappedTextLine[] = []
  let lineOffset = 0

  for (const line of hardBreakLines) {
    wrapped.push(...wrapSingleLineDetailed(line, lineOffset, maxWidth, hyphenate, measureWidth))
    lineOffset += line.length + 1
  }

  return wrapped
}

export function wrapText(
  text: string,
  maxWidth: number,
  hyphenate: boolean,
  measureWidth: MeasureWidth,
): string[] {
  return wrapTextDetailed(text, maxWidth, hyphenate, measureWidth).map((line) => line.text)
}
