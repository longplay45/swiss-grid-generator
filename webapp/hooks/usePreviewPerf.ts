import { useCallback, useRef } from "react"

type PerfMetricName = "drawMs" | "reflowMs" | "autofitMs"

type PerfSnapshot = {
  timestamp: number
  sampleCount: number
  p50: number
  p95: number
  avg: number
}

type PerfPayload = {
  draw: PerfSnapshot | null
  reflow: PerfSnapshot | null
  autofit: PerfSnapshot | null
}

type PerfState = {
  drawMs: number[]
  reflowMs: number[]
  autofitMs: number[]
  lastLogAt: number
}

type Args = {
  enabled: boolean
  logIntervalMs: number
  sampleLimit: number
}

declare global {
  interface Window {
    __sggPerf?: PerfPayload
  }
}

function computePerfSnapshot(values: number[]): PerfSnapshot | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]
  const sum = sorted.reduce((acc, value) => acc + value, 0)
  return {
    timestamp: Date.now(),
    sampleCount: sorted.length,
    p50: pick(0.5),
    p95: pick(0.95),
    avg: sum / sorted.length,
  }
}

function writePerfPayload(payload: PerfPayload) {
  window.__sggPerf = payload
}

export function usePreviewPerf({ enabled, logIntervalMs, sampleLimit }: Args) {
  const perfStateRef = useRef<PerfState>({
    drawMs: [],
    reflowMs: [],
    autofitMs: [],
    lastLogAt: 0,
  })

  const recordPerfMetric = useCallback((metric: PerfMetricName, valueMs: number) => {
    if (!enabled || !Number.isFinite(valueMs)) return
    const state = perfStateRef.current
    const bucket = state[metric]
    bucket.push(valueMs)
    if (bucket.length > sampleLimit) bucket.shift()
    const payload = {
      draw: computePerfSnapshot(state.drawMs),
      reflow: computePerfSnapshot(state.reflowMs),
      autofit: computePerfSnapshot(state.autofitMs),
    }
    writePerfPayload(payload)
    const now = Date.now()
    if (now - state.lastLogAt < logIntervalMs) return
    state.lastLogAt = now
    console.debug("[SGG perf]", payload)
  }, [enabled, logIntervalMs, sampleLimit])

  return {
    recordPerfMetric,
  }
}
