import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type Props = {
  isOpen: boolean
  onClose: () => void
  filename: string
  onFilenameChange: (value: string) => void
  onConfirm: () => void
  defaultFilename: string
  ratioLabel: string
  orientation: string
  rotation: number
}

export function SaveJsonDialog({
  isOpen,
  onClose,
  filename,
  onFilenameChange,
  onConfirm,
  defaultFilename,
  ratioLabel,
  orientation,
  rotation,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-4 shadow-xl space-y-4">
        <h3 className="text-base font-semibold">Save JSON</h3>
        <p className="text-xs text-gray-600">
          Ratio: {ratioLabel} | Orientation: {orientation} | Rotation: {rotation}°
        </p>
        <div className="space-y-2">
          <Label>Filename</Label>
          <input
            type="text"
            value={filename}
            onChange={(event) => onFilenameChange(event.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            placeholder={defaultFilename}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Save JSON
          </Button>
        </div>
      </div>
    </div>
  )
}
