import test from "node:test"
import assert from "node:assert/strict"

import { getPreviewTextGuideGeometry } from "../lib/preview-guide-rect.ts"

test("left-aligned text guides keep horizontal and vertical anchors matched", () => {
  const guide = getPreviewTextGuideGeometry({
    guideRects: [{ x: 100, y: 200, width: 240, height: 120 }],
    rect: { x: 100, y: 176, width: 240, height: 144 },
    rotationOriginX: 100,
    rotationOriginY: 188,
    textAlign: "left",
    commands: [{ x: 92, y: 212 }],
    renderedLines: [{
      sourceStart: 0,
      sourceEnd: 12,
      left: 92,
      top: 196,
      width: 140,
      height: 18,
      baselineY: 212,
      caretStops: [],
    }],
  }, 12)

  assert.equal(guide.verticalX, 100)
  assert.equal(guide.horizontalX, 100)
  assert.equal(guide.width, 240)
})

test("right-aligned text guides keep horizontal and vertical anchors matched", () => {
  const guide = getPreviewTextGuideGeometry({
    guideRects: [{ x: 160, y: 260, width: 180, height: 80 }],
    rect: { x: 160, y: 236, width: 180, height: 104 },
    rotationOriginX: 160,
    rotationOriginY: 248,
    textAlign: "right",
    commands: [{ x: 340, y: 272 }],
    renderedLines: [{
      sourceStart: 0,
      sourceEnd: 6,
      left: 240,
      top: 256,
      width: 100,
      height: 16,
      baselineY: 272,
      caretStops: [],
    }],
  }, 12)

  assert.equal(guide.verticalX, 160)
  assert.equal(guide.horizontalX, 160)
  assert.equal(guide.width, 180)
})
