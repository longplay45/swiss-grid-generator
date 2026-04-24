import type { ProjectPage } from "@/lib/document-session"
import type { DocumentVariableContext } from "@/lib/document-variable-text"

export function getProjectPagePhysicalPageSpan<Layout>(
  page: Pick<ProjectPage<Layout>, "layoutMode">,
): number {
  return page.layoutMode === "facing" ? 2 : 1
}

export function getProjectPhysicalPageCount<Layout>(
  pages: readonly Pick<ProjectPage<Layout>, "layoutMode">[],
): number {
  return Math.max(1, pages.reduce((sum, page) => sum + getProjectPagePhysicalPageSpan(page), 0))
}

export function getProjectPagePhysicalPageNumberAtIndex<Layout>(
  pages: readonly Pick<ProjectPage<Layout>, "layoutMode">[],
  index: number,
): number {
  if (index <= 0) return 1
  return pages
    .slice(0, index)
    .reduce((sum, page) => sum + getProjectPagePhysicalPageSpan(page), 1)
}

export function getProjectPagePhysicalPageNumber<Layout>(
  pages: readonly ProjectPage<Layout>[],
  pageId: string,
): number {
  const pageIndex = pages.findIndex((page) => page.id === pageId)
  return getProjectPagePhysicalPageNumberAtIndex(pages, pageIndex)
}

export function resolveSpreadDocumentVariableContextForColumn(
  context: DocumentVariableContext | null | undefined,
  startCol: number,
  gridCols: number,
  isFacingSpread: boolean,
): DocumentVariableContext | null | undefined {
  if (!context) return context
  if (!isFacingSpread) return context
  const columnsPerPage = Math.max(1, Math.floor(gridCols / 2))
  if (startCol < columnsPerPage) return context

  return {
    ...context,
    pageNumber: context.pageNumber + 1,
  }
}
