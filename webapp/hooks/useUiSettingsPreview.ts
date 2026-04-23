"use client"

import { startTransition, useCallback, useDeferredValue, useMemo, useState } from "react"

import { buildGridResultFromUiSettings } from "@/lib/ui-settings-resolver"
import type { UiSettingsSnapshot } from "@/lib/workspace-ui-schema"

type UiPreviewPatch = Partial<UiSettingsSnapshot>

function arePreviewValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (
    typeof a !== "object"
    || a === null
    || typeof b !== "object"
    || b === null
  ) {
    return false
  }

  const aEntries = Object.entries(a)
  const bEntries = Object.entries(b)
  if (aEntries.length !== bEntries.length) return false

  return aEntries.every(([key, value]) => Object.is(value, (b as Record<string, unknown>)[key]))
}

function mergePreviewPatch(current: UiPreviewPatch, patch: UiPreviewPatch): UiPreviewPatch {
  let changed = false
  const next: Record<string, unknown> = { ...current }

  for (const [key, value] of Object.entries(patch) as [keyof UiPreviewPatch, UiPreviewPatch[keyof UiPreviewPatch]][]) {
    if (arePreviewValuesEqual(next[key as string], value)) continue
    next[key as string] = value
    changed = true
  }

  return changed ? next as UiPreviewPatch : current
}

function clearPreviewPatchKeys(current: UiPreviewPatch, keys: (keyof UiSettingsSnapshot)[]): UiPreviewPatch {
  let changed = false
  const next = { ...current }

  for (const key of keys) {
    if (!(key in next)) continue
    delete next[key]
    changed = true
  }

  return changed ? next : current
}

export function useUiSettingsPreview(
  ui: UiSettingsSnapshot,
  layoutMode: "single" | "facing" = "single",
) {
  const [previewPatch, setPreviewPatchState] = useState<UiPreviewPatch>({})

  const setPreviewPatch = useCallback((patch: UiPreviewPatch) => {
    startTransition(() => {
      setPreviewPatchState((current) => mergePreviewPatch(current, patch))
    })
  }, [])

  const clearPreviewKeys = useCallback((keys: (keyof UiSettingsSnapshot)[]) => {
    startTransition(() => {
      setPreviewPatchState((current) => clearPreviewPatchKeys(current, keys))
    })
  }, [])

  const deferredPreviewPatch = useDeferredValue(previewPatch)

  const previewUi = useMemo<UiSettingsSnapshot>(() => ({
    ...ui,
    ...deferredPreviewPatch,
  }), [deferredPreviewPatch, ui])

  const previewResult = useMemo(
    () => buildGridResultFromUiSettings(previewUi, { layoutMode }),
    [layoutMode, previewUi],
  )

  return {
    previewUi,
    previewResult,
    setPreviewPatch,
    clearPreviewKeys,
  }
}
