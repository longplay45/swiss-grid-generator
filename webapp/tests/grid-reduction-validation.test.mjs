import test from "node:test"
import assert from "node:assert/strict"

import { findTextLayerGridReductionConflicts } from "../lib/grid-reduction-validation.ts"

test("column reduction is blocked when a paragraph span exceeds the proposed grid", () => {
  const conflicts = findTextLayerGridReductionConflicts({
    blockOrder: ["body"],
    blockModulePositions: {
      body: { column: 1, row: 0, baselineOffset: 0 },
    },
    resolveBlockSpan: () => 2,
    resolveBlockRows: () => 1,
    nextGridCols: 2,
    nextGridRows: 6,
  })

  assert.deepEqual(conflicts.columnConflicts, ["body"])
  assert.deepEqual(conflicts.rowConflicts, [])
})

test("row reduction is blocked when a paragraph row span would exceed the proposed grid", () => {
  const conflicts = findTextLayerGridReductionConflicts({
    blockOrder: ["caption"],
    blockModulePositions: {
      caption: { column: 0, row: 3, baselineOffset: 1 },
    },
    resolveBlockSpan: () => 1,
    resolveBlockRows: () => 2,
    nextGridCols: 3,
    nextGridRows: 4,
  })

  assert.deepEqual(conflicts.columnConflicts, [])
  assert.deepEqual(conflicts.rowConflicts, ["caption"])
})

test("reduction validation passes when positioned paragraphs remain within the proposed grid", () => {
  const conflicts = findTextLayerGridReductionConflicts({
    blockOrder: ["headline", "body"],
    blockModulePositions: {
      headline: { column: 0, row: 0, baselineOffset: 0 },
      body: { column: 2, row: 1, baselineOffset: 2 },
    },
    resolveBlockSpan: (key) => (key === "headline" ? 2 : 1),
    resolveBlockRows: () => 1,
    nextGridCols: 4,
    nextGridRows: 4,
  })

  assert.deepEqual(conflicts.columnConflicts, [])
  assert.deepEqual(conflicts.rowConflicts, [])
})
