import test from "node:test"
import assert from "node:assert/strict"

import {
  buildResolvedSnapshotState,
  normalizeSnapshotStateForApply,
} from "../lib/preview-layout-snapshot.ts"

test("buildResolvedSnapshotState resolves spans, alignments, and row-derived fields", () => {
  const state = {
    blockOrder: ["body", "caption"],
    textContent: { body: "Body", caption: "Caption" },
    blockTextEdited: { body: true, caption: true },
    styleAssignments: { body: "body", caption: "caption" },
    blockModulePositions: {},
    blockColumnSpans: { body: 999 },
    blockRowSpans: {},
    blockTextAlignments: {},
    blockTextReflow: {},
    blockSyllableDivision: {},
    blockFontFamilies: {},
    blockBold: {},
    blockItalic: {},
    blockRotations: {},
  }

  const resolved = buildResolvedSnapshotState(state, {
    gridCols: 6,
    getDefaultColumnSpan: (key) => (key === "caption" ? 1 : 3),
    getBlockRows: (key) => (key === "caption" ? 1 : 2),
    isTextReflowEnabled: (key) => key === "body",
    isSyllableDivisionEnabled: (key) => key === "body",
    isBlockBold: (key) => key === "body",
    isBlockItalic: () => false,
    getBlockRotation: (key) => (key === "body" ? 5 : 0),
    defaultTextAlign: "left",
  })

  assert.equal(resolved.blockColumnSpans.body, 6) // clamped
  assert.equal(resolved.blockColumnSpans.caption, 1)
  assert.equal(resolved.blockTextAlignments.body, "left")
  assert.equal(resolved.blockRowSpans.body, 2)
  assert.equal(resolved.blockTextReflow.body, true)
  assert.equal(resolved.blockSyllableDivision.body, true)
  assert.equal(resolved.blockBold.body, true)
  assert.equal(resolved.blockRotations.body, 5)
})

test("normalizeSnapshotStateForApply strips default font and tiny rotations", () => {
  const state = {
    blockOrder: ["body", "caption"],
    textContent: { body: "Body", caption: "Caption" },
    blockTextEdited: { body: true, caption: true },
    styleAssignments: { body: "body", caption: "caption" },
    blockModulePositions: {},
    blockColumnSpans: { body: 2, caption: 1 },
    blockRowSpans: { body: 1, caption: 1 },
    blockTextAlignments: { body: "left", caption: "left" },
    blockTextReflow: { body: true, caption: false },
    blockSyllableDivision: { body: true, caption: false },
    blockFontFamilies: { body: "Inter", caption: "Besley" },
    blockBold: { body: false, caption: true },
    blockItalic: { body: false, caption: false },
    blockRotations: { body: 0.00001, caption: 12 },
  }

  const normalized = normalizeSnapshotStateForApply(state, {
    baseFont: "Inter",
    isFontFamily: (value) => typeof value === "string",
  })

  assert.equal(normalized.blockFontFamilies.body, undefined)
  assert.equal(normalized.blockFontFamilies.caption, "Besley")
  assert.equal(normalized.blockRotations.body, undefined)
  assert.equal(normalized.blockRotations.caption, 12)
})
