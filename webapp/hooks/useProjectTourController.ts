import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { ProjectTour, ProjectTourStep } from "@/lib/project-tour"
import { resolveProjectTourStartIndex } from "@/lib/project-tour"
import type { HelpSectionId } from "@/lib/help-registry"

type Args = {
  tour: ProjectTour | null | undefined
  showPresetsBrowser: boolean
  setShowPresetsBrowser: (next: boolean) => void
  activePageId: string
  selectedLayerKey: string | null
  onSelectPage: (pageId: string) => void
  onSelectLayer: (key: string | null) => void
  onOpenSidebarPanel: (panel: "layers" | "help" | null) => void
  onOpenHelpSection: (sectionId: HelpSectionId) => void
  onOpenLayerEditor: (target: string) => void
}

type LayerAdvanceState = {
  stepId: string
  initialSelection: string | null
}

export function useProjectTourController({
  tour,
  showPresetsBrowser,
  setShowPresetsBrowser,
  activePageId,
  selectedLayerKey,
  onSelectPage,
  onSelectLayer,
  onOpenSidebarPanel,
  onOpenHelpSection,
  onOpenLayerEditor,
}: Args) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const lastAppliedStepKeyRef = useRef<string | null>(null)
  const layerAdvanceStateRef = useRef<LayerAdvanceState | null>(null)

  useEffect(() => {
    if (!tour) {
      setIsOpen(false)
      setCurrentStepIndex(0)
      lastAppliedStepKeyRef.current = null
      layerAdvanceStateRef.current = null
      return
    }

    const startIndex = resolveProjectTourStartIndex(tour)
    setCurrentStepIndex(startIndex)
    setIsOpen(tour.autoStart !== false)
    lastAppliedStepKeyRef.current = null
    layerAdvanceStateRef.current = null
  }, [tour])

  const currentStep = useMemo<ProjectTourStep | null>(() => {
    if (!tour || !isOpen) return null
    return tour.steps[currentStepIndex] ?? null
  }, [currentStepIndex, isOpen, tour])

  useEffect(() => {
    if (!tour || !isOpen || !currentStep) return

    const stepKey = `${tour.id}:${currentStep.id}:${currentStepIndex}`
    if (lastAppliedStepKeyRef.current === stepKey) return
    lastAppliedStepKeyRef.current = stepKey

    if (showPresetsBrowser) {
      setShowPresetsBrowser(false)
    }

    if (currentStep.pageId && currentStep.pageId !== activePageId) {
      onSelectPage(currentStep.pageId)
    }

    if (currentStep.helpSectionId) {
      onOpenHelpSection(currentStep.helpSectionId)
    } else if (currentStep.sidebarPanel) {
      onOpenSidebarPanel(currentStep.sidebarPanel)
    } else if (currentStep.focusLayerKey || currentStep.openEditor) {
      onOpenSidebarPanel("layers")
    }

    if (currentStep.advanceOn?.type === "layerClick") {
      const target = currentStep.advanceOn.layerKey
      const initialSelection = selectedLayerKey === target ? null : selectedLayerKey
      layerAdvanceStateRef.current = {
        stepId: currentStep.id,
        initialSelection,
      }
      if (selectedLayerKey === target) {
        onSelectLayer(null)
      }
    } else {
      layerAdvanceStateRef.current = null
    }

    if (currentStep.focusLayerKey && currentStep.autoSelectLayer !== false) {
      onSelectLayer(currentStep.focusLayerKey)
    }

    if (currentStep.openEditor && currentStep.focusLayerKey) {
      onOpenLayerEditor(currentStep.focusLayerKey)
    }
  }, [
    activePageId,
    currentStep,
    currentStepIndex,
    isOpen,
    onOpenHelpSection,
    onOpenLayerEditor,
    onOpenSidebarPanel,
    onSelectLayer,
    onSelectPage,
    selectedLayerKey,
    setShowPresetsBrowser,
    showPresetsBrowser,
    tour,
  ])

  useEffect(() => {
    if (!currentStep || currentStep.advanceOn?.type !== "layerClick") return
    if (selectedLayerKey !== currentStep.advanceOn.layerKey) return

    const advanceState = layerAdvanceStateRef.current
    if (!advanceState || advanceState.stepId !== currentStep.id) return
    if (advanceState.initialSelection === selectedLayerKey) return

    setCurrentStepIndex((current) => {
      if (!tour) return current
      return Math.min(current + 1, tour.steps.length - 1)
    })
    layerAdvanceStateRef.current = null
    lastAppliedStepKeyRef.current = null
  }, [currentStep, selectedLayerKey, tour])

  const startTour = useCallback(() => {
    if (!tour) return
    const startIndex = resolveProjectTourStartIndex(tour)
    setCurrentStepIndex(startIndex)
    setIsOpen(true)
    lastAppliedStepKeyRef.current = null
    layerAdvanceStateRef.current = null
  }, [tour])

  const closeTour = useCallback(() => {
    setIsOpen(false)
    layerAdvanceStateRef.current = null
  }, [])

  const goToNextStep = useCallback(() => {
    if (!tour) return
    setCurrentStepIndex((current) => Math.min(current + 1, tour.steps.length - 1))
    lastAppliedStepKeyRef.current = null
    layerAdvanceStateRef.current = null
  }, [tour])

  const goToPreviousStep = useCallback(() => {
    if (!tour) return
    setCurrentStepIndex((current) => Math.max(current - 1, 0))
    lastAppliedStepKeyRef.current = null
    layerAdvanceStateRef.current = null
  }, [tour])

  return {
    tour,
    isOpen,
    currentStep,
    currentStepIndex,
    stepCount: tour?.steps.length ?? 0,
    canGoBack: currentStepIndex > 0,
    canGoNext: Boolean(tour) && currentStepIndex < (tour?.steps.length ?? 1) - 1,
    startTour,
    closeTour,
    goToNextStep,
    goToPreviousStep,
  }
}
