export type CloudSyncStatus = "signed_out" | "syncing" | "synced" | "offline" | "error" | "conflict"
export type PresetSyncIndicatorStatus = "local" | "syncing" | "synced" | "conflict" | "error" | "deleted"

export const CLOUD_STATUS_GREEN_CLASSNAME = "bg-[#4CAF50]"
export const CLOUD_STATUS_ORANGE_CLASSNAME = "bg-[#fbae17]"
export const CLOUD_STATUS_RED_CLASSNAME = "bg-[#fe9f97]"

export function getCloudSyncStatusIndicatorClassName({
  status,
  isSignedIn,
}: {
  status: CloudSyncStatus
  isSignedIn: boolean
}): string {
  if (status === "error") return CLOUD_STATUS_RED_CLASSNAME
  if (isSignedIn && status === "synced") return CLOUD_STATUS_GREEN_CLASSNAME
  return CLOUD_STATUS_ORANGE_CLASSNAME
}

export function getPresetSyncStatusIndicatorClassName(status: PresetSyncIndicatorStatus | undefined): string {
  if (status === "error") return CLOUD_STATUS_RED_CLASSNAME
  if (status === "synced") return CLOUD_STATUS_GREEN_CLASSNAME
  return CLOUD_STATUS_ORANGE_CLASSNAME
}
