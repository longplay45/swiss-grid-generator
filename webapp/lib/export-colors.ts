export type RgbColor = { r: number; g: number; b: number }

export function parseHexColor(value: string | undefined): RgbColor | null {
  if (!value || typeof value !== "string") return null
  const normalized = value.trim().replace(/^#/, "")
  const expanded = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized
  if (!/^[\da-fA-F]{6}$/.test(expanded)) return null
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  }
}

function toHexChannel(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)))
  return clamped.toString(16).padStart(2, "0")
}

export function formatSvgColor(color: RgbColor): string {
  return `#${toHexChannel(color.r)}${toHexChannel(color.g)}${toHexChannel(color.b)}`
}
