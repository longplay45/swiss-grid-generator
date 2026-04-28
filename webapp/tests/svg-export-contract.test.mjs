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

test("svg export emits a trim-sized svg with page clipping, guide groups, placeholders, and outline groups", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.match(source, /<defs><clipPath id="\$\{pageClipId\}"><rect x="0" y="0" width="\$\{formatNumber\(exportPlan\.pageWidth\)\}" height="\$\{formatNumber\(exportPlan\.pageHeight\)\}" \/><\/clipPath><\/defs>/)
  assert.match(source, /guides-\$\{guideGroup\.id\}/)
  assert.match(source, /<rect id="image-\$\{quoteAttr\(key\)\}"/)
  assert.match(source, /<g id="text-\$\{quoteAttr\(key\)\}"/)
  assert.match(source, /data-text-rendering="glyph-outline"/)
  assert.match(source, /<path d="\$\{quoteAttr\(pathData\)\}"/)
})

test("svg export embeds project metadata in a dedicated rdf block", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /function\s+buildSvgMetadataMarkup\(/)
  assert.match(source, /<metadata>/)
  assert.match(source, /<rdf:RDF xmlns:rdf="http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#">/)
  assert.match(source, /<dc:format>image\/svg\+xml<\/dc:format>/)
  assert.match(source, /<dc:title><rdf:Alt><rdf:li xml:lang="x-default">/)
  assert.match(source, /<dc:description><rdf:Alt><rdf:li xml:lang="x-default">/)
  assert.match(source, /<dc:creator><rdf:Seq><rdf:li>/)
  assert.match(source, /<dc:date><rdf:Seq><rdf:li>/)
  assert.match(source, /<xmp:CreatorTool>/)
  assert.match(source, /metadataMarkup/)
})

test("svg export converts positioned graphemes into outline paths from the resolved font variant", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /import\s+\{\s*loadOutlineFont\s*\}\s+from\s+"@\/lib\/font-outline"/)
  assert.match(source, /await\s+Promise\.all\(exportPlan\.textPlans\.flatMap/)
  assert.match(source, /loadOutlineFont\(grapheme\.fontFamily,\s*grapheme\.fontWeight,\s*grapheme\.italic\)/)
  assert.match(source, /textPlan\.graphemeLines\.map/)
  assert.match(source, /grapheme\.x/)
  assert.match(source, /grapheme\.y/)
  assert.match(source, /font\.getPath\(/)
  assert.match(source, /kerning:\s*false/)
  assert.match(source, /hinting:\s*false/)
  assert.match(source, /toPathData\(3\)/)
})

test("svg export keeps block and page rotation explicit in svg transforms", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /function\s+renderRotationTransform\(rotation:\s*number,\s*originX:\s*number,\s*originY:\s*number\)/)
  assert.match(source, /const\s+pageRotationTransform\s*=\s*renderRotationTransform\(/)
  assert.match(source, /const\s+rotationTransform\s*=\s*renderRotationTransform\(/)
})

test("svg export keeps a narrow live-text fallback if outline loading fails unexpectedly", () => {
  const source = readText("lib/svg-vector-export.ts")
  assert.match(source, /if\s*\(!font\)\s*\{/)
  assert.match(source, /xml:space="preserve"/)
  assert.match(source, /data-text-rendering="text-fallback"/)
})

test("export actions support pdf, svg, idml, and json formats with format-specific filenames", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /export\s+type\s+ExportFormat\s*=\s*"pdf"\s*\|\s*"svg"\s*\|\s*"idml"\s*\|\s*"json"/)
  assert.match(source, /renderSwissGridVectorSvg/)
  assert.match(source, /const\s+getDefaultExportFilename\s*=\s*useCallback\(\(format:\s*ExportFormat,\s*selectedPages:\s*number\)\s*=>\s*\{/)
  assert.match(source, /if\s*\(format\s*===\s*"svg"\s*&&\s*selectedPageCount\s*>\s*1\)\s*return\s*"\.zip"/)
  assert.match(source, /renderSwissGridIdmlProject/)
  assert.match(source, /const\s+currentProjectSnapshot\s*=\s*getCurrentProjectWithMetadata\(\)/)
  assert.match(source, /filterProjectByExportRange\(currentProjectSnapshot,\s*selectedRange\)/)
  assert.match(source, /buildResolvedProjectPageExportSources\(currentProjectSnapshot,\s*selectedRange\)/)
  assert.match(source, /if\s*\(format\s*===\s*"json"\)\s*return\s*"\.json"/)
  assert.match(source, /if\s*\(exportFormatDraft\s*!==\s*"json"\s*&&\s*selectedPageCount\s*===\s*0\)\s*return/)
  assert.match(source, /if\s*\(exportFormatDraft\s*===\s*"json"\)\s*\{[\s\S]*?saveJSON\(filename,\s*normalizedMetadata\)/)
  assert.match(source, /if\s*\(exportFormatDraft\s*===\s*"idml"\)\s*\{[\s\S]*?await\s+exportIDML\(selectedProject,\s*filename\)/)
  assert.match(source, /await\s+exportPDF\(resolvedPages,\s*filename,/)
  assert.match(source, /await\s+exportSVG\(resolvedPages,\s*filename,\s*normalizedRange\.fromPage\)/)
  assert.match(source, /const\s+defaultRange\s*=\s*\{\s*fromPage:\s*1,\s*toPage:\s*projectPageCount\s*\}/)
  assert.match(source, /author:\s*trimmedAuthor,/)
  assert.match(source, /createdAt:\s*normalizedCreatedAt,/)
})

test("multi-page svg export switches to zip packaging with one file per selected page", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /await\s+import\("fflate"\)/)
  assert.match(source, /zipSync\(zipEntries\)/)
  assert.match(source, /application\/zip/)
  assert.match(source, /_page_\$\{String\(pageNumber\)\.padStart\(3,\s*"0"\)\}_/)
})

test("export dialog exposes an explicit pdf-svg-idml-json format switch", () => {
  const source = readText("components/dialogs/ExportDialog.tsx")
  assert.match(source, /Label>Format<\/Label>/)
  assert.match(source, /Label>Pages<\/Label>/)
  assert.match(source, /onExportFormatChange\("json"\)[\s\S]*onExportFormatChange\("pdf"\)[\s\S]*onExportFormatChange\("svg"\)[\s\S]*onExportFormatChange\("idml"\)/)
  assert.match(source, /onExportFormatChange\("pdf"\)/)
  assert.match(source, /onExportFormatChange\("svg"\)/)
  assert.match(source, /onExportFormatChange\("idml"\)/)
  assert.match(source, /onExportFormatChange\("json"\)/)
  assert.match(source, /onExportRangeStartChange/)
  assert.match(source, /onExportRangeEndChange/)
  assert.match(source, /SVG v1 exports trim-sized glyph-outline vectors, guides, and placeholders\./)
  assert.match(source, /SVG v1 exports a ZIP with one trim-sized outlined SVG per selected page\./)
  assert.match(source, /IDML v1 exports the selected project page range/)
  assert.match(source, /JSON exports the full editable project document/)
  assert.match(source, /Export IDML/)
  assert.match(source, /Save JSON/)
  assert.doesNotMatch(source, /Units \/ Paper Size/)
  assert.doesNotMatch(source, /Width \(mm\)/)
  assert.doesNotMatch(source, /Ratio:/)
})

test("save dialog remains focused on library metadata rather than json filename export", () => {
  const source = readText("components/dialogs/SaveLibraryDialog.tsx")
  assert.match(source, /Save to Library/)
  assert.match(source, /Project Title/)
  assert.match(source, /Description \(optional\)/)
  assert.match(source, /Author \(optional\)/)
  assert.doesNotMatch(source, /Filename/)
})

test("default pdf and svg filenames no longer encode a paper-size override", () => {
  const source = readText("app/page.tsx")
  assert.match(source, /const\s+defaultPdfFilename\s*=\s*useMemo\(\s*\(\)\s*=>\s*`\$\{baseFilename\}_grid\.pdf`/)
  assert.match(source, /const\s+defaultSvgFilename\s*=\s*useMemo\(\s*\(\)\s*=>\s*`\$\{baseFilename\}_grid\.svg`/)
  assert.doesNotMatch(source, /baseFilename}_\$\{exportPaperSize\}_grid\.(pdf|svg)/)
})
