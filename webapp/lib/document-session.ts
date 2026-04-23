export type ProjectMetadata = {
  title: string
  description: string
  author: string
  createdAt?: string
}

export type ProjectPageFacingRole = "primary" | "secondary"
export type ProjectPageLayoutMode = "single" | "facing"

export type ProjectPageFacing = {
  peerId: string
  role: ProjectPageFacingRole
}

// NEW: Project/Pages/Layers architecture
export type ProjectPage<Layout> = {
  id: string
  name: string
  uiSettings: Record<string, unknown>
  previewLayout: Layout | null
  layoutMode?: ProjectPageLayoutMode
  facing?: ProjectPageFacing | null
}

export type LoadedProject<Layout> = {
  activePageId: string
  pages: ProjectPage<Layout>[]
  metadata: ProjectMetadata
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
  facing = null,
}: {
  id?: string
  name?: string
  uiSettings: Record<string, unknown>
  previewLayout: Layout | null
  layoutMode?: ProjectPageLayoutMode
  facing?: ProjectPageFacing | null
}): ProjectPage<Layout> {
  const trimmedId = typeof id === "string" ? id.trim() : ""

  return {
    id: trimmedId.length > 0 ? trimmedId : createProjectPageId(),
    name: toPageName(name, DEFAULT_PAGE_NAME),
    uiSettings,
    previewLayout,
    layoutMode,
    facing,
  }
}

export function createDefaultProject<Layout>({
  uiSettings,
  previewLayout,
  metadata = EMPTY_PROJECT_METADATA,
  defaultPageName = DEFAULT_PAGE_NAME,
}: {
  uiSettings: Record<string, unknown>
  previewLayout: Layout | null
  metadata?: ProjectMetadata
  defaultPageName?: string
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
    const rawFacing = payload.facing
    const layoutMode = payload.layoutMode === "facing" ? "facing" : "single"
    const facing = (
      typeof rawFacing === "object"
      && rawFacing !== null
      && typeof (rawFacing as Record<string, unknown>).peerId === "string"
      && (((rawFacing as Record<string, unknown>).role === "primary") || ((rawFacing as Record<string, unknown>).role === "secondary"))
    )
      ? {
          peerId: ((rawFacing as Record<string, unknown>).peerId as string).trim(),
          role: (rawFacing as Record<string, unknown>).role as ProjectPageFacingRole,
        }
      : null
    const page = createProjectPage<Layout>({
      id,
      name: toPageName(payload.name, `Page ${index + 1}`),
      uiSettings: payload.uiSettings as Record<string, unknown>,
      previewLayout: toLoadedPreviewLayout<Layout>(payload.previewLayout),
      layoutMode,
      facing: facing && facing.peerId.length > 0 ? facing : null,
    })

    seenIds.add(page.id)
    pages.push(page)
  })

  return normalizeProjectPageFacing(pages)
}

export function parseLoadedProject<Layout>(source: unknown): LoadedProject<Layout> {
  if (typeof source !== "object" || source === null) {
    throw new Error("Invalid project JSON: expected an object payload.")
  }

  const payload = source as Record<string, unknown>
  const metadata = extractProjectMetadata(payload)
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
  })
}

export function normalizeProjectPageFacing<Layout>(
  pages: readonly ProjectPage<Layout>[],
): ProjectPage<Layout>[] {
  const pageById = new Map(pages.map((page) => [page.id, page]))
  const normalizedById = new Map<string, ProjectPageFacing>()
  const pairedIds = new Set<string>()

  const registerPair = (primary: ProjectPage<Layout>, secondary: ProjectPage<Layout>) => {
    if (primary.id === secondary.id) return
    if (pairedIds.has(primary.id) || pairedIds.has(secondary.id)) return
    pairedIds.add(primary.id)
    pairedIds.add(secondary.id)
    normalizedById.set(primary.id, { peerId: secondary.id, role: "primary" })
    normalizedById.set(secondary.id, { peerId: primary.id, role: "secondary" })
  }

  for (const page of pages) {
    if (page.facing?.role !== "primary") continue
    const peer = pageById.get(page.facing.peerId)
    if (!peer) continue
    registerPair(page, peer)
  }

  for (const page of pages) {
    if (page.facing?.role !== "secondary") continue
    if (pairedIds.has(page.id)) continue
    const peer = pageById.get(page.facing.peerId)
    if (!peer) continue
    registerPair(peer, page)
  }

  return pages.map((page) => {
    const normalizedFacing = normalizedById.get(page.id) ?? null
    const currentFacing = page.facing ?? null
    if (
      (currentFacing?.peerId ?? null) === (normalizedFacing?.peerId ?? null)
      && (currentFacing?.role ?? null) === (normalizedFacing?.role ?? null)
    ) {
      return page
    }
    return {
      ...page,
      facing: normalizedFacing,
    }
  })
}

export function normalizeProjectPageOrderWithFacing<Layout>(
  pages: readonly ProjectPage<Layout>[],
): ProjectPage<Layout>[] {
  const normalizedPages = normalizeProjectPageFacing(pages)
  const pageById = new Map(normalizedPages.map((page) => [page.id, page]))
  const ordered: ProjectPage<Layout>[] = []
  const seenIds = new Set<string>()

  for (const page of normalizedPages) {
    if (seenIds.has(page.id)) continue

    const facing = page.facing
    if (facing?.role === "secondary") {
      const primary = pageById.get(facing.peerId)
      if (primary && !seenIds.has(primary.id)) continue
    }

    ordered.push(page)
    seenIds.add(page.id)

    if (facing?.role === "primary") {
      const secondary = pageById.get(facing.peerId)
      if (secondary && !seenIds.has(secondary.id)) {
        ordered.push(secondary)
        seenIds.add(secondary.id)
      }
    }
  }

  for (const page of normalizedPages) {
    if (seenIds.has(page.id)) continue
    ordered.push(page)
    seenIds.add(page.id)
  }

  return ordered
}

export function resolveProjectPageFacingPair<Layout>(
  pages: readonly ProjectPage<Layout>[],
  pageId: string,
): { primary: ProjectPage<Layout>; secondary: ProjectPage<Layout> } | null {
  const page = pages.find((entry) => entry.id === pageId)
  if (!page?.facing) return null
  const peer = pages.find((entry) => entry.id === page.facing?.peerId)
  if (!peer) return null
  return page.facing.role === "primary"
    ? { primary: page, secondary: peer }
    : { primary: peer, secondary: page }
}

export function filterVisibleProjectPages<Layout>(
  pages: readonly ProjectPage<Layout>[],
): ProjectPage<Layout>[] {
  return pages.filter((page) => page.facing?.role !== "secondary")
}

export function resolveVisibleProjectPageId<Layout>(
  pages: readonly ProjectPage<Layout>[],
  pageId: string,
): string {
  const pair = resolveProjectPageFacingPair(pages, pageId)
  if (!pair) return pageId
  return pair.primary.id
}

export function getPreviewLayoutSeed<Layout>(layout: Layout | null, defaultLayout: Layout | null): Layout {
  if (layout) return layout
  if (defaultLayout) return defaultLayout
  throw new Error("Default preview layout is unavailable.")
}
