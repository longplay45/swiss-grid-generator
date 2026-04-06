import type { TextDrawCommand } from "./typography-layout-plan.ts"

export type ResolvedTextDrawCommandRange = {
  sourceStart: number
  sourceEnd: number
  leadingBoundaryWhitespace: number
  trailingBoundaryWhitespace: number
  renderedText: string
  visibleRange: {
    start: number
    end: number
  }
}

export function getRenderedTextDrawCommandText(command: TextDrawCommand): string {
  const trimStart = Math.max(0, Math.min(command.leadingBoundaryWhitespace ?? 0, command.text.length))
  const trimEnd = Math.max(0, Math.min(command.trailingBoundaryWhitespace ?? 0, command.text.length - trimStart))
  return command.text.slice(trimStart, Math.max(trimStart, command.text.length - trimEnd))
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
  const trailingBoundaryWhitespace = Math.max(
    0,
    Math.min(
      command.trailingBoundaryWhitespace ?? 0,
      sourceEnd - sourceStart - leadingBoundaryWhitespace,
      command.text.length - leadingBoundaryWhitespace,
    ),
  )
  const visibleStart = Math.min(sourceEnd, sourceStart + leadingBoundaryWhitespace)
  const visibleEnd = Math.max(visibleStart, sourceEnd - trailingBoundaryWhitespace)

  return {
    sourceStart,
    sourceEnd,
    leadingBoundaryWhitespace,
    trailingBoundaryWhitespace,
    renderedText: getRenderedTextDrawCommandText({
      ...command,
      leadingBoundaryWhitespace,
      trailingBoundaryWhitespace,
    }),
    visibleRange: {
      start: visibleStart,
      end: visibleEnd,
    },
  }
}
