import type jsPDF from "jspdf"
import {
  FONT_DEFINITIONS,
  getFontAssetPath,
  getFontVariants,
  resolveFontVariant,
  type FontFamily,
} from "@/lib/config/fonts"

type FontAsset = { vfsName: string; urls: string[] }
type FontAssetPair = { normal: FontAsset; italic?: FontAsset }

const fontBinaryCache = new Map<string, Promise<string>>()
const googleRepoSourceCache = new Map<string, Promise<{ regular: string; italic: string } | null>>()
const unavailableEmbeddedFamilies = new Set<FontFamily>()
const KNOWN_FONT_FAMILIES = new Set<FontFamily>(FONT_DEFINITIONS.map((entry) => entry.value))

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ""
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

async function fetchFontBase64(url: string): Promise<string> {
  const cached = fontBinaryCache.get(url)
  if (cached) return cached
  const task = (async () => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load font asset: ${url} (${response.status})`)
    }
    const buffer = await response.arrayBuffer()
    return arrayBufferToBase64(buffer)
  })()
  fontBinaryCache.set(url, task)
  return task
}

async function fetchFirstAvailableBase64(urls: string[]): Promise<string> {
  let lastError: unknown = null
  for (const url of urls) {
    try {
      return await fetchFontBase64(url)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error("No font source URL available")
}

type PdfWithRegistry = jsPDF & {
  __sggRegisteredFonts?: Set<string>
  getFont?: (fontName?: string, fontStyle?: string) => {
    fontName?: string
    metadata?: {
      postscriptName?: string
      name?: { postscriptName?: string }
    }
  } | undefined
}

function markFontRegistered(pdf: PdfWithRegistry, family: string): void {
  if (!pdf.__sggRegisteredFonts) pdf.__sggRegisteredFonts = new Set<string>()
  pdf.__sggRegisteredFonts.add(family)
}

function isFontRegistered(pdf: PdfWithRegistry, family: string): boolean {
  return pdf.__sggRegisteredFonts?.has(family) ?? false
}

function getFontSlug(fontFamily: FontFamily): string {
  return fontFamily.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getPdfEmbeddedFamilyName(fontFamily: FontFamily): string {
  return `Embedded_${getFontSlug(fontFamily)}`
}

function getPdfEmbeddedWeightFamilyName(fontFamily: FontFamily, weight: number): string {
  return `${getPdfEmbeddedFamilyName(fontFamily)}_${weight}`
}

function getPdfRegistrationKey(fontFamily: FontFamily): string {
  return `${getPdfEmbeddedFamilyName(fontFamily)}__all`
}

function applyPdfPostScriptFontName(
  pdf: PdfWithRegistry,
  pdfFamily: string,
  fontStyle: "normal" | "italic",
): void {
  const fontEntry = pdf.getFont?.(pdfFamily, fontStyle)
  if (!fontEntry) return
  const postScriptName = fontEntry?.metadata?.name?.postscriptName ?? fontEntry?.metadata?.postscriptName
  if (typeof postScriptName !== "string" || postScriptName.trim().length === 0) return
  fontEntry.fontName = postScriptName.trim()
}

async function discoverGoogleRepoVariableSources(fontFamily: FontFamily): Promise<{ regular: string; italic: string } | null> {
  const slug = getFontSlug(fontFamily)
  const cached = googleRepoSourceCache.get(slug)
  if (cached) return cached

  const task = (async () => {
    const baseName = fontFamily.replace(/[^A-Za-z0-9]/g, "")
    for (const bucket of ["ofl", "apache", "ufl"] as const) {
      const apiUrl = `https://api.github.com/repos/google/fonts/contents/${bucket}/${slug}`
      const response = await fetch(apiUrl).catch(() => null)
      if (!response) continue
      if (!response.ok) continue
      const listing = await response.json() as Array<{ type?: string; name?: string }>
      const ttfFiles = listing
        .filter((entry) => entry.type === "file" && typeof entry.name === "string" && entry.name.endsWith(".ttf"))
        .map((entry) => entry.name as string)
      const upright = ttfFiles.find((name) => name.startsWith(baseName) && !name.includes("-Italic"))
      if (!upright) continue
      const italic = ttfFiles.find((name) => name.startsWith(`${baseName}-Italic`)) ?? upright
      return {
        regular: `https://raw.githubusercontent.com/google/fonts/main/${bucket}/${slug}/${upright}`,
        italic: `https://raw.githubusercontent.com/google/fonts/main/${bucket}/${slug}/${italic}`,
      }
    }
    return null
  })()

  googleRepoSourceCache.set(slug, task)
  return task
}

function getLegacyFontAssetPath(fontFamily: FontFamily, weight: number, italic: boolean): string | null {
  const slug = getFontSlug(fontFamily)
  if (weight === 400 && !italic) return `/fonts/google/${slug}/regular.ttf`
  if (weight === 700 && !italic) return `/fonts/google/${slug}/bold.ttf`
  if (weight === 400 && italic) return `/fonts/google/${slug}/italic.ttf`
  if (weight === 700 && italic) return `/fonts/google/${slug}/bolditalic.ttf`
  return null
}

function buildFontAssetUrls(
  fontFamily: FontFamily,
  weight: number,
  italic: boolean,
  remote: { regular: string; italic: string } | null,
): string[] {
  const urls = [getFontAssetPath(fontFamily, weight, italic)]
  const legacy = getLegacyFontAssetPath(fontFamily, weight, italic)
  if (legacy && legacy !== urls[0]) urls.push(legacy)
  if (remote) urls.push(italic ? remote.italic : remote.regular)
  return urls
}

async function getGoogleVariableAssets(fontFamily: FontFamily): Promise<Map<number, FontAssetPair>> {
  const slug = getFontSlug(fontFamily)
  const remote = await discoverGoogleRepoVariableSources(fontFamily)
  return getFontVariants(fontFamily).reduce((acc, variant) => {
    const asset: FontAsset = {
      vfsName: `${slug}-${variant.weight}${variant.italic ? "italic" : ""}.ttf`,
      urls: buildFontAssetUrls(fontFamily, variant.weight, variant.italic, remote),
    }
    const existing = acc.get(variant.weight) ?? {
      normal: {
        vfsName: `${slug}-${variant.weight}.ttf`,
        urls: buildFontAssetUrls(fontFamily, variant.weight, false, remote),
      },
    }
    if (variant.italic) {
      acc.set(variant.weight, { ...existing, italic: asset })
    } else {
      acc.set(variant.weight, { ...existing, normal: asset })
    }
    return acc
  }, new Map<number, FontAssetPair>())
}

async function registerWithAssets(
  pdf: PdfWithRegistry,
  pdfFamily: string,
  assets: FontAssetPair,
): Promise<void> {
  if (isFontRegistered(pdf, pdfFamily)) return

  const addFileToVFS = pdf.addFileToVFS?.bind(pdf)
  const addFont = pdf.addFont?.bind(pdf)
  if (typeof addFileToVFS !== "function" || typeof addFont !== "function") {
    throw new Error("jsPDF font APIs are not available in this environment")
  }

  const [normal, italic] = await Promise.all([
    fetchFirstAvailableBase64(assets.normal.urls),
    fetchFirstAvailableBase64((assets.italic ?? assets.normal).urls),
  ])

  addFileToVFS(assets.normal.vfsName, normal)
  addFont(assets.normal.vfsName, pdfFamily, "normal")
  applyPdfPostScriptFontName(pdf, pdfFamily, "normal")
  if (assets.italic) {
    addFileToVFS(assets.italic.vfsName, italic)
    addFont(assets.italic.vfsName, pdfFamily, "italic")
    applyPdfPostScriptFontName(pdf, pdfFamily, "italic")
  } else {
    addFont(assets.normal.vfsName, pdfFamily, "italic")
    applyPdfPostScriptFontName(pdf, pdfFamily, "italic")
  }
  markFontRegistered(pdf, pdfFamily)
}

async function registerGoogleVariableFamily(pdf: PdfWithRegistry, fontFamily: FontFamily): Promise<void> {
  const registrationKey = getPdfRegistrationKey(fontFamily)
  if (isFontRegistered(pdf, registrationKey)) return
  const assetsByWeight = await getGoogleVariableAssets(fontFamily)
  await Promise.all(
    [...assetsByWeight.entries()].map(([weight, assets]) =>
      registerWithAssets(pdf, getPdfEmbeddedWeightFamilyName(fontFamily, weight), assets),
    ),
  )
  markFontRegistered(pdf, registrationKey)
}

export async function ensurePdfFontsRegistered(
  pdf: jsPDF,
  fontFamilies: Iterable<FontFamily>,
): Promise<void> {
  const unique = new Set(fontFamilies)
  for (const fontFamily of unique) {
    if (!KNOWN_FONT_FAMILIES.has(fontFamily)) continue
    if (unavailableEmbeddedFamilies.has(fontFamily)) continue
    try {
      await registerGoogleVariableFamily(pdf as PdfWithRegistry, fontFamily)
    } catch {
      unavailableEmbeddedFamilies.add(fontFamily)
    }
  }
}

export function resolvePdfFontFamily(fontFamily: FontFamily, weight: number): string | null {
  if (unavailableEmbeddedFamilies.has(fontFamily)) return null
  if (!KNOWN_FONT_FAMILIES.has(fontFamily)) return null
  const resolvedVariant = resolveFontVariant(fontFamily, weight, false)
  return getPdfEmbeddedWeightFamilyName(fontFamily, resolvedVariant.weight)
}
