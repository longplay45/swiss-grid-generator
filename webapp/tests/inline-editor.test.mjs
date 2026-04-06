import test from "node:test"
import assert from "node:assert/strict"

import {
  computeInlineEditorSelectionRects,
  buildInlineEditorTransform,
  computeInlineEditorCaret,
  computeInlineEditorTextBox,
  computeSidebarWithEditorSession,
  hitTestInlineEditorIndex,
  resolveInlineEditorLineNavigation,
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

test("computeInlineEditorTextBox measures centered lines against the visible source range", () => {
  const textBox = computeInlineEditorTextBox({
    rect: { x: 40, y: 80, width: 200, height: 120 },
    textAlign: "center",
    commands: [
      { text: "  Swiss", x: 140, y: 140, sourceStart: 0, sourceEnd: 7, leadingBoundaryWhitespace: 2 },
    ],
    measureText: (_text, range) => ((range?.end ?? 0) - (range?.start ?? 0)) * 10,
  })

  assert.equal(textBox.left, 40)
  assert.equal(textBox.width, 200)
})

test("computeInlineEditorTextBox ignores trailing boundary whitespace on right-aligned lines", () => {
  const textBox = computeInlineEditorTextBox({
    rect: { x: 40, y: 80, width: 200, height: 120 },
    textAlign: "right",
    commands: [
      { text: "Swiss ", x: 240, y: 140, sourceStart: 0, sourceEnd: 6, trailingBoundaryWhitespace: 1 },
    ],
    measureText: (text) => text.length * 10,
  })

  assert.equal(textBox.left, 40)
  assert.equal(textBox.width, 200)
})

test("computeInlineEditorTextBox measures right-aligned lines against the visible source range", () => {
  const textBox = computeInlineEditorTextBox({
    rect: { x: 40, y: 80, width: 200, height: 120 },
    textAlign: "right",
    commands: [
      { text: "Cherubini ", x: 240, y: 140, sourceStart: 0, sourceEnd: 10, trailingBoundaryWhitespace: 1 },
    ],
    measureText: (_text, range) => ((range?.end ?? 0) - (range?.start ?? 0)) * 10,
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

test("resolveInlineEditorLineMatches prefers explicit renderer source ranges when present", () => {
  const lines = resolveInlineEditorLineMatches("Swiss Grid Swiss", [
    { text: "Swiss", x: 40, y: 120, sourceStart: 11, sourceEnd: 16 },
    { text: "Swiss Grid", x: 40, y: 144, sourceStart: 0, sourceEnd: 10 },
  ])

  assert.deepEqual(lines.map((line) => [line.sourceStart, line.sourceEnd]), [
    [11, 16],
    [0, 10],
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

test("computeInlineEditorCaret uses positioned segment geometry for mixed formatting", () => {
  const caret = computeInlineEditorCaret({
    text: "ABCD",
    textAlign: "left",
    commands: [
      { text: "ABCD", x: 40, y: 136, sourceStart: 0, sourceEnd: 4 },
    ],
    segmentLines: [[
      {
        text: "A",
        start: 0,
        end: 1,
        trackingScale: 0,
        fontFamily: "Inter",
        fontWeight: 400,
        italic: false,
        styleKey: "body",
        color: "#000000",
        fontSize: 20,
        x: 40,
        y: 136,
      },
      {
        text: "BCD",
        start: 1,
        end: 4,
        trackingScale: 0,
        fontFamily: "Inter",
        fontWeight: 400,
        italic: false,
        styleKey: "display",
        color: "#000000",
        fontSize: 40,
        x: 70,
        y: 136,
      },
    ]],
    selectionStart: 1,
    textAscent: 10,
    textBoxTop: 110,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 70,
    top: 16,
    height: 24,
  })
})

test("computeInlineEditorCaret prefers rendered line geometry when available", () => {
  const caret = computeInlineEditorCaret({
    text: "Swiss",
    textAlign: "left",
    commands: [
      { text: "Swiss", x: 40, y: 136, sourceStart: 0, sourceEnd: 5 },
    ],
    renderedLines: [{
      sourceStart: 0,
      sourceEnd: 5,
      left: 52,
      top: 84,
      width: 118,
      height: 48,
      baselineY: 120,
      caretStops: [
        { index: 0, x: 52 },
        { index: 1, x: 74 },
        { index: 2, x: 96 },
        { index: 3, x: 118 },
        { index: 4, x: 142 },
        { index: 5, x: 170 },
      ],
    }],
    selectionStart: 3,
    textAscent: 10,
    textBoxTop: 84,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 118,
    top: 0,
    height: 48,
  })
})

test("computeInlineEditorSelectionRects prefers rendered line geometry when available", () => {
  const rects = computeInlineEditorSelectionRects({
    text: "Swiss",
    textAlign: "left",
    commands: [
      { text: "Swiss", x: 40, y: 136, sourceStart: 0, sourceEnd: 5 },
    ],
    renderedLines: [{
      sourceStart: 0,
      sourceEnd: 5,
      left: 52,
      top: 84,
      width: 118,
      height: 48,
      baselineY: 120,
      caretStops: [
        { index: 0, x: 52 },
        { index: 1, x: 74 },
        { index: 2, x: 96 },
        { index: 3, x: 118 },
        { index: 4, x: 142 },
        { index: 5, x: 170 },
      ],
    }],
    selectionStart: 1,
    selectionEnd: 3,
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(rects, [{
    left: 74,
    top: 84,
    width: 44,
    height: 48,
  }])
})

test("computeInlineEditorCaret keeps the terminal caret on the rendered line end when the logical line range extends further", () => {
  const caret = computeInlineEditorCaret({
    text: "Swiss ",
    textAlign: "left",
    commands: [
      { text: "Swiss", x: 40, y: 136, sourceStart: 0, sourceEnd: 6 },
    ],
    renderedLines: [{
      sourceStart: 0,
      sourceEnd: 6,
      left: 40,
      top: 112,
      width: 100,
      height: 24,
      baselineY: 136,
      caretStops: [
        { index: 0, x: 40 },
        { index: 1, x: 60 },
        { index: 2, x: 80 },
        { index: 3, x: 100 },
        { index: 4, x: 120 },
        { index: 5, x: 140 },
        { index: 6, x: 140 },
      ],
    }],
    selectionStart: 6,
    textAscent: 10,
    textBoxTop: 112,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 140,
    top: 0,
    height: 24,
  })
})

test("computeInlineEditorCaret preserves repeated spaces in fallback prefix measurement", () => {
  const caret = computeInlineEditorCaret({
    text: "A   B",
    textAlign: "left",
    commands: [
      { text: "A   B", x: 40, y: 136, sourceStart: 0, sourceEnd: 5 },
    ],
    selectionStart: 4,
    textAscent: 10,
    textBoxTop: 110,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(caret, {
    x: 80,
    top: 16,
    height: 24,
  })
})

test("resolveInlineEditorLineNavigation moves Home and End within the visual wrapped line", () => {
  const home = resolveInlineEditorLineNavigation({
    text: "Hello world\nSecond line",
    textAlign: "left",
    commands: [
      { text: "Hello world", x: 40, y: 120 },
      { text: "Second line", x: 40, y: 144 },
    ],
    selectionIndex: 18,
    direction: "home",
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  const end = resolveInlineEditorLineNavigation({
    text: "Hello world\nSecond line",
    textAlign: "left",
    commands: [
      { text: "Hello world", x: 40, y: 120 },
      { text: "Second line", x: 40, y: 144 },
    ],
    selectionIndex: 3,
    direction: "end",
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(home, {
    index: 12,
    desiredX: 40,
  })
  assert.deepEqual(end, {
    index: 11,
    desiredX: 150,
  })
})

test("resolveInlineEditorLineNavigation keeps the visual x-column when moving down", () => {
  const result = resolveInlineEditorLineNavigation({
    text: "Hello\nSecond",
    textAlign: "left",
    commands: [
      { text: "Hello", x: 40, y: 120 },
      { text: "Second", x: 40, y: 144 },
    ],
    selectionIndex: 4,
    direction: "down",
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(result, {
    index: 10,
    desiredX: 80,
  })
})

test("resolveInlineEditorLineNavigation clamps upward movement to the nearest caret on the previous visual line", () => {
  const result = resolveInlineEditorLineNavigation({
    text: "Hello\nSecond",
    textAlign: "left",
    commands: [
      { text: "Hello", x: 40, y: 120 },
      { text: "Second", x: 40, y: 144 },
    ],
    selectionIndex: 12,
    direction: "up",
    textAscent: 10,
    lineHeight: 24,
    measureText: (text) => text.length * 10,
  })

  assert.deepEqual(result, {
    index: 5,
    desiredX: 100,
  })
})
