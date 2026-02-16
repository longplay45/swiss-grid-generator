import test from "node:test"
import assert from "node:assert/strict"
import { performance } from "node:perf_hooks"

import { generateSwissGrid } from "../lib/grid-calculator.ts"
import { computeReflowPlan } from "../lib/reflow-planner.ts"

function runTimed(iterations, fn) {
  const warmup = Math.min(200, Math.max(20, Math.floor(iterations / 10)))
  for (let i = 0; i < warmup; i += 1) fn(i)
  const start = performance.now()
  for (let i = 0; i < iterations; i += 1) fn(i)
  return performance.now() - start
}

test("perf smoke: generateSwissGrid remains fast for common presets", () => {
  const cases = [
    { format: "A4", orientation: "portrait", marginMethod: 1, gridCols: 6, gridRows: 8, baseline: 12, baselineMultiple: 1, gutterMultiple: 1, typographyScale: "swiss" },
    { format: "A4", orientation: "landscape", marginMethod: 2, gridCols: 8, gridRows: 6, baseline: 10, baselineMultiple: 1, gutterMultiple: 0.5, typographyScale: "golden" },
    { format: "A3", orientation: "portrait", marginMethod: 1, gridCols: 7, gridRows: 9, baseline: 14, baselineMultiple: 1, gutterMultiple: 1, typographyScale: "fourth" },
    { format: "A5", orientation: "portrait", marginMethod: 3, gridCols: 4, gridRows: 6, baseline: 8, baselineMultiple: 1, gutterMultiple: 0.5, typographyScale: "fifth" },
    { format: "LETTER", orientation: "portrait", marginMethod: 1, gridCols: 5, gridRows: 7, baseline: 11, baselineMultiple: 1, gutterMultiple: 1, typographyScale: "fibonacci" },
  ]

  const durationMs = runTimed(30000, (i) => {
    generateSwissGrid(cases[i % cases.length])
  })

  // Generous guardrail to detect major slowdowns.
  assert.ok(durationMs < 1500, `generateSwissGrid regression: ${durationMs.toFixed(2)}ms for 30k runs`)
})

test("perf smoke: computeReflowPlan stays within regression budget", () => {
  const blockOrder = [
    "display",
    "headline",
    "subhead",
    "body",
    "caption",
    ...Array.from({ length: 30 }, (_, i) => `custom_${i + 1}`),
  ]
  const blockColumnSpans = {}
  const sourcePositions = {}
  for (const [index, key] of blockOrder.entries()) {
    blockColumnSpans[key] = key === "display" ? 12 : Math.max(1, ((index * 2) % 6) + 1)
    sourcePositions[key] = { col: index % 9, row: (index * 1.7) % 24 }
  }

  const input = {
    gridCols: 12,
    gridRows: 18,
    blockOrder,
    blockColumnSpans,
    sourcePositions,
    pageHeight: 1180,
    marginTop: 48,
    marginBottom: 72,
    gridUnit: 12,
    moduleHeight: 72,
    gridMarginVertical: 12,
  }

  const durationMs = runTimed(300, () => {
    computeReflowPlan(input)
  })

  // Reflow is heavier; this budget catches large regressions while avoiding flakiness.
  assert.ok(durationMs < 2500, `computeReflowPlan regression: ${durationMs.toFixed(2)}ms for 300 runs`)
})

