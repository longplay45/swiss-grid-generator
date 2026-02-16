import { useState, useRef, useEffect, useCallback } from "react"
import type { CanvasRatioKey } from "@/lib/grid-calculator"
import type { FontFamily } from "@/components/grid-preview"

export const SECTION_KEYS = ["format", "baseline", "margins", "gutter", "typo"] as const
export type SectionKey = typeof SECTION_KEYS[number]

export type UiSettingsSnapshot = {
  canvasRatio: CanvasRatioKey
  exportPaperSize: string
  exportPrintPro: boolean
  exportBleedMm: number
  exportRegistrationMarks: boolean
  exportFinalSafeGuides: boolean
  orientation: "portrait" | "landscape"
  rotation: number
  marginMethod: 1 | 2 | 3
  gridCols: number
  gridRows: number
  baselineMultiple: number
  gutterMultiple: number
  typographyScale: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci"
  baseFont: FontFamily
  customBaseline: number
  displayUnit: "pt" | "mm" | "px"
  useCustomMargins: boolean
  customMarginMultipliers: { top: number; left: number; right: number; bottom: number }
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showTypography: boolean
  collapsed: Record<SectionKey, boolean>
}

const SETTINGS_HISTORY_LIMIT = 100

export function useSettingsHistory(
  buildSnapshot: () => UiSettingsSnapshot,
  canUndoPreview: boolean,
  canRedoPreview: boolean,
) {
  const [settingsPast, setSettingsPast] = useState<UiSettingsSnapshot[]>([])
  const [settingsFuture, setSettingsFuture] = useState<UiSettingsSnapshot[]>([])
  const [undoNonce, setUndoNonce] = useState(0)
  const [redoNonce, setRedoNonce] = useState(0)
  const uiSnapshotRef = useRef<UiSettingsSnapshot | null>(null)
  const skipUiHistoryRef = useRef(false)

  // Record history whenever the snapshot changes
  useEffect(() => {
    if (!uiSnapshotRef.current) {
      uiSnapshotRef.current = buildSnapshot()
      return
    }
    const current = buildSnapshot()
    const previous = uiSnapshotRef.current
    if (JSON.stringify(current) === JSON.stringify(previous)) return

    if (skipUiHistoryRef.current) {
      skipUiHistoryRef.current = false
      uiSnapshotRef.current = current
      return
    }

    setSettingsPast((past) => {
      const next = [...past, previous]
      return next.length > SETTINGS_HISTORY_LIMIT ? next.slice(next.length - SETTINGS_HISTORY_LIMIT) : next
    })
    setSettingsFuture([])
    uiSnapshotRef.current = current
  }, [buildSnapshot])

  const undoAny = useCallback(
    (applySnapshot: (s: UiSettingsSnapshot) => void) => {
      if (settingsPast.length > 0) {
        const current = buildSnapshot()
        const previous = settingsPast[settingsPast.length - 1]
        setSettingsPast((past) => past.slice(0, -1))
        setSettingsFuture((future) => [current, ...future].slice(0, SETTINGS_HISTORY_LIMIT))
        applySnapshot(previous)
        return
      }
      setUndoNonce((n) => n + 1)
    },
    [buildSnapshot, settingsPast],
  )

  const redoAny = useCallback(
    (applySnapshot: (s: UiSettingsSnapshot) => void) => {
      if (settingsFuture.length > 0) {
        const current = buildSnapshot()
        const next = settingsFuture[0]
        setSettingsFuture((future) => future.slice(1))
        setSettingsPast((past) => {
          const withCurrent = [...past, current]
          return withCurrent.length > SETTINGS_HISTORY_LIMIT
            ? withCurrent.slice(withCurrent.length - SETTINGS_HISTORY_LIMIT)
            : withCurrent
        })
        applySnapshot(next)
        return
      }
      setRedoNonce((n) => n + 1)
    },
    [buildSnapshot, settingsFuture],
  )

  /** Call before applying a snapshot to suppress the history tracking effect. */
  const suppressNext = useCallback(() => {
    skipUiHistoryRef.current = true
  }, [])

  /** Update the current snapshot ref after applying (used by applyUiSnapshot). */
  const setCurrentSnapshot = useCallback((snapshot: UiSettingsSnapshot) => {
    uiSnapshotRef.current = snapshot
  }, [])

  return {
    settingsPast,
    settingsFuture,
    undoNonce,
    redoNonce,
    suppressNext,
    setCurrentSnapshot,
    canUndo: settingsPast.length > 0 || canUndoPreview,
    canRedo: settingsFuture.length > 0 || canRedoPreview,
    undoAny,
    redoAny,
  }
}
