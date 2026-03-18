export type SidebarPanel = "settings" | "help" | "imprint" | "example" | "text-editor" | null
export type NonEditorSidebarPanel = Exclude<SidebarPanel, "text-editor">
export type InlineEditorTextAlign = "left" | "right"

export type InlineEditorRect = {
  x: number
  y: number
  width: number
  height: number
}

export type InlineEditorCommand = {
  text: string
  x: number
  y: number
}

export type InlineEditorTextBoxInput = {
  rect: InlineEditorRect
  textAlign: InlineEditorTextAlign
  commands: InlineEditorCommand[]
  measureText: (text: string) => number
}

export type InlineEditorTextBox = {
  left: number
  width: number
}

export type InlineEditorLineMatch = InlineEditorCommand & {
  renderedText: string
  sourceStart: number
  sourceEnd: number
}

export type InlineEditorCaretInput = {
  text: string
  textAlign: InlineEditorTextAlign
  commands: InlineEditorCommand[]
  selectionStart: number
  textAscent: number
  textBoxTop: number
  lineHeight: number
  measureText: (text: string) => number
}

export type InlineEditorCaret = {
  x: number
  top: number
  height: number
}

export type InlineEditorLineLayout = InlineEditorLineMatch & {
  left: number
  top: number
  width: number
  height: number
}

export type InlineEditorSelectionRect = {
  left: number
  top: number
  width: number
  height: number
}

export type InlineEditorLineLayoutInput = {
  text: string
  textAlign: InlineEditorTextAlign
  commands: InlineEditorCommand[]
  textAscent: number
  lineHeight: number
  measureText: (text: string) => number
}

export type InlineEditorSelectionRectInput = InlineEditorLineLayoutInput & {
  selectionStart: number
  selectionEnd: number
}

export type InlineEditorHitTestInput = InlineEditorLineLayoutInput & {
  x: number
  y: number
}

export type InlineEditorTransformInput = {
  pageWidth: number
  pageHeight: number
  pageRotation: number
  blockRotation: number
  rectX: number
  rectY: number
  rotationOriginX: number
  rotationOriginY: number
}

export type InlineEditorTransformOutput = {
  pageTransform: string
  pageTransformOrigin: string
  blockTransform: string
  blockTransformOrigin: string
}

export function buildInlineEditorTransform(input: InlineEditorTransformInput): InlineEditorTransformOutput {
  const pageCenterX = input.pageWidth / 2
  const pageCenterY = input.pageHeight / 2
  const relativeOriginX = input.rotationOriginX - input.rectX
  const relativeOriginY = input.rotationOriginY - input.rectY
  return {
    pageTransform: `rotate(${input.pageRotation}deg)`,
    pageTransformOrigin: `${pageCenterX}px ${pageCenterY}px`,
    blockTransform: `rotate(${input.blockRotation}deg)`,
    blockTransformOrigin: `${relativeOriginX}px ${relativeOriginY}px`,
  }
}

function stripInvisibleTextArtifacts(text: string): string {
  return text.replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, "")
}

function normalizeVisibleText(text: string): string {
  return stripInvisibleTextArtifacts(text).replace(/\r\n?/g, "\n")
}

function normalizePrefixText(text: string): string {
  return normalizeVisibleText(text).replace(/[^\S\n]+/g, " ")
}

function clampSelectionIndex(text: string, index: number): number {
  return Math.max(0, Math.min(normalizeVisibleText(text).length, index))
}

function getLineStartX(
  line: Pick<InlineEditorLineMatch, "x" | "renderedText">,
  textAlign: InlineEditorTextAlign,
  measureText: (text: string) => number,
): number {
  if (textAlign === "right") {
    return line.x - measureText(line.renderedText)
  }
  return line.x
}

function measurePrefixWidthForIndex(
  text: string,
  line: InlineEditorLineMatch,
  sourceIndex: number,
  measureText: (text: string) => number,
): number {
  const clampedIndex = Math.max(line.sourceStart, Math.min(line.sourceEnd, sourceIndex))
  const sourcePrefix = text.slice(line.sourceStart, clampedIndex)
  const normalizedPrefix = normalizePrefixText(sourcePrefix)
  const renderedPrefix = clampedIndex >= line.sourceEnd && line.renderedText.endsWith("-")
    ? line.renderedText
    : normalizedPrefix
  return measureText(renderedPrefix)
}

export function computeInlineEditorTextBox({
  rect,
  textAlign,
  commands,
  measureText,
}: InlineEditorTextBoxInput): InlineEditorTextBox {
  let minX = rect.x
  let maxX = rect.x + rect.width

  for (const command of commands) {
    const renderedText = normalizeVisibleText(command.text)
    const renderedWidth = measureText(renderedText)
    const lineLeft = textAlign === "right"
      ? command.x - renderedWidth
      : command.x
    const lineRight = textAlign === "right"
      ? command.x
      : command.x + renderedWidth
    minX = Math.min(minX, lineLeft)
    maxX = Math.max(maxX, lineRight)
  }

  return {
    left: minX,
    width: Math.max(1, maxX - minX),
  }
}

export function resolveInlineEditorLineMatches(
  text: string,
  commands: InlineEditorCommand[],
): InlineEditorLineMatch[] {
  const normalizedText = normalizeVisibleText(text)
  let cursor = 0

  return commands.map((command) => {
    const renderedText = normalizeVisibleText(command.text)
    const candidates = renderedText.endsWith("-")
      ? [renderedText, renderedText.slice(0, -1)]
      : [renderedText]
    let sourceStart = cursor
    let sourceEnd = cursor

    for (const candidate of candidates) {
      if (!candidate) continue
      const matchAt = normalizedText.indexOf(candidate, cursor)
      if (matchAt >= cursor) {
        sourceStart = matchAt
        sourceEnd = matchAt + candidate.length
        cursor = sourceEnd
        break
      }
    }

    if (sourceEnd === sourceStart) {
      sourceEnd = Math.min(normalizedText.length, sourceStart + renderedText.length)
      cursor = sourceEnd
    }

    return {
      ...command,
      renderedText,
      sourceStart,
      sourceEnd,
    }
  })
}

export function buildInlineEditorLineLayouts({
  text,
  textAlign,
  commands,
  textAscent,
  lineHeight,
  measureText,
}: InlineEditorLineLayoutInput): InlineEditorLineLayout[] {
  return resolveInlineEditorLineMatches(text, commands).map((line) => {
    const left = getLineStartX(line, textAlign, measureText)
    return {
      ...line,
      left,
      top: line.y - textAscent,
      width: measureText(line.renderedText),
      height: lineHeight,
    }
  })
}

export function computeInlineEditorCaret({
  text,
  textAlign,
  commands,
  selectionStart,
  textAscent,
  textBoxTop,
  lineHeight,
  measureText,
}: InlineEditorCaretInput): InlineEditorCaret | null {
  if (!commands.length) return null

  const lines = resolveInlineEditorLineMatches(text, commands)
  const clampedSelection = clampSelectionIndex(text, selectionStart)
  let activeLine = lines[lines.length - 1]

  for (const line of lines) {
    if (clampedSelection < line.sourceStart) {
      break
    }
    activeLine = line
    if (clampedSelection <= line.sourceEnd) {
      break
    }
  }

  const caretX = getLineStartX(activeLine, textAlign, measureText)
    + measurePrefixWidthForIndex(text, activeLine, clampedSelection, measureText)
  const lineTop = activeLine.y - textAscent

  return {
    x: caretX,
    top: lineTop - textBoxTop,
    height: lineHeight,
  }
}

export function computeInlineEditorSelectionRects({
  text,
  textAlign,
  commands,
  selectionStart,
  selectionEnd,
  textAscent,
  lineHeight,
  measureText,
}: InlineEditorSelectionRectInput): InlineEditorSelectionRect[] {
  if (!commands.length) return []

  const start = clampSelectionIndex(text, Math.min(selectionStart, selectionEnd))
  const end = clampSelectionIndex(text, Math.max(selectionStart, selectionEnd))
  if (start === end) return []

  const lines = buildInlineEditorLineLayouts({
    text,
    textAlign,
    commands,
    textAscent,
    lineHeight,
    measureText,
  })
  const rects: InlineEditorSelectionRect[] = []

  for (const line of lines) {
    const lineStart = Math.max(line.sourceStart, start)
    const lineEnd = Math.min(line.sourceEnd, end)
    if (lineStart > lineEnd) continue
    if (lineStart === lineEnd && !(lineEnd === line.sourceEnd && end > line.sourceEnd)) continue

    const left = line.left + measurePrefixWidthForIndex(text, line, lineStart, measureText)
    const right = line.left + measurePrefixWidthForIndex(
      text,
      line,
      lineEnd === line.sourceEnd && end > line.sourceStart ? line.sourceEnd : lineEnd,
      measureText,
    )
    if (right <= left) continue
    rects.push({
      left,
      top: line.top,
      width: right - left,
      height: line.height,
    })
  }

  return rects
}

export function hitTestInlineEditorIndex({
  text,
  textAlign,
  commands,
  x,
  y,
  textAscent,
  lineHeight,
  measureText,
}: InlineEditorHitTestInput): number {
  if (!commands.length) return clampSelectionIndex(text, 0)

  const lines = buildInlineEditorLineLayouts({
    text,
    textAlign,
    commands,
    textAscent,
    lineHeight,
    measureText,
  })

  let activeLine = lines[0]
  let bestScore = Number.POSITIVE_INFINITY
  for (const line of lines) {
    const verticalDistance = y < line.top
      ? line.top - y
      : y > line.top + line.height
        ? y - (line.top + line.height)
        : 0
    const horizontalDistance = x < line.left
      ? line.left - x
      : x > line.left + line.width
        ? x - (line.left + line.width)
        : 0
    const score = verticalDistance * 10000 + horizontalDistance
    if (score < bestScore) {
      bestScore = score
      activeLine = line
    }
  }

  let bestIndex = activeLine.sourceStart
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = activeLine.sourceStart; index <= activeLine.sourceEnd; index += 1) {
    const caretX = activeLine.left + measurePrefixWidthForIndex(text, activeLine, index, measureText)
    const distance = Math.abs(x - caretX)
    if (distance <= bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  }

  return bestIndex
}

export function computeSidebarWithEditorSession(
  activePanel: SidebarPanel,
  previousPanelBeforeEditor: NonEditorSidebarPanel,
  hasEditorSession: boolean,
): { nextPanel: SidebarPanel; nextPreviousPanelBeforeEditor: NonEditorSidebarPanel } {
  if (hasEditorSession) {
    if (activePanel === "text-editor") {
      return { nextPanel: activePanel, nextPreviousPanelBeforeEditor: previousPanelBeforeEditor }
    }
    return {
      nextPanel: "text-editor",
      nextPreviousPanelBeforeEditor: activePanel,
    }
  }
  if (activePanel !== "text-editor") {
    return { nextPanel: activePanel, nextPreviousPanelBeforeEditor: previousPanelBeforeEditor }
  }
  return {
    nextPanel: previousPanelBeforeEditor,
    nextPreviousPanelBeforeEditor: previousPanelBeforeEditor,
  }
}
