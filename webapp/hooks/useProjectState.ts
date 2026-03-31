import { useCallback, useEffect, useMemo, useState } from "react"

import {
  createDefaultProject,
  createProjectPage,
  type LoadedProject,
  type ProjectPage,
} from "@/lib/document-session"

type Args<Layout> = {
  defaultUiSettings: Record<string, unknown>
  defaultPreviewLayout: Layout | null
  currentUiSettings: Record<string, unknown>
  currentPreviewLayout: Layout | null
  getCurrentPreviewLayout: () => Layout | null
  onApplyPage: (page: ProjectPage<Layout>) => void
}

function cloneSerializable<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function getNextPageName<Layout>(pages: readonly ProjectPage<Layout>[]): string {
  let maxPageNumber = 0

  pages.forEach((page) => {
    const match = /^Page\s+(\d+)$/i.exec(page.name.trim())
    if (!match) return
    const pageNumber = Number.parseInt(match[1], 10)
    if (Number.isFinite(pageNumber)) {
      maxPageNumber = Math.max(maxPageNumber, pageNumber)
    }
  })

  return `Page ${Math.max(maxPageNumber + 1, pages.length + 1)}`
}

function reconcilePageOrder<Layout>(
  currentPages: readonly ProjectPage<Layout>[],
  orderedIds: readonly string[],
): ProjectPage<Layout>[] {
  const pageById = new Map(currentPages.map((page) => [page.id, page]))
  const nextPages: ProjectPage<Layout>[] = []
  const seenIds = new Set<string>()

  orderedIds.forEach((pageId) => {
    const page = pageById.get(pageId)
    if (!page || seenIds.has(pageId)) return
    seenIds.add(pageId)
    nextPages.push(page)
  })

  currentPages.forEach((page) => {
    if (seenIds.has(page.id)) return
    nextPages.push(page)
  })

  return nextPages
}

function persistActivePageSnapshot<Layout>(
  project: LoadedProject<Layout>,
  currentUiSettings: Record<string, unknown>,
  currentPreviewLayout: Layout | null,
): LoadedProject<Layout> {
  const activePage = project.pages.find((page) => page.id === project.activePageId)
  if (!activePage) return project
  if (activePage.uiSettings === currentUiSettings && activePage.previewLayout === currentPreviewLayout) {
    return project
  }

  return {
    ...project,
    pages: project.pages.map((page) => (
      page.id === project.activePageId
        ? {
            ...page,
            uiSettings: currentUiSettings,
            previewLayout: currentPreviewLayout,
          }
        : page
    )),
  }
}

export function useProjectState<Layout>({
  defaultUiSettings,
  defaultPreviewLayout,
  currentUiSettings,
  currentPreviewLayout,
  getCurrentPreviewLayout,
  onApplyPage,
}: Args<Layout>) {
  const [project, setProject] = useState<LoadedProject<Layout>>(() =>
    createDefaultProject({
      uiSettings: defaultUiSettings,
      previewLayout: defaultPreviewLayout,
    }),
  )

  const getLivePreviewLayout = useCallback(
    () => getCurrentPreviewLayout() ?? currentPreviewLayout,
    [currentPreviewLayout, getCurrentPreviewLayout],
  )

  const persistProjectSnapshot = useCallback((currentProject: LoadedProject<Layout>) => (
    persistActivePageSnapshot(currentProject, currentUiSettings, getLivePreviewLayout())
  ), [currentUiSettings, getLivePreviewLayout])

  useEffect(() => {
    // NEW: Project/Pages/Layers architecture
    setProject((current) => persistActivePageSnapshot(current, currentUiSettings, currentPreviewLayout))
  }, [currentPreviewLayout, currentUiSettings])

  const activePage = useMemo(
    () => project.pages.find((page) => page.id === project.activePageId) ?? project.pages[0],
    [project],
  )

  const applyLoadedProject = useCallback((loadedProject: LoadedProject<Layout>) => {
    setProject(loadedProject)
    const nextActivePage = loadedProject.pages.find((page) => page.id === loadedProject.activePageId) ?? loadedProject.pages[0]
    if (nextActivePage) {
      onApplyPage(nextActivePage)
    }
  }, [onApplyPage])

  const selectPage = useCallback((pageId: string) => {
    if (pageId === project.activePageId) return

    const persistedProject = persistProjectSnapshot(project)
    const nextActivePage = persistedProject.pages.find((page) => page.id === pageId)
    if (!nextActivePage) return

    setProject({
      ...persistedProject,
      activePageId: pageId,
    })
    onApplyPage(nextActivePage)
  }, [onApplyPage, persistProjectSnapshot, project])

  const addPage = useCallback(() => {
    const persistedProject = persistProjectSnapshot(project)
    const nextPage = createProjectPage({
      name: getNextPageName(persistedProject.pages),
      uiSettings: cloneSerializable(currentUiSettings),
      previewLayout: cloneSerializable(getLivePreviewLayout() ?? defaultPreviewLayout),
    })

    setProject({
      ...persistedProject,
      activePageId: nextPage.id,
      pages: [...persistedProject.pages, nextPage],
    })
    onApplyPage(nextPage)
  }, [currentUiSettings, defaultPreviewLayout, getLivePreviewLayout, onApplyPage, persistProjectSnapshot, project])

  const renamePage = useCallback((pageId: string, nextName: string) => {
    const trimmedName = nextName.trim()
    if (!trimmedName) return

    setProject((current) => ({
      ...current,
      pages: current.pages.map((page) => (
        page.id === pageId && page.name !== trimmedName
          ? { ...page, name: trimmedName }
          : page
      )),
    }))
  }, [])

  const deletePage = useCallback((pageId: string) => {
    if (project.pages.length <= 1) return

    const persistedProject = persistProjectSnapshot(project)
    const pageIndex = persistedProject.pages.findIndex((page) => page.id === pageId)
    if (pageIndex === -1) return

    const remainingPages = persistedProject.pages.filter((page) => page.id !== pageId)
    if (!remainingPages.length) return

    if (pageId !== persistedProject.activePageId) {
      setProject({
        ...persistedProject,
        pages: remainingPages,
      })
      return
    }

    const fallbackIndex = Math.min(pageIndex, remainingPages.length - 1)
    const nextActivePage = remainingPages[fallbackIndex] ?? remainingPages[remainingPages.length - 1] ?? null
    if (!nextActivePage) return

    setProject({
      ...persistedProject,
      activePageId: nextActivePage.id,
      pages: remainingPages,
    })
    onApplyPage(nextActivePage)
  }, [onApplyPage, persistProjectSnapshot, project])

  const reorderPages = useCallback((orderedIds: string[]) => {
    const persistedProject = persistProjectSnapshot(project)
    const nextPages = reconcilePageOrder(persistedProject.pages, orderedIds)
    const hasChanged = nextPages.length !== persistedProject.pages.length
      || nextPages.some((page, index) => page.id !== persistedProject.pages[index]?.id)

    if (!hasChanged) return

    setProject({
      ...persistedProject,
      pages: nextPages,
    })
  }, [persistProjectSnapshot, project])

  return {
    project,
    pages: project.pages,
    activePage,
    activePageId: project.activePageId,
    applyLoadedProject,
    selectPage,
    addPage,
    renamePage,
    deletePage,
    reorderPages,
  }
}
