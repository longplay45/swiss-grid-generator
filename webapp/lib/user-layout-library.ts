import Dexie, { liveQuery } from "dexie"

import { parseLoadedProject } from "@/lib/document-session"
import { buildPresetBrowserPage } from "@/lib/presets/browser-page"
import type { LayoutPreset, LayoutPresetProjectSource } from "@/lib/presets/types"

type StoredUserProject = {
  id: string
  label: string
  title: string
  description: string
  author: string
  createdAt: string
  updatedAt: string
  originPresetId?: string
  project: LayoutPresetProjectSource
}

type SaveUserProjectArgs = {
  id?: string | null
  label: string
  title: string
  description: string
  author: string
  createdAt: string
  originPresetId?: string | null
  project: LayoutPresetProjectSource
}

const USER_LAYOUT_LIBRARY_DB_NAME = "swiss-grid-generator-user-layouts"
const USER_LAYOUT_SOURCE_PATH_PREFIX = "user-library"

class UserLayoutLibraryDb extends Dexie {
  projects!: Dexie.Table<StoredUserProject, string>

  constructor() {
    super(USER_LAYOUT_LIBRARY_DB_NAME)
    this.version(1).stores({
      projects: "id, updatedAt, createdAt, label",
    })
  }
}

let db: UserLayoutLibraryDb | null = null

function getDb(): UserLayoutLibraryDb {
  if (db) return db
  db = new UserLayoutLibraryDb()
  return db
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined"
}

function createUserProjectId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `user-${Date.now()}`
}

function normalizeStoredProject(record: StoredUserProject): StoredUserProject {
  const parsed = parseLoadedProject<Record<string, unknown>>(record.project)
  const createdAt = record.createdAt && !Number.isNaN(Date.parse(record.createdAt))
    ? new Date(record.createdAt).toISOString()
    : parsed.metadata.createdAt && !Number.isNaN(Date.parse(parsed.metadata.createdAt))
      ? new Date(parsed.metadata.createdAt).toISOString()
      : new Date(record.updatedAt).toISOString()

  return {
    ...record,
    createdAt,
    project: {
      ...record.project,
      title: record.title,
      description: record.description,
      author: record.author,
      createdAt,
    },
  }
}

function toUserPreset(record: StoredUserProject): LayoutPreset {
  const normalized = normalizeStoredProject(record)
  const parsed = parseLoadedProject<Record<string, unknown>>(normalized.project)
  const browserPage = parsed.pages[0]
  if (!browserPage) {
    throw new Error(`Invalid user project "${normalized.id}": missing browser page`)
  }

  return {
    id: normalized.id,
    category: "users",
    source: "user",
    userProjectId: normalized.id,
    originPresetId: normalized.originPresetId,
    label: normalized.label,
    title: normalized.title || undefined,
    description: normalized.description || undefined,
    author: normalized.author || undefined,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    projectSourceJson: JSON.stringify(normalized.project),
    browserPage: buildPresetBrowserPage(
      browserPage,
      `${USER_LAYOUT_SOURCE_PATH_PREFIX}/${normalized.id}.json`,
    ),
  }
}

export async function saveProjectToUserLibrary({
  id,
  label,
  title,
  description,
  author,
  createdAt,
  originPresetId,
  project,
}: SaveUserProjectArgs): Promise<string> {
  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB is unavailable in this browser.")
  }

  const nextId = typeof id === "string" && id.trim().length > 0 ? id.trim() : createUserProjectId()
  const now = new Date().toISOString()
  const normalizedCreatedAt = createdAt && !Number.isNaN(Date.parse(createdAt))
    ? new Date(createdAt).toISOString()
    : now

  await getDb().projects.put({
    id: nextId,
    label,
    title,
    description,
    author,
    createdAt: normalizedCreatedAt,
    updatedAt: now,
    originPresetId: typeof originPresetId === "string" && originPresetId.trim().length > 0 ? originPresetId : undefined,
    project: {
      ...project,
      title,
      description,
      author,
      createdAt: normalizedCreatedAt,
    },
  })

  return nextId
}

export async function deleteUserProjectFromLibrary(id: string): Promise<void> {
  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB is unavailable in this browser.")
  }

  const normalizedId = id.trim()
  if (!normalizedId) {
    throw new Error("User project id is required.")
  }

  await getDb().projects.delete(normalizedId)
}

export async function listUserLayoutPresets(): Promise<LayoutPreset[]> {
  if (!isIndexedDbAvailable()) return []

  const records = await getDb().projects.orderBy("updatedAt").reverse().toArray()
  return records.flatMap((record) => {
    try {
      return [toUserPreset(record)]
    } catch (error) {
      console.error(`Skipping invalid user project "${record.id}" from IndexedDB.`, error)
      return []
    }
  })
}

export const userLayoutPresetQuery = liveQuery(async () => listUserLayoutPresets())
