export type TextAlignMode = "left" | "right"

export type BlockRect = {
  x: number
  y: number
  width: number
  height: number
}

export type TextDrawCommand = {
  text: string
  x: number
  y: number
}

type TypographyStyleDefinition = {
  size: number
  baselineMultiplier: number
}

export type TypographyLayoutPlan<BlockId extends string, StyleKey extends string> = {
  key: BlockId
  styleKey: StyleKey
  fontSize: number
  span: number
  rowSpan: number
  columnReflow: boolean
  rect: BlockRect
  textAlign: TextAlignMode
  blockRotation: number
  rotationOriginX: number
  rotationOriginY: number
  commands: TextDrawCommand[]
}

type BuildTypographyLayoutPlanArgs<BlockId extends string, StyleKey extends string, Context> = {
  blockOrder: BlockId[]
  textContent: Record<BlockId, string>
  styleAssignments: Record<BlockId, StyleKey>
  styles: Record<StyleKey, TypographyStyleDefinition>
  blockTextAlignments: Partial<Record<BlockId, TextAlignMode>>
  contentTop: number
  contentLeft: number
  pageHeight: number
  marginsBottom: number
  baselineStep: number
  moduleWidth: number
  moduleHeight: number
  gutterX: number
  gutterY: number
  gridRows: number
  gridCols: number
  fontScale: number
  bodyKey: BlockId
  displayKey: BlockId
  captionKey: BlockId
  defaultBodyStyleKey: StyleKey
  defaultCaptionStyleKey: StyleKey
  getBlockSpan: (key: BlockId) => number
  getBlockRows: (key: BlockId) => number
  getBlockFontSize?: (args: { key: BlockId; styleKey: StyleKey; defaultSize: number }) => number
  getBlockBaselineMultiplier?: (args: { key: BlockId; styleKey: StyleKey; defaultMultiplier: number }) => number
  getBlockRotation: (key: BlockId) => number
  isTextReflowEnabled: (key: BlockId) => boolean
  isSyllableDivisionEnabled: (key: BlockId) => boolean
  isBlockPositionManual?: (key: BlockId) => boolean
  getOriginForBlock: (key: BlockId, fallbackX: number, fallbackY: number) => { x: number; y: number }
  createTextContext: (args: { key: BlockId; styleKey: StyleKey; fontSize: number }) => Context
  wrapText: (args: {
    context: Context
    key: BlockId
    styleKey: StyleKey
    text: string
    maxWidth: number
    hyphenate: boolean
  }) => string[]
  textAscent: (args: { context: Context; key: BlockId; styleKey: StyleKey; fontSize: number }) => number
  opticalOffset: (args: {
    context: Context
    key: BlockId
    styleKey: StyleKey
    line: string
    align: TextAlignMode
    fontSize: number
  }) => number
}

export function buildTypographyLayoutPlan<BlockId extends string, StyleKey extends string, Context>({
  blockOrder,
  textContent,
  styleAssignments,
  styles,
  blockTextAlignments,
  contentTop,
  contentLeft,
  pageHeight,
  marginsBottom,
  baselineStep,
  moduleWidth,
  moduleHeight,
  gutterX,
  gutterY,
  gridRows,
  fontScale,
  bodyKey,
  displayKey,
  captionKey,
  defaultBodyStyleKey,
  defaultCaptionStyleKey,
  getBlockSpan,
  getBlockRows,
  getBlockFontSize,
  getBlockBaselineMultiplier,
  getBlockRotation,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isBlockPositionManual,
  getOriginForBlock,
  createTextContext,
  wrapText,
  textAscent,
  opticalOffset,
}: BuildTypographyLayoutPlanArgs<BlockId, StyleKey, Context>): {
  plans: TypographyLayoutPlan<BlockId, StyleKey>[]
  rects: Record<BlockId, BlockRect>
  overflowByBlock: Partial<Record<BlockId, number>>
} {
  const plans: TypographyLayoutPlan<BlockId, StyleKey>[] = []
  const overflowByBlock: Partial<Record<BlockId, number>> = {}
  const rects = {} as Record<BlockId, BlockRect>
  for (const key of blockOrder) {
    rects[key] = { x: 0, y: 0, width: 0, height: 0 }
  }

  const useRowPlacement = gridRows >= 2
  const useParagraphRows = gridRows >= 5
  const rowHeightBaselines = moduleHeight / baselineStep
  const gutterBaselines = gutterY / baselineStep
  const rowStepBaselines = rowHeightBaselines + gutterBaselines
  const row2TopBaselines = rowStepBaselines
  const row3TopBaselines = rowStepBaselines * 2

  const displayStartOffset = 1
  const restStartOffset = gridRows > 6 ? row3TopBaselines + 1 : row2TopBaselines + 1

  let currentBaselineOffset = useRowPlacement ? restStartOffset : displayStartOffset
  let currentRowIndex = 0

  const textBlocks = blockOrder.filter((key) => key !== captionKey)
  for (const key of textBlocks) {
    const blockText = textContent[key] ?? ""
    if (!blockText.trim()) continue

    const styleKey = styleAssignments[key] ?? defaultBodyStyleKey
    const style = styles[styleKey]
    if (!style) continue
    const defaultFontSize = style.size * fontScale
    const fontSize = getBlockFontSize?.({ key, styleKey, defaultSize: defaultFontSize }) ?? defaultFontSize
    const baselineMult = getBlockBaselineMultiplier?.({
      key,
      styleKey,
      defaultMultiplier: style.baselineMultiplier,
    }) ?? style.baselineMultiplier

    let blockStartOffset = currentBaselineOffset + (key === bodyKey ? 1 : 0)
    if (useParagraphRows) {
      blockStartOffset = currentRowIndex * rowStepBaselines + 1
    } else if (useRowPlacement && key === displayKey) {
      blockStartOffset = displayStartOffset
    }

    const context = createTextContext({ key, styleKey, fontSize })
    const span = getBlockSpan(key)
    const rowSpan = getBlockRows(key)
    const wrapWidth = span * moduleWidth + Math.max(span - 1, 0) * gutterX
    const reflowEnabled = isTextReflowEnabled(key) && span >= 2
    const columnReflow = reflowEnabled
    const hyphenate = isSyllableDivisionEnabled(key)
    const lines = wrapText({
      context,
      key,
      styleKey,
      text: blockText,
      maxWidth: columnReflow ? moduleWidth : wrapWidth,
      hyphenate,
    })

    const autoX = contentLeft
    const autoY = contentTop + (blockStartOffset - 1) * baselineStep
    const origin = getOriginForBlock(key, autoX, autoY)
    const textAlign = blockTextAlignments[key] ?? "left"
    const ascent = textAscent({ context, key, styleKey, fontSize })
    const hitTopPadding = Math.max(baselineStep, ascent)
    const lineStep = baselineMult * baselineStep
    const pageBottomY = (isBlockPositionManual?.(key) === true)
      ? Number.POSITIVE_INFINITY
      : pageHeight - marginsBottom
    const bottomLineLimit = pageBottomY + 0.0001
    const moduleHeightForBlock = rowSpan * moduleHeight + Math.max(rowSpan - 1, 0) * gutterY
    const maxLinesPerColumn = Math.max(1, Math.floor(moduleHeightForBlock / lineStep))
    let maxUsedRows = 0
    const commands: TextDrawCommand[] = []

    const rect: BlockRect = {
      x: origin.x,
      y: origin.y - hitTopPadding,
      width: wrapWidth,
      height: columnReflow
        ? moduleHeightForBlock + hitTopPadding
        : (Math.max(lines.length, 1) * baselineMult + 1) * baselineStep + hitTopPadding,
    }

    if (!columnReflow) {
      const anchorX = textAlign === "right" ? origin.x + wrapWidth : origin.x
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex]
        const lineTopY = origin.y + baselineStep + lineIndex * baselineMult * baselineStep
        const y = lineTopY + ascent
        if (lineTopY > bottomLineLimit) continue
        maxUsedRows = Math.max(maxUsedRows, lineIndex + 1)
        const offsetX = opticalOffset({ context, key, styleKey, line, align: textAlign, fontSize })
        commands.push({ text: line, x: anchorX + offsetX, y })
      }
    } else {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const columnIndex = Math.floor(lineIndex / maxLinesPerColumn)
        if (columnIndex >= span) break
        const rowIndex = lineIndex % maxLinesPerColumn
        const columnX = origin.x + columnIndex * (moduleWidth + gutterX)
        const anchorX = textAlign === "right" ? columnX + moduleWidth : columnX
        const line = lines[lineIndex]
        const lineTopY = origin.y + baselineStep + rowIndex * lineStep
        const y = lineTopY + ascent
        if (lineTopY > bottomLineLimit) continue
        maxUsedRows = Math.max(maxUsedRows, rowIndex + 1)
        const offsetX = opticalOffset({ context, key, styleKey, line, align: textAlign, fontSize })
        commands.push({ text: line, x: anchorX + offsetX, y })
      }
    }

    const overflowLines = reflowEnabled ? Math.max(0, lines.length - commands.length) : 0
    overflowByBlock[key] = overflowLines
    if (overflowLines > 0 && hyphenate && commands.length > 0) {
      const last = commands[commands.length - 1]
      if (last.text && !last.text.endsWith("-") && !last.text.endsWith("\u00AD")) {
        last.text = `${last.text}\u00AD`
      }
    }
    if (!columnReflow && maxUsedRows > 0) {
      rect.height = (maxUsedRows * baselineMult + 1) * baselineStep + hitTopPadding
    }
    rects[key] = rect
    plans.push({
      key,
      styleKey,
      fontSize,
      span,
      rowSpan,
      columnReflow,
      rect,
      textAlign,
      blockRotation: getBlockRotation(key),
      rotationOriginX: origin.x,
      rotationOriginY: origin.y,
      commands,
    })

    if (!useParagraphRows) {
      const usedLineRows = columnReflow
        ? (maxUsedRows || Math.min(lines.length, Math.max(1, maxLinesPerColumn)))
        : (maxUsedRows || lines.length)
      if (!useRowPlacement || key !== displayKey) {
        currentBaselineOffset = blockStartOffset + usedLineRows * baselineMult
      } else {
        currentBaselineOffset = restStartOffset
      }
    } else {
      const blockEnd = blockStartOffset + lines.length * baselineMult
      currentRowIndex = Math.ceil(blockEnd / rowStepBaselines)
    }
  }

  const hasCaptionBlock = blockOrder.includes(captionKey)
  const captionText = textContent[captionKey] ?? ""
  const captionStyleKey = styleAssignments[captionKey] ?? defaultCaptionStyleKey
  const captionStyle = styles[captionStyleKey]
  if (!hasCaptionBlock || !captionStyle || !captionText.trim()) {
    return { plans, rects, overflowByBlock }
  }

  const captionDefaultFontSize = captionStyle.size * fontScale
  const captionFontSize = getBlockFontSize?.({
    key: captionKey,
    styleKey: captionStyleKey,
    defaultSize: captionDefaultFontSize,
  }) ?? captionDefaultFontSize
  const captionBaselineMult = getBlockBaselineMultiplier?.({
    key: captionKey,
    styleKey: captionStyleKey,
    defaultMultiplier: captionStyle.baselineMultiplier,
  }) ?? captionStyle.baselineMultiplier
  const captionContext = createTextContext({ key: captionKey, styleKey: captionStyleKey, fontSize: captionFontSize })
  const captionAlign = blockTextAlignments[captionKey] ?? "left"
  const captionSpan = getBlockSpan(captionKey)
  const captionRowSpan = getBlockRows(captionKey)
  const captionWidth = captionSpan * moduleWidth + Math.max(captionSpan - 1, 0) * gutterX
  const captionReflowEnabled = isTextReflowEnabled(captionKey) && captionSpan >= 2
  const captionColumnReflow = captionReflowEnabled
  const captionSyllableDivision = isSyllableDivisionEnabled(captionKey)
  const captionLines = wrapText({
    context: captionContext,
    key: captionKey,
    styleKey: captionStyleKey,
    text: captionText,
    maxWidth: captionColumnReflow ? moduleWidth : captionWidth,
    hyphenate: captionSyllableDivision,
  })
  const captionLineCount = captionLines.length

  const totalBaselinesFromTop = Math.floor((pageHeight - contentTop - marginsBottom) / baselineStep)
  const firstLineBaselineUnit = totalBaselinesFromTop - (captionLineCount - 1) * captionBaselineMult
  const autoCaptionY = contentTop + (firstLineBaselineUnit - 1) * baselineStep
  const captionOrigin = getOriginForBlock(captionKey, contentLeft, autoCaptionY)
  const captionAscent = textAscent({
    context: captionContext,
    key: captionKey,
    styleKey: captionStyleKey,
    fontSize: captionFontSize,
  })
  const captionHitTopPadding = Math.max(baselineStep, captionAscent)
  const captionLineStep = captionBaselineMult * baselineStep
  const captionPageBottomY = (isBlockPositionManual?.(captionKey) === true)
    ? Number.POSITIVE_INFINITY
    : pageHeight - marginsBottom
  const captionBottomLineLimit = captionPageBottomY + 0.0001
  const captionModuleHeight = captionRowSpan * moduleHeight + Math.max(captionRowSpan - 1, 0) * gutterY
  const captionMaxLinesPerColumn = Math.max(1, Math.floor(captionModuleHeight / captionLineStep))
  let captionMaxUsedRows = 0
  const captionCommands: TextDrawCommand[] = []

  if (!captionReflowEnabled) {
    const captionAnchorX = captionAlign === "right" ? captionOrigin.x + captionWidth : captionOrigin.x
    for (let lineIndex = 0; lineIndex < captionLines.length; lineIndex += 1) {
      const line = captionLines[lineIndex]
      const lineTopY = captionOrigin.y + baselineStep + lineIndex * captionBaselineMult * baselineStep
      const y = lineTopY + captionAscent
      if (lineTopY > captionBottomLineLimit) continue
      captionMaxUsedRows = Math.max(captionMaxUsedRows, lineIndex + 1)
      const offsetX = opticalOffset({
        context: captionContext,
        key: captionKey,
        styleKey: captionStyleKey,
        line,
        align: captionAlign,
        fontSize: captionFontSize,
      })
      captionCommands.push({ text: line, x: captionAnchorX + offsetX, y })
    }
  } else {
    for (let lineIndex = 0; lineIndex < captionLines.length; lineIndex += 1) {
      const columnIndex = Math.floor(lineIndex / captionMaxLinesPerColumn)
      if (columnIndex >= captionSpan) break
      const rowIndex = lineIndex % captionMaxLinesPerColumn
      const columnX = captionOrigin.x + columnIndex * (moduleWidth + gutterX)
      const captionAnchorX = captionAlign === "right" ? columnX + moduleWidth : columnX
      const line = captionLines[lineIndex]
      const lineTopY = captionOrigin.y + baselineStep + rowIndex * captionLineStep
      const y = lineTopY + captionAscent
      if (lineTopY > captionBottomLineLimit) continue
      captionMaxUsedRows = Math.max(captionMaxUsedRows, rowIndex + 1)
      const offsetX = opticalOffset({
        context: captionContext,
        key: captionKey,
        styleKey: captionStyleKey,
        line,
        align: captionAlign,
        fontSize: captionFontSize,
      })
      captionCommands.push({ text: line, x: captionAnchorX + offsetX, y })
    }
  }

  const captionOverflowLines = captionReflowEnabled
    ? Math.max(0, captionLines.length - captionCommands.length)
    : 0
  overflowByBlock[captionKey] = captionOverflowLines
  if (captionOverflowLines > 0 && captionSyllableDivision && captionCommands.length > 0) {
    const last = captionCommands[captionCommands.length - 1]
    if (last.text && !last.text.endsWith("-") && !last.text.endsWith("\u00AD")) {
      last.text = `${last.text}\u00AD`
    }
  }

  const captionRect: BlockRect = {
    x: captionOrigin.x,
    y: captionOrigin.y - captionHitTopPadding,
    width: captionWidth,
    height: captionColumnReflow
      ? captionModuleHeight + captionHitTopPadding
      : ((Math.max(captionMaxUsedRows, captionLineCount) || 1) * captionBaselineMult + 1) * baselineStep + captionHitTopPadding,
  }
  rects[captionKey] = captionRect
  plans.push({
    key: captionKey,
    styleKey: captionStyleKey,
    fontSize: captionFontSize,
    span: captionSpan,
    rowSpan: captionRowSpan,
    columnReflow: captionColumnReflow,
    rect: captionRect,
    textAlign: captionAlign,
    blockRotation: getBlockRotation(captionKey),
    rotationOriginX: captionOrigin.x,
    rotationOriginY: captionOrigin.y,
    commands: captionCommands,
  })

  return { plans, rects, overflowByBlock }
}
