import { useCallback, useEffect, useRef, useState } from "react"

import type { AutoFitPlannerInput } from "@/lib/autofit-planner"

type ModulePosition = {
  col: number
  row: number
}

type PendingReflow<BlockId extends string> = {
  previousGrid: { cols: number; rows: number }
  nextGrid: { cols: number; rows: number }
  movedCount: number
  resolvedSpans: Record<BlockId, number>
  nextPositions: Partial<Record<BlockId, ModulePosition>>
}

type ReflowPlan<BlockId extends string> = {
  movedCount: number
  resolvedSpans: Record<BlockId, number>
  nextPositions: Partial<Record<BlockId, ModulePosition>>
}

type Args<BlockId extends string, ReflowInput, Snapshot> = {
  suppressReflowCheckRef: { current: boolean }
  blockOrder: BlockId[]
  blockColumnSpans: Partial<Record<BlockId, number>>
  blockModulePositions: Partial<Record<BlockId, ModulePosition>>
  textContent: Record<BlockId, string>
  scale: number
  gridCols: number
  gridRows: number
  moduleWidth: number
  moduleHeight: number
  gridUnit: number
  gridMarginVertical: number
  marginTop: number
  marginBottom: number
  pageHeight: number
  typographyStyles: Record<string, { size: number; baselineMultiplier: number; weight: string }>
  getDefaultColumnSpan: (key: BlockId, gridCols: number) => number
  getBlockRows: (key: BlockId) => number
  getBlockSpan: (key: BlockId) => number
  getStyleKeyForBlock: (key: BlockId) => string
  isTextReflowEnabled: (key: BlockId) => boolean
  isSyllableDivisionEnabled: (key: BlockId) => boolean
  buildSnapshot: () => Snapshot
  pushHistory: (snapshot: Snapshot) => void
  onRequestGridRestore?: (cols: number, rows: number) => void
  setBlockColumnSpans: (next: (prev: Partial<Record<BlockId, number>>) => Partial<Record<BlockId, number>>) => void
  setBlockModulePositions: (
    next: (prev: Partial<Record<BlockId, ModulePosition>>) => Partial<Record<BlockId, ModulePosition>>
  ) => void
  buildReflowPlannerInput: (
    gridCols: number,
    gridRows: number,
    sourcePositions?: Partial<Record<BlockId, ModulePosition>>,
  ) => ReflowInput
  postReflowPlanRequest: (input: ReflowInput) => { requestId: number; promise: Promise<ReflowPlan<BlockId>> }
  cancelReflowWorkerRequest: (requestId: number) => void
  computeReflowPlan: (input: ReflowInput) => ReflowPlan<BlockId>
  postAutoFitRequest: (input: AutoFitPlannerInput) => {
    requestId: number
    promise: Promise<{
      spanUpdates: Partial<Record<string, number>>
      positionUpdates: Partial<Record<string, ModulePosition>>
    }>
  }
  cancelAutoFitWorkerRequest: (requestId: number) => void
  computeAutoFitFallback: (input: AutoFitPlannerInput) => {
    spanUpdates: Partial<Record<string, number>>
    positionUpdates: Partial<Record<string, ModulePosition>>
  }
  recordPerfMetric: (metric: "reflowMs" | "autofitMs", valueMs: number) => void
}

export function useLayoutReflow<BlockId extends string, ReflowInput, Snapshot>({
  suppressReflowCheckRef,
  blockOrder,
  blockColumnSpans,
  blockModulePositions,
  textContent,
  scale,
  gridCols,
  gridRows,
  moduleWidth,
  moduleHeight,
  gridUnit,
  gridMarginVertical,
  marginTop,
  marginBottom,
  pageHeight,
  typographyStyles,
  getDefaultColumnSpan,
  getBlockRows,
  getBlockSpan,
  getStyleKeyForBlock,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  buildSnapshot,
  pushHistory,
  onRequestGridRestore,
  setBlockColumnSpans,
  setBlockModulePositions,
  buildReflowPlannerInput,
  postReflowPlanRequest,
  cancelReflowWorkerRequest,
  computeReflowPlan,
  postAutoFitRequest,
  cancelAutoFitWorkerRequest,
  computeAutoFitFallback,
  recordPerfMetric,
}: Args<BlockId, ReflowInput, Snapshot>) {
  const previousGridRef = useRef<{ cols: number; rows: number } | null>(null)
  const previousModuleRowStepRef = useRef<number | null>(null)
  const lastAutoFitSettingsRef = useRef<string>("")
  const [pendingReflow, setPendingReflow] = useState<PendingReflow<BlockId> | null>(null)
  const [reflowToast, setReflowToast] = useState<{ movedCount: number } | null>(null)

  const clearTransientState = useCallback(() => {
    setPendingReflow(null)
    setReflowToast(null)
  }, [])

  const dismissReflowToast = useCallback(() => {
    setReflowToast(null)
  }, [])

  const applyPendingReflow = useCallback(() => {
    if (!pendingReflow) return
    pushHistory(buildSnapshot())
    setBlockColumnSpans((prev) => ({ ...prev, ...pendingReflow.resolvedSpans }))
    setBlockModulePositions((prev) => ({ ...prev, ...pendingReflow.nextPositions }))
    previousGridRef.current = pendingReflow.nextGrid
    setReflowToast({ movedCount: pendingReflow.movedCount })
    setPendingReflow(null)
  }, [buildSnapshot, pendingReflow, pushHistory, setBlockColumnSpans, setBlockModulePositions])

  const cancelPendingReflow = useCallback(() => {
    if (!pendingReflow) return
    previousGridRef.current = pendingReflow.previousGrid
    setPendingReflow(null)
    onRequestGridRestore?.(pendingReflow.previousGrid.cols, pendingReflow.previousGrid.rows)
  }, [onRequestGridRestore, pendingReflow])

  useEffect(() => {
    const currentGrid = { cols: gridCols, rows: gridRows }
    const currentModuleRowStep = Math.max(0.0001, (moduleHeight + gridMarginVertical) / gridUnit)
    if (!previousGridRef.current) {
      previousGridRef.current = currentGrid
      previousModuleRowStepRef.current = currentModuleRowStep
      return
    }
    if (suppressReflowCheckRef.current) {
      previousGridRef.current = currentGrid
      previousModuleRowStepRef.current = currentModuleRowStep
      suppressReflowCheckRef.current = false
      return
    }
    if (pendingReflow) return

    const previousGrid = previousGridRef.current
    const previousModuleRowStep = previousModuleRowStepRef.current ?? currentModuleRowStep
    const gridChanged = previousGrid.cols !== currentGrid.cols || previousGrid.rows !== currentGrid.rows
    const moduleRowStepChanged = Math.abs(previousModuleRowStep - currentModuleRowStep) > 0.0001
    if (!gridChanged && !moduleRowStepChanged) return
    const isPureColIncrease = (
      currentGrid.cols >= previousGrid.cols
      && currentGrid.rows === previousGrid.rows
      && currentGrid.cols > previousGrid.cols
      && !moduleRowStepChanged
    )
    if (isPureColIncrease) {
      previousGridRef.current = currentGrid
      previousModuleRowStepRef.current = currentModuleRowStep
      return
    }
    const rowsChanged = currentGrid.rows !== previousGrid.rows || moduleRowStepChanged
    const maxBaselineRow = Math.max(0, Math.floor((pageHeight - marginTop - marginBottom) / gridUnit))
    const remapRowBetweenGrids = (row: number): number => {
      const clamped = Math.max(0, Math.min(maxBaselineRow, row))
      if (!rowsChanged) return clamped
      const moduleIndex = Math.max(0, Math.round(clamped / previousModuleRowStep))
      const next = moduleIndex * currentModuleRowStep
      return Math.max(0, Math.min(maxBaselineRow, next))
    }
    const sourcePositions = rowsChanged
      ? (Object.keys(blockModulePositions) as BlockId[]).reduce((acc, key) => {
          const position = blockModulePositions[key]
          if (!position) return acc
          acc[key] = { col: position.col, row: remapRowBetweenGrids(position.row) }
          return acc
        }, {} as Partial<Record<BlockId, ModulePosition>>)
      : blockModulePositions

    const applyComputedPlan = (plan: ReflowPlan<BlockId>) => {
      const spanChanged = blockOrder.some((key) => {
        const currentSpan = blockColumnSpans[key] ?? getDefaultColumnSpan(key, previousGrid.cols)
        return plan.resolvedSpans[key] !== currentSpan
      })
      const positionChanged = blockOrder.some((key) => {
        const a = blockModulePositions[key]
        const b = plan.nextPositions[key]
        if (!a && !b) return false
        if (!a || !b) return true
        return a.col !== b.col || Math.abs(a.row - b.row) > 0.0001
      })

      if (!spanChanged && !positionChanged) {
        previousGridRef.current = currentGrid
        previousModuleRowStepRef.current = currentModuleRowStep
        return
      }

      if (rowsChanged) {
        pushHistory(buildSnapshot())
        setBlockColumnSpans((prev) => ({ ...prev, ...plan.resolvedSpans }))
        setBlockModulePositions((prev) => ({ ...prev, ...plan.nextPositions }))
        previousGridRef.current = currentGrid
        previousModuleRowStepRef.current = currentModuleRowStep
        return
      }

      if (plan.movedCount > 0) {
        setPendingReflow({
          previousGrid,
          nextGrid: currentGrid,
          movedCount: plan.movedCount,
          resolvedSpans: plan.resolvedSpans,
          nextPositions: plan.nextPositions,
        })
        return
      }

      pushHistory(buildSnapshot())
      setBlockColumnSpans((prev) => ({ ...prev, ...plan.resolvedSpans }))
      setBlockModulePositions((prev) => ({ ...prev, ...plan.nextPositions }))
      previousGridRef.current = currentGrid
      previousModuleRowStepRef.current = currentModuleRowStep
    }

    const plannerInput = buildReflowPlannerInput(currentGrid.cols, currentGrid.rows, sourcePositions)
    const reflowStartedAt = performance.now()
    const { requestId, promise } = postReflowPlanRequest(plannerInput)
    let cancelled = false
    promise
      .then((plan) => {
        if (cancelled) return
        recordPerfMetric("reflowMs", performance.now() - reflowStartedAt)
        applyComputedPlan(plan)
      })
      .catch(() => {
        if (cancelled) return
        recordPerfMetric("reflowMs", performance.now() - reflowStartedAt)
        applyComputedPlan(computeReflowPlan(plannerInput))
      })
    return () => {
      cancelled = true
      cancelReflowWorkerRequest(requestId)
    }
  }, [
    blockColumnSpans,
    blockModulePositions,
    blockOrder,
    buildReflowPlannerInput,
    buildSnapshot,
    cancelReflowWorkerRequest,
    computeReflowPlan,
    getDefaultColumnSpan,
    gridCols,
    gridMarginVertical,
    gridRows,
    gridUnit,
    marginBottom,
    marginTop,
    moduleHeight,
    pageHeight,
    pendingReflow,
    postReflowPlanRequest,
    pushHistory,
    recordPerfMetric,
    setBlockColumnSpans,
    setBlockModulePositions,
  ])

  useEffect(() => {
    if (pendingReflow) return
    const signature = [
      gridCols,
      gridRows,
      moduleWidth,
      moduleHeight,
      gridUnit,
      gridMarginVertical,
      scale,
    ].join("|")
    if (lastAutoFitSettingsRef.current === signature) return
    lastAutoFitSettingsRef.current = signature

    const items: AutoFitPlannerInput["items"] = []
    for (const key of blockOrder) {
      if (!isTextReflowEnabled(key)) continue
      const currentPosition = blockModulePositions[key]
      if (!currentPosition) continue
      const styleKey = getStyleKeyForBlock(key)
      const style = typographyStyles[styleKey]
      if (!style) continue
      items.push({
        key,
        text: textContent[key] ?? "",
        style: {
          size: style.size,
          baselineMultiplier: style.baselineMultiplier,
          weight: style.weight,
        },
        rowSpan: getBlockRows(key),
        syllableDivision: isSyllableDivisionEnabled(key),
        position: currentPosition,
        currentSpan: getBlockSpan(key),
      })
    }
    if (!items.length) return

    const input: AutoFitPlannerInput = {
      items,
      scale,
      gridCols,
      moduleWidth,
      moduleHeight,
      gridMarginVertical,
      gridUnit,
      marginTop,
      marginBottom,
      pageHeight,
    }

    const autoFitStartedAt = performance.now()
    const { requestId, promise } = postAutoFitRequest(input)
    let cancelled = false
    promise.then((output) => {
      if (cancelled) return
      recordPerfMetric("autofitMs", performance.now() - autoFitStartedAt)
      const hasSpanChanges = Object.keys(output.spanUpdates).length > 0
      const hasPositionChanges = Object.keys(output.positionUpdates).length > 0
      if (hasSpanChanges) {
        setBlockColumnSpans((prev) => ({ ...prev, ...output.spanUpdates }))
      }
      if (hasPositionChanges) {
        setBlockModulePositions((prev) => ({ ...prev, ...output.positionUpdates }))
      }
    }).catch(() => {
      if (cancelled) return
      recordPerfMetric("autofitMs", performance.now() - autoFitStartedAt)
      const fallback = computeAutoFitFallback(input)
      if (Object.keys(fallback.spanUpdates).length > 0) {
        setBlockColumnSpans((prev) => ({ ...prev, ...fallback.spanUpdates }))
      }
      if (Object.keys(fallback.positionUpdates).length > 0) {
        setBlockModulePositions((prev) => ({ ...prev, ...fallback.positionUpdates }))
      }
    })
    return () => {
      cancelled = true
      cancelAutoFitWorkerRequest(requestId)
    }
  }, [
    blockModulePositions,
    blockOrder,
    cancelAutoFitWorkerRequest,
    computeAutoFitFallback,
    getBlockRows,
    getBlockSpan,
    getStyleKeyForBlock,
    gridCols,
    gridMarginVertical,
    gridRows,
    gridUnit,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    marginBottom,
    marginTop,
    moduleHeight,
    moduleWidth,
    pageHeight,
    pendingReflow,
    postAutoFitRequest,
    recordPerfMetric,
    scale,
    setBlockColumnSpans,
    setBlockModulePositions,
    textContent,
    typographyStyles,
  ])

  return {
    pendingReflow,
    reflowToast,
    applyPendingReflow,
    cancelPendingReflow,
    dismissReflowToast,
    clearTransientState,
  }
}
