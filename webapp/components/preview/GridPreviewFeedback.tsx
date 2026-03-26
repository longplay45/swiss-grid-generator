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
  isDarkMode?: boolean
}

export function GridPreviewFeedback({
  pendingReflow,
  reflowToast,
  cancelPendingReflow,
  applyPendingReflow,
  performUndo,
  dismissReflowToast,
  isDarkMode = false,
}: Props) {
  return (
    <>
      {pendingReflow ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className={`w-full max-w-sm rounded-md border p-4 shadow-xl ${isDarkMode ? "dark border-gray-700 bg-gray-900 text-gray-100" : "border-gray-300 bg-white text-gray-900"}`}>
            <div className="text-sm font-semibold">Rearrange Layout?</div>
            <div className={`mt-2 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
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
        <div className={`absolute bottom-3 right-3 z-30 rounded-md border px-3 py-2 shadow-lg ${isDarkMode ? "dark border-gray-700 bg-gray-900 text-gray-200" : "border-gray-300 bg-white text-gray-700"}`}>
          <div className="text-xs">Layout rearranged.</div>
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
