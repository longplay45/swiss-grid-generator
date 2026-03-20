import test from "node:test"
import assert from "node:assert/strict"

import {
  computeInlineEditorSelectionRects,
  buildInlineEditorTransform,
  computeInlineEditorCaret,
  computeInlineEditorTextBox,
  computeSidebarWithEditorSession,
  hitTestInlineEditorIndex,
  resolveInlineEditorLineMatches,
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

test("computeInlineEditorTextBox preserves right-aligned editor width and adds optical hang room", () => {
  const textBox = computeInlineEditorTextBox({
    rect: { x: 40, y: 80, width: 200, height: 120 },
    textAlign: "right",
    commands: [
      { text: "Right aligned.", x: 244, y: 140 },
    ],
    measureText: (text) => text.length * 10,
  })

  assert.equal(textBox.left, 40)
  assert.equal(textBox.width, 204)
})

test("computeInlineEditorTextBox keeps centered text symmetric around its anchor", () => {
  const textBox = computeInlineEditorTextBox({
    rect: { x: 40, y: 80, width: 200, height: 120 },
    textAlign: "center",
    commands: [
      { text: "Center", x: 140, y: 140 },
    ],
    measureText: (text) => text.length * 10,
  })

  assert.equal(textBox.left, 40)
  assert.equal(textBox.width, 200)
})

test("resolveInlineEditorLineMatches keeps sequential line ranges for wrapped text", () => {
  const lines = resolveInlineEditorLineMatches("Hello world\nSecond line", [
    { text: "Hello world", x: 40, y: 120 },
    { text: "Second line", x: 40, y: 144 },
  ])

  assert.deepEqual(lines.map((line) => [line.sourceStart, line.sourceEnd]), [
    [0, 11],
    [12, 23],
  ])
})

test("computeInlineEditorCaret returns the visual caret at the right-aligned line end", () => {
  const caret = computeInlineEditorCaret({
    text: "Hello world",
    textAlign: "right",
    commands: [
      { text: "Hello world", x: 240, y: 136 },
    ],
    selectionStart: 11,
    textAscent: 10,
    textBoxTop: 110,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 240,
    top: 16,
    height: 24,
  })
})

test("computeInlineEditorSelectionRects matches the visual segment on a right-aligned line", () => {
  const rects = computeInlineEditorSelectionRects({
    text: "Hello world",
    textAlign: "right",
    commands: [
      { text: "Hello world", x: 240, y: 136 },
    ],
    selectionStart: 6,
    selectionEnd: 11,
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(rects, [{
    left: 190,
    top: 126,
    width: 50,
    height: 24,
  }])
})

test("hitTestInlineEditorIndex returns the nearest character index on a right-aligned line", () => {
  const index = hitTestInlineEditorIndex({
    text: "Hello world",
    textAlign: "right",
    commands: [
      { text: "Hello world", x: 240, y: 136 },
    ],
    x: 191,
    y: 130,
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.equal(index, 6)
})

test("computeInlineEditorCaret returns the visual caret at the centered line midpoint", () => {
  const caret = computeInlineEditorCaret({
    text: "Hello world",
    textAlign: "center",
    commands: [
      { text: "Hello world", x: 200, y: 136 },
    ],
    selectionStart: 5,
    textAscent: 10,
    textBoxTop: 110,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 195,
    top: 16,
    height: 24,
  })
})
