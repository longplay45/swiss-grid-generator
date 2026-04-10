import { useEffect, useRef } from "react"

type Args<Snapshot> = {
  buildSnapshot: () => Snapshot
  debounceMs: number
  enabled?: boolean
  onLayoutChange?: ((layout: Snapshot) => void) | undefined
}

export function usePreviewLayoutEmission<Snapshot>({
  buildSnapshot,
  debounceMs,
  enabled = true,
  onLayoutChange,
}: Args<Snapshot>) {
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || !onLayoutChange) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      onLayoutChange(buildSnapshot())
    }, debounceMs)

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [buildSnapshot, debounceMs, enabled, onLayoutChange])
}
