import {
  computeAutoFitBatch,
  type AutoFitPlannerInput,
  type AutoFitPlannerOutput,
} from "@/lib/autofit-planner"
import {
  applyCanvasTextConfig,
  buildCanvasFont,
  measureCanvasTextWidth,
} from "@/lib/text-rendering"

type AutoFitRequest = {
  id: number
  input: AutoFitPlannerInput
}

type AutoFitResponse = {
  id: number
  output: AutoFitPlannerOutput
}

const measureCache = new Map<string, number>()
let ctx: OffscreenCanvasRenderingContext2D | null = null

function getCtx(): OffscreenCanvasRenderingContext2D | null {
  if (ctx) return ctx
  if (typeof OffscreenCanvas === "undefined") return null
  const canvas = new OffscreenCanvas(1, 1)
  const next = canvas.getContext("2d")
  ctx = next
  return next
}

self.onmessage = (event: MessageEvent<AutoFitRequest>) => {
  const { id, input } = event.data
  const context = getCtx()
  if (!context) {
    const fallback: AutoFitResponse = { id, output: { spanUpdates: {}, positionUpdates: {} } }
    self.postMessage(fallback)
    return
  }
  const output = computeAutoFitBatch(input, (style, text) => {
    const font = buildCanvasFont(style.fontFamily, style.fontWeight, style.italic, style.size)
    const key = `${font}::${style.opticalKerning ? 1 : 0}::${style.trackingScale}::${text}`
    const cached = measureCache.get(key)
    if (cached !== undefined) return cached
    applyCanvasTextConfig(context, {
      font,
      opticalKerning: style.opticalKerning,
    })
    const width = measureCanvasTextWidth(context, text, style.trackingScale, style.size)
    measureCache.set(key, width)
    if (measureCache.size > 8000) measureCache.clear()
    return width
  })
  const response: AutoFitResponse = { id, output }
  self.postMessage(response)
}

export {}
