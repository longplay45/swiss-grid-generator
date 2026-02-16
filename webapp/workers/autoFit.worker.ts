import {
  computeAutoFitBatch,
  type AutoFitPlannerInput,
  type AutoFitPlannerOutput,
} from "@/lib/autofit-planner"

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
  const output = computeAutoFitBatch(input, (font, text) => {
    const key = `${font}::${text}`
    const cached = measureCache.get(key)
    if (cached !== undefined) return cached
    context.font = font
    const width = context.measureText(text).width
    measureCache.set(key, width)
    if (measureCache.size > 8000) measureCache.clear()
    return width
  })
  const response: AutoFitResponse = { id, output }
  self.postMessage(response)
}

export {}
