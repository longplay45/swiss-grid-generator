"use client"

import { ChevronUp, Pencil, Plus, Trash2 } from "lucide-react"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"

import { ProjectPageLayersList } from "@/components/sidebar/ProjectPageLayersList"
import { ProjectSidebarSection } from "@/components/sidebar/ProjectSidebarSection"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { ProjectPage } from "@/lib/document-session"
import {
  clearWindowSelection,
  isCardDragIgnoreTarget,
  lockDocumentUserSelect,
} from "@/lib/sidebar-card-drag"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"

type PreviewLayoutState = SharedPreviewLayoutState<string, string, string>

type Props = {
  projectTitle: string
  pages: ProjectPage<PreviewLayoutState>[]
  activePageId: string
  onProjectTitleChange: (nextTitle: string) => void
  onSelectPage: (pageId: string) => void
  onAddPage: () => void
  onRenamePage: (pageId: string, nextName: string) => void
  onDeletePage: (pageId: string) => void
  onPageOrderChange: (orderedIds: string[]) => void
  baseFont: string
  imageColorScheme: ImageColorSchemeId
  selectedLayerKey: string | null
  hoveredLayerKey: string | null
  onLayerOrderChange: (nextLayerOrder: string[]) => void
  onSelectedLayerKeyChange: (key: string | null) => void
  onHoverLayerChange: (key: string | null) => void
  onLayerEditorToggle: (target: string) => void
  onLayerDelete: (target: string, kind: "text" | "image") => void
  pagesCollapsed: boolean
  onPagesHeaderClick: (event: React.MouseEvent) => void
  onPagesHeaderDoubleClick: (event: React.MouseEvent) => void
  isDarkMode?: boolean
}

function getLayerCount(page: ProjectPage<PreviewLayoutState>): number {
  const textLayerCount = page.previewLayout?.blockOrder.length ?? 0
  const imageLayerCount = page.previewLayout?.imageOrder?.length ?? 0
  return textLayerCount + imageLayerCount
}

export function PagesPanel({
  projectTitle,
  pages,
  activePageId,
  onProjectTitleChange,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onPageOrderChange,
  baseFont,
  imageColorScheme,
  selectedLayerKey,
  hoveredLayerKey,
  onLayerOrderChange,
  onSelectedLayerKeyChange,
  onHoverLayerChange,
  onLayerEditorToggle,
  onLayerDelete,
  pagesCollapsed,
  onPagesHeaderClick,
  onPagesHeaderDoubleClick,
  isDarkMode = false,
}: Props) {
  const PROJECT_CARD_MIN_HEIGHT_CLASS = "min-h-[50px]"
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [pageNameDraft, setPageNameDraft] = useState("")
  const [isEditingProjectTitle, setIsEditingProjectTitle] = useState(false)
  const [projectTitleDraft, setProjectTitleDraft] = useState(projectTitle)
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)
  const [expandedPageId, setExpandedPageId] = useState<string | null>(activePageId)
  const previousPageIdsRef = useRef<string[]>(pages.map((page) => page.id))
  const scrollToPageHeaderRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const dropIndicatorIndexRef = useRef<number | null>(null)
  const selectionLockCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!editingPageId) return
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [editingPageId])

  useEffect(() => {
    if (!isEditingProjectTitle) return
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    })
  }, [isEditingProjectTitle])

  useEffect(() => {
    if (isEditingProjectTitle) return
    setProjectTitleDraft(projectTitle)
  }, [isEditingProjectTitle, projectTitle])

  useEffect(() => {
    if (expandedPageId === null) return
    if (pages.some((page) => page.id === expandedPageId)) return
    setExpandedPageId(null)
  }, [expandedPageId, pages])

  useEffect(() => {
    const previousPageIds = previousPageIdsRef.current
    const currentPageIds = pages.map((page) => page.id)
    const pageWasAdded = currentPageIds.length > previousPageIds.length
    const activePageIsNew = !previousPageIds.includes(activePageId) && currentPageIds.includes(activePageId)

    if (pageWasAdded && activePageIsNew) {
      setExpandedPageId(activePageId)
    }

    previousPageIdsRef.current = currentPageIds
  }, [activePageId, pages])

  useEffect(() => {
    if (pagesCollapsed) return
    if (scrollToPageHeaderRef.current !== activePageId) return
    const target = cardRefs.current[activePageId]
    if (!target) return
    const scrollRoot = target.closest("[data-help-scroll-root='true']") as HTMLElement | null
    if (!scrollRoot) return

    const topGapPx = 10
    const rootRect = scrollRoot.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const deltaToTop = targetRect.top - rootRect.top - topGapPx
    const nextTop = scrollRoot.scrollTop + deltaToTop

    window.requestAnimationFrame(() => {
      scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" })
    })
    scrollToPageHeaderRef.current = null
  }, [activePageId, expandedPageId, pagesCollapsed])

  useEffect(() => {
    const releaseOnMouseUp = () => {
      if (draggingPageId) return
      selectionLockCleanupRef.current?.()
      selectionLockCleanupRef.current = null
    }

    window.addEventListener("mouseup", releaseOnMouseUp)
    window.addEventListener("blur", releaseOnMouseUp)
    return () => {
      window.removeEventListener("mouseup", releaseOnMouseUp)
      window.removeEventListener("blur", releaseOnMouseUp)
    }
  }, [draggingPageId])

  useEffect(() => (
    () => {
      selectionLockCleanupRef.current?.()
      selectionLockCleanupRef.current = null
    }
  ), [])

  const tone = isDarkMode
    ? {
        body: "text-[#8D98AA]",
        card: "border-[#313A47] bg-[#1D232D] text-[#F4F6F8]",
        cardMuted: "text-[#8D98AA]",
        close: "text-[#A8B1BF] hover:bg-[#232A35] hover:text-[#F4F6F8]",
        button: "border-[#313A47] bg-[#1D232D] text-[#A8B1BF] hover:bg-[#232A35] hover:text-[#F4F6F8]",
        input: "border-[#313A47] bg-[#232A35] text-[#F4F6F8] placeholder:text-[#8D98AA]",
      }
    : {
        body: "text-gray-600",
        card: "border-gray-200 bg-gray-100 text-gray-900",
        cardMuted: "text-gray-500",
        close: "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
        button: "border-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900",
        input: "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
      }

  const visibleProjectTitle = projectTitle.trim() || "Untitled Project"
  const stationaryPages = useMemo(
    () => pages.filter((page) => page.id !== draggingPageId),
    [draggingPageId, pages],
  )
  const stationaryIndexByPageId = useMemo(
    () => new Map(stationaryPages.map((page, index) => [page.id, index])),
    [stationaryPages],
  )

  const beginRename = (page: ProjectPage<PreviewLayoutState>) => {
    setEditingPageId(page.id)
    setPageNameDraft(page.name)
  }

  const cancelRename = () => {
    setEditingPageId(null)
    setPageNameDraft("")
  }

  const commitRename = () => {
    if (!editingPageId) return
    const trimmedName = pageNameDraft.trim()
    if (trimmedName.length > 0) {
      onRenamePage(editingPageId, trimmedName)
    }
    cancelRename()
  }

  const beginProjectTitleEdit = () => {
    setProjectTitleDraft(projectTitle)
    setIsEditingProjectTitle(true)
  }

  const cancelProjectTitleEdit = () => {
    setIsEditingProjectTitle(false)
    setProjectTitleDraft(projectTitle)
  }

  const commitProjectTitle = () => {
    const trimmedTitle = projectTitleDraft.trim()
    if (trimmedTitle.length > 0 && trimmedTitle !== projectTitle.trim()) {
      onProjectTitleChange(trimmedTitle)
    }
    setIsEditingProjectTitle(false)
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

  const movePage = (targetIndex: number) => {
    if (!draggingPageId) return
    const nextVisibleOrder = [...stationaryPages]
    const normalizedIndex = Math.max(0, Math.min(targetIndex, nextVisibleOrder.length))
    const draggedPage = pages.find((page) => page.id === draggingPageId)
    if (!draggedPage) return
    nextVisibleOrder.splice(normalizedIndex, 0, draggedPage)
    const nextOrder = nextVisibleOrder.map((page) => page.id)
    if (nextOrder.length === pages.length && nextOrder.every((pageId, index) => pageId === pages[index]?.id)) {
      return
    }
    onPageOrderChange(nextOrder)
  }

  const updateDropIndicator = (nextIndex: number | null) => {
    dropIndicatorIndexRef.current = nextIndex
    setDropIndicatorIndex((current) => (current === nextIndex ? current : nextIndex))
  }

  const clearDragState = () => {
    setDraggingPageId(null)
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
    for (let index = 0; index < stationaryPages.length; index += 1) {
      const page = stationaryPages[index]
      const card = cardRefs.current[page.id]
      if (!card) continue
      const bounds = card.getBoundingClientRect()
      if (clientY < bounds.top + bounds.height / 2) {
        return index
      }
    }
    return stationaryPages.length
  }

  const handleListDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingPageId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    updateDropIndicator(getDropIndexForPointer(event.clientY))
  }

  const handleListDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingPageId) return
    event.preventDefault()
    event.stopPropagation()
    const targetIndex = dropIndicatorIndexRef.current
    if (targetIndex !== null) {
      movePage(targetIndex)
    }
    clearDragState()
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={SECTION_HEADLINE_CLASSNAME}>Name</div>
          {isEditingProjectTitle ? (
            <input
              ref={titleInputRef}
              value={projectTitleDraft}
              onChange={(event) => setProjectTitleDraft(event.target.value)}
              onBlur={commitProjectTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitProjectTitle()
                }
                if (event.key === "Escape") {
                  event.preventDefault()
                  cancelProjectTitleEdit()
                }
              }}
              className={`w-full rounded-sm border px-2 py-1 text-[12px] outline-none ${tone.input}`}
            />
          ) : (
            <div className={`truncate text-xs ${tone.body}`}>
              {visibleProjectTitle} | {pages.length} {pages.length === 1 ? "page" : "pages"}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Rename project"
          className={`rounded-sm p-1 transition-colors ${tone.close}`}
          onClick={beginProjectTitleEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      <ProjectSidebarSection
        title="Pages"
        collapsed={pagesCollapsed}
        collapsedSummary={`${pages.length} ${pages.length === 1 ? "page" : "pages"}`}
        onHeaderClick={onPagesHeaderClick}
        onHeaderDoubleClick={onPagesHeaderDoubleClick}
        isDarkMode={isDarkMode}
      >
        <div
          className="flex flex-col"
          onDragOver={handleListDragOver}
          onDrop={handleListDrop}
        >
          <div
            className={draggingPageId ? "relative h-5 shrink-0" : "hidden"}
            onDragOver={handleListDragOver}
            onDrop={handleListDrop}
          >
            {renderDropMarker(0)}
          </div>
          {pages.map((page, index) => {
            const layerCount = getLayerCount(page)
            const isActive = page.id === activePageId
            const isEditing = page.id === editingPageId
            const isExpanded = expandedPageId === page.id
            const deleteDisabled = pages.length <= 1
            const stationaryIndex = stationaryIndexByPageId.get(page.id) ?? null

            return (
              <Fragment key={page.id}>
                {page.id !== draggingPageId && stationaryIndex !== null && stationaryIndex > 0
                  ? renderDropMarker(stationaryIndex)
                  : null}
                <div
                  ref={(node) => {
                    cardRefs.current[page.id] = node
                  }}
                  draggable={!isEditing && !isEditingProjectTitle && !isExpanded}
                  onPointerDownCapture={(event) => {
                    if (isEditing || isEditingProjectTitle || isExpanded) return
                    if (event.button !== 0) return
                    if (isCardDragIgnoreTarget(event.target)) return
                    engageSelectionLock()
                  }}
                  onDragStart={(event) => {
                    if (isEditing || isEditingProjectTitle || isExpanded) return
                    event.dataTransfer.effectAllowed = "move"
                    event.dataTransfer.setData("text/plain", page.id)
                    clearWindowSelection()
                    onSelectPage(page.id)
                    setDraggingPageId(page.id)
                    updateDropIndicator(pages.findIndex((item) => item.id === page.id))
                  }}
                  onDragEnd={clearDragState}
                  onDragOver={handleListDragOver}
                  onDrop={handleListDrop}
                  onClick={() => {
                    if (isEditing || isEditingProjectTitle) return
                    if (isActive && isExpanded) {
                      setExpandedPageId(null)
                      return
                    }
                    scrollToPageHeaderRef.current = page.id
                    setExpandedPageId(page.id)
                    onSelectPage(page.id)
                  }}
                  className={`${index > 0 ? "mt-2" : ""} ${PROJECT_CARD_MIN_HEIGHT_CLASS} rounded-md border px-3 py-2 text-xs leading-snug transition-colors ${
                    draggingPageId === page.id
                      ? `${tone.card} opacity-45`
                      : tone.card
                  } ${isActive ? "border-l-orange-500 border-t-orange-500" : ""} ${
                    isEditing || isEditingProjectTitle || isExpanded ? "select-none" : "cursor-grab select-none"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`min-w-0 flex-1 ${isEditing ? "" : "pointer-events-none select-none"}`}>
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          data-card-drag-ignore="true"
                          value={pageNameDraft}
                          onChange={(event) => setPageNameDraft(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          onBlur={commitRename}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault()
                              commitRename()
                            }
                            if (event.key === "Escape") {
                              event.preventDefault()
                              cancelRename()
                            }
                          }}
                          className={`w-full rounded-sm border px-2 py-1 text-[12px] outline-none ${tone.input}`}
                        />
                      ) : (
                        <div className="truncate text-[12px] font-medium">{page.name}</div>
                      )}
                      <div className={`mt-0.5 flex items-center gap-2 text-[11px] ${tone.cardMuted}`}>
                        <span>{layerCount} {layerCount === 1 ? "layer" : "layers"}</span>
                        {isActive ? <span className="text-orange-500">Active page</span> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-card-drag-ignore="true"
                        aria-label={isExpanded ? `Collapse ${page.name}` : `Expand ${page.name}`}
                        className={`rounded-sm p-1 transition-colors ${tone.close}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (isExpanded) {
                            setExpandedPageId(null)
                            return
                          }
                          setExpandedPageId(page.id)
                        }}
                      >
                        <ChevronUp className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : "rotate-90"}`} />
                      </button>
                      <button
                        type="button"
                        data-card-drag-ignore="true"
                        aria-label={`Rename ${page.name}`}
                        className={`rounded-sm p-1 transition-colors ${tone.close}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          beginRename(page)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        data-card-drag-ignore="true"
                        aria-label={`Delete ${page.name}`}
                        disabled={deleteDisabled}
                        className={`rounded-sm p-1 transition-colors ${
                          deleteDisabled
                            ? "cursor-not-allowed text-gray-400/60"
                            : `${tone.close} hover:text-red-500`
                        }`}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (deleteDisabled) return
                          if (!window.confirm(`Delete ${page.name}?`)) return
                          cancelRename()
                          onDeletePage(page.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded ? (
                    <div data-card-drag-ignore="true" className={`mt-3 border-t pt-3 ${isDarkMode ? "border-[#313A47]" : "border-gray-200"}`}>
                      <div className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] ${tone.cardMuted}`}>
                        Layers
                      </div>
                      <ProjectPageLayersList
                        pageId={page.id}
                        layout={page.previewLayout}
                        baseFont={baseFont}
                        imageColorScheme={imageColorScheme}
                        selectedLayerKey={isActive ? selectedLayerKey : null}
                        hoveredLayerKey={isActive ? hoveredLayerKey : null}
                        isActivePage={isActive}
                        onSelectPage={onSelectPage}
                        onLayerOrderChange={onLayerOrderChange}
                        onSelectLayer={onSelectedLayerKeyChange}
                        onHoverLayerChange={onHoverLayerChange}
                        onToggleEditor={onLayerEditorToggle}
                        onDeleteLayer={onLayerDelete}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  ) : null}
                </div>
              </Fragment>
            )
          })}
          <div
            className={draggingPageId ? "relative h-5 shrink-0" : "hidden"}
            onDragOver={handleListDragOver}
            onDrop={handleListDrop}
          >
            {renderDropMarker(stationaryPages.length)}
          </div>
          <button
            type="button"
            aria-label="Add page"
            onClick={onAddPage}
            className={`mt-2 flex items-center justify-between rounded-md border px-3 py-2 text-left text-[12px] transition-colors ${tone.button}`}
          >
            <span className="font-medium">Add Page</span>
            <Plus className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </ProjectSidebarSection>
    </div>
  )
}
