import { useEffect } from "react"
import type { MutableRefObject } from "react"

import type { FontFamily } from "@/lib/config/fonts"
import type { ModulePosition, PreviewLayoutState, TextAlignMode } from "@/lib/types/preview-layout"

type Args<StyleKey extends string, BlockKey extends string> = {
  initialLayout: PreviewLayoutState<StyleKey, FontFamily, BlockKey> | null
  initialLayoutKey: number
  lastAppliedLayoutKeyRef: MutableRefObject<number>
  pushHistory: (snapshot: PreviewLayoutState<StyleKey, FontFamily, BlockKey>) => void
  buildSnapshot: () => PreviewLayoutState<StyleKey, FontFamily, BlockKey>
  baseFont: FontFamily
  gridCols: number
  gridRows: number
  typographyStyles: Record<StyleKey, unknown>
  isBaseBlockId: (key: string) => boolean
  defaultTextContent: Record<string, string>
  defaultStyleAssignments: Record<string, StyleKey>
  isFontFamily: (value: unknown) => value is FontFamily
  getDefaultColumnSpan: (key: BlockKey, gridCols: number) => number
  getGridMetrics: () => { maxBaselineRow: number }
  setBlockCollections: (updater: () => {
    blockOrder: BlockKey[]
    textContent: Record<BlockKey, string>
    blockTextEdited: Record<BlockKey, boolean>
    styleAssignments: Record<BlockKey, StyleKey>
    blockFontFamilies: Partial<Record<BlockKey, FontFamily>>
    blockColumnSpans: Partial<Record<BlockKey, number>>
    blockRowSpans: Partial<Record<BlockKey, number>>
    blockTextAlignments: Partial<Record<BlockKey, TextAlignMode>>
    blockTextReflow: Partial<Record<BlockKey, boolean>>
    blockSyllableDivision: Partial<Record<BlockKey, boolean>>
    blockBold: Partial<Record<BlockKey, boolean>>
    blockItalic: Partial<Record<BlockKey, boolean>>
    blockRotations: Partial<Record<BlockKey, number>>
    blockModulePositions: Partial<Record<BlockKey, ModulePosition>>
  }) => void
  onBeforeApply: () => void
  onAfterApply: () => void
}

export function useInitialLayoutHydration<StyleKey extends string, BlockKey extends string>({
  initialLayout,
  initialLayoutKey,
  lastAppliedLayoutKeyRef,
  pushHistory,
  buildSnapshot,
  baseFont,
  gridCols,
  gridRows,
  typographyStyles,
  isBaseBlockId,
  defaultTextContent,
  defaultStyleAssignments,
  isFontFamily,
  getDefaultColumnSpan,
  getGridMetrics,
  setBlockCollections,
  onBeforeApply,
  onAfterApply,
}: Args<StyleKey, BlockKey>) {
  useEffect(() => {
    if (!initialLayout || initialLayoutKey === 0) return
    if (lastAppliedLayoutKeyRef.current === initialLayoutKey) return
    if (lastAppliedLayoutKeyRef.current !== 0) {
      pushHistory(buildSnapshot())
    }
    lastAppliedLayoutKeyRef.current = initialLayoutKey
    onBeforeApply()

    const normalizedKeys = (Array.isArray(initialLayout.blockOrder) ? initialLayout.blockOrder : [])
      .filter((key): key is BlockKey => typeof key === "string" && key.length > 0)
      .filter((key, idx, arr) => arr.indexOf(key) === idx)
    if (!normalizedKeys.length) return
    const validStyles = new Set(Object.keys(typographyStyles))

    const nextTextContent = normalizedKeys.reduce((acc, key) => {
      const value = initialLayout.textContent?.[key]
      acc[key] = typeof value === "string" ? value : (isBaseBlockId(key) ? defaultTextContent[key] ?? "" : "")
      return acc
    }, {} as Record<BlockKey, string>)

    const nextTextEdited = normalizedKeys.reduce((acc, key) => {
      const value = initialLayout.blockTextEdited?.[key]
      acc[key] = typeof value === "boolean" ? value : true
      return acc
    }, {} as Record<BlockKey, boolean>)

    const nextStyleAssignments = normalizedKeys.reduce((acc, key) => {
      const value = initialLayout.styleAssignments?.[key]
      acc[key] = validStyles.has(String(value))
        ? value as StyleKey
        : (isBaseBlockId(key) ? defaultStyleAssignments[key] : ("body" as StyleKey))
      return acc
    }, {} as Record<BlockKey, StyleKey>)

    const nextFontFamilies = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockFontFamilies?.[key]
      if (isFontFamily(raw) && raw !== baseFont) acc[key] = raw
      return acc
    }, {} as Partial<Record<BlockKey, FontFamily>>)

    const nextSpans = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockColumnSpans?.[key]
      const fallback = getDefaultColumnSpan(key, gridCols)
      const value = typeof raw === "number" ? raw : fallback
      acc[key] = Math.max(1, Math.min(gridCols, Math.round(value)))
      return acc
    }, {} as Record<BlockKey, number>)

    const nextAlignments = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockTextAlignments?.[key]
      acc[key] = raw === "right" ? "right" : "left"
      return acc
    }, {} as Record<BlockKey, TextAlignMode>)

    const nextRows = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockRowSpans?.[key]
      const value = typeof raw === "number" ? raw : 1
      acc[key] = Math.max(1, Math.min(gridRows, Math.round(value)))
      return acc
    }, {} as Record<BlockKey, number>)

    const nextReflow = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockTextReflow?.[key]
      acc[key] = raw === true
      return acc
    }, {} as Record<BlockKey, boolean>)

    const nextSyllableDivision = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockSyllableDivision?.[key]
      if (raw === true || raw === false) {
        acc[key] = raw
      }
      return acc
    }, {} as Record<BlockKey, boolean>)

    const nextBold = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockBold?.[key]
      if (raw === true || raw === false) acc[key] = raw
      return acc
    }, {} as Record<BlockKey, boolean>)

    const nextItalic = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockItalic?.[key]
      if (raw === true || raw === false) acc[key] = raw
      return acc
    }, {} as Record<BlockKey, boolean>)

    const nextRotations = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockRotations?.[key]
      if (typeof raw === "number" && Number.isFinite(raw) && Math.abs(raw) > 0.001) {
        acc[key] = Math.max(-80, Math.min(80, raw))
      }
      return acc
    }, {} as Record<BlockKey, number>)

    const metrics = getGridMetrics()
    const nextPositions = normalizedKeys.reduce((acc, key) => {
      const raw = initialLayout.blockModulePositions?.[key]
      if (!raw || typeof raw.col !== "number" || typeof raw.row !== "number") return acc
      const maxCol = Math.max(0, gridCols - nextSpans[key])
      acc[key] = {
        col: Math.max(0, Math.min(maxCol, Math.round(raw.col))),
        row: Math.max(0, Math.min(metrics.maxBaselineRow, raw.row)),
      }
      return acc
    }, {} as Partial<Record<BlockKey, ModulePosition>>)

    setBlockCollections(() => ({
      blockOrder: normalizedKeys,
      textContent: nextTextContent,
      blockTextEdited: nextTextEdited,
      styleAssignments: nextStyleAssignments,
      blockFontFamilies: nextFontFamilies,
      blockColumnSpans: nextSpans,
      blockRowSpans: nextRows,
      blockTextAlignments: nextAlignments,
      blockTextReflow: nextReflow,
      blockSyllableDivision: nextSyllableDivision,
      blockBold: nextBold,
      blockItalic: nextItalic,
      blockRotations: nextRotations,
      blockModulePositions: nextPositions,
    }))

    onAfterApply()
  }, [
    baseFont,
    buildSnapshot,
    defaultStyleAssignments,
    defaultTextContent,
    getDefaultColumnSpan,
    getGridMetrics,
    gridCols,
    gridRows,
    initialLayout,
    initialLayoutKey,
    isBaseBlockId,
    isFontFamily,
    lastAppliedLayoutKeyRef,
    onAfterApply,
    onBeforeApply,
    pushHistory,
    setBlockCollections,
    typographyStyles,
  ])
}
