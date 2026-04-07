import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const PRESET_DATA_DIR = path.join(ROOT, "lib", "presets", "data")
const PRESET_MANIFEST_PATH = path.join(ROOT, "lib", "presets", "generated-manifest.ts")

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function listPresetFiles() {
  return fs.readdirSync(PRESET_DATA_DIR)
    .filter((entry) => entry.endsWith(".json"))
    .sort()
}

function isIncludedInManifest(fileName, manifestSource) {
  return manifestSource.includes(`./data/${fileName}`)
}

function getCanonicalPresetIssue(payload) {
  if (typeof payload !== "object" || payload === null) return "expected an object payload"
  if (!Array.isArray(payload.pages)) return "should include pages[]"
  if (typeof payload.activePageId !== "string") return "should include activePageId"
  if (payload.pages.length === 0) return "should include at least one page"
  if (!payload.pages.some((page) => page?.id === payload.activePageId)) {
    return "activePageId should reference an existing page"
  }
  return null
}

test("canonical preset json files use the project schema", () => {
  const manifestSource = fs.readFileSync(PRESET_MANIFEST_PATH, "utf8")
  const presetFiles = listPresetFiles()

  assert.ok(presetFiles.length > 0, "Expected at least one preset JSON file")

  for (const fileName of presetFiles) {
    if (!isIncludedInManifest(fileName, manifestSource)) continue

    const payload = readJson(path.join(PRESET_DATA_DIR, fileName))

    assert.equal(getCanonicalPresetIssue(payload), null, `${fileName} should use the canonical project schema`)
    assert.equal(payload.uiSettings, undefined, `${fileName} should not use legacy top-level uiSettings`)
    assert.equal(payload.previewLayout, undefined, `${fileName} should not use legacy top-level previewLayout`)

    for (const [index, page] of payload.pages.entries()) {
      assert.equal(typeof page?.uiSettings, "object", `${fileName} page ${index + 1} should include uiSettings`)
      assert.ok(page.uiSettings, `${fileName} page ${index + 1} should include uiSettings`)
      assert.equal(page.uiSettings.exportPrintPro, false, `${fileName} page ${index + 1} should default to Digital Print`)
      assert.equal(page.uiSettings.exportBleedMm, 0, `${fileName} page ${index + 1} should default to zero bleed`)
      assert.equal(page.uiSettings.exportRegistrationMarks, false, `${fileName} page ${index + 1} should default to no registration marks`)
    }
  }
})

test("generated preset manifest includes valid presets and skips invalid ones", () => {
  const presetFiles = listPresetFiles()
  const manifestSource = fs.readFileSync(PRESET_MANIFEST_PATH, "utf8")

  assert.match(manifestSource, /GENERATED_PRESET_MANIFEST/, "Generated manifest export is missing")

  for (const fileName of presetFiles) {
    const filePath = path.join(PRESET_DATA_DIR, fileName)

    try {
      const payload = readJson(filePath)
      const issue = getCanonicalPresetIssue(payload)

      if (issue === null) {
        assert.equal(
          isIncludedInManifest(fileName, manifestSource),
          true,
          `${fileName} should be present in the generated preset manifest`,
        )
      } else {
        assert.equal(
          isIncludedInManifest(fileName, manifestSource),
          false,
          `${fileName} should be skipped because it is not a canonical project preset`,
        )
      }
    } catch {
      assert.equal(
        isIncludedInManifest(fileName, manifestSource),
        false,
        `${fileName} should be skipped because it is not valid JSON`,
      )
    }
  }
})
