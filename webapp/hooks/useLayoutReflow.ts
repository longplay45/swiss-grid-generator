import { useCallback, useEffect, useRef } from "react"

import type { AutoFitPlannerInput, AutoFitStyle } from "@/lib/autofit-planner"
import {
  findTextLayerGridReductionConflicts,
  getGridReductionWarningMessage,
} from "@/lib/grid-reduction-validation"
import type { ModulePosition, TextBlockPosition } from "@/lib/types/layout-primitives"

type Args<BlockId extends string> = {
  suppressReflowCheckRef: { current: boolean }
  blockOrder: BlockId[]
  blockColumnSpans: Partial<Record<BlockId, number>>
  blockGridPositions: Partial<Record<BlockId, TextBlockPosition>>
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
  getBlockFont: (key: BlockId) => AutoFitStyle["fontFamily"]
  getBlockFontWeight: (key: BlockId) => number
  getBlockTrackingScale: (key: BlockId) => number
  getBlockFontSize: (key: BlockId, styleKey: string) => number
  getBlockBaselineMultiplier: (key: BlockId, styleKey: string) => number
  isBlockItalic: (key: BlockId) => boolean
  isBlockOpticalKerningEnabled: (key: BlockId) => boolean
  isTextReflowEnabled: (key: BlockId) => boolean
  isSyllableDivisionEnabled: (key: BlockId) => boolean
  onRequestGridRestore?: (cols: number, rows: number) => void
  onRequestGridReductionWarning?: (message: string) => void
  setBlockColumnSpans: (next: (prev: Partial<Record<BlockId, number>>) => Partial<Record<BlockId, number>>) => void
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
  recordPerfMetric: (metric: "autofitMs", valueMs: number) => void
}

export function useLayoutReflow<BlockId extends string>({
  suppressReflowCheckRef,
  blockOrder,
  blockColumnSpans,
  blockGridPositions,
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
  getBlockFont,
  getBlockFontWeight,
  getBlockTrackingScale,
  getBlockFontSize,
  getBlockBaselineMultiplier,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  onRequestGridRestore,
  onRequestGridReductionWarning,
  setBlockColumnSpans,
  postAutoFitRequest,
  cancelAutoFitWorkerRequest,
  computeAutoFitFallback,
  recordPerfMetric,
}: Args<BlockId>) {
  const AUTOFIT_REQUEST_DEBOUNCE_MS = 80
  const previousGridRef = useRef<{ cols: number; rows: number } | null>(null)
  const lastAutoFitSettingsRef = useRef<string>("")

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

  useEffect(() => {
    const currentGrid = { cols: gridCols, rows: gridRows }
    if (!previousGridRef.current) {
      previousGridRef.current = currentGrid
      return
    }
    if (suppressReflowCheckRef.current) {
      previousGridRef.current = currentGrid
      suppressReflowCheckRef.current = false
      return
    }

    const previousGrid = previousGridRef.current
    const reducedColumns = currentGrid.cols < previousGrid.cols
    const reducedRows = currentGrid.rows < previousGrid.rows
    if (!reducedColumns && !reducedRows) {
      previousGridRef.current = currentGrid
      return
    }

    const reductionConflicts = findTextLayerGridReductionConflicts({
      blockOrder,
      blockModulePositions: blockGridPositions,
      resolveBlockSpan: (key) => blockColumnSpans[key] ?? getDefaultColumnSpan(key, previousGrid.cols),
      resolveBlockRows: getBlockRows,
      nextGridCols: currentGrid.cols,
      nextGridRows: currentGrid.rows,
    })
    const hasColumnConflict = reducedColumns && reductionConflicts.columnConflicts.length > 0
    const hasRowConflict = reducedRows && reductionConflicts.rowConflicts.length > 0

    if (hasColumnConflict || hasRowConflict) {
      previousGridRef.current = previousGrid
      onRequestGridReductionWarning?.(
        hasColumnConflict && hasRowConflict
          ? getGridReductionWarningMessage("grid")
          : hasColumnConflict
            ? getGridReductionWarningMessage("columns")
            : getGridReductionWarningMessage("rows"),
      )
      onRequestGridRestore?.(previousGrid.cols, previousGrid.rows)
      return
    }

    previousGridRef.current = currentGrid
  }, [
    blockColumnSpans,
    blockGridPositions,
    blockOrder,
    getBlockRows,
    getDefaultColumnSpan,
    gridCols,
    gridRows,
    onRequestGridReductionWarning,
    onRequestGridRestore,
    suppressReflowCheckRef,
  ])

  useEffect(() => {
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
          fontFamily: getBlockFont(key),
          fontWeight: getBlockFontWeight(key),
          italic: isBlockItalic(key),
          opticalKerning: isBlockOpticalKerningEnabled(key),
          trackingScale: getBlockTrackingScale(key),
          size: getBlockFontSize(key, styleKey),
          baselineMultiplier: getBlockBaselineMultiplier(key, styleKey),
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
        if (Object.keys(output.spanUpdates).length > 0) {
          setBlockColumnSpans((prev) => ({ ...prev, ...output.spanUpdates }))
        }
      }).catch(() => {
        if (cancelled) return
        markEnd(autoFitMarkName)
        recordPerfMetric("autofitMs", performance.now() - autoFitStartedAt)
        const fallback = computeAutoFitFallback(input)
        if (Object.keys(fallback.spanUpdates).length > 0) {
          setBlockColumnSpans((prev) => ({ ...prev, ...fallback.spanUpdates }))
        }
      })
    }, AUTOFIT_REQUEST_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timeoutId)
      cancelled = true
      cancelAutoFitWorkerRequest(requestId)
    }
  }, [
    AUTOFIT_REQUEST_DEBOUNCE_MS,
    blockModulePositions,
    blockOrder,
    cancelAutoFitWorkerRequest,
    computeAutoFitFallback,
    getBlockBaselineMultiplier,
    getBlockFont,
    getBlockFontSize,
    getBlockFontWeight,
    getBlockRows,
    getBlockSpan,
    getBlockTrackingScale,
    getStyleKeyForBlock,
    gridCols,
    gridMarginVertical,
    gridRows,
    gridUnit,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    marginBottom,
    marginTop,
    markEnd,
    markStart,
    moduleHeight,
    moduleHeights,
    moduleRowStarts,
    moduleWidth,
    moduleWidths,
    pageHeight,
    postAutoFitRequest,
    recordPerfMetric,
    scale,
    setBlockColumnSpans,
    textContent,
    typographyStyles,
  ])

  return {}
}
