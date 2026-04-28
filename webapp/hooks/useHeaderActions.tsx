import type { MouseEventHandler, ReactNode } from "react"
import {
  CircleHelp,
  Download,
  Image,
  Import,
  LayoutGrid,
  LayoutTemplate,
  Layers3,
  Moon,
  Redo2,
  Rows3,
  Save,
  SquareDashed,
  Sun,
  Type,
  Undo2,
  ZoomIn,
} from "lucide-react"
import type { PreviewHeaderShortcutId } from "@/lib/preview-header-shortcuts"

export type SidebarPanel = "help" | "imprint" | "layers" | "feedback" | null

export type HeaderAction = {
  key: string
  ariaLabel: string
  tooltip: string
  shortcutId?: PreviewHeaderShortcutId
  icon: ReactNode
  showStatusDot?: boolean
  variant?: "default" | "outline"
  pressed?: boolean
  disabled?: boolean
  onClick: MouseEventHandler<HTMLButtonElement>
}

export type HeaderItem = { type: "action"; action: HeaderAction } | { type: "divider"; key: string }

type Args = {
  activeSidebarPanel: SidebarPanel
  showPresetsBrowser: boolean
  hasPreviewLayout: boolean
  isDarkUi: boolean
  showBaselines: boolean
  showMargins: boolean
  showModules: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
  showLayers: boolean
  smartTextZoomEnabled: boolean
  hasUnsavedChanges: boolean
  canUndo: boolean
  canRedo: boolean
  onOpenPresets: () => void
  onLoadJson: () => void
  onSaveJson: () => void
  onExportPdf: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleDarkMode: MouseEventHandler<HTMLButtonElement>
  onToggleSmartTextZoom: MouseEventHandler<HTMLButtonElement>
  onToggleBaselines: MouseEventHandler<HTMLButtonElement>
  onToggleMargins: MouseEventHandler<HTMLButtonElement>
  onToggleModules: MouseEventHandler<HTMLButtonElement>
  onToggleImagePlaceholders: MouseEventHandler<HTMLButtonElement>
  onToggleTypography: MouseEventHandler<HTMLButtonElement>
  onToggleLayersPanel: MouseEventHandler<HTMLButtonElement>
  onToggleHelpPanel: MouseEventHandler<HTMLButtonElement>
}

export function useHeaderActions(args: Args) {
  const fileGroup: HeaderItem[] = [
    {
      type: "action",
      action: {
        key: "presets",
        ariaLabel: "Show presets",
        tooltip: "Presets",
        shortcutId: "toggle_example_panel",
        variant: args.showPresetsBrowser ? "default" : "outline",
        pressed: args.showPresetsBrowser,
        onClick: args.onOpenPresets,
        icon: <LayoutTemplate className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-presets-load" },
    {
      type: "action",
      action: {
        key: "import",
        ariaLabel: "Import",
        tooltip: "Import project JSON",
        shortcutId: "load_json",
        onClick: args.onLoadJson,
        icon: <Import className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "save",
        ariaLabel: "Save",
        tooltip: "Save to Library",
        shortcutId: "save_json",
        showStatusDot: args.hasUnsavedChanges,
        disabled: !args.hasPreviewLayout,
        onClick: args.onSaveJson,
        icon: <Save className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-save-export" },
    {
      type: "action",
      action: {
        key: "export",
        ariaLabel: "Export",
        tooltip: "Export",
        shortcutId: "export_pdf",
        disabled: !args.hasPreviewLayout,
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
        key: "smart-text-zoom",
        ariaLabel: args.smartTextZoomEnabled ? "Disable smart text zoom" : "Enable smart text zoom",
        tooltip: "Smart text edit zoom",
        variant: args.smartTextZoomEnabled ? "default" : "outline",
        pressed: args.smartTextZoomEnabled,
        disabled: !args.hasPreviewLayout,
        onClick: args.onToggleSmartTextZoom,
        icon: <ZoomIn className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-darkmode-baselines" },
    {
      type: "action",
      action: {
        key: "baselines",
        ariaLabel: "Toggle baselines",
        tooltip: "Toggle baselines\nShift+click: all pages",
        shortcutId: "toggle_baselines",
        variant: args.showBaselines ? "default" : "outline",
        pressed: args.showBaselines,
        disabled: !args.hasPreviewLayout,
        onClick: args.onToggleBaselines,
        icon: <Rows3 className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "margins",
        ariaLabel: "Toggle margins",
        tooltip: "Toggle margin frame\nShift+click: all pages",
        shortcutId: "toggle_margins",
        variant: args.showMargins ? "default" : "outline",
        pressed: args.showMargins,
        disabled: !args.hasPreviewLayout,
        onClick: args.onToggleMargins,
        icon: <SquareDashed className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "modules",
        ariaLabel: "Toggle gutter grid",
        tooltip: "Toggle modules and gutter\nShift+click: all pages",
        shortcutId: "toggle_modules",
        variant: args.showModules ? "default" : "outline",
        pressed: args.showModules,
        disabled: !args.hasPreviewLayout,
        onClick: args.onToggleModules,
        icon: <LayoutGrid className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "typography",
        ariaLabel: "Toggle typography",
        tooltip: "Toggle type preview\nShift+click: all pages",
        shortcutId: "toggle_typography",
        variant: args.showTypography ? "default" : "outline",
        pressed: args.showTypography,
        disabled: !args.hasPreviewLayout,
        onClick: args.onToggleTypography,
        icon: <Type className="h-4 w-4" />,
      },
    },
    {
      type: "action",
      action: {
        key: "image-placeholders",
        ariaLabel: "Toggle image placeholders",
        tooltip: "Toggle image placeholders\nShift+click: all pages",
        shortcutId: "toggle_image_placeholders",
        variant: args.showImagePlaceholders ? "default" : "outline",
        pressed: args.showImagePlaceholders,
        disabled: !args.hasPreviewLayout,
        onClick: args.onToggleImagePlaceholders,
        icon: <Image className="h-4 w-4" />,
      },
    },
    { type: "divider", key: "divider-typography-layers" },
    {
      type: "action",
      action: {
        key: "layers",
        ariaLabel: args.showLayers ? "Hide project panel" : "Show project panel",
        tooltip: "Project panel",
        shortcutId: "toggle_layers_panel",
        variant: args.showLayers ? "default" : "outline",
        pressed: args.showLayers,
        disabled: args.showPresetsBrowser,
        onClick: args.onToggleLayersPanel,
        icon: <Layers3 className="h-4 w-4" />,
      },
    },
  ]

  const sidebarGroup: HeaderAction[] = [
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
