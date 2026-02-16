import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const PAGE_PATH = path.join(ROOT, "app", "page.tsx")
const PREVIEW_PATH = path.join(ROOT, "components", "grid-preview.tsx")
const EXPORT_ACTIONS_PATH = path.join(ROOT, "hooks", "useExportActions.ts")
const DEFAULT_PRESET_PATH = path.join(ROOT, "public", "default_v001.json")

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function extractFontFamilies(previewSource) {
  const unionBlockMatch = previewSource.match(/export type FontFamily\s*=\s*([\s\S]*?)\n\s*export const FONT_OPTIONS:/)
  assert.ok(unionBlockMatch, "Could not find FontFamily union in grid-preview.tsx")
  const matches = [...unionBlockMatch[1].matchAll(/"([^"]+)"/g)]
  return matches.map((m) => m[1])
}

function normalizeFontOverridesForLoad({ blockOrder, blockFontFamilies }, baseFont, knownFonts) {
  const known = new Set(knownFonts)
  const normalized = {}
  for (const key of blockOrder) {
    const raw = blockFontFamilies?.[key]
    if (typeof raw === "string" && known.has(raw) && raw !== baseFont) {
      normalized[key] = raw
    }
  }
  return normalized
}

test("default preset contains baseFont", () => {
  const preset = JSON.parse(readText(DEFAULT_PRESET_PATH))
  assert.equal(typeof preset?.uiSettings?.baseFont, "string")
})

test("page save/load wiring includes baseFont", () => {
  const pageSource = readText(PAGE_PATH)
  const exportActionsSource = readText(EXPORT_ACTIONS_PATH)
  assert.match(pageSource, /buildUiSettingsPayload[\s\S]*baseFont,/)
  assert.match(exportActionsSource, /uiSettings:\s*buildUiSettingsPayload\(\)/)
  assert.match(pageSource, /if \(isFontFamily\(ui\.baseFont\)\)/)
  assert.match(pageSource, /setBaseFont\(ui\.baseFont\)/)
  assert.match(pageSource, /<GridPreview[\s\S]*baseFont=\{baseFont\}/)
})

test("font override round-trip: keep explicit override, inherit base font", () => {
  const previewSource = readText(PREVIEW_PATH)
  const fonts = extractFontFamilies(previewSource)

  const baseFont = "Work Sans"
  const saved = {
    blockOrder: ["display", "headline", "body"],
    blockFontFamilies: {
      display: "Work Sans",
      headline: "EB Garamond",
      body: "Not A Real Font",
    },
  }

  const json = JSON.stringify(saved)
  const loaded = JSON.parse(json)
  const normalized = normalizeFontOverridesForLoad(loaded, baseFont, fonts)

  assert.deepEqual(normalized, { headline: "EB Garamond" })
  assert.ok(!("display" in normalized), "Base-font match should inherit, not be explicit")
  assert.ok(!("body" in normalized), "Unknown font should be discarded")
})
