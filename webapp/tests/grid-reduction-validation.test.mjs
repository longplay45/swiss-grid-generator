import test from "node:test"
import assert from "node:assert/strict"

import { generateSwissGrid } from "../lib/grid-calculator.ts"
import {
  findTextLayerGridReductionConflicts,
  getGridRowStartsInBaselines,
} from "../lib/grid-reduction-validation.ts"

test("column reduction is blocked when a paragraph span exceeds the proposed grid", () => {
  const result = generateSwissGrid({
    format: "A4",
    orientation: "portrait",
    marginMethod: 1,
    gridCols: 2,
    gridRows: 6,
    baseline: 12,
  })

  const conflicts = findTextLayerGridReductionConflicts({
    blockOrder: ["body"],
    blockModulePositions: {
      body: { col: 1, row: 0 },
    },
    resolveBlockSpan: () => 2,
    resolveBlockRows: () => 1,
    nextGridCols: 2,
    nextGridRows: 6,
    nextRowStartsInBaselines: getGridRowStartsInBaselines(result),
  })

  assert.deepEqual(conflicts.columnConflicts, ["body"])
  assert.deepEqual(conflicts.rowConflicts, [])
})

test("row reduction is blocked when a paragraph row span would exceed the proposed grid", () => {
  const result = generateSwissGrid({
    format: "A4",
    orientation: "portrait",
    marginMethod: 1,
    gridCols: 3,
    gridRows: 4,
    baseline: 12,
  })
  const rowStarts = getGridRowStartsInBaselines(result)

  const conflicts = findTextLayerGridReductionConflicts({
    blockOrder: ["caption"],
    blockModulePositions: {
      caption: { col: 0, row: rowStarts[3] ?? 0 },
    },
    resolveBlockSpan: () => 1,
    resolveBlockRows: () => 2,
    nextGridCols: 3,
    nextGridRows: 4,
    nextRowStartsInBaselines: rowStarts,
  })

  assert.deepEqual(conflicts.columnConflicts, [])
  assert.deepEqual(conflicts.rowConflicts, ["caption"])
})

test("reduction validation passes when positioned paragraphs remain within the proposed grid", () => {
  const result = generateSwissGrid({
    format: "A4",
    orientation: "portrait",
    marginMethod: 1,
    gridCols: 4,
    gridRows: 4,
    baseline: 12,
  })
  const rowStarts = getGridRowStartsInBaselines(result)

  const conflicts = findTextLayerGridReductionConflicts({
    blockOrder: ["headline", "body"],
    blockModulePositions: {
      headline: { col: 0, row: rowStarts[0] ?? 0 },
      body: { col: 2, row: rowStarts[1] ?? 0 },
    },
    resolveBlockSpan: (key) => (key === "headline" ? 2 : 1),
    resolveBlockRows: () => 1,
    nextGridCols: 4,
    nextGridRows: 4,
    nextRowStartsInBaselines: rowStarts,
  })

  assert.deepEqual(conflicts.columnConflicts, [])
  assert.deepEqual(conflicts.rowConflicts, [])
})
