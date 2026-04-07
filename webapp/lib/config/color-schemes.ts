export type ImageColorScheme = {
  id: string
  label: string
  colors: readonly [string, string, string, string]
}

const IMAGE_COLOR_SLOT_COUNT = 4
const IMAGE_COLOR_REFERENCE_PREFIX = "scheme:"
const DEFAULT_IMAGE_PLACEHOLDER_SLOT_INDEX = IMAGE_COLOR_SLOT_COUNT - 1

type ImageColorSlotIndex = 0 | 1 | 2 | 3

function clampImageColorSlotIndex(index: number): ImageColorSlotIndex {
  return Math.max(0, Math.min(IMAGE_COLOR_SLOT_COUNT - 1, Math.round(index))) as ImageColorSlotIndex
}

function getChannelLuminance(channel: number): number {
  const value = channel / 255
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4
}

function getHexRelativeLuminance(hex: string): number {
  const normalized = hex.replace("#", "")
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return (
    0.2126 * getChannelLuminance(red)
    + 0.7152 * getChannelLuminance(green)
    + 0.0722 * getChannelLuminance(blue)
  )
}

function sortSchemeColorsBrightToDark(
  colors: readonly [string, string, string, string],
): readonly [string, string, string, string] {
  return [...colors]
    .sort((left, right) => getHexRelativeLuminance(right) - getHexRelativeLuminance(left)) as [
      string,
      string,
      string,
      string,
    ]
}

export const IMAGE_COLOR_SCHEMES = [
  {
    id: "swiss-modern",
    label: "Swiss Modern",
    colors: sortSchemeColorsBrightToDark(["#0b3536", "#e5e7de", "#0098d8", "#f54123"]),
  },
  {
    id: "stone-cyan",
    label: "Stone Cyan",
    colors: sortSchemeColorsBrightToDark(["#35342f", "#e1e0dd", "#f1f2f0", "#37bbe4"]),
  },
  {
    id: "fresh-contrast",
    label: "Fresh Contrast",
    colors: sortSchemeColorsBrightToDark(["#fef9f7", "#1aa9bc", "#457c39", "#ffeb00"]),
  },
  {
    id: "sage-pop",
    label: "Sage Pop",
    colors: sortSchemeColorsBrightToDark(["#e0e5db", "#de3d83", "#00b8b8", "#e4bd0b"]),
  },
  {
    id: "coral-bay",
    label: "Coral Bay",
    colors: sortSchemeColorsBrightToDark(["#dddddd", "#fe9f97", "#fbae17", "#0095a3"]),
  },
  {
    id: "industrial-ember",
    label: "Industrial Ember",
    colors: sortSchemeColorsBrightToDark(["#777870", "#ec6b2d", "#333333", "#0d0f05"]),
  },
  {
    id: "patina-clay",
    label: "Patina Clay",
    colors: sortSchemeColorsBrightToDark(["#bfbabe", "#a63e14", "#558a86", "#f1f2f0"]),
  },
  {
    id: "signal-cyan",
    label: "Signal Cyan",
    colors: sortSchemeColorsBrightToDark(["#f43530", "#46454b", "#00aabb", "#e0e5da"]),
  },
  {
    id: "mono",
    label: "Mono",
    colors: sortSchemeColorsBrightToDark(["#ffffff", "#c0c0c0", "#808080", "#404040"]),
  },
] as const satisfies readonly ImageColorScheme[]

export type ImageColorSchemeId = (typeof IMAGE_COLOR_SCHEMES)[number]["id"]
export type CanvasBackgroundColor = string | null

const LEGACY_IMAGE_COLOR_SCHEME_ALIASES: Record<string, ImageColorSchemeId> = {
  s1: "swiss-modern",
  s2: "stone-cyan",
  s3: "fresh-contrast",
  s4: "swiss-modern",
}

const IMAGE_COLOR_SCHEME_IDS = new Set<ImageColorSchemeId>(
  IMAGE_COLOR_SCHEMES.map((scheme) => scheme.id),
)

const IMAGE_PLACEHOLDER_COLORS = new Set<string>(
  IMAGE_COLOR_SCHEMES.flatMap((scheme) => [...scheme.colors].map((color) => color.toLowerCase())),
)

export const DEFAULT_IMAGE_COLOR_SCHEME_ID: ImageColorSchemeId = IMAGE_COLOR_SCHEMES[0].id

export function isImageColorSchemeId(value: unknown): value is ImageColorSchemeId {
  return typeof value === "string" && IMAGE_COLOR_SCHEME_IDS.has(value as ImageColorSchemeId)
}

export function normalizeImageColorSchemeId(value: unknown): ImageColorSchemeId | null {
  if (typeof value !== "string") return null
  if (isImageColorSchemeId(value)) return value
  return LEGACY_IMAGE_COLOR_SCHEME_ALIASES[value] ?? null
}

export function getImageColorScheme(id: ImageColorSchemeId): (typeof IMAGE_COLOR_SCHEMES)[number] {
  return IMAGE_COLOR_SCHEMES.find((scheme) => scheme.id === id) ?? IMAGE_COLOR_SCHEMES[0]
}

export function getDefaultImagePlaceholderColor(id: ImageColorSchemeId): string {
  return getImageColorScheme(id).colors[DEFAULT_IMAGE_PLACEHOLDER_SLOT_INDEX]
}

export function getDefaultTextSchemeColor(id: ImageColorSchemeId): string {
  return getImageColorScheme(id).colors[DEFAULT_IMAGE_PLACEHOLDER_SLOT_INDEX]
}

export function getImageSchemeColorByIndex(id: ImageColorSchemeId, index: number): string {
  const scheme = getImageColorScheme(id)
  return scheme.colors[clampImageColorSlotIndex(index)] ?? scheme.colors[0]
}

export function getImageSchemeColorToken(index: number): string {
  return `${IMAGE_COLOR_REFERENCE_PREFIX}${clampImageColorSlotIndex(index)}`
}

export function getImageSchemeColorIndex(value: unknown): ImageColorSlotIndex | null {
  if (typeof value !== "string" || !value.startsWith(IMAGE_COLOR_REFERENCE_PREFIX)) return null
  const rawIndex = Number.parseInt(value.slice(IMAGE_COLOR_REFERENCE_PREFIX.length), 10)
  if (!Number.isFinite(rawIndex)) return null
  return clampImageColorSlotIndex(rawIndex)
}

export function isImageSchemeColorToken(value: unknown): value is string {
  return getImageSchemeColorIndex(value) !== null
}

export function resolveImageSchemeColor(value: unknown, schemeId: ImageColorSchemeId): string {
  const colorIndex = getImageSchemeColorIndex(value)
  if (colorIndex !== null) {
    return getImageSchemeColorByIndex(schemeId, colorIndex)
  }
  if (typeof value === "string" && isImagePlaceholderColor(value)) {
    return value.toLowerCase()
  }
  return getDefaultImagePlaceholderColor(schemeId)
}

export function resolveTextSchemeColor(value: unknown, schemeId: ImageColorSchemeId): string {
  const colorIndex = getImageSchemeColorIndex(value)
  if (colorIndex !== null) {
    return getImageSchemeColorByIndex(schemeId, colorIndex)
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length === 0) return getDefaultTextSchemeColor(schemeId)
    if (isImagePlaceholderColor(trimmed)) {
      return trimmed.toLowerCase()
    }
    return trimmed
  }
  return getDefaultTextSchemeColor(schemeId)
}

export function getImageSchemeColorReference(value: unknown, schemeId: ImageColorSchemeId): string {
  const colorIndex = getImageColorScheme(schemeId)
    .colors
    .findIndex((color) => typeof value === "string" && color.toLowerCase() === value.toLowerCase())
  if (colorIndex >= 0) {
    return getImageSchemeColorToken(colorIndex)
  }
  if (isImageSchemeColorToken(value)) {
    return value
  }
  return typeof value === "string" ? value.toLowerCase() : getImageSchemeColorToken(DEFAULT_IMAGE_PLACEHOLDER_SLOT_INDEX)
}

export function getClosestImageSchemeColorToken(value: unknown, schemeId: ImageColorSchemeId): string {
  const colorIndex = getImageSchemeColorIndex(value)
  if (colorIndex !== null) {
    return getImageSchemeColorToken(colorIndex)
  }
  if (typeof value !== "string" || !isImagePlaceholderColor(value)) {
    return getImageSchemeColorToken(DEFAULT_IMAGE_PLACEHOLDER_SLOT_INDEX)
  }
  const normalized = value.toLowerCase()
  const exactIndex = getImageColorScheme(schemeId)
    .colors
    .findIndex((color) => color.toLowerCase() === normalized)
  if (exactIndex >= 0) {
    return getImageSchemeColorToken(exactIndex)
  }
  const targetLuminance = getHexRelativeLuminance(normalized)
  const nearestIndex = getImageColorScheme(schemeId)
    .colors
    .reduce((bestIndex, color, index, colors) => {
      const bestDistance = Math.abs(getHexRelativeLuminance(colors[bestIndex]) - targetLuminance)
      const nextDistance = Math.abs(getHexRelativeLuminance(color) - targetLuminance)
      return nextDistance < bestDistance ? index : bestIndex
    }, 0)
  return getImageSchemeColorToken(nearestIndex)
}

export function isImagePlaceholderColor(value: unknown): value is string {
  return typeof value === "string" && IMAGE_PLACEHOLDER_COLORS.has(value.toLowerCase())
}

export function isImageColorInScheme(value: unknown, schemeId: ImageColorSchemeId): value is string {
  if (typeof value !== "string") return false
  const normalized = value.toLowerCase()
  return getImageColorScheme(schemeId).colors.some((color) => color.toLowerCase() === normalized)
}
