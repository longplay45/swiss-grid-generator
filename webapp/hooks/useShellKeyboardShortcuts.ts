import { useEffect } from "react"

import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"

type Args = {
  canUndo: boolean
  canRedo: boolean
  showPresetsBrowser: boolean
  hasPreviewLayout: boolean
  hasMultipleProjectPages: boolean
  onImportProject: () => void
  onOpenSaveLibraryDialog: () => void
  onOpenExportDialog: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleDarkMode: () => void
  onToggleBaselines: () => void
  onToggleMargins: () => void
  onToggleModules: () => void
  onToggleTypography: () => void
  onToggleImagePlaceholders: () => void
  onToggleLayersPanel: () => void
  onToggleHelpPanel: () => void
  onToggleImprintPanel: () => void
  onOpenPresets: () => void
  onClosePresets: () => void
  onSelectFirstPage: () => void
  onSelectLastPage: () => void
  onSelectPreviousPage: () => void
  onSelectNextPage: () => void
}

export function useShellKeyboardShortcuts({
  canUndo,
  canRedo,
  showPresetsBrowser,
  hasPreviewLayout,
  hasMultipleProjectPages,
  onImportProject,
  onOpenSaveLibraryDialog,
  onOpenExportDialog,
  onUndo,
  onRedo,
  onToggleDarkMode,
  onToggleBaselines,
  onToggleMargins,
  onToggleModules,
  onToggleTypography,
  onToggleImagePlaceholders,
  onToggleLayersPanel,
  onToggleHelpPanel,
  onToggleImprintPanel,
  onOpenPresets,
  onClosePresets,
  onSelectFirstPage,
  onSelectLastPage,
  onSelectPreviousPage,
  onSelectNextPage,
}: Args) {
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      if (!showPresetsBrowser && hasMultipleProjectPages && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key === "PageUp") {
          event.preventDefault()
          onSelectPreviousPage()
          return
        }
        if (event.key === "PageDown") {
          event.preventDefault()
          onSelectNextPage()
          return
        }
        if (event.key === "Home") {
          event.preventDefault()
          onSelectFirstPage()
          return
        }
        if (event.key === "End") {
          event.preventDefault()
          onSelectLastPage()
          return
        }
      }

      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      const shifted = event.shiftKey
      const alted = event.altKey

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
        case "import_project":
          onImportProject()
          return
        case "save_to_library":
          if (hasPreviewLayout) onOpenSaveLibraryDialog()
          return
        case "open_export":
          if (hasPreviewLayout) onOpenExportDialog()
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
        case "toggle_image_placeholders":
          if (hasPreviewLayout) onToggleImagePlaceholders()
          return
        case "toggle_layers_panel":
          onToggleLayersPanel()
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
    hasMultipleProjectPages,
    onOpenExportDialog,
    onImportProject,
    onOpenSaveLibraryDialog,
    onSelectFirstPage,
    onSelectLastPage,
    onSelectNextPage,
    onSelectPreviousPage,
    onOpenPresets,
    onRedo,
    onToggleBaselines,
    onToggleDarkMode,
    onToggleHelpPanel,
    onToggleImprintPanel,
    onToggleLayersPanel,
    onToggleMargins,
    onToggleModules,
    onToggleImagePlaceholders,
    onToggleTypography,
    onUndo,
    showPresetsBrowser,
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
