"use client"

import { useEffect, useState } from "react"

type PersistedSectionStateOptions = {
  resetEventName?: string
}

function readPersistedSectionState<SectionKey extends string>(
  storageKey: string,
  defaults: Record<SectionKey, boolean>,
): Record<SectionKey, boolean> {
  if (typeof window === "undefined") return defaults

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<Record<SectionKey, unknown>>

    return Object.keys(defaults).reduce((acc, key) => {
      const sectionKey = key as SectionKey
      const persistedValue = parsed?.[sectionKey]
      acc[sectionKey] = typeof persistedValue === "boolean" ? persistedValue : defaults[sectionKey]
      return acc
    }, {} as Record<SectionKey, boolean>)
  } catch {
    return defaults
  }
}

export function usePersistedSectionState<SectionKey extends string>(
  storageKey: string,
  defaults: Record<SectionKey, boolean>,
  options: PersistedSectionStateOptions = {},
) {
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>(() => (
    readPersistedSectionState(storageKey, defaults)
  ))
  const { resetEventName } = options

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(collapsed))
    } catch {
      // Ignore persistence failures and keep the in-memory UI state.
    }
  }, [collapsed, storageKey])

  useEffect(() => {
    if (!resetEventName || typeof window === "undefined") return

    const handleReset = () => {
      setCollapsed(defaults)
    }

    window.addEventListener(resetEventName, handleReset)
    return () => window.removeEventListener(resetEventName, handleReset)
  }, [defaults, resetEventName])

  return [collapsed, setCollapsed] as const
}
