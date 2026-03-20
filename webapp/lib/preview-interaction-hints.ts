export const PREVIEW_INTERACTION_HINT_LINES = [
  "Hover a layer and click the edit icon to edit.",
  "Double-click empty area to create paragraph.",
  "Shift-double-click empty module to create image placeholder.",
  "Alt-drag duplicate • Shift-drag baseline snap (overset).",
] as const

export const PREVIEW_INTERACTION_HINT_SINGLE_LINE = PREVIEW_INTERACTION_HINT_LINES.join("  •  ")
