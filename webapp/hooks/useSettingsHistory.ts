import { useState, useRef, useEffect, useCallback } from "react"
import type { CanvasRatioKey } from "@/lib/grid-calculator"
import type { FontFamily } from "@/lib/config/fonts"
import type { DisplayUnit, TypographyScale } from "@/lib/config/defaults"

export const SECTION_KEYS = ["format", "baseline", "margins", "gutter", "typo", "summary"] as const
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
  typographyScale: TypographyScale
  baseFont: FontFamily
  customBaseline: number
  displayUnit: DisplayUnit
  useCustomMargins: boolean
  customMarginMultipliers: { top: number; left: number; right: number; bottom: number }
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showTypography: boolean
  collapsed: Record<SectionKey, boolean>
}

const SETTINGS_HISTORY_LIMIT = 100

function areSnapshotsEqual(a: UiSettingsSnapshot, b: UiSettingsSnapshot): boolean {
  return (
    a.canvasRatio === b.canvasRatio
    && a.exportPaperSize === b.exportPaperSize
    && a.exportPrintPro === b.exportPrintPro
    && a.exportBleedMm === b.exportBleedMm
    && a.exportRegistrationMarks === b.exportRegistrationMarks
    && a.exportFinalSafeGuides === b.exportFinalSafeGuides
    && a.orientation === b.orientation
    && a.rotation === b.rotation
    && a.marginMethod === b.marginMethod
    && a.gridCols === b.gridCols
    && a.gridRows === b.gridRows
    && a.baselineMultiple === b.baselineMultiple
    && a.gutterMultiple === b.gutterMultiple
    && a.typographyScale === b.typographyScale
    && a.baseFont === b.baseFont
    && a.customBaseline === b.customBaseline
    && a.displayUnit === b.displayUnit
    && a.useCustomMargins === b.useCustomMargins
    && a.customMarginMultipliers.top === b.customMarginMultipliers.top
    && a.customMarginMultipliers.left === b.customMarginMultipliers.left
    && a.customMarginMultipliers.right === b.customMarginMultipliers.right
    && a.customMarginMultipliers.bottom === b.customMarginMultipliers.bottom
    && a.showBaselines === b.showBaselines
    && a.showModules === b.showModules
    && a.showMargins === b.showMargins
    && a.showTypography === b.showTypography
    && a.collapsed.format === b.collapsed.format
    && a.collapsed.baseline === b.collapsed.baseline
    && a.collapsed.margins === b.collapsed.margins
    && a.collapsed.gutter === b.collapsed.gutter
    && a.collapsed.typo === b.collapsed.typo
    && a.collapsed.summary === b.collapsed.summary
  )
}

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
    if (areSnapshotsEqual(current, previous)) return

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
