const CARD_DRAG_IGNORE_SELECTOR = "[data-card-drag-ignore='true'], input, textarea, select, option, a, [contenteditable='true']"

type UserSelectStyleTarget = HTMLElement & {
  style: CSSStyleDeclaration & {
    webkitUserSelect?: string
  }
}

export function isCardDragIgnoreTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(CARD_DRAG_IGNORE_SELECTOR) !== null
}

export function clearWindowSelection(): void {
  if (typeof window === "undefined") return
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  selection.removeAllRanges()
}

export function lockDocumentUserSelect(): () => void {
  if (typeof document === "undefined") return () => {}

  const html = document.documentElement as UserSelectStyleTarget
  const body = document.body as UserSelectStyleTarget | null
  const previousHtmlUserSelect = html.style.userSelect
  const previousHtmlWebkitUserSelect = html.style.webkitUserSelect
  const previousBodyUserSelect = body?.style.userSelect ?? ""
  const previousBodyWebkitUserSelect = body?.style.webkitUserSelect ?? ""

  html.style.userSelect = "none"
  html.style.webkitUserSelect = "none"
  if (body) {
    body.style.userSelect = "none"
    body.style.webkitUserSelect = "none"
  }

  return () => {
    html.style.userSelect = previousHtmlUserSelect
    html.style.webkitUserSelect = previousHtmlWebkitUserSelect
    if (body) {
      body.style.userSelect = previousBodyUserSelect
      body.style.webkitUserSelect = previousBodyWebkitUserSelect
    }
  }
}
