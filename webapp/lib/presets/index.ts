import { parseLoadedProject } from "@/lib/document-session"
import type {
  LayoutPreset,
  LayoutPresetProjectSource,
} from "@/lib/presets/types"
import { buildPresetBrowserPage } from "@/lib/presets/browser-page"
import presetDinAbPortrait4x4Method1 from "./data/din_ab_portrait_4x4_method1_12.000pt_grid.json"
import presetDinAbPortrait4x4Method1Alt from "./data/din_ab_portrait_4x4_method1_12.000pt_grid_002.json"
import presetImagePlaceholder from "./data/4x4 12pt grid with image placeholder.json"

type PresetManifestEntry = {
  path: string
  source: unknown
  label?: string
}

const PRESET_MANIFEST: readonly PresetManifestEntry[] = [
  {
    path: "./data/din_ab_portrait_4x4_method1_12.000pt_grid.json",
    source: presetDinAbPortrait4x4Method1,
    label: "4x4 Progressive",
  },
  {
    path: "./data/din_ab_portrait_4x4_method1_12.000pt_grid_002.json",
    source: presetDinAbPortrait4x4Method1Alt,
    label: "3x4 Baseline",
  },
  {
    path: "./data/4x4 12pt grid with image placeholder.json",
    source: presetImagePlaceholder,
    label: "Image Placeholder",
  },
] as const

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

function toProjectSource(source: unknown, sourcePath: string): LayoutPresetProjectSource {
  const payload = isObjectRecord(source) && isObjectRecord(source.default)
    ? source.default
    : source

  if (!isObjectRecord(payload)) {
    throw new Error(`Invalid preset "${sourcePath}": expected an object`)
  }

  if (!Array.isArray(payload.pages)) {
    throw new Error(`Invalid preset "${sourcePath}": bundled presets must use project JSON with pages[]`)
  }

  return payload
}
function parseLayoutPreset(
  { path: sourcePath, source, label: manifestLabel }: PresetManifestEntry,
): LayoutPreset {
  const projectSource = toProjectSource(source, sourcePath)
  const project = parseLoadedProject<Record<string, unknown>>(projectSource)
  const browserPage = project.pages[0]

  if (!browserPage) {
    throw new Error(`Invalid preset "${sourcePath}": project JSON must include at least one page`)
  }

  const title = toOptionalText(project.metadata.title)
  const description = toOptionalText(project.metadata.description)
  const author = toOptionalText(project.metadata.author)

  return {
    id: toPresetId(sourcePath),
    label: manifestLabel ?? title ?? toPresetLabel(sourcePath),
    title,
    description,
    author,
    createdAt: project.metadata.createdAt,
    projectSource,
    browserPage: buildPresetBrowserPage(browserPage, sourcePath),
  }
}

export const LAYOUT_PRESETS: LayoutPreset[] = PRESET_MANIFEST.map((entry) => parseLayoutPreset(entry))

export type { LayoutPreset }
