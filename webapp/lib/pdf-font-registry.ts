import type jsPDF from "jspdf"
import { FONT_DEFINITIONS, type FontFamily } from "@/lib/config/fonts"

type PdfFontStyle = "normal" | "bold" | "italic" | "bolditalic"
type FontAsset = { vfsName: string; urls: string[] }

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

async function discoverGoogleRepoVariableSources(fontFamily: FontFamily): Promise<{ regular: string; italic: string } | null> {
  const slug = getFontSlug(fontFamily)
  const cached = googleRepoSourceCache.get(slug)
  if (cached) return cached

  const task = (async () => {
    const baseName = fontFamily.replace(/[^A-Za-z0-9]/g, "")
    for (const bucket of ["ofl", "apache", "ufl"] as const) {
      const apiUrl = `https://api.github.com/repos/google/fonts/contents/${bucket}/${slug}`
      const response = await fetch(apiUrl)
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

async function getGoogleVariableAssets(fontFamily: FontFamily): Promise<Record<PdfFontStyle, FontAsset>> {
  const slug = getFontSlug(fontFamily)
  const localRegularUrl = `/fonts/google/${slug}/regular.ttf`
  const localBoldUrl = `/fonts/google/${slug}/bold.ttf`
  const localItalicUrl = `/fonts/google/${slug}/italic.ttf`
  const localBoldItalicUrl = `/fonts/google/${slug}/bolditalic.ttf`
  const remote = await discoverGoogleRepoVariableSources(fontFamily)
  const regularUrls = remote ? [localRegularUrl, remote.regular] : [localRegularUrl]
  const boldUrls = remote ? [localBoldUrl, remote.regular] : [localBoldUrl]
  const italicUrls = remote ? [localItalicUrl, remote.italic] : [localItalicUrl]
  const boldItalicUrls = remote ? [localBoldItalicUrl, remote.italic] : [localBoldItalicUrl]
  return {
    normal: {
      vfsName: `${slug}-regular.ttf`,
      urls: regularUrls,
    },
    bold: {
      vfsName: `${slug}-bold.ttf`,
      urls: boldUrls,
    },
    italic: {
      vfsName: `${slug}-italic.ttf`,
      urls: italicUrls,
    },
    bolditalic: {
      vfsName: `${slug}-bolditalic.ttf`,
      urls: boldItalicUrls,
    },
  }
}

async function registerWithAssets(
  pdf: PdfWithRegistry,
  pdfFamily: string,
  assets: Record<PdfFontStyle, FontAsset>,
): Promise<void> {
  if (isFontRegistered(pdf, pdfFamily)) return

  const addFileToVFS = pdf.addFileToVFS?.bind(pdf)
  const addFont = pdf.addFont?.bind(pdf)
  if (typeof addFileToVFS !== "function" || typeof addFont !== "function") {
    throw new Error("jsPDF font APIs are not available in this environment")
  }

  const [normal, bold, italic, bolditalic] = await Promise.all([
    fetchFirstAvailableBase64(assets.normal.urls),
    fetchFirstAvailableBase64(assets.bold.urls),
    fetchFirstAvailableBase64(assets.italic.urls),
    fetchFirstAvailableBase64(assets.bolditalic.urls),
  ])

  addFileToVFS(assets.normal.vfsName, normal)
  addFileToVFS(assets.bold.vfsName, bold)
  addFileToVFS(assets.italic.vfsName, italic)
  addFileToVFS(assets.bolditalic.vfsName, bolditalic)

  addFont(assets.normal.vfsName, pdfFamily, "normal")
  addFont(assets.bold.vfsName, pdfFamily, "bold")
  addFont(assets.italic.vfsName, pdfFamily, "italic")
  addFont(assets.bolditalic.vfsName, pdfFamily, "bolditalic")
  markFontRegistered(pdf, pdfFamily)
}

async function registerGoogleVariableFamily(pdf: PdfWithRegistry, fontFamily: FontFamily): Promise<void> {
  const assets = await getGoogleVariableAssets(fontFamily)
  await registerWithAssets(pdf, getPdfEmbeddedFamilyName(fontFamily), assets)
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

export function resolvePdfFontFamily(fontFamily: FontFamily): string | null {
  if (unavailableEmbeddedFamilies.has(fontFamily)) return null
  if (!KNOWN_FONT_FAMILIES.has(fontFamily)) return null
  return getPdfEmbeddedFamilyName(fontFamily)
}
