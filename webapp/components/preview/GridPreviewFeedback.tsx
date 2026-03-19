"use client"

import { Button } from "@/components/ui/button"

type PendingReflowState = {
  movedCount: number
}

type ReflowToastState = {
  movedCount: number
}

type Props = {
  pendingReflow: PendingReflowState | null
  reflowToast: ReflowToastState | null
  cancelPendingReflow: () => void
  applyPendingReflow: () => void
  performUndo: () => void
  dismissReflowToast: () => void
}

export function GridPreviewFeedback({
  pendingReflow,
  reflowToast,
  cancelPendingReflow,
  applyPendingReflow,
  performUndo,
  dismissReflowToast,
}: Props) {
  return (
    <>
      {pendingReflow ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-md border border-gray-300 bg-white p-4 shadow-xl">
            <div className="text-sm font-semibold text-gray-900">Rearrange Layout?</div>
            <div className="mt-2 text-xs text-gray-600">
              This grid change will rearrange {pendingReflow.movedCount} block{pendingReflow.movedCount === 1 ? "" : "s"}.
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={cancelPendingReflow}>Cancel</Button>
              <Button size="sm" onClick={applyPendingReflow}>Apply</Button>
            </div>
          </div>
        </div>
      ) : null}

      {reflowToast ? (
        <div className="absolute bottom-3 right-3 z-30 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-lg">
          <div className="text-xs text-gray-700">Layout rearranged.</div>
          <div className="mt-1 flex items-center justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                performUndo()
                dismissReflowToast()
              }}
            >
              Undo
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}
