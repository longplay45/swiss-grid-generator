import type { PreviewCanvasInteractionArgs } from "@/hooks/preview-canvas-interaction-types"
import { usePreviewImagePlaceholderInteractions } from "@/hooks/usePreviewImagePlaceholderInteractions"
import { usePreviewPointerSelectionRouting } from "@/hooks/usePreviewPointerSelectionRouting"
import { usePreviewTextLayerInteractions } from "@/hooks/usePreviewTextLayerInteractions"

export function usePreviewCanvasInteractions<Key extends string, StyleKey extends string>({
  ...args
}: PreviewCanvasInteractionArgs<Key, StyleKey>) {
  const {
    handleTextDrop,
    openTextEditorFromCanvas,
  } = usePreviewTextLayerInteractions(args)

  const {
    handleImageDrop,
    handleImageDoubleClick,
  } = usePreviewImagePlaceholderInteractions(args)

  return usePreviewPointerSelectionRouting({
    ...args,
    handleTextDrop,
    handleImageDrop,
    openTextEditorFromCanvas,
    handleImageDoubleClick,
  })
}
