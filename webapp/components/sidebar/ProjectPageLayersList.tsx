"use client"

import { Trash2 } from "lucide-react"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"

import {
  getDefaultTextSchemeColor,
  isImagePlaceholderColor,
  resolveImageSchemeColor,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { DEFAULT_BASE_FONT, getFontFamilyCss, isFontFamily } from "@/lib/config/fonts"
import { normalizeImagePlaceholderOpacity } from "@/lib/image-placeholder-opacity"
import {
  clearWindowSelection,
  isCardDragIgnoreTarget,
  lockDocumentUserSelect,
} from "@/lib/sidebar-card-drag"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"

type PreviewLayoutState = SharedPreviewLayoutState<string, string, string>

type Props = {
  pageId: string
  layout: PreviewLayoutState | null
  baseFont: string
  imageColorScheme: ImageColorSchemeId
  selectedLayerKey: string | null
  hoveredLayerKey: string | null
  isActivePage: boolean
  onSelectPage: (pageId: string) => void
  onLayerOrderChange: (nextLayerOrder: string[]) => void
  onSelectLayer: (key: string | null) => void
  onHoverLayerChange: (key: string | null) => void
  onToggleEditor: (key: string) => void
  onDeleteLayer: (key: string, kind: "text" | "image") => void
  isDarkMode?: boolean
}

type LayerThumb = {
  key: string
  kind: "text" | "image"
  hierarchy: string
  font: string
  textPreview: string
  color: string
  opacity: number
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

export function ProjectPageLayersList({
  pageId,
  layout,
  baseFont,
  imageColorScheme,
  selectedLayerKey,
  hoveredLayerKey,
  isActivePage,
  onSelectPage,
  onLayerOrderChange,
  onSelectLayer,
  onHoverLayerChange,
  onToggleEditor,
  onDeleteLayer,
  isDarkMode = false,
}: Props) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const dropIndicatorIndexRef = useRef<number | null>(null)
  const selectionLockCleanupRef = useRef<(() => void) | null>(null)

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
        hierarchy: toLabel(layout?.styleAssignments?.[key] ?? "body"),
        font: layout?.blockFontFamilies?.[key] ?? baseFont,
        textPreview: getTextPreview(rawText),
        color: typeof rawColor === "string" && isImagePlaceholderColor(rawColor)
          ? rawColor.toLowerCase()
          : defaultTextColor,
        opacity: 1,
      })
    }
    for (const key of imageOrder) {
      const rawColor = layout?.imageColors?.[key]
      next.set(key, {
        key,
        kind: "image",
        hierarchy: "Image Placeholder",
        font: "—",
        textPreview: "",
        color: resolveImageSchemeColor(rawColor, imageColorScheme),
        opacity: normalizeImagePlaceholderOpacity(layout?.imageOpacities?.[key]),
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
    if (!selectedLayerKey || !isActivePage) return
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
  }, [isActivePage, selectedLayerKey])

  useEffect(() => {
    const releaseOnMouseUp = () => {
      if (draggingKey) return
      selectionLockCleanupRef.current?.()
      selectionLockCleanupRef.current = null
    }

    window.addEventListener("mouseup", releaseOnMouseUp)
    window.addEventListener("blur", releaseOnMouseUp)
    return () => {
      window.removeEventListener("mouseup", releaseOnMouseUp)
      window.removeEventListener("blur", releaseOnMouseUp)
    }
  }, [draggingKey])

  useEffect(() => (
    () => {
      selectionLockCleanupRef.current?.()
      selectionLockCleanupRef.current = null
    }
  ), [])

  const tone = isDarkMode
    ? {
        card: "border-[#313A47] bg-[#232A35] text-[#F4F6F8]",
        cardMuted: "text-[#8D98AA]",
        stripeBg: "bg-[#161A22]",
        empty: "text-[#8D98AA]",
      }
    : {
        card: "border-gray-200 bg-gray-50 text-gray-900",
        cardMuted: "text-gray-500",
        stripeBg: "bg-white",
        empty: "text-gray-500",
      }

  const moveLayer = (targetIndex: number) => {
    if (!draggingKey || !isActivePage) return
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
    selectionLockCleanupRef.current?.()
    selectionLockCleanupRef.current = null
  }

  const engageSelectionLock = () => {
    clearWindowSelection()
    if (selectionLockCleanupRef.current) return
    selectionLockCleanupRef.current = lockDocumentUserSelect()
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

  const handleListDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingKey || !isActivePage) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    updateDropIndicator(getDropIndexForPointer(event.clientY))
  }

  const handleListDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingKey || !isActivePage) return
    event.preventDefault()
    event.stopPropagation()
    const targetIndex = dropIndicatorIndexRef.current
    if (targetIndex !== null) {
      moveLayer(targetIndex)
    }
    clearDragState()
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

  if (visibleThumbs.length === 0) {
    return (
      <div
        data-card-drag-ignore="true"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        className={`rounded-md border border-dashed px-3 py-2 text-[11px] ${tone.empty} ${isDarkMode ? "border-[#313A47]" : "border-gray-200"}`}
      >
        No layers on this page yet.
      </div>
    )
  }

  return (
    <div
      data-card-drag-ignore="true"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      className="flex flex-col"
      onDragOver={handleListDragOver}
      onDrop={handleListDrop}
    >
      <div
        className={draggingKey && isActivePage ? "relative h-5 shrink-0" : "hidden"}
        onDragOver={handleListDragOver}
        onDrop={handleListDrop}
      >
        {renderDropMarker(0)}
      </div>
      {visibleThumbs.map((thumb, index) => {
        const isSelected = selectedLayerKey === thumb.key
        const isHovered = isActivePage && hoveredLayerKey === thumb.key
        const stationaryIndex = stationaryIndexByKey.get(thumb.key) ?? null
        const allowLayerInteractions = isActivePage
        return (
          <Fragment key={`${pageId}-${thumb.key}`}>
            {thumb.key !== draggingKey && stationaryIndex !== null && stationaryIndex > 0
              ? renderDropMarker(stationaryIndex)
              : null}
            <div
              ref={(node) => {
                cardRefs.current[thumb.key] = node
              }}
              data-project-layer-card="true"
              data-card-drag-ignore="true"
              draggable={allowLayerInteractions}
              onPointerDownCapture={(event) => {
                if (!allowLayerInteractions) return
                if (event.button !== 0) return
                if (isCardDragIgnoreTarget(event.target)) return
                engageSelectionLock()
              }}
              onDragStart={(event) => {
                if (!allowLayerInteractions) return
                event.dataTransfer.effectAllowed = "move"
                event.dataTransfer.setData("text/plain", thumb.key)
                clearWindowSelection()
                onSelectPage(pageId)
                onSelectLayer(thumb.key)
                setDraggingKey(thumb.key)
                updateDropIndicator(stationaryVisibleOrder.indexOf(thumb.key))
              }}
              onDragEnd={clearDragState}
              onDragOver={handleListDragOver}
              onDrop={handleListDrop}
              onMouseEnter={allowLayerInteractions ? () => onHoverLayerChange(thumb.key) : undefined}
              onMouseLeave={allowLayerInteractions ? () => onHoverLayerChange(null) : undefined}
              onClick={() => {
                onSelectPage(pageId)
                onSelectLayer(thumb.key)
                if (allowLayerInteractions) {
                  onToggleEditor(thumb.key)
                }
              }}
              className={`${index > 0 ? "mt-2" : ""} relative rounded-md border px-3 py-2 text-xs leading-snug transition-colors ${
                draggingKey === thumb.key
                  ? `${tone.card} cursor-grabbing opacity-45`
                  : tone.card
              } ${isSelected || isHovered ? "border-l-orange-500 border-t-orange-500" : ""} ${
                allowLayerInteractions ? "cursor-grab select-none" : "cursor-pointer"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="pointer-events-none min-w-0 flex-1 select-none">
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
                        className={`truncate text-[12px] ${isDarkMode ? "text-[#F4F6F8]" : "text-gray-900"}`}
                        style={{
                          fontFamily: getFontFamilyCss(isFontFamily(thumb.font) ? thumb.font : DEFAULT_BASE_FONT),
                        }}
                      >
                        {thumb.textPreview}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`mt-1 h-4 overflow-hidden rounded-sm border border-black/10 ${tone.stripeBg}`}
                    >
                      <div
                        className="h-full w-full"
                        style={{
                          backgroundColor: thumb.color,
                          opacity: thumb.opacity,
                        }}
                      />
                    </div>
                  )}
                </div>
                {allowLayerInteractions ? (
                  <button
                    type="button"
                    data-card-drag-ignore="true"
                    aria-label={`Delete ${thumb.kind === "image" ? "image placeholder" : "paragraph"}`}
                    className={`rounded-sm p-1 ${tone.cardMuted} hover:text-red-500`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onDeleteLayer(thumb.key, thumb.kind)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          </Fragment>
        )
      })}
      <div
        className={draggingKey && isActivePage ? "relative h-5 shrink-0" : "hidden"}
        onDragOver={handleListDragOver}
        onDrop={handleListDrop}
      >
        {renderDropMarker(stationaryVisibleOrder.length)}
      </div>
    </div>
  )
}
