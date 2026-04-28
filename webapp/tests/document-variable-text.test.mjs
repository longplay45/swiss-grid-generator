import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

test("document variable palette exposes page_title instead of title", () => {
  const source = readText("lib/document-variable-definitions.ts")
  assert.match(source, /token: "<%project_title%>"/)
  assert.match(source, /token: "<%page_title%>"/)
  assert.doesNotMatch(source, /token: "<%title%>"/)
})

test("document variable resolver separates project and page title values", () => {
  const source = readText("lib/document-variable-text.ts")
  assert.match(source, /projectTitle: string/)
  assert.match(source, /pageTitle: string/)
  assert.match(source, /case "project_title":\s+return context\.projectTitle/)
  assert.match(source, /case "page_title":\s+case "title":\s+return context\.pageTitle/)
})
