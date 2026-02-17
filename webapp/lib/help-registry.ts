import type { SectionKey } from "@/hooks/useSettingsHistory"

export const QUICK_START_INDEX_ITEMS = [
  { id: "help-quick-start", label: "Quick Start" },
] as const

export const GENERAL_INDEX_ITEMS = [
  { id: "help-editor", label: "Text Editor Popup" },
  { id: "help-drag-placement", label: "Drag and Placement" },
  { id: "help-history-reflow", label: "History and Reflow" },
  { id: "help-save-load", label: "Save and Load JSON" },
  { id: "help-export", label: "Export PDF" },
  { id: "help-troubleshooting", label: "Troubleshooting" },
  { id: "help-grid-theory", label: "Grid Theory Notes" },
] as const

export const GRID_SETTINGS_INDEX_ITEMS = [
  { id: "help-canvas-ratio", label: "I. Canvas Ratio & Rotation" },
  { id: "help-baseline-grid", label: "II. Baseline Grid" },
  { id: "help-margins", label: "III. Margins" },
  { id: "help-gutter", label: "IV. Gutter" },
  { id: "help-typo", label: "V. Typo" },
] as const

export const HEADER_CONTROLS_INDEX_ITEMS = [
  { id: "help-sidebars-header", label: "Header and Sidebars" },
  { id: "help-help-navigation", label: "Help Navigation" },
  { id: "help-header-examples", label: "Examples" },
  { id: "help-header-load", label: "Load" },
  { id: "help-header-save", label: "Save" },
  { id: "help-header-export", label: "Export PDF" },
  { id: "help-header-undo", label: "Undo" },
  { id: "help-header-redo", label: "Redo" },
  { id: "help-header-dark-mode", label: "Dark Mode" },
  { id: "help-header-fullscreen", label: "Fullscreen" },
  { id: "help-header-baselines", label: "Baselines Toggle" },
  { id: "help-header-margins", label: "Margins Toggle" },
  { id: "help-header-modules", label: "Modules Toggle" },
  { id: "help-header-typography", label: "Typography Toggle" },
  { id: "help-header-settings", label: "Settings Panel" },
  { id: "help-shortcuts", label: "Keyboard Shortcuts" },
] as const

export const HELP_INDEX_GROUPS = [
  { title: "Quick Start", items: QUICK_START_INDEX_ITEMS },
  { title: "General Guidance", items: GENERAL_INDEX_ITEMS },
  { title: "Application Controls", items: HEADER_CONTROLS_INDEX_ITEMS },
  { title: "Grid Generator Settings", items: GRID_SETTINGS_INDEX_ITEMS },
] as const

export const ALL_HELP_INDEX_ITEMS = [
  ...QUICK_START_INDEX_ITEMS,
  ...GENERAL_INDEX_ITEMS,
  ...HEADER_CONTROLS_INDEX_ITEMS,
  ...GRID_SETTINGS_INDEX_ITEMS,
] as const

export type HelpSectionId = (typeof ALL_HELP_INDEX_ITEMS)[number]["id"]

export const HELP_SECTION_BY_SETTINGS_SECTION: Record<SectionKey, HelpSectionId> = {
  format: "help-canvas-ratio",
  baseline: "help-baseline-grid",
  margins: "help-margins",
  gutter: "help-gutter",
  typo: "help-typo",
  summary: "help-quick-start",
}

export const HELP_SECTION_BY_HEADER_ACTION: Record<string, HelpSectionId> = {
  examples: "help-header-examples",
  load: "help-header-load",
  save: "help-header-save",
  export: "help-header-export",
  undo: "help-header-undo",
  redo: "help-header-redo",
  "dark-mode": "help-header-dark-mode",
  fullscreen: "help-header-fullscreen",
  baselines: "help-header-baselines",
  margins: "help-header-margins",
  modules: "help-header-modules",
  typography: "help-header-typography",
  settings: "help-header-settings",
  help: "help-help-navigation",
}
