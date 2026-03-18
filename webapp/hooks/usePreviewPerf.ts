import { useCallback, useEffect, useRef, useState } from "react"

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

function readPerfPayload(): PerfPayload | undefined {
  return window.__sggPerf
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
  const [showPerfOverlay, setShowPerfOverlay] = useState(false)
  const [perfOverlay, setPerfOverlay] = useState<PerfPayload | null>(null)

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
    setPerfOverlay(payload)
    const now = Date.now()
    if (now - state.lastLogAt < logIntervalMs) return
    state.lastLogAt = now
    console.debug("[SGG perf]", payload)
  }, [enabled, logIntervalMs, sampleLimit])

  useEffect(() => {
    if (!enabled) return
    const syncPerfOverlay = () => {
      const perf = readPerfPayload()
      if (!perf) return
      setPerfOverlay(perf)
    }
    syncPerfOverlay()
    const timer = window.setInterval(syncPerfOverlay, 500)
    return () => window.clearInterval(timer)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return
      if (event.key.toLowerCase() !== "p") return
      event.preventDefault()
      setShowPerfOverlay((prev) => !prev)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabled])

  return {
    showPerfOverlay,
    perfOverlay,
    recordPerfMetric,
  }
}
