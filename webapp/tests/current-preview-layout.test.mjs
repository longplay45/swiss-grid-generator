import test from "node:test"
import assert from "node:assert/strict"

import { resolveCurrentPreviewLayout } from "../lib/current-preview-layout.ts"

test("resolveCurrentPreviewLayout prefers the committed layout while sidebar changes are ahead of the live preview", () => {
  const committedLayout = { layerOrder: ["caption", "body", "image-1"] }
  const staleLiveLayout = { layerOrder: ["body", "caption", "image-1"] }

  const resolved = resolveCurrentPreviewLayout({
    preferCommittedLayout: true,
    committedLayout,
    getLivePreviewLayout: () => staleLiveLayout,
  })

  assert.equal(resolved, committedLayout)
})

test("resolveCurrentPreviewLayout still uses the live preview snapshot for unsaved canvas edits", () => {
  const committedLayout = { layerOrder: ["body", "caption"] }
  const liveLayout = { layerOrder: ["caption", "body"] }

  const resolved = resolveCurrentPreviewLayout({
    preferCommittedLayout: false,
    committedLayout,
    getLivePreviewLayout: () => liveLayout,
  })

  assert.equal(resolved, liveLayout)
})

test("resolveCurrentPreviewLayout falls back to the committed layout when no live snapshot is available", () => {
  const committedLayout = { layerOrder: ["image-1"] }

  const resolved = resolveCurrentPreviewLayout({
    preferCommittedLayout: false,
    committedLayout,
    getLivePreviewLayout: null,
  })

  assert.equal(resolved, committedLayout)
})
