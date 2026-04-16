import { Button } from "@/components/ui/button"

type Props = {
  isOpen: boolean
  isDarkUi: boolean
  title: string
  message: string
  onClose: () => void
}

export function NoticeDialog({
  isOpen,
  isDarkUi,
  title,
  message,
  onClose,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-dialog-title"
        aria-describedby="notice-dialog-message"
        className={`${isDarkUi ? "dark" : ""} w-full max-w-sm rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xl`}
      >
        <h3 id="notice-dialog-title" className="text-base font-semibold text-card-foreground">
          {title}
        </h3>
        <p id="notice-dialog-message" className="mt-2 text-sm text-muted-foreground">
          {message}
        </p>
        <div className="mt-4 flex items-center justify-end">
          <Button size="sm" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  )
}
