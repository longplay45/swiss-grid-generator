import FONT_VARIANT_DATA from "@/lib/config/font-variants.json"

export type FontCategory = "Sans-Serif" | "Serif" | "Display"
export type FontWeight = number

type FontVariantConfig = {
  weights: readonly number[]
  italic: boolean
}

type FontDefinition = {
  value: string
  label: string
  category: FontCategory
  stack: string
  cssVar: `--font-${string}`
}

export const FONT_DEFINITIONS = [
  {
    value: "Inter",
    label: "Inter",
    category: "Sans-Serif",
    stack: "Inter, system-ui, -apple-system, sans-serif",
    cssVar: "--font-inter",
  },
  {
    value: "Work Sans",
    label: "Work Sans",
    category: "Sans-Serif",
    stack: "Work Sans, sans-serif",
    cssVar: "--font-work-sans",
  },
  {
    value: "Nunito Sans",
    label: "Nunito Sans",
    category: "Sans-Serif",
    stack: "Nunito Sans, sans-serif",
    cssVar: "--font-nunito-sans",
  },
  {
    value: "IBM Plex Sans",
    label: "IBM Plex Sans",
    category: "Sans-Serif",
    stack: "IBM Plex Sans, sans-serif",
    cssVar: "--font-ibm-plex-sans",
  },
  {
    value: "Libre Franklin",
    label: "Libre Franklin",
    category: "Sans-Serif",
    stack: "Libre Franklin, sans-serif",
    cssVar: "--font-libre-franklin",
  },
  {
    value: "EB Garamond",
    label: "EB Garamond",
    category: "Serif",
    stack: "EB Garamond, serif",
    cssVar: "--font-eb-garamond",
  },
  {
    value: "Libre Baskerville",
    label: "Libre Baskerville",
    category: "Serif",
    stack: "Libre Baskerville, serif",
    cssVar: "--font-libre-baskerville",
  },
  {
    value: "Bodoni Moda",
    label: "Bodoni Moda",
    category: "Serif",
    stack: "Bodoni Moda, serif",
    cssVar: "--font-bodoni-moda",
  },
  {
    value: "Besley",
    label: "Besley",
    category: "Serif",
    stack: "Besley, serif",
    cssVar: "--font-besley",
  },
  {
    value: "Playfair Display",
    label: "Playfair Display",
    category: "Display",
    stack: "Playfair Display, serif",
    cssVar: "--font-playfair-display",
  },
] as const satisfies readonly FontDefinition[]

export type FontFamily = (typeof FONT_DEFINITIONS)[number]["value"]
export type FontOption = Pick<(typeof FONT_DEFINITIONS)[number], "value" | "label" | "category">
export type FontVariant = {
  id: string
  label: string
  weight: FontWeight
  italic: boolean
}

export const DEFAULT_BASE_FONT: FontFamily = "Inter"

export const FONT_OPTIONS: FontOption[] = FONT_DEFINITIONS.map(({ value, label, category }) => ({
  value,
  label,
  category,
}))

const PDF_SERIF_STYLE_FONTS = new Set<FontFamily>([
  "EB Garamond",
  "Libre Baskerville",
  "Bodoni Moda",
  "Besley",
  "Playfair Display",
])

const FONT_STACK_MAP = new Map<FontFamily, string>(
  FONT_DEFINITIONS.map(({ value, stack }) => [value, stack]),
)

const FONT_SLUG_MAP = new Map<FontFamily, string>(
  FONT_DEFINITIONS.map(({ value }) => [value, value.toLowerCase().replace(/[^a-z0-9]/g, "")]),
)

export const FONT_OPTION_SET = new Set<FontFamily>(FONT_OPTIONS.map((option) => option.value))
const FONT_VARIANT_CONFIG = FONT_VARIANT_DATA as Record<FontFamily, FontVariantConfig>

const WEIGHT_LABELS: Record<number, string> = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
  1000: "ExtraBlack",
}

function getWeightLabel(weight: number): string {
  return WEIGHT_LABELS[weight] ?? String(weight)
}

function buildVariantId(weight: number, italic: boolean): string {
  return `${weight}${italic ? "-italic" : ""}`
}

function buildVariantLabel(weight: number, italic: boolean): string {
  const baseLabel = getWeightLabel(weight)
  if (!italic) return baseLabel
  return weight === 400 ? "Italic" : `${baseLabel} Italic`
}

const FONT_VARIANTS_MAP = new Map<FontFamily, readonly FontVariant[]>(
  FONT_DEFINITIONS.map(({ value }) => {
    const config = FONT_VARIANT_CONFIG[value]
    const variants = config.weights.flatMap((weight) => {
      const upright: FontVariant = {
        id: buildVariantId(weight, false),
        label: buildVariantLabel(weight, false),
        weight,
        italic: false,
      }
      if (!config.italic) return [upright]
      return [
        upright,
        {
          id: buildVariantId(weight, true),
          label: buildVariantLabel(weight, true),
          weight,
          italic: true,
        } satisfies FontVariant,
      ]
    })
    return [value, variants] as const
  }),
)

export function isFontFamily(value: unknown): value is FontFamily {
  return typeof value === "string" && FONT_OPTION_SET.has(value as FontFamily)
}

export function getFontAssetSlug(fontFamily: FontFamily): string {
  return FONT_SLUG_MAP.get(fontFamily) ?? FONT_SLUG_MAP.get(DEFAULT_BASE_FONT) ?? "inter"
}

export function getFontAssetPath(fontFamily: FontFamily, weight: number, italic: boolean): string {
  return `/fonts/google/${getFontAssetSlug(fontFamily)}/${weight}${italic ? "italic" : ""}.ttf`
}

export function getFontVariants(fontFamily: FontFamily): readonly FontVariant[] {
  return FONT_VARIANTS_MAP.get(fontFamily) ?? FONT_VARIANTS_MAP.get(DEFAULT_BASE_FONT) ?? []
}

export function getFontVariantById(fontFamily: FontFamily, variantId: string): FontVariant | null {
  return getFontVariants(fontFamily).find((variant) => variant.id === variantId) ?? null
}

export function resolveFontVariant(fontFamily: FontFamily, weight: number, italic: boolean): FontVariant {
  const variants = getFontVariants(fontFamily)
  if (!variants.length) {
    return {
      id: buildVariantId(400, italic),
      label: buildVariantLabel(400, italic),
      weight: 400,
      italic,
    }
  }

  const sameStyle = variants.filter((variant) => variant.italic === italic)
  const pool = sameStyle.length ? sameStyle : variants
  return pool.reduce((best, variant) => {
    const bestDistance = Math.abs(best.weight - weight)
    const nextDistance = Math.abs(variant.weight - weight)
    if (nextDistance < bestDistance) return variant
    if (nextDistance === bestDistance && variant.weight < best.weight) return variant
    return best
  })
}

export function getStyleDefaultFontWeight(weight: string | undefined): FontWeight {
  return weight === "Bold" ? 700 : 400
}

export function getFontFamilyCss(fontFamily: FontFamily): string {
  return FONT_STACK_MAP.get(fontFamily) ?? FONT_STACK_MAP.get(DEFAULT_BASE_FONT) ?? "Inter, sans-serif"
}

export function isPdfSerifStyleFont(fontFamily: FontFamily): boolean {
  return PDF_SERIF_STYLE_FONTS.has(fontFamily)
}

export function getPdfCompatibleCanvasFontCss(fontFamily: FontFamily): string {
  return isPdfSerifStyleFont(fontFamily)
    ? "Times New Roman, Times, serif"
    : "Helvetica, Arial, sans-serif"
}

export const FONT_CSS_VARS: Record<string, string> = FONT_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.cssVar] = definition.stack
    return acc
  },
  {} as Record<string, string>,
)

export const FONT_FACE_CSS = FONT_DEFINITIONS.flatMap(({ value }) => {
  return getFontVariants(value).map((variant) => {
    return [
      "@font-face {",
      `  font-family: "${value}";`,
      `  src: url("${getFontAssetPath(value, variant.weight, variant.italic)}") format("truetype");`,
      `  font-style: ${variant.italic ? "italic" : "normal"};`,
      `  font-weight: ${variant.weight};`,
      "  font-display: swap;",
      "}",
    ].join("\n")
  })
}).join("\n\n")
