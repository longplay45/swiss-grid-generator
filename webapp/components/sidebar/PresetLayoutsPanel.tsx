"use client"

import { ChevronUp, MoreVertical } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  LAYOUT_PRESET_GROUPS,
  type LayoutPreset,
} from "@/lib/presets"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"
import { PresetPageThumbnail } from "@/components/sidebar/PresetPageThumbnail"
import { getPresetSyncStatusIndicatorClassName } from "@/lib/cloud-status-indicator"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"
import {
  deleteUserProjectFromLibrary,
  saveProjectToUserLibrary,
  userLayoutPresetQuery,
} from "@/lib/user-layout-library"

type PresetGroupCategory = (typeof LAYOUT_PRESET_GROUPS)[number]["category"]
const PRESET_GROUP_COLLAPSED_STORAGE_KEY = "swiss-grid-generator.preset-browser.collapsed-groups"

type Props = {
  onLoadPreset: (preset: LayoutPreset) => void
  onDeleteUserPreset?: (preset: LayoutPreset) => Promise<void>
  isCloudSignedIn?: boolean
  isDarkMode?: boolean
  compact?: boolean
  showHelpHints?: boolean
  onHelpNavigate?: () => void
  showRolloverInfo?: boolean
  onRequestNotice?: (notice: { title: string; message: string }) => void
}

function formatPresetCreatedAt(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function formatPresetNumber(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function getPresetCloudStatusLabel(syncState: LayoutPreset["syncState"], isCloudSignedIn: boolean): string {
  if (syncState === "synced") return "Cloud synced"
  if (syncState === "syncing") return "Cloud syncing"
  if (syncState === "conflict") return "Cloud conflict"
  if (syncState === "error") return "Cloud error"
  if (syncState === "deleted") return "Cloud delete queued"
  return isCloudSignedIn ? "Cloud pending" : "Local only"
}

function PresetTooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[82px_1fr] gap-2">
      <span className="font-semibold">{label}</span>
      <span className="min-w-0">{value}</span>
    </div>
  )
}

function readCollapsedPresetGroups(): Partial<Record<PresetGroupCategory, boolean>> {
  if (typeof window === "undefined") return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PRESET_GROUP_COLLAPSED_STORAGE_KEY) ?? "{}")
    if (!parsed || typeof parsed !== "object") return {}
    return LAYOUT_PRESET_GROUPS.reduce<Partial<Record<PresetGroupCategory, boolean>>>((next, group) => {
      if ((parsed as Record<string, unknown>)[group.category] === true) {
        next[group.category] = true
      }
      return next
    }, {})
  } catch {
    return {}
  }
}

function PresetCard({
  preset,
  onLoadPreset,
  isDarkMode,
  showRolloverInfo,
  menuOpen,
  onMenuOpenChange,
  onCopyUserPreset,
  onDeleteUserPreset,
  isCloudSignedIn,
}: {
  preset: LayoutPreset
  onLoadPreset: (preset: LayoutPreset) => void
  isDarkMode: boolean
  showRolloverInfo: boolean
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onCopyUserPreset: (preset: LayoutPreset) => void
  onDeleteUserPreset: (preset: LayoutPreset) => void
  isCloudSignedIn: boolean
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const isUserPreset = preset.source === "user"
  const syncIndicatorClassName = isUserPreset ? getPresetSyncStatusIndicatorClassName(preset.syncState) : null
  const result = preset.browserPage.result
  const baselineGrid = result.typography.metadata.baselineGrid
  const cloudStatusLabel = getPresetCloudStatusLabel(preset.syncState, isCloudSignedIn)

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      onMenuOpenChange(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMenuOpenChange(false)
    }

    window.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen, onMenuOpenChange])

  return (
    <HoverTooltip
      className="block"
      disabled={!showRolloverInfo || menuOpen}
      constrainToClosestSelector='[data-tooltip-boundary="preset-browser"]'
      constrainAxes="horizontal"
      viewportPaddingPx={36}
      tooltipClassName={`w-80 max-w-[80vw] whitespace-normal border px-2 py-2 text-[11px] leading-snug ${
        isDarkMode
          ? "border-gray-600 bg-gray-900/95 text-gray-200"
          : "border-gray-300 bg-white/95 text-gray-700"
      }`}
      label={(
        <div className="space-y-1">
          <PresetTooltipRow label="Title" value={preset.title ?? preset.label} />
          <PresetTooltipRow label="Description" value={preset.description || "—"} />
          <PresetTooltipRow label="Author" value={preset.author || "—"} />
          <PresetTooltipRow label="Created" value={formatPresetCreatedAt(preset.createdAt)} />
          <PresetTooltipRow label="Format" value={`${result.format} / ${result.settings.orientation}`} />
          <PresetTooltipRow label="Grid" value={`${result.settings.gridCols} x ${result.settings.gridRows}`} />
          <PresetTooltipRow label="Baseline" value={`${formatPresetNumber(baselineGrid)} pt`} />
          <PresetTooltipRow label="Margins" value={result.settings.marginMethod} />
          <PresetTooltipRow label="Rhythm" value={result.settings.rhythm} />
          {isUserPreset ? (
            <div className={`mt-1 border-t pt-1 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div className="grid grid-cols-[82px_1fr] gap-2">
                <span className="font-semibold">Cloud</span>
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  {syncIndicatorClassName ? (
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-white dark:ring-[#1D232D] ${syncIndicatorClassName}`}
                    />
                  ) : null}
                  <span className="min-w-0">{cloudStatusLabel}</span>
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    >
      <div className={`relative w-full ${preset.browserPage.uiSettings.orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]"}`}>
        <button
          type="button"
          className={`relative h-full w-full rounded-md border-2 transition-colors cursor-pointer overflow-hidden ${isDarkMode ? "border-gray-700 bg-gray-800 hover:border-blue-400 hover:bg-gray-700" : "border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"}`}
          onDoubleClick={() => onLoadPreset(preset)}
        >
          {syncIndicatorClassName ? (
            <span
              aria-hidden="true"
              className={`absolute right-1 top-1 z-10 h-1.5 w-1.5 rounded-full ring-1 ring-white dark:ring-[#1D232D] ${syncIndicatorClassName}`}
            />
          ) : null}
          <div className={`absolute inset-2 border ${isDarkMode ? "border-gray-600 bg-gray-900" : "border-gray-300 bg-white"}`}>
            <PresetPageThumbnail page={preset.browserPage} />
          </div>
        </button>
        <div className={`absolute bottom-0 left-0 right-0 flex items-center gap-1 px-2 py-1 text-[10px] ${isDarkMode ? "bg-gray-900/90 text-gray-300" : "bg-white/90 text-gray-600"}`}>
          <span className="min-w-0 flex-1 truncate text-center">{preset.label}</span>
          {isUserPreset ? (
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                aria-label={`More actions for ${preset.label}`}
                className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${isDarkMode ? "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onMenuOpenChange(!menuOpen)
                }}
              >
                <MoreVertical className="h-3 w-3" />
              </button>
              {menuOpen ? (
                <div
                  className={`absolute bottom-full right-0 z-20 mb-1 min-w-[112px] rounded-md border py-1 shadow-lg ${isDarkMode ? "border-gray-600 bg-gray-900 text-gray-200" : "border-gray-300 bg-white text-gray-700"}`}
                >
                  <button
                    type="button"
                    className={`block w-full px-3 py-1 text-left text-[11px] ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onMenuOpenChange(false)
                      onLoadPreset(preset)
                    }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className={`block w-full px-3 py-1 text-left text-[11px] ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onMenuOpenChange(false)
                      onCopyUserPreset(preset)
                    }}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className={`block w-full px-3 py-1 text-left text-[11px] ${isDarkMode ? "text-red-300 hover:bg-red-950/50" : "text-red-600 hover:bg-red-50"}`}
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      onMenuOpenChange(false)
                      onDeleteUserPreset(preset)
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </HoverTooltip>
  )
}

export function PresetLayoutsPanel({
  onLoadPreset,
  onDeleteUserPreset,
  isCloudSignedIn = false,
  isDarkMode = false,
  compact = false,
  showHelpHints = false,
  onHelpNavigate,
  showRolloverInfo = true,
  onRequestNotice,
}: Props) {
  const [userPresets, setUserPresets] = useState<LayoutPreset[]>([])
  const [openMenuPresetId, setOpenMenuPresetId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Partial<Record<PresetGroupCategory, boolean>>>(readCollapsedPresetGroups)

  useEffect(() => {
    const subscription = userLayoutPresetQuery.subscribe({
      next: (presets) => {
        setUserPresets(Array.isArray(presets) ? presets : [])
      },
      error: (error) => {
        console.error(error)
        setUserPresets([])
      },
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!openMenuPresetId) return
    if (userPresets.some((preset) => preset.id === openMenuPresetId)) return
    setOpenMenuPresetId(null)
  }, [openMenuPresetId, userPresets])

  useEffect(() => {
    window.localStorage.setItem(PRESET_GROUP_COLLAPSED_STORAGE_KEY, JSON.stringify(collapsedGroups))
  }, [collapsedGroups])

  const visibleGroups = useMemo(() => (
    LAYOUT_PRESET_GROUPS
      .map((group) => (
        group.category === "users"
          ? { ...group, presets: userPresets }
          : group
      ))
      .filter((group) => group.presets.length > 0)
  ), [userPresets])

  const handleCopyUserPreset = useCallback(async (preset: LayoutPreset) => {
    try {
      const sourceProject = JSON.parse(preset.projectSourceJson) as Record<string, unknown>
      const nextTitle = (preset.title ?? preset.label).trim() || "Untitled Project"
      const duplicatedTitle = `${nextTitle} Copy`
      const duplicatedDescription = preset.description ?? ""
      const duplicatedAuthor = preset.author ?? ""
      const createdAt = preset.createdAt && !Number.isNaN(Date.parse(preset.createdAt))
        ? new Date(preset.createdAt).toISOString()
        : new Date().toISOString()
      const duplicatedProject = {
        ...sourceProject,
        title: duplicatedTitle,
        description: duplicatedDescription,
        author: duplicatedAuthor,
        createdAt,
      }

      await saveProjectToUserLibrary({
        label: duplicatedTitle,
        title: duplicatedTitle,
        description: duplicatedDescription,
        author: duplicatedAuthor,
        createdAt,
        originPresetId: preset.originPresetId ?? null,
        project: duplicatedProject,
      })

      onRequestNotice?.({
        title: "Copied to Users",
        message: "A duplicated user layout was added to the local library.",
      })
    } catch (error) {
      console.error(error)
      onRequestNotice?.({
        title: "Copy Failed",
        message: "Could not duplicate the selected user layout.",
      })
    }
  }, [onRequestNotice])

  const handleDeleteUserPreset = useCallback(async (preset: LayoutPreset) => {
    const targetId = preset.userProjectId ?? preset.id
    if (!targetId) return

    const presetLabel = (preset.title ?? preset.label).trim() || "Untitled Project"
    const cloudText = isCloudSignedIn
      ? "The cloud copy will be soft-deleted if it is already synced."
      : "If this layout has a cloud copy, deletion will be queued until cloud sync is available."
    if (!window.confirm(`Delete "${presetLabel}" from Users?\n\n${cloudText}`)) return

    try {
      if (onDeleteUserPreset) {
        await onDeleteUserPreset(preset)
        return
      }

      await deleteUserProjectFromLibrary(targetId)
      onRequestNotice?.({
        title: "Deleted from Users",
        message: isCloudSignedIn
          ? "The selected user layout was removed from the local library. Cloud status: no remote delete handler was available."
          : "The selected user layout was removed from the local library. Cloud status: not connected.",
      })
    } catch (error) {
      console.error(error)
      onRequestNotice?.({
        title: "Delete Failed",
        message: "Could not remove the selected user layout.",
      })
    }
  }, [isCloudSignedIn, onDeleteUserPreset, onRequestNotice])

  const cardGapClass = compact ? "gap-2" : "gap-3"
  const minCardWidth = compact ? 120 : 168
  const groupToggleClassName = isDarkMode
    ? "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
    : "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
  return (
    <div
      data-tooltip-boundary="preset-browser"
      className={showHelpHints ? "relative rounded-md p-2 -m-2" : undefined}
      onMouseEnter={showHelpHints ? onHelpNavigate : undefined}
    >
      {showHelpHints ? <HelpIndicatorLine /> : null}
      {!compact ? (
        <>
          <h3 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            <span>Presets</span>
            {showHelpHints ? (
              <span
                className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[10px] leading-none ${
                  isDarkMode
                    ? "border-blue-400 bg-blue-500 text-white"
                    : "border-blue-500 bg-blue-500 text-white"
                }`}
              >
                ?
              </span>
            ) : null}
          </h3>
          <p className={`text-xs mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
            Double-click a thumbnail to load a preset layout, or press `Esc` to close the browser.
          </p>
        </>
      ) : null}
      {compact && showHelpHints ? (
        <div className="mb-2 flex justify-end">
          <span
            className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[10px] leading-none ${
              isDarkMode
                ? "border-blue-400 bg-blue-500 text-white"
                : "border-blue-500 bg-blue-500 text-white"
            }`}
          >
            ?
          </span>
        </div>
      ) : null}
      <div className="space-y-6">
        {visibleGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.category] === true

          return (
            <section key={group.category} className="space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                aria-expanded={!isCollapsed}
                onClick={() => {
                  setCollapsedGroups((current) => ({
                    ...current,
                    [group.category]: !current[group.category],
                  }))
                }}
                onDoubleClick={(event) => {
                  event.preventDefault()
                  setCollapsedGroups((current) => {
                    const shouldCollapseAll = visibleGroups.some((visibleGroup) => current[visibleGroup.category] !== true)
                    const next = { ...current }
                    visibleGroups.forEach((visibleGroup) => {
                      next[visibleGroup.category] = shouldCollapseAll
                    })
                    return next
                  })
                }}
              >
                <span className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>
                  {group.label}
                </span>
                <span className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${groupToggleClassName}`}>
                  <ChevronUp
                    className={`h-2 w-2 transition-transform ${isCollapsed ? "rotate-90" : "rotate-180"}`}
                    aria-hidden="true"
                  />
                </span>
              </button>

              {!isCollapsed && group.presets.length > 0 ? (
                <div
                  className={`grid items-end ${cardGapClass}`}
                  style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))` }}
                >
                  {group.presets.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      onLoadPreset={onLoadPreset}
                      isDarkMode={isDarkMode}
                      showRolloverInfo={showRolloverInfo}
                      menuOpen={openMenuPresetId === preset.id}
                      onMenuOpenChange={(open) => {
                        setOpenMenuPresetId(open ? preset.id : null)
                      }}
                      onCopyUserPreset={handleCopyUserPreset}
                      onDeleteUserPreset={handleDeleteUserPreset}
                      isCloudSignedIn={isCloudSignedIn}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
