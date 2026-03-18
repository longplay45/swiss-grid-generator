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
  const clampedSelection = Math.max(0, Math.min(normalizeVisibleText(text).length, selectionStart))
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

  const lineSelection = Math.max(activeLine.sourceStart, Math.min(activeLine.sourceEnd, clampedSelection))
  const sourcePrefix = text.slice(activeLine.sourceStart, lineSelection)
  const normalizedPrefix = normalizePrefixText(sourcePrefix)
  const renderedLine = activeLine.renderedText
  const lineWidth = measureText(renderedLine)
  const lineStartX = textAlign === "right"
    ? activeLine.x - lineWidth
    : activeLine.x
  const prefixForMeasurement = clampedSelection >= activeLine.sourceEnd && renderedLine.endsWith("-")
    ? renderedLine
    : normalizedPrefix
  const caretX = lineStartX + measureText(prefixForMeasurement)
  const lineTop = activeLine.y - textAscent

  return {
    x: caretX,
    top: lineTop - textBoxTop,
    height: lineHeight,
  }
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
