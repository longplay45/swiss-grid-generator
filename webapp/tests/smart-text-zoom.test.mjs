import test from "node:test"
import assert from "node:assert/strict"

import { buildSmartTextZoomGeometrySignature } from "../lib/preview-smart-text-zoom.ts"

test("smart text zoom geometry signature changes when the text frame geometry changes", () => {
  const base = buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 2,
    rows: 4,
    heightBaselines: 1,
  })

  assert.notEqual(base, buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 3,
    rows: 4,
    heightBaselines: 1,
  }))

  assert.notEqual(base, buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 2,
    rows: 5,
    heightBaselines: 1,
  }))

  assert.notEqual(base, buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 2,
    rows: 4,
    heightBaselines: 2,
  }))
})

test("smart text zoom geometry signature is stable for the same frame geometry", () => {
  const first = buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 2,
    rows: 4,
    heightBaselines: 1,
  })
  const second = buildSmartTextZoomGeometrySignature({
    target: "paragraph-1",
    columns: 2,
    rows: 4,
    heightBaselines: 1,
  })

  assert.equal(first, second)
})
