export type CloudSyncIndicatorStatus = "signed_out" | "syncing" | "synced" | "offline" | "error" | "conflict"
export type PresetSyncIndicatorStatus = "local" | "syncing" | "synced" | "conflict" | "error" | "deleted"
export type SaveStatusIndicatorStatus = "unsaved" | "local" | "synced"

export const CLOUD_STATUS_GREEN_CLASSNAME = "bg-[#4CAF50]"
export const CLOUD_STATUS_ORANGE_CLASSNAME = "bg-[#fbae17]"
export const CLOUD_STATUS_RED_CLASSNAME = "bg-[#fe9f97]"

export function getCloudSyncStatusIndicatorClassName({
  status,
  isSignedIn,
}: {
  status: CloudSyncIndicatorStatus
  isSignedIn: boolean
}): string {
  if (!isSignedIn) return CLOUD_STATUS_ORANGE_CLASSNAME
  if (status === "error") return CLOUD_STATUS_RED_CLASSNAME
  if (status === "synced") return CLOUD_STATUS_GREEN_CLASSNAME
  return CLOUD_STATUS_ORANGE_CLASSNAME
}

export function getPresetSyncStatusIndicatorClassName({
  status,
  isSignedIn,
}: {
  status: PresetSyncIndicatorStatus | undefined
  isSignedIn: boolean
}): string {
  if (!isSignedIn) return CLOUD_STATUS_ORANGE_CLASSNAME
  if (status === "error") return CLOUD_STATUS_RED_CLASSNAME
  if (status === "synced") return CLOUD_STATUS_GREEN_CLASSNAME
  return CLOUD_STATUS_ORANGE_CLASSNAME
}

export function getSaveStatusIndicatorClassName(status: SaveStatusIndicatorStatus): string {
  if (status === "unsaved") return CLOUD_STATUS_RED_CLASSNAME
  if (status === "synced") return CLOUD_STATUS_GREEN_CLASSNAME
  return CLOUD_STATUS_ORANGE_CLASSNAME
}

export function getSaveStatusIndicatorLabel(status: SaveStatusIndicatorStatus): string {
  if (status === "unsaved") return "Not saved locally"
  if (status === "synced") return "Synced to cloud"
  return "Saved to local store"
}
