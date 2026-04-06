import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("idml export rebuilds each project page through the shared resolver and page export plan", () => {
  const source = readText("lib/idml-export.ts")
  assert.match(source, /project\.pages\.map\(\(page,\s*index\)\s*=>/)
  assert.match(source, /buildResolvedProjectPageExportSource\(page,\s*sourcePath\)/)
  assert.match(source, /buildPageExportPlan\(\{/)
  assert.match(source, /showBaselines:\s*resolved\.uiSettings\.showBaselines/)
  assert.match(source, /showModules:\s*resolved\.uiSettings\.showModules/)
  assert.match(source, /showMargins:\s*resolved\.uiSettings\.showMargins/)
  assert.match(source, /showImagePlaceholders:\s*resolved\.uiSettings\.showImagePlaceholders/)
  assert.match(source, /showTypography:\s*resolved\.uiSettings\.showTypography/)
})

test("idml package builder writes a packaged document with resources, spreads, and stories", () => {
  const source = readText("lib/idml/builder.ts")
  assert.match(source, /zipSync\(/)
  assert.match(source, /application\/vnd\.adobe\.indesign-idml-package/)
  assert.match(source, /"META-INF\/container\.xml"/)
  assert.match(source, /"META-INF\/metadata\.xml"/)
  assert.match(source, /"Resources\/Graphic\.xml"/)
  assert.match(source, /"Resources\/Fonts\.xml"/)
  assert.match(source, /"Resources\/Styles\.xml"/)
  assert.match(source, /"Resources\/Preferences\.xml"/)
  assert.match(source, /"MasterSpreads\/MasterSpread_sggMaster\.xml"/)
  assert.match(source, /"XML\/BackingStory\.xml"/)
  assert.match(source, /"XML\/Tags\.xml"/)
  assert.match(source, /"designmap\.xml"/)
  assert.match(source, /Spreads\/Spread_\$\{String\(pageIndex \+ 1\)\.padStart\(3,\s*"0"\)\}\.xml/)
  assert.match(source, /Stories\/Story_\$\{String\(pageIndex \+ 1\)\.padStart\(3,\s*"0"\)\}_\$\{String\(localStorySequence\)\.padStart\(3,\s*"0"\)\}\.xml/)
})

test("idml builder separates guides, typography, and placeholders on dedicated layers", () => {
  const source = readText("lib/idml/builder.ts")
  assert.match(source, /const\s+LAYER_PLACEHOLDERS_ID\s*=\s*"sggLayerPlaceholders"/)
  assert.match(source, /const\s+LAYER_TYPOGRAPHY_ID\s*=\s*"sggLayerTypography"/)
  assert.match(source, /const\s+LAYER_GUIDES_ID\s*=\s*"sggLayerGuides"/)
  assert.match(source, /ItemLayer:\s*LAYER_PLACEHOLDERS_ID/)
  assert.match(source, /ItemLayer:\s*LAYER_TYPOGRAPHY_ID/)
  assert.match(source, /buildGuidesXml\(pageTransformMatrix,\s*guideRects\)/)
  assert.match(source, /layerId:\s*LAYER_GUIDES_ID/)
  assert.match(source, /Name:\s*"Placeholders"/)
  assert.match(source, /Name:\s*"Typography"/)
  assert.match(source, /Name:\s*"Guides"/)
})

test("idml builder places spread items in page coordinates with an explicit page-origin transform", () => {
  const source = readText("lib/idml/builder.ts")
  assert.match(source, /function\s+buildPageCoordinateTransform\(pageHeight:\s*number\):\s*Matrix/)
  assert.match(source, /return\s+\[1,\s*0,\s*0,\s*1,\s*0,\s*-pageHeight\s*\/\s*2\]/)
  assert.match(source, /ItemTransform:\s*formatMatrix\(buildPageCoordinateTransform\(pageHeight\)\)/)
  assert.match(source, /renderRectPathGeometry\(0,\s*0,\s*pageWidth,\s*pageHeight\)/)
})

test("idml designmap declares spreads before section metadata to avoid a synthetic lead page", () => {
  const source = readText("lib/idml/builder.ts")
  assert.match(
    source,
    /\.\.\.spreads\.map\(\(spread\)\s*=>\s*renderIdmlElement\("idPkg:Spread",\s*\{\s*src:\s*spread\.filePath\s*\}\)\),[\s\S]*renderIdmlElement\(\s*"Section"/,
  )
})

test("idml preferences do not predeclare document pages when spreads already define the export range", () => {
  const source = readText("lib/idml/builder.ts")
  assert.doesNotMatch(source, /PagesPerDocument:/)
  assert.match(source, /FacingPages:\s*false/)
})

test("idml styles include paragraph families plus per-block character styles for frozen text geometry", () => {
  const source = readText("lib/idml/builder.ts")
  assert.match(source, /buildParagraphStyleKeys\(/)
  assert.match(source, /"body",\s*"headline",\s*"display",\s*"fx",\s*"caption"/)
  assert.match(source, /CharacterStyle\/sgg\/char_/)
  assert.match(source, /ParagraphStyle\/sgg\//)
  assert.match(source, /AppliedFont",\s*\{\s*type:\s*"string"\s*\}/)
  assert.match(source, /Leading",\s*\{\s*type:\s*"unit"\s*\}/)
  assert.match(source, /formatStoryContent\(textPlan\.commands\.map/)
})

test("idml font metadata prefers parsed font-file names and keeps a fallback path", () => {
  const source = readText("lib/idml/font-metadata.ts")
  assert.match(source, /findTable\(view,\s*"name"\)/)
  assert.match(source, /const\s+nameId\s*=\s*view\.getUint16\(recordOffset\s*\+\s*6,\s*false\)/)
  assert.match(source, /byNameId\.get\(16\)/)
  assert.match(source, /byNameId\.get\(17\)/)
  assert.match(source, /byNameId\.get\(6\)/)
  assert.match(source, /getFontAssetPath\(fontFamily,\s*resolvedVariant\.weight,\s*resolvedVariant\.italic\)/)
  assert.match(source, /buildFallbackMetadata\(/)
})
