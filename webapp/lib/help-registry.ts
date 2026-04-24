import type { SectionKey } from "@/hooks/useSettingsHistory"

import {
  ALL_HELP_INDEX_ITEMS,
  ALL_HELP_SECTION_ITEMS,
  EDITOR_HELP_SUBSECTION_ITEMS,
  HELP_INDEX_GROUPS,
  type HelpSectionId,
} from "@/lib/generated-help-content"

export {
  ALL_HELP_INDEX_ITEMS,
  ALL_HELP_SECTION_ITEMS,
  EDITOR_HELP_SUBSECTION_ITEMS,
  HELP_INDEX_GROUPS,
}

export type { HelpSectionId }

export const HELP_SECTION_BY_SETTINGS_SECTION: Record<SectionKey, HelpSectionId> = {
  format: "help-canvas-ratio",
  baseline: "help-baseline-grid",
  margins: "help-margins",
  gutter: "help-gutter",
  typo: "help-typo",
  color: "help-color-scheme",
  summary: "help-quick-start",
}

export const HELP_SECTION_BY_HEADER_ACTION: Record<string, HelpSectionId> = {
  presets: "help-header-examples",
  load: "help-header-load",
  save: "help-header-save",
  export: "help-header-export",
  undo: "help-header-undo",
  redo: "help-header-redo",
  "dark-mode": "help-header-dark-mode",
  "smart-text-zoom": "help-header-smart-text-zoom",
  baselines: "help-header-baselines",
  margins: "help-header-margins",
  modules: "help-header-modules",
  "image-placeholders": "help-header-image-placeholders",
  typography: "help-header-typography",
  layers: "help-header-layers",
  help: "help-help-navigation",
}
