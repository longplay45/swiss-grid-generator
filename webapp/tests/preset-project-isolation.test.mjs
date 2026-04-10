import test from "node:test"
import assert from "node:assert/strict"

test("preset project source json parses into isolated instances", () => {
  const source = {
    activePageId: "page-1",
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        uiSettings: {
          canvasRatio: "din",
          orientation: "portrait",
          marginMethod: 1,
          gridCols: 3,
          gridRows: 6,
          baselineMultiple: 1,
          gutterMultiple: 1,
        },
        previewLayout: {
          blockOrder: ["body", "caption"],
          textContent: { body: "Body", caption: "Caption" },
          blockTextEdited: { body: true, caption: true },
          styleAssignments: { body: "body", caption: "caption" },
          blockColumnSpans: { body: 2, caption: 1 },
          blockTextAlignments: { body: "left", caption: "left" },
          blockModulePositions: {},
          imageOrder: ["image-1"],
          imageModulePositions: {},
          imageColumnSpans: { "image-1": 1 },
          imageRowSpans: { "image-1": 1 },
          imageColors: { "image-1": "#000000" },
          imageOpacities: { "image-1": 1 },
          layerOrder: ["caption", "image-1", "body"],
        },
      },
    ],
    metadata: {},
  }

  const sourceJson = JSON.stringify(source)
  const loadSource = JSON.parse(sourceJson)
  const browserSource = JSON.parse(sourceJson)

  browserSource.pages[0].previewLayout.layerOrder.reverse()

  assert.deepEqual(
    loadSource.pages[0].previewLayout.layerOrder,
    ["caption", "image-1", "body"],
  )
})
