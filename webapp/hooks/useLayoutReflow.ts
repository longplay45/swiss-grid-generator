import { useCallback, useEffect, useRef, useState } from "react"

import type { AutoFitPlannerInput } from "@/lib/autofit-planner"
import { findNearestAxisIndex } from "@/lib/grid-rhythm"
import type { ModulePosition } from "@/lib/types/layout-primitives"

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
  moduleWidths: number[]
  moduleHeights: number[]
  moduleRowStarts: number[]
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
  getBlockFontSize: (key: BlockId, styleKey: string) => number
  getBlockBaselineMultiplier: (key: BlockId, styleKey: string) => number
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
  moduleWidths,
  moduleHeights,
  moduleRowStarts,
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
  getBlockFontSize,
  getBlockBaselineMultiplier,
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
  const AUTOFIT_REQUEST_DEBOUNCE_MS = 80
  const previousGridRef = useRef<{ cols: number; rows: number } | null>(null)
  const previousModuleRowsRef = useRef<number[] | null>(null)
  const lastAutoFitSettingsRef = useRef<string>("")
  const [pendingReflow, setPendingReflow] = useState<PendingReflow<BlockId> | null>(null)
  const [reflowToast, setReflowToast] = useState<{ movedCount: number } | null>(null)

  const markStart = useCallback((name: string) => {
    if (typeof performance.mark !== "function") return
    performance.mark(`${name}:start`)
  }, [])

  const markEnd = useCallback((name: string) => {
    if (typeof performance.mark !== "function" || typeof performance.measure !== "function") return
    const start = `${name}:start`
    const end = `${name}:end`
    performance.mark(end)
    try {
      performance.measure(name, start, end)
    } catch {
      // Ignore missing/invalid marks.
    }
  }, [])

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
    previousModuleRowsRef.current = null
    setReflowToast({ movedCount: pendingReflow.movedCount })
    setPendingReflow(null)
  }, [buildSnapshot, pendingReflow, pushHistory, setBlockColumnSpans, setBlockModulePositions])

  const cancelPendingReflow = useCallback(() => {
    if (!pendingReflow) return
    previousGridRef.current = pendingReflow.previousGrid
    previousModuleRowsRef.current = null
    setPendingReflow(null)
    onRequestGridRestore?.(pendingReflow.previousGrid.cols, pendingReflow.previousGrid.rows)
  }, [onRequestGridRestore, pendingReflow])

  useEffect(() => {
    const currentGrid = { cols: gridCols, rows: gridRows }
    const currentModuleRowStep = Math.max(0.0001, (moduleHeight + gridMarginVertical) / gridUnit)
    const currentModuleRows = (
      moduleRowStarts.length > 0
        ? moduleRowStarts
        : Array.from({ length: Math.max(1, gridRows) }, (_, index) => index * currentModuleRowStep)
    ).map((value) => Math.max(0, value))
    const maxBaselineRow = Math.max(0, Math.floor((pageHeight - marginTop - marginBottom) / gridUnit))

    const remapRowsToCurrentModules = (fromModuleRows: number[]) => {
      setBlockModulePositions((prev) => {
        let changed = false
        const next: Partial<Record<BlockId, ModulePosition>> = { ...prev }
        for (const key of blockOrder) {
          const position = prev[key]
          if (!position) continue
          const moduleIndex = findNearestAxisIndex(fromModuleRows, position.row)
          const fromStart = fromModuleRows[moduleIndex] ?? 0
          const targetStart = currentModuleRows[Math.min(moduleIndex, Math.max(0, currentModuleRows.length - 1))] ?? 0
          const baselineOffset = position.row - fromStart
          const remappedRow = targetStart + baselineOffset
          const clampedRow = Math.max(-maxBaselineRow, Math.min(maxBaselineRow, remappedRow))
          if (Math.abs(clampedRow - position.row) > 0.0001) {
            next[key] = { ...position, row: clampedRow }
            changed = true
          }
        }
        return changed ? next : prev
      })
    }

    if (!previousGridRef.current) {
      previousGridRef.current = currentGrid
      previousModuleRowsRef.current = currentModuleRows
      return
    }
    if (suppressReflowCheckRef.current) {
      previousGridRef.current = currentGrid
      previousModuleRowsRef.current = currentModuleRows
      suppressReflowCheckRef.current = false
      return
    }
    if (pendingReflow) return

    const previousGrid = previousGridRef.current
    const previousModuleRows = previousModuleRowsRef.current ?? currentModuleRows
    const gridChanged = previousGrid.cols !== currentGrid.cols || previousGrid.rows !== currentGrid.rows
    const moduleRowStepChanged = (
      previousModuleRows.length !== currentModuleRows.length
      || previousModuleRows.some((value, index) => Math.abs(value - (currentModuleRows[index] ?? value)) > 0.0001)
    )
    if (!gridChanged && !moduleRowStepChanged) return

    // For ratio/orientation/baseline/gutter changes (or row/col increases), preserve
    // each block's module index plus baseline offset inside that module.
    if (!gridChanged || (currentGrid.cols >= previousGrid.cols && currentGrid.rows >= previousGrid.rows)) {
      if (moduleRowStepChanged) remapRowsToCurrentModules(previousModuleRows)
      previousGridRef.current = currentGrid
      previousModuleRowsRef.current = currentModuleRows
      return
    }

    const hasGridReduction = currentGrid.cols < previousGrid.cols || currentGrid.rows < previousGrid.rows
    if (!hasGridReduction) {
      previousGridRef.current = currentGrid
      previousModuleRowsRef.current = currentModuleRows
      return
    }

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
        previousModuleRowsRef.current = currentModuleRows
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
      previousModuleRowsRef.current = currentModuleRows
    }

    const plannerInput = buildReflowPlannerInput(currentGrid.cols, currentGrid.rows, blockModulePositions)
    const reflowStartedAt = performance.now()
    const { requestId, promise } = postReflowPlanRequest(plannerInput)
    const reflowMarkName = `sgg:reflow:${requestId}`
    markStart(reflowMarkName)
    let cancelled = false
    promise
      .then((plan) => {
        if (cancelled) return
        markEnd(reflowMarkName)
        recordPerfMetric("reflowMs", performance.now() - reflowStartedAt)
        applyComputedPlan(plan)
      })
      .catch(() => {
        if (cancelled) return
        markEnd(reflowMarkName)
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
    moduleRowStarts,
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
      moduleWidths.join(","),
      moduleHeights.join(","),
      moduleRowStarts.join(","),
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
          size: getBlockFontSize(key, styleKey),
          baselineMultiplier: getBlockBaselineMultiplier(key, styleKey),
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
      moduleWidths,
      moduleHeights,
      moduleRowStarts,
      gridMarginVertical,
      gridUnit,
      marginTop,
      marginBottom,
      pageHeight,
    }

    let requestId = -1
    let cancelled = false
    let autoFitStartedAt = 0
    const timeoutId = window.setTimeout(() => {
      autoFitStartedAt = performance.now()
      const request = postAutoFitRequest(input)
      requestId = request.requestId
      const autoFitMarkName = `sgg:autofit:${requestId}`
      markStart(autoFitMarkName)
      request.promise.then((output) => {
        if (cancelled) return
        markEnd(autoFitMarkName)
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
        markEnd(autoFitMarkName)
        recordPerfMetric("autofitMs", performance.now() - autoFitStartedAt)
        const fallback = computeAutoFitFallback(input)
        if (Object.keys(fallback.spanUpdates).length > 0) {
          setBlockColumnSpans((prev) => ({ ...prev, ...fallback.spanUpdates }))
        }
        if (Object.keys(fallback.positionUpdates).length > 0) {
          setBlockModulePositions((prev) => ({ ...prev, ...fallback.positionUpdates }))
        }
      })
    }, AUTOFIT_REQUEST_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timeoutId)
      cancelled = true
      cancelAutoFitWorkerRequest(requestId)
    }
  }, [
    blockModulePositions,
    blockOrder,
    cancelAutoFitWorkerRequest,
    computeAutoFitFallback,
    getBlockRows,
    getBlockFontSize,
    getBlockBaselineMultiplier,
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
    moduleHeights,
    moduleRowStarts,
    moduleWidths,
    pageHeight,
    pendingReflow,
    postAutoFitRequest,
    recordPerfMetric,
    scale,
    setBlockColumnSpans,
    setBlockModulePositions,
    textContent,
    typographyStyles,
    AUTOFIT_REQUEST_DEBOUNCE_MS,
    markEnd,
    markStart,
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
