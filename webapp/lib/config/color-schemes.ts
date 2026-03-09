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
  {
    id: "new-1",
    label: "New 1",
    colors: ["#e0e5db", "#de3d83", "#00b8b8", "#e4bd0b"],
  },
  {
    id: "new-2",
    label: "New 2",
    colors: ["#dddddd", "#fe9f97", "#fbae17", "#0095a3"],
  },
  {
    id: "new-3",
    label: "New 3",
    colors: ["#777870", "#ec6b2d", "#333333", "#0d0f05"],
  },
  {
    id: "new-4",
    label: "New 4",
    colors: ["#bfbabe", "#a63e14", "#558a86", "#f1f2f0"],
  },
  {
    id: "new-5",
    label: "New 5",
    colors: ["#f43530", "#46454b", "#00aabb", "#e0e5da"],
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
