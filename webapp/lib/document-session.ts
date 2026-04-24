import {
  parseProjectTour,
  type ProjectTour,
} from "@/lib/project-tour"

export type ProjectMetadata = {
  title: string
  description: string
  author: string
  createdAt?: string
}

export type ProjectPageLayoutMode = "single" | "facing"

// NEW: Project/Pages/Layers architecture
export type ProjectPage<Layout> = {
  id: string
  name: string
  uiSettings: Record<string, unknown>
  previewLayout: Layout | null
  layoutMode?: ProjectPageLayoutMode
}

export type LoadedProject<Layout> = {
  activePageId: string
  pages: ProjectPage<Layout>[]
  metadata: ProjectMetadata
  tour?: ProjectTour | null
}

export const EMPTY_PROJECT_METADATA: ProjectMetadata = {
  title: "",
  description: "",
  author: "",
}

const DEFAULT_PAGE_NAME = "Page 1"
let projectPageSequence = 0

function createProjectPageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `page-${crypto.randomUUID()}`
  }
  projectPageSequence += 1
  return `page-${Date.now()}-${projectPageSequence}`
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

export function extractProjectMetadata(source: unknown): ProjectMetadata {
  if (typeof source !== "object" || source === null) {
    return EMPTY_PROJECT_METADATA
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

function toPageName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export function createProjectPage<Layout>({
  id,
  name = DEFAULT_PAGE_NAME,
  uiSettings,
  previewLayout,
  layoutMode = "single",
}: {
  id?: string
  name?: string
  uiSettings: Record<string, unknown>
  previewLayout: Layout | null
  layoutMode?: ProjectPageLayoutMode
}): ProjectPage<Layout> {
  const trimmedId = typeof id === "string" ? id.trim() : ""

  return {
    id: trimmedId.length > 0 ? trimmedId : createProjectPageId(),
    name: toPageName(name, DEFAULT_PAGE_NAME),
    uiSettings,
    previewLayout,
    layoutMode,
  }
}

export function createDefaultProject<Layout>({
  uiSettings,
  previewLayout,
  metadata = EMPTY_PROJECT_METADATA,
  defaultPageName = DEFAULT_PAGE_NAME,
  tour = null,
}: {
  uiSettings: Record<string, unknown>
  previewLayout: Layout | null
  metadata?: ProjectMetadata
  defaultPageName?: string
  tour?: ProjectTour | null
}): LoadedProject<Layout> {
  const page = createProjectPage({
    name: defaultPageName,
    uiSettings,
    previewLayout,
  })

  return {
    activePageId: page.id,
    pages: [page],
    metadata,
    tour,
  }
}

function parseProjectPages<Layout>(value: unknown): ProjectPage<Layout>[] {
  if (!Array.isArray(value)) return []

  const seenIds = new Set<string>()
  const pages: ProjectPage<Layout>[] = []

  value.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null) return
    const payload = entry as Record<string, unknown>
    if (!payload.uiSettings || typeof payload.uiSettings !== "object") return

    const rawId = typeof payload.id === "string" ? payload.id.trim() : ""
    const id = rawId.length > 0 && !seenIds.has(rawId) ? rawId : undefined
    const layoutMode = payload.layoutMode === "facing" ? "facing" : "single"
    const page = createProjectPage<Layout>({
      id,
      name: toPageName(payload.name, `Page ${index + 1}`),
      uiSettings: payload.uiSettings as Record<string, unknown>,
      previewLayout: toLoadedPreviewLayout<Layout>(payload.previewLayout),
      layoutMode,
    })

    seenIds.add(page.id)
    pages.push(page)
  })

  return pages
}

export function parseLoadedProject<Layout>(source: unknown): LoadedProject<Layout> {
  if (typeof source !== "object" || source === null) {
    throw new Error("Invalid project JSON: expected an object payload.")
  }

  const payload = source as Record<string, unknown>
  const metadata = extractProjectMetadata(payload)
  const tour = parseProjectTour(payload.tour)
  const parsedPages = parseProjectPages<Layout>(payload.pages)

  if (parsedPages.length > 0) {
    const activePageId = typeof payload.activePageId === "string"
      && parsedPages.some((page) => page.id === payload.activePageId)
      ? payload.activePageId
      : parsedPages[0].id

    return {
      activePageId,
      pages: parsedPages,
      metadata,
      tour,
    }
  }

  if (!payload.uiSettings || typeof payload.uiSettings !== "object") {
    throw new Error("Invalid project JSON: missing pages or legacy uiSettings payload.")
  }

  // NEW: Preserve legacy single-page JSON by wrapping it in a default one-page project.
  return createDefaultProject({
    uiSettings: payload.uiSettings as Record<string, unknown>,
    previewLayout: toLoadedPreviewLayout<Layout>(payload.previewLayout),
    metadata,
    tour,
  })
}

export function getPreviewLayoutSeed<Layout>(layout: Layout | null, defaultLayout: Layout | null): Layout {
  if (layout) return layout
  if (defaultLayout) return defaultLayout
  throw new Error("Default preview layout is unavailable.")
}
