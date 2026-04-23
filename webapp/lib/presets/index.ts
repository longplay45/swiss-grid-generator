import { parseLoadedProject } from "@/lib/document-session"
import type {
  LayoutPreset,
  LayoutPresetProjectSource,
} from "@/lib/presets/types"
import { buildPresetBrowserPage } from "@/lib/presets/browser-page"
import { GENERATED_PRESET_MANIFEST } from "./generated-manifest"

type PresetManifestEntry = {
  path: string
  sourceJson: string
}

type PresetMetadataOverride = {
  label?: string
  sortOrder?: number
}

const PRESET_METADATA_OVERRIDES: Readonly<Record<string, PresetMetadataOverride>> = {
  "./data/din_ab_portrait_4x4_method1_12.000pt_grid.json": {
    label: "4x4 Progressive",
    sortOrder: 10,
  },
  "./data/din_ab_portrait_4x4_method1_12.000pt_grid_002.json": {
    label: "3x4 Baseline",
    sortOrder: 20,
  },
  "./data/4x4 12pt grid with image placeholder.json": {
    label: "Image Placeholder",
    sortOrder: 30,
  },
  "./data/050 Hamlet Reading Edition.json": {
    label: "Hamlet",
    sortOrder: 50,
  },
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null
)

function getPresetBaseName(sourcePath: string): string {
  const segments = sourcePath.split("/")
  return segments[segments.length - 1] ?? sourcePath
}

function toPresetId(sourcePath: string): string {
  return getPresetBaseName(sourcePath)
    .replace(/\.json$/i, "")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
}

function toPresetLabel(sourcePath: string): string {
  const cleaned = getPresetBaseName(sourcePath)
    .replace(/\.json$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return cleaned
    .split(" ")
    .map((token) => (token ? `${token.charAt(0).toUpperCase()}${token.slice(1)}` : token))
    .join(" ")
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseProjectSourceJson(sourceJson: string, sourcePath: string): LayoutPresetProjectSource {
  let payload: unknown
  try {
    payload = JSON.parse(sourceJson)
  } catch (error) {
    throw new Error(
      `Invalid preset "${sourcePath}": ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (!isObjectRecord(payload)) {
    throw new Error(`Invalid preset "${sourcePath}": expected an object`)
  }

  if (!Array.isArray(payload.pages)) {
    throw new Error(`Invalid preset "${sourcePath}": bundled presets must use project JSON with pages[]`)
  }

  return payload
}

function comparePresetEntries(a: PresetManifestEntry, b: PresetManifestEntry): number {
  const aOrder = PRESET_METADATA_OVERRIDES[a.path]?.sortOrder ?? Number.MAX_SAFE_INTEGER
  const bOrder = PRESET_METADATA_OVERRIDES[b.path]?.sortOrder ?? Number.MAX_SAFE_INTEGER
  if (aOrder !== bOrder) return aOrder - bOrder
  return a.path.localeCompare(b.path)
}

function parseLayoutPreset(
  { path: sourcePath, sourceJson }: PresetManifestEntry,
): LayoutPreset {
  const project = parseLoadedProject<Record<string, unknown>>(parseProjectSourceJson(sourceJson, sourcePath))
  const browserPage = project.pages[0]

  if (!browserPage) {
    throw new Error(`Invalid preset "${sourcePath}": project JSON must include at least one page`)
  }

  const title = toOptionalText(project.metadata.title)
  const description = toOptionalText(project.metadata.description)
  const author = toOptionalText(project.metadata.author)

  return {
    id: toPresetId(sourcePath),
    label: PRESET_METADATA_OVERRIDES[sourcePath]?.label ?? title ?? toPresetLabel(sourcePath),
    title,
    description,
    author,
    createdAt: project.metadata.createdAt,
    projectSourceJson: sourceJson,
    browserPage: buildPresetBrowserPage(browserPage, sourcePath),
  }
}

export const LAYOUT_PRESETS: LayoutPreset[] = [...GENERATED_PRESET_MANIFEST]
  .sort(comparePresetEntries)
  .map((entry) => parseLayoutPreset(entry))

export type { LayoutPreset }
