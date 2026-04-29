"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { SupabaseClient, User } from "@supabase/supabase-js"

import type { LoadedProject } from "@/lib/document-session"
import {
  createCloudProject,
  deleteCloudProject,
  downloadCloudProjectArchiveBytes,
  listCloudProjectRows,
  updateCloudProject,
  CloudProjectConflictError,
} from "@/lib/supabase/cloud-projects"
import {
  CLOUD_SYNC_CONFLICT_NOTICE,
  mapCloudSyncError,
  type UserFacingNotice,
} from "@/lib/supabase/error-messages"
import {
  addCloudActivityLogEntry,
  getUserProjectRecord,
  listUserProjectRecords,
  markUserProjectDeleted,
  purgeUserProjectFromLibrary,
  upsertCloudProjectToUserLibrary,
  updateUserProjectSyncState,
  type UserProjectRecord,
} from "@/lib/user-layout-library"
export type CloudSyncStatus = "signed_out" | "syncing" | "synced" | "offline" | "error" | "conflict"
export type CloudSyncRequestReason = "session" | "online" | "focus" | "visible" | "preset_browser" | "manual"

type CloudSyncRequestOptions = {
  force?: boolean
  throttleMs?: number
}

type Notice = {
  title: string
  message: string
}

type Args = {
  supabase: SupabaseClient | null
  user: User | null
  onRequestNotice?: (notice: Notice) => void
}

const DEFAULT_SYNC_THROTTLE_MS = 60_000

function hasLocalChangesAfterLastSync(record: UserProjectRecord): boolean {
  if (record.syncState === "local") return true
  if (!record.lastSyncedAt) return false
  const updatedAt = Date.parse(record.updatedAt)
  const lastSyncedAt = Date.parse(record.lastSyncedAt)
  if (Number.isNaN(updatedAt) || Number.isNaN(lastSyncedAt)) return false
  return updatedAt > lastSyncedAt + 1000
}

function toLoadedProject(record: UserProjectRecord): LoadedProject<Record<string, unknown>> {
  return {
    activePageId: typeof record.project.activePageId === "string"
      ? record.project.activePageId
      : "",
    pages: Array.isArray(record.project.pages)
      ? record.project.pages as LoadedProject<Record<string, unknown>>["pages"]
      : [],
    metadata: {
      title: record.title,
      description: record.description,
      author: record.author,
      createdAt: record.createdAt,
    },
    tour: (record.project.tour as LoadedProject<Record<string, unknown>>["tour"]) ?? null,
  }
}

export function useCloudProjectSync({ supabase, user, onRequestNotice }: Args) {
  const [status, setStatus] = useState<CloudSyncStatus>("signed_out")
  const [lastNotice, setLastNotice] = useState<UserFacingNotice | null>(null)
  const lastSyncAttemptAtRef = useRef(0)
  const syncAllProjectsPromiseRef = useRef<Promise<void> | null>(null)

  const syncProjectByLocalId = useCallback(async (localId: string): Promise<string | null> => {
    if (!supabase || !user) return null
    const localRecord = await getUserProjectRecord(localId)
    if (!localRecord) return null
    if (localRecord.syncState === "deleted" || localRecord.deletedAt) return localRecord.remoteProjectId ?? null
    if (localRecord.ownerUserId && localRecord.ownerUserId !== user.id) return localRecord.remoteProjectId ?? null

    await updateUserProjectSyncState({
      id: localRecord.id,
      ownerUserId: user.id,
      remoteProjectId: localRecord.remoteProjectId ?? null,
      remoteRevision: localRecord.remoteRevision ?? null,
      syncState: "syncing",
      syncError: null,
    })
    void addCloudActivityLogEntry({
      level: "info",
      action: localRecord.remoteProjectId ? "Project upload started" : "Project cloud create started",
      projectTitle: localRecord.title,
    })

    try {
      const loadedProject = toLoadedProject(localRecord)
      const remoteRow = localRecord.remoteProjectId
        ? await updateCloudProject(
          supabase,
          user.id,
          localRecord.remoteProjectId,
          localRecord.remoteRevision ?? 0,
          loadedProject,
        )
        : await createCloudProject(supabase, user.id, loadedProject)

      await updateUserProjectSyncState({
        id: localRecord.id,
        ownerUserId: user.id,
        remoteProjectId: remoteRow.id,
        remoteRevision: remoteRow.revision,
        syncState: "synced",
        syncError: null,
        lastSyncedAt: remoteRow.last_synced_at ?? remoteRow.updated_at,
      })
      void addCloudActivityLogEntry({
        level: "success",
        action: localRecord.remoteProjectId ? "Project uploaded" : "Project created in cloud",
        message: `revision ${remoteRow.revision}`,
        projectTitle: localRecord.title,
      })

      return remoteRow.id
    } catch (error) {
      if (error instanceof CloudProjectConflictError) {
        await updateUserProjectSyncState({
          id: localRecord.id,
          syncState: "conflict",
          syncError: CLOUD_SYNC_CONFLICT_NOTICE.message,
        })
        setStatus("conflict")
        setLastNotice(CLOUD_SYNC_CONFLICT_NOTICE)
        void addCloudActivityLogEntry({
          level: "warning",
          action: "Project sync conflict",
          message: CLOUD_SYNC_CONFLICT_NOTICE.message,
          projectTitle: localRecord.title,
        })
        return localRecord.remoteProjectId ?? null
      }

      const notice = mapCloudSyncError(error)
      await updateUserProjectSyncState({
        id: localRecord.id,
        syncState: "error",
        syncError: notice.message,
      })
      setStatus(navigator.onLine ? "error" : "offline")
      setLastNotice(notice)
      void addCloudActivityLogEntry({
        level: "error",
        action: "Project sync failed",
        message: notice.message,
        projectTitle: localRecord.title,
      })
      return localRecord.remoteProjectId ?? null
    }
  }, [supabase, user])

  const deleteProjectByLocalId = useCallback(async (localId: string): Promise<"no_op" | "purged_local" | "queued_cloud_delete" | "deleted_cloud"> => {
    const localRecord = await getUserProjectRecord(localId)
    if (!localRecord) return "no_op"

    const deletionResult = await markUserProjectDeleted(localRecord.id)

    if (!supabase || !user || !localRecord.remoteProjectId || localRecord.ownerUserId && localRecord.ownerUserId !== user.id) {
      void addCloudActivityLogEntry({
        level: "warning",
        action: "Cloud delete queued",
        projectTitle: localRecord.title,
      })
      return deletionResult === "purged" ? "purged_local" : "queued_cloud_delete"
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      void addCloudActivityLogEntry({
        level: "warning",
        action: "Cloud delete queued offline",
        projectTitle: localRecord.title,
      })
      return deletionResult === "purged" ? "purged_local" : "queued_cloud_delete"
    }

    try {
      setStatus("syncing")
      void addCloudActivityLogEntry({
        level: "info",
        action: "Cloud delete started",
        projectTitle: localRecord.title,
      })
      await deleteCloudProject(supabase, user.id, localRecord.remoteProjectId)
      await purgeUserProjectFromLibrary(localRecord.id)
      setStatus("synced")
      void addCloudActivityLogEntry({
        level: "success",
        action: "Cloud project deleted",
        projectTitle: localRecord.title,
      })
      return deletionResult === "purged" ? "purged_local" : "deleted_cloud"
    } catch (error) {
      const notice = mapCloudSyncError(error)
      setStatus(notice.title === "Cloud Offline" ? "offline" : "error")
      setLastNotice(notice)
      void addCloudActivityLogEntry({
        level: "error",
        action: "Cloud delete failed",
        message: notice.message,
        projectTitle: localRecord.title,
      })
      return deletionResult === "purged" ? "purged_local" : "queued_cloud_delete"
    }
  }, [supabase, user])

  const syncAllProjects = useCallback(async (reason: CloudSyncRequestReason = "manual") => {
    if (syncAllProjectsPromiseRef.current) {
      await syncAllProjectsPromiseRef.current
      return
    }

    const syncPromise = (async () => {
    if (!supabase || !user) {
      setStatus("signed_out")
      return
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline")
      void addCloudActivityLogEntry({
        level: "warning",
        action: "Cloud sync skipped offline",
      })
      return
    }

    setStatus("syncing")
    setLastNotice(null)
    lastSyncAttemptAtRef.current = Date.now()
    void addCloudActivityLogEntry({
      level: "info",
      action: "Cloud sync started",
      message: reason,
    })

    try {
      const initialLocalRecords = await listUserProjectRecords()

      for (const record of initialLocalRecords) {
        if ((record.syncState !== "deleted" && !record.deletedAt) || !record.remoteProjectId) continue
        if (record.ownerUserId && record.ownerUserId !== user.id) continue
        await deleteCloudProject(supabase, user.id, record.remoteProjectId)
        await purgeUserProjectFromLibrary(record.id)
        void addCloudActivityLogEntry({
          level: "success",
          action: "Queued cloud delete completed",
          projectTitle: record.title,
        })
      }

      const [localRecords, remoteRows] = await Promise.all([
        listUserProjectRecords(),
        listCloudProjectRows(supabase, user.id),
      ])
      const remoteProjectIds = new Set(remoteRows.map((row) => row.id))

      const localByRemoteId = new Map(
        localRecords
          .filter((record) => typeof record.remoteProjectId === "string" && record.remoteProjectId.length > 0)
          .map((record) => [record.remoteProjectId as string, record]),
      )

      let sawConflict = false

      for (const remoteRow of remoteRows) {
        const localRecord = localByRemoteId.get(remoteRow.id)

        if (!localRecord) {
          const archiveBytes = await downloadCloudProjectArchiveBytes(supabase, remoteRow.archive_path)
          await upsertCloudProjectToUserLibrary({
            ownerUserId: user.id,
            remoteProjectId: remoteRow.id,
            remoteRevision: remoteRow.revision,
            updatedAt: remoteRow.updated_at,
            lastSyncedAt: remoteRow.last_synced_at ?? remoteRow.updated_at,
            archiveBytes,
          })
          void addCloudActivityLogEntry({
            level: "success",
            action: "Cloud project downloaded",
            projectTitle: remoteRow.title,
          })
          continue
        }

        if (localRecord.syncState === "local" && localRecord.remoteRevision != null && localRecord.remoteRevision !== remoteRow.revision) {
          await updateUserProjectSyncState({
            id: localRecord.id,
            syncState: "conflict",
            syncError: CLOUD_SYNC_CONFLICT_NOTICE.message,
          })
          sawConflict = true
          setLastNotice(CLOUD_SYNC_CONFLICT_NOTICE)
          void addCloudActivityLogEntry({
            level: "warning",
            action: "Project sync conflict",
            message: CLOUD_SYNC_CONFLICT_NOTICE.message,
            projectTitle: localRecord.title,
          })
          continue
        }

        const localRevision = localRecord.remoteRevision ?? 0
        const shouldPullRemote = (
          (localRecord.syncState === "synced" || localRecord.syncState === "error")
          && localRevision < remoteRow.revision
        )

        if (shouldPullRemote) {
          const archiveBytes = await downloadCloudProjectArchiveBytes(supabase, remoteRow.archive_path)
          await upsertCloudProjectToUserLibrary({
            localId: localRecord.id,
            ownerUserId: user.id,
            remoteProjectId: remoteRow.id,
            remoteRevision: remoteRow.revision,
            updatedAt: remoteRow.updated_at,
            lastSyncedAt: remoteRow.last_synced_at ?? remoteRow.updated_at,
            originPresetId: localRecord.originPresetId,
            archiveBytes,
          })
          void addCloudActivityLogEntry({
            level: "success",
            action: "Cloud project updated locally",
            message: `revision ${remoteRow.revision}`,
            projectTitle: remoteRow.title,
          })
        }
      }

      for (const localRecord of localRecords) {
        if (!localRecord.remoteProjectId) continue
        if (localRecord.deletedAt || localRecord.syncState === "deleted") continue
        if (localRecord.ownerUserId && localRecord.ownerUserId !== user.id) continue
        if (remoteProjectIds.has(localRecord.remoteProjectId)) continue

        if (hasLocalChangesAfterLastSync(localRecord)) {
          await updateUserProjectSyncState({
            id: localRecord.id,
            syncState: "conflict",
            syncError: CLOUD_SYNC_CONFLICT_NOTICE.message,
          })
          sawConflict = true
          setLastNotice(CLOUD_SYNC_CONFLICT_NOTICE)
          void addCloudActivityLogEntry({
            level: "warning",
            action: "Project deleted remotely conflict",
            message: CLOUD_SYNC_CONFLICT_NOTICE.message,
            projectTitle: localRecord.title,
          })
          continue
        }

        await purgeUserProjectFromLibrary(localRecord.id)
        void addCloudActivityLogEntry({
          level: "success",
          action: "Remote delete applied locally",
          projectTitle: localRecord.title,
        })
      }

      const refreshedLocalRecords = await listUserProjectRecords()
      for (const record of refreshedLocalRecords) {
        if (record.ownerUserId && record.ownerUserId !== user.id) continue
        if (record.syncState !== "local" && record.syncState !== "error") continue
        await syncProjectByLocalId(record.id)
      }

      setStatus(sawConflict ? "conflict" : "synced")
      void addCloudActivityLogEntry({
        level: sawConflict ? "warning" : "success",
        action: sawConflict ? "Cloud sync completed with conflict" : "Cloud sync completed",
      })
    } catch (error) {
      const notice = mapCloudSyncError(error)
      setLastNotice(notice)
      setStatus(notice.title === "Cloud Offline" ? "offline" : "error")
      void addCloudActivityLogEntry({
        level: "error",
        action: "Cloud sync failed",
        message: notice.message,
      })
    }
    })()

    syncAllProjectsPromiseRef.current = syncPromise
    try {
      await syncPromise
    } finally {
      if (syncAllProjectsPromiseRef.current === syncPromise) {
        syncAllProjectsPromiseRef.current = null
      }
    }
  }, [supabase, syncProjectByLocalId, user])

  const requestCloudSync = useCallback((
    reason: CloudSyncRequestReason = "manual",
    options: CloudSyncRequestOptions = {},
  ): boolean => {
    if (!supabase || !user) return false
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline")
      void addCloudActivityLogEntry({
        level: "warning",
        action: "Cloud sync request skipped offline",
        message: reason,
      })
      return false
    }

    const now = Date.now()
    const throttleMs = options.throttleMs ?? DEFAULT_SYNC_THROTTLE_MS
    if (!options.force && now - lastSyncAttemptAtRef.current < throttleMs) {
      return false
    }

    void syncAllProjects(reason)
    return true
  }, [supabase, syncAllProjects, user])

  useEffect(() => {
    if (!supabase || !user) {
      setStatus("signed_out")
      return
    }
    void syncAllProjects("session")
  }, [supabase, syncAllProjects, user])

  useEffect(() => {
    const handleOnline = () => {
      if (supabase && user) {
        requestCloudSync("online", { force: true })
      }
    }
    const handleOffline = () => {
      setStatus("offline")
      void addCloudActivityLogEntry({
        level: "warning",
        action: "Browser went offline",
      })
    }
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [requestCloudSync, supabase, user])

  useEffect(() => {
    if (!lastNotice || !onRequestNotice) return
    onRequestNotice(lastNotice)
  }, [lastNotice, onRequestNotice])

  const statusLabel = useMemo(() => {
    if (!supabase) return "Cloud unavailable"
    if (!user) return "Not connected"
    if (status === "syncing") return "Cloud syncing"
    if (status === "synced") return "Cloud synced"
    if (status === "offline") return "Cloud offline"
    if (status === "conflict") return "Cloud conflict"
    if (status === "error") return "Cloud error"
    return "Not connected"
  }, [status, supabase, user])

  return {
    status,
    statusLabel,
    lastError: lastNotice?.message ?? null,
    deleteProjectByLocalId,
    requestCloudSync,
    syncAllProjects,
    syncProjectByLocalId,
  }
}
