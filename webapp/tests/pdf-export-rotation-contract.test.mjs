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
  assert.match(source, /const\s+measureWidth\s*=\s*\(text:\s*string\)\s*=>\s*\{[\s\S]*?textMeasureContext\.measureText\(text\)\.width[\s\S]*?return\s+pdf\.getTextWidth\(text\)[\s\S]*?\}/)
  assert.match(source, /wrapText:\s*\(\{\s*context,\s*text,\s*maxWidth,\s*hyphenate\s*\}\)\s*=>\s*wrapText\(text,\s*maxWidth,\s*hyphenate,\s*context\.measureWidth\)/)
  assert.match(source, /textAscent:\s*\(\{\s*context,\s*fontSize\s*\}\)\s*=>[\s\S]*?estimateTextAscent\(textMeasureContext,\s*context\.canvasFont,\s*fontSize\)/)
  assert.match(source, /pdf\.setFontSize\(plan\.fontSize\s*\*\s*scale\)/)
})

test("pdf export manually right-aligns text anchors before draw to avoid rotated alignment drift", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /const\s+drawAlign:\s*TextAlignMode\s*=\s*plan\.textAlign\s*===\s*"right"\s*\?\s*"left"\s*:\s*plan\.textAlign/)
  assert.match(source, /const\s+drawX\s*=\s*plan\.textAlign\s*===\s*"right"[\s\S]*?command\.x\s*-\s*measureWidthSource\(command\.text\)/)
})

test("pdf export draws image placeholders only when placeholder layer is visible", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /if\s*\(showTypography\s*&&\s*showImagePlaceholders\)\s*\{/)
  assert.match(source, /setFillColorCmyk\(pdf,\s*fillColor\)/)
  assert.match(source, /drawFilledRect\(x,\s*y,\s*blockWidth,\s*blockHeight\)/)
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

test("pdf font registry derives embedded families from configured font list", () => {
  const source = readText("lib/pdf-font-registry.ts")
  assert.match(source, /FONT_DEFINITIONS/)
  assert.match(source, /const\s+KNOWN_FONT_FAMILIES\s*=\s*new\s+Set<FontFamily>\(FONT_DEFINITIONS\.map\(\(entry\)\s*=>\s*entry\.value\)\)/)
  assert.match(source, /function\s+getFontSlug\(fontFamily:\s*FontFamily\):\s*string/)
  assert.match(source, /return\s+fontFamily\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\/g,\s*""\)/)
})

test("pdf font registry uses local Google variable assets for non-Inter families", () => {
  const source = readText("lib/pdf-font-registry.ts")
  assert.match(source, /const\s+localRegularUrl\s*=\s*`\/fonts\/google\/\$\{slug\}\/regular\.ttf`/)
  assert.match(source, /const\s+localBoldUrl\s*=\s*`\/fonts\/google\/\$\{slug\}\/bold\.ttf`/)
  assert.match(source, /const\s+localItalicUrl\s*=\s*`\/fonts\/google\/\$\{slug\}\/italic\.ttf`/)
  assert.match(source, /const\s+localBoldItalicUrl\s*=\s*`\/fonts\/google\/\$\{slug\}\/bolditalic\.ttf`/)
  assert.match(source, /discoverGoogleRepoVariableSources\(fontFamily\)/)
  assert.match(source, /const\s+regularUrls\s*=\s*remote\s*\?\s*\[localRegularUrl,\s*remote\.regular\]\s*:\s*\[localRegularUrl\]/)
  assert.match(source, /const\s+boldUrls\s*=\s*remote\s*\?\s*\[localBoldUrl,\s*remote\.regular\]\s*:\s*\[localBoldUrl\]/)
  assert.match(source, /const\s+boldItalicUrls\s*=\s*remote\s*\?\s*\[localBoldItalicUrl,\s*remote\.italic\]\s*:\s*\[localBoldItalicUrl\]/)
  assert.match(source, /fetchFirstAvailableBase64\(assets\.normal\.urls\)/)
  assert.match(source, /await\s+registerGoogleVariableFamily\(pdf\s+as\s+PdfWithRegistry,\s*fontFamily\)/)
})
