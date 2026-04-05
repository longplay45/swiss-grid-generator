import test from "node:test"
import assert from "node:assert/strict"

import { wrapText, wrapTextDetailed } from "../lib/text-layout.ts"

const monoMeasure = (text) => text.length

test("syllable division splits words at line end when threshold allows it", () => {
  const lines = wrapText("alpha betagamma", 12, true, monoMeasure)
  assert.deepEqual(lines, ["alpha beta-", "gamma"])
})

test("syllable division can split earlier when only a short remainder fits", () => {
  const lines = wrapText("alpha betagamma", 11, true, monoMeasure)
  assert.deepEqual(lines, ["alpha beta-", "gamma"])
})

test("long words still hyphenate even without a current line prefix", () => {
  const lines = wrapText("hypercommunication", 8, true, monoMeasure)
  assert.ok(lines.length > 1)
  assert.ok(lines.slice(0, -1).every((line) => line.endsWith("-")))
})

test("wrapText preserves multiple spaces inside a line", () => {
  const lines = wrapText("A   B", 10, false, monoMeasure)
  assert.deepEqual(lines, ["A   B"])
})

test("wrapText breaks using the real whitespace width instead of collapsing it", () => {
  const lines = wrapText("A   B", 4, false, monoMeasure)
  assert.deepEqual(lines, ["A   ", "B"])
})

test("wrapTextDetailed preserves blank lines and repeated spaces in source ranges", () => {
  const lines = wrapTextDetailed("A   B\n\n  C", 20, false, monoMeasure)
  assert.deepEqual(lines, [
    { text: "A   B", sourceStart: 0, sourceEnd: 5 },
    { text: "", sourceStart: 6, sourceEnd: 6 },
    { text: "  C", sourceStart: 7, sourceEnd: 10 },
  ])
})

test("wrapTextDetailed marks wrapped leading whitespace as non-rendering boundary space", () => {
  const lines = wrapTextDetailed("Swiss  Style", 6, false, monoMeasure)
  assert.deepEqual(lines, [
    { text: "Swiss", sourceStart: 0, sourceEnd: 5 },
    { text: "  Style", sourceStart: 5, sourceEnd: 12, leadingBoundaryWhitespace: 2 },
  ])
  assert.deepEqual(wrapText("Swiss  Style", 6, false, monoMeasure), [
    "Swiss",
    "Style",
  ])
})
