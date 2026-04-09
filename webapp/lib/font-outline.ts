import { parse as parseOpenType, type OpenTypeFont, type OpenTypePathCommand } from "opentype.js"

import { getFontAssetPath, resolveFontVariant, type FontFamily } from "@/lib/config/fonts"

const outlineFontCache = new Map<string, Promise<OpenTypeFont | null>>()

export type { OpenTypeFont, OpenTypePathCommand }

export function getResolvedOutlineFontFace(fontFamily: FontFamily, fontWeight: number, italic: boolean) {
  const resolvedVariant = resolveFontVariant(fontFamily, fontWeight, italic)
  return {
    cacheKey: `${fontFamily}:${resolvedVariant.weight}:${resolvedVariant.italic ? "italic" : "normal"}`,
    assetPath: getFontAssetPath(fontFamily, resolvedVariant.weight, resolvedVariant.italic),
    fontFamily,
    fontWeight: resolvedVariant.weight,
    italic: resolvedVariant.italic,
  }
}

export async function loadOutlineFont(
  fontFamily: FontFamily,
  fontWeight: number,
  italic: boolean,
): Promise<OpenTypeFont | null> {
  const resolvedFace = getResolvedOutlineFontFace(fontFamily, fontWeight, italic)
  const cached = outlineFontCache.get(resolvedFace.cacheKey)
  if (cached) return cached

  const pending = (async () => {
    if (typeof fetch !== "function") return null

    try {
      const response = await fetch(resolvedFace.assetPath)
      if (!response.ok) return null
      const buffer = await response.arrayBuffer()
      return parseOpenType(buffer) as OpenTypeFont
    } catch {
      return null
    }
  })()

  outlineFontCache.set(resolvedFace.cacheKey, pending)
  return pending
}
