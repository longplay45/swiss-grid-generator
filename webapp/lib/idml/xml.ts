export function escapeIdmlXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;")
}

export function formatIdmlNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  const rounded = Math.round(value * 1000) / 1000
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "")
}

export function joinIdmlAttributes(
  attributes: Record<string, string | number | boolean | undefined | null>,
): string {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ` ${key}="${escapeIdmlXml(String(value))}"`)
    .join("")
}

export function renderIdmlElement(
  name: string,
  attributes: Record<string, string | number | boolean | undefined | null> = {},
  children: string | string[] = "",
): string {
  const resolvedChildren = Array.isArray(children) ? children.join("") : children
  const attrs = joinIdmlAttributes(attributes)
  if (!resolvedChildren) return `<${name}${attrs} />`
  return `<${name}${attrs}>${resolvedChildren}</${name}>`
}
