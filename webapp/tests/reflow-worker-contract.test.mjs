import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  computeReflowPlan,
  createReflowPlanSignature,
} from "../lib/reflow-planner.ts"

const ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

function makePlannerInput() {
  const blockOrder = [
    "display",
    "headline",
    "subhead",
    "body",
    "caption",
    ...Array.from({ length: 18 }, (_, i) => `custom_${i + 1}`),
  ]

  const blockColumnSpans = {}
  const sourcePositions = {}
  for (const [index, key] of blockOrder.entries()) {
    blockColumnSpans[key] = key === "display" ? 10 : Math.max(1, ((index * 3) % 5) + 1)
    sourcePositions[key] = { col: index % 8, row: (index * 1.4) % 16 }
  }

  return {
    gridCols: 10,
    gridRows: 14,
    blockOrder,
    blockColumnSpans,
    sourcePositions,
    pageHeight: 980,
    marginTop: 36,
    marginBottom: 60,
    gridUnit: 12,
    moduleHeight: 72,
    gridMarginVertical: 12,
  }
}

test("computeReflowPlan is deterministic and produces valid occupancy", () => {
  const input = makePlannerInput()

  const planA = computeReflowPlan(input)
  const planB = computeReflowPlan(input)
  assert.deepEqual(planA, planB)

  const occupied = new Set()
  for (const key of input.blockOrder) {
    const pos = planA.nextPositions[key]
    assert.ok(pos, `missing next position for ${key}`)
    const span = planA.resolvedSpans[key]
    assert.ok(span >= 1 && span <= input.gridCols, `invalid span for ${key}`)
    assert.ok(pos.col >= 0 && pos.col + span <= input.gridCols, `out-of-grid placement for ${key}`)
    assert.ok(pos.row >= 0, `negative row for ${key}`)
    for (let col = pos.col; col < pos.col + span; col += 1) {
      const cell = `${pos.row.toFixed(4)}:${col}`
      assert.ok(!occupied.has(cell), `overlap at ${cell}`)
      occupied.add(cell)
    }
  }
})

test("createReflowPlanSignature is stable and changes when input changes", () => {
  const input = makePlannerInput()
  const sigA = createReflowPlanSignature(input)
  const sigB = createReflowPlanSignature(input)
  assert.equal(sigA, sigB)

  const changed = {
    ...input,
    sourcePositions: {
      ...input.sourcePositions,
      body: { col: 2, row: 7 },
    },
  }
  const sigChanged = createReflowPlanSignature(changed)
  assert.notEqual(sigA, sigChanged)
})

test("reflow worker preserves id and posts computed plan", () => {
  const source = readText("workers/reflowPlanner.worker.ts")
  assert.match(source, /self\.onmessage\s*=\s*\(event:\s*MessageEvent<ReflowPlanRequest>\)\s*=>/)
  assert.match(source, /const\s+\{\s*id,\s*input\s*\}\s*=\s*event\.data/)
  assert.match(source, /const\s+plan\s*=\s*computeReflowPlan\(input\)/)
  assert.match(source, /const\s+response:\s*ReflowPlanResponse\s*=\s*\{\s*id,\s*plan,\s*overflowLinesByBlock:\s*\{\}\s*\}/)
  assert.match(source, /self\.postMessage\(response\)/)
})

test("autofit worker preserves id and handles no OffscreenCanvas context", () => {
  const source = readText("workers/autoFit.worker.ts")
  assert.match(source, /self\.onmessage\s*=\s*\(event:\s*MessageEvent<AutoFitRequest>\)\s*=>/)
  assert.match(source, /const\s+\{\s*id,\s*input\s*\}\s*=\s*event\.data/)
  assert.match(source, /if\s*\(!context\)/)
  assert.match(source, /const\s+fallback:\s*AutoFitResponse\s*=\s*\{\s*id,\s*output:\s*\{\s*spanUpdates:\s*\{\},\s*positionUpdates:\s*\{\}\s*\}\s*\}/)
  assert.match(source, /self\.postMessage\(fallback\)/)
  assert.match(source, /const\s+response:\s*AutoFitResponse\s*=\s*\{\s*id,\s*output\s*\}/)
  assert.match(source, /self\.postMessage\(response\)/)
})
