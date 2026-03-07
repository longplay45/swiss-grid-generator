export type ImageColorScheme = {
  id: string
  label: string
  colors: readonly [string, string, string, string]
}

export const IMAGE_COLOR_SCHEMES = [
  {
    id: "swiss-modern",
    label: "Swiss Modern",
    colors: ["#0b3536", "#e5e7de", "#0098d8", "#f54123"],
  },
  {
    id: "stone-cyan",
    label: "Stone Cyan",
    colors: ["#35342f", "#e1e0dd", "#f1f2f0", "#37bbe4"],
  },
  {
    id: "fresh-contrast",
    label: "Fresh Contrast",
    colors: ["#fef9f7", "#1aa9bc", "#457c39", "#ffeb00"],
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
  return getImageColorScheme(id).colors[0]
}

export function isImagePlaceholderColor(value: unknown): value is string {
  return typeof value === "string" && IMAGE_PLACEHOLDER_COLORS.has(value.toLowerCase())
}

export function isImageColorInScheme(value: unknown, schemeId: ImageColorSchemeId): value is string {
  if (typeof value !== "string") return false
  const normalized = value.toLowerCase()
  return getImageColorScheme(schemeId).colors.some((color) => color.toLowerCase() === normalized)
}
