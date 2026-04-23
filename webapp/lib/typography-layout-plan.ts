import { resolveBlockHeight } from "@/lib/block-height"
import { resolveGridColumnOffset, sumGridColumnSpan } from "@/lib/grid-column-layout"
import { resolveLayerColumnBounds } from "@/lib/layer-placement"
import type { WrappedTextLine } from "@/lib/text-layout"
import type { TextAlignMode, TextVerticalAlignMode } from "@/lib/types/layout-primitives"

export type { TextAlignMode, TextVerticalAlignMode }

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
  sourceStart?: number
  sourceEnd?: number
  leadingBoundaryWhitespace?: number
  trailingBoundaryWhitespace?: number
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
  heightBaselines: number
  columnReflow: boolean
  rect: BlockRect
  guideRects: BlockRect[]
  textAlign: TextAlignMode
  textVerticalAlign: TextVerticalAlignMode
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
  blockVerticalAlignments: Partial<Record<BlockId, TextVerticalAlignMode>>
  contentTop: number
  contentLeft: number
  pageHeight: number
  marginsBottom: number
  baselineStep: number
  moduleWidth: number
  moduleHeight: number
  moduleWidths?: number[]
  columnStarts?: number[]
  moduleHeights?: number[]
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
  getBlockHeightBaselines?: (key: BlockId) => number
  getBlockFontSize?: (args: { key: BlockId; styleKey: StyleKey; defaultSize: number }) => number
  getBlockBaselineMultiplier?: (args: { key: BlockId; styleKey: StyleKey; defaultMultiplier: number }) => number
  getBlockRotation: (key: BlockId) => number
  isTextReflowEnabled: (key: BlockId) => boolean
  isSyllableDivisionEnabled: (key: BlockId) => boolean
  isBlockPositionManual?: (key: BlockId) => boolean
  getBlockColumnStart?: (key: BlockId, span: number) => number
  getBlockRowStart?: (key: BlockId, rowSpan: number) => number
  getOriginForBlock: (key: BlockId, fallbackX: number, fallbackY: number) => { x: number; y: number }
  createTextContext: (args: { key: BlockId; styleKey: StyleKey; fontSize: number }) => Context
  wrapText: (args: {
    context: Context
    key: BlockId
    styleKey: StyleKey
    text: string
    maxWidth: number
    hyphenate: boolean
  }) => WrappedTextLine[]
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
  blockVerticalAlignments,
  contentTop,
  contentLeft,
  pageHeight,
  marginsBottom,
  baselineStep,
  moduleWidth,
  moduleHeight,
  moduleWidths,
  columnStarts,
  moduleHeights,
  gutterX,
  gutterY,
  gridRows,
  gridCols,
  fontScale,
  bodyKey,
  displayKey,
  captionKey,
  defaultBodyStyleKey,
  defaultCaptionStyleKey,
  getBlockSpan,
  getBlockRows,
  getBlockHeightBaselines,
  getBlockFontSize,
  getBlockBaselineMultiplier,
  getBlockRotation,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isBlockPositionManual,
  getBlockColumnStart,
  getBlockRowStart,
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

  const resolvedModuleWidths = (
    Array.isArray(moduleWidths) && moduleWidths.length === gridCols
      ? moduleWidths
      : Array(Math.max(1, gridCols)).fill(moduleWidth)
  ).map((value) => (Number.isFinite(value) && value > 0 ? value : moduleWidth))
  const resolvedModuleHeights = (
    Array.isArray(moduleHeights) && moduleHeights.length === gridRows
      ? moduleHeights
      : Array(Math.max(1, gridRows)).fill(moduleHeight)
  ).map((value) => (Number.isFinite(value) && value > 0 ? value : moduleHeight))

  const getColumnWidthAt = (columnIndex: number) => {
    if (columnIndex < 0 || columnIndex >= gridCols) return moduleWidth
    return resolvedModuleWidths[columnIndex] ?? moduleWidth
  }
  const getSpanWidth = (columnStart: number, span: number) => {
    if (columnStart < 0 || columnStart >= gridCols) {
      return span * moduleWidth + Math.max(span - 1, 0) * gutterX
    }
    return sumGridColumnSpan(resolvedModuleWidths, columnStarts ?? [], columnStart, span, gutterX)
  }
  const getReflowColumnWidth = (columnStart: number, span: number) => {
    let minWidth = Number.POSITIVE_INFINITY
    for (let index = 0; index < span; index += 1) {
      const width = getColumnWidthAt(columnStart + index)
      minWidth = Math.min(minWidth, width)
    }
    return Number.isFinite(minWidth) && minWidth > 0 ? minWidth : moduleWidth
  }
  const getColumnOffset = (columnStart: number, offset: number) => {
    return resolveGridColumnOffset(columnStarts ?? [], columnStart, offset, resolvedModuleWidths, gutterX)
  }
  const getRowSpanHeight = (rowStart: number, rowSpan: number, heightBaselines: number) => {
    return resolveBlockHeight({
      rowStart,
      rows: rowSpan,
      baselines: heightBaselines,
      gridRows,
      moduleHeights: resolvedModuleHeights,
      fallbackModuleHeight: moduleHeight,
      gutterY,
      baselineStep,
    })
  }
  const getRowHeightAt = (rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= gridRows) return moduleHeight
    return resolvedModuleHeights[rowIndex] ?? moduleHeight
  }
  const getRowOffset = (rowStart: number, offset: number) => {
    let position = 0
    for (let index = 0; index < offset; index += 1) {
      position += getRowHeightAt(rowStart + index) + gutterY
    }
    return position
  }
  const getLineCapacityForHeight = (availableHeight: number, lineStep: number) => {
    if (!Number.isFinite(availableHeight) || availableHeight <= 0) return 0
    const safeLineStep = Math.max(lineStep, 0.0001)
    const remainingAfterFirstLine = availableHeight - baselineStep
    if (remainingAfterFirstLine < 0) return 0
    return 1 + Math.floor(remainingAfterFirstLine / safeLineStep)
  }
  const buildReflowRowLayouts = (rowStart: number, rowSpan: number, heightBaselines: number, lineStep: number) => {
    if (rowSpan <= 0) {
      const height = Math.max(heightBaselines * baselineStep, lineStep)
      return [{
        yOffset: 0,
        height,
        lineCapacity: Math.max(1, getLineCapacityForHeight(height, lineStep)),
      }]
    }

    return Array.from({ length: Math.max(1, rowSpan) }, (_, rowOffset) => {
      const height = getRowHeightAt(rowStart + rowOffset)
      const extraHeight = rowOffset === rowSpan - 1 ? heightBaselines * baselineStep : 0
      return {
        yOffset: getRowOffset(rowStart, rowOffset),
        height: height + extraHeight,
        lineCapacity: Math.max(1, getLineCapacityForHeight(height + extraHeight, lineStep)),
      }
    })
  }

  const getAnchorX = (left: number, width: number, align: TextAlignMode) => (
    align === "right"
      ? left + width
      : align === "center"
        ? left + width / 2
        : left
  )

  const getVerticalStartOffset = ({
    lineCount,
    lineStep,
    availableHeight,
    verticalAlign,
  }: {
    lineCount: number
    lineStep: number
    availableHeight: number
    verticalAlign: TextVerticalAlignMode
  }) => {
    if (verticalAlign === "top" || lineCount <= 0) return 0
    const occupiedHeight = baselineStep + Math.max(0, lineCount - 1) * lineStep
    const freeHeight = Math.max(0, availableHeight - occupiedHeight)
    const freeBaselineRows = Math.floor(freeHeight / Math.max(baselineStep, 0.0001))
    if (freeBaselineRows <= 0) return 0
    if (verticalAlign === "bottom") return freeBaselineRows * baselineStep
    return Math.floor(freeBaselineRows / 2) * baselineStep
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
    const heightBaselines = getBlockHeightBaselines?.(key) ?? 0
    const startColRaw = getBlockColumnStart?.(key, span) ?? 0
    const { minCol } = resolveLayerColumnBounds({ span, gridCols })
    const startCol = Math.max(minCol, Math.min(Math.max(0, gridCols - 1), startColRaw))
    const startRowRaw = getBlockRowStart?.(key, rowSpan) ?? 0
    const startRow = Math.max(0, Math.min(Math.max(0, gridRows - 1), startRowRaw))
    const wrapWidth = getSpanWidth(startCol, span)
    const reflowEnabled = isTextReflowEnabled(key) && span >= 2
    const columnReflow = reflowEnabled
    const hyphenate = isSyllableDivisionEnabled(key)
    const reflowColumnWidth = getReflowColumnWidth(startCol, span)
    const lines = wrapText({
      context,
      key,
      styleKey,
      text: blockText,
      maxWidth: columnReflow ? reflowColumnWidth : wrapWidth,
      hyphenate,
    })

    const autoX = contentLeft
    const autoY = contentTop + (blockStartOffset - 1) * baselineStep
    const origin = getOriginForBlock(key, autoX, autoY)
    const textAlign = blockTextAlignments[key] ?? "left"
    const textVerticalAlign = blockVerticalAlignments[key] ?? "top"
    const ascent = textAscent({ context, key, styleKey, fontSize })
    const hitTopPadding = Math.max(baselineStep, ascent)
    const lineStep = baselineMult * baselineStep
    const pageBottomY = (isBlockPositionManual?.(key) === true)
      ? Number.POSITIVE_INFINITY
      : pageHeight - marginsBottom
    const bottomLineLimit = pageBottomY + 0.0001
    const moduleHeightForBlock = getRowSpanHeight(startRow, rowSpan, heightBaselines)
    const reflowRowLayouts = buildReflowRowLayouts(startRow, rowSpan, heightBaselines, lineStep)
    const maxLinesPerColumn = Math.max(1, getLineCapacityForHeight(moduleHeightForBlock, lineStep))
    const verticalStartOffset = getVerticalStartOffset({
      lineCount: columnReflow ? Math.min(lines.length, maxLinesPerColumn) : lines.length,
      lineStep,
      availableHeight: moduleHeightForBlock,
      verticalAlign: textVerticalAlign,
    })
    let maxUsedRows = 0
    const commands: TextDrawCommand[] = []

    const rect: BlockRect = {
      x: origin.x,
      y: origin.y - hitTopPadding,
      width: wrapWidth,
      height: moduleHeightForBlock + hitTopPadding,
    }
    const guideRects: BlockRect[] = columnReflow
      ? Array.from({ length: Math.max(1, span) }, (_, columnIndex) => (
        reflowRowLayouts.map((rowLayout) => ({
          x: origin.x + getColumnOffset(startCol, columnIndex),
          y: origin.y + baselineStep + rowLayout.yOffset,
          width: getColumnWidthAt(startCol + columnIndex),
          height: rowLayout.height,
        }))
      )).flat()
      : [{
        x: origin.x,
        y: origin.y + baselineStep,
        width: wrapWidth,
        height: moduleHeightForBlock,
      }]

    if (!columnReflow) {
      const anchorX = getAnchorX(origin.x, wrapWidth, textAlign)
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex]
        const lineTopY = origin.y + baselineStep + verticalStartOffset + lineIndex * lineStep
        const y = lineTopY + ascent
        if (lineTopY > bottomLineLimit) continue
        maxUsedRows = Math.max(maxUsedRows, lineIndex + 1)
        const offsetX = opticalOffset({ context, key, styleKey, line: line.text, align: textAlign, fontSize })
        commands.push({
          text: line.text,
          x: anchorX + offsetX,
          y,
          sourceStart: line.sourceStart,
          sourceEnd: line.sourceEnd,
          leadingBoundaryWhitespace: line.leadingBoundaryWhitespace,
          trailingBoundaryWhitespace: line.trailingBoundaryWhitespace,
        })
      }
    } else {
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const columnIndex = Math.floor(lineIndex / maxLinesPerColumn)
        if (columnIndex >= span) break
        const lineIndexWithinColumn = lineIndex % maxLinesPerColumn
        const columnX = origin.x + getColumnOffset(startCol, columnIndex)
        const columnWidth = getColumnWidthAt(startCol + columnIndex)
        const anchorX = getAnchorX(columnX, columnWidth, textAlign)
        const line = lines[lineIndex]
        const lineTopY = origin.y + baselineStep + verticalStartOffset + lineIndexWithinColumn * lineStep
        const y = lineTopY + ascent
        if (lineTopY > bottomLineLimit) continue
        maxUsedRows = Math.max(maxUsedRows, lineIndexWithinColumn + 1)
        const offsetX = opticalOffset({ context, key, styleKey, line: line.text, align: textAlign, fontSize })
        commands.push({
          text: line.text,
          x: anchorX + offsetX,
          y,
          sourceStart: line.sourceStart,
          sourceEnd: line.sourceEnd,
          leadingBoundaryWhitespace: line.leadingBoundaryWhitespace,
          trailingBoundaryWhitespace: line.trailingBoundaryWhitespace,
        })
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
    rects[key] = rect
    plans.push({
      key,
      styleKey,
      fontSize,
      span,
      rowSpan,
      heightBaselines,
      columnReflow,
      rect,
      guideRects,
      textAlign,
      textVerticalAlign,
      blockRotation: getBlockRotation(key),
      rotationOriginX: origin.x,
      rotationOriginY: origin.y + baselineStep,
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
  const captionVerticalAlign = blockVerticalAlignments[captionKey] ?? "top"
  const captionSpan = getBlockSpan(captionKey)
  const captionRowSpan = getBlockRows(captionKey)
  const captionHeightBaselines = getBlockHeightBaselines?.(captionKey) ?? 0
  const captionStartColRaw = getBlockColumnStart?.(captionKey, captionSpan) ?? 0
  const { minCol: captionMinCol } = resolveLayerColumnBounds({ span: captionSpan, gridCols })
  const captionStartCol = Math.max(captionMinCol, Math.min(Math.max(0, gridCols - 1), captionStartColRaw))
  const captionStartRowRaw = getBlockRowStart?.(captionKey, captionRowSpan) ?? 0
  const captionStartRow = Math.max(0, Math.min(Math.max(0, gridRows - 1), captionStartRowRaw))
  const captionWidth = getSpanWidth(captionStartCol, captionSpan)
  const captionReflowEnabled = isTextReflowEnabled(captionKey) && captionSpan >= 2
  const captionColumnReflow = captionReflowEnabled
  const captionSyllableDivision = isSyllableDivisionEnabled(captionKey)
  const captionReflowColumnWidth = getReflowColumnWidth(captionStartCol, captionSpan)
  const captionLines = wrapText({
    context: captionContext,
    key: captionKey,
    styleKey: captionStyleKey,
    text: captionText,
    maxWidth: captionColumnReflow ? captionReflowColumnWidth : captionWidth,
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
  const captionModuleHeight = getRowSpanHeight(captionStartRow, captionRowSpan, captionHeightBaselines)
  const captionReflowRowLayouts = buildReflowRowLayouts(captionStartRow, captionRowSpan, captionHeightBaselines, captionLineStep)
  const captionMaxLinesPerColumn = Math.max(1, getLineCapacityForHeight(captionModuleHeight, captionLineStep))
  const captionVerticalStartOffset = getVerticalStartOffset({
    lineCount: captionColumnReflow ? Math.min(captionLines.length, captionMaxLinesPerColumn) : captionLines.length,
    lineStep: captionLineStep,
    availableHeight: captionModuleHeight,
    verticalAlign: captionVerticalAlign,
  })
  const captionCommands: TextDrawCommand[] = []

  if (!captionReflowEnabled) {
    const captionAnchorX = getAnchorX(captionOrigin.x, captionWidth, captionAlign)
    for (let lineIndex = 0; lineIndex < captionLines.length; lineIndex += 1) {
      const line = captionLines[lineIndex]
      const lineTopY = captionOrigin.y + baselineStep + captionVerticalStartOffset + lineIndex * captionLineStep
      const y = lineTopY + captionAscent
      if (lineTopY > captionBottomLineLimit) continue
      const offsetX = opticalOffset({
        context: captionContext,
        key: captionKey,
        styleKey: captionStyleKey,
        line: line.text,
        align: captionAlign,
        fontSize: captionFontSize,
      })
      captionCommands.push({
        text: line.text,
        x: captionAnchorX + offsetX,
        y,
        sourceStart: line.sourceStart,
        sourceEnd: line.sourceEnd,
        leadingBoundaryWhitespace: line.leadingBoundaryWhitespace,
        trailingBoundaryWhitespace: line.trailingBoundaryWhitespace,
      })
    }
  } else {
    for (let lineIndex = 0; lineIndex < captionLines.length; lineIndex += 1) {
      const columnIndex = Math.floor(lineIndex / captionMaxLinesPerColumn)
      if (columnIndex >= captionSpan) break
      const lineIndexWithinColumn = lineIndex % captionMaxLinesPerColumn
      const columnX = captionOrigin.x + getColumnOffset(captionStartCol, columnIndex)
      const columnWidth = getColumnWidthAt(captionStartCol + columnIndex)
      const captionAnchorX = getAnchorX(columnX, columnWidth, captionAlign)
      const line = captionLines[lineIndex]
      const lineTopY = captionOrigin.y + baselineStep + captionVerticalStartOffset + lineIndexWithinColumn * captionLineStep
      const y = lineTopY + captionAscent
      if (lineTopY > captionBottomLineLimit) continue
      const offsetX = opticalOffset({
        context: captionContext,
        key: captionKey,
        styleKey: captionStyleKey,
        line: line.text,
        align: captionAlign,
        fontSize: captionFontSize,
      })
      captionCommands.push({
        text: line.text,
        x: captionAnchorX + offsetX,
        y,
        sourceStart: line.sourceStart,
        sourceEnd: line.sourceEnd,
        leadingBoundaryWhitespace: line.leadingBoundaryWhitespace,
        trailingBoundaryWhitespace: line.trailingBoundaryWhitespace,
      })
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
    height: captionModuleHeight + captionHitTopPadding,
  }
  const captionGuideRects: BlockRect[] = captionColumnReflow
    ? Array.from({ length: Math.max(1, captionSpan) }, (_, columnIndex) => (
      captionReflowRowLayouts.map((rowLayout) => ({
        x: captionOrigin.x + getColumnOffset(captionStartCol, columnIndex),
        y: captionOrigin.y + baselineStep + rowLayout.yOffset,
        width: getColumnWidthAt(captionStartCol + columnIndex),
        height: rowLayout.height,
      }))
    )).flat()
    : [{
      x: captionOrigin.x,
      y: captionOrigin.y + baselineStep,
      width: captionWidth,
      height: captionModuleHeight,
    }]
  rects[captionKey] = captionRect
  plans.push({
    key: captionKey,
    styleKey: captionStyleKey,
    fontSize: captionFontSize,
    span: captionSpan,
    rowSpan: captionRowSpan,
    heightBaselines: captionHeightBaselines,
    columnReflow: captionColumnReflow,
    rect: captionRect,
    guideRects: captionGuideRects,
    textAlign: captionAlign,
    textVerticalAlign: captionVerticalAlign,
    blockRotation: getBlockRotation(captionKey),
    rotationOriginX: captionOrigin.x,
    rotationOriginY: captionOrigin.y + baselineStep,
    commands: captionCommands,
  })

  return { plans, rects, overflowByBlock }
}
