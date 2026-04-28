"use client"

import { useCallback, useEffect, useLayoutEffect, useRef } from "react"

const SECTION_TOP_OFFSET_PX = 12
const SCROLL_RESTORE_FRAME_COUNT = 2

type AutoScrollOpenedSectionOptions = {
  resetEventName?: string
  scrollStorageKey?: string
  restoreKey?: string | number | null
}

function readStoredScrollTop(storageKey: string): number {
  if (typeof window === "undefined") return 0
  try {
    const raw = window.localStorage.getItem(storageKey)
    const parsed = raw ? Number(raw) : 0
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
  } catch {
    return 0
  }
}

function writeStoredScrollTop(storageKey: string, value: number): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey, String(Math.max(0, Math.round(value))))
  } catch {
    // Scroll restoration is a convenience; editor state must keep working without storage.
  }
}

export function useAutoScrollOpenedSection<SectionKey extends string>(
  collapsed: Record<SectionKey, boolean>,
  options: AutoScrollOpenedSectionOptions = {},
) {
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLDivElement | null>>>({})
  const previousCollapsedRef = useRef(collapsed)
  const scrollPersistFrameRef = useRef<number | null>(null)
  const restoreFrameRef = useRef<number | null>(null)
  const { resetEventName, restoreKey = null, scrollStorageKey } = options

  useLayoutEffect(() => {
    if (!scrollStorageKey) return
    const scrollRoot = scrollRootRef.current
    if (!scrollRoot) return

    let frameCount = 0
    const restore = () => {
      scrollRoot.scrollTop = readStoredScrollTop(scrollStorageKey)
      frameCount += 1
      if (frameCount >= SCROLL_RESTORE_FRAME_COUNT) {
        restoreFrameRef.current = null
        return
      }
      restoreFrameRef.current = window.requestAnimationFrame(restore)
    }

    if (restoreFrameRef.current !== null) {
      window.cancelAnimationFrame(restoreFrameRef.current)
    }
    restoreFrameRef.current = window.requestAnimationFrame(restore)

    return () => {
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current)
        restoreFrameRef.current = null
      }
    }
  }, [restoreKey, scrollStorageKey])

  useEffect(() => {
    if (!scrollStorageKey) return
    const scrollRoot = scrollRootRef.current
    if (!scrollRoot) return

    const handleScroll = () => {
      if (scrollPersistFrameRef.current !== null) return
      scrollPersistFrameRef.current = window.requestAnimationFrame(() => {
        scrollPersistFrameRef.current = null
        writeStoredScrollTop(scrollStorageKey, scrollRoot.scrollTop)
      })
    }

    scrollRoot.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      scrollRoot.removeEventListener("scroll", handleScroll)
      if (scrollPersistFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollPersistFrameRef.current)
        scrollPersistFrameRef.current = null
      }
      writeStoredScrollTop(scrollStorageKey, scrollRoot.scrollTop)
    }
  }, [scrollStorageKey])

  useEffect(() => {
    if (!resetEventName || typeof window === "undefined") return

    const handleReset = () => {
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current)
        restoreFrameRef.current = null
      }
      if (scrollPersistFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollPersistFrameRef.current)
        scrollPersistFrameRef.current = null
      }

      const scrollRoot = scrollRootRef.current
      if (!scrollRoot) return
      scrollRoot.scrollTop = 0
      if (scrollStorageKey) {
        writeStoredScrollTop(scrollStorageKey, 0)
      }
    }

    window.addEventListener(resetEventName, handleReset)
    return () => window.removeEventListener(resetEventName, handleReset)
  }, [resetEventName, scrollStorageKey])

  useEffect(() => {
    const openedSection = (Object.keys(collapsed) as SectionKey[]).find((key) => (
      previousCollapsedRef.current[key] && !collapsed[key]
    ))
    previousCollapsedRef.current = collapsed
    if (!openedSection) return

    const scrollRoot = scrollRootRef.current
    const sectionNode = sectionRefs.current[openedSection]
    if (!scrollRoot || !sectionNode) return

    const frame = window.requestAnimationFrame(() => {
      const rootRect = scrollRoot.getBoundingClientRect()
      const sectionRect = sectionNode.getBoundingClientRect()
      const nextTop = Math.max(
        0,
        scrollRoot.scrollTop + (sectionRect.top - rootRect.top) - SECTION_TOP_OFFSET_PX,
      )

      scrollRoot.scrollTo({
        top: nextTop,
        behavior: "smooth",
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [collapsed])

  const registerSectionRef = useCallback(
    (key: SectionKey) => (node: HTMLDivElement | null) => {
      sectionRefs.current[key] = node
    },
    [],
  )

  return {
    scrollRootRef,
    registerSectionRef,
  }
}
