import test from "node:test"
import assert from "node:assert/strict"

import { computeSingleColumnLineTops } from "../lib/reflow-line-placement.ts"

test("single-column placement skips vertical gutters", () => {
  const tops = computeSingleColumnLineTops({
    firstLineTopY: 12,
    lineStep: 12,
    pageBottomY: 220,
    lineCount: 20,
    contentTop: 0,
    moduleHeightPx: 72,
    moduleCyclePx: 84,
  })

  assert.ok(tops.length > 0)
  assert.equal(tops[0], 12)
  assert.ok(tops.includes(84))
  for (const top of tops) {
    const cycleOffset = ((top % 84) + 84) % 84
    assert.ok(cycleOffset < 72, `line top ${top} landed in gutter band`)
  }
})

test("single-column placement stops at page bottom", () => {
  const tops = computeSingleColumnLineTops({
    firstLineTopY: 12,
    lineStep: 12,
    pageBottomY: 130,
    lineCount: 50,
    contentTop: 0,
    moduleHeightPx: 72,
    moduleCyclePx: 84,
  })

  assert.ok(tops.length > 0)
  assert.ok(tops.every((top) => top < 130))
  assert.equal(tops[tops.length - 1], 120)
})

test("single-column placement advances first line out of gutter", () => {
  const tops = computeSingleColumnLineTops({
    firstLineTopY: 78,
    lineStep: 12,
    pageBottomY: 170,
    lineCount: 5,
    contentTop: 0,
    moduleHeightPx: 72,
    moduleCyclePx: 84,
  })

  assert.equal(tops[0], 90)
})
