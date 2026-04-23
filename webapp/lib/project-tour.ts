import {
  ALL_HELP_SECTION_ITEMS,
  type HelpSectionId,
} from "@/lib/help-registry"

export type ProjectTourSidebarPanel = "layers" | "help"

export type ProjectTourStepAdvance =
  | { type: "manual" }
  | { type: "layerClick"; layerKey: string }

export type ProjectTourStep = {
  id: string
  title: string
  caption: string
  pageId?: string
  focusLayerKey?: string
  sidebarPanel?: ProjectTourSidebarPanel
  helpSectionId?: HelpSectionId
  autoSelectLayer?: boolean
  openEditor?: boolean
  advanceOn?: ProjectTourStepAdvance
}

export type ProjectTour = {
  id: string
  title: string
  description?: string
  startStepId?: string
  autoStart?: boolean
  steps: ProjectTourStep[]
}

const HELP_SECTION_IDS = new Set<string>(ALL_HELP_SECTION_ITEMS.map((item) => item.id))

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function parseTourStepAdvance(value: unknown): ProjectTourStepAdvance | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined
  }
  const payload = value as Record<string, unknown>
  if (payload.type === "manual") {
    return { type: "manual" }
  }
  if (payload.type === "layerClick") {
    const layerKey = toOptionalText(payload.layerKey)
    if (!layerKey) return undefined
    return {
      type: "layerClick",
      layerKey,
    }
  }
  return undefined
}

function parseTourStep(value: unknown, index: number): ProjectTourStep | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  const payload = value as Record<string, unknown>
  const id = toOptionalText(payload.id) ?? `step-${index + 1}`
  const caption = toOptionalText(payload.caption)
  if (!caption) return null

  const title = toOptionalText(payload.title) ?? `Step ${index + 1}`
  const pageId = toOptionalText(payload.pageId)
  const focusLayerKey = toOptionalText(payload.focusLayerKey)
  const sidebarPanel = payload.sidebarPanel === "layers" || payload.sidebarPanel === "help"
    ? payload.sidebarPanel
    : undefined
  const helpSectionIdRaw = toOptionalText(payload.helpSectionId)
  const helpSectionId = helpSectionIdRaw && HELP_SECTION_IDS.has(helpSectionIdRaw)
    ? helpSectionIdRaw as HelpSectionId
    : undefined
  const advanceOn = parseTourStepAdvance(payload.advanceOn) ?? { type: "manual" as const }
  const autoSelectLayer = typeof payload.autoSelectLayer === "boolean"
    ? payload.autoSelectLayer
    : advanceOn.type !== "layerClick"

  return {
    id,
    title,
    caption,
    pageId,
    focusLayerKey,
    sidebarPanel,
    helpSectionId,
    autoSelectLayer,
    openEditor: payload.openEditor === true,
    advanceOn,
  }
}

export function parseProjectTour(value: unknown): ProjectTour | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const payload = value as Record<string, unknown>
  const steps = Array.isArray(payload.steps)
    ? payload.steps
        .map((entry, index) => parseTourStep(entry, index))
        .filter((entry): entry is ProjectTourStep => entry !== null)
    : []

  if (steps.length === 0) {
    return null
  }

  const id = toOptionalText(payload.id) ?? "project-tour"
  const title = toOptionalText(payload.title) ?? "Project Tour"

  return {
    id,
    title,
    description: toOptionalText(payload.description),
    startStepId: toOptionalText(payload.startStepId),
    autoStart: payload.autoStart === false ? false : true,
    steps,
  }
}

export function resolveProjectTourStartIndex(tour: ProjectTour): number {
  if (!tour.startStepId) return 0
  const startIndex = tour.steps.findIndex((step) => step.id === tour.startStepId)
  return startIndex >= 0 ? startIndex : 0
}
