import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { type ImageEditorState } from "@/components/dialogs/ImageEditorDialog"
import { type Updater } from "@/hooks/useStateCommands"
import { normalizeHeightMetrics } from "@/lib/block-height"
import {
  getImageSchemeColorReference,
  resolveImageSchemeColor,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import {
  mapAbsolutePositionsToTextBlockPositions,
  mapTextBlockPositionsToAbsolute,
  toAbsoluteTextBlockPosition,
  toTextBlockPosition,
} from "@/lib/text-block-position"
import { clampFreePlacementRow, clampLayerColumn, resolveLayerColumnBounds } from "@/lib/layer-placement"
import { normalizeImagePlaceholderOpacity } from "@/lib/image-placeholder-opacity"
import { clampRotation, hasSignificantRotation } from "@/lib/block-constraints"
import type { ModulePosition, PreviewLayoutState, TextBlockPosition } from "@/lib/types/preview-layout"

type ImageGridMetrics = {
  gridCols: number
  gridRows: number
  maxBaselineRow: number
  rowStartBaselines: number[]
}

type ImageSnapshotState<Key extends string> = Pick<
  PreviewLayoutState<string, string, Key>,
  | "imageOrder"
  | "imageModulePositions"
  | "imageColumnSpans"
  | "imageRowSpans"
  | "imageHeightBaselines"
  | "imageSnapToColumns"
  | "imageSnapToBaseline"
  | "imageRotations"
  | "imageColors"
  | "imageOpacities"
>

type Args<Key extends string> = {
  imageColorScheme: ImageColorSchemeId
  defaultImageColor: string
  gridCols: number
  gridRows: number
  getGridMetrics: () => ImageGridMetrics
  onImageColorSchemeChange?: (value: ImageColorSchemeId) => void
}

type InsertImagePlaceholderOptions<Key extends string> = {
  position: ModulePosition
  columns?: number
  rows?: number
  heightBaselines?: number
  color?: string
  opacity?: number
  snapToColumns?: boolean
  snapToBaseline?: boolean
  rotation?: number
  afterKey?: Key | null
}

export function useImagePlaceholderState<Key extends string>({
  imageColorScheme,
  defaultImageColor,
  gridCols,
  gridRows,
  getGridMetrics,
  onImageColorSchemeChange,
}: Args<Key>) {
  const [imageOrder, setImageOrder] = useState<Key[]>([])
  const [imageGridPositions, setImageGridPositions] = useState<Partial<Record<Key, TextBlockPosition>>>({})
  const [imageColumnSpans, setImageColumnSpans] = useState<Partial<Record<Key, number>>>({})
  const [imageRowSpans, setImageRowSpans] = useState<Partial<Record<Key, number>>>({})
  const [imageHeightBaselines, setImageHeightBaselines] = useState<Partial<Record<Key, number>>>({})
  const [imageSnapToColumns, setImageSnapToColumns] = useState<Partial<Record<Key, boolean>>>({})
  const [imageSnapToBaseline, setImageSnapToBaseline] = useState<Partial<Record<Key, boolean>>>({})
  const [imageRotations, setImageRotations] = useState<Partial<Record<Key, number>>>({})
  const [imageColors, setImageColors] = useState<Partial<Record<Key, string>>>({})
  const [imageOpacities, setImageOpacities] = useState<Partial<Record<Key, number>>>({})
  const [imageEditorState, setImageEditorState] = useState<ImageEditorState | null>(null)

  const lastLiveImageEditorSignatureRef = useRef("")
  const previousImageColorSchemeRef = useRef(imageColorScheme)

  const imageModulePositions = useMemo(
    () => mapTextBlockPositionsToAbsolute(imageGridPositions, getGridMetrics().rowStartBaselines),
    [getGridMetrics, imageGridPositions],
  )

  const setImageModulePositions = useCallback((next: Updater<Partial<Record<Key, ModulePosition>>>) => {
    const activeRowStartBaselines = getGridMetrics().rowStartBaselines
    setImageGridPositions((prev) => {
      const previousAbsolute = mapTextBlockPositionsToAbsolute(prev, activeRowStartBaselines)
      const resolvedNext = typeof next === "function" ? next(previousAbsolute) : next
      return mapAbsolutePositionsToTextBlockPositions(resolvedNext, activeRowStartBaselines)
    })
  }, [getGridMetrics])

  const getImageSpan = useCallback((key: Key) => {
    const raw = imageColumnSpans[key] ?? 1
    return Math.max(1, Math.min(gridCols, raw))
  }, [gridCols, imageColumnSpans])

  const getImageRows = useCallback((key: Key) => {
    return normalizeHeightMetrics({
      rows: imageRowSpans[key],
      baselines: imageHeightBaselines[key],
      gridRows,
    }).rows
  }, [gridRows, imageHeightBaselines, imageRowSpans])

  const getImageHeightBaselines = useCallback((key: Key) => {
    return normalizeHeightMetrics({
      rows: imageRowSpans[key],
      baselines: imageHeightBaselines[key],
      gridRows,
    }).baselines
  }, [gridRows, imageHeightBaselines, imageRowSpans])

  const isImageSnapToColumnsEnabled = useCallback((key: Key): boolean => (
    imageSnapToColumns[key] !== false
  ), [imageSnapToColumns])

  const isImageSnapToBaselineEnabled = useCallback((key: Key): boolean => (
    imageSnapToBaseline[key] !== false
  ), [imageSnapToBaseline])

  const getImageRotation = useCallback((key: Key): number => {
    const raw = imageRotations[key]
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 0
    return clampRotation(raw)
  }, [imageRotations])

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

  const getImageOpacity = useCallback((key: Key): number => {
    return normalizeImagePlaceholderOpacity(imageOpacities[key])
  }, [imageOpacities])

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
    imageModulePositions: { ...imageGridPositions },
    imageColumnSpans: imageOrder.reduce((acc, key) => {
      acc[key] = getImageSpan(key)
      return acc
    }, {} as Partial<Record<Key, number>>),
    imageRowSpans: imageOrder.reduce((acc, key) => {
      acc[key] = getImageRows(key)
      return acc
    }, {} as Partial<Record<Key, number>>),
    imageHeightBaselines: imageOrder.reduce((acc, key) => {
      acc[key] = getImageHeightBaselines(key)
      return acc
    }, {} as Partial<Record<Key, number>>),
    imageSnapToColumns: imageOrder.reduce((acc, key) => {
      acc[key] = isImageSnapToColumnsEnabled(key)
      return acc
    }, {} as Partial<Record<Key, boolean>>),
    imageSnapToBaseline: imageOrder.reduce((acc, key) => {
      acc[key] = isImageSnapToBaselineEnabled(key)
      return acc
    }, {} as Partial<Record<Key, boolean>>),
    imageRotations: imageOrder.reduce((acc, key) => {
      const rotation = getImageRotation(key)
      if (hasSignificantRotation(rotation)) {
        acc[key] = rotation
      }
      return acc
    }, {} as Partial<Record<Key, number>>),
    imageColors: imageOrder.reduce((acc, key) => {
      acc[key] = getImageColorReference(key)
      return acc
    }, {} as Partial<Record<Key, string>>),
    imageOpacities: imageOrder.reduce((acc, key) => {
      acc[key] = getImageOpacity(key)
      return acc
    }, {} as Partial<Record<Key, number>>),
  }), [
    getImageColorReference,
    getImageRotation,
    getImageOpacity,
    getImageRows,
    getImageHeightBaselines,
    getImageSpan,
    isImageSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
    imageGridPositions,
    imageOrder,
  ])

  const applyImageSnapshot = useCallback((snapshot: PreviewLayoutState<string, string, Key>) => {
    const normalizedOrder = (Array.isArray(snapshot.imageOrder) ? snapshot.imageOrder : [])
      .filter((key): key is Key => typeof key === "string" && key.length > 0)
      .filter((key, index, source) => source.indexOf(key) === index)

    const metrics = getGridMetrics()
    const rowStartBaselines = metrics.rowStartBaselines
    const nextPositions = normalizedOrder.reduce((acc, key) => {
      const raw = snapshot.imageModulePositions?.[key]
      if (!raw) return acc
      const span = Math.max(1, Math.min(gridCols, snapshot.imageColumnSpans?.[key] ?? 1))
      const resolvedPosition = toAbsoluteTextBlockPosition(toTextBlockPosition(raw, rowStartBaselines), rowStartBaselines)
      const snapToColumns = snapshot.imageSnapToColumns?.[key] !== false
      const { minCol, maxCol } = resolveLayerColumnBounds({ span, gridCols, snapToColumns })
      acc[key] = toTextBlockPosition({
        col: Math.max(minCol, Math.min(maxCol, snapToColumns ? Math.round(resolvedPosition.col) : resolvedPosition.col)),
        row: clampFreePlacementRow(resolvedPosition.row, metrics.maxBaselineRow),
      }, rowStartBaselines)
      return acc
    }, {} as Partial<Record<Key, TextBlockPosition>>)

    const nextSpans = normalizedOrder.reduce((acc, key) => {
      acc[key] = Math.max(1, Math.min(gridCols, snapshot.imageColumnSpans?.[key] ?? 1))
      return acc
    }, {} as Partial<Record<Key, number>>)
    const nextRows = normalizedOrder.reduce((acc, key) => {
      const height = normalizeHeightMetrics({
        rows: snapshot.imageRowSpans?.[key],
        baselines: snapshot.imageHeightBaselines?.[key],
        gridRows,
      })
      acc[key] = height.rows
      return acc
    }, {} as Partial<Record<Key, number>>)
    const nextHeightBaselines = normalizedOrder.reduce((acc, key) => {
      const height = normalizeHeightMetrics({
        rows: snapshot.imageRowSpans?.[key],
        baselines: snapshot.imageHeightBaselines?.[key],
        gridRows,
      })
      acc[key] = height.baselines
      return acc
    }, {} as Partial<Record<Key, number>>)
    const nextSnapToColumns = normalizedOrder.reduce((acc, key) => {
      acc[key] = snapshot.imageSnapToColumns?.[key] !== false
      return acc
    }, {} as Partial<Record<Key, boolean>>)
    const nextSnapToBaseline = normalizedOrder.reduce((acc, key) => {
      acc[key] = snapshot.imageSnapToBaseline?.[key] !== false
      return acc
    }, {} as Partial<Record<Key, boolean>>)
    const nextRotations = normalizedOrder.reduce((acc, key) => {
      const raw = snapshot.imageRotations?.[key]
      if (typeof raw === "number" && Number.isFinite(raw) && hasSignificantRotation(raw)) {
        acc[key] = clampRotation(raw)
      }
      return acc
    }, {} as Partial<Record<Key, number>>)
    const nextColors = normalizedOrder.reduce((acc, key) => {
      const raw = snapshot.imageColors?.[key]
      acc[key] = getImageSchemeColorReference(raw ?? defaultImageColor, imageColorScheme)
      return acc
    }, {} as Partial<Record<Key, string>>)
    const nextOpacities = normalizedOrder.reduce((acc, key) => {
      acc[key] = normalizeImagePlaceholderOpacity(snapshot.imageOpacities?.[key])
      return acc
    }, {} as Partial<Record<Key, number>>)

    setImageOrder(normalizedOrder)
    setImageGridPositions(nextPositions)
    setImageColumnSpans(nextSpans)
    setImageRowSpans(nextRows)
    setImageHeightBaselines(nextHeightBaselines)
    setImageSnapToColumns(nextSnapToColumns)
    setImageSnapToBaseline(nextSnapToBaseline)
    setImageRotations(nextRotations)
    setImageColors(nextColors)
    setImageOpacities(nextOpacities)
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
      draftHeightBaselines: getImageHeightBaselines(key),
      draftSnapToColumns: isImageSnapToColumnsEnabled(key),
      draftSnapToBaseline: isImageSnapToBaselineEnabled(key),
      draftRotation: getImageRotation(key),
      draftColor: getImageColor(key),
      draftOpacity: getImageOpacity(key),
    })
  }, [
    getImageColor,
    getImageHeightBaselines,
    getImageOpacity,
    getImageRotation,
    getImageRows,
    getImageSpan,
    isImageSnapToBaselineEnabled,
    isImageSnapToColumnsEnabled,
  ])

  const closeImageEditor = useCallback(() => {
    setImageEditorState(null)
  }, [])

  const insertImagePlaceholder = useCallback((key: Key, options: InsertImagePlaceholderOptions<Key>) => {
    const columns = Math.max(1, Math.min(gridCols, options.columns ?? 1))
    const height = normalizeHeightMetrics({
      rows: options.rows,
      baselines: options.heightBaselines,
      gridRows,
    })
    const colorReference = getImageSchemeColorReference(options.color ?? defaultImageColor, imageColorScheme)
    const opacity = normalizeImagePlaceholderOpacity(options.opacity)
    const rowStartBaselines = getGridMetrics().rowStartBaselines

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
    setImageGridPositions((current) => ({
      ...current,
      [key]: toTextBlockPosition(options.position, rowStartBaselines),
    }))
    setImageColumnSpans((current) => ({ ...current, [key]: columns }))
    setImageRowSpans((current) => ({ ...current, [key]: height.rows }))
    setImageHeightBaselines((current) => ({ ...current, [key]: height.baselines }))
    setImageSnapToColumns((current) => ({ ...current, [key]: options.snapToColumns !== false }))
    setImageSnapToBaseline((current) => ({ ...current, [key]: options.snapToBaseline !== false }))
    setImageRotations((current) => {
      const next = { ...current }
      const rotation = clampRotation(options.rotation ?? 0)
      if (hasSignificantRotation(rotation)) {
        next[key] = rotation
      } else {
        delete next[key]
      }
      return next
    })
    setImageColors((current) => ({ ...current, [key]: colorReference }))
    setImageOpacities((current) => ({ ...current, [key]: opacity }))
  }, [defaultImageColor, getGridMetrics, gridCols, gridRows, imageColorScheme])

  const removeImagePlaceholder = useCallback((key: Key) => {
    setImageOrder((prev) => prev.filter((item) => item !== key))
    setImageGridPositions((prev) => {
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
    setImageHeightBaselines((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageSnapToColumns((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageSnapToBaseline((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageRotations((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageColors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageOpacities((prev) => {
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
      imageEditorState.draftHeightBaselines,
      imageEditorState.draftSnapToColumns ? "1" : "0",
      imageEditorState.draftSnapToBaseline ? "1" : "0",
      imageEditorState.draftRotation.toFixed(3),
      imageEditorState.draftColor,
      imageEditorState.draftOpacity.toFixed(3),
    ].join("|")
    if (lastLiveImageEditorSignatureRef.current === signature) return
    lastLiveImageEditorSignatureRef.current = signature

    const key = imageEditorState.target as Key
    const columns = Math.max(1, Math.min(gridCols, imageEditorState.draftColumns))
    const height = normalizeHeightMetrics({
      rows: imageEditorState.draftRows,
      baselines: imageEditorState.draftHeightBaselines,
      gridRows,
    })
    const snapToColumns = imageEditorState.draftSnapToColumns
    const snapToBaseline = imageEditorState.draftSnapToBaseline
    const rotation = clampRotation(imageEditorState.draftRotation)
    const color = getImageSchemeColorReference(imageEditorState.draftColor, imageColorScheme)
    const opacity = normalizeImagePlaceholderOpacity(imageEditorState.draftOpacity)
    const existingPosition = imageModulePositions[key] ?? { col: 0, row: 0 }
    const metrics = getGridMetrics()
    const clampedPosition = {
      col: clampLayerColumn(snapToColumns ? Math.round(existingPosition.col) : existingPosition.col, {
        span: columns,
        gridCols: metrics.gridCols,
        snapToColumns,
      }),
      row: clampFreePlacementRow(
        snapToBaseline ? Math.round(existingPosition.row) : existingPosition.row,
        metrics.maxBaselineRow,
      ),
    }

    setImageColumnSpans((prev) => (
      prev[key] === columns
        ? prev
        : { ...prev, [key]: columns }
    ))
    setImageRowSpans((prev) => (
      prev[key] === height.rows
        ? prev
        : { ...prev, [key]: height.rows }
    ))
    setImageHeightBaselines((prev) => (
      prev[key] === height.baselines
        ? prev
        : { ...prev, [key]: height.baselines }
    ))
    setImageSnapToColumns((prev) => (
      prev[key] === snapToColumns
        ? prev
        : { ...prev, [key]: snapToColumns }
    ))
    setImageSnapToBaseline((prev) => (
      prev[key] === snapToBaseline
        ? prev
        : { ...prev, [key]: snapToBaseline }
    ))
    setImageRotations((prev) => {
      const next = { ...prev }
      if (hasSignificantRotation(rotation)) {
        if (next[key] === rotation) return prev
        next[key] = rotation
        return next
      }
      if (next[key] === undefined) return prev
      delete next[key]
      return next
    })
    setImageColors((prev) => (
      prev[key] === color
        ? prev
        : { ...prev, [key]: color }
    ))
    setImageOpacities((prev) => (
      prev[key] === opacity
        ? prev
        : { ...prev, [key]: opacity }
    ))
    setImageModulePositions((prev) => {
      const current = prev[key]
      if (current && current.col === clampedPosition.col && current.row === clampedPosition.row) {
        return prev
      }
      return { ...prev, [key]: clampedPosition }
    })
  }, [
    getGridMetrics,
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
      const nextOpacity = getImageOpacity(prev.target as Key)
      if (
        prev.draftColor.toLowerCase() === nextColor.toLowerCase()
        && Math.abs(prev.draftOpacity - nextOpacity) <= 0.0001
      ) {
        return prev
      }
      return { ...prev, draftColor: nextColor, draftOpacity: nextOpacity }
    })
  }, [getImageOpacity, imageColorScheme, imageColors])

  return {
    imageOrder,
    setImageOrder,
    imageGridPositions,
    imageModulePositions,
    setImageModulePositions,
    imageColumnSpans,
    setImageColumnSpans,
    imageRowSpans,
    setImageRowSpans,
    imageHeightBaselines,
    setImageHeightBaselines,
    imageSnapToColumns,
    setImageSnapToColumns,
    imageSnapToBaseline,
    setImageSnapToBaseline,
    imageRotations,
    setImageRotations,
    imageColors,
    setImageColors,
    imageOpacities,
    setImageOpacities,
    imageEditorState,
    setImageEditorState,
    getImageSpan,
    getImageRows,
    getImageHeightBaselines,
    isImageSnapToColumnsEnabled,
    isImageSnapToBaselineEnabled,
    getImageRotation,
    getImageColorReference,
    getImageColor,
    getImageOpacity,
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
