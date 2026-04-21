export function getTextLayerDisplayName(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) return "Empty"
  return normalized.length > 75 ? `${normalized.slice(0, 75)}...` : normalized
}
