import { useState, useRef, useEffect, useCallback } from "react"
import { SECTION_KEYS, type UiSettingsSnapshot } from "@/lib/workspace-ui-schema"

export { SECTION_KEYS, type SectionKey, type UiSettingsSnapshot } from "@/lib/workspace-ui-schema"

const SETTINGS_HISTORY_LIMIT = 100

function areSnapshotsEqual(a: UiSettingsSnapshot, b: UiSettingsSnapshot): boolean {
  return (
    a.canvasRatio === b.canvasRatio
    && a.customRatioWidth === b.customRatioWidth
    && a.customRatioHeight === b.customRatioHeight
    && a.exportPrintPro === b.exportPrintPro
    && a.exportBleedMm === b.exportBleedMm
    && a.exportRegistrationMarks === b.exportRegistrationMarks
    && a.orientation === b.orientation
    && a.rotation === b.rotation
    && a.marginMethod === b.marginMethod
    && a.gridCols === b.gridCols
    && a.gridRows === b.gridRows
    && a.baselineMultiple === b.baselineMultiple
    && a.gutterMultiple === b.gutterMultiple
    && a.rhythm === b.rhythm
    && a.rhythmRowsEnabled === b.rhythmRowsEnabled
    && a.rhythmRowsDirection === b.rhythmRowsDirection
    && a.rhythmColsEnabled === b.rhythmColsEnabled
    && a.rhythmColsDirection === b.rhythmColsDirection
    && a.typographyScale === b.typographyScale
    && a.baseFont === b.baseFont
    && a.imageColorScheme === b.imageColorScheme
    && a.canvasBackground === b.canvasBackground
    && a.customBaseline === b.customBaseline
    && a.useCustomMargins === b.useCustomMargins
    && a.customMarginMultipliers.top === b.customMarginMultipliers.top
    && a.customMarginMultipliers.left === b.customMarginMultipliers.left
    && a.customMarginMultipliers.right === b.customMarginMultipliers.right
    && a.customMarginMultipliers.bottom === b.customMarginMultipliers.bottom
    && a.showBaselines === b.showBaselines
    && a.showModules === b.showModules
    && a.showMargins === b.showMargins
    && a.showImagePlaceholders === b.showImagePlaceholders
    && a.showTypography === b.showTypography
    && a.showLayers === b.showLayers
    && a.collapsed.format === b.collapsed.format
    && a.collapsed.baseline === b.collapsed.baseline
    && a.collapsed.margins === b.collapsed.margins
    && a.collapsed.gutter === b.collapsed.gutter
    && a.collapsed.typo === b.collapsed.typo
    && a.collapsed.color === b.collapsed.color
    && a.collapsed.summary === b.collapsed.summary
  )
}

type UseSettingsHistoryOptions = {
  onRecordHistory?: () => void
}

export function useSettingsHistory(
  buildSnapshot: () => UiSettingsSnapshot,
  options: UseSettingsHistoryOptions = {},
) {
  const { onRecordHistory } = options
  const [settingsPast, setSettingsPast] = useState<UiSettingsSnapshot[]>([])
  const [settingsFuture, setSettingsFuture] = useState<UiSettingsSnapshot[]>([])
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
    onRecordHistory?.()
  }, [buildSnapshot, onRecordHistory])

  const undo = useCallback(
    (applySnapshot: (s: UiSettingsSnapshot) => void) => {
      if (settingsPast.length === 0) return
      const current = buildSnapshot()
      const previous = settingsPast[settingsPast.length - 1]
      setSettingsPast((past) => past.slice(0, -1))
      setSettingsFuture((future) => [current, ...future].slice(0, SETTINGS_HISTORY_LIMIT))
      applySnapshot(previous)
    },
    [buildSnapshot, settingsPast],
  )

  const redo = useCallback(
    (applySnapshot: (s: UiSettingsSnapshot) => void) => {
      if (settingsFuture.length === 0) return
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

  /** Clear all settings history and establish a new current baseline snapshot. */
  const reset = useCallback((snapshot?: UiSettingsSnapshot) => {
    const baseline = snapshot ?? buildSnapshot()
    setSettingsPast([])
    setSettingsFuture([])
    skipUiHistoryRef.current = false
    uiSnapshotRef.current = baseline
  }, [buildSnapshot])

  return {
    settingsPast,
    settingsFuture,
    suppressNext,
    setCurrentSnapshot,
    reset,
    canUndo: settingsPast.length > 0,
    canRedo: settingsFuture.length > 0,
    undo,
    redo,
  }
}
