export type TextSymbolPaletteGroup = {
  id: string
  label: string
  symbols: readonly string[]
}

export const TEXT_SYMBOL_PALETTE_GROUPS: readonly TextSymbolPaletteGroup[] = [
  {
    id: "arrows",
    label: "Arrows",
    symbols: ["←", "↑", "→", "↓", "↖", "↗", "↘", "↙", "↔", "↕", "↩", "↪"],
  },
  {
    id: "bullets",
    label: "Bullets",
    symbols: ["•", "◦", "▪", "▫", "■", "□", "●", "○", "◆", "◇", "▸", "▹"],
  },
  {
    id: "marks",
    label: "Marks",
    symbols: ["§", "¶", "†", "‡", "※", "№", "©", "®", "™", "℠", "℗", "℞"],
  },
  {
    id: "math",
    label: "Math",
    symbols: ["+", "−", "×", "÷", "=", "≠", "≈", "≤", "≥", "±", "∞", "√"],
  },
  {
    id: "geometry",
    label: "Geometry",
    symbols: ["△", "▽", "▲", "▼", "◁", "▷", "◀", "▶", "◇", "◈", "⬡", "⬢"],
  },
  {
    id: "editorial",
    label: "Editorial",
    symbols: ["«", "»", "‹", "›", "…", "–", "—", "′", "″", "·", "‚", "„"],
  },
] as const
