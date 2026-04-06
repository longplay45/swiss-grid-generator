import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("page export plan extends baselines beyond the page before downstream clipping", () => {
  const source = readText("lib/page-export-plan.ts")
  assert.match(source, /const\s+halfDiag\s*=\s*Math\.sqrt\(sourceWidth\s*\*\s*sourceWidth\s*\+\s*sourceHeight\s*\*\s*sourceHeight\)\s*\/\s*2/)
  assert.match(source, /x1:\s*-halfDiag/)
  assert.match(source, /x2:\s*sourceWidth\s*\+\s*halfDiag/)
  assert.match(source, /clipToPage:\s*true/)
})

test("typography layout plan reflows across the full stacked row height before advancing to the next column", () => {
  const source = readText("lib/typography-layout-plan.ts")
  assert.match(source, /const\s+buildReflowRowLayouts\s*=\s*\(rowStart:\s*number,\s*rowSpan:\s*number,\s*lineStep:\s*number\)/)
  assert.match(source, /const\s+reflowRowLayouts\s*=\s*buildReflowRowLayouts\(startRow,\s*rowSpan,\s*lineStep\)/)
  assert.match(source, /const\s+maxLinesPerColumn\s*=\s*Math\.max\(1,\s*Math\.floor\(moduleHeightForBlock\s*\/\s*Math\.max\(lineStep,\s*0\.0001\)\)\)/)
  assert.match(source, /const\s+lineIndexWithinColumn\s*=\s*lineIndex\s*%\s*maxLinesPerColumn/)
  assert.match(source, /const\s+lineTopY\s*=\s*origin\.y\s*\+\s*baselineStep\s*\+\s*lineIndexWithinColumn\s*\*\s*lineStep/)
  assert.match(source, /reflowRowLayouts\.map\(\(rowLayout\)\s*=>\s*\(\{\s*x:\s*origin\.x\s*\+\s*getColumnOffset\(startCol,\s*columnIndex\),[\s\S]*?y:\s*origin\.y\s*\+\s*baselineStep\s*\+\s*rowLayout\.yOffset,/)
})

test("page export plan only emits a page outline when guide layers are visible", () => {
  const source = readText("lib/page-export-plan.ts")
  assert.match(source, /const\s+showPageOutline\s*=\s*showMargins\s*\|\|\s*showModules\s*\|\|\s*showBaselines/)
  assert.match(source, /const\s+pageOutline\s*=\s*showPageOutline/)
})

test("page export plan resolves paragraph and inline text colors through the text-scheme fallback, not the image placeholder fallback", () => {
  const source = readText("lib/page-export-plan.ts")
  assert.match(source, /getDefaultTextSchemeColor/)
  assert.match(source, /resolveTextSchemeColor/)
  assert.match(source, /const\s+defaultTextColor\s*=\s*getDefaultTextSchemeColor\(imageColorScheme\)/)
  assert.match(source, /const\s+resolveExportTextColor\s*=\s*\(value:\s*unknown\)\s*=>\s*resolveTextSchemeColor\(value,\s*imageColorScheme\)/)
  assert.match(source, /const\s+getResolvedBlockTextColor\s*=\s*\(key:\s*BlockId\)\s*=>\s*\(\s*resolveExportTextColor\(blockTextColors\[key\]\s*\?\?\s*defaultTextColor\)\s*\)/)
  assert.match(source, /blockTextFormatRuns\[key\]\s*\?\?\s*\[\]\)\.map\(\(run\)\s*=>\s*\(\s*run\.color\s*===\s*undefined\s*\?\s*run\s*:\s*\{\s*\.\.\.run,\s*color:\s*resolveExportTextColor\(run\.color\)\s*\}\s*\)\)/)
})

test("pdf export consumes the shared page export plan instead of rebuilding layout inline", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /import\s+\{\s*buildPageExportPlan\s*\}\s+from\s+"@\/lib\/page-export-plan"/)
  assert.match(source, /const\s+exportPlan\s*=\s*buildPageExportPlan\(\{[\s\S]*?showBaselines,[\s\S]*?showModules,[\s\S]*?showMargins,[\s\S]*?showImagePlaceholders,[\s\S]*?showTypography,/)
  assert.doesNotMatch(source, /monochromeGuides/)
})

test("pdf export keeps text rotation direction aligned with canvas preview", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(
    source,
    /pdf\.text\(line,\s*point\.x,\s*point\.y,\s*\{[\s\S]*?angle:\s*rotation\s*\+\s*blockRotation,[\s\S]*?rotationDirection:\s*0,[\s\S]*?\}\)/,
  )
})

test("pdf export rotates text anchors around paragraph origin before page transform", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(
    source,
    /const\s+rotated\s*=\s*rotatePointAround\(x,\s*y,\s*rotationOrigin\.x,\s*rotationOrigin\.y,\s*blockRotation\)/,
  )
})

test("pdf export wraps guide groups into form objects and clips trimmed guides to the final page box", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /type\s+PdfWithFormObjects\s*=\s*jsPDF\s*&/)
  assert.match(source, /const\s+drawGuideGroup\s*=\s*\(key:\s*string,\s*draw:\s*\(\)\s*=>\s*void\)/)
  assert.match(source, /beginFormObject\(0,\s*0,\s*pageWidth,\s*pageHeight,\s*identityMatrix\)/)
  assert.match(source, /endFormObject\(key\)/)
  assert.match(source, /doFormObject\(key,\s*identityMatrix\)/)
  assert.match(source, /for\s*\(const\s+guideGroup\s+of\s+exportPlan\.guideGroups\)/)
  assert.match(source, /drawGuideGroup\(`swiss_guides_\$\{guideGroup\.id\}`,\s*\(\)\s*=>\s*\{/)
  assert.match(source, /if\s*\(guideGroup\.clipToPage\)\s*\{[\s\S]*?pdf\.rect\(originX,\s*originY,\s*width,\s*height,\s*null\)/)
})

test("pdf export uses the shared ordered layer list for placeholders and text", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /const\s+imagePlans\s*=\s*new\s+Map\(exportPlan\.imagePlans\.map/)
  assert.match(source, /const\s+textPlans\s*=\s*new\s+Map\(exportPlan\.textPlans\.map/)
  assert.match(source, /for\s*\(const\s+key\s+of\s+exportPlan\.orderedLayerKeys\)/)
})

test("pdf export applies tracking through charSpace instead of horizontal scaling", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /pdf\.text\(line,\s*point\.x,\s*point\.y,\s*\{[\s\S]*?charSpace:\s*getTrackingLetterSpacing\(fontSize\s*\*\s*scale,\s*trackingScale\)[\s\S]*?\}\)/)
})

test("pdf export draws pre-positioned tracking segments with explicit left anchors", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /if\s*\(plan\.graphemeLines\.length\s*>\s*0\)/)
  assert.match(source, /for\s*\(const\s+graphemes\s+of\s+plan\.graphemeLines\)/)
  assert.match(source, /drawText\(\s*grapheme\.text,\s*grapheme\.x,\s*grapheme\.y,\s*"left",\s*0,/)
  assert.match(source, /for\s*\(const\s+segments\s+of\s+plan\.segmentLines\)/)
})

test("pdf export action forwards placeholder visibility and active image color scheme", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /showImagePlaceholders:\s*boolean/)
  assert.match(source, /imageColorScheme:\s*ImageColorSchemeId/)
  assert.match(source, /renderSwissGridVectorPdf\(\{[\s\S]*?imageColorScheme:\s*page\.imageColorScheme,[\s\S]*?canvasBackground:\s*page\.resolvedCanvasBackground,[\s\S]*?showImagePlaceholders:\s*page\.uiSettings\.showImagePlaceholders,[\s\S]*?showTypography:\s*page\.uiSettings\.showTypography,/)
})

test("pdf export switches between rgb and cmyk setters based on export color mode", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /colorMode:\s*PdfExportColorMode/)
  assert.match(source, /if\s*\(colorMode\s*===\s*"cmyk"\)\s*\{[\s\S]*setDrawColorCmyk/)
  assert.match(source, /function\s+setDrawColorRgb\(pdf:\s*jsPDF,\s*color:\s*RgbColor\)/)
  assert.match(source, /function\s+setDrawColorCmyk\(pdf:\s*jsPDF,\s*color:\s*RgbColor\)/)
  assert.match(source, /function\s+setTextColorRgb\(pdf:\s*jsPDF,\s*color:\s*RgbColor\)/)
  assert.match(source, /function\s+setTextColorCmyk\(pdf:\s*jsPDF,\s*color:\s*RgbColor\)/)
  assert.match(source, /function\s+setFillColorRgb\(pdf:\s*jsPDF,\s*color:\s*RgbColor\)/)
  assert.match(source, /function\s+setFillColorCmyk\(pdf:\s*jsPDF,\s*color:\s*RgbColor\)/)
  assert.match(source, /pdf\.setDrawColor\(color\.r,\s*color\.g,\s*color\.b\)/)
  assert.match(source, /pdf\.setTextColor\(color\.r,\s*color\.g,\s*color\.b\)/)
  assert.match(source, /pdf\.setFillColor\(color\.r,\s*color\.g,\s*color\.b\)/)
  assert.match(source, /function\s+rgbToCmyk\(/)
})

test("pdf export constructs real jsPDF graphics-state instances before registering opacity states", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /type\s+PdfGraphicsStateParameters\s*=\s*\{\s*opacity\?:\s*number;\s*"stroke-opacity"\?:\s*number\s*\}/)
  assert.match(source, /type\s+PdfGraphicsStateConstructor\s*=\s*new\s*\(parameters:\s*PdfGraphicsStateParameters\)\s*=>\s*PdfGraphicsState/)
  assert.match(source, /typeof\s+opacityPdf\.GState\s*!==\s*"function"/)
  assert.match(source, /const\s+gState\s*=\s*new\s+opacityPdf\.GState\(\{\s*[\s\S]*?opacity:\s*normalizedOpacity,[\s\S]*?"stroke-opacity":\s*1,[\s\S]*?\}\)/)
  assert.match(source, /opacityPdf\.addGState\(key,\s*gState\)/)
  assert.match(source, /opacityPdf\.setGState\(key\)/)
})

test("pdf export attaches an embedded output intent profile for print-aware exports", () => {
  const source = readText("lib/pdf-output-intent.ts")
  assert.match(source, /putResources/)
  assert.match(source, /putXobjectDict/)
  assert.match(source, /postPutResources/)
  assert.match(source, /putCatalog/)
  assert.match(source, /\/DefaultRGB/)
  assert.match(source, /\/DefaultCMYK/)
  assert.match(source, /\/ICCBased/)
  assert.match(source, /\/OutputIntents\s*\[<</)
  assert.match(source, /\/DestOutputProfile\s+\$\{current\.profileObjectId\}\s+0\s+R/)
  assert.match(source, /\/S\s+\/GTS_PDFX/)
  assert.match(source, /coated-fogra39\.icc/)
  assert.match(source, /srgb-iec61966-2-1\.icc/)
})

test("pdf export presets stay ordered from digital to offset and drive color-management mode", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /PRINT_PRESETS[\s\S]*key:\s*"digital_print"[\s\S]*key:\s*"press_proof"[\s\S]*key:\s*"offset_final"/)
  assert.match(source, /EXPORT_DIALOG_PRINT_PRESETS\s*=\s*PRINT_PRESETS\.filter\(\(preset\)\s*=>\s*preset\.key\s*!==\s*"offset_final"\)/)
  assert.match(source, /if\s*\(!config\.enabled\)\s*\{[\s\S]*colorMode:\s*"rgb"[\s\S]*outputIntentProfileId:\s*"srgb"/)
  assert.match(source, /return\s*\{[\s\S]*colorMode:\s*"cmyk"[\s\S]*outputIntentProfileId:\s*"coated-fogra39"/)
})

test("export dialog relies on print presets instead of a separate print-pro switch", () => {
  const source = readText("components/dialogs/ExportPdfDialog.tsx")
  assert.match(source, /Label>Print Presets<\/Label>/)
  assert.match(source, /EXPORT_DIALOG_PRINT_PRESETS/)
  assert.match(source, /grid-cols-2/)
  assert.doesNotMatch(source, /Print Pro/)
  assert.doesNotMatch(source, /onExportPrintProChange/)
})

test("export dialog stays dark-mode-safe after removing size override controls", () => {
  const source = readText("components/dialogs/ExportPdfDialog.tsx")
  assert.match(source, /isDarkUi:\s*boolean/)
  assert.match(source, /const\s+dialogThemeClassName\s*=\s*isDarkUi\s*\?\s*"dark"\s*:\s*undefined/)
  assert.match(source, /SelectContent className=\{dialogThemeClassName\}/)
  assert.match(source, /bg-background/)
  assert.match(source, /text-muted-foreground/)
  assert.doesNotMatch(source, /Units \/ Paper Size/)
  assert.doesNotMatch(source, /Width \(mm\)/)
  assert.doesNotMatch(source, /Height will follow the selected aspect ratio automatically\./)
})

test("default export preset stays on digital print in code defaults and no longer depends on the bundled preset JSON", () => {
  const source = readText("lib/config/ui-defaults.ts")
  assert.doesNotMatch(source, /default_v001\.json/)
  assert.match(source, /exportPrintPro:\s*false/)
  assert.match(source, /exportBleedMm:\s*0/)
  assert.match(source, /exportRegistrationMarks:\s*false/)
  assert.doesNotMatch(source, /exportFinalSafeGuides/)
})
