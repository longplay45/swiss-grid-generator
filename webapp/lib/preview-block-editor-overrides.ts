import type { BlockEditorState } from "@/components/editor/block-editor-types"
import { clampFxLeading, clampFxSize } from "@/lib/block-constraints"
import { isImagePlaceholderColor } from "@/lib/config/color-schemes"
import { omitOptionalRecordKey } from "@/lib/record-helpers"

export function applyEditorDraftSizeOverride<
  Key extends string,
  StyleKey extends string,
>(
  current: Partial<Record<Key, number>>,
  draft: BlockEditorState<StyleKey>,
  fxStyle: StyleKey,
): Partial<Record<Key, number>> {
  const next = { ...current }
  if (draft.draftStyle === fxStyle) {
    next[draft.target as Key] = clampFxSize(draft.draftFxSize)
  } else {
    delete next[draft.target as Key]
  }
  return next
}

export function applyEditorDraftLeadingOverride<
  Key extends string,
  StyleKey extends string,
>(
  current: Partial<Record<Key, number>>,
  draft: BlockEditorState<StyleKey>,
  fxStyle: StyleKey,
): Partial<Record<Key, number>> {
  const next = { ...current }
  if (draft.draftStyle === fxStyle) {
    next[draft.target as Key] = clampFxLeading(draft.draftFxLeading)
  } else {
    delete next[draft.target as Key]
  }
  return next
}

export function applyEditorDraftTextColorOverride<
  Key extends string,
  StyleKey extends string,
>(
  current: Partial<Record<Key, string>>,
  draft: BlockEditorState<StyleKey>,
  defaultTextColor: string,
): Partial<Record<Key, string>> {
  const next = { ...current }
  if (draft.draftColor.toLowerCase() === defaultTextColor.toLowerCase()) {
    delete next[draft.target as Key]
  } else if (isImagePlaceholderColor(draft.draftColor)) {
    next[draft.target as Key] = draft.draftColor
  } else {
    delete next[draft.target as Key]
  }
  return next
}

export function removeEditorOverrideKey<Key extends string, Value>(
  current: Partial<Record<Key, Value>>,
  key: Key,
): Partial<Record<Key, Value>> {
  return omitOptionalRecordKey(current, key)
}
