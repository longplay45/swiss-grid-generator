"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type Props = {
  isOpen: boolean
  onClose: () => void
  isDarkUi: boolean
  title: string
  onTitleChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  author: string
  onAuthorChange: (value: string) => void
  onConfirm: () => void
}

export function SaveLibraryDialog({
  isOpen,
  onClose,
  isDarkUi,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  author,
  onAuthorChange,
  onConfirm,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`${isDarkUi ? "dark" : ""} w-full max-w-md rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xl space-y-4`}>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Save to Library</h3>
          <p className="text-xs text-muted-foreground">
            Stores the current project in the local `Users` library.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Project Title</Label>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Project title"
          />
        </div>
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-20"
            placeholder="Short description"
          />
        </div>
        <div className="space-y-2">
          <Label>Author (optional)</Label>
          <input
            type="text"
            value={author}
            onChange={(event) => onAuthorChange(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Author name"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Save to Library
          </Button>
        </div>
      </div>
    </div>
  )
}
