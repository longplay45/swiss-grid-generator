import type { LoadedProject } from "@/lib/document-session"
import { buildPageExportPlan } from "@/lib/page-export-plan"
import { buildSwissGridIdmlPackage } from "@/lib/idml/builder"
import type { SwissGridIdmlDocument } from "@/lib/idml/types"
import { buildResolvedProjectPageExportSource } from "@/lib/project-page-export-source"

export async function renderSwissGridIdmlProject(
  project: LoadedProject<Record<string, unknown>>,
): Promise<Uint8Array> {
  const pages = project.pages.map((page, index) => {
    const sourcePath = `${page.name || `Page ${index + 1}`} (${page.id})`
    const resolved = buildResolvedProjectPageExportSource(page, sourcePath)
    return {
      ...resolved,
      exportPlan: buildPageExportPlan({
        result: resolved.result,
        layout: resolved.previewLayout,
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
  })

  return buildSwissGridIdmlPackage({
    metadata: project.metadata,
    pages,
  } satisfies SwissGridIdmlDocument)
}
