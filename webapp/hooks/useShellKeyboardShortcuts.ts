import { useEffect } from "react"

import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"

type Args = {
  canUndo: boolean
  canRedo: boolean
  showPresetsBrowser: boolean
  hasPreviewLayout: boolean
  onLoadJson: () => void
  onSaveJson: () => void
  onExportPdf: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleDarkMode: () => void
  onToggleBaselines: () => void
  onToggleMargins: () => void
  onToggleModules: () => void
  onToggleTypography: () => void
  onToggleLayersPanel: () => void
  onToggleRolloverInfo: () => void
  onToggleHelpPanel: () => void
  onToggleImprintPanel: () => void
  onOpenPresets: () => void
  onClosePresets: () => void
}

export function useShellKeyboardShortcuts({
  canUndo,
  canRedo,
  showPresetsBrowser,
  hasPreviewLayout,
  onLoadJson,
  onSaveJson,
  onExportPdf,
  onUndo,
  onRedo,
  onToggleDarkMode,
  onToggleBaselines,
  onToggleMargins,
  onToggleModules,
  onToggleTypography,
  onToggleLayersPanel,
  onToggleRolloverInfo,
  onToggleHelpPanel,
  onToggleImprintPanel,
  onOpenPresets,
  onClosePresets,
}: Args) {
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      const shifted = event.shiftKey
      const alted = event.altKey
      if (isEditableTarget(event.target)) return

      const shortcut = PREVIEW_HEADER_SHORTCUTS.find((item) =>
        item.bindings.some(
          (binding) =>
            binding.key === key
            && (binding.shift ?? false) === shifted
            && (binding.alt ?? false) === alted,
        ),
      )
      if (!shortcut) return

      event.preventDefault()
      switch (shortcut.id) {
        case "load_json":
          onLoadJson()
          return
        case "save_json":
          if (hasPreviewLayout) onSaveJson()
          return
        case "export_pdf":
          if (hasPreviewLayout) onExportPdf()
          return
        case "undo":
          if (canUndo) onUndo()
          return
        case "redo":
          if (canRedo) onRedo()
          return
        case "toggle_dark_mode":
          onToggleDarkMode()
          return
        case "toggle_baselines":
          if (hasPreviewLayout) onToggleBaselines()
          return
        case "toggle_margins":
          if (hasPreviewLayout) onToggleMargins()
          return
        case "toggle_modules":
          if (hasPreviewLayout) onToggleModules()
          return
        case "toggle_typography":
          if (hasPreviewLayout) onToggleTypography()
          return
        case "toggle_layers_panel":
          onToggleLayersPanel()
          return
        case "toggle_rollover_info":
          onToggleRolloverInfo()
          return
        case "toggle_help_panel":
          onToggleHelpPanel()
          return
        case "toggle_imprint_panel":
          onToggleImprintPanel()
          return
        case "toggle_example_panel":
          onOpenPresets()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    canRedo,
    canUndo,
    hasPreviewLayout,
    onExportPdf,
    onLoadJson,
    onOpenPresets,
    onRedo,
    onSaveJson,
    onToggleBaselines,
    onToggleDarkMode,
    onToggleHelpPanel,
    onToggleImprintPanel,
    onToggleLayersPanel,
    onToggleMargins,
    onToggleModules,
    onToggleRolloverInfo,
    onToggleTypography,
    onUndo,
  ])

  useEffect(() => {
    if (!showPresetsBrowser) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      onClosePresets()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClosePresets, showPresetsBrowser])
}
