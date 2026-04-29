export const BASE_BLOCK_IDS = ["display", "headline", "subhead", "body", "caption"] as const

export type BaseBlockId = typeof BASE_BLOCK_IDS[number]

const DEFAULT_COPYRIGHT_YEAR = new Date().getFullYear()

export const DEFAULT_TEXT_CONTENT: Readonly<Record<BaseBlockId, string>> = {
  display: "Swiss Design",
  headline: "Modular Grid Systems",
  subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
  body: "The modular grid allows designers to organize content with clarity and purpose. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide contrast and emphasis while preserving coherence across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet unified systems.",
  caption: `Copyright ${DEFAULT_COPYRIGHT_YEAR} Swiss Grid Generator`,
}

export const DEFAULT_STYLE_ASSIGNMENTS: Readonly<Record<BaseBlockId, BaseBlockId>> = {
  display: "display",
  headline: "headline",
  subhead: "subhead",
  body: "body",
  caption: "caption",
}

export function isBaseBlockId(key: string): key is BaseBlockId {
  return (BASE_BLOCK_IDS as readonly string[]).includes(key)
}

export function createDefaultTextContent(): Record<BaseBlockId, string> {
  return { ...DEFAULT_TEXT_CONTENT }
}

export function createDefaultStyleAssignments(): Record<BaseBlockId, BaseBlockId> {
  return { ...DEFAULT_STYLE_ASSIGNMENTS }
}
