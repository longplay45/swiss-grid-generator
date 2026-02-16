export type PreviewHeaderShortcutId =
  | "load_json"
  | "save_json"
  | "export_pdf"
  | "undo"
  | "redo"
  | "toggle_dark_mode"
  | "toggle_fullscreen"
  | "toggle_baselines"
  | "toggle_margins"
  | "toggle_modules"
  | "toggle_typography"
  | "toggle_settings_panel"
  | "toggle_help_panel"
  | "toggle_imprint_panel"
  | "toggle_example_panel"

export type ShortcutBinding = {
  key: string
  shift?: boolean
  alt?: boolean
}

export type PreviewHeaderShortcut = {
  id: PreviewHeaderShortcutId
  combo: string
  description: string
  bindings: ShortcutBinding[]
}

export const PREVIEW_HEADER_SHORTCUTS: PreviewHeaderShortcut[] = [
  {
    id: "load_json",
    combo: "Cmd/Ctrl+O",
    description: "Load JSON",
    bindings: [{ key: "o" }],
  },
  {
    id: "save_json",
    combo: "Cmd/Ctrl+S",
    description: "Save JSON",
    bindings: [{ key: "s" }],
  },
  {
    id: "export_pdf",
    combo: "Cmd/Ctrl+Shift+E",
    description: "Export PDF",
    bindings: [{ key: "e", shift: true }],
  },
  {
    id: "undo",
    combo: "Cmd/Ctrl+Z",
    description: "Undo",
    bindings: [{ key: "z" }],
  },
  {
    id: "redo",
    combo: "Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y",
    description: "Redo",
    bindings: [{ key: "z", shift: true }, { key: "y" }],
  },
  {
    id: "toggle_dark_mode",
    combo: "Cmd/Ctrl+Shift+D",
    description: "Toggle dark mode",
    bindings: [{ key: "d", shift: true }],
  },
  {
    id: "toggle_fullscreen",
    combo: "Cmd/Ctrl+Shift+F",
    description: "Toggle fullscreen preview",
    bindings: [{ key: "f", shift: true }],
  },
  {
    id: "toggle_baselines",
    combo: "Cmd/Ctrl+Shift+B",
    description: "Toggle baselines",
    bindings: [{ key: "b", shift: true }],
  },
  {
    id: "toggle_margins",
    combo: "Cmd/Ctrl+Shift+M",
    description: "Toggle margins",
    bindings: [{ key: "m", shift: true }],
  },
  {
    id: "toggle_modules",
    combo: "Cmd/Ctrl+Shift+G",
    description: "Toggle modules and gutter",
    bindings: [{ key: "g", shift: true }],
  },
  {
    id: "toggle_typography",
    combo: "Cmd/Ctrl+Shift+T",
    description: "Toggle typography",
    bindings: [{ key: "t", shift: true }],
  },
  {
    id: "toggle_settings_panel",
    combo: "Cmd/Ctrl+Shift+1",
    description: "Toggle settings sidebar",
    bindings: [{ key: "1", shift: true }],
  },
  {
    id: "toggle_help_panel",
    combo: "Cmd/Ctrl+Shift+2",
    description: "Toggle help sidebar",
    bindings: [{ key: "2", shift: true }],
  },
  {
    id: "toggle_imprint_panel",
    combo: "Cmd/Ctrl+Shift+3",
    description: "Toggle imprint sidebar",
    bindings: [{ key: "3", shift: true }],
  },
  {
    id: "toggle_example_panel",
    combo: "Cmd/Ctrl+Shift+4",
    description: "Toggle example layouts",
    bindings: [{ key: "4", shift: true }],
  },
]
