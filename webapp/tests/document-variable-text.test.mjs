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
  assert.match(source, /token: "<%url:https:\/\/lp45\.net%>"/)
  assert.doesNotMatch(source, /token: "<%title%>"/)
})

test("document variable palette displays url after time", () => {
  const source = readText("lib/document-variable-definitions.ts")
  assert.ok(source.indexOf("<%url:https://lp45.net%>") > source.indexOf("<%time%>"))
})

test("document variable resolver separates project and page title values", () => {
  const source = readText("lib/document-variable-text.ts")
  assert.match(source, /projectTitle: string/)
  assert.match(source, /pageTitle: string/)
  assert.match(source, /case "project_title":\s+return context\.projectTitle/)
  assert.match(source, /case "page_title":\s+case "title":\s+return context\.pageTitle/)
})

test("document variable resolver supports url payload tokens", () => {
  const source = readText("lib/document-variable-text.ts")
  assert.ok(source.includes("const DOCUMENT_VARIABLE_RE = /<%([a-z_]+)(?::([\\s\\S]*?))?%>/gi"))
  assert.match(source, /case "url": \{\s+const resolvedUrl = value\?\.trim\(\) \?\? ""\s+return resolvedUrl\.length > 0 \? resolvedUrl : null\s+\}/)
})
