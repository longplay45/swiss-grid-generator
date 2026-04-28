import { parseLoadedProject } from "@/lib/document-session"
import type {
  LayoutPresetCategory,
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
}

const PRESET_METADATA_OVERRIDES: Readonly<Record<string, PresetMetadataOverride>> = {}

export const LAYOUT_PRESET_CATEGORY_ORDER = ["presets", "examples", "users"] as const satisfies readonly LayoutPresetCategory[]

export const LAYOUT_PRESET_CATEGORY_LABELS: Readonly<Record<LayoutPresetCategory, string>> = {
  presets: "1. Presets",
  examples: "2. Examples",
  users: "3. Users",
}

export type LayoutPresetGroup = {
  category: LayoutPresetCategory
  label: string
  presets: LayoutPreset[]
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

function parsePresetSortPrefix(sourcePath: string): number | null {
  const match = getPresetBaseName(sourcePath).match(/^(\d{3})\b/)
  if (!match) return null
  const parsed = Number.parseInt(match[1] ?? "", 10)
  return Number.isFinite(parsed) ? parsed : null
}

function resolvePresetCategory(sourcePath: string): LayoutPresetCategory {
  const prefix = parsePresetSortPrefix(sourcePath)
  if (prefix !== null) {
    if (prefix >= 100 && prefix < 200) return "examples"
    if (prefix >= 0 && prefix < 100) return "presets"
  }
  return "presets"
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
  const aOrder = LAYOUT_PRESET_CATEGORY_ORDER.indexOf(resolvePresetCategory(a.path))
  const bOrder = LAYOUT_PRESET_CATEGORY_ORDER.indexOf(resolvePresetCategory(b.path))
  if (aOrder !== bOrder) return aOrder - bOrder
  return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" })
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
    category: resolvePresetCategory(sourcePath),
    source: "bundled",
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

export const LAYOUT_PRESET_GROUPS: LayoutPresetGroup[] = LAYOUT_PRESET_CATEGORY_ORDER.map((category) => ({
  category,
  label: LAYOUT_PRESET_CATEGORY_LABELS[category],
  presets: LAYOUT_PRESETS.filter((preset) => preset.category === category),
}))

export type { LayoutPreset }
