import { useCallback, useState } from "react"
import type { ChangeEvent } from "react"

import type { LayoutPreset } from "@/lib/presets"
import {
  EMPTY_PROJECT_METADATA,
  parseLoadedProject,
  type ProjectMetadata,
  type LoadedProject,
} from "@/lib/document-session"

type Args<Layout> = {
  defaultMetadata?: ProjectMetadata
  onApplyProject: (project: LoadedProject<Layout>) => void
  onLoadFailed: (error: unknown) => void
  onProjectLoaded?: (source: "file" | "preset") => void
}

export function useProjectController<Layout>({
  defaultMetadata = EMPTY_PROJECT_METADATA,
  onApplyProject,
  onLoadFailed,
  onProjectLoaded,
}: Args<Layout>) {
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>(defaultMetadata)

  const applyLoadedProject = useCallback((project: LoadedProject<Layout>) => {
    setProjectMetadata(project.metadata)
    onApplyProject(project)
  }, [onApplyProject])

  const loadProjectFromInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    const finish = () => {
      event.target.value = ""
    }

    reader.onload = () => {
      try {
        applyLoadedProject(parseLoadedProject<Layout>(JSON.parse(String(reader.result))))
        onProjectLoaded?.("file")
      } catch (error) {
        console.error(error)
        onLoadFailed(error)
      } finally {
        finish()
      }
    }

    reader.onerror = () => {
      const error = reader.error ?? new Error("Could not read project JSON.")
      console.error(error)
      onLoadFailed(error)
      finish()
    }

    reader.readAsText(file)
  }, [applyLoadedProject, onLoadFailed, onProjectLoaded])

  const loadPresetProject = useCallback((preset: LayoutPreset) => {
    try {
      applyLoadedProject(parseLoadedProject<Layout>(JSON.parse(preset.projectSourceJson)))
      onProjectLoaded?.("preset")
    } catch (error) {
      console.error(error)
      onLoadFailed(error)
    }
  }, [applyLoadedProject, onLoadFailed, onProjectLoaded])

  return {
    projectMetadata,
    setProjectMetadata,
    loadProjectFromInput,
    loadPresetProject,
  }
}
