import test from "node:test"
import assert from "node:assert/strict"

import { wrapText } from "../lib/text-layout.ts"

const monoMeasure = (text) => text.length

test("syllable division splits words at line end when threshold allows it", () => {
  const lines = wrapText("alpha betagamma", 12, true, monoMeasure)
  assert.deepEqual(lines, ["alpha betag-", "amma"])
})

test("syllable division keeps word intact when less than 5 chars can fit", () => {
  const lines = wrapText("alpha betagamma", 11, true, monoMeasure)
  assert.deepEqual(lines, ["alpha", "betagamma"])
})

test("long words still hyphenate even without a current line prefix", () => {
  const lines = wrapText("hypercommunication", 8, true, monoMeasure)
  assert.ok(lines.length > 1)
  assert.ok(lines.slice(0, -1).every((line) => line.endsWith("-")))
})
