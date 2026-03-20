import { useMemo } from "react"
import type { MutableRefObject } from "react"

import type { BlockEditorState } from "@/components/editor/block-editor-types"
import type { BlockRect, TextDrawCommand } from "@/lib/typography-layout-plan"

type InlineEditorPlan<Key extends string> = {
  key: Key
  rect: BlockRect
  blockRotation: number
  rotationOriginX: number
  rotationOriginY: number
  textAlign: "left" | "center" | "right"
  commands: TextDrawCommand[]
}

type Args<StyleKey extends string, Key extends string> = {
  editorState: BlockEditorState<StyleKey> | null
  blockRectsRef: MutableRefObject<Record<Key, BlockRect>>
  previousPlansRef: MutableRefObject<Map<Key, InlineEditorPlan<Key>>>
  gridUnit: number
  scale: number
}

export function usePreviewInlineEditorLayout<StyleKey extends string, Key extends string>({
  editorState,
  blockRectsRef,
  previousPlansRef,
  gridUnit,
  scale,
}: Args<StyleKey, Key>) {
  return useMemo(() => {
    if (!editorState) return null
    const rect = blockRectsRef.current[editorState.target as Key]
    if (!rect) return null
    const plan = previousPlansRef.current.get(editorState.target as Key)
    const textAscent = plan?.commands[0]
      ? Math.max(0, plan.commands[0].y - ((plan.rotationOriginY ?? rect.y) + gridUnit * scale))
      : gridUnit * scale

    return {
      rect,
      blockRotation: plan?.blockRotation ?? editorState.draftRotation,
      rotationOriginX: plan?.rotationOriginX ?? rect.x,
      rotationOriginY: plan?.rotationOriginY ?? rect.y,
      textAscent,
      textAlign: plan?.textAlign ?? editorState.draftAlign,
      commands: plan?.commands ?? [],
    }
  }, [blockRectsRef, editorState, gridUnit, previousPlansRef, scale])
}
