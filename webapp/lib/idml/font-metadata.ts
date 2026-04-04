import {
  getFontAssetPath,
  resolveFontVariant,
  type FontFamily,
} from "@/lib/config/fonts"
import type { IdmlFontMetadata } from "@/lib/idml/types"

type ParsedFontMetadata = Partial<IdmlFontMetadata>

const fontMetadataCache = new Map<string, Promise<IdmlFontMetadata>>()

function sanitizePostScriptToken(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "")
}

function decodeUtf16Be(buffer: ArrayBuffer, offset: number, length: number): string {
  let output = ""
  const view = new DataView(buffer, offset, length)
  for (let index = 0; index < length; index += 2) {
    output += String.fromCharCode(view.getUint16(index, false))
  }
  return output
}

function decodeMacRoman(buffer: ArrayBuffer, offset: number, length: number): string {
  const bytes = new Uint8Array(buffer, offset, length)
  return Array.from(bytes, (value) => String.fromCharCode(value)).join("")
}

function readTag(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  )
}

function findTable(view: DataView, tag: string): { offset: number; length: number } | null {
  const numTables = view.getUint16(4, false)
  for (let index = 0; index < numTables; index += 1) {
    const recordOffset = 12 + index * 16
    if (readTag(view, recordOffset) !== tag) continue
    return {
      offset: view.getUint32(recordOffset + 8, false),
      length: view.getUint32(recordOffset + 12, false),
    }
  }
  return null
}

function choosePreferredName(candidates: Array<{
  value: string
  platformId: number
  languageId: number
}>): string | null {
  if (!candidates.length) return null
  const preferred = [...candidates].sort((left, right) => {
    const leftPlatform = left.platformId === 3 ? 0 : left.platformId === 0 ? 1 : 2
    const rightPlatform = right.platformId === 3 ? 0 : right.platformId === 0 ? 1 : 2
    if (leftPlatform !== rightPlatform) return leftPlatform - rightPlatform
    const leftLanguage = left.languageId === 0x0409 ? 0 : 1
    const rightLanguage = right.languageId === 0x0409 ? 0 : 1
    return leftLanguage - rightLanguage
  })
  return preferred[0]?.value ?? null
}

function parseFontMetadata(buffer: ArrayBuffer): ParsedFontMetadata {
  const view = new DataView(buffer)
  const parsed: ParsedFontMetadata = {}

  const nameTable = findTable(view, "name")
  if (nameTable) {
    const tableOffset = nameTable.offset
    const nameCount = view.getUint16(tableOffset + 2, false)
    const storageOffset = tableOffset + view.getUint16(tableOffset + 4, false)
    const byNameId = new Map<number, Array<{ value: string; platformId: number; languageId: number }>>()

    for (let index = 0; index < nameCount; index += 1) {
      const recordOffset = tableOffset + 6 + index * 12
      const platformId = view.getUint16(recordOffset, false)
      const encodingId = view.getUint16(recordOffset + 2, false)
      const languageId = view.getUint16(recordOffset + 4, false)
      const nameId = view.getUint16(recordOffset + 6, false)
      const byteLength = view.getUint16(recordOffset + 8, false)
      const stringOffset = storageOffset + view.getUint16(recordOffset + 10, false)
      if (byteLength <= 0 || stringOffset + byteLength > buffer.byteLength) continue

      let value = ""
      if (platformId === 3 || platformId === 0 || encodingId === 1 || encodingId === 10) {
        value = decodeUtf16Be(buffer, stringOffset, byteLength)
      } else {
        value = decodeMacRoman(buffer, stringOffset, byteLength)
      }

      const trimmed = value.replace(/\u0000/g, "").trim()
      if (!trimmed) continue
      const entries = byNameId.get(nameId) ?? []
      entries.push({ value: trimmed, platformId, languageId })
      byNameId.set(nameId, entries)
    }

    parsed.family = choosePreferredName([
      ...(byNameId.get(16) ?? []),
      ...(byNameId.get(1) ?? []),
    ]) ?? undefined
    parsed.styleName = choosePreferredName([
      ...(byNameId.get(17) ?? []),
      ...(byNameId.get(2) ?? []),
    ]) ?? undefined
    parsed.fullName = choosePreferredName(byNameId.get(4) ?? []) ?? undefined
    parsed.postScriptName = choosePreferredName(byNameId.get(6) ?? []) ?? undefined
  }

  const os2Table = findTable(view, "OS/2")
  if (os2Table && os2Table.offset + 64 <= buffer.byteLength) {
    parsed.weight = view.getUint16(os2Table.offset + 4, false)
    parsed.italic = (view.getUint16(os2Table.offset + 62, false) & 0x01) !== 0
  }

  const scalerTag = readTag(view, 0)
  parsed.fontType = scalerTag === "OTTO" ? "OpenTypeCFF" : "OpenTypeTT"

  return parsed
}

function buildFallbackMetadata(fontFamily: FontFamily, weight: number, italic: boolean): IdmlFontMetadata {
  const resolvedVariant = resolveFontVariant(fontFamily, weight, italic)
  const styleName = resolvedVariant.label
  const familyToken = sanitizePostScriptToken(fontFamily)
  const styleToken = sanitizePostScriptToken(styleName) || "Regular"
  return {
    family: fontFamily,
    styleName,
    fullName: `${fontFamily} ${styleName}`.trim(),
    postScriptName: `${familyToken}-${styleToken}`,
    weight: resolvedVariant.weight,
    italic: resolvedVariant.italic,
    fontType: "OpenTypeTT",
  }
}

export async function resolveIdmlFontMetadata(
  fontFamily: FontFamily,
  weight: number,
  italic: boolean,
): Promise<IdmlFontMetadata> {
  const resolvedVariant = resolveFontVariant(fontFamily, weight, italic)
  const cacheKey = `${fontFamily}:${resolvedVariant.weight}:${resolvedVariant.italic ? "italic" : "normal"}`
  const cached = fontMetadataCache.get(cacheKey)
  if (cached) return cached

  const task = (async () => {
    const fallback = buildFallbackMetadata(fontFamily, resolvedVariant.weight, resolvedVariant.italic)

    try {
      const response = await fetch(getFontAssetPath(fontFamily, resolvedVariant.weight, resolvedVariant.italic))
      if (!response.ok) return fallback
      const buffer = await response.arrayBuffer()
      const parsed = parseFontMetadata(buffer)
      const family = parsed.family?.trim() || fallback.family
      const styleName = parsed.styleName?.trim() || fallback.styleName
      const fullName = parsed.fullName?.trim() || `${family} ${styleName}`.trim()
      const postScriptName = parsed.postScriptName?.trim()
        || `${sanitizePostScriptToken(family)}-${sanitizePostScriptToken(styleName) || "Regular"}`

      return {
        family,
        styleName,
        fullName,
        postScriptName,
        weight: typeof parsed.weight === "number" && Number.isFinite(parsed.weight) ? parsed.weight : fallback.weight,
        italic: typeof parsed.italic === "boolean" ? parsed.italic : fallback.italic,
        fontType: parsed.fontType?.trim() || fallback.fontType,
      }
    } catch {
      return fallback
    }
  })()

  fontMetadataCache.set(cacheKey, task)
  return task
}
