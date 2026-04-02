import test from "node:test"
import assert from "node:assert/strict"

import {
  toAbsoluteTextBlockPosition,
  toTextBlockPosition,
} from "../lib/text-block-position.ts"

test("legacy absolute text positions normalize into logical grid anchors", () => {
  const rowStartsInBaselines = [0, 6, 15]

  const logical = toTextBlockPosition({ col: 2, row: 8 }, rowStartsInBaselines)

  assert.deepEqual(logical, {
    column: 2,
    row: 1,
    baselineOffset: 2,
  })
})

test("logical text anchors resolve back to absolute baseline rows for the active grid", () => {
  const rowStartsInBaselines = [0, 6, 15]

  const absolute = toAbsoluteTextBlockPosition({
    column: 2,
    row: 1,
    baselineOffset: 2,
  }, rowStartsInBaselines)

  assert.deepEqual(absolute, {
    col: 2,
    row: 8,
  })
})

test("logical anchors stay on the same row index when row starts change", () => {
  const logical = {
    column: 3,
    row: 1,
    baselineOffset: 1,
  }

  const original = toAbsoluteTextBlockPosition(logical, [0, 6, 12])
  const remapped = toAbsoluteTextBlockPosition(logical, [0, 9, 19])

  assert.deepEqual(original, { col: 3, row: 7 })
  assert.deepEqual(remapped, { col: 3, row: 10 })
})
