export function normalizeInlineEditorText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, "")
}
