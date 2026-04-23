import { useCallback, useMemo, useState } from "react"

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
  if (
    activePage.uiSettings === currentUiSettings
    && activePage.previewLayout === currentPreviewLayout
  ) {
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

  const getCurrentProjectSnapshot = useCallback(() => (
    persistActivePageSnapshot(project, currentUiSettings, getLivePreviewLayout())
  ), [currentUiSettings, getLivePreviewLayout, project])

  const projectSnapshot = useMemo(
    () => persistActivePageSnapshot(project, currentUiSettings, currentPreviewLayout),
    [currentPreviewLayout, currentUiSettings, project],
  )

  const activePage = useMemo(
    () => projectSnapshot.pages.find((page) => page.id === projectSnapshot.activePageId) ?? projectSnapshot.pages[0],
    [projectSnapshot],
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

    const currentProject = getCurrentProjectSnapshot()
    const nextActivePage = currentProject.pages.find((page) => page.id === pageId)
    if (!nextActivePage) return

    setProject({
      ...currentProject,
      activePageId: pageId,
    })
    onApplyPage(nextActivePage)
  }, [getCurrentProjectSnapshot, onApplyPage, project.activePageId])

  const addPage = useCallback(() => {
    const currentProject = getCurrentProjectSnapshot()
    const sourcePage = currentProject.pages.find((page) => page.id === currentProject.activePageId) ?? null
    const nextPage = createProjectPage({
      name: getNextPageName(currentProject.pages),
      uiSettings: cloneSerializable(currentUiSettings),
      previewLayout: cloneSerializable(getLivePreviewLayout() ?? defaultPreviewLayout),
      layoutMode: sourcePage?.layoutMode ?? "single",
    })

    setProject({
      ...currentProject,
      activePageId: nextPage.id,
      pages: [...currentProject.pages, nextPage],
    })
    onApplyPage(nextPage)
  }, [currentUiSettings, defaultPreviewLayout, getCurrentProjectSnapshot, getLivePreviewLayout, onApplyPage])

  const setFacingPageEnabled = useCallback((pageId: string, enabled: boolean) => {
    if (!enabled) return
    const currentProject = getCurrentProjectSnapshot()
    const pageIndex = currentProject.pages.findIndex((page) => page.id === pageId)
    if (pageIndex === -1) return
    const page = currentProject.pages[pageIndex]
    if (!page) return
    if (page.layoutMode === "facing") return

    const nextPages = currentProject.pages.map((entry) => (
      entry.id === page.id
        ? {
            ...entry,
            layoutMode: "facing" as const,
          }
        : entry
    ))
    const nextActivePage = nextPages.find((entry) => entry.id === currentProject.activePageId) ?? nextPages[0] ?? null
    if (!nextActivePage) return

    setProject({
      ...currentProject,
      activePageId: nextActivePage.id,
      pages: nextPages,
    })
    if (nextActivePage.id === currentProject.activePageId) {
      onApplyPage(nextActivePage)
    }
  }, [getCurrentProjectSnapshot, onApplyPage])

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
    if (projectSnapshot.pages.length <= 1) return

    const currentProject = getCurrentProjectSnapshot()
    const pageIndex = currentProject.pages.findIndex((page) => page.id === pageId)
    if (pageIndex === -1) return

    const remainingPages = currentProject.pages.filter((page) => page.id !== pageId)
    if (!remainingPages.length) return

    if (pageId !== currentProject.activePageId) {
      setProject({
        ...currentProject,
        pages: remainingPages,
      })
      return
    }

    const fallbackIndex = Math.min(pageIndex, remainingPages.length - 1)
    const nextActivePage = remainingPages[fallbackIndex] ?? remainingPages[remainingPages.length - 1] ?? null
    if (!nextActivePage) return

    setProject({
      ...currentProject,
      activePageId: nextActivePage.id,
      pages: remainingPages,
    })
    onApplyPage(nextActivePage)
  }, [getCurrentProjectSnapshot, onApplyPage, projectSnapshot.pages.length])

  const reorderPages = useCallback((orderedIds: string[]) => {
    const currentProject = getCurrentProjectSnapshot()
    const nextPages = reconcilePageOrder(currentProject.pages, orderedIds)
    const hasChanged = nextPages.length !== currentProject.pages.length
      || nextPages.some((page, index) => page.id !== currentProject.pages[index]?.id)

    if (!hasChanged) return

    setProject({
      ...currentProject,
      pages: nextPages,
    })
  }, [getCurrentProjectSnapshot])

  return {
    project: projectSnapshot,
    pages: projectSnapshot.pages,
    activePage,
    activePageId: projectSnapshot.activePageId,
    getCurrentProjectSnapshot,
    applyLoadedProject,
    selectPage,
    addPage,
    setFacingPageEnabled,
    renamePage,
    deletePage,
    reorderPages,
  }
}
