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

test("svg export prefers absolute grapheme positions before falling back to live tracking segments", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /const\s+graphemeLines\s*=\s*textPlan\.graphemeLines\.map/)
  assert.match(source, /grapheme\.x/)
  assert.match(source, /grapheme\.y/)
  assert.match(source, /font-family="\$\{quoteAttr\(grapheme\.fontFamily\)\}"/)
  assert.match(source, /if\s*\(graphemeLines\)\s*\{/)
  assert.match(source, /const\s+lines\s*=\s*textPlan\.segmentLines\.map/)
})

test("svg export keeps block and page rotation explicit in svg transforms", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /function\s+renderRotationTransform\(rotation:\s*number,\s*originX:\s*number,\s*originY:\s*number\)/)
  assert.match(source, /const\s+pageRotationTransform\s*=\s*renderRotationTransform\(/)
  assert.match(source, /const\s+rotationTransform\s*=\s*renderRotationTransform\(/)
})

test("export actions support pdf, svg, and idml formats with format-specific filenames", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /export\s+type\s+ExportFormat\s*=\s*"pdf"\s*\|\s*"svg"\s*\|\s*"idml"/)
  assert.match(source, /renderSwissGridVectorSvg/)
  assert.match(source, /const\s+getDefaultExportFilename\s*=\s*useCallback\(\(format:\s*ExportFormat,\s*selectedPages:\s*number\)\s*=>\s*\{/)
  assert.match(source, /if\s*\(format\s*===\s*"svg"\s*&&\s*selectedPageCount\s*>\s*1\)\s*return\s*"\.zip"/)
  assert.match(source, /renderSwissGridIdmlProject/)
  assert.match(source, /filterProjectByExportRange\(currentProject,\s*selectedRange\)/)
  assert.match(source, /buildResolvedProjectPageExportSources\(currentProject,\s*selectedRange\)/)
  assert.match(source, /if\s*\(exportFormatDraft\s*===\s*"idml"\)\s*\{[\s\S]*?await\s+exportIDML\(selectedProject,\s*filename\)/)
  assert.match(source, /await\s+exportPDF\(resolvedPages,\s*filename,/)
  assert.match(source, /await\s+exportSVG\(resolvedPages,\s*filename,\s*normalizedRange\.fromPage\)/)
  assert.match(source, /const\s+defaultRange\s*=\s*\{\s*fromPage:\s*1,\s*toPage:\s*projectPageCount\s*\}/)
})

test("multi-page svg export switches to zip packaging with one file per selected page", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /await\s+import\("fflate"\)/)
  assert.match(source, /zipSync\(zipEntries\)/)
  assert.match(source, /application\/zip/)
  assert.match(source, /_page_\$\{String\(pageNumber\)\.padStart\(3,\s*"0"\)\}_/)
})

test("export dialog exposes an explicit pdf-svg-idml format switch", () => {
  const source = readText("components/dialogs/ExportPdfDialog.tsx")
  assert.match(source, /Label>Format<\/Label>/)
  assert.match(source, /Label>Pages<\/Label>/)
  assert.match(source, /onExportFormatChange\("pdf"\)/)
  assert.match(source, /onExportFormatChange\("svg"\)/)
  assert.match(source, /onExportFormatChange\("idml"\)/)
  assert.match(source, /onExportRangeStartChange/)
  assert.match(source, /onExportRangeEndChange/)
  assert.match(source, /SVG v1 exports live vector text, guides, and placeholders at trim size\./)
  assert.match(source, /SVG v1 exports a ZIP with one trim-sized live-text SVG per selected page\./)
  assert.match(source, /IDML v1 exports the selected page range\./)
  assert.match(source, /Export IDML/)
  assert.doesNotMatch(source, /Units \/ Paper Size/)
  assert.doesNotMatch(source, /Width \(mm\)/)
  assert.doesNotMatch(source, /Ratio:/)
})

test("default pdf and svg filenames no longer encode a paper-size override", () => {
  const source = readText("app/page.tsx")
  assert.match(source, /const\s+defaultPdfFilename\s*=\s*useMemo\(\s*\(\)\s*=>\s*`\$\{baseFilename\}_grid\.pdf`/)
  assert.match(source, /const\s+defaultSvgFilename\s*=\s*useMemo\(\s*\(\)\s*=>\s*`\$\{baseFilename\}_grid\.svg`/)
  assert.doesNotMatch(source, /baseFilename}_\$\{exportPaperSize\}_grid\.(pdf|svg)/)
})
