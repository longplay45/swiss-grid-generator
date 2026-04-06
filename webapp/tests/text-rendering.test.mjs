import test from "node:test"
import assert from "node:assert/strict"

import { drawCanvasText, measureCanvasTextWidth } from "../lib/text-rendering.ts"

function createKerningContext() {
  const calls = []
  const widths = new Map([
    ["A", 40],
    ["V", 40],
    ["AV", 74],
  ])

  const context = {
    font: "400 80px Inter",
    textAlign: "left",
    fontKerning: "normal",
    measureText(text) {
      return { width: widths.get(text) ?? text.length * 40 }
    },
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    fillText(text, x, y) {
      calls.push({ text, x, y })
    },
  }

  const measureGlyphBounds = (glyph) => {
    if (glyph === "A") {
      return { advanceWidth: 40, leftBoundary: 2, rightBoundary: 25 }
    }
    if (glyph === "V") {
      return { advanceWidth: 40, leftBoundary: 15, rightBoundary: 38 }
    }
    return null
  }

  return { context, calls, measureGlyphBounds }
}

test("measureCanvasTextWidth keeps metric kerning when optical mode is off", () => {
  const { context } = createKerningContext()
  assert.equal(measureCanvasTextWidth(context, "AV", 0, 80, false), 74)
})

test("measureCanvasTextWidth tightens expressive pairs in optical mode", () => {
  const { context, measureGlyphBounds } = createKerningContext()
  const opticalWidth = measureCanvasTextWidth(context, "AV", 0, 80, true, measureGlyphBounds)
  assert.ok(opticalWidth < 74)
})

test("drawCanvasText places optical pairs with explicit pair spacing", () => {
  const { context, calls, measureGlyphBounds } = createKerningContext()

  drawCanvasText(context, {
    text: "AV",
    x: 0,
    y: 90,
    trackingScale: 0,
    opticalKerning: true,
    measureGlyphBounds,
  })

  assert.deepEqual(calls[0], { text: "A", x: 0, y: 90 })
  assert.equal(calls[1]?.text, "V")
  assert.ok((calls[1]?.x ?? 40) < 34)
})

test("drawCanvasText keeps the right edge stable regardless of the opening glyph width", () => {
  const calls = []
  const widths = new Map([
    ["I", 10],
    ["A", 40],
    ["V", 40],
    ["IV", 44],
    ["AV", 74],
  ])

  const context = {
    font: "400 80px Inter",
    textAlign: "left",
    fontKerning: "normal",
    measureText(text) {
      return { width: widths.get(text) ?? text.length * 40 }
    },
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    fillText(text, x, y) {
      calls.push({ text, x, y })
    },
  }

  drawCanvasText(context, {
    text: "AV",
    x: 100,
    y: 90,
    textAlign: "right",
    trackingScale: 0,
    opticalKerning: false,
  })
  const avCalls = calls.splice(0)

  drawCanvasText(context, {
    text: "IV",
    x: 100,
    y: 90,
    textAlign: "right",
    trackingScale: 0,
    opticalKerning: false,
  })
  const ivCalls = calls.splice(0)

  assert.equal(avCalls[1]?.text, "V")
  assert.equal(ivCalls[1]?.text, "V")
  assert.equal(avCalls[1]?.x, ivCalls[1]?.x)
  assert.equal(avCalls[1]?.x, 60)
})

test("drawCanvasText keeps centered strings on the same midpoint regardless of the opening glyph width", () => {
  const calls = []
  const widths = new Map([
    ["I", 10],
    ["A", 40],
    ["V", 40],
    ["IV", 44],
    ["AV", 74],
  ])

  const context = {
    font: "400 80px Inter",
    textAlign: "left",
    fontKerning: "normal",
    measureText(text) {
      return { width: widths.get(text) ?? text.length * 40 }
    },
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    fillText(text, x, y) {
      calls.push({ text, x, y })
    },
  }

  drawCanvasText(context, {
    text: "AV",
    x: 100,
    y: 90,
    textAlign: "center",
    trackingScale: 0,
    opticalKerning: false,
  })
  const avCalls = calls.splice(0)

  drawCanvasText(context, {
    text: "IV",
    x: 100,
    y: 90,
    textAlign: "center",
    trackingScale: 0,
    opticalKerning: false,
  })
  const ivCalls = calls.splice(0)

  const avMidpoint = ((avCalls[0]?.x ?? 0) + (avCalls[1]?.x ?? 0) + 40) / 2
  const ivMidpoint = ((ivCalls[0]?.x ?? 0) + (ivCalls[1]?.x ?? 0) + 40) / 2

  assert.equal(avMidpoint, 100)
  assert.equal(ivMidpoint, 100)
})
