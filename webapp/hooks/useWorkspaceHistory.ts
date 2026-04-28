import { useCallback, useEffect, useRef, useState } from "react"

import { useSettingsHistory } from "@/hooks/useSettingsHistory"
import type { UiSettingsSnapshot } from "@/hooks/useSettingsHistory"

type HistoryDomain = "settings" | "preview" | "project"

const GLOBAL_HISTORY_LIMIT = 150

type Args = {
  buildUiSnapshot: () => UiSettingsSnapshot
  onApplyUiSnapshot: (snapshot: UiSettingsSnapshot) => void
  requestPreviewUndo: () => void
  requestPreviewRedo: () => void
  requestProjectUndo: () => void
  requestProjectRedo: () => void
}

export function useWorkspaceHistory({
  buildUiSnapshot,
  onApplyUiSnapshot,
  requestPreviewUndo,
  requestPreviewRedo,
  requestProjectUndo,
  requestProjectRedo,
}: Args) {
  const [undoDomains, setUndoDomains] = useState<HistoryDomain[]>([])
  const [redoDomains, setRedoDomains] = useState<HistoryDomain[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const undoDomainsRef = useRef<HistoryDomain[]>([])
  const redoDomainsRef = useRef<HistoryDomain[]>([])
  const isDirtyRef = useRef(false)

  useEffect(() => {
    undoDomainsRef.current = undoDomains
  }, [undoDomains])

  useEffect(() => {
    redoDomainsRef.current = redoDomains
  }, [redoDomains])

  const recordHistoryDomain = useCallback((domain: HistoryDomain) => {
    setUndoDomains((prev) => {
      const next = [...prev, domain]
      return next.length > GLOBAL_HISTORY_LIMIT ? next.slice(next.length - GLOBAL_HISTORY_LIMIT) : next
    })
    setRedoDomains([])
    isDirtyRef.current = true
    setIsDirty(true)
  }, [])

  const resetHistoryDomains = useCallback(() => {
    setUndoDomains([])
    setRedoDomains([])
  }, [])

  const settingsHistory = useSettingsHistory(buildUiSnapshot, {
    onRecordHistory: () => recordHistoryDomain("settings"),
  })
  const {
    suppressNext,
    setCurrentSnapshot,
    reset: resetSettingsHistory,
    undo: undoSettings,
    redo: redoSettings,
  } = settingsHistory

  const applyUiSnapshot = useCallback((snapshot: UiSettingsSnapshot) => {
    suppressNext()
    onApplyUiSnapshot(snapshot)
    setCurrentSnapshot(snapshot)
  }, [onApplyUiSnapshot, setCurrentSnapshot, suppressNext])

  const undoAny = useCallback(() => {
    const domain = undoDomainsRef.current[undoDomainsRef.current.length - 1]
    if (!domain) return

    if (domain === "settings") undoSettings(applyUiSnapshot)
    else if (domain === "preview") requestPreviewUndo()
    else requestProjectUndo()

    setUndoDomains((prev) => prev.slice(0, -1))
    setRedoDomains((prev) => {
      const next = [...prev, domain]
      return next.length > GLOBAL_HISTORY_LIMIT ? next.slice(next.length - GLOBAL_HISTORY_LIMIT) : next
    })
  }, [applyUiSnapshot, requestPreviewUndo, undoSettings])

  const redoAny = useCallback(() => {
    const domain = redoDomainsRef.current[redoDomainsRef.current.length - 1]
    if (!domain) return

    if (domain === "settings") redoSettings(applyUiSnapshot)
    else if (domain === "preview") requestPreviewRedo()
    else requestProjectRedo()

    setRedoDomains((prev) => prev.slice(0, -1))
    setUndoDomains((prev) => {
      const next = [...prev, domain]
      return next.length > GLOBAL_HISTORY_LIMIT ? next.slice(next.length - GLOBAL_HISTORY_LIMIT) : next
    })
  }, [applyUiSnapshot, redoSettings, requestPreviewRedo])

  const handlePreviewHistoryRecord = useCallback(() => {
    recordHistoryDomain("preview")
  }, [recordHistoryDomain])

  const handleProjectHistoryRecord = useCallback(() => {
    recordHistoryDomain("project")
  }, [recordHistoryDomain])

  const markDirty = useCallback(() => {
    isDirtyRef.current = true
    setIsDirty(true)
  }, [])

  const markClean = useCallback(() => {
    isDirtyRef.current = false
    setIsDirty(false)
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  return {
    suppressNextSettingsHistory: suppressNext,
    resetSettingsHistory,
    resetHistoryDomains,
    canUndo: undoDomains.length > 0,
    canRedo: redoDomains.length > 0,
    isDirty,
    undoAny,
    redoAny,
    handlePreviewHistoryRecord,
    handleProjectHistoryRecord,
    markDirty,
    markClean,
  }
}
