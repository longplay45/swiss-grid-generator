import test from "node:test"
import assert from "node:assert/strict"

import { resolveNearestPreviewColumn } from "../lib/preview-column-snap.ts"

test("resolveNearestPreviewColumn snaps left of the page into negative overhang columns", () => {
  const colStarts = [0, 100, 200, 300]
  const firstColumnStep = 100

  assert.equal(resolveNearestPreviewColumn(-20, colStarts, firstColumnStep), 0)
  assert.equal(resolveNearestPreviewColumn(-60, colStarts, firstColumnStep), -1)
  assert.equal(resolveNearestPreviewColumn(-260, colStarts, firstColumnStep), -3)
})

test("resolveNearestPreviewColumn keeps in-grid snapping unchanged", () => {
  const colStarts = [0, 100, 200, 300]
  const firstColumnStep = 100

  assert.equal(resolveNearestPreviewColumn(20, colStarts, firstColumnStep), 0)
  assert.equal(resolveNearestPreviewColumn(160, colStarts, firstColumnStep), 2)
  assert.equal(resolveNearestPreviewColumn(340, colStarts, firstColumnStep), 3)
})
