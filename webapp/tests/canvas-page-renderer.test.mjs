import test from "node:test"
import assert from "node:assert/strict"

import { resolveScaledCanvasFontSize } from "../lib/canvas-render-math.ts"

test("resolveScaledCanvasFontSize scales explicit block overrides with the canvas scale", () => {
  assert.equal(resolveScaledCanvasFontSize(400, 0.25, 12), 100)
  assert.equal(resolveScaledCanvasFontSize(96, 0.5, 12), 48)
})

test("resolveScaledCanvasFontSize falls back to the default size for invalid overrides", () => {
  assert.equal(resolveScaledCanvasFontSize(0, 0.25, 12), 12)
  assert.equal(resolveScaledCanvasFontSize(Number.NaN, 0.25, 12), 12)
})
