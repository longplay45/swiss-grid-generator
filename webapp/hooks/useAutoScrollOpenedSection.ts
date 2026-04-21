"use client"

import { useCallback, useEffect, useRef } from "react"

const SECTION_TOP_OFFSET_PX = 12

export function useAutoScrollOpenedSection<SectionKey extends string>(
  collapsed: Record<SectionKey, boolean>,
) {
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLDivElement | null>>>({})
  const previousCollapsedRef = useRef(collapsed)

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
