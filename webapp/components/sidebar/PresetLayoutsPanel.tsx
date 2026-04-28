"use client"

import { MoreVertical } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  LAYOUT_PRESET_GROUPS,
  type LayoutPreset,
} from "@/lib/presets"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"
import { PresetPageThumbnail } from "@/components/sidebar/PresetPageThumbnail"
import {
  deleteUserProjectFromLibrary,
  saveProjectToUserLibrary,
  userLayoutPresetQuery,
} from "@/lib/user-layout-library"

type Props = {
  onLoadPreset: (preset: LayoutPreset) => void
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

function PresetCard({
  preset,
  onLoadPreset,
  isDarkMode,
  showRolloverInfo,
  menuOpen,
  onMenuOpenChange,
  onCopyUserPreset,
  onDeleteUserPreset,
}: {
  preset: LayoutPreset
  onLoadPreset: (preset: LayoutPreset) => void
  isDarkMode: boolean
  showRolloverInfo: boolean
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onCopyUserPreset: (preset: LayoutPreset) => void
  onDeleteUserPreset: (preset: LayoutPreset) => void
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const isUserPreset = preset.source === "user"

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
      disabled={!showRolloverInfo}
      constrainToClosestSelector='[data-tooltip-boundary="preset-browser"]'
      constrainAxes="horizontal"
      viewportPaddingPx={36}
      tooltipClassName={`w-72 max-w-[80vw] whitespace-normal border px-2 py-2 text-[11px] leading-snug ${
        isDarkMode
          ? "border-gray-600 bg-gray-900/95 text-gray-200"
          : "border-gray-300 bg-white/95 text-gray-700"
      }`}
      label={(
        <div className="space-y-0.5">
          <div><span className="font-semibold">Title:</span> {preset.title ?? preset.label}</div>
          <div><span className="font-semibold">Description:</span> {preset.description || "—"}</div>
          <div><span className="font-semibold">Author:</span> {preset.author || "—"}</div>
          <div><span className="font-semibold">Date Created:</span> {formatPresetCreatedAt(preset.createdAt)}</div>
        </div>
      )}
    >
      <div className={`relative w-full ${preset.browserPage.uiSettings.orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]"}`}>
        <button
          type="button"
          className={`relative h-full w-full rounded-md border-2 transition-colors cursor-pointer overflow-hidden ${isDarkMode ? "border-gray-700 bg-gray-800 hover:border-blue-400 hover:bg-gray-700" : "border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"}`}
          onDoubleClick={() => onLoadPreset(preset)}
        >
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
  isDarkMode = false,
  compact = false,
  showHelpHints = false,
  onHelpNavigate,
  showRolloverInfo = true,
  onRequestNotice,
}: Props) {
  const [userPresets, setUserPresets] = useState<LayoutPreset[]>([])
  const [openMenuPresetId, setOpenMenuPresetId] = useState<string | null>(null)

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

    try {
      await deleteUserProjectFromLibrary(targetId)
      onRequestNotice?.({
        title: "Deleted from Users",
        message: "The selected user layout was removed from the local library.",
      })
    } catch (error) {
      console.error(error)
      onRequestNotice?.({
        title: "Delete Failed",
        message: "Could not remove the selected user layout.",
      })
    }
  }, [onRequestNotice])

  const cardGapClass = compact ? "gap-2" : "gap-3"
  const minCardWidth = compact ? 120 : 168
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
        {visibleGroups.map((group) => (
          <section key={group.category} className="space-y-3">
            <div className="space-y-1">
              <h4 className={`text-xs font-semibold uppercase tracking-[0.08em] ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                {group.label}
              </h4>
            </div>

            {group.presets.length > 0 ? (
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
                  />
                ))}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}
