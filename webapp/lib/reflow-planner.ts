export type PlannerModulePosition = {
  col: number
  row: number
}

export type ReflowPlan = {
  movedCount: number
  resolvedSpans: Record<string, number>
  nextPositions: Partial<Record<string, PlannerModulePosition>>
}

export type ReflowPlannerInput = {
  gridCols: number
  gridRows: number
  blockOrder: string[]
  blockColumnSpans: Partial<Record<string, number>>
  sourcePositions: Partial<Record<string, PlannerModulePosition>>
  pageHeight: number
  marginTop: number
  marginBottom: number
  gridUnit: number
  moduleHeight: number
  gridMarginVertical: number
}

const BASE_BLOCK_IDS = new Set(["display", "headline", "subhead", "body", "caption"])

const REPOSITION_COL_COST = 6
const REPOSITION_ROW_COST = 3
const REPOSITION_OVERFLOW_ROW_COST = 1000
const REPOSITION_DESIRED_COL_BIAS = 2
const REPOSITION_ORDER_VIOLATION_BASE = 250
const REPOSITION_ORDER_VIOLATION_STEP = 0.5
const REPOSITION_SEARCH_ROW_BUFFER = 60
const REPOSITION_NON_MODULE_ROW_PENALTY = 80
const REPOSITION_OUTSIDE_GRID_ROW_PENALTY = 600

function getDefaultColumnSpan(key: string, gridCols: number): number {
  if (gridCols <= 1) return 1
  if (key === "display") return gridCols
  if (key === "headline") return gridCols >= 3 ? Math.min(gridCols, Math.floor(gridCols / 2) + 1) : gridCols
  if (key === "caption") return 1
  return Math.max(1, Math.floor(gridCols / 2))
}

function makeRowColKey(row: number, col: number): string {
  return `${row.toFixed(4)}:${col}`
}

export function createReflowPlanSignature(input: ReflowPlannerInput): string {
  const signatureParts: string[] = [
    String(input.gridCols),
    String(input.gridRows),
    input.pageHeight.toFixed(4),
    input.marginTop.toFixed(4),
    input.marginBottom.toFixed(4),
    input.gridUnit.toFixed(4),
    input.moduleHeight.toFixed(4),
    input.gridMarginVertical.toFixed(4),
  ]
  for (const key of input.blockOrder) {
    const rawSpan = input.blockColumnSpans[key] ?? getDefaultColumnSpan(key, input.gridCols)
    const position = input.sourcePositions[key]
    signatureParts.push(key, String(rawSpan))
    if (position) {
      signatureParts.push(position.col.toFixed(4), position.row.toFixed(4))
    } else {
      signatureParts.push("n")
    }
  }
  return signatureParts.join("|")
}

export function computeReflowPlan(input: ReflowPlannerInput): ReflowPlan {
  const {
    gridCols,
    gridRows,
    blockOrder,
    blockColumnSpans,
    sourcePositions,
    pageHeight,
    marginTop,
    marginBottom,
    gridUnit,
    moduleHeight,
    gridMarginVertical,
  } = input

  const maxBaselineRow = Math.max(0, Math.floor((pageHeight - marginTop - marginBottom) / gridUnit))
  const resolvedSpans = blockOrder.reduce((acc, key) => {
    const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, gridCols)
    acc[key] = Math.max(1, Math.min(gridCols, Math.round(raw)))
    return acc
  }, {} as Record<string, number>)

  const priority = new Map<string, number>([
    ["display", 0],
    ["headline", 1],
    ["subhead", 2],
    ["body", 3],
    ["caption", 4],
  ])
  const orderIndex = new Map(blockOrder.map((key, index) => [key, index]))
  const sortedKeys = [...blockOrder].sort((a, b) => {
    const pa = BASE_BLOCK_IDS.has(a) ? (priority.get(a) ?? 100) : 100
    const pb = BASE_BLOCK_IDS.has(b) ? (priority.get(b) ?? 100) : 100
    if (pa !== pb) return pa - pb
    return (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0)
  })

  const occupied = new Set<string>()
  const canPlace = (row: number, col: number, span: number) => {
    if (col < 0 || row < 0) return false
    if (col + span > gridCols) return false
    for (let c = col; c < col + span; c += 1) {
      if (occupied.has(makeRowColKey(row, c))) return false
    }
    return true
  }
  const getReadingIndex = (position: PlannerModulePosition) => position.row * (gridCols + 1) + position.col
  const moduleRowStep = Math.max(0.0001, (moduleHeight + gridMarginVertical) / gridUnit)
  const moduleRowStarts = Array.from({ length: Math.max(1, gridRows) }, (_, index) =>
    Math.max(0, index * moduleRowStep),
  ).filter((row, index, arr) => arr.indexOf(row) === index)
  const moduleRowSet = new Set(moduleRowStarts.map((row) => row.toFixed(4)))
  const maxGridAnchorRow = moduleRowStarts[moduleRowStarts.length - 1] ?? 1
  const snapToNearestModuleTop = (row: number): number => {
    const clamped = Math.max(0, row)
    if (moduleRowStarts.length === 0) return clamped
    if (clamped <= maxGridAnchorRow) {
      let best = moduleRowStarts[0]
      let bestDistance = Math.abs(best - clamped)
      for (let i = 1; i < moduleRowStarts.length; i += 1) {
        const candidate = moduleRowStarts[i]
        const distance = Math.abs(candidate - clamped)
        if (distance < bestDistance) {
          best = candidate
          bestDistance = distance
        }
      }
      return best
    }
    const overflowSteps = Math.round((clamped - maxGridAnchorRow) / moduleRowStep)
    return Math.max(0, maxGridAnchorRow + overflowSteps * moduleRowStep)
  }

  const nextPositions: Partial<Record<string, PlannerModulePosition>> = {}
  let movedCount = 0
  let previousPlaced: PlannerModulePosition | null = null

  for (const key of sortedKeys) {
    const span = resolvedSpans[key]
    const maxCol = Math.max(0, gridCols - span)
    const current = sourcePositions[key]
    const desired: PlannerModulePosition = current
      ? {
          col: Math.max(0, Math.min(maxCol, Math.round(current.col))),
          row: snapToNearestModuleTop(current.row),
        }
      : { col: 0, row: 0 }

    const searchMaxRow = Math.max(maxBaselineRow + REPOSITION_SEARCH_ROW_BUFFER, desired.row + REPOSITION_SEARCH_ROW_BUFFER)
    let best: { position: PlannerModulePosition; score: number } | null = null
    const prioritizedRows = [...moduleRowStarts].sort((a, b) => Math.abs(a - desired.row) - Math.abs(b - desired.row))
    let overflowCursor = moduleRowStarts[moduleRowStarts.length - 1] ?? 1
    while (overflowCursor <= searchMaxRow) {
      if (!moduleRowSet.has(overflowCursor.toFixed(4))) {
        prioritizedRows.push(overflowCursor)
      }
      overflowCursor += moduleRowStep
    }

    for (const row of prioritizedRows) {
      if (row > searchMaxRow) continue
      for (let col = 0; col <= maxCol; col += 1) {
        if (!canPlace(row, col, span)) continue
        const candidate: PlannerModulePosition = { col, row }
        const movementScore =
          Math.abs(candidate.col - desired.col) * REPOSITION_COL_COST
          + Math.abs(candidate.row - desired.row) * REPOSITION_ROW_COST
        const overflowRows = Math.max(0, candidate.row - maxBaselineRow)
        const overflowScore = overflowRows * REPOSITION_OVERFLOW_ROW_COST
        const outsideGridRows = Math.max(0, candidate.row - maxGridAnchorRow)
        const outsideGridScore = outsideGridRows * REPOSITION_OUTSIDE_GRID_ROW_PENALTY
        const moduleRowScore = moduleRowSet.has(candidate.row.toFixed(4)) ? 0 : REPOSITION_NON_MODULE_ROW_PENALTY
        const desiredColBias = candidate.col === desired.col ? 0 : REPOSITION_DESIRED_COL_BIAS
        let orderScore = 0
        if (previousPlaced) {
          const prevIndex = getReadingIndex(previousPlaced)
          const candidateIndex = getReadingIndex(candidate)
          if (candidateIndex < prevIndex) {
            orderScore = REPOSITION_ORDER_VIOLATION_BASE + (prevIndex - candidateIndex) * REPOSITION_ORDER_VIOLATION_STEP
          }
        }
        const score = movementScore + overflowScore + outsideGridScore + moduleRowScore + desiredColBias + orderScore
        if (
          !best
          || score < best.score
          || (score === best.score
            && (candidate.row < best.position.row
              || (candidate.row === best.position.row && candidate.col < best.position.col)))
        ) {
          best = { position: candidate, score }
        }
      }
    }

    let placed: PlannerModulePosition
    if (best) {
      placed = best.position
    } else {
      let stackRow = Math.max(maxBaselineRow + moduleRowStep, desired.row)
      stackRow = snapToNearestModuleTop(stackRow)
      while (!canPlace(stackRow, 0, span)) stackRow += moduleRowStep
      placed = { col: 0, row: stackRow }
    }

    if (!current || current.col !== placed.col || Math.abs(current.row - placed.row) > 0.0001) movedCount += 1
    nextPositions[key] = placed
    for (let c = placed.col; c < placed.col + span; c += 1) {
      occupied.add(makeRowColKey(placed.row, c))
    }
    previousPlaced = placed
  }

  return { movedCount, resolvedSpans, nextPositions }
}
