import { useCallback, useEffect } from "react"
import type { Dispatch, MutableRefObject, SetStateAction } from "react"

import { removeTextLayerFromCollections, type TextLayerCollections } from "@/lib/preview-layer-state"
import { omitOptionalRecordKey } from "@/lib/record-helpers"

type Args<
  Key extends string,
  StyleKey extends string,
  Family extends string,
  Align extends string,
  TextPosition,
  ImagePosition,
  TextEditorState,
  ImageEditorState,
> = {
  imageOrder: readonly Key[]
  requestedLayerDeleteTarget: Key | null
  requestedLayerDeleteToken: number
  lastAppliedLayerDeleteRequestKeyRef: MutableRefObject<number>
  recordHistoryBeforeChange: () => void
  setImageOrder: Dispatch<SetStateAction<Key[]>>
  setImageModulePositions: Dispatch<SetStateAction<Partial<Record<Key, ImagePosition>>>>
  setImageColumnSpans: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  setImageRowSpans: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  setImageHeightBaselines: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  setImageColors: Dispatch<SetStateAction<Partial<Record<Key, string>>>>
  setLayerOrder: Dispatch<SetStateAction<Key[]>>
  setImageEditorState: Dispatch<SetStateAction<ImageEditorState | null>>
  setBlockCollections: (
    updater: (
      prev: TextLayerCollections<Key, StyleKey, Family, Align, TextPosition>,
    ) => TextLayerCollections<Key, StyleKey, Family, Align, TextPosition>,
  ) => void
  setBlockCustomSizes: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  setBlockCustomLeadings: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  setBlockTextColors: Dispatch<SetStateAction<Partial<Record<Key, string>>>>
  setLockedLayers: Dispatch<SetStateAction<Partial<Record<Key, boolean>>>>
  setEditorState: Dispatch<SetStateAction<TextEditorState | null>>
}

export function usePreviewLayerDelete<
  Key extends string,
  StyleKey extends string,
  Family extends string,
  Align extends string,
  TextPosition,
  ImagePosition,
  TextEditorState extends { target: Key },
  ImageEditorState extends { target: Key },
>({
  imageOrder,
  requestedLayerDeleteTarget,
  requestedLayerDeleteToken,
  lastAppliedLayerDeleteRequestKeyRef,
  recordHistoryBeforeChange,
  setImageOrder,
  setImageModulePositions,
  setImageColumnSpans,
  setImageRowSpans,
  setImageHeightBaselines,
  setImageColors,
  setLayerOrder,
  setImageEditorState,
  setBlockCollections,
  setBlockCustomSizes,
  setBlockCustomLeadings,
  setBlockTextColors,
  setLockedLayers,
  setEditorState,
}: Args<Key, StyleKey, Family, Align, TextPosition, ImagePosition, TextEditorState, ImageEditorState>) {
  const deleteLayerByKey = useCallback((key: Key) => {
    if (imageOrder.includes(key)) {
      setImageOrder((prev) => prev.filter((item) => item !== key))
      setImageModulePositions((prev) => omitOptionalRecordKey(prev, key))
      setImageColumnSpans((prev) => omitOptionalRecordKey(prev, key))
      setImageRowSpans((prev) => omitOptionalRecordKey(prev, key))
      setImageHeightBaselines((prev) => omitOptionalRecordKey(prev, key))
      setImageColors((prev) => omitOptionalRecordKey(prev, key))
      setLayerOrder((prev) => prev.filter((item) => item !== key))
      setLockedLayers((prev) => omitOptionalRecordKey(prev, key))
      setImageEditorState((prev) => (prev?.target === key ? null : prev))
      return
    }

    setBlockCollections((prev) => removeTextLayerFromCollections(prev, key))
    setBlockCustomSizes((prev) => omitOptionalRecordKey(prev, key))
    setBlockCustomLeadings((prev) => omitOptionalRecordKey(prev, key))
    setBlockTextColors((prev) => omitOptionalRecordKey(prev, key))
    setLayerOrder((prev) => prev.filter((item) => item !== key))
    setLockedLayers((prev) => omitOptionalRecordKey(prev, key))
    setEditorState((prev) => (prev?.target === key ? null : prev))
  }, [
    imageOrder,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockCustomSizes,
    setBlockTextColors,
    setEditorState,
    setImageColors,
    setImageColumnSpans,
    setImageEditorState,
    setImageHeightBaselines,
    setImageModulePositions,
    setImageOrder,
    setImageRowSpans,
    setLockedLayers,
    setLayerOrder,
  ])

  useEffect(() => {
    if (!requestedLayerDeleteTarget || requestedLayerDeleteToken === 0) return
    if (lastAppliedLayerDeleteRequestKeyRef.current === requestedLayerDeleteToken) return
    lastAppliedLayerDeleteRequestKeyRef.current = requestedLayerDeleteToken
    recordHistoryBeforeChange()
    deleteLayerByKey(requestedLayerDeleteTarget)
  }, [
    deleteLayerByKey,
    lastAppliedLayerDeleteRequestKeyRef,
    recordHistoryBeforeChange,
    requestedLayerDeleteTarget,
    requestedLayerDeleteToken,
  ])
}
