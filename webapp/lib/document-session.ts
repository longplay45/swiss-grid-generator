import type { LayoutPreset } from "@/lib/presets"

export type DocumentMetadata = {
  title: string
  description: string
  author: string
  createdAt?: string
}

export type LoadedDocument<Layout> = {
  uiSettings: Record<string, unknown>
  previewLayout: Layout | null
  metadata: DocumentMetadata
}

export const EMPTY_DOCUMENT_METADATA: DocumentMetadata = {
  title: "",
  description: "",
  author: "",
}

function toNormalizedIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return undefined
  return new Date(parsed).toISOString()
}

function toDocumentText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function extractDocumentMetadata(source: unknown): DocumentMetadata {
  if (typeof source !== "object" || source === null) {
    return EMPTY_DOCUMENT_METADATA
  }
  const payload = source as Record<string, unknown>
  return {
    title: toDocumentText(payload.title),
    description: toDocumentText(payload.description),
    author: toDocumentText(payload.author),
    createdAt: toNormalizedIsoDate(payload.createdAt) ?? toNormalizedIsoDate(payload.exportedAt),
  }
}

function toLoadedPreviewLayout<Layout>(value: unknown): Layout | null {
  return value && typeof value === "object" ? value as Layout : null
}

export function parseLoadedDocument<Layout>(source: unknown): LoadedDocument<Layout> {
  if (typeof source !== "object" || source === null) {
    throw new Error("Invalid layout JSON: expected an object payload.")
  }
  const payload = source as Record<string, unknown>
  if (!payload.uiSettings || typeof payload.uiSettings !== "object") {
    throw new Error("Invalid layout JSON: missing uiSettings.")
  }

  return {
    uiSettings: payload.uiSettings as Record<string, unknown>,
    previewLayout: toLoadedPreviewLayout<Layout>(payload.previewLayout),
    metadata: extractDocumentMetadata(payload),
  }
}

export function presetToLoadedDocument<Layout>(preset: LayoutPreset): LoadedDocument<Layout> {
  return {
    uiSettings: preset.uiSettings,
    previewLayout: preset.previewLayout ? preset.previewLayout as Layout : null,
    metadata: {
      title: preset.title ?? "",
      description: preset.description ?? "",
      author: preset.author ?? "",
      createdAt: toNormalizedIsoDate(preset.createdAt),
    },
  }
}

export function getPreviewLayoutSeed<Layout>(layout: Layout | null, defaultLayout: Layout | null): Layout {
  if (layout) return layout
  if (defaultLayout) return defaultLayout
  throw new Error("Default preview layout is unavailable.")
}
