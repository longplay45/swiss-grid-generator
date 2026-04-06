import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const PAGE_PATH = path.join(ROOT, "app", "page.tsx")
const PREVIEW_WORKSPACE_PATH = path.join(ROOT, "components", "preview", "PreviewWorkspace.tsx")
const FONT_CONFIG_PATH = path.join(ROOT, "lib", "config", "fonts.ts")
const UI_DEFAULTS_PATH = path.join(ROOT, "lib", "config", "ui-defaults.ts")
const UI_RESOLVER_PATH = path.join(ROOT, "lib", "ui-settings-resolver.ts")
const WORKSPACE_UI_STATE_PATH = path.join(ROOT, "lib", "workspace-ui-state.ts")
const EXPORT_ACTIONS_PATH = path.join(ROOT, "hooks", "useExportActions.ts")

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function extractFontFamilies(fontConfigSource) {
  const definitionsBlockMatch = fontConfigSource.match(/export const FONT_DEFINITIONS = \[([\s\S]*?)\] as const/)
  assert.ok(definitionsBlockMatch, "Could not find FONT_DEFINITIONS in lib/config/fonts.ts")
  const matches = [...definitionsBlockMatch[1].matchAll(/value:\s*"([^"]+)"/g)]
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

test("default ui snapshot contains baseFont", () => {
  const defaultsSource = readText(UI_DEFAULTS_PATH)
  assert.match(defaultsSource, /export const DEFAULT_UI:\s*UiSettingsSnapshot\s*=\s*\{[\s\S]*baseFont:\s*"[^"]+"/)
})

test("page save/load wiring includes baseFont", () => {
  const pageSource = readText(PAGE_PATH)
  const previewWorkspaceSource = readText(PREVIEW_WORKSPACE_PATH)
  const resolverSource = readText(UI_RESOLVER_PATH)
  const workspaceUiStateSource = readText(WORKSPACE_UI_STATE_PATH)
  const exportActionsSource = readText(EXPORT_ACTIONS_PATH)
  assert.match(pageSource, /buildSerializableUiSettingsSnapshot\(ui\)/)
  assert.match(pageSource, /buildUiSnapshotFromLoadedSettings\(page\.uiSettings,\s*collapsed\)/)
  assert.match(workspaceUiStateSource, /return resolveUiSettingsSnapshot\(loaded,\s*\{/)
  assert.match(resolverSource, /baseFont:\s*isFontFamily\(source\.baseFont\)\s*\?\s*source\.baseFont\s*:\s*DEFAULT_BASE_FONT/)
  assert.match(exportActionsSource, /const\s+projectSnapshot\s*=\s*getCurrentProjectSnapshot\(\)/)
  assert.match(previewWorkspaceSource, /<GridPreview[\s\S]*baseFont=\{baseFont\}/)
})

test("font override round-trip: keep explicit override, inherit base font", () => {
  const fontConfigSource = readText(FONT_CONFIG_PATH)
  const fonts = extractFontFamilies(fontConfigSource)

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
