export type FontCategory = "Sans-Serif" | "Serif" | "Display"

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

export const DEFAULT_BASE_FONT: FontFamily = "Inter"

export const FONT_OPTIONS: FontOption[] = FONT_DEFINITIONS.map(({ value, label, category }) => ({
  value,
  label,
  category,
}))

const FONT_STACK_MAP = new Map<FontFamily, string>(
  FONT_DEFINITIONS.map(({ value, stack }) => [value, stack]),
)

export const FONT_OPTION_SET = new Set<FontFamily>(FONT_OPTIONS.map((option) => option.value))

export function isFontFamily(value: unknown): value is FontFamily {
  return typeof value === "string" && FONT_OPTION_SET.has(value as FontFamily)
}

export function getFontFamilyCss(fontFamily: FontFamily): string {
  return FONT_STACK_MAP.get(fontFamily) ?? FONT_STACK_MAP.get(DEFAULT_BASE_FONT) ?? "Inter, sans-serif"
}

export const FONT_CSS_VARS: Record<string, string> = FONT_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.cssVar] = definition.stack
    return acc
  },
  {} as Record<string, string>,
)
