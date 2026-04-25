import test from "node:test"
import assert from "node:assert/strict"

import {
  applyOptionalTransferredValue,
  applyTextStyleTransferToCollections,
} from "../lib/preview-text-style-transfer.ts"

test("paragraph transfer replaces layout settings without changing text content", () => {
  const state = {
    blockOrder: ["source", "target"],
    textContent: { source: "Source", target: "Target" },
    blockTextEdited: { source: true, target: true },
    styleAssignments: { source: "body", target: "headline" },
    blockFontFamilies: {},
    blockFontWeights: {},
    blockOpticalKerning: {},
    blockTrackingScales: {},
    blockTrackingRuns: {},
    blockTextFormatRuns: {},
    blockColumnSpans: { source: 2, target: 4 },
    blockRowSpans: { source: 1, target: 3 },
    blockHeightBaselines: { source: 2, target: 0 },
    blockTextAlignments: { source: "left", target: "right" },
    blockVerticalAlignments: { source: "top", target: "bottom" },
    blockTextReflow: { source: false, target: true },
    blockSyllableDivision: { source: true, target: false },
    blockSnapToColumns: { source: true, target: false },
    blockSnapToBaseline: { source: false, target: true },
    blockItalic: {},
    blockRotations: { target: 30 },
    blockModulePositions: {},
  }

  const next = applyTextStyleTransferToCollections(state, "target", {
    sourceKey: "source",
    mode: "paragraph",
    paragraph: {
      columns: 2,
      rows: 1,
      heightBaselines: 2,
      align: "left",
      verticalAlign: "top",
      reflow: false,
      syllableDivision: true,
      snapToColumns: true,
      snapToBaseline: false,
      rotation: undefined,
    },
  })

  assert.equal(next.textContent.target, "Target")
  assert.equal(next.blockColumnSpans.target, 2)
  assert.equal(next.blockRowSpans.target, 1)
  assert.equal(next.blockHeightBaselines.target, 2)
  assert.equal(next.blockTextAlignments.target, "left")
  assert.equal(next.blockVerticalAlignments.target, "top")
  assert.equal(next.blockTextReflow.target, false)
  assert.equal(next.blockSyllableDivision.target, true)
  assert.equal(next.blockSnapToColumns.target, true)
  assert.equal(next.blockSnapToBaseline.target, false)
  assert.equal("target" in next.blockRotations, false)
})

test("typo transfer replaces paragraph-level typo state and clears scoped runs", () => {
  const state = {
    blockOrder: ["source", "target"],
    textContent: { source: "Source", target: "Target" },
    blockTextEdited: { source: true, target: true },
    styleAssignments: { source: "body", target: "headline" },
    blockFontFamilies: { target: "Inter" },
    blockFontWeights: { target: 700 },
    blockOpticalKerning: { target: false },
    blockTrackingScales: { target: 80 },
    blockTrackingRuns: { target: [{ start: 0, end: 6, trackingScale: 40 }] },
    blockTextFormatRuns: { target: [{ start: 0, end: 6, fontWeight: 700 }] },
    blockColumnSpans: { source: 2, target: 4 },
    blockRowSpans: { source: 1, target: 1 },
    blockHeightBaselines: { source: 0, target: 0 },
    blockTextAlignments: { source: "left", target: "left" },
    blockVerticalAlignments: { source: "top", target: "top" },
    blockTextReflow: { source: false, target: false },
    blockSyllableDivision: { source: true, target: true },
    blockSnapToColumns: { source: true, target: true },
    blockSnapToBaseline: { source: true, target: true },
    blockItalic: { target: true },
    blockRotations: {},
    blockModulePositions: {},
  }

  const next = applyTextStyleTransferToCollections(state, "target", {
    sourceKey: "source",
    mode: "typo",
    typo: {
      styleKey: "body",
      fontFamily: undefined,
      fontWeight: undefined,
      opticalKerning: undefined,
      trackingScale: undefined,
      italic: undefined,
      customSize: undefined,
      customLeading: undefined,
      textColor: undefined,
    },
  })

  assert.equal(next.styleAssignments.target, "body")
  assert.equal("target" in next.blockFontFamilies, false)
  assert.equal("target" in next.blockFontWeights, false)
  assert.equal("target" in next.blockOpticalKerning, false)
  assert.equal("target" in next.blockTrackingScales, false)
  assert.equal("target" in next.blockTrackingRuns, false)
  assert.equal("target" in next.blockTextFormatRuns, false)
  assert.equal("target" in next.blockItalic, false)
})

test("full transfer copies text and scoped type runs", () => {
  const state = {
    blockOrder: ["source", "target"],
    textContent: { source: "Source text", target: "Target text" },
    blockTextEdited: { source: true, target: false },
    styleAssignments: { source: "body", target: "headline" },
    blockFontFamilies: { source: "IBM Plex Sans" },
    blockFontWeights: { source: 500 },
    blockOpticalKerning: { source: true },
    blockTrackingScales: { source: 20 },
    blockTrackingRuns: { source: [{ start: 0, end: 6, trackingScale: 60 }] },
    blockTextFormatRuns: { source: [{ start: 0, end: 6, fontWeight: 600, color: "#111111" }] },
    blockColumnSpans: { source: 2, target: 4 },
    blockRowSpans: { source: 1, target: 1 },
    blockHeightBaselines: { source: 0, target: 0 },
    blockTextAlignments: { source: "left", target: "left" },
    blockVerticalAlignments: { source: "top", target: "top" },
    blockTextReflow: { source: false, target: false },
    blockSyllableDivision: { source: true, target: true },
    blockSnapToColumns: { source: true, target: true },
    blockSnapToBaseline: { source: true, target: true },
    blockItalic: { source: false },
    blockRotations: {},
    blockModulePositions: {},
  }

  const next = applyTextStyleTransferToCollections(state, "target", {
    sourceKey: "source",
    mode: "full",
    textContent: "Source text",
    textEdited: true,
    paragraph: {
      columns: 2,
      rows: 1,
      heightBaselines: 0,
      align: "left",
      verticalAlign: "top",
      reflow: false,
      syllableDivision: true,
      snapToColumns: true,
      snapToBaseline: true,
      rotation: undefined,
    },
    typo: {
      styleKey: "body",
      fontFamily: "IBM Plex Sans",
      fontWeight: 500,
      opticalKerning: true,
      trackingScale: 20,
      italic: false,
      trackingRuns: [{ start: 0, end: 6, trackingScale: 60 }],
      textFormatRuns: [{ start: 0, end: 6, fontWeight: 600, color: "#111111" }],
    },
  })

  assert.equal(next.textContent.target, "Source text")
  assert.equal(next.blockTextEdited.target, true)
  assert.equal(next.styleAssignments.target, "body")
  assert.deepEqual(next.blockTrackingRuns.target, [{ start: 0, end: 6, trackingScale: 60 }])
  assert.deepEqual(next.blockTextFormatRuns.target, [{ start: 0, end: 6, fontWeight: 600, color: "#111111" }])
})

test("optional transfer helper removes or assigns target overrides", () => {
  assert.deepEqual(
    applyOptionalTransferredValue({ target: 20 }, "target", undefined),
    {},
  )
  assert.deepEqual(
    applyOptionalTransferredValue({}, "target", 12),
    { target: 12 },
  )
})
