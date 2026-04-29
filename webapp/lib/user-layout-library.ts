import Dexie, { liveQuery } from "dexie"

import { parseLoadedProject } from "@/lib/document-session"
import { buildPresetBrowserPage } from "@/lib/presets/browser-page"
import type { LayoutPreset, LayoutPresetProjectSource } from "@/lib/presets/types"
import {
  buildProjectTransferPayload,
  encodeProjectTransferPayload,
  parseProjectTransferPayloadBytes,
  toArrayBuffer,
} from "@/lib/project-transfer"

export type UserProjectSyncState = "local" | "syncing" | "synced" | "conflict" | "error" | "deleted"
export type CloudActivityLevel = "info" | "success" | "warning" | "error"

export type CloudActivityLogEntry = {
  id: string
  createdAt: string
  level: CloudActivityLevel
  action: string
  message?: string
  projectTitle?: string
}

type StoredUserProjectRow = {
  id: string
  label: string
  title: string
  description: string
  author: string
  createdAt: string
  updatedAt: string
  originPresetId?: string
  ownerUserId?: string
  remoteProjectId?: string
  remoteRevision?: number
  syncState?: UserProjectSyncState
  syncError?: string | null
  lastSyncedAt?: string
  deletedAt?: string | null
  projectCompression?: "gzip"
  projectArchive?: ArrayBuffer
  project?: LayoutPresetProjectSource
}

type StoredCloudActivityRow = CloudActivityLogEntry

export type UserProjectRecord = Omit<StoredUserProjectRow, "projectArchive"> & {
  project: LayoutPresetProjectSource
}

type AddCloudActivityLogEntryArgs = {
  level: CloudActivityLevel
  action: string
  message?: string | null
  projectTitle?: string | null
}

type SaveUserProjectArgs = {
  id?: string | null
  label: string
  title: string
  description: string
  author: string
  createdAt: string
  originPresetId?: string | null
  ownerUserId?: string | null
  remoteProjectId?: string | null
  remoteRevision?: number | null
  syncState?: UserProjectSyncState
  syncError?: string | null
  lastSyncedAt?: string | null
  updatedAt?: string | null
  project: LayoutPresetProjectSource
}

export type UpdateUserProjectSyncArgs = {
  id: string
  ownerUserId?: string | null
  remoteProjectId?: string | null
  remoteRevision?: number | null
  syncState?: UserProjectSyncState
  syncError?: string | null
  lastSyncedAt?: string | null
}

type UpsertCloudProjectArgs = {
  localId?: string | null
  ownerUserId: string
  remoteProjectId: string
  remoteRevision: number
  updatedAt: string
  lastSyncedAt?: string | null
  originPresetId?: string | null
  archiveBytes: ArrayBuffer
}

const USER_LAYOUT_LIBRARY_DB_NAME = "swiss-grid-generator-user-layouts"
const USER_LAYOUT_SOURCE_PATH_PREFIX = "user-library"
const CLOUD_ACTIVITY_LOG_LIMIT = 100

class UserLayoutLibraryDb extends Dexie {
  projects!: Dexie.Table<StoredUserProjectRow, string>
  cloudActivity!: Dexie.Table<StoredCloudActivityRow, string>

  constructor() {
    super(USER_LAYOUT_LIBRARY_DB_NAME)
    this.version(1).stores({
      projects: "id, updatedAt, createdAt, label",
    })
    this.version(2).stores({
      projects: "id, updatedAt, createdAt, label",
    }).upgrade((tx) => tx.table("projects").toCollection().modify((record: StoredUserProjectRow) => {
      if (record.projectArchive || !record.project) return
      const encoded = encodeProjectTransferPayload(
        buildProjectTransferPayload(parseLoadedProject<Record<string, unknown>>(record.project)),
        true,
      )
      record.projectArchive = toArrayBuffer(encoded.bytes)
      record.projectCompression = "gzip"
      delete record.project
    }))
    this.version(3).stores({
      projects: "id, updatedAt, createdAt, label, ownerUserId, remoteProjectId, syncState",
    }).upgrade((tx) => tx.table("projects").toCollection().modify((record: StoredUserProjectRow) => {
      if (!record.syncState) {
        record.syncState = record.remoteProjectId ? "synced" : "local"
      }
      if (record.syncError === undefined) {
        record.syncError = null
      }
      if (record.deletedAt === undefined) {
        record.deletedAt = null
      }
    }))
    this.version(4).stores({
      projects: "id, updatedAt, createdAt, label, ownerUserId, remoteProjectId, syncState",
      cloudActivity: "id, createdAt, level, action",
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

function createCloudActivityId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `cloud-activity-${Date.now()}`
}

function toOptionalLogText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 240) : undefined
}

function normalizeIsoDate(value: string | null | undefined, fallback: string): string {
  return value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toISOString()
    : fallback
}

function normalizeStoredProject(record: StoredUserProjectRow): UserProjectRecord {
  const projectSource = record.projectArchive
    ? parseProjectTransferPayloadBytes(record.projectArchive)
    : record.project
  if (!projectSource) {
    throw new Error(`Invalid user project "${record.id}": missing project archive`)
  }

  const parsed = parseLoadedProject<Record<string, unknown>>(projectSource)
  const createdAt = normalizeIsoDate(
    record.createdAt,
    parsed.metadata.createdAt && !Number.isNaN(Date.parse(parsed.metadata.createdAt))
      ? new Date(parsed.metadata.createdAt).toISOString()
      : new Date(record.updatedAt).toISOString(),
  )

  return {
    ...record,
    createdAt,
    syncState: record.syncState ?? (record.remoteProjectId ? "synced" : "local"),
    syncError: record.syncError ?? null,
    lastSyncedAt: record.lastSyncedAt ? new Date(record.lastSyncedAt).toISOString() : undefined,
    deletedAt: record.deletedAt ? new Date(record.deletedAt).toISOString() : null,
    project: {
      ...projectSource,
      title: record.title,
      description: record.description,
      author: record.author,
      createdAt,
    },
  }
}

function toUserPreset(record: UserProjectRecord): LayoutPreset {
  const parsed = parseLoadedProject<Record<string, unknown>>(record.project)
  const browserPage = parsed.pages[0]
  if (!browserPage) {
    throw new Error(`Invalid user project "${record.id}": missing browser page`)
  }

  return {
    id: record.id,
    category: "users",
    source: "user",
    userProjectId: record.id,
    originPresetId: record.originPresetId,
    syncState: record.syncState,
    label: record.label,
    title: record.title || undefined,
    description: record.description || undefined,
    author: record.author || undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    projectSourceJson: JSON.stringify(record.project),
    browserPage: buildPresetBrowserPage(
      browserPage,
      `${USER_LAYOUT_SOURCE_PATH_PREFIX}/${record.id}.swissgridgenerator`,
    ),
  }
}

export async function getUserProjectRecord(id: string): Promise<UserProjectRecord | null> {
  if (!isIndexedDbAvailable()) return null
  const record = await getDb().projects.get(id.trim())
  return record ? normalizeStoredProject(record) : null
}

export async function getUserProjectRecordByRemoteId(remoteProjectId: string): Promise<UserProjectRecord | null> {
  if (!isIndexedDbAvailable()) return null
  const normalizedRemoteId = remoteProjectId.trim()
  if (!normalizedRemoteId) return null
  const record = await getDb().projects.where("remoteProjectId").equals(normalizedRemoteId).first()
  return record ? normalizeStoredProject(record) : null
}

export async function listUserProjectRecords(): Promise<UserProjectRecord[]> {
  if (!isIndexedDbAvailable()) return []
  const records = await getDb().projects.orderBy("updatedAt").reverse().toArray()
  return records.flatMap((record) => {
    try {
      return [normalizeStoredProject(record)]
    } catch (error) {
      console.error(`Skipping invalid user project "${record.id}" from IndexedDB.`, error)
      return []
    }
  })
}

export async function saveProjectToUserLibrary({
  id,
  label,
  title,
  description,
  author,
  createdAt,
  originPresetId,
  ownerUserId,
  remoteProjectId,
  remoteRevision,
  syncState,
  syncError,
  lastSyncedAt,
  updatedAt,
  project,
}: SaveUserProjectArgs): Promise<string> {
  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB is unavailable in this browser.")
  }

  const nextId = typeof id === "string" && id.trim().length > 0 ? id.trim() : createUserProjectId()
  const existing = await getDb().projects.get(nextId)
  const now = new Date().toISOString()
  const normalizedCreatedAt = normalizeIsoDate(createdAt, now)
  const normalizedUpdatedAt = normalizeIsoDate(updatedAt, now)
  const projectDocument = parseLoadedProject<Record<string, unknown>>({
    ...project,
    title,
    description,
    author,
    createdAt: normalizedCreatedAt,
  })
  const encoded = encodeProjectTransferPayload(
    buildProjectTransferPayload(projectDocument),
    true,
  )

  await getDb().projects.put({
    id: nextId,
    label,
    title,
    description,
    author,
    createdAt: normalizedCreatedAt,
    updatedAt: normalizedUpdatedAt,
    originPresetId: typeof originPresetId === "string" && originPresetId.trim().length > 0
      ? originPresetId
      : existing?.originPresetId,
    ownerUserId: typeof ownerUserId === "string" && ownerUserId.trim().length > 0
      ? ownerUserId
      : existing?.ownerUserId,
    remoteProjectId: typeof remoteProjectId === "string" && remoteProjectId.trim().length > 0
      ? remoteProjectId
      : existing?.remoteProjectId,
    remoteRevision: typeof remoteRevision === "number" && Number.isFinite(remoteRevision)
      ? remoteRevision
      : existing?.remoteRevision,
    syncState: syncState ?? "local",
    syncError: syncError ?? null,
    lastSyncedAt: lastSyncedAt ? normalizeIsoDate(lastSyncedAt, now) : existing?.lastSyncedAt,
    deletedAt: null,
    projectCompression: "gzip",
    projectArchive: toArrayBuffer(encoded.bytes),
  })

  return nextId
}

export async function updateUserProjectSyncState({
  id,
  ownerUserId,
  remoteProjectId,
  remoteRevision,
  syncState,
  syncError,
  lastSyncedAt,
}: UpdateUserProjectSyncArgs): Promise<void> {
  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB is unavailable in this browser.")
  }
  const normalizedId = id.trim()
  if (!normalizedId) {
    throw new Error("User project id is required.")
  }

  await getDb().projects.update(normalizedId, {
    ...(typeof ownerUserId === "string" ? { ownerUserId: ownerUserId.trim() || undefined } : {}),
    ...(typeof remoteProjectId === "string" ? { remoteProjectId: remoteProjectId.trim() || undefined } : {}),
    ...(typeof remoteRevision === "number" && Number.isFinite(remoteRevision) ? { remoteRevision } : {}),
    ...(syncState ? { syncState } : {}),
    ...(syncError !== undefined ? { syncError } : {}),
    ...(lastSyncedAt !== undefined ? { lastSyncedAt: lastSyncedAt ? normalizeIsoDate(lastSyncedAt, new Date().toISOString()) : undefined } : {}),
  })
}

export async function upsertCloudProjectToUserLibrary({
  localId,
  ownerUserId,
  remoteProjectId,
  remoteRevision,
  updatedAt,
  lastSyncedAt,
  originPresetId,
  archiveBytes,
}: UpsertCloudProjectArgs): Promise<string> {
  const payload = parseProjectTransferPayloadBytes(archiveBytes)
  const project = parseLoadedProject<Record<string, unknown>>(payload)
  const existing = localId
    ? await getUserProjectRecord(localId)
    : await getUserProjectRecordByRemoteId(remoteProjectId)

  return saveProjectToUserLibrary({
    id: existing?.id ?? remoteProjectId,
    label: project.metadata.title.trim() || project.pages[0]?.name || "Untitled Project",
    title: project.metadata.title,
    description: project.metadata.description,
    author: project.metadata.author,
    createdAt: project.metadata.createdAt ?? new Date(updatedAt).toISOString(),
    updatedAt,
    originPresetId: originPresetId ?? existing?.originPresetId ?? null,
    ownerUserId,
    remoteProjectId,
    remoteRevision,
    syncState: "synced",
    syncError: null,
    lastSyncedAt: lastSyncedAt ?? updatedAt,
    project: payload,
  })
}

export async function markUserProjectDeleted(id: string): Promise<"deleted" | "purged"> {
  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB is unavailable in this browser.")
  }

  const normalizedId = id.trim()
  if (!normalizedId) {
    throw new Error("User project id is required.")
  }

  const existing = await getDb().projects.get(normalizedId)
  if (!existing) {
    return "purged"
  }

  if (!existing.remoteProjectId) {
    await getDb().projects.delete(normalizedId)
    return "purged"
  }

  await getDb().projects.update(normalizedId, {
    syncState: "deleted",
    syncError: null,
    deletedAt: new Date().toISOString(),
  })
  return "deleted"
}

export async function purgeUserProjectFromLibrary(id: string): Promise<void> {
  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB is unavailable in this browser.")
  }

  const normalizedId = id.trim()
  if (!normalizedId) {
    throw new Error("User project id is required.")
  }

  await getDb().projects.delete(normalizedId)
}

export async function deleteUserProjectFromLibrary(id: string): Promise<void> {
  await purgeUserProjectFromLibrary(id)
}

export async function addCloudActivityLogEntry({
  level,
  action,
  message,
  projectTitle,
}: AddCloudActivityLogEntryArgs): Promise<void> {
  try {
    if (!isIndexedDbAvailable()) return

    const normalizedAction = action.trim()
    if (!normalizedAction) return

    const table = getDb().cloudActivity
    await table.add({
      id: createCloudActivityId(),
      createdAt: new Date().toISOString(),
      level,
      action: normalizedAction.slice(0, 80),
      message: toOptionalLogText(message),
      projectTitle: toOptionalLogText(projectTitle),
    })

    const count = await table.count()
    if (count <= CLOUD_ACTIVITY_LOG_LIMIT) return

    const excess = count - CLOUD_ACTIVITY_LOG_LIMIT
    const oldEntries = await table
      .orderBy("createdAt")
      .limit(excess)
      .primaryKeys()
    if (oldEntries.length > 0) {
      await table.bulkDelete(oldEntries as string[])
    }
  } catch {
    // Diagnostic logging must never interrupt auth or sync work.
  }
}

export async function listCloudActivityLogEntries(limit = CLOUD_ACTIVITY_LOG_LIMIT): Promise<CloudActivityLogEntry[]> {
  if (!isIndexedDbAvailable()) return []
  return getDb().cloudActivity
    .orderBy("createdAt")
    .reverse()
    .limit(limit)
    .toArray()
}

export function formatCloudActivityLogForSupport(entries: readonly CloudActivityLogEntry[]): string {
  const lines = entries.map((entry) => {
    const parts = [
      entry.createdAt,
      entry.level.toUpperCase(),
      entry.action,
      entry.projectTitle ? `project="${entry.projectTitle}"` : null,
      entry.message ?? null,
    ].filter(Boolean)
    return parts.join(" | ")
  })
  return lines.length > 0 ? lines.join("\n") : "No local cloud activity log entries."
}

export async function listUserLayoutPresets(): Promise<LayoutPreset[]> {
  const records = await listUserProjectRecords()
  return records.flatMap((record) => {
    if (record.deletedAt) return []
    try {
      return [toUserPreset(record)]
    } catch (error) {
      console.error(`Skipping invalid user project "${record.id}" from IndexedDB.`, error)
      return []
    }
  })
}

export const userLayoutPresetQuery = liveQuery(async () => listUserLayoutPresets())
export const cloudActivityLogQuery = liveQuery(async () => listCloudActivityLogEntries())

export function createUserProjectRecordQuery(id: string | null | undefined) {
  return liveQuery(async () => {
    const normalizedId = id?.trim()
    return normalizedId ? getUserProjectRecord(normalizedId) : null
  })
}
