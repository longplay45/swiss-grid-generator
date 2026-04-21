import test from "node:test"
import assert from "node:assert/strict"

import { clampTextBlockAnchorPosition } from "../lib/text-block-anchor-clamp.ts"

test("paragraph span overhang keeps its anchored column while rows still clamp into the grid", () => {
  const next = clampTextBlockAnchorPosition({
    position: {
      column: 2,
      row: 5,
      baselineOffset: 0,
    },
    span: 4,
    rows: 2,
    gridCols: 4,
    gridRows: 6,
    fitColsWithinGrid: false,
    fitRowsWithinGrid: true,
  })

  assert.deepEqual(next, {
    column: 2,
    row: 4,
    baselineOffset: 0,
  })
})
