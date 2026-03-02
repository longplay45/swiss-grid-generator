import test from "node:test"
import assert from "node:assert/strict"

import {
  buildInlineEditorTransform,
  computeSidebarWithEditorSession,
} from "../lib/inline-editor.ts"

test("buildInlineEditorTransform composes page and block rotations with explicit origins", () => {
  const output = buildInlineEditorTransform({
    pageWidth: 400,
    pageHeight: 600,
    pageRotation: 12,
    blockRotation: -18,
    rectX: 40,
    rectY: 80,
    rotationOriginX: 130,
    rotationOriginY: 200,
  })

  assert.equal(output.pageTransform, "rotate(12deg)")
  assert.equal(output.pageTransformOrigin, "200px 300px")
  assert.equal(output.blockTransform, "rotate(-18deg)")
  assert.equal(output.blockTransformOrigin, "90px 120px")
})

test("computeSidebarWithEditorSession restores prior sidebar after text-editor closes", () => {
  const opened = computeSidebarWithEditorSession("help", null, true)
  assert.equal(opened.nextPanel, "text-editor")
  assert.equal(opened.nextPreviousPanelBeforeEditor, "help")

  const closed = computeSidebarWithEditorSession(opened.nextPanel, opened.nextPreviousPanelBeforeEditor, false)
  assert.equal(closed.nextPanel, "help")
  assert.equal(closed.nextPreviousPanelBeforeEditor, "help")
})
