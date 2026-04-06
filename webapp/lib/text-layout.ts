import { hyphenateWordEnglish } from "./english-hyphenation.ts"
import { splitTextForTracking } from "./text-rendering.ts"
import type { TextRange } from "./text-tracking-runs.ts"
export { getDefaultColumnSpan } from "./default-column-span.ts"

export type MeasureWidth = (text: string, range?: TextRange) => number

export type WrappedTextLine = {
  text: string
  sourceStart: number
  sourceEnd: number
  leadingBoundaryWhitespace?: number
  trailingBoundaryWhitespace?: number
}

const MIN_INLINE_HYPHEN_PREFIX_CHARS = 3
const MIN_INLINE_HYPHEN_SUFFIX_CHARS = 2

type LineToken = {
  text: string
  start: number
  end: number
  isWhitespace: boolean
  suppressedAtLineStart?: boolean
}

const SPLITTABLE_PUNCTUATION = new Set([
  ",",
  ".",
  ";",
  ":",
  "!",
  "?",
  "%",
  ")",
  "]",
  "}",
  "»",
  "›",
  "”",
  "’",
])

type InlineSplitResult = {
  leadingWithHyphen: string
  leadingEnd: number
  remainder: LineToken
}

function joinTokens(tokens: readonly LineToken[]): string {
  return tokens.map((token) => token.text).join("")
}

function getLeadingBoundaryWhitespace(tokens: readonly LineToken[]): number {
  let count = 0
  for (const token of tokens) {
    if (!token.isWhitespace || token.suppressedAtLineStart !== true) break
    count += token.text.length
  }
  return count
}

function getTrailingBoundaryWhitespace(tokens: readonly LineToken[]): number {
  let count = 0
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index]
    if (!token?.isWhitespace) break
    count += token.text.length
  }
  return count
}

function getRenderedLineText(tokens: readonly LineToken[]): string {
  const fullText = joinTokens(tokens)
  const trimStart = getLeadingBoundaryWhitespace(tokens)
  const trimEnd = getTrailingBoundaryWhitespace(tokens)
  return fullText.slice(trimStart, Math.max(trimStart, fullText.length - trimEnd))
}

function shouldEmitWrappedLine(tokens: readonly LineToken[]): boolean {
  return tokens.some((token) => !token.isWhitespace || token.suppressedAtLineStart !== true)
}

function measureTokens(tokens: readonly LineToken[], measureWidth: MeasureWidth): number {
  if (!tokens.length) return 0
  const renderedText = getRenderedLineText(tokens)
  if (!renderedText) return 0
  const trimStart = getLeadingBoundaryWhitespace(tokens)
  const trimEnd = getTrailingBoundaryWhitespace(tokens)
  const rangeStart = (tokens[0]?.start ?? 0) + trimStart
  const rangeEnd = Math.max(rangeStart, (tokens[tokens.length - 1]?.end ?? tokens[0]?.start ?? 0) - trimEnd)
  return measureWidth(renderedText, {
    start: rangeStart,
    end: rangeEnd,
  })
}

function hyphenateTokenToLines(
  token: LineToken,
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
  word: LineToken,
  currentTokens: readonly LineToken[],
  maxWidth: number,
  measureWidth: MeasureWidth,
): InlineSplitResult | null {
  const linePrefixText = currentTokens.length ? joinTokens(currentTokens) : ""
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
        isWhitespace: false,
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

function toLineTokens(text: string, offset: number): LineToken[] {
  const matches = text.matchAll(/\s+|\S+/g)
  const tokens: LineToken[] = []
  for (const match of matches) {
    const value = match[0]
    const index = match.index ?? 0
    const start = offset + index
    if (/^\s+$/.test(value)) {
      tokens.push({
        text: value,
        start,
        end: start + value.length,
        isWhitespace: true,
      })
      continue
    }

    let cursor = start
    let bufferedText = ""
    let bufferedStart = start
    for (const grapheme of splitTextForTracking(value)) {
      const graphemeStart = cursor
      const graphemeEnd = graphemeStart + grapheme.length
      cursor = graphemeEnd
      if (SPLITTABLE_PUNCTUATION.has(grapheme)) {
        if (bufferedText) {
          tokens.push({
            text: bufferedText,
            start: bufferedStart,
            end: graphemeStart,
            isWhitespace: false,
          })
          bufferedText = ""
        }
        tokens.push({
          text: grapheme,
          start: graphemeStart,
          end: graphemeEnd,
          isWhitespace: false,
        })
        bufferedStart = graphemeEnd
        continue
      }

      if (!bufferedText) bufferedStart = graphemeStart
      bufferedText += grapheme
    }

    if (bufferedText) {
      tokens.push({
        text: bufferedText,
        start: bufferedStart,
        end: start + value.length,
        isWhitespace: false,
      })
    }
  }
  return tokens
}

function isLineStartForbiddenPunctuationToken(token: LineToken | undefined): boolean {
  return Boolean(token && !token.isWhitespace && SPLITTABLE_PUNCTUATION.has(token.text))
}

function suppressLeadingWhitespace(tokens: readonly LineToken[]): LineToken[] {
  let seenVisible = false
  return tokens.map((token) => {
    if (seenVisible) return token
    if (token.isWhitespace) {
      return { ...token, suppressedAtLineStart: true }
    }
    seenVisible = true
    return token
  })
}

function tryRebalanceForLeadingPunctuation(
  currentTokens: readonly LineToken[],
  token: LineToken,
  maxWidth: number,
  measureWidth: MeasureWidth,
): { lineTokens: LineToken[]; carryTokens: LineToken[] } | null {
  if (!isLineStartForbiddenPunctuationToken(token) || currentTokens.length === 0) return null

  for (let splitIndex = currentTokens.length; splitIndex > 0; splitIndex -= 1) {
    const lineTokens = currentTokens.slice(0, splitIndex)
    if (!shouldEmitWrappedLine(lineTokens)) continue
    const carryTokens = suppressLeadingWhitespace(currentTokens.slice(splitIndex).concat(token))
    const firstVisible = carryTokens.find((candidate) => !candidate.isWhitespace || candidate.suppressedAtLineStart !== true)
    if (isLineStartForbiddenPunctuationToken(firstVisible)) continue
    if (measureTokens(carryTokens, measureWidth) <= maxWidth) {
      return {
        lineTokens,
        carryTokens,
      }
    }
  }

  return null
}

function splitOversizeWhitespaceToken(
  token: LineToken,
  maxWidth: number,
  measureWidth: MeasureWidth,
): WrappedTextLine[] {
  const graphemes = splitTextForTracking(token.text)
  const lines: WrappedTextLine[] = []
  let cursor = token.start
  let currentText = ""
  let currentStart = token.start

  for (const grapheme of graphemes) {
    const graphemeStart = cursor
    const graphemeEnd = graphemeStart + grapheme.length
    const nextText = `${currentText}${grapheme}`
    if (
      currentText
      && measureWidth(nextText, { start: currentStart, end: graphemeEnd }) > maxWidth
    ) {
      lines.push({
        text: currentText,
        sourceStart: currentStart,
        sourceEnd: graphemeStart,
      })
      currentText = grapheme
      currentStart = graphemeStart
    } else {
      currentText = nextText
    }
    cursor = graphemeEnd
  }

  if (currentText || lines.length === 0) {
    lines.push({
      text: currentText,
      sourceStart: currentStart,
      sourceEnd: cursor,
    })
  }

  return lines
}

function toWrappedLine(
  tokens: readonly LineToken[],
  fallbackOffset: number,
): WrappedTextLine {
  const text = joinTokens(tokens)
  const leadingBoundaryWhitespace = getLeadingBoundaryWhitespace(tokens)
  const trailingBoundaryWhitespace = getTrailingBoundaryWhitespace(tokens)
  return {
    text,
    sourceStart: tokens[0]?.start ?? fallbackOffset,
    sourceEnd: tokens[tokens.length - 1]?.end ?? fallbackOffset,
    ...(leadingBoundaryWhitespace > 0 ? { leadingBoundaryWhitespace } : {}),
    ...(trailingBoundaryWhitespace > 0 ? { trailingBoundaryWhitespace } : {}),
  }
}

function wrapSingleLineDetailed(
  input: string,
  sourceOffset: number,
  maxWidth: number,
  hyphenate: boolean,
  measureWidth: MeasureWidth,
): WrappedTextLine[] {
  const tokens = toLineTokens(input, sourceOffset)
  if (!tokens.length) {
    return [{
      text: "",
      sourceStart: sourceOffset,
      sourceEnd: sourceOffset,
    }]
  }

  const lines: WrappedTextLine[] = []
  let currentTokens: LineToken[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!
    const testTokens = currentTokens.concat(token)
    if (measureTokens(testTokens, measureWidth) <= maxWidth || currentTokens.length === 0) {
      if (
        currentTokens.length === 0
        && token.isWhitespace
        && measureWidth(token.text, { start: token.start, end: token.end }) > maxWidth
      ) {
        const splitLines = splitOversizeWhitespaceToken(token, maxWidth, measureWidth)
        if (splitLines.length > 1) {
          lines.push(...splitLines.slice(0, -1))
          const trailing = splitLines[splitLines.length - 1]
          currentTokens = trailing
            ? [{
              text: trailing.text,
              start: trailing.sourceStart,
              end: trailing.sourceEnd,
              isWhitespace: true,
              suppressedAtLineStart: true,
            }]
            : []
        } else {
          currentTokens = [{ ...token, suppressedAtLineStart: true }]
        }
      } else if (
        currentTokens.length === 0
        && hyphenate
        && !token.isWhitespace
        && measureWidth(token.text, { start: token.start, end: token.end }) > maxWidth
      ) {
        const hyphenated = hyphenateTokenToLines(token, maxWidth, measureWidth)
        if (hyphenated.length > 1) {
          lines.push(...hyphenated.slice(0, -1))
          const trailing = hyphenated[hyphenated.length - 1]
          if (trailing) {
            currentTokens = [{
              text: trailing.text,
              start: trailing.sourceStart,
              end: trailing.sourceEnd,
              isWhitespace: false,
            }]
          }
        } else {
          currentTokens = [token]
        }
      } else {
        currentTokens = testTokens
      }
      continue
    }

    if (!token.isWhitespace && hyphenate && currentTokens.length > 0) {
      const split = trySplitWordAtLineEnd(token, currentTokens, maxWidth, measureWidth)
      if (split) {
        lines.push({
          text: `${joinTokens(currentTokens)}${split.leadingWithHyphen}`,
          sourceStart: currentTokens[0]?.start ?? token.start,
          sourceEnd: split.leadingEnd,
        })
        currentTokens = []
        tokens.splice(index + 1, 0, split.remainder)
        continue
      }
    }

    const punctuationRebalance = tryRebalanceForLeadingPunctuation(currentTokens, token, maxWidth, measureWidth)
    if (punctuationRebalance) {
      lines.push(toWrappedLine(punctuationRebalance.lineTokens, sourceOffset))
      currentTokens = punctuationRebalance.carryTokens
      continue
    }

    if (currentTokens.length > 0) {
      if (shouldEmitWrappedLine(currentTokens)) {
        lines.push(toWrappedLine(currentTokens, sourceOffset))
      }
    }

    if (token.isWhitespace) {
      if (measureWidth(token.text, { start: token.start, end: token.end }) > maxWidth) {
        const splitLines = splitOversizeWhitespaceToken(token, maxWidth, measureWidth)
        if (splitLines.length > 1) {
          lines.push(...splitLines.slice(0, -1))
        }
        const trailing = splitLines[splitLines.length - 1]
        currentTokens = trailing
          ? [{
            text: trailing.text,
            start: trailing.sourceStart,
            end: trailing.sourceEnd,
            isWhitespace: true,
            suppressedAtLineStart: true,
          }]
          : []
      } else {
        currentTokens = [{ ...token, suppressedAtLineStart: true }]
      }
    } else if (hyphenate && measureWidth(token.text, { start: token.start, end: token.end }) > maxWidth) {
      const hyphenated = hyphenateTokenToLines(token, maxWidth, measureWidth)
      if (hyphenated.length > 1) {
        lines.push(...hyphenated.slice(0, -1))
        const trailing = hyphenated[hyphenated.length - 1]
        currentTokens = trailing
          ? [{
              text: trailing.text,
              start: trailing.sourceStart,
              end: trailing.sourceEnd,
              isWhitespace: false,
            }]
          : []
      } else {
        currentTokens = [token]
      }
    } else {
      currentTokens = [token]
    }
  }

  if (currentTokens.length > 0) {
    if (shouldEmitWrappedLine(currentTokens)) {
      lines.push(toWrappedLine(currentTokens, sourceOffset))
    }
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
  return wrapTextDetailed(text, maxWidth, hyphenate, measureWidth).map((line) => (
    line.text.slice(
      line.leadingBoundaryWhitespace ?? 0,
      Math.max(line.leadingBoundaryWhitespace ?? 0, line.text.length - (line.trailingBoundaryWhitespace ?? 0)),
    )
  ))
}
