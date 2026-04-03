import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("svg export is rendered through the shared page export plan", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /import\s+\{\s*buildPageExportPlan\s*\}\s+from\s+"@\/lib\/page-export-plan"/)
  assert.match(source, /const\s+exportPlan\s*=\s*buildPageExportPlan\(\{/)
  assert.match(source, /showBaselines,\s*showModules,\s*showMargins,\s*showImagePlaceholders,\s*showTypography,/)
})

test("svg export emits a trim-sized svg with page clipping, guide groups, placeholders, and live text", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.match(source, /<defs><clipPath id="\$\{pageClipId\}"><rect x="0" y="0" width="\$\{formatNumber\(exportPlan\.pageWidth\)\}" height="\$\{formatNumber\(exportPlan\.pageHeight\)\}" \/><\/clipPath><\/defs>/)
  assert.match(source, /guides-\$\{guideGroup\.id\}/)
  assert.match(source, /<rect id="image-\$\{quoteAttr\(key\)\}"/)
  assert.match(source, /<g id="text-\$\{quoteAttr\(key\)\}"/)
  assert.match(source, /xml:space="preserve"/)
})

test("svg export keeps block and page rotation explicit in svg transforms", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /function\s+renderRotationTransform\(rotation:\s*number,\s*originX:\s*number,\s*originY:\s*number\)/)
  assert.match(source, /const\s+pageRotationTransform\s*=\s*renderRotationTransform\(/)
  assert.match(source, /const\s+rotationTransform\s*=\s*renderRotationTransform\(/)
})

test("export actions support pdf and svg formats with format-specific filenames", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /export\s+type\s+ExportFormat\s*=\s*"pdf"\s*\|\s*"svg"/)
  assert.match(source, /renderSwissGridVectorSvg/)
  assert.match(source, /const\s+getDefaultExportFilename\s*=\s*useCallback\(\(format:\s*ExportFormat\)\s*=>\s*\(/)
  assert.match(source, /format\s*===\s*"svg"\s*\?\s*ctx\.defaultSvgFilename\s*:\s*defaultPdfFilename/)
  assert.match(source, /if\s*\(exportFormatDraft\s*===\s*"pdf"\)\s*\{[\s\S]*?\}\s*else\s*\{[\s\S]*?exportSVG\(width,\s*height,\s*filename\)/)
})

test("export dialog exposes an explicit pdf-svg format switch", () => {
  const source = readText("components/dialogs/ExportPdfDialog.tsx")
  assert.match(source, /Label>Format<\/Label>/)
  assert.match(source, /onExportFormatChange\("pdf"\)/)
  assert.match(source, /onExportFormatChange\("svg"\)/)
  assert.match(source, /SVG v1 exports live vector text, guides, and placeholders at trim size\./)
  assert.match(source, /\{isPdfExport\s*\?\s*"Export PDF"\s*:\s*"Export SVG"\}/)
})
