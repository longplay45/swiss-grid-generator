// NEW: Project/Pages/Layers architecture
export function toProjectFilenameStem(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""

  return trimmed
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .trim()
}

export function toProjectJsonFilename(projectTitle: string, fallbackStem: string): string {
  return `${toProjectFilenameStem(projectTitle) || fallbackStem}.json`
}
