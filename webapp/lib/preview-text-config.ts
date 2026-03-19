import type { BlockEditorStyleOption } from "@/components/editor/block-editor-types"
import type { GridResult } from "@/lib/grid-calculator"

export type PreviewTypographyStyleKey = keyof GridResult["typography"]["styles"]

export const PREVIEW_STYLE_OPTIONS: BlockEditorStyleOption<PreviewTypographyStyleKey>[] = [
  { value: "fx", label: "FX" },
  { value: "display", label: "Display" },
  { value: "headline", label: "Headline" },
  { value: "subhead", label: "Subhead" },
  { value: "body", label: "Body" },
  { value: "caption", label: "Caption" },
]

const PREVIEW_DUMMY_TEXT_BY_STYLE: Record<PreviewTypographyStyleKey, string> = {
  fx: "Swiss Design",
  display: "Swiss Design",
  headline: "Modular Grid Systems",
  subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
  body: "The modular grid allows designers to organize content with clarity and purpose. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide contrast and emphasis while preserving coherence across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet unified systems.",
  caption: "Based on Müller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
}

export function formatPtSize(size: number): string {
  return Number.isInteger(size) ? `${size}pt` : `${size.toFixed(1)}pt`
}

export function getDummyTextForStyle(style: string): string {
  return PREVIEW_DUMMY_TEXT_BY_STYLE[style as PreviewTypographyStyleKey] ?? PREVIEW_DUMMY_TEXT_BY_STYLE.body
}
