import test from "node:test"
import assert from "node:assert/strict"

import { getOpticalMarginAnchorOffset } from "../lib/optical-margin.ts"

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

test("right-aligned trailing punctuation stays inside column edge", () => {
  const offset = getOpticalMarginAnchorOffset({
    line: "Swiss.",
    align: "right",
    fontSize: 10,
    measureWidth: monoMeasure,
  })
  assert.equal(offset, 0)
})

test("leading uppercase letter receives optical offset", () => {
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
