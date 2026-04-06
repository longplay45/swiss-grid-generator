import test from "node:test"
import assert from "node:assert/strict"

import {
  getOpticalMarginAnchorOffset,
  getOpticalTerminalCaretAdvance,
  resolveOpticalKerningPairAdjustment,
  resolveConservativeContourBoundaryPx,
  resolveDominantStemBoundaryPx,
} from "../lib/optical-margin.ts"

const monoMeasure = (text) => text.length

test("left-aligned opening punctuation receives negative optical offset", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "\"Swiss",
    align: "left",
    fontSize: 10,
    measureWidth: monoMeasure,
  })
  assert.ok(offset < 0)
})

test("right-aligned trailing punctuation receives positive optical offset", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "Swiss.",
    align: "right",
    fontSize: 10,
    measureWidth: monoMeasure,
  })
  assert.ok(offset > 0)
})

test("right-aligned terminal hyphen receives positive optical offset", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "rhyth-",
    align: "right",
    fontSize: 10,
    measureWidth: monoMeasure,
  })
  assert.ok(offset > 0)
})

test("leading uppercase letter receives negative fallback optical offset", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "Swiss",
    align: "left",
    fontSize: 10,
    measureWidth: monoMeasure,
  })
  assert.ok(offset < 0)
})

test("lowercase leading letter also receives subtle offset", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "swiss",
    align: "left",
    fontSize: 10,
    measureWidth: monoMeasure,
  })
  assert.ok(offset < 0)
})

test("right-aligned trailing uppercase letter also receives subtle offset", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "SWISS",
    align: "right",
    fontSize: 10,
    measureWidth: monoMeasure,
  })
  assert.ok(offset > 0)
})

test("right optical offset ignores trailing whitespace", () => {
  const tight = getOpticalMarginAnchorOffset({
    line: "Sprache",
    align: "right",
    fontSize: 10,
    measureWidth: monoMeasure,
  })
  const spaced = getOpticalMarginAnchorOffset({
    line: "Sprache   ",
    align: "right",
    fontSize: 10,
    measureWidth: monoMeasure,
  })
  assert.equal(spaced, tight)
})

test("measured left optical boundary is used as the alignment source of truth", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "Swiss",
    align: "left",
    fontSize: 220,
    styleKey: "fx",
    measureWidth: () => 140,
    measureGlyphBounds: (char) => (
      char === "S"
        ? { advanceWidth: 150, leftBoundary: 18, rightBoundary: 132 }
        : null
    ),
  })
  assert.equal(offset, -18)
})

test("measured right optical boundary is used as the alignment source of truth", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "System",
    align: "right",
    fontSize: 220,
    styleKey: "display",
    measureWidth: () => 140,
    measureGlyphBounds: (char) => (
      char === "m"
        ? { advanceWidth: 146, leftBoundary: 14, rightBoundary: 138 }
        : null
    ),
  })
  assert.equal(offset, 8)
})

test("right punctuation uses the stronger of measured and styled hanging", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "Swiss.",
    align: "right",
    fontSize: 160,
    styleKey: "display",
    measureWidth: () => 44,
    measureGlyphBounds: (char) => (
      char === "."
        ? { advanceWidth: 44, leftBoundary: 12, rightBoundary: 21 }
        : null
    ),
  })
  assert.equal(offset, 39.6)
})

test("right body text uses explicit trailing letter profiles when measured overhang is weak", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "bar",
    align: "right",
    fontSize: 18,
    styleKey: "body",
    measureWidth: () => 10,
    measureGlyphBounds: (char) => (
      char === "r"
        ? { advanceWidth: 10, leftBoundary: 1, rightBoundary: 9.8 }
        : null
    ),
  })
  assert.ok(Math.abs(offset - 0.54) < 1e-9)
})

test("right-aligned terminal T uses a horizontal overhang profile rather than a stem profile", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "AT",
    align: "right",
    fontSize: 18,
    styleKey: "body",
    measureWidth: () => 10,
    measureGlyphBounds: (char) => (
      char === "T"
        ? { advanceWidth: 10, leftBoundary: 1.5, rightBoundary: 9.4 }
        : null
    ),
  })
  assert.ok(Math.abs(offset - 1.98) < 1e-9)
})

test("right-aligned terminal d uses the restrained body-text straight-letter profile", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "unified",
    align: "right",
    fontSize: 18,
    styleKey: "body",
    measureWidth: () => 10,
    measureGlyphBounds: (char) => (
      char === "d"
        ? { advanceWidth: 10, leftBoundary: 1.2, rightBoundary: 9.75 }
        : null
    ),
  })
  assert.ok(Math.abs(offset - 0.108) < 1e-9)
})

test("right-aligned terminal y uses the styled body-text profile instead of the measured contour", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "typography",
    align: "right",
    fontSize: 18,
    styleKey: "body",
    measureWidth: () => 10,
    measureGlyphBounds: (char) => (
      char === "y"
        ? { advanceWidth: 10, leftBoundary: 1.3, rightBoundary: 9.9 }
        : null
    ),
  })
  assert.ok(Math.abs(offset - 0.216) < 1e-9)
})

test("measured glyph bounds override fallback style heuristics for straight-sided letters", () => {
  const bodyOffset = getOpticalMarginAnchorOffset({
    line: "m",
    align: "left",
    fontSize: 220,
    styleKey: "body",
    measureWidth: () => 140,
    measureGlyphBounds: () => ({ advanceWidth: 140, leftBoundary: 12, rightBoundary: 128 }),
  })
  const fxOffset = getOpticalMarginAnchorOffset({
    line: "m",
    align: "left",
    fontSize: 220,
    styleKey: "fx",
    measureWidth: () => 140,
    measureGlyphBounds: () => ({ advanceWidth: 140, leftBoundary: 12, rightBoundary: 128 }),
  })
  assert.equal(fxOffset, bodyOffset)
})

test("leading T caps measured overhang to the subtle fallback offset", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "Type",
    align: "left",
    fontSize: 200,
    styleKey: "display",
    measureWidth: () => 110,
    measureGlyphBounds: (char) => (
      char === "T"
        ? { advanceWidth: 110, leftBoundary: 14, rightBoundary: 96 }
        : null
    ),
  })
  assert.equal(offset, -(0.018 * 200))
})

test("terminal punctuation caret advance uses the visible glyph boundary", () => {
  const advance = getOpticalTerminalCaretAdvance({
    char: ".",
    font: "400 160px Inter",
    fontSize: 160,
    styleKey: "display",
    measureGlyphBounds: (char) => (
      char === "."
        ? { advanceWidth: 44, leftBoundary: 12, rightBoundary: 21 }
        : null
    ),
  })
  assert.equal(advance, 21)
})

test("terminal hyphen caret advance uses the visible glyph boundary", () => {
  const advance = getOpticalTerminalCaretAdvance({
    char: "-",
    font: "400 160px Inter",
    fontSize: 160,
    styleKey: "display",
    measureGlyphBounds: (char) => (
      char === "-"
        ? { advanceWidth: 60, leftBoundary: 12, rightBoundary: 42 }
        : null
    ),
  })
  assert.equal(advance, 42)
})

test("optical kerning tightens expressive pairs more than straight pairs", () => {
  const expressiveAdjustment = resolveOpticalKerningPairAdjustment({
    left: "A",
    right: "V",
    pairAdvance: 40,
    fontSize: 80,
    leftBounds: { advanceWidth: 40, leftBoundary: 2, rightBoundary: 25 },
    rightBounds: { advanceWidth: 40, leftBoundary: 15, rightBoundary: 38 },
  })
  const straightAdjustment = resolveOpticalKerningPairAdjustment({
    left: "n",
    right: "n",
    pairAdvance: 40,
    fontSize: 80,
    leftBounds: { advanceWidth: 40, leftBoundary: 4, rightBoundary: 33 },
    rightBounds: { advanceWidth: 40, leftBoundary: 5, rightBoundary: 34 },
  })

  assert.ok(expressiveAdjustment < 0)
  assert.ok(Math.abs(expressiveAdjustment) > Math.abs(straightAdjustment))
})

test("optical kerning does not tighten across spaces", () => {
  const adjustment = resolveOpticalKerningPairAdjustment({
    left: "A",
    right: " ",
    pairAdvance: 40,
    fontSize: 80,
    leftBounds: { advanceWidth: 40, leftBoundary: 2, rightBoundary: 25 },
    rightBounds: { advanceWidth: 20, leftBoundary: 0, rightBoundary: 0 },
  })
  assert.equal(adjustment, 0)
})

test("dominant left stem collapses optical boundary back to the bbox edge", () => {
  const boundary = resolveDominantStemBoundaryPx([0, 0, 0, 0.2, 0.2, 0.4, 0.1], 40, "left", 1.2)
  assert.equal(boundary, 40)
})

test("curved left edge does not get treated as a dominant stem", () => {
  const boundary = resolveDominantStemBoundaryPx([0, 0.8, 1.7, 2.8, 3.4, 2.4, 1.6, 0.7], 40, "left", 1.2)
  assert.equal(boundary, null)
})

test("conservative contour boundary stays closer to the outer edge for curved letters", () => {
  const boundary = resolveConservativeContourBoundaryPx([0, 0.4, 1.2, 2.6, 3.1, 2.2, 1.1, 0.3], 40, "left", 0.18)
  assert.ok(boundary !== null)
  assert.ok(boundary > 40)
  assert.ok(boundary < 41.5)
})
