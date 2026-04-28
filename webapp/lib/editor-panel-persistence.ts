export const EDITOR_PANEL_PERSISTENCE_RESET_EVENT = "swiss-grid-generator:editor-panel-persistence-reset"

export const TEXT_EDITOR_SECTIONS_STORAGE_KEY = "swiss-grid-generator:text-editor-sections"
export const TEXT_EDITOR_SCROLL_STORAGE_KEY = "swiss-grid-generator:text-editor-scroll-top"
export const IMAGE_EDITOR_SECTIONS_STORAGE_KEY = "swiss-grid-generator:image-editor-sections"
export const IMAGE_EDITOR_SCROLL_STORAGE_KEY = "swiss-grid-generator:image-editor-scroll-top"

const EDITOR_PANEL_STORAGE_KEYS = [
  TEXT_EDITOR_SECTIONS_STORAGE_KEY,
  TEXT_EDITOR_SCROLL_STORAGE_KEY,
  IMAGE_EDITOR_SECTIONS_STORAGE_KEY,
  IMAGE_EDITOR_SCROLL_STORAGE_KEY,
]

export function resetEditorPanelPersistence(): void {
  if (typeof window === "undefined") return

  for (const key of EDITOR_PANEL_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Editor panel persistence is a convenience; document loading must not depend on storage.
    }
  }

  window.dispatchEvent(new Event(EDITOR_PANEL_PERSISTENCE_RESET_EVENT))
}
