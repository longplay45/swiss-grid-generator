"use client"

import { Trash2, X } from "lucide-react"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"

import {
  getDefaultTextSchemeColor,
  isImagePlaceholderColor,
  resolveImageSchemeColor,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { DEFAULT_BASE_FONT, getFontFamilyCss, isFontFamily } from "@/lib/config/fonts"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"

type PreviewLayoutState = SharedPreviewLayoutState<string, string, string>

type Props = {
  layout: PreviewLayoutState | null
  baseFont: string
  imageColorScheme: ImageColorSchemeId
  selectedLayerKey: string | null
  onLayerOrderChange: (nextLayerOrder: string[]) => void
  onSelectLayer: (key: string | null) => void
  onToggleEditor: (key: string) => void
  onDeleteLayer: (key: string, kind: "text" | "image") => void
  onClose: () => void
  isDarkMode?: boolean
}

type LayerThumb = {
  key: string
  kind: "text" | "image"
  rows: number
  cols: number
  hierarchy: string
  font: string
  textPreview: string
  color: string
}

const STYLE_LABELS: Record<string, string> = {
  fx: "FX",
  display: "Display",
  headline: "Headline",
  subhead: "Subhead",
  body: "Body",
  caption: "Caption",
}

function toLabel(value: string): string {
  return STYLE_LABELS[value] ?? (value ? value.charAt(0).toUpperCase() + value.slice(1) : "Body")
}

function reconcileLayerOrder(
  current: readonly string[],
  blockOrder: readonly string[],
  imageOrder: readonly string[],
): string[] {
  const validKeys = new Set<string>([...imageOrder, ...blockOrder])
  const next: string[] = []
  const seen = new Set<string>()

  for (const key of current) {
    if (!validKeys.has(key) || seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of imageOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of blockOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  return next
}

function getTextPreview(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) return "Empty"
  return normalized.length > 75 ? `${normalized.slice(0, 75)}...` : normalized
}

export function LayersPanel({
  layout,
  baseFont,
  imageColorScheme,
  selectedLayerKey,
  onLayerOrderChange,
  onSelectLayer,
  onToggleEditor,
  onDeleteLayer,
  onClose,
  isDarkMode = false,
}: Props) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const dropIndicatorIndexRef = useRef<number | null>(null)

  const blockOrder = useMemo(() => layout?.blockOrder ?? [], [layout?.blockOrder])
  const imageOrder = useMemo(() => layout?.imageOrder ?? [], [layout?.imageOrder])
  const layerOrder = useMemo(
    () => reconcileLayerOrder(layout?.layerOrder ?? [], blockOrder, imageOrder),
    [blockOrder, imageOrder, layout?.layerOrder],
  )

  const thumbs = useMemo(() => {
    const next = new Map<string, LayerThumb>()
    const defaultTextColor = getDefaultTextSchemeColor(imageColorScheme)
    for (const key of blockOrder) {
      const rawText = layout?.textContent?.[key] ?? ""
      const rawColor = layout?.blockTextColors?.[key]
      next.set(key, {
        key,
        kind: "text",
        rows: Math.max(1, layout?.blockRowSpans?.[key] ?? 1),
        cols: Math.max(1, layout?.blockColumnSpans?.[key] ?? 1),
        hierarchy: toLabel(layout?.styleAssignments?.[key] ?? "body"),
        font: layout?.blockFontFamilies?.[key] ?? baseFont,
        textPreview: getTextPreview(rawText),
        color: typeof rawColor === "string" && isImagePlaceholderColor(rawColor)
          ? rawColor.toLowerCase()
          : defaultTextColor,
      })
    }
    for (const key of imageOrder) {
      const rawColor = layout?.imageColors?.[key]
      next.set(key, {
        key,
        kind: "image",
        rows: Math.max(1, layout?.imageRowSpans?.[key] ?? 1),
        cols: Math.max(1, layout?.imageColumnSpans?.[key] ?? 1),
        hierarchy: "Image Placeholder",
        font: "—",
        textPreview: "",
        color: resolveImageSchemeColor(rawColor, imageColorScheme),
      })
    }
    return next
  }, [baseFont, blockOrder, imageColorScheme, imageOrder, layout])

  const visibleOrder = useMemo(() => [...layerOrder].reverse(), [layerOrder])
  const visibleThumbs = visibleOrder
    .map((key) => thumbs.get(key))
    .filter((thumb): thumb is LayerThumb => Boolean(thumb))
  const stationaryVisibleOrder = useMemo(
    () => visibleOrder.filter((key) => key !== draggingKey),
    [draggingKey, visibleOrder],
  )
  const stationaryIndexByKey = useMemo(
    () => new Map(stationaryVisibleOrder.map((key, index) => [key, index])),
    [stationaryVisibleOrder],
  )

  useEffect(() => {
    if (!selectedLayerKey) return
    const target = cardRefs.current[selectedLayerKey]
    if (!target) return
    const scrollRoot = target.closest("[data-help-scroll-root='true']") as HTMLElement | null
    if (!scrollRoot) return

    const topGapPx = 12
    const bottomGapPx = 12
    const rootRect = scrollRoot.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const isAbove = targetRect.top < rootRect.top + topGapPx
    const isBelow = targetRect.bottom > rootRect.bottom - bottomGapPx
    if (!isAbove && !isBelow) return

    const nextTop = isAbove
      ? scrollRoot.scrollTop + (targetRect.top - rootRect.top) - topGapPx
      : scrollRoot.scrollTop + (targetRect.bottom - rootRect.bottom) + bottomGapPx

    window.requestAnimationFrame(() => {
      scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" })
    })
  }, [selectedLayerKey])

  const tone = isDarkMode
    ? {
        heading: "text-gray-100",
        body: "text-gray-400",
        card: "border-gray-700 bg-gray-800 text-gray-100",
        cardMuted: "text-gray-400",
        stripeBg: "bg-gray-900",
        close: "text-gray-300 hover:bg-gray-700 hover:text-gray-100",
      }
    : {
        heading: "text-gray-900",
        body: "text-gray-600",
        card: "border-gray-200 bg-gray-50 text-gray-900",
        cardMuted: "text-gray-500",
        stripeBg: "bg-white",
        close: "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
      }

  const moveLayer = (targetIndex: number) => {
    if (!draggingKey) return
    const nextVisibleOrder = [...stationaryVisibleOrder]
    const normalizedIndex = Math.max(0, Math.min(targetIndex, nextVisibleOrder.length))
    nextVisibleOrder.splice(normalizedIndex, 0, draggingKey)
    const nextLayerOrder = [...nextVisibleOrder].reverse()
    if (nextLayerOrder.every((key, index) => key === layerOrder[index]) && nextLayerOrder.length === layerOrder.length) {
      return
    }
    onLayerOrderChange(nextLayerOrder)
  }

  const updateDropIndicator = (nextIndex: number | null) => {
    dropIndicatorIndexRef.current = nextIndex
    setDropIndicatorIndex((current) => (current === nextIndex ? current : nextIndex))
  }

  const clearDragState = () => {
    setDraggingKey(null)
    updateDropIndicator(null)
  }

  const handleListDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingKey) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    updateDropIndicator(getDropIndexForPointer(event.clientY))
  }

  const handleListDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingKey) return
    event.preventDefault()
    event.stopPropagation()
    const targetIndex = dropIndicatorIndexRef.current
    if (targetIndex !== null) {
      moveLayer(targetIndex)
    }
    clearDragState()
  }

  const getDropIndexForPointer = (clientY: number) => {
    for (let index = 0; index < stationaryVisibleOrder.length; index += 1) {
      const key = stationaryVisibleOrder[index]
      const card = cardRefs.current[key]
      if (!card) continue
      const bounds = card.getBoundingClientRect()
      if (clientY < bounds.top + bounds.height / 2) {
        return index
      }
    }
    return stationaryVisibleOrder.length
  }

  const renderDropMarker = (index: number | null) => {
    if (dropIndicatorIndex !== index) return null
    return (
      <div className="relative h-4 shrink-0">
        <div
          className={`absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 rounded-full ${isDarkMode ? "bg-blue-400" : "bg-blue-500"}`}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-semibold ${tone.heading}`}>Layers</h3>
          <p className={`mt-1 text-xs ${tone.body}`}>
            Click to select. Double-click to toggle edit mode. Drag to change z-index. Use delete to remove a layer.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close layers panel"
          onClick={onClose}
          className={`rounded-sm p-1 transition-colors ${tone.close}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="flex flex-col"
        onDragOver={handleListDragOver}
        onDrop={handleListDrop}
      >
        <div
          className={draggingKey ? "relative h-5 shrink-0" : "hidden"}
          onDragOver={handleListDragOver}
          onDrop={handleListDrop}
        >
          {renderDropMarker(0)}
        </div>
        {visibleThumbs.map((thumb, index) => {
          const isActive = draggingKey === thumb.key || selectedLayerKey === thumb.key
          const stationaryIndex = stationaryIndexByKey.get(thumb.key) ?? null
          return (
            <Fragment key={thumb.key}>
              {thumb.key !== draggingKey && stationaryIndex !== null && stationaryIndex > 0
                ? renderDropMarker(stationaryIndex)
                : null}
              <div
                ref={(node) => {
                  cardRefs.current[thumb.key] = node
                }}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", thumb.key)
                  onSelectLayer(thumb.key)
                  setDraggingKey(thumb.key)
                  updateDropIndicator(stationaryVisibleOrder.indexOf(thumb.key))
                }}
                onDragEnd={clearDragState}
                onDragOver={handleListDragOver}
                onDrop={handleListDrop}
                onClick={() => onSelectLayer(thumb.key)}
                onDoubleClick={() => onToggleEditor(thumb.key)}
                className={`${index > 0 ? "mt-2" : ""} relative cursor-grab rounded-md border px-3 py-2 text-xs leading-snug transition-colors ${
                  draggingKey === thumb.key
                    ? `${tone.card} cursor-grabbing opacity-45`
                    : tone.card
                } ${isActive ? "border-l-orange-500 border-t-orange-500" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[11px] ${tone.cardMuted}`}>
                      {thumb.kind === "image" ? thumb.hierarchy : `${thumb.hierarchy} Font: ${thumb.font}`}
                    </div>
                    {thumb.kind === "text" ? (
                      <div className="mt-0.5 flex min-w-0 items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: thumb.color }}
                          aria-hidden="true"
                        />
                        <div
                          className="truncate text-[12px] text-gray-900 dark:text-gray-100"
                          style={{
                            fontFamily: getFontFamilyCss(isFontFamily(thumb.font) ? thumb.font : DEFAULT_BASE_FONT),
                          }}
                        >
                          {thumb.textPreview}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`mt-1 h-4 rounded-sm border border-black/10 ${tone.stripeBg}`}
                        style={{ backgroundColor: thumb.color }}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${thumb.kind === "image" ? "image placeholder" : "paragraph"}`}
                    className={`rounded-sm p-1 ${tone.cardMuted} hover:text-red-500`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onDeleteLayer(thumb.key, thumb.kind)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Fragment>
          )
        })}
        <div
          className={draggingKey ? "relative h-5 shrink-0" : "hidden"}
          onDragOver={handleListDragOver}
          onDrop={handleListDrop}
        >
          {renderDropMarker(stationaryVisibleOrder.length)}
        </div>
      </div>
    </div>
  )
}
