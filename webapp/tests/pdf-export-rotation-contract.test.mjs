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

test("pdf export line wrapping uses PDF font metrics for width measurement", () => {
  const source = readText("lib/pdf-vector-export.ts")
  assert.match(source, /const\s+measureWidth\s*=\s*\(text:\s*string\)\s*=>\s*pdf\.getTextWidth\(text\)/)
  assert.match(source, /const\s+captionMeasureWidth\s*=\s*\(text:\s*string\)\s*=>\s*pdf\.getTextWidth\(text\)/)
})
