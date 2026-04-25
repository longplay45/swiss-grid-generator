import { useCallback, useEffect, useRef, useState } from "react"

import { usePreviewCommands } from "@/hooks/usePreviewCommands"
import { getPreviewLayoutSeed } from "@/lib/document-session"
import { PREVIEW_LAYER_SELECTION_GRACE_MS } from "@/lib/preview-interaction-constants"
import { removeLayerFromPreviewLayout } from "@/lib/preview-layer-state"
import { omitOptionalRecordKey } from "@/lib/record-helpers"
import type { PreviewLayoutState } from "@/lib/types/preview-layout"

type Args<StyleKey extends string, Family extends string> = {
  activeSidebarPanel: string | null
  defaultLayout: PreviewLayoutState<StyleKey, Family, string> | null
}

export function usePreviewDocumentState<StyleKey extends string, Family extends string>({
  activeSidebarPanel,
  defaultLayout,
}: Args<StyleKey, Family>) {
  const [previewLayout, setPreviewLayout] = useState<PreviewLayoutState<StyleKey, Family, string> | null>(defaultLayout)
  const {
    loadedLayoutState: loadedPreviewLayout,
    layerOrderRequest: requestedLayerOrderState,
    layerDeleteRequest: requestedLayerDeleteState,
    layerEditorRequest: requestedLayerEditorState,
    layerLockRequest: requestedLayerLockState,
    requestLayerOrder,
    requestLayerDelete,
    requestLayerEditor,
    requestLayerLock,
    loadLayout: loadPreviewLayout,
    clearLayerRequests,
  } = usePreviewCommands<PreviewLayoutState<StyleKey, Family, string>>({
    defaultLayout,
  })
  const [selectedLayerKey, setSelectedLayerKey] = useState<string | null>(null)
  const selectedLayerGraceRef = useRef<{ key: string | null; until: number }>({ key: null, until: 0 })
  const [canUndoPreview, setCanUndoPreview] = useState(false)
  const [previewUndoNonce, setPreviewUndoNonce] = useState(0)
  const [previewRedoNonce, setPreviewRedoNonce] = useState(0)
  const [documentHistoryResetNonce, setDocumentHistoryResetNonce] = useState(0)

  useEffect(() => {
    if (!selectedLayerKey || !previewLayout) return
    const validKeys = new Set<string>([
      ...previewLayout.blockOrder,
      ...(previewLayout.imageOrder ?? []),
    ])
    if (!validKeys.has(selectedLayerKey)) {
      const grace = selectedLayerGraceRef.current
      if (grace.key === selectedLayerKey && grace.until > Date.now()) {
        return
      }
      setSelectedLayerKey(null)
    }
  }, [previewLayout, selectedLayerKey])

  const setSelectedLayerKeyWithGrace = useCallback((key: string | null) => {
    if (key) {
      selectedLayerGraceRef.current = {
        key,
        until: Date.now() + PREVIEW_LAYER_SELECTION_GRACE_MS,
      }
    } else {
      selectedLayerGraceRef.current = { key: null, until: 0 }
    }
    setSelectedLayerKey(key)
  }, [])

  const requestPreviewUndo = useCallback(() => {
    setPreviewUndoNonce((nonce) => nonce + 1)
  }, [])

  const requestPreviewRedo = useCallback(() => {
    setPreviewRedoNonce((nonce) => nonce + 1)
  }, [])

  const handlePreviewHistoryAvailabilityChange = useCallback((undoAvailable: boolean) => {
    setCanUndoPreview(undoAvailable)
  }, [])

  const applyLoadedPreviewLayout = useCallback((layout: PreviewLayoutState<StyleKey, Family, string> | null) => {
    setPreviewLayout(layout)
    loadPreviewLayout(layout)
    clearLayerRequests()
    setSelectedLayerKey(null)
    setDocumentHistoryResetNonce((nonce) => nonce + 1)
    setCanUndoPreview(false)
  }, [clearLayerRequests, loadPreviewLayout])

  const handleLayerOrderChange = useCallback((nextLayerOrder: string[]) => {
    setPreviewLayout((current) => ({
      ...getPreviewLayoutSeed(current, defaultLayout),
      layerOrder: [...nextLayerOrder],
    }))
    requestLayerOrder(nextLayerOrder)
  }, [defaultLayout, requestLayerOrder])

  const handleDeleteLayer = useCallback((target: string, kind: "text" | "image") => {
    setPreviewLayout((current) => {
      if (!current) return current
      return removeLayerFromPreviewLayout(current, target, kind)
    })
    requestLayerDelete(target)
    setSelectedLayerKey((current) => (current === target ? null : current))
  }, [requestLayerDelete])

  const handlePreviewLayoutChange = useCallback((layout: PreviewLayoutState<StyleKey, Family, string>) => {
    setPreviewLayout(layout)
    clearLayerRequests()
  }, [clearLayerRequests])

  const handlePreviewLayerSelect = useCallback((key: string | null) => {
    if (activeSidebarPanel !== "layers") return
    setSelectedLayerKeyWithGrace(key)
  }, [activeSidebarPanel, setSelectedLayerKeyWithGrace])

  const handleToggleLayerEditor = useCallback((target: string) => {
    requestLayerEditor(target)
    setSelectedLayerKeyWithGrace(target)
  }, [requestLayerEditor, setSelectedLayerKeyWithGrace])

  const handleLayerLockBatchChange = useCallback((targets: string[], locked: boolean) => {
    const nextTargets = [...new Set(targets)]
    if (nextTargets.length === 0) return

    setPreviewLayout((current) => {
      const seeded = getPreviewLayoutSeed(current, defaultLayout)
      const nextLockedLayers = locked
        ? nextTargets.reduce((acc, key) => {
            acc[key] = true
            return acc
          }, { ...(seeded.lockedLayers ?? {}) } as Partial<Record<string, boolean>>)
        : nextTargets.reduce((acc, key) => omitOptionalRecordKey(acc, key), seeded.lockedLayers ?? {})

      return {
        ...seeded,
        lockedLayers: nextLockedLayers,
      }
    })
    requestLayerLock(nextTargets, locked)
  }, [defaultLayout, requestLayerLock])

  const handleLayerLockChange = useCallback((target: string, locked: boolean) => {
    handleLayerLockBatchChange([target], locked)
  }, [handleLayerLockBatchChange])

  return {
    previewLayout,
    setPreviewLayout,
    loadedPreviewLayout,
    requestedLayerOrderState,
    requestedLayerDeleteState,
    requestedLayerEditorState,
    requestedLayerLockState,
    selectedLayerKey,
    setSelectedLayerKeyWithGrace,
    canUndoPreview,
    previewUndoNonce,
    previewRedoNonce,
    documentHistoryResetNonce,
    requestPreviewUndo,
    requestPreviewRedo,
    handlePreviewHistoryAvailabilityChange,
    applyLoadedPreviewLayout,
    handleLayerOrderChange,
    handleDeleteLayer,
    handlePreviewLayoutChange,
    handlePreviewLayerSelect,
    handleToggleLayerEditor,
    handleLayerLockChange,
    handleLayerLockBatchChange,
  }
}
