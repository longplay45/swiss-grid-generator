"use client"

import { useCallback, useRef } from "react"

type SelectPreviewItemHandlers = {
  onFocus: () => void
  onMouseEnter: () => void
  onMouseMove: () => void
  onPointerEnter: () => void
  onPointerMove: () => void
}

type Args<T> = {
  value: T
  onCommitValue: (value: T) => void
  onPreviewValue: (value: T) => void
  onPreviewClear?: () => void
}

export function useSelectRolloverPreview<T>({
  value,
  onCommitValue,
  onPreviewValue,
  onPreviewClear,
}: Args<T>) {
  const committedValueRef = useRef(value)
  const hasPreviewValueRef = useRef(false)
  const previewValueRef = useRef<T>(value)

  committedValueRef.current = value

  const clearPreview = useCallback(() => {
    hasPreviewValueRef.current = false
    if (onPreviewClear) {
      onPreviewClear()
      return
    }
    onPreviewValue(committedValueRef.current)
  }, [onPreviewClear, onPreviewValue])

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      committedValueRef.current = value
      hasPreviewValueRef.current = false
      previewValueRef.current = value
      return
    }
    clearPreview()
  }, [clearPreview, value])

  const handleValueChange = useCallback((nextValue: T) => {
    committedValueRef.current = nextValue
    hasPreviewValueRef.current = false
    previewValueRef.current = nextValue
    onCommitValue(nextValue)
    if (onPreviewClear) onPreviewClear()
  }, [onCommitValue, onPreviewClear])

  const previewValue = useCallback((nextValue: T) => {
    if (hasPreviewValueRef.current && Object.is(previewValueRef.current, nextValue)) return
    hasPreviewValueRef.current = true
    previewValueRef.current = nextValue
    onPreviewValue(nextValue)
  }, [onPreviewValue])

  const getItemPreviewProps = useCallback((nextValue: T): SelectPreviewItemHandlers => ({
    onFocus: () => previewValue(nextValue),
    onMouseEnter: () => previewValue(nextValue),
    onMouseMove: () => previewValue(nextValue),
    onPointerEnter: () => previewValue(nextValue),
    onPointerMove: () => previewValue(nextValue),
  }), [previewValue])

  return {
    handleOpenChange,
    handleValueChange,
    handleContentPointerLeave: clearPreview,
    getItemPreviewProps,
  }
}
