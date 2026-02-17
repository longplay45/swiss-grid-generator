import test from "node:test"
import assert from "node:assert/strict"

import { computeAutoFitBatch } from "../lib/autofit-planner.ts"

function makeInput() {
  return {
    items: [
      {
        key: "body",
        text: "This is a long body text block intended to trigger column expansion.",
        style: { size: 12, baselineMultiplier: 1.2, weight: "Regular" },
        rowSpan: 2,
        syllableDivision: true,
        position: { col: 1, row: 6 },
        currentSpan: 1,
      },
      {
        key: "caption",
        text: "Caption",
        style: { size: 10, baselineMultiplier: 1.0, weight: "Regular" },
        rowSpan: 1,
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
