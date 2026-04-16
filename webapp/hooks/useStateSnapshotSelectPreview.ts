"use client"

import { useCallback, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"

type SelectPreviewItemHandlers = {
  onFocus: () => void
  onPointerMove: () => void
}

type Args<State, Value> = {
  state: State
  setState: Dispatch<SetStateAction<State>>
  applyValue: (value: Value, state: State) => State
}

export function useStateSnapshotSelectPreview<State, Value>({
  state,
  setState,
  applyValue,
}: Args<State, Value>) {
  const snapshotRef = useRef(state)
  const hasPreviewValueRef = useRef(false)
  const previewValueRef = useRef<Value | null>(null)

  const restoreSnapshot = useCallback(() => {
    hasPreviewValueRef.current = false
    previewValueRef.current = null
    setState(snapshotRef.current)
  }, [setState])

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      snapshotRef.current = state
      hasPreviewValueRef.current = false
      previewValueRef.current = null
      return
    }
    restoreSnapshot()
  }, [restoreSnapshot, state])

  const handleValueChange = useCallback((value: Value) => {
    hasPreviewValueRef.current = false
    previewValueRef.current = value
    setState((current) => {
      const next = applyValue(value, current)
      snapshotRef.current = next
      return next
    })
  }, [applyValue, setState])

  const previewValue = useCallback((value: Value) => {
    if (hasPreviewValueRef.current && Object.is(previewValueRef.current, value)) return
    hasPreviewValueRef.current = true
    previewValueRef.current = value
    setState((current) => applyValue(value, current))
  }, [applyValue, setState])

  const getItemPreviewProps = useCallback((value: Value): SelectPreviewItemHandlers => ({
    onFocus: () => previewValue(value),
    onPointerMove: () => previewValue(value),
  }), [previewValue])

  return {
    handleOpenChange,
    handleValueChange,
    handleContentPointerLeave: restoreSnapshot,
    getItemPreviewProps,
  }
}
