import { useCallback, useEffect, useRef, useState } from "react"

import { type ImageEditorState } from "@/components/dialogs/ImageEditorDialog"
import {
  getImageSchemeColorReference,
  resolveImageSchemeColor,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { findNearestAxisIndex } from "@/lib/grid-rhythm"
import type { ModulePosition, PreviewLayoutState } from "@/lib/types/preview-layout"

type ImageGridMetrics = {
  gridCols: number
  gridRows: number
  maxBaselineRow: number
  rowStartBaselines: number[]
}

type ImageSnapshotState<Key extends string> = Pick<
  PreviewLayoutState<string, string, Key>,
  "imageOrder" | "imageModulePositions" | "imageColumnSpans" | "imageRowSpans" | "imageColors"
>

type Args<Key extends string> = {
  imageColorScheme: ImageColorSchemeId
  defaultImageColor: string
  gridCols: number
  gridRows: number
  getGridMetrics: () => ImageGridMetrics
  clampImageBaselinePosition: (position: ModulePosition, columns: number) => ModulePosition
  onImageColorSchemeChange?: (value: ImageColorSchemeId) => void
}

type InsertImagePlaceholderOptions<Key extends string> = {
  position: ModulePosition
  columns?: number
  rows?: number
  color?: string
  afterKey?: Key | null
}

export function useImagePlaceholderState<Key extends string>({
  imageColorScheme,
  defaultImageColor,
  gridCols,
  gridRows,
  getGridMetrics,
  clampImageBaselinePosition,
  onImageColorSchemeChange,
}: Args<Key>) {
  const [imageOrder, setImageOrder] = useState<Key[]>([])
  const [imageModulePositions, setImageModulePositions] = useState<Partial<Record<Key, ModulePosition>>>({})
  const [imageColumnSpans, setImageColumnSpans] = useState<Partial<Record<Key, number>>>({})
  const [imageRowSpans, setImageRowSpans] = useState<Partial<Record<Key, number>>>({})
  const [imageColors, setImageColors] = useState<Partial<Record<Key, string>>>({})
  const [imageEditorState, setImageEditorState] = useState<ImageEditorState | null>(null)

  const lastLiveImageEditorSignatureRef = useRef("")
  const suppressImageModuleRemapRef = useRef(false)
  const previousImageColorSchemeRef = useRef(imageColorScheme)
  const previousImageGridRef = useRef<{ cols: number; rows: number } | null>(null)
  const previousImageRowStartsRef = useRef<number[] | null>(null)

  const getImageSpan = useCallback((key: Key) => {
    const raw = imageColumnSpans[key] ?? 1
    return Math.max(1, Math.min(gridCols, raw))
  }, [gridCols, imageColumnSpans])

  const getImageRows = useCallback((key: Key) => {
    const raw = imageRowSpans[key] ?? 1
    return Math.max(1, Math.min(gridRows, raw))
  }, [gridRows, imageRowSpans])

  const getImageColorReference = useCallback((key: Key): string => {
    const raw = imageColors[key]
    if (typeof raw === "string") {
      return getImageSchemeColorReference(raw, imageColorScheme)
    }
    return getImageSchemeColorReference(defaultImageColor, imageColorScheme)
  }, [defaultImageColor, imageColorScheme, imageColors])

  const getImageColor = useCallback((key: Key): string => {
    return resolveImageSchemeColor(getImageColorReference(key), imageColorScheme)
  }, [getImageColorReference, imageColorScheme])

  const normalizeImageColorReferences = useCallback((
    colors: Partial<Record<Key, string>>,
    schemeId: ImageColorSchemeId,
  ): Partial<Record<Key, string>> => {
    let changed = false
    const next = { ...colors }
    for (const [key, value] of Object.entries(colors) as [Key, string][]) {
      const normalized = getImageSchemeColorReference(value, schemeId)
      if (normalized === value) continue
      next[key] = normalized
      changed = true
    }
    return changed ? next : colors
  }, [])

  const isImagePlaceholderKey = useCallback((key: Key): boolean => (
    key.startsWith("image-")
    || imageOrder.includes(key)
  ), [imageOrder])

  const buildImageSnapshotState = useCallback((): ImageSnapshotState<Key> => ({
    imageOrder: [...imageOrder],
    imageModulePositions: { ...imageModulePositions },
    imageColumnSpans: imageOrder.reduce((acc, key) => {
      acc[key] = getImageSpan(key)
      return acc
    }, {} as Partial<Record<Key, number>>),
    imageRowSpans: imageOrder.reduce((acc, key) => {
      acc[key] = getImageRows(key)
      return acc
    }, {} as Partial<Record<Key, number>>),
    imageColors: imageOrder.reduce((acc, key) => {
      acc[key] = getImageColorReference(key)
      return acc
    }, {} as Partial<Record<Key, string>>),
  }), [
    getImageColorReference,
    getImageRows,
    getImageSpan,
    imageModulePositions,
    imageOrder,
  ])

  const applyImageSnapshot = useCallback((snapshot: PreviewLayoutState<string, string, Key>) => {
    const normalizedOrder = (Array.isArray(snapshot.imageOrder) ? snapshot.imageOrder : [])
      .filter((key): key is Key => typeof key === "string" && key.length > 0)
      .filter((key, index, source) => source.indexOf(key) === index)

    const metrics = getGridMetrics()
    const nextPositions = normalizedOrder.reduce((acc, key) => {
      const raw = snapshot.imageModulePositions?.[key]
      if (!raw || typeof raw.col !== "number" || typeof raw.row !== "number") return acc
      const span = Math.max(1, Math.min(gridCols, snapshot.imageColumnSpans?.[key] ?? 1))
      const minCol = -Math.max(0, span - 1)
      const maxCol = Math.max(0, gridCols - 1)
      const minRow = -Math.max(0, metrics.maxBaselineRow)
      acc[key] = {
        col: Math.max(minCol, Math.min(maxCol, Math.round(raw.col))),
        row: Math.max(minRow, Math.min(metrics.maxBaselineRow, raw.row)),
      }
      return acc
    }, {} as Partial<Record<Key, ModulePosition>>)

    const nextSpans = normalizedOrder.reduce((acc, key) => {
      acc[key] = Math.max(1, Math.min(gridCols, snapshot.imageColumnSpans?.[key] ?? 1))
      return acc
    }, {} as Partial<Record<Key, number>>)
    const nextRows = normalizedOrder.reduce((acc, key) => {
      acc[key] = Math.max(1, Math.min(gridRows, snapshot.imageRowSpans?.[key] ?? 1))
      return acc
    }, {} as Partial<Record<Key, number>>)
    const nextColors = normalizedOrder.reduce((acc, key) => {
      const raw = snapshot.imageColors?.[key]
      acc[key] = getImageSchemeColorReference(raw ?? defaultImageColor, imageColorScheme)
      return acc
    }, {} as Partial<Record<Key, string>>)

    suppressImageModuleRemapRef.current = true
    setImageOrder(normalizedOrder)
    setImageModulePositions(nextPositions)
    setImageColumnSpans(nextSpans)
    setImageRowSpans(nextRows)
    setImageColors(nextColors)
    setImageEditorState(null)
  }, [
    defaultImageColor,
    getGridMetrics,
    gridCols,
    gridRows,
    imageColorScheme,
  ])

  const openImageEditor = useCallback((key: Key) => {
    setImageEditorState({
      target: key,
      draftColumns: getImageSpan(key),
      draftRows: getImageRows(key),
      draftColor: getImageColor(key),
    })
  }, [getImageColor, getImageRows, getImageSpan])

  const closeImageEditor = useCallback(() => {
    setImageEditorState(null)
  }, [])

  const insertImagePlaceholder = useCallback((key: Key, options: InsertImagePlaceholderOptions<Key>) => {
    const columns = Math.max(1, Math.min(gridCols, options.columns ?? 1))
    const rows = Math.max(1, Math.min(gridRows, options.rows ?? 1))
    const colorReference = getImageSchemeColorReference(options.color ?? defaultImageColor, imageColorScheme)

    setImageOrder((current) => {
      const next = current.filter((item) => item !== key)
      if (options.afterKey) {
        const insertIndex = next.indexOf(options.afterKey)
        if (insertIndex >= 0) {
          next.splice(insertIndex + 1, 0, key)
          return next
        }
      }
      next.push(key)
      return next
    })
    setImageModulePositions((current) => ({ ...current, [key]: options.position }))
    setImageColumnSpans((current) => ({ ...current, [key]: columns }))
    setImageRowSpans((current) => ({ ...current, [key]: rows }))
    setImageColors((current) => ({ ...current, [key]: colorReference }))
  }, [defaultImageColor, gridCols, gridRows, imageColorScheme])

  const removeImagePlaceholder = useCallback((key: Key) => {
    setImageOrder((prev) => prev.filter((item) => item !== key))
    setImageModulePositions((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageColumnSpans((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageRowSpans((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageColors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageEditorState((prev) => (prev?.target === key ? null : prev))
  }, [])

  const deleteImagePlaceholder = useCallback(() => {
    if (!imageEditorState) return
    removeImagePlaceholder(imageEditorState.target as Key)
  }, [imageEditorState, removeImagePlaceholder])

  const handleImageColorSchemeChange = useCallback((nextScheme: ImageColorSchemeId) => {
    setImageColors((prev) => normalizeImageColorReferences(prev, imageColorScheme))
    onImageColorSchemeChange?.(nextScheme)
  }, [imageColorScheme, normalizeImageColorReferences, onImageColorSchemeChange])

  const resetImageTransientState = useCallback(() => {
    lastLiveImageEditorSignatureRef.current = ""
    suppressImageModuleRemapRef.current = true
    previousImageGridRef.current = null
    previousImageRowStartsRef.current = null
    setImageEditorState(null)
  }, [])

  useEffect(() => {
    if (!imageEditorState) {
      lastLiveImageEditorSignatureRef.current = ""
      return
    }
    const signature = [
      imageEditorState.target,
      imageEditorState.draftColumns,
      imageEditorState.draftRows,
      imageEditorState.draftColor,
    ].join("|")
    if (lastLiveImageEditorSignatureRef.current === signature) return
    lastLiveImageEditorSignatureRef.current = signature

    const key = imageEditorState.target as Key
    const columns = Math.max(1, Math.min(gridCols, imageEditorState.draftColumns))
    const rows = Math.max(1, Math.min(gridRows, imageEditorState.draftRows))
    const color = getImageSchemeColorReference(imageEditorState.draftColor, imageColorScheme)
    const existingPosition = imageModulePositions[key] ?? { col: 0, row: 0 }
    const clampedPosition = clampImageBaselinePosition(existingPosition, columns)

    setImageColumnSpans((prev) => (
      prev[key] === columns
        ? prev
        : { ...prev, [key]: columns }
    ))
    setImageRowSpans((prev) => (
      prev[key] === rows
        ? prev
        : { ...prev, [key]: rows }
    ))
    setImageColors((prev) => (
      prev[key] === color
        ? prev
        : { ...prev, [key]: color }
    ))
    setImageModulePositions((prev) => {
      const current = prev[key]
      if (current && current.col === clampedPosition.col && current.row === clampedPosition.row) {
        return prev
      }
      return { ...prev, [key]: clampedPosition }
    })
  }, [
    clampImageBaselinePosition,
    gridCols,
    gridRows,
    imageColorScheme,
    imageEditorState,
    imageModulePositions,
  ])

  useEffect(() => {
    const previousScheme = previousImageColorSchemeRef.current
    if (previousScheme === imageColorScheme) return
    setImageColors((prev) => normalizeImageColorReferences(prev, previousScheme))
    previousImageColorSchemeRef.current = imageColorScheme
  }, [imageColorScheme, normalizeImageColorReferences])

  useEffect(() => {
    setImageEditorState((prev) => {
      if (!prev) return prev
      const nextColor = resolveImageSchemeColor(imageColors[prev.target as Key], imageColorScheme)
      if (prev.draftColor.toLowerCase() === nextColor.toLowerCase()) return prev
      return { ...prev, draftColor: nextColor }
    })
  }, [imageColorScheme, imageColors])

  useEffect(() => {
    const metrics = getGridMetrics()
    const currentGrid = { cols: gridCols, rows: gridRows }
    const currentRowStarts = metrics.rowStartBaselines

    if (!previousImageGridRef.current) {
      previousImageGridRef.current = currentGrid
      previousImageRowStartsRef.current = currentRowStarts
      return
    }

    if (suppressImageModuleRemapRef.current) {
      suppressImageModuleRemapRef.current = false
      previousImageGridRef.current = currentGrid
      previousImageRowStartsRef.current = currentRowStarts
      return
    }

    const previousGrid = previousImageGridRef.current
    const previousRowStarts = previousImageRowStartsRef.current ?? currentRowStarts
    const gridChanged = previousGrid.cols !== currentGrid.cols || previousGrid.rows !== currentGrid.rows
    const rowStartsChanged = (
      previousRowStarts.length !== currentRowStarts.length
      || previousRowStarts.some((value, index) => Math.abs(value - (currentRowStarts[index] ?? value)) > 0.0001)
    )
    if (!gridChanged && !rowStartsChanged) return

    const hasGridReduction = currentGrid.cols < previousGrid.cols || currentGrid.rows < previousGrid.rows
    if (!hasGridReduction && rowStartsChanged) {
      setImageModulePositions((prev) => {
        let changed = false
        const next: Partial<Record<Key, ModulePosition>> = { ...prev }
        for (const key of imageOrder) {
          const position = prev[key]
          if (!position) continue
          const span = Math.max(1, Math.min(currentGrid.cols, imageColumnSpans[key] ?? 1))
          const minCol = -Math.max(0, span - 1)
          const maxCol = Math.max(0, currentGrid.cols - 1)
          const moduleIndex = findNearestAxisIndex(previousRowStarts, position.row)
          const previousStart = previousRowStarts[moduleIndex] ?? 0
          const targetStart = currentRowStarts[Math.min(moduleIndex, Math.max(0, currentRowStarts.length - 1))] ?? 0
          const baselineOffset = position.row - previousStart
          const remappedRow = targetStart + baselineOffset
          const clampedRow = Math.max(-metrics.maxBaselineRow, Math.min(metrics.maxBaselineRow, remappedRow))
          const clampedCol = Math.max(minCol, Math.min(maxCol, position.col))
          if (Math.abs(clampedRow - position.row) > 0.0001 || clampedCol !== position.col) {
            next[key] = { col: clampedCol, row: clampedRow }
            changed = true
          }
        }
        return changed ? next : prev
      })
    }

    previousImageGridRef.current = currentGrid
    previousImageRowStartsRef.current = currentRowStarts
  }, [
    getGridMetrics,
    gridCols,
    gridRows,
    imageColumnSpans,
    imageOrder,
  ])

  return {
    imageOrder,
    setImageOrder,
    imageModulePositions,
    setImageModulePositions,
    imageColumnSpans,
    setImageColumnSpans,
    imageRowSpans,
    setImageRowSpans,
    imageColors,
    setImageColors,
    imageEditorState,
    setImageEditorState,
    getImageSpan,
    getImageRows,
    getImageColorReference,
    getImageColor,
    isImagePlaceholderKey,
    buildImageSnapshotState,
    applyImageSnapshot,
    openImageEditor,
    closeImageEditor,
    insertImagePlaceholder,
    removeImagePlaceholder,
    deleteImagePlaceholder,
    handleImageColorSchemeChange,
    normalizeImageColorReferences,
    resetImageTransientState,
  }
}
