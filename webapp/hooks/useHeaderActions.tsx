import type { ReactNode } from "react"
import {
  CircleHelp,
  Download,
  FolderOpen,
  LayoutGrid,
  LayoutTemplate,
  Maximize2,
  Minimize2,
  Moon,
  Redo2,
  Rows3,
  Save,
  Settings,
  SquareDashed,
  Sun,
  Type,
  Undo2,
} from "lucide-react"
import type { PreviewHeaderShortcutId } from "@/lib/preview-header-shortcuts"

export type SidebarPanel = "settings" | "help" | "imprint" | "example" | null

export type HeaderAction = {
  key: string
  ariaLabel: string
  tooltip: string
  shortcutId?: PreviewHeaderShortcutId
  icon: ReactNode
  variant?: "default" | "outline"
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
}

export type HeaderItem = { type: "action"; action: HeaderAction } | { type: "divider"; key: string }

type Args = {
  activeSidebarPanel: SidebarPanel
  isDarkUi: boolean
  isPreviewFullscreen: boolean
  showBaselines: boolean
  showMargins: boolean
  showModules: boolean
  showTypography: boolean
  canUndo: boolean
  canRedo: boolean
  onToggleExamplePanel: () => void
  onLoadJson: () => void
  onSaveJson: () => void
  onExportPdf: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleDarkMode: () => void
  onToggleFullscreen: () => void
  onToggleBaselines: () => void
  onToggleMargins: () => void
  onToggleModules: () => void
  onToggleTypography: () => void
  onToggleSettingsPanel: () => void
  onToggleHelpPanel: () => void
}

export function useHeaderActions(args: Args) {
  const fileGroup: HeaderItem[] = [
    {
      type: "action",
      action: {
        key: "examples",
        ariaLabel: "Show examples",
        tooltip: "Example layouts",
        shortcutId: "toggle_example_panel",
        variant: args.activeSidebarPanel === "example" ? "default" : "outline",
        pressed: args.activeSidebarPanel === "example",
        onClick: args.onToggleExamplePanel,
        icon: <LayoutTemplate className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-examples-load" },
    {
      type: "action",
      action: {
        key: "load",
        ariaLabel: "Load",
        tooltip: "Load layout JSON",
        shortcutId: "load_json",
        onClick: args.onLoadJson,
        icon: <FolderOpen className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "save",
        ariaLabel: "Save",
        tooltip: "Save layout JSON",
        shortcutId: "save_json",
        onClick: args.onSaveJson,
        icon: <Save className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "export",
        ariaLabel: "Export PDF",
        tooltip: "Export PDF",
        shortcutId: "export_pdf",
        onClick: args.onExportPdf,
        icon: <Download className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-export-undo" },
    {
      type: "action",
      action: {
        key: "undo",
        ariaLabel: "Undo",
        tooltip: "Undo",
        shortcutId: "undo",
        disabled: !args.canUndo,
        onClick: args.onUndo,
        icon: <Undo2 className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "redo",
        ariaLabel: "Redo",
        tooltip: "Redo",
        shortcutId: "redo",
        disabled: !args.canRedo,
        onClick: args.onRedo,
        icon: <Redo2 className="h-4 w-4" />,
      },
    },
  ]

  const displayGroup: HeaderItem[] = [
    {
      type: "action",
      action: {
        key: "dark-mode",
        ariaLabel: args.isDarkUi ? "Disable dark mode" : "Enable dark mode",
        tooltip: args.isDarkUi ? "Switch to light UI" : "Switch to dark UI",
        shortcutId: "toggle_dark_mode",
        variant: args.isDarkUi ? "default" : "outline",
        pressed: args.isDarkUi,
        onClick: args.onToggleDarkMode,
        icon: args.isDarkUi ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "fullscreen",
        ariaLabel: args.isPreviewFullscreen ? "Exit fullscreen preview" : "Enter fullscreen preview",
        tooltip: args.isPreviewFullscreen ? "Exit fullscreen preview" : "Enter fullscreen preview",
        shortcutId: "toggle_fullscreen",
        pressed: args.isPreviewFullscreen,
        onClick: args.onToggleFullscreen,
        icon: args.isPreviewFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-fullscreen-baselines" },
    {
      type: "action",
      action: {
        key: "baselines",
        ariaLabel: "Toggle baselines",
        tooltip: "Toggle baselines",
        shortcutId: "toggle_baselines",
        variant: args.showBaselines ? "default" : "outline",
        pressed: args.showBaselines,
        onClick: args.onToggleBaselines,
        icon: <Rows3 className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "margins",
        ariaLabel: "Toggle margins",
        tooltip: "Toggle margin frame",
        shortcutId: "toggle_margins",
        variant: args.showMargins ? "default" : "outline",
        pressed: args.showMargins,
        onClick: args.onToggleMargins,
        icon: <SquareDashed className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "modules",
        ariaLabel: "Toggle gutter grid",
        tooltip: "Toggle modules and gutter",
        shortcutId: "toggle_modules",
        variant: args.showModules ? "default" : "outline",
        pressed: args.showModules,
        onClick: args.onToggleModules,
        icon: <LayoutGrid className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "typography",
        ariaLabel: "Toggle typography",
        tooltip: "Toggle type preview",
        shortcutId: "toggle_typography",
        variant: args.showTypography ? "default" : "outline",
        pressed: args.showTypography,
        onClick: args.onToggleTypography,
        icon: <Type className="h-4 w-4" />,
      },
    },
  ]

  const sidebarGroup: HeaderAction[] = [
    {
      key: "settings",
      ariaLabel: "Show settings panel",
      tooltip: "Settings panel",
      shortcutId: "toggle_settings_panel",
      variant: args.activeSidebarPanel === "settings" ? "default" : "outline",
      pressed: args.activeSidebarPanel === "settings",
      onClick: args.onToggleSettingsPanel,
      icon: <Settings className="h-4 w-4" />,
    },
    {
      key: "help",
      ariaLabel: "Toggle help",
      tooltip: "Help & reference",
      shortcutId: "toggle_help_panel",
      variant: args.activeSidebarPanel === "help" ? "default" : "outline",
      pressed: args.activeSidebarPanel === "help",
      onClick: args.onToggleHelpPanel,
      icon: <CircleHelp className="h-4 w-4" />,
    },
  ]

  return {
    fileGroup,
    displayGroup,
    sidebarGroup,
  }
}
