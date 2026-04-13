import { useCallback, useMemo } from "react"
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react"

import {
  computeAutoFitBatch,
  type AutoFitPlannerInput,
  type AutoFitStyle,
} from "@/lib/autofit-planner"
import type { GridResult } from "@/lib/grid-calculator"
import { buildAxisStarts, resolveAxisSizes } from "@/lib/grid-rhythm"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  measureCanvasTextWidth,
} from "@/lib/text-rendering"
import {
  measureTrackedTextRangeWidth,
  normalizeTextTrackingRuns,
  type TextRange,
  type TextTrackingRun,
} from "@/lib/text-tracking-runs"
import type { ModulePosition, TextBlockPosition } from "@/lib/types/preview-layout"
import { useLayoutReflow } from "@/hooks/useLayoutReflow"
import { useWorkerBridge } from "@/hooks/useWorkerBridge"

type Args<Key extends string> = {
  suppressReflowCheckRef: MutableRefObject<boolean>
  blockOrder: Key[]
  blockColumnSpans: Partial<Record<Key, number>>
  blockGridPositions: Partial<Record<Key, TextBlockPosition>>
  blockModulePositions: Partial<Record<Key, ModulePosition>>
  imageOrder: Key[]
  imageGridPositions: Partial<Record<Key, TextBlockPosition>>
  textContent: Record<Key, string>
  scale: number
  result: GridResult
  getDefaultColumnSpan: (key: Key, gridCols: number) => number
  getBlockRows: (key: Key) => number
  getBlockHeightBaselines: (key: Key) => number
  getBlockSpan: (key: Key) => number
  getImageRows: (key: Key) => number
  getImageSpan: (key: Key) => number
  getStyleKeyForBlock: (key: Key) => string
  getBlockFont: (key: Key) => AutoFitStyle["fontFamily"]
  getBlockFontWeight: (key: Key) => number
  getBlockTrackingScale: (key: Key) => number
  getBlockTrackingRuns: (key: Key) => TextTrackingRun[]
  getBlockFontSize: (key: Key, styleKey: string) => number
  getBlockBaselineMultiplier: (key: Key, styleKey: string) => number
  isBlockItalic: (key: Key) => boolean
  isBlockOpticalKerningEnabled: (key: Key) => boolean
  isTextReflowEnabled: (key: Key) => boolean
  isSyllableDivisionEnabled: (key: Key) => boolean
  onRequestGridRestore?: (cols: number, rows: number) => void
  onRequestGridReductionWarning?: (message: string) => void
  setBlockColumnSpans: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  canvasRef: RefObject<HTMLCanvasElement | null>
  recordPerfMetric: (metric: "autofitMs", valueMs: number) => void
}

export function usePreviewLayoutReflowController<Key extends string>({
  suppressReflowCheckRef,
  blockOrder,
  blockColumnSpans,
  blockGridPositions,
  blockModulePositions,
  imageOrder,
  imageGridPositions,
  textContent,
  scale,
  result,
  getDefaultColumnSpan,
  getBlockRows,
  getBlockHeightBaselines,
  getBlockSpan,
  getImageRows,
  getImageSpan,
  getStyleKeyForBlock,
  getBlockFont,
  getBlockFontWeight,
  getBlockTrackingScale,
  getBlockTrackingRuns,
  getBlockFontSize,
  getBlockBaselineMultiplier,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  onRequestGridRestore,
  onRequestGridReductionWarning,
  setBlockColumnSpans,
  canvasRef,
  recordPerfMetric,
}: Args<Key>) {
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
    computeAutoFitBatch(input, (style, text, range, sourceText) => {
      const canvas = canvasRef.current
      if (!canvas) return 0
      const ctx = canvas.getContext("2d")
      if (!ctx) return 0
      applyCanvasTextConfig(ctx, {
        font: buildCanvasFont(style.fontFamily, style.fontWeight, style.italic, style.size),
        opticalKerning: style.opticalKerning,
      })
      if (range && sourceText && style.trackingRuns.length > 0) {
        return measureTrackedTextRangeWidth(ctx, {
          sourceText,
          renderedText: text,
          range: range as TextRange,
          baseTrackingScale: style.trackingScale,
          runs: normalizeTextTrackingRuns(sourceText, style.trackingRuns, style.trackingScale),
          fontSize: style.size,
          opticalKerning: style.opticalKerning,
        })
      }
      return measureCanvasTextWidth(ctx, text, style.trackingScale, style.size, style.opticalKerning)
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

  return useLayoutReflow<Key>({
    suppressReflowCheckRef,
    blockOrder,
    blockColumnSpans,
    blockGridPositions,
    blockModulePositions,
    imageOrder,
    imageGridPositions,
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
    getBlockHeightBaselines,
    getBlockSpan,
    getImageRows,
    getImageSpan,
    getStyleKeyForBlock,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
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
  })
}
