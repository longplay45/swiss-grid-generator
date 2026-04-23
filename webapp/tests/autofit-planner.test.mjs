import test from "node:test"
import assert from "node:assert/strict"

import { computeAutoFitBatch } from "../lib/autofit-planner.ts"

function makeInput() {
  return {
    items: [
      {
        key: "body",
        text: "This is a long body text block intended to trigger column expansion.",
        style: {
          size: 12,
          baselineMultiplier: 1.2,
          fontFamily: "Inter",
          fontWeight: 400,
          italic: false,
          opticalKerning: true,
          trackingScale: 0,
          trackingRuns: [],
        },
        rowSpan: 2,
        heightBaselines: 0,
        syllableDivision: true,
        position: { col: 1, row: 6 },
        currentSpan: 1,
      },
      {
        key: "caption",
        text: "Caption",
        style: {
          size: 10,
          baselineMultiplier: 1.0,
          fontFamily: "Inter",
          fontWeight: 400,
          italic: false,
          opticalKerning: true,
          trackingScale: 0,
          trackingRuns: [],
        },
        rowSpan: 1,
        heightBaselines: 0,
        syllableDivision: false,
        position: { col: 5, row: 12 },
        currentSpan: 1,
      },
    ],
    scale: 1,
    gridCols: 8,
    moduleWidth: 48,
    moduleHeight: 72,
    gridMarginVertical: 12,
    gridUnit: 12,
    marginTop: 36,
    marginBottom: 48,
    pageHeight: 842,
  }
}

test("computeAutoFitBatch is deterministic and stays within grid bounds", () => {
  const input = makeInput()
  const measure = (_font, text) => text.length * 6.4

  const outputA = computeAutoFitBatch(input, measure)
  const outputB = computeAutoFitBatch(input, measure)
  assert.deepEqual(outputA, outputB)

  for (const item of input.items) {
    const span = outputA.spanUpdates[item.key] ?? item.currentSpan
    assert.ok(span >= 1, "span must be >= 1")
    assert.ok(span <= input.gridCols, "span must be <= grid cols")

    const pos = outputA.positionUpdates[item.key] ?? item.position
    assert.ok(pos.col >= 0, "col must be >= 0")
    assert.ok(pos.col + span <= input.gridCols, "placement must fit grid width")
    assert.ok(pos.row >= 0, "row must be >= 0")
  }
})

test("computeAutoFitBatch produces no updates for empty text blocks", () => {
  const input = makeInput()
  input.items = [
    {
      ...input.items[0],
      key: "empty",
      text: "   ",
    },
  ]

  const output = computeAutoFitBatch(input, (_font, text) => text.length * 6)
  assert.deepEqual(output, { spanUpdates: {}, positionUpdates: {} })
})

test("computeAutoFitBatch respects tracking in width measurement", () => {
  const input = makeInput()
  input.items = [
    {
      ...input.items[0],
      key: "tracked",
      text: "Tracked width sample text",
      currentSpan: 1,
      style: {
        ...input.items[0].style,
        trackingScale: 200,
        trackingRuns: [],
      },
    },
  ]

  const trackedOutput = computeAutoFitBatch(
    input,
    (style, text) => text.length * 4 + Math.max(0, text.length - 1) * (style.size * style.trackingScale) / 1000,
  )
  const normalOutput = computeAutoFitBatch({
    ...input,
    items: [{ ...input.items[0], style: { ...input.items[0].style, trackingScale: 0 } }],
  }, (style, text) => text.length * 4 + Math.max(0, text.length - 1) * (style.size * style.trackingScale) / 1000)

  assert.ok((trackedOutput.spanUpdates.tracked ?? 1) >= (normalOutput.spanUpdates.tracked ?? 1))
})

test("computeAutoFitBatch counts extra baseline height when estimating column capacity", () => {
  const input = makeInput()
  input.items = [
    {
      ...input.items[0],
      key: "baseline-height",
      rowSpan: 0,
      heightBaselines: 6,
      currentSpan: 1,
      text: "One two three four five six seven eight nine ten eleven twelve thirteen fourteen",
    },
  ]

  const withBaselines = computeAutoFitBatch(input, (_style, text) => text.length * 5)
  const withoutBaselines = computeAutoFitBatch({
    ...input,
    items: [{ ...input.items[0], heightBaselines: 0 }],
  }, (_style, text) => text.length * 5)

  assert.ok(
    (withBaselines.spanUpdates["baseline-height"] ?? 1) <= (withoutBaselines.spanUpdates["baseline-height"] ?? 1),
  )
})

test("computeAutoFitBatch preserves an existing paragraph span when extra baseline capacity would make fewer columns sufficient", () => {
  const input = makeInput()
  input.items = [
    {
      ...input.items[0],
      key: "preserve-span",
      currentSpan: 4,
      rowSpan: 0,
      heightBaselines: 12,
      text: "One two three four five six seven eight nine ten",
    },
  ]

  const output = computeAutoFitBatch(input, (_style, text) => text.length * 5)

  assert.equal(output.spanUpdates["preserve-span"], undefined)
})

test("computeAutoFitBatch passes range-aware measurements for mixed tracking runs", () => {
  const input = makeInput()
  input.items = [
    {
      ...input.items[0],
      key: "mixed-tracking",
      text: "ABCD EFGH IJKL",
      currentSpan: 1,
      style: {
        ...input.items[0].style,
        trackingScale: 0,
        trackingRuns: [{ start: 0, end: 4, trackingScale: 250 }],
      },
    },
  ]

  const measuredRanges = []
  computeAutoFitBatch(input, (_style, text, range) => {
    measuredRanges.push(range ? `${range.start}:${range.end}:${text}` : `-:${text}`)
    return text.length * 4
      + (range && range.start === 0 && range.end === 4 ? 40 : 0)
  })

  assert.ok(
    measuredRanges.some((entry) => entry.startsWith("0:4:")),
    "expected auto-fit wrapping to request range-aware measurements",
  )
})
