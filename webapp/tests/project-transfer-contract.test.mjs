import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

test("project transfer utility supports plain json and gzip archives", () => {
  const source = readText("lib/project-transfer.ts")
  assert.match(source, /gzipSync/)
  assert.match(source, /gunzipSync/)
  assert.match(source, /PROJECT_JSON_EXTENSION = "\.json"/)
  assert.match(source, /PROJECT_ARCHIVE_EXTENSION = "\.swissgridgenerator"/)
  assert.match(source, /isCompressedProjectBytes/)
  assert.match(source, /parseProjectTransferPayloadBytes/)
  assert.match(source, /buildProjectTransferPayload/)
  assert.match(source, /encodeProjectTransferPayload/)
})

test("user library stores compressed project archives", () => {
  const source = readText("lib/user-layout-library.ts")
  assert.match(source, /projectCompression\?: "gzip"/)
  assert.match(source, /projectArchive\?: ArrayBuffer/)
  assert.match(source, /record\.projectArchive = toArrayBuffer\(encoded\.bytes\)/)
  assert.match(source, /projectCompression: "gzip"/)
  assert.match(source, /projectArchive: toArrayBuffer\(encoded\.bytes\)/)
  assert.match(source, /parseProjectTransferPayloadBytes\(record\.projectArchive\)/)
  assert.match(source, /\.swissgridgenerator/)
})

test("file import detects compressed and uncompressed project files", () => {
  const controllerSource = readText("hooks/useProjectController.ts")
  const pageSource = readText("app/page.tsx")
  assert.match(controllerSource, /parseProjectTransferPayloadBytes/)
  assert.match(controllerSource, /reader\.readAsArrayBuffer\(file\)/)
  assert.match(pageSource, /accept="application\/json,application\/gzip,.json,.swissgridgenerator"/)
})
