import type { TextAlignMode } from "@/lib/types/layout-primitives"

type OpticalMarginOptions = {
  line: string
  align: TextAlignMode
  fontSize: number
  measureWidth: (text: string) => number
  styleKey?: string
  font?: string
  measureGlyphBounds?: (char: string) => OpticalGlyphBounds | null
}

type OpticalMarginCharKind = "punctuation" | "expressive-letter" | "straight-letter" | "digit" | "other"
type OpticalMarginProfile = "default" | "display" | "fx"
export type OpticalGlyphBounds = {
  advanceWidth: number
  leftBoundary: number
  rightBoundary: number
}

type OpticalKerningSideKind =
  | "space"
  | "punctuation"
  | "expressive-letter"
  | "straight-upper"
  | "straight-lower"
  | "digit"
  | "other"

const OPTICAL_GLYPH_ALPHA_THRESHOLD = 8
const OPTICAL_GLYPH_CACHE_LIMIT = 2000
const OPTICAL_GLYPH_MAX_SCALE = 6
const OPTICAL_STEM_DOMINANCE_RATIO = 0.6

let opticalGlyphScratchContext: CanvasRenderingContext2D | null | undefined
const opticalGlyphBoundsCache = new Map<string, OpticalGlyphBounds | null>()

const LEADING_PUNCTUATION_OFFSETS_EM: Record<string, number> = {
  "\"": 0.36,
  "'": 0.3,
  "“": 0.5,
  "‘": 0.44,
  "«": 0.44,
  "‹": 0.38,
  "(": 0.32,
  "[": 0.28,
  "{": 0.24,
}

const TRAILING_PUNCTUATION_OFFSETS_EM: Record<string, number> = {
  "-": 0.22,
  "‐": 0.22,
  "‑": 0.22,
  "–": 0.18,
  "—": 0.14,
  ".": 0.28,
  ",": 0.28,
  ":": 0.22,
  ";": 0.22,
  "!": 0.2,
  "?": 0.2,
  "\"": 0.22,
  "'": 0.18,
  "”": 0.32,
  "’": 0.28,
  "»": 0.28,
  "›": 0.24,
  ")": 0.22,
  "]": 0.2,
  "}": 0.18,
}

const TRAILING_DASH_PUNCTUATION = new Set(["-", "‐", "‑", "–", "—"])
const DEFAULT_TRAILING_PUNCTUATION_SCALE = 0.2

const LEADING_EXPRESSIVE_LETTERS_EM: Record<string, number> = {
  A: 0.046,
  C: 0.055,
  G: 0.052,
  J: 0.048,
  O: 0.06,
  Q: 0.06,
  S: 0.055,
  V: 0.042,
  W: 0.038,
  Y: 0.042,
  a: 0.022,
  c: 0.028,
  d: 0.018,
  e: 0.026,
  g: 0.018,
  o: 0.03,
  q: 0.018,
  s: 0.024,
  v: 0.018,
  w: 0.016,
  y: 0.018,
}

const TRAILING_EXPRESSIVE_LETTERS_EM: Record<string, number> = {
  A: 0.038,
  C: 0.048,
  G: 0.046,
  J: 0.024,
  O: 0.055,
  Q: 0.055,
  S: 0.05,
  T: 0.11,
  V: 0.04,
  W: 0.036,
  Y: 0.04,
  a: 0.012,
  c: 0.018,
  e: 0.014,
  g: 0.012,
  o: 0.018,
  q: 0.012,
  r: 0.03,
  s: 0.018,
  v: 0.014,
  w: 0.012,
  y: 0.012,
}

function getOpticalGlyphScratchContext(): CanvasRenderingContext2D | null {
  if (opticalGlyphScratchContext !== undefined) return opticalGlyphScratchContext
  if (typeof document === "undefined") {
    opticalGlyphScratchContext = null
    return opticalGlyphScratchContext
  }
  const canvas = document.createElement("canvas")
  opticalGlyphScratchContext = canvas.getContext("2d", { willReadFrequently: true })
  return opticalGlyphScratchContext
}

export function clearOpticalMarginMeasurementCache(): void {
  opticalGlyphBoundsCache.clear()
}

function getLeadingOpticalOffsetEm(char: string): { em: number; kind: OpticalMarginCharKind } {
  const punctuationOffset = LEADING_PUNCTUATION_OFFSETS_EM[char]
  if (typeof punctuationOffset === "number") return { em: punctuationOffset, kind: "punctuation" }

  const expressiveOffset = LEADING_EXPRESSIVE_LETTERS_EM[char]
  if (typeof expressiveOffset === "number") {
    return { em: expressiveOffset, kind: "expressive-letter" }
  }

  // Apply a subtle hang for letters/digits so display words like "Swiss"
  // also benefit from optical edge alignment.
  if (/^[A-ZÄÖÜ]$/.test(char)) return { em: 0.018, kind: "straight-letter" }
  if (/^[a-zäöüß]$/.test(char)) return { em: 0.006, kind: "straight-letter" }
  if (/^\d$/.test(char)) return { em: 0.024, kind: "digit" }
  return { em: 0, kind: "other" }
}

function getTrailingOpticalOffsetEm(char: string): { em: number; kind: OpticalMarginCharKind } {
  const punctuationOffset = TRAILING_PUNCTUATION_OFFSETS_EM[char]
  if (typeof punctuationOffset === "number") return { em: punctuationOffset, kind: "punctuation" }

  const expressiveOffset = TRAILING_EXPRESSIVE_LETTERS_EM[char]
  if (typeof expressiveOffset === "number") {
    return { em: expressiveOffset, kind: "expressive-letter" }
  }

  // Keep right-aligned optical compensation consistent with left edge behavior.
  if (/^[A-ZÄÖÜ]$/.test(char)) return { em: 0.014, kind: "straight-letter" }
  if (/^[a-zäöüß]$/.test(char)) return { em: 0.006, kind: "straight-letter" }
  if (/^\d$/.test(char)) return { em: 0.024, kind: "digit" }
  return { em: 0, kind: "other" }
}

function getEdgeCharacters(line: string): { first: string | null; last: string | null } {
  const trimmed = line.trim()
  if (!trimmed) {
    return { first: null, last: null }
  }
  const chars = Array.from(trimmed)
  return {
    first: chars[0] ?? null,
    last: chars[chars.length - 1] ?? null,
  }
}

function clampHangingOffset(desired: number, glyphWidth: number): number {
  if (desired <= 0 || glyphWidth <= 0) return 0
  return Math.min(desired, glyphWidth * 0.9)
}

function resolveOpticalMarginProfile(styleKey: string | undefined): OpticalMarginProfile {
  if (styleKey === "fx") return "fx"
  if (styleKey === "display" || styleKey === "headline") return "display"
  return "default"
}

function resolveOpticalKerningSideKind(char: string): OpticalKerningSideKind {
  if (!char || /^\s+$/.test(char)) return "space"
  if (LEADING_PUNCTUATION_OFFSETS_EM[char] || TRAILING_PUNCTUATION_OFFSETS_EM[char]) return "punctuation"
  if (LEADING_EXPRESSIVE_LETTERS_EM[char] || TRAILING_EXPRESSIVE_LETTERS_EM[char]) return "expressive-letter"
  if (/^[A-ZÄÖÜ]$/.test(char)) return "straight-upper"
  if (/^[a-zäöüß]$/.test(char)) return "straight-lower"
  if (/^\d$/.test(char)) return "digit"
  return "other"
}

function getOpticalKerningSideFactor(char: string): number {
  if (char === "T" || char === "Y" || char === "V" || char === "W" || char === "A") return 0.88
  switch (resolveOpticalKerningSideKind(char)) {
    case "space":
      return 0
    case "punctuation":
      return 0.96
    case "expressive-letter":
      return 0.82
    case "straight-upper":
      return 0.42
    case "straight-lower":
      return 0.32
    case "digit":
      return 0.28
    default:
      return 0.24
  }
}

function getOpticalKerningStrength(profile: OpticalMarginProfile, fontSize: number): number {
  const normalizedLargeText = Math.max(0, Math.min(1, (fontSize - 24) / 180))
  switch (profile) {
    case "fx":
      return 1.12 + normalizedLargeText * 0.2
    case "display":
      return 1.06 + normalizedLargeText * 0.16
    default:
      return 1 + normalizedLargeText * 0.12
  }
}

function getProfileLetterScale(profile: OpticalMarginProfile, fontSize: number): number {
  const normalizedLargeText = Math.max(0, Math.min(1, (fontSize - 72) / 240))
  switch (profile) {
    case "fx":
      return 1 + normalizedLargeText * 1.1
    case "display":
      return 1 + normalizedLargeText * 0.55
    default:
      return 1
  }
}

function getProfileGlyphRatio(profile: OpticalMarginProfile, fontSize: number): number {
  if (fontSize < 96) return 0
  switch (profile) {
    case "fx":
      return fontSize >= 200 ? 0.12 : 0.09
    case "display":
      return fontSize >= 160 ? 0.08 : 0.05
    default:
      return 0
  }
}

function getProfileCoverageThreshold(profile: OpticalMarginProfile, fontSize: number): number {
  const normalizedLargeText = Math.max(0, Math.min(1, (fontSize - 48) / 240))
  switch (profile) {
    case "fx":
      return 0.36 + normalizedLargeText * 0.08
    case "display":
      return 0.33 + normalizedLargeText * 0.06
    default:
      return 0.3 + normalizedLargeText * 0.04
  }
}

function getProfileMassTrimRatio(profile: OpticalMarginProfile, fontSize: number): number {
  const normalizedLargeText = Math.max(0, Math.min(1, (fontSize - 48) / 240))
  switch (profile) {
    case "fx":
      return 0.02 + normalizedLargeText * 0.025
    case "display":
      return 0.016 + normalizedLargeText * 0.018
    default:
      return 0.012 + normalizedLargeText * 0.01
  }
}

function getOpticalRenderScale(fontSize: number): number {
  if (fontSize <= 0) return 1
  return Math.max(1, Math.min(OPTICAL_GLYPH_MAX_SCALE, 180 / fontSize))
}

function smoothValues(values: number[]): number[] {
  if (values.length <= 2) return values
  return values.map((value, index) => {
    const prev = values[Math.max(0, index - 1)] ?? value
    const next = values[Math.min(values.length - 1, index + 1)] ?? value
    return (prev + value * 2 + next) / 4
  })
}

function findCoverageBoundary(
  coverage: number[],
  threshold: number,
  side: "left" | "right",
): number | null {
  if (!coverage.length) return null
  if (side === "left") {
    for (let index = 0; index < coverage.length; index += 1) {
      if (coverage[index] >= threshold) return index + 0.5
    }
    return 0
  }

  for (let index = coverage.length - 1; index >= 0; index -= 1) {
    if (coverage[index] >= threshold) return index + 0.5
  }
  return coverage.length
}

function findMassBoundary(
  massByColumn: number[],
  totalMass: number,
  trimRatio: number,
  side: "left" | "right",
): number | null {
  if (!massByColumn.length || totalMass <= 0 || trimRatio <= 0) return null
  const target = totalMass * trimRatio
  let cumulative = 0

  if (side === "left") {
    for (let index = 0; index < massByColumn.length; index += 1) {
      const columnMass = massByColumn[index] ?? 0
      cumulative += columnMass
      if (cumulative >= target) {
        const before = cumulative - columnMass
        const fraction = columnMass > 0 ? (target - before) / columnMass : 0
        return index + Math.max(0, Math.min(1, fraction))
      }
    }
    return massByColumn.length
  }

  for (let index = massByColumn.length - 1; index >= 0; index -= 1) {
    const columnMass = massByColumn[index] ?? 0
    cumulative += columnMass
    if (cumulative >= target) {
      const before = cumulative - columnMass
      const fraction = columnMass > 0 ? (target - before) / columnMass : 0
      return index + 1 - Math.max(0, Math.min(1, fraction))
    }
  }
  return 0
}

function getQuantile(values: number[], quantile: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const clamped = Math.max(0, Math.min(1, quantile))
  const index = (sorted.length - 1) * clamped
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  if (lowerIndex === upperIndex) return sorted[lowerIndex] ?? 0
  const fraction = index - lowerIndex
  const lower = sorted[lowerIndex] ?? 0
  const upper = sorted[upperIndex] ?? lower
  return lower + (upper - lower) * fraction
}

function getProfileContourQuantile(profile: OpticalMarginProfile, fontSize: number): number {
  const normalizedLargeText = Math.max(0, Math.min(1, (fontSize - 48) / 240))
  switch (profile) {
    case "fx":
      return Math.max(0.08, 0.16 - normalizedLargeText * 0.04)
    case "display":
      return Math.max(0.1, 0.18 - normalizedLargeText * 0.035)
    default:
      return Math.max(0.12, 0.2 - normalizedLargeText * 0.025)
  }
}

export function resolveDominantStemBoundaryPx(
  offsetsPx: number[],
  edgePx: number,
  side: "left" | "right",
  tolerancePx: number,
): number | null {
  if (!offsetsPx.length) return null
  const medianOffset = getQuantile(offsetsPx, 0.5)
  const nearEdgeRatio = offsetsPx.filter((offset) => offset <= tolerancePx).length / offsetsPx.length
  if (medianOffset > tolerancePx || nearEdgeRatio < OPTICAL_STEM_DOMINANCE_RATIO) return null
  const stableOffset = getQuantile(offsetsPx, 0.25)
  if (side === "left") return edgePx + stableOffset
  return edgePx - stableOffset
}

export function resolveConservativeContourBoundaryPx(
  offsetsPx: number[],
  edgePx: number,
  side: "left" | "right",
  quantile: number,
): number | null {
  if (!offsetsPx.length) return null
  const smoothedOffsets = smoothValues(offsetsPx)
  const profiledOffset = getQuantile(smoothedOffsets, quantile)
  if (side === "left") return edgePx + profiledOffset
  return edgePx - profiledOffset
}

function buildGlyphBoundsCacheKey(
  char: string,
  font: string,
  fontSize: number,
  profile: OpticalMarginProfile,
): string {
  return `${font}::${profile}::${fontSize.toFixed(3)}::${char}`
}

function makeCachedGlyphBounds(
  key: string,
  compute: () => OpticalGlyphBounds | null,
): OpticalGlyphBounds | null {
  if (opticalGlyphBoundsCache.has(key)) return opticalGlyphBoundsCache.get(key) ?? null
  const value = compute()
  opticalGlyphBoundsCache.set(key, value)
  if (opticalGlyphBoundsCache.size > OPTICAL_GLYPH_CACHE_LIMIT) opticalGlyphBoundsCache.clear()
  return value
}

function measureOpticalGlyphBoundsFromCanvas(
  char: string,
  font: string | undefined,
  fontSize: number,
  profile: OpticalMarginProfile,
): OpticalGlyphBounds | null {
  if (!font || fontSize <= 0) return null
  const cacheKey = buildGlyphBoundsCacheKey(char, font, fontSize, profile)
  return makeCachedGlyphBounds(cacheKey, () => {
    const ctx = getOpticalGlyphScratchContext()
    if (!ctx) return null

    ctx.font = font
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"

    const metrics = ctx.measureText(char)
    const advanceWidth = metrics.width
    if (!(advanceWidth > 0)) return null

    const renderScale = getOpticalRenderScale(fontSize)
    const padding = Math.max(8, Math.ceil(fontSize * 0.24))
    const leftAllowance = Math.ceil(Math.max(fontSize * 0.6, Math.abs(metrics.actualBoundingBoxLeft)))
    const rightAllowance = Math.ceil(Math.max(fontSize * 0.6, metrics.actualBoundingBoxRight, advanceWidth))
    const ascent = Math.ceil(Math.max(fontSize * 0.8, metrics.actualBoundingBoxAscent))
    const descent = Math.ceil(Math.max(fontSize * 0.25, metrics.actualBoundingBoxDescent))
    const originX = padding + leftAllowance
    const baselineY = padding + ascent
    const widthUnits = Math.max(1, originX + rightAllowance + padding)
    const heightUnits = Math.max(1, baselineY + descent + padding)
    const canvas = ctx.canvas
    const widthPx = Math.max(1, Math.ceil(widthUnits * renderScale))
    const heightPx = Math.max(1, Math.ceil(heightUnits * renderScale))

    if (canvas.width !== widthPx) canvas.width = widthPx
    if (canvas.height !== heightPx) canvas.height = heightPx

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, widthPx, heightPx)
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0)
    ctx.font = font
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
    ctx.fillStyle = "#000"
    ctx.fillText(char, originX, baselineY)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    let imageData: ImageData
    try {
      imageData = ctx.getImageData(0, 0, widthPx, heightPx)
    } catch {
      return null
    }

    let minX = widthPx
    let maxX = -1
    let minY = heightPx
    let maxY = -1
    for (let y = 0; y < heightPx; y += 1) {
      for (let x = 0; x < widthPx; x += 1) {
        const alpha = imageData.data[(y * widthPx + x) * 4 + 3] ?? 0
        if (alpha <= OPTICAL_GLYPH_ALPHA_THRESHOLD) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }

    if (maxX < minX || maxY < minY) return null

    const rowCount = Math.max(1, maxY - minY + 1)
    const columnCount = Math.max(1, maxX - minX + 1)
    const massByColumn = new Array<number>(columnCount).fill(0)
    const leftEdgeOffsetsPx: number[] = []
    const rightEdgeOffsetsPx: number[] = []
    for (let y = minY; y <= maxY; y += 1) {
      let firstInkX = -1
      let lastInkX = -1
      for (let x = minX; x <= maxX; x += 1) {
        const alpha = imageData.data[(y * widthPx + x) * 4 + 3] ?? 0
        if (alpha <= OPTICAL_GLYPH_ALPHA_THRESHOLD) continue
        if (firstInkX < 0) firstInkX = x
        lastInkX = x
        massByColumn[x - minX] += alpha / 255
      }
      if (firstInkX >= 0 && lastInkX >= 0) {
        leftEdgeOffsetsPx.push(firstInkX - minX)
        rightEdgeOffsetsPx.push(maxX - lastInkX)
      }
    }

    const coverageByColumn = smoothValues(massByColumn.map((mass) => mass / rowCount))
    const peakCoverage = Math.max(...coverageByColumn, 0)
    const coverageThreshold = Math.max(0.1, peakCoverage * getProfileCoverageThreshold(profile, fontSize))
    const totalMass = massByColumn.reduce((sum, value) => sum + value, 0)
    const trimRatio = getProfileMassTrimRatio(profile, fontSize)
    const contourQuantile = getProfileContourQuantile(profile, fontSize)
    const leftCoverageBoundary = findCoverageBoundary(coverageByColumn, coverageThreshold, "left")
    const rightCoverageBoundary = findCoverageBoundary(coverageByColumn, coverageThreshold, "right")
    const leftMassBoundary = findMassBoundary(massByColumn, totalMass, trimRatio, "left")
    const rightMassBoundary = findMassBoundary(massByColumn, totalMass, trimRatio, "right")
    const stemTolerancePx = Math.max(1, renderScale * 0.85)
    const leftStemBoundaryPx = resolveDominantStemBoundaryPx(
      leftEdgeOffsetsPx,
      minX,
      "left",
      stemTolerancePx,
    )
    const rightStemBoundaryPx = resolveDominantStemBoundaryPx(
      rightEdgeOffsetsPx,
      maxX + 1,
      "right",
      stemTolerancePx,
    )
    const leftContourBoundaryPx = resolveConservativeContourBoundaryPx(
      leftEdgeOffsetsPx,
      minX,
      "left",
      contourQuantile,
    )
    const rightContourBoundaryPx = resolveConservativeContourBoundaryPx(
      rightEdgeOffsetsPx,
      maxX + 1,
      "right",
      contourQuantile,
    )

    // Prefer a dominant outer stem when it is present; otherwise fall back to
    // coverage and edge-mass trimming, capped by a conservative row-profile
    // boundary so curved letters like "S" and diagonals like "X" do not overhang too far.
    const leftBoundaryPx = leftStemBoundaryPx ?? Math.min(
      minX + Math.max(leftCoverageBoundary ?? 0, leftMassBoundary ?? 0),
      leftContourBoundaryPx ?? Number.POSITIVE_INFINITY,
    )
    const rightBoundaryPx = rightStemBoundaryPx ?? Math.max(
      minX + Math.min(rightCoverageBoundary ?? columnCount, rightMassBoundary ?? columnCount),
      rightContourBoundaryPx ?? Number.NEGATIVE_INFINITY,
    )

    return {
      advanceWidth,
      leftBoundary: leftBoundaryPx / renderScale - originX,
      rightBoundary: rightBoundaryPx / renderScale - originX,
    }
  })
}

function resolveStyledHangingOffset(
  edgeOffset: { em: number; kind: OpticalMarginCharKind },
  glyphWidth: number,
  fontSize: number,
  profile: OpticalMarginProfile,
): number {
  if (edgeOffset.em <= 0) return 0

  const desiredFromEm = edgeOffset.em * fontSize * (
    edgeOffset.kind === "punctuation" || edgeOffset.kind === "straight-letter"
      ? 1
      : getProfileLetterScale(profile, fontSize)
  )
  if (edgeOffset.kind === "punctuation" || edgeOffset.kind === "straight-letter") {
    return clampHangingOffset(desiredFromEm, glyphWidth)
  }

  const glyphRatio = getProfileGlyphRatio(profile, fontSize)
  const desiredFromGlyph = glyphRatio > 0 ? glyphWidth * glyphRatio : 0
  return clampHangingOffset(Math.max(desiredFromEm, desiredFromGlyph), glyphWidth)
}

function resolveMeasuredLeftHangingOffset(
  char: string,
  measuredOffset: number,
  edgeOffset: { em: number; kind: OpticalMarginCharKind },
  glyphWidth: number,
  fontSize: number,
  profile: OpticalMarginProfile,
): number {
  if (!(measuredOffset > 0)) return 0
  if (char !== "T" || edgeOffset.kind !== "straight-letter") return measuredOffset
  const fallbackOffset = resolveStyledHangingOffset(edgeOffset, glyphWidth, fontSize, profile)
  if (!(fallbackOffset > 0)) return measuredOffset
  return Math.min(measuredOffset, fallbackOffset)
}

function resolveMeasuredRightHangingOffset(
  measuredOffset: number,
  edgeOffset: { em: number; kind: OpticalMarginCharKind },
  glyphWidth: number,
  fontSize: number,
  profile: OpticalMarginProfile,
): number {
  const fallbackOffset = resolveStyledHangingOffset(edgeOffset, glyphWidth, fontSize, profile)
  if (!(measuredOffset > 0)) return fallbackOffset
  if (!(fallbackOffset > 0)) return measuredOffset
  return Math.max(measuredOffset, fallbackOffset)
}

function shouldPreferStyledTrailingOffset(
  edgeOffset: { em: number; kind: OpticalMarginCharKind },
  profile: OpticalMarginProfile,
  fontSize: number,
): boolean {
  if (edgeOffset.kind === "punctuation") return false
  if (profile === "fx") return false
  return fontSize <= 32
}

function shouldHangTrailingPunctuation(
  char: string,
  profile: OpticalMarginProfile,
): boolean {
  if (TRAILING_DASH_PUNCTUATION.has(char)) return profile !== "default"
  return profile !== "default"
}

function resolveDefaultProfileTrailingPunctuationOffset(
  char: string,
  edgeOffset: { em: number; kind: OpticalMarginCharKind },
  glyphWidth: number,
  fontSize: number,
): number {
  if (edgeOffset.kind !== "punctuation" || TRAILING_DASH_PUNCTUATION.has(char)) return 0
  return resolveStyledHangingOffset(
    { ...edgeOffset, em: edgeOffset.em * DEFAULT_TRAILING_PUNCTUATION_SCALE },
    glyphWidth,
    fontSize,
    "default",
  )
}

export function resolveOpticalKerningPairAdjustment({
  left,
  right,
  leftBounds,
  rightBounds,
  pairAdvance,
  fontSize,
  styleKey,
}: {
  left: string
  right: string
  leftBounds: OpticalGlyphBounds
  rightBounds: OpticalGlyphBounds
  pairAdvance: number
  fontSize: number
  styleKey?: string
}): number {
  if (!left || !right || fontSize <= 0) return 0
  if (resolveOpticalKerningSideKind(left) === "space" || resolveOpticalKerningSideKind(right) === "space") {
    return 0
  }

  const currentGap = pairAdvance + rightBounds.leftBoundary - leftBounds.rightBoundary
  if (!(currentGap > 0)) return 0

  const trailingWhitespace = Math.max(0, leftBounds.advanceWidth - leftBounds.rightBoundary)
  const leadingWhitespace = Math.max(0, rightBounds.leftBoundary)
  const whitespaceBudget = Math.max(currentGap, trailingWhitespace + leadingWhitespace)
  if (!(whitespaceBudget > 0)) return 0

  const openness = (getOpticalKerningSideFactor(left) + getOpticalKerningSideFactor(right)) / 2
  const profile = resolveOpticalMarginProfile(styleKey)
  const strength = getOpticalKerningStrength(profile, fontSize)
  const desiredTightening = whitespaceBudget * (0.08 + openness * 0.28) * strength
  const minGap = fontSize * (0.016 + (1 - openness) * 0.014)
  const maxTightening = Math.max(0, currentGap - minGap)
  const tighteningCap = fontSize * (0.032 + openness * 0.06) * strength

  return -Math.min(maxTightening, desiredTightening, tighteningCap)
}

export function getOpticalKerningPairAdjustment({
  left,
  right,
  font,
  fontSize,
  pairAdvance,
  styleKey,
  measureGlyphBounds,
}: {
  left: string
  right: string
  font?: string
  fontSize: number
  pairAdvance: number
  styleKey?: string
  measureGlyphBounds?: (char: string) => OpticalGlyphBounds | null
}): number {
  if (!left || !right || !font || fontSize <= 0) return 0
  if (resolveOpticalKerningSideKind(left) === "space" || resolveOpticalKerningSideKind(right) === "space") {
    return 0
  }

  const profile = resolveOpticalMarginProfile(styleKey)
  const leftBounds = measureGlyphBounds?.(left) ?? measureOpticalGlyphBoundsFromCanvas(left, font, fontSize, profile)
  const rightBounds = measureGlyphBounds?.(right) ?? measureOpticalGlyphBoundsFromCanvas(right, font, fontSize, profile)
  if (!leftBounds || !rightBounds) return 0

  return resolveOpticalKerningPairAdjustment({
    left,
    right,
    leftBounds,
    rightBounds,
    pairAdvance,
    fontSize,
    styleKey,
  })
}

export function getOpticalTerminalCaretAdvance({
  char,
  font,
  fontSize,
  styleKey,
  measureGlyphBounds,
}: {
  char: string
  font?: string
  fontSize: number
  styleKey?: string
  measureGlyphBounds?: (char: string) => OpticalGlyphBounds | null
}): number | null {
  if (!char || !font || fontSize <= 0) return null
  if (!TRAILING_PUNCTUATION_OFFSETS_EM[char]) return null
  const profile = resolveOpticalMarginProfile(styleKey)
  const measured = measureGlyphBounds?.(char) ?? measureOpticalGlyphBoundsFromCanvas(char, font, fontSize, profile)
  if (!measured) return null
  return Math.max(0, Math.min(measured.advanceWidth, measured.rightBoundary))
}

export function getOpticalMarginAnchorOffset({
  line,
  align,
  fontSize,
  measureWidth,
  styleKey,
  font,
  measureGlyphBounds,
}: OpticalMarginOptions): number {
  const { first, last } = getEdgeCharacters(line)
  if (!first || !last || fontSize <= 0) return 0
  if (align === "center") return 0
  const profile = resolveOpticalMarginProfile(styleKey)

  // Left-aligned lines hang opening punctuation into the left margin.
  if (align === "left") {
    const edgeOffset = getLeadingOpticalOffsetEm(first)
    if (!LEADING_PUNCTUATION_OFFSETS_EM[first]) {
      const measured = measureGlyphBounds?.(first) ?? measureOpticalGlyphBoundsFromCanvas(first, font, fontSize, profile)
      if (measured) {
        const glyphWidth = measureWidth(first)
        return -resolveMeasuredLeftHangingOffset(
          first,
          measured.leftBoundary,
          edgeOffset,
          glyphWidth,
          fontSize,
          profile,
        )
      }
    }
    const glyphWidth = measureWidth(first)
    return -resolveStyledHangingOffset(edgeOffset, glyphWidth, fontSize, profile)
  }

  const edgeOffset = getTrailingOpticalOffsetEm(last)
  const glyphWidth = measureWidth(last)
  if (edgeOffset.kind === "punctuation" && !shouldHangTrailingPunctuation(last, profile)) {
    return resolveDefaultProfileTrailingPunctuationOffset(last, edgeOffset, glyphWidth, fontSize)
  }
  const measured = measureGlyphBounds?.(last) ?? measureOpticalGlyphBoundsFromCanvas(last, font, fontSize, profile)
  const resolvedGlyphWidth = glyphWidth || measured?.advanceWidth || 0
  if (shouldPreferStyledTrailingOffset(edgeOffset, profile, fontSize)) {
    return resolveStyledHangingOffset(edgeOffset, resolvedGlyphWidth, fontSize, profile)
  }
  if (measured) {
    return resolveMeasuredRightHangingOffset(
      Math.max(0, measured.advanceWidth - measured.rightBoundary),
      edgeOffset,
      resolvedGlyphWidth,
      fontSize,
      profile,
    )
  }
  return resolveStyledHangingOffset(edgeOffset, resolvedGlyphWidth, fontSize, profile)
}
