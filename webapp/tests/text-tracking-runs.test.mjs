import test from "node:test"
import assert from "node:assert/strict"

import {
  applyTrackingScaleToRange,
  getUniformTrackingScaleForRange,
  normalizeTextTrackingRuns,
  remapTrackingRunsForTextEdit,
} from "../lib/text-tracking-runs.ts"

test("normalizeTextTrackingRuns merges adjacent runs and drops base-tracking ranges", () => {
  const runs = normalizeTextTrackingRuns("Swiss Grid", [
    { start: 0, end: 2, trackingScale: 80 },
    { start: 2, end: 5, trackingScale: 80 },
    { start: 6, end: 10, trackingScale: 0 },
  ], 0)

  assert.deepEqual(runs, [
    { start: 0, end: 5, trackingScale: 80 },
  ])
})

test("applyTrackingScaleToRange writes a character-level tracking run only for the selected range", () => {
  const runs = applyTrackingScaleToRange(
    "Swiss Grid",
    { start: 6, end: 10 },
    140,
    0,
    [],
  )

  assert.deepEqual(runs, [
    { start: 6, end: 10, trackingScale: 140 },
  ])
  assert.equal(
    getUniformTrackingScaleForRange("Swiss Grid", { start: 6, end: 10 }, 0, runs),
    140,
  )
  assert.equal(
    getUniformTrackingScaleForRange("Swiss Grid", { start: 0, end: 5 }, 0, runs),
    0,
  )
})

test("remapTrackingRunsForTextEdit preserves inserted text in the active tracking run", () => {
  const previousText = "Swiss Grid"
  const nextText = "Swiss Editorial Grid"
  const nextRuns = remapTrackingRunsForTextEdit(
    previousText,
    nextText,
    [{ start: 6, end: 10, trackingScale: 120 }],
    0,
  )

  assert.deepEqual(nextRuns, [
    { start: 6, end: 20, trackingScale: 120 },
  ])
})
