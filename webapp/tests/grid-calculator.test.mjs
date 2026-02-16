import test from "node:test"
import assert from "node:assert/strict"

import {
  FORMATS_PT,
  generateSwissGrid,
  getMaxBaseline,
} from "../lib/grid-calculator.ts"

const EPS = 0.02

function approxEqual(a, b, message) {
  assert.ok(Math.abs(a - b) <= EPS, `${message} (expected ${b}, got ${a})`)
}

function round3(value) {
  return Math.round(value * 1000) / 1000
}

function createRng(seed = 123456789) {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function randomInt(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min
}

function pick(rand, values) {
  return values[randomInt(rand, 0, values.length - 1)]
}

test("getMaxBaseline applies hard cap of 72", () => {
  const max = getMaxBaseline(5000, 1, 1)
  assert.equal(max, 72)
})

test("getMaxBaseline uses margin method units and baseline multiple", () => {
  const max = getMaxBaseline(1200, 2, 2)
  assert.equal(max, 30) // floor(1200 / (24 + (8 * 2)))
})

test("getMaxBaseline accepts custom margin units override", () => {
  const max = getMaxBaseline(1000, 1, 1, 10)
  assert.equal(max, 29) // floor(1000 / (24 + 10))
})

test("generateSwissGrid returns coherent content and module geometry", () => {
  const result = generateSwissGrid({
    format: "A4",
    orientation: "portrait",
    marginMethod: 1,
    gridCols: 6,
    gridRows: 8,
    baseline: 12,
    baselineMultiple: 1,
    gutterMultiple: 1,
  })

  assert.ok(result.module.width > 0)
  assert.ok(result.module.height > 0)
  assert.ok(Number.isFinite(result.module.aspectRatio))
  assert.ok(result.contentArea.width > 0)
  assert.ok(result.contentArea.height > 0)

  const expectedContentWidth =
    result.pageSizePt.width - result.grid.margins.left - result.grid.margins.right
  approxEqual(result.contentArea.width, expectedContentWidth, "content width mismatch")

  const expectedContentHeight =
    result.settings.gridRows * result.module.height +
    (result.settings.gridRows - 1) * result.grid.gridMarginVertical
  approxEqual(result.contentArea.height, expectedContentHeight, "content height mismatch")

  assert.equal(result.grid.gutter, result.grid.gridMarginHorizontal)
})

test("orientation swaps page dimensions for same format", () => {
  const portrait = generateSwissGrid({
    format: "A4",
    orientation: "portrait",
    marginMethod: 1,
    gridCols: 6,
    gridRows: 8,
    baseline: 12,
  })

  const landscape = generateSwissGrid({
    format: "A4",
    orientation: "landscape",
    marginMethod: 1,
    gridCols: 6,
    gridRows: 8,
    baseline: 12,
  })

  assert.equal(landscape.pageSizePt.width, portrait.pageSizePt.height)
  assert.equal(landscape.pageSizePt.height, portrait.pageSizePt.width)
})

test("margin methods produce expected ratios at baselineMultiple=1", () => {
  const common = {
    format: "A4",
    orientation: "portrait",
    gridCols: 6,
    gridRows: 8,
    baseline: 12,
    baselineMultiple: 1,
    gutterMultiple: 1,
  }

  const m1 = generateSwissGrid({ ...common, marginMethod: 1 })
  assert.deepEqual(m1.grid.margins, { top: 12, bottom: 36, left: 24, right: 24 })

  const m2 = generateSwissGrid({ ...common, marginMethod: 2 })
  assert.deepEqual(m2.grid.margins, { top: 24, bottom: 72, left: 36, right: 48 })

  const m3 = generateSwissGrid({ ...common, marginMethod: 3 })
  assert.deepEqual(m3.grid.margins, { top: 12, bottom: 12, left: 12, right: 12 })
})

test("custom margins override defaults; top/bottom are baseline-snapped", () => {
  const result = generateSwissGrid({
    format: "A4",
    orientation: "portrait",
    marginMethod: 1,
    gridCols: 6,
    gridRows: 8,
    baseline: 12,
    customMargins: {
      top: 13,
      bottom: 35,
      left: 20,
      right: 22,
    },
  })

  assert.equal(result.grid.margins.top, 12)
  assert.equal(result.grid.margins.bottom, 36)
  assert.equal(result.grid.margins.left, 20)
  assert.equal(result.grid.margins.right, 22)
})

test("typography styles stay baseline-aligned across all scales", () => {
  const scales = ["swiss", "golden", "fourth", "fifth", "fibonacci"]
  const styleKeys = ["caption", "body", "subhead", "headline", "display"]

  for (const scale of scales) {
    const result = generateSwissGrid({
      format: "A4",
      orientation: "portrait",
      marginMethod: 1,
      gridCols: 6,
      gridRows: 8,
      baseline: 12,
      typographyScale: scale,
    })

    for (const key of styleKeys) {
      const style = result.typography.styles[key]
      assert.ok(style, `missing style "${key}" for scale "${scale}"`)
      assert.equal(style.leading, round3(result.grid.gridUnit * style.baselineMultiplier))
    }
  }
})

test("small page/high row count keeps baselineUnitsPerCell minimum at 2", () => {
  const result = generateSwissGrid({
    format: "A6",
    orientation: "portrait",
    marginMethod: 1,
    gridCols: 4,
    gridRows: 200,
    baseline: 6,
  })

  assert.equal(result.grid.baselineUnitsPerCell, 2)
})

test("fuzz: valid settings maintain finite and coherent geometry", () => {
  const rand = createRng(42)
  const formats = Object.keys(FORMATS_PT)
  const marginMethods = [1, 2, 3]
  const scales = ["swiss", "golden", "fourth", "fifth", "fibonacci"]
  let validCases = 0

  for (let i = 0; i < 500; i += 1) {
    const settings = {
      format: pick(rand, formats),
      orientation: rand() > 0.5 ? "portrait" : "landscape",
      marginMethod: pick(rand, marginMethods),
      gridCols: randomInt(rand, 1, 13),
      gridRows: randomInt(rand, 1, 13),
      baseline: randomInt(rand, 4, 36),
      baselineMultiple: randomInt(rand, 1, 14) / 2, // 0.5 to 7
      gutterMultiple: randomInt(rand, 1, 2) / 2, // 0.5 to 1
      typographyScale: pick(rand, scales),
    }

    let result
    try {
      result = generateSwissGrid(settings)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("Invalid")) {
        continue
      }
      throw error
    }

    validCases += 1

    assert.ok(Number.isFinite(result.module.width) && result.module.width > 0)
    assert.ok(Number.isFinite(result.module.height) && result.module.height > 0)
    assert.ok(Number.isFinite(result.module.aspectRatio) && result.module.aspectRatio > 0)
    assert.ok(Number.isFinite(result.contentArea.width) && result.contentArea.width > 0)
    assert.ok(Number.isFinite(result.contentArea.height) && result.contentArea.height > 0)
    assert.ok(Number.isFinite(result.grid.gridUnit) && result.grid.gridUnit > 0)

    const expectedContentWidth =
      result.pageSizePt.width - result.grid.margins.left - result.grid.margins.right
    approxEqual(result.contentArea.width, expectedContentWidth, "fuzz content width mismatch")

    const expectedContentHeight =
      result.settings.gridRows * result.module.height +
      (result.settings.gridRows - 1) * result.grid.gridMarginVertical
    approxEqual(result.contentArea.height, expectedContentHeight, "fuzz content height mismatch")
  }

  assert.ok(validCases >= 150, `expected at least 150 valid fuzz cases, got ${validCases}`)
})

test("guard rails: invalid settings throw explicit errors", () => {
  const base = {
    format: "A4",
    orientation: "portrait",
    marginMethod: 1,
    gridCols: 6,
    gridRows: 8,
    baseline: 12,
    baselineMultiple: 1,
    gutterMultiple: 1,
  }

  assert.throws(() => generateSwissGrid({ ...base, format: "NOPE" }), /Unsupported format/)
  assert.throws(() => generateSwissGrid({ ...base, orientation: "diagonal" }), /Unsupported orientation/)
  assert.throws(() => generateSwissGrid({ ...base, marginMethod: 9 }), /Unsupported margin method/)
  assert.throws(() => generateSwissGrid({ ...base, gridCols: 0 }), /gridCols must be an integer >= 1/)
  assert.throws(() => generateSwissGrid({ ...base, gridRows: 0 }), /gridRows must be an integer >= 1/)
  assert.throws(() => generateSwissGrid({ ...base, baseline: 0 }), /baseline must be a finite number > 0/)
  assert.throws(() => generateSwissGrid({ ...base, baselineMultiple: 0 }), /baselineMultiple must be a finite number > 0/)
  assert.throws(() => generateSwissGrid({ ...base, gutterMultiple: 0 }), /gutterMultiple must be a finite number > 0/)
  assert.throws(
    () => generateSwissGrid({ ...base, customMargins: { top: -1, bottom: 10, left: 10, right: 10 } }),
    /customMargins values must be finite numbers >= 0/,
  )
  assert.throws(
    () => generateSwissGrid({ ...base, customMargins: { top: 10, bottom: 10, left: 400, right: 400 } }),
    /content width must be > 0/,
  )
})
