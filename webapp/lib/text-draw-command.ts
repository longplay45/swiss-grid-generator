import type { TextDrawCommand } from "./typography-layout-plan.ts"

export type ResolvedTextDrawCommandRange = {
  sourceStart: number
  sourceEnd: number
  leadingBoundaryWhitespace: number
  renderedText: string
  visibleRange: {
    start: number
    end: number
  }
}

export function getRenderedTextDrawCommandText(command: TextDrawCommand): string {
  const trim = Math.max(0, Math.min(command.leadingBoundaryWhitespace ?? 0, command.text.length))
  return trim > 0 ? command.text.slice(trim) : command.text
}

export function resolveTextDrawCommandRange(
  command: TextDrawCommand,
  sourceTextLength: number,
): ResolvedTextDrawCommandRange {
  const maxLength = Math.max(0, sourceTextLength)
  const rawStart = typeof command.sourceStart === "number" ? command.sourceStart : 0
  const sourceStart = Math.max(0, Math.min(maxLength, rawStart))
  const rawEnd = typeof command.sourceEnd === "number" ? command.sourceEnd : maxLength
  const sourceEnd = Math.max(sourceStart, Math.min(maxLength, rawEnd))
  const leadingBoundaryWhitespace = Math.max(
    0,
    Math.min(
      command.leadingBoundaryWhitespace ?? 0,
      sourceEnd - sourceStart,
      command.text.length,
    ),
  )

  return {
    sourceStart,
    sourceEnd,
    leadingBoundaryWhitespace,
    renderedText: getRenderedTextDrawCommandText({
      ...command,
      leadingBoundaryWhitespace,
    }),
    visibleRange: {
      start: Math.min(sourceEnd, sourceStart + leadingBoundaryWhitespace),
      end: sourceEnd,
    },
  }
}
