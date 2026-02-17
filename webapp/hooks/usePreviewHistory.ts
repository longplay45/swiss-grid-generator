import { useCallback, useEffect, useRef, useState } from "react"

type Args<T> = {
  historyLimit: number
  undoNonce: number
  redoNonce: number
  buildSnapshot: () => T
  applySnapshot: (snapshot: T) => void
  onClearTransient?: () => void
  onHistoryAvailabilityChange?: (canUndo: boolean, canRedo: boolean) => void
}

export function usePreviewHistory<T>({
  historyLimit,
  undoNonce,
  redoNonce,
  buildSnapshot,
  applySnapshot,
  onClearTransient,
  onHistoryAvailabilityChange,
}: Args<T>) {
  const [historyPast, setHistoryPast] = useState<T[]>([])
  const [historyFuture, setHistoryFuture] = useState<T[]>([])
  const lastUndoNonceRef = useRef(undoNonce)
  const lastRedoNonceRef = useRef(redoNonce)

  const pushHistory = useCallback((snapshot: T) => {
    setHistoryPast((prev) => {
      const next = [...prev, snapshot]
      return next.length > historyLimit ? next.slice(next.length - historyLimit) : next
    })
    setHistoryFuture([])
  }, [historyLimit])

  const recordHistoryBeforeChange = useCallback(() => {
    pushHistory(buildSnapshot())
    onClearTransient?.()
  }, [buildSnapshot, onClearTransient, pushHistory])

  const undo = useCallback(() => {
    setHistoryPast((prev) => {
      if (!prev.length) return prev
      const current = buildSnapshot()
      const nextPast = prev.slice(0, -1)
      const previous = prev[prev.length - 1]
      setHistoryFuture((future) => [current, ...future].slice(0, historyLimit))
      applySnapshot(previous)
      onClearTransient?.()
      return nextPast
    })
  }, [applySnapshot, buildSnapshot, historyLimit, onClearTransient])

  const redo = useCallback(() => {
    setHistoryFuture((future) => {
      if (!future.length) return future
      const current = buildSnapshot()
      const [nextSnapshot, ...rest] = future
      setHistoryPast((prev) => {
        const next = [...prev, current]
        return next.length > historyLimit ? next.slice(next.length - historyLimit) : next
      })
      applySnapshot(nextSnapshot)
      onClearTransient?.()
      return rest
    })
  }, [applySnapshot, buildSnapshot, historyLimit, onClearTransient])

  useEffect(() => {
    onHistoryAvailabilityChange?.(historyPast.length > 0, historyFuture.length > 0)
  }, [historyFuture.length, historyPast.length, onHistoryAvailabilityChange])

  useEffect(() => {
    if (undoNonce === lastUndoNonceRef.current) return
    lastUndoNonceRef.current = undoNonce
    undo()
  }, [undo, undoNonce])

  useEffect(() => {
    if (redoNonce === lastRedoNonceRef.current) return
    lastRedoNonceRef.current = redoNonce
    redo()
  }, [redo, redoNonce])

  return {
    pushHistory,
    recordHistoryBeforeChange,
    undo,
    redo,
    canUndo: historyPast.length > 0,
    canRedo: historyFuture.length > 0,
  }
}
