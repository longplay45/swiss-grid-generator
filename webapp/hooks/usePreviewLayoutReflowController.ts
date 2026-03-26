import { useCallback, useMemo, useRef } from "react"
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react"

import {
  computeAutoFitBatch,
  type AutoFitPlannerInput,
  type AutoFitStyle,
} from "@/lib/autofit-planner"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  measureCanvasTextWidth,
} from "@/lib/text-rendering"
import type { GridResult } from "@/lib/grid-calculator"
import { buildAxisStarts, resolveAxisSizes } from "@/lib/grid-rhythm"
import {
  computeReflowPlan as computeReflowPlanPure,
  createReflowPlanSignature,
  type ReflowPlan,
  type ReflowPlannerInput,
} from "@/lib/reflow-planner"
import type { ModulePosition } from "@/lib/types/preview-layout"
import { useLayoutReflow } from "@/hooks/useLayoutReflow"
import { useWorkerBridge } from "@/hooks/useWorkerBridge"

const REFLOW_PLAN_CACHE_LIMIT = 200

type Args<Key extends string, Snapshot> = {
  suppressReflowCheckRef: MutableRefObject<boolean>
  blockOrder: Key[]
  blockColumnSpans: Partial<Record<Key, number>>
  blockModulePositions: Partial<Record<Key, ModulePosition>>
  textContent: Record<Key, string>
  scale: number
  result: GridResult
  getDefaultColumnSpan: (key: Key, gridCols: number) => number
  getBlockRows: (key: Key) => number
  getBlockSpan: (key: Key) => number
  getStyleKeyForBlock: (key: Key) => string
  getBlockFont: (key: Key) => AutoFitStyle["fontFamily"]
  getBlockFontWeight: (key: Key) => number
  getBlockTrackingScale: (key: Key) => number
  getBlockFontSize: (key: Key, styleKey: string) => number
  getBlockBaselineMultiplier: (key: Key, styleKey: string) => number
  isBlockItalic: (key: Key) => boolean
  isBlockOpticalKerningEnabled: (key: Key) => boolean
  isTextReflowEnabled: (key: Key) => boolean
  isSyllableDivisionEnabled: (key: Key) => boolean
  buildSnapshot: () => Snapshot
  pushHistory: (snapshot: Snapshot) => void
  onRequestGridRestore?: (cols: number, rows: number) => void
  setBlockColumnSpans: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  setBlockModulePositions: Dispatch<SetStateAction<Partial<Record<Key, ModulePosition>>>>
  canvasRef: RefObject<HTMLCanvasElement | null>
  recordPerfMetric: (metric: "reflowMs" | "autofitMs", valueMs: number) => void
}

export function usePreviewLayoutReflowController<Key extends string, Snapshot>({
  suppressReflowCheckRef,
  blockOrder,
  blockColumnSpans,
  blockModulePositions,
  textContent,
  scale,
  result,
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
  buildSnapshot,
  pushHistory,
  onRequestGridRestore,
  setBlockColumnSpans,
  setBlockModulePositions,
  canvasRef,
  recordPerfMetric,
}: Args<Key, Snapshot>) {
  const reflowPlanCacheRef = useRef<Map<string, ReflowPlan>>(new Map())

  const moduleWidths = useMemo(
    () => resolveAxisSizes(result.module.widths, result.settings.gridCols, result.module.width),
    [result.module.widths, result.module.width, result.settings.gridCols],
  )
  const moduleHeights = useMemo(
    () => resolveAxisSizes(result.module.heights, result.settings.gridRows, result.module.height),
    [result.module.heights, result.module.height, result.settings.gridRows],
  )
  const moduleRowStarts = useMemo(
    () => buildAxisStarts(moduleHeights, result.grid.gridMarginVertical).map((value) => value / Math.max(0.0001, result.grid.gridUnit)),
    [moduleHeights, result.grid.gridMarginVertical, result.grid.gridUnit],
  )

  const buildReflowPlannerInput = useCallback((
    gridCols: number,
    gridRows: number,
    sourcePositions: Partial<Record<Key, ModulePosition>> = blockModulePositions,
  ): ReflowPlannerInput => {
    const nextModuleHeights = resolveAxisSizes(result.module.heights, gridRows, result.module.height)
    const rowStarts = buildAxisStarts(nextModuleHeights, result.grid.gridMarginVertical)
    const rowStartsInBaselines = rowStarts.map((value) => value / Math.max(0.0001, result.grid.gridUnit))
    return {
      moduleRowStarts: rowStartsInBaselines,
      gridCols,
      gridRows,
      blockOrder,
      blockColumnSpans,
      sourcePositions,
      pageHeight: result.pageSizePt.height,
      marginTop: result.grid.margins.top,
      marginBottom: result.grid.margins.bottom,
      gridUnit: result.grid.gridUnit,
      moduleHeight: result.module.height,
      gridMarginVertical: result.grid.gridMarginVertical,
    }
  }, [
    blockColumnSpans,
    blockModulePositions,
    blockOrder,
    result.grid.gridMarginVertical,
    result.grid.gridUnit,
    result.grid.margins.bottom,
    result.grid.margins.top,
    result.module.heights,
    result.module.height,
    result.pageSizePt.height,
  ])

  const computeReflowPlan = useCallback((input: ReflowPlannerInput): ReflowPlan => {
    const signature = createReflowPlanSignature(input)
    const cached = reflowPlanCacheRef.current.get(signature)
    if (cached) return cached
    const plan = computeReflowPlanPure(input)
    reflowPlanCacheRef.current.set(signature, plan)
    if (reflowPlanCacheRef.current.size > REFLOW_PLAN_CACHE_LIMIT) {
      const firstKey = reflowPlanCacheRef.current.keys().next().value
      if (firstKey) reflowPlanCacheRef.current.delete(firstKey)
    }
    return plan
  }, [])

  const {
    postRequest: postReflowWorkerRequest,
    cancelRequest: cancelReflowWorkerRequest,
  } = useWorkerBridge<ReflowPlannerInput, ReflowPlan>({
    strategy: "latest",
    createWorker: () => new Worker(new URL("../workers/reflowPlanner.worker.ts", import.meta.url)),
    parseMessage: (data) => {
      if (!data || typeof data !== "object") return null
      const typed = data as { id?: unknown; plan?: ReflowPlan }
      if (typeof typed.id !== "number" || !typed.plan) return null
      return { id: typed.id, result: typed.plan }
    },
  })

  const postReflowPlanRequest = useCallback((input: ReflowPlannerInput) => {
    const workerRequest = postReflowWorkerRequest(input)
    if (!workerRequest) {
      return {
        requestId: -1,
        promise: Promise.resolve(computeReflowPlan(input)),
      }
    }
    return workerRequest
  }, [computeReflowPlan, postReflowWorkerRequest])

  const {
    postRequest: postAutoFitWorkerRequest,
    cancelRequest: cancelAutoFitWorkerRequest,
  } = useWorkerBridge<
    AutoFitPlannerInput,
    {
      spanUpdates: Partial<Record<string, number>>
      positionUpdates: Partial<Record<string, ModulePosition>>
    }
  >({
    enabled: typeof OffscreenCanvas !== "undefined",
    strategy: "latest",
    createWorker: () => new Worker(new URL("../workers/autoFit.worker.ts", import.meta.url)),
    parseMessage: (data) => {
      if (!data || typeof data !== "object") return null
      const typed = data as {
        id?: unknown
        output?: {
          spanUpdates: Partial<Record<string, number>>
          positionUpdates: Partial<Record<string, ModulePosition>>
        }
      }
      if (typeof typed.id !== "number" || !typed.output) return null
      return { id: typed.id, result: typed.output }
    },
  })

  const computeAutoFitFallback = useCallback((input: AutoFitPlannerInput) => (
    computeAutoFitBatch(input, (style, text) => {
      const canvas = canvasRef.current
      if (!canvas) return 0
      const ctx = canvas.getContext("2d")
      if (!ctx) return 0
      applyCanvasTextConfig(ctx, {
        font: buildCanvasFont(style.fontFamily, style.fontWeight, style.italic, style.size),
        opticalKerning: style.opticalKerning,
      })
      return measureCanvasTextWidth(ctx, text, style.trackingScale, style.size)
    })
  ), [canvasRef])

  const postAutoFitRequest = useCallback((input: AutoFitPlannerInput) => {
    const workerRequest = postAutoFitWorkerRequest(input)
    if (!workerRequest) {
      return {
        requestId: -1,
        promise: Promise.resolve(computeAutoFitFallback(input)),
      }
    }
    return workerRequest
  }, [computeAutoFitFallback, postAutoFitWorkerRequest])

  return useLayoutReflow<Key, ReflowPlannerInput, Snapshot>({
    suppressReflowCheckRef,
    blockOrder,
    blockColumnSpans,
    blockModulePositions,
    textContent,
    scale,
    gridCols: result.settings.gridCols,
    gridRows: result.settings.gridRows,
    moduleWidth: result.module.width,
    moduleHeight: result.module.height,
    moduleWidths,
    moduleHeights,
    moduleRowStarts,
    gridUnit: result.grid.gridUnit,
    gridMarginVertical: result.grid.gridMarginVertical,
    marginTop: result.grid.margins.top,
    marginBottom: result.grid.margins.bottom,
    pageHeight: result.pageSizePt.height,
    typographyStyles: result.typography.styles,
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
  })
}
