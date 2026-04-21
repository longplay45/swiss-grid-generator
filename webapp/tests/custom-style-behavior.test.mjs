import test from "node:test"
import assert from "node:assert/strict"

import {
  PREVIEW_STYLE_OPTIONS,
  resolveCustomStyleSeedMetrics,
} from "../lib/preview-text-config.ts"

test("preview style options list Custom after Caption", () => {
  assert.deepEqual(
    PREVIEW_STYLE_OPTIONS.map((option) => `${option.value}:${option.label}`),
    [
      "display:Display",
      "headline:Headline",
      "subhead:Subhead",
      "body:Body",
      "caption:Caption",
      "fx:Custom",
    ],
  )
})

test("entering Custom seeds the current style size and leading", () => {
  const metrics = resolveCustomStyleSeedMetrics({
    currentStyle: "body",
    currentCustomSize: 96,
    currentCustomLeading: 96,
    isCustomStyle: (styleKey) => styleKey === "fx",
    getStyleSize: (styleKey) => ({ body: 10, fx: 96 })[styleKey] ?? 0,
    getStyleLeading: (styleKey) => ({ body: 12, fx: 96 })[styleKey] ?? 0,
  })

  assert.deepEqual(metrics, { size: 10, leading: 12 })
})

test("re-entering Custom preserves the current custom overrides", () => {
  const metrics = resolveCustomStyleSeedMetrics({
    currentStyle: "fx",
    currentCustomSize: 43.5,
    currentCustomLeading: 51,
    isCustomStyle: (styleKey) => styleKey === "fx",
    getStyleSize: () => 0,
    getStyleLeading: () => 0,
  })

  assert.deepEqual(metrics, { size: 43.5, leading: 51 })
})
