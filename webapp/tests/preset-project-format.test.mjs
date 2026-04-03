import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const PRESET_DATA_DIR = path.join(ROOT, "lib", "presets", "data")

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

test("bundled preset json files use canonical project schema", () => {
  const presetFiles = fs.readdirSync(PRESET_DATA_DIR)
    .filter((entry) => entry.endsWith(".json"))
    .sort()

  assert.ok(presetFiles.length > 0, "Expected at least one bundled preset JSON file")

  for (const fileName of presetFiles) {
    const payload = readJson(path.join(PRESET_DATA_DIR, fileName))

    assert.ok(Array.isArray(payload.pages), `${fileName} should include pages[]`)
    assert.equal(typeof payload.activePageId, "string", `${fileName} should include activePageId`)
    assert.ok(payload.pages.length > 0, `${fileName} should include at least one page`)
    assert.ok(
      payload.pages.some((page) => page?.id === payload.activePageId),
      `${fileName} activePageId should reference an existing page`,
    )
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
