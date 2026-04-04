import type { ProjectMetadata } from "@/lib/document-session"
import type { PageExportPlan } from "@/lib/page-export-plan"
import type { ResolvedProjectPageExportSource } from "@/lib/project-page-export-source"

export type IdmlFontMetadata = {
  family: string
  styleName: string
  fullName: string
  postScriptName: string
  weight: number
  italic: boolean
  fontType: string
}

export type IdmlProjectPage = ResolvedProjectPageExportSource & {
  exportPlan: PageExportPlan
}

export type SwissGridIdmlDocument = {
  metadata: ProjectMetadata
  pages: IdmlProjectPage[]
}
