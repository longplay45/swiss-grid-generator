export const TYPOGRAPHY_SCALES = ["swiss", "golden", "fourth", "fifth", "fibonacci"] as const
export type TypographyScale = (typeof TYPOGRAPHY_SCALES)[number]
const TYPOGRAPHY_SCALE_SET = new Set(TYPOGRAPHY_SCALES)

export function isTypographyScale(value: unknown): value is TypographyScale {
  return typeof value === "string" && TYPOGRAPHY_SCALE_SET.has(value as TypographyScale)
}

export const DISPLAY_UNITS = ["pt", "mm", "px"] as const
export type DisplayUnit = (typeof DISPLAY_UNITS)[number]
const DISPLAY_UNIT_SET = new Set(DISPLAY_UNITS)

export function isDisplayUnit(value: unknown): value is DisplayUnit {
  return typeof value === "string" && DISPLAY_UNIT_SET.has(value as DisplayUnit)
}

export const BASELINE_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72] as const

export const GRID_RHYTHMS = ["repetitive", "fibonacci"] as const
export type GridRhythm = (typeof GRID_RHYTHMS)[number]
const GRID_RHYTHM_SET = new Set(GRID_RHYTHMS)

export function isGridRhythm(value: unknown): value is GridRhythm {
  return typeof value === "string" && GRID_RHYTHM_SET.has(value as GridRhythm)
}

export const GRID_RHYTHM_ROTATIONS = [0, 90, 180, 360] as const
export type GridRhythmRotation = (typeof GRID_RHYTHM_ROTATIONS)[number]
const GRID_RHYTHM_ROTATION_SET = new Set<number>(GRID_RHYTHM_ROTATIONS)

export function isGridRhythmRotation(value: unknown): value is GridRhythmRotation {
  return typeof value === "number" && GRID_RHYTHM_ROTATION_SET.has(value)
}
