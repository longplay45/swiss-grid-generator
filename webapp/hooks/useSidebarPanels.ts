import { useCallback, useEffect, useState } from "react"

import type { HelpSectionId } from "@/lib/help-registry"

export type SidebarPanel = "help" | "imprint" | "layers" | "feedback" | null

type Args = {
  showLayers: boolean
  onShowLayersChange: (next: boolean) => void
}

export function useSidebarPanels({ showLayers, onShowLayersChange }: Args) {
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>(null)
  const [showPresetsBrowser, setShowPresetsBrowser] = useState(true)
  const [activeHelpSectionId, setActiveHelpSectionId] = useState<HelpSectionId | null>(null)

  useEffect(() => {
    if (showPresetsBrowser) {
      setActiveSidebarPanel(null)
      onShowLayersChange(false)
      return
    }
    if (showLayers && activeSidebarPanel !== "layers") {
      setActiveSidebarPanel("layers")
      return
    }
    if (!showLayers && activeSidebarPanel === "layers") {
      setActiveSidebarPanel(null)
    }
  }, [activeSidebarPanel, onShowLayersChange, showLayers, showPresetsBrowser])

  const openSidebarPanel = useCallback((panel: SidebarPanel) => {
    if (showPresetsBrowser && panel !== null) return
    setActiveSidebarPanel(panel)
    onShowLayersChange(panel === "layers")
  }, [onShowLayersChange, showPresetsBrowser])

  const closeSidebarPanel = useCallback(() => {
    openSidebarPanel(null)
  }, [openSidebarPanel])

  const openHelpSection = useCallback((sectionId: HelpSectionId) => {
    setActiveHelpSectionId(sectionId)
    openSidebarPanel("help")
  }, [openSidebarPanel])

  const toggleHelpPanel = useCallback(() => {
    if (showPresetsBrowser) return
    setActiveSidebarPanel((prev) => {
      const next = prev === "help" ? null : "help"
      onShowLayersChange(false)
      setActiveHelpSectionId(null)
      return next
    })
  }, [onShowLayersChange, showPresetsBrowser])

  const toggleLayersPanel = useCallback(() => {
    if (showPresetsBrowser) return
    setActiveSidebarPanel((prev) => {
      const next = prev === "layers" ? null : "layers"
      onShowLayersChange(next === "layers")
      return next
    })
  }, [onShowLayersChange, showPresetsBrowser])

  return {
    activeSidebarPanel,
    activeHelpSectionId,
    showPresetsBrowser,
    showSectionHelpIcons: activeSidebarPanel === "help",
    setActiveHelpSectionId,
    setShowPresetsBrowser,
    openSidebarPanel,
    closeSidebarPanel,
    openHelpSection,
    toggleHelpPanel,
    toggleLayersPanel,
  }
}
