import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

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

test("pdf export baselines extend beyond page bounds before clipping to match preview", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /const\s+halfDiag\s*=\s*Math\.sqrt\(sourceWidth\s*\*\s*sourceWidth\s*\+\s*sourceHeight\s*\*\s*sourceHeight\)\s*\/\s*2/)
  assert.match(source, /drawLine\(-halfDiag,\s*y,\s*sourceWidth\s*\+\s*halfDiag,\s*y\)/)
})

test("pdf export page outline is rendered only when guide layers are visible", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /const\s+showPageOutline\s*=\s*showMargins\s*\|\|\s*showModules\s*\|\|\s*showBaselines/)
  assert.match(source, /if\s*\(showPageOutline\)\s*\{[\s\S]*?drawRectOutline\(0,\s*0,\s*sourceWidth,\s*sourceHeight\)/)
})

test("pdf export bleed guide follows guide visibility when print-pro is enabled", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /if\s*\(printPro\.showBleedGuide\s*&&\s*showPageOutline\)/)
})

test("pdf export builds wrapped lines through shared planner with measured width fallback", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /buildTypographyLayoutPlan<BlockId,\s*TypographyStyleKey,\s*PdfTextContext>\(/)
  assert.match(source, /fontScale:\s*1/)
  assert.match(source, /const\s+measureWidth\s*=\s*\(text:\s*string\)\s*=>\s*\{[\s\S]*?measureCanvasTextWidth\(textMeasureContext,\s*text,\s*trackingScale,\s*fontSize\)[\s\S]*?pdf\.getTextWidth\(text\)\s*\/\s*scale[\s\S]*?getTrackingLetterSpacing\(fontSize,\s*trackingScale\)[\s\S]*?\}/)
  assert.match(source, /wrapText:\s*\(\{\s*context,\s*text,\s*maxWidth,\s*hyphenate\s*\}\)\s*=>\s*wrapText\(text,\s*maxWidth,\s*hyphenate,\s*context\.measureWidth\)/)
  assert.match(source, /textAscent:\s*\(\{\s*context,\s*fontSize\s*\}\)\s*=>[\s\S]*?estimateTextAscent\(textMeasureContext,\s*context\.canvasFont,\s*fontSize\)/)
  assert.match(source, /pdf\.setFontSize\(plan\.fontSize\s*\*\s*scale\)/)
})

test("pdf export applies tracking through charSpace instead of horizontal scaling", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /pdf\.text\(line,\s*point\.x,\s*point\.y,\s*\{[\s\S]*?charSpace:\s*getTrackingLetterSpacing\(fontSize\s*\*\s*scale,\s*trackingScale\)[\s\S]*?\}\)/)
})

test("pdf export manually right-aligns text anchors before draw to avoid rotated alignment drift", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /const\s+drawAlign:\s*TextAlignMode\s*=\s*plan\.textAlign\s*===\s*"right"\s*\?\s*"left"\s*:\s*plan\.textAlign/)
  assert.match(source, /const\s+drawX\s*=\s*plan\.textAlign\s*===\s*"right"[\s\S]*?command\.x\s*-\s*measureWidthSource\(command\.text\)/)
})

test("pdf export draws image placeholders only when placeholder layer is visible", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /if\s*\(showImagePlaceholders\)\s*\{/)
  assert.match(source, /setFillColor\(pdf,\s*imagePlan\.fillColor,\s*colorMode\)/)
  assert.match(source, /drawFilledRect\(imagePlan\.x,\s*imagePlan\.y,\s*imagePlan\.width,\s*imagePlan\.height\)/)
})

test("pdf export rotates placeholder fill geometry through transformed corner path", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /const\s+topLeft\s*=\s*transformPoint\(x,\s*y\)/)
  assert.match(source, /const\s+topRight\s*=\s*transformPoint\(x\s*\+\s*w,\s*y\)/)
  assert.match(source, /const\s+bottomRight\s*=\s*transformPoint\(x\s*\+\s*w,\s*y\s*\+\s*h\)/)
  assert.match(source, /const\s+bottomLeft\s*=\s*transformPoint\(x,\s*y\s*\+\s*h\)/)
  assert.match(source, /pdf\.moveTo\(topLeft\.x,\s*topLeft\.y\)/)
  assert.match(source, /pdf\.lineTo\(topRight\.x,\s*topRight\.y\)/)
  assert.match(source, /pdf\.lineTo\(bottomRight\.x,\s*bottomRight\.y\)/)
  assert.match(source, /pdf\.lineTo\(bottomLeft\.x,\s*bottomLeft\.y\)/)
  assert.match(source, /pdf\.close\(\)/)
  assert.match(source, /pdf\.fill\(\)/)
})

test("pdf export action forwards placeholder visibility toggle", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /showImagePlaceholders:\s*boolean/)
  assert.match(source, /showImagePlaceholders,\s*showTypography,\s*\n\s*}\)/)
})

test("pdf export resolves scheme-based canvas background and placeholder colors before drawing", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /const\s+resolvedCanvasBackground\s*=\s*canvasBackground[\s\S]*?resolveImageSchemeColor\(canvasBackground,\s*imageColorScheme\)/)
  assert.match(source, /const\s+backgroundRgb\s*=\s*parseHexColor\(resolvedCanvasBackground\s*\?\?\s*undefined\)/)
  assert.match(source, /const\s+fallbackImageColor\s*=\s*parseHexColor\(resolveImageSchemeColor\(undefined,\s*imageColorScheme\)\)/)
  assert.match(source, /const\s+fillColor\s*=\s*parseHexColor\(resolveImageSchemeColor\(imageColors\[key\],\s*imageColorScheme\)\)\s*\?\?\s*fallbackImageColor/)
})

test("pdf export action forwards the active image color scheme", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /imageColorScheme:\s*ImageColorSchemeId/)
  assert.match(source, /imageColorScheme,\s*\n\s*canvasBackground,/)
  assert.match(source, /renderSwissGridVectorPdf\(\{[\s\S]*?imageColorScheme,[\s\S]*?canvasBackground,/)
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

test("pdf export attaches an embedded output intent profile for print-aware exports", () => {
  const source = readText("lib/pdf-output-intent.ts")
  assert.match(source, /postPutResources/)
  assert.match(source, /putCatalog/)
  assert.match(source, /\/OutputIntents\s*\[<</)
  assert.match(source, /\/DestOutputProfile\s+\$\{current\.profileObjectId\}\s+0\s+R/)
  assert.match(source, /\/S\s+\/GTS_PDFX/)
  assert.match(source, /coated-fogra39\.icc/)
  assert.match(source, /srgb-iec61966-2-1\.icc/)
})

test("pdf export presets stay ordered from digital to offset and drive color-management mode", () => {
  const source = readText("hooks/useExportActions.ts")
  assert.match(source, /PRINT_PRESETS[\s\S]*key:\s*"digital_print"[\s\S]*key:\s*"press_proof"[\s\S]*key:\s*"offset_final"/)
  assert.match(source, /if\s*\(!config\.enabled\)\s*\{[\s\S]*colorMode:\s*"rgb"[\s\S]*outputIntentProfileId:\s*"srgb"/)
  assert.match(source, /return\s*\{[\s\S]*colorMode:\s*"cmyk"[\s\S]*outputIntentProfileId:\s*"coated-fogra39"/)
})

test("export pdf dialog relies on print presets instead of a separate print-pro switch", () => {
  const source = readText("components/dialogs/ExportPdfDialog.tsx")
  assert.match(source, /Label>Print Presets<\/Label>/)
  assert.doesNotMatch(source, /Print Pro/)
  assert.doesNotMatch(source, /onExportPrintProChange/)
})

test("export pdf dialog groups units and paper size in one dark-mode-safe section", () => {
  const source = readText("components/dialogs/ExportPdfDialog.tsx")
  assert.match(source, /isDarkUi:\s*boolean/)
  assert.match(source, /Label>Units \/ Paper Size<\/Label>/)
  assert.match(source, /const\s+dialogThemeClassName\s*=\s*isDarkUi\s*\?\s*"dark"\s*:\s*undefined/)
  assert.match(source, /grid-cols-\[116px_minmax\(0,1fr\)\]/)
  assert.match(source, /SelectContent className=\{dialogThemeClassName\}/)
  assert.match(source, /bg-background/)
  assert.match(source, /text-muted-foreground/)
})

test("default export preset stays on digital print in the bundled default document", () => {
  const source = JSON.parse(readText("public/feedback/default_v001.json"))
  assert.equal(source.uiSettings.exportPrintPro, false)
  assert.equal(source.uiSettings.exportBleedMm, 0)
  assert.equal(source.uiSettings.exportRegistrationMarks, false)
  assert.equal(source.uiSettings.exportFinalSafeGuides, true)
})

test("pdf font registry derives embedded families from configured font list", () => {
  const source = readText("lib/pdf-font-registry.ts")
  assert.match(source, /FONT_DEFINITIONS/)
  assert.match(source, /const\s+KNOWN_FONT_FAMILIES\s*=\s*new\s+Set<FontFamily>\(FONT_DEFINITIONS\.map\(\(entry\)\s*=>\s*entry\.value\)\)/)
  assert.match(source, /function\s+getFontSlug\(fontFamily:\s*FontFamily\):\s*string/)
  assert.match(source, /return\s+fontFamily\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\/g,\s*""\)/)
})

test("pdf font registry builds local and fallback URLs for weight-specific font assets", () => {
  const source = readText("lib/pdf-font-registry.ts")
  assert.match(source, /getFontAssetPath\(fontFamily,\s*weight,\s*italic\)/)
  assert.match(source, /function\s+getLegacyFontAssetPath\(fontFamily:\s*FontFamily,\s*weight:\s*number,\s*italic:\s*boolean\)/)
  assert.match(source, /if\s*\(weight\s*===\s*400\s*&&\s*!italic\)\s*return\s*`\/fonts\/google\/\$\{slug\}\/regular\.ttf`/)
  assert.match(source, /if\s*\(weight\s*===\s*700\s*&&\s*italic\)\s*return\s*`\/fonts\/google\/\$\{slug\}\/bolditalic\.ttf`/)
  assert.match(source, /discoverGoogleRepoVariableSources\(fontFamily\)/)
  assert.match(source, /const\s+urls\s*=\s*\[getFontAssetPath\(fontFamily,\s*weight,\s*italic\)\]/)
  assert.match(source, /if\s*\(remote\)\s*urls\.push\(italic\s*\?\s*remote\.italic\s*:\s*remote\.regular\)/)
  assert.match(source, /getFontVariants\(fontFamily\)\.reduce/)
  assert.match(source, /getPdfEmbeddedWeightFamilyName\(fontFamily,\s*weight\)/)
  assert.match(source, /fetchFirstAvailableBase64\(assets\.normal\.urls\)/)
  assert.match(source, /fetchFirstAvailableBase64\(\(assets\.italic\s*\?\?\s*assets\.normal\)\.urls\)/)
  assert.match(source, /await\s+registerGoogleVariableFamily\(pdf\s+as\s+PdfWithRegistry,\s*fontFamily\)/)
})
