import type { LoadedProject } from "@/lib/document-session"
import { buildPageExportPlan } from "@/lib/page-export-plan"
import { buildSwissGridIdmlPackage } from "@/lib/idml/builder"
import type { SwissGridIdmlDocument } from "@/lib/idml/types"
import { buildResolvedProjectPageExportSource } from "@/lib/project-page-export-source"
import {
  getProjectPagePhysicalPageNumberAtIndex,
  getProjectPhysicalPageCount,
} from "@/lib/document-page-numbering"

type IdmlExportProgress = {
  completedSteps: number
  totalSteps: number
  pageNumber: number
  pageName: string
}

export async function renderSwissGridIdmlProject(
  project: LoadedProject<Record<string, unknown>>,
  onProgress?: (progress: IdmlExportProgress) => void | Promise<void>,
  assertNotCancelled?: () => void,
): Promise<Uint8Array> {
  const now = new Date()
  const pageCount = getProjectPhysicalPageCount(project.pages)
  const pages: SwissGridIdmlDocument["pages"] = []

  for (const [index, page] of project.pages.entries()) {
    assertNotCancelled?.()
    const pageNumber = getProjectPagePhysicalPageNumberAtIndex(project.pages, index)
    const sourcePath = `${page.name || `Page ${pageNumber}`} (${page.id})`
    const resolved = buildResolvedProjectPageExportSource(page, sourcePath, {
      projectTitle: project.metadata.title,
      pageNumber,
      pageCount,
      now,
    })
    const plannedPage = {
      ...resolved,
      exportPlan: buildPageExportPlan({
        result: resolved.result,
        layout: resolved.previewLayout,
        documentVariableContext: resolved.documentVariableContext,
        baseFont: resolved.baseFont,
        imageColorScheme: resolved.imageColorScheme,
        canvasBackground: resolved.resolvedCanvasBackground,
        rotation: resolved.uiSettings.rotation,
        showBaselines: resolved.uiSettings.showBaselines,
        showModules: resolved.uiSettings.showModules,
        showMargins: resolved.uiSettings.showMargins,
        showImagePlaceholders: resolved.uiSettings.showImagePlaceholders,
        showTypography: resolved.uiSettings.showTypography,
      }),
    }
    pages.push(plannedPage)
    await onProgress?.({
      completedSteps: index + 1,
      totalSteps: project.pages.length,
      pageNumber,
      pageName: page.name || `Page ${pageNumber}`,
    })
  }

  assertNotCancelled?.()
  await onProgress?.({
    completedSteps: project.pages.length,
    totalSteps: project.pages.length,
    pageNumber: project.pages.length,
    pageName: "Packaging IDML",
  })
  assertNotCancelled?.()

  return buildSwissGridIdmlPackage({
    metadata: project.metadata,
    pages,
  } satisfies SwissGridIdmlDocument)
}
