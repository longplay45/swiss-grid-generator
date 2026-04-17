"use client"

import { useCallback, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"

type SelectPreviewItemHandlers = {
  onFocus: () => void
  onMouseEnter: () => void
  onMouseMove: () => void
  onPointerEnter: () => void
  onPointerMove: () => void
}

type Args<State, Value> = {
  state: State
  setState: Dispatch<SetStateAction<State>>
  applyValue: (value: Value, state: State) => State
  committedValue: Value
}

export function useStateSnapshotSelectPreview<State, Value>({
  state,
  setState,
  applyValue,
  committedValue,
}: Args<State, Value>) {
  const committedStateRef = useRef(state)
  const snapshotRef = useRef(state)
  const committedValueRef = useRef(committedValue)
  const hasPreviewValueRef = useRef(false)
  const previewValueRef = useRef<Value | null>(null)
  const isOpenRef = useRef(false)

  committedStateRef.current = state
  if (!isOpenRef.current) {
    committedValueRef.current = committedValue
  }

  const restoreSnapshot = useCallback(() => {
    isOpenRef.current = false
    hasPreviewValueRef.current = false
    previewValueRef.current = null
    setState(snapshotRef.current)
  }, [setState])

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      isOpenRef.current = true
      snapshotRef.current = committedStateRef.current
      committedValueRef.current = committedValue
      hasPreviewValueRef.current = false
      previewValueRef.current = null
      return
    }
    restoreSnapshot()
  }, [committedValue, restoreSnapshot])

  const handleValueChange = useCallback((value: Value) => {
    const nextState = applyValue(
      value,
      isOpenRef.current ? snapshotRef.current : committedStateRef.current,
    )
    isOpenRef.current = false
    hasPreviewValueRef.current = false
    previewValueRef.current = value
    committedStateRef.current = nextState
    snapshotRef.current = nextState
    committedValueRef.current = value
    setState(nextState)
  }, [applyValue, setState])

  const previewValue = useCallback((value: Value) => {
    if (hasPreviewValueRef.current && Object.is(previewValueRef.current, value)) return
    const nextState = applyValue(value, snapshotRef.current)
    hasPreviewValueRef.current = true
    previewValueRef.current = value
    setState(nextState)
  }, [applyValue, setState])

  const getItemPreviewProps = useCallback((value: Value): SelectPreviewItemHandlers => ({
    onFocus: () => previewValue(value),
    onMouseEnter: () => previewValue(value),
    onMouseMove: () => previewValue(value),
    onPointerEnter: () => previewValue(value),
    onPointerMove: () => previewValue(value),
  }), [previewValue])

  return {
    value: isOpenRef.current ? committedValueRef.current : committedValue,
    handleOpenChange,
    handleValueChange,
    handleContentPointerLeave: restoreSnapshot,
    getItemPreviewProps,
  }
}
