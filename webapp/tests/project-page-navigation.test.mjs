import test from "node:test"
import assert from "node:assert/strict"

import { resolveAdjacentProjectPageId } from "../lib/project-page-navigation.ts"

test("resolveAdjacentProjectPageId moves to the previous and next page", () => {
  const pageIds = ["page-1", "page-2", "page-3"]

  assert.equal(resolveAdjacentProjectPageId(pageIds, "page-2", "previous"), "page-1")
  assert.equal(resolveAdjacentProjectPageId(pageIds, "page-2", "next"), "page-3")
})

test("resolveAdjacentProjectPageId clamps at the document edges", () => {
  const pageIds = ["page-1", "page-2", "page-3"]

  assert.equal(resolveAdjacentProjectPageId(pageIds, "page-1", "previous"), null)
  assert.equal(resolveAdjacentProjectPageId(pageIds, "page-3", "next"), null)
})

test("resolveAdjacentProjectPageId returns null for single-page and unknown-page cases", () => {
  assert.equal(resolveAdjacentProjectPageId(["page-1"], "page-1", "next"), null)
  assert.equal(resolveAdjacentProjectPageId(["page-1", "page-2"], "page-x", "next"), null)
})
