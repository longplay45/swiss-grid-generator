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

export const GRID_RHYTHMS = ["fibonacci", "fifth", "fourth", "golden", "repetitive"] as const
export type GridRhythm = (typeof GRID_RHYTHMS)[number]
const GRID_RHYTHM_SET = new Set(GRID_RHYTHMS)

export function isGridRhythm(value: unknown): value is GridRhythm {
  return typeof value === "string" && GRID_RHYTHM_SET.has(value as GridRhythm)
}

export const GRID_RHYTHM_ROWS_DIRECTIONS = ["ltr", "rtl"] as const
export type GridRhythmRowsDirection = (typeof GRID_RHYTHM_ROWS_DIRECTIONS)[number]
const GRID_RHYTHM_ROWS_DIRECTION_SET = new Set(GRID_RHYTHM_ROWS_DIRECTIONS)

export function isGridRhythmRowsDirection(value: unknown): value is GridRhythmRowsDirection {
  return typeof value === "string" && GRID_RHYTHM_ROWS_DIRECTION_SET.has(value as GridRhythmRowsDirection)
}

export const GRID_RHYTHM_COLS_DIRECTIONS = ["ttb", "btt"] as const
export type GridRhythmColsDirection = (typeof GRID_RHYTHM_COLS_DIRECTIONS)[number]
const GRID_RHYTHM_COLS_DIRECTION_SET = new Set(GRID_RHYTHM_COLS_DIRECTIONS)

export function isGridRhythmColsDirection(value: unknown): value is GridRhythmColsDirection {
  return typeof value === "string" && GRID_RHYTHM_COLS_DIRECTION_SET.has(value as GridRhythmColsDirection)
}

export const LEGACY_GRID_RHYTHM_ROTATIONS = [0, 90, 180, 360] as const
export type LegacyGridRhythmRotation = (typeof LEGACY_GRID_RHYTHM_ROTATIONS)[number]
const LEGACY_GRID_RHYTHM_ROTATION_SET = new Set<number>(LEGACY_GRID_RHYTHM_ROTATIONS)

export function isLegacyGridRhythmRotation(value: unknown): value is LegacyGridRhythmRotation {
  return typeof value === "number" && LEGACY_GRID_RHYTHM_ROTATION_SET.has(value)
}

export type GridRhythmAxisSettings = {
  rhythmRowsEnabled: boolean
  rhythmRowsDirection: GridRhythmRowsDirection
  rhythmColsEnabled: boolean
  rhythmColsDirection: GridRhythmColsDirection
}

const DEFAULT_GRID_RHYTHM_AXIS_SETTINGS: GridRhythmAxisSettings = {
  rhythmRowsEnabled: true,
  rhythmRowsDirection: "ltr",
  rhythmColsEnabled: true,
  rhythmColsDirection: "ttb",
}

export function defaultGridRhythmAxisSettings(): GridRhythmAxisSettings {
  return { ...DEFAULT_GRID_RHYTHM_AXIS_SETTINGS }
}

export function resolveLegacyGridRhythmAxisSettings(
  rhythmRotation: unknown,
  rhythmRotate90: unknown,
): GridRhythmAxisSettings {
  if (rhythmRotate90 === true) {
    return {
      rhythmRowsEnabled: true,
      rhythmRowsDirection: "rtl",
      rhythmColsEnabled: true,
      rhythmColsDirection: "btt",
    }
  }

  if (!isLegacyGridRhythmRotation(rhythmRotation)) {
    return defaultGridRhythmAxisSettings()
  }

  switch (rhythmRotation) {
    case 180:
      return {
        rhythmRowsEnabled: true,
        rhythmRowsDirection: "rtl",
        rhythmColsEnabled: true,
        rhythmColsDirection: "btt",
      }
    case 90:
      return {
        rhythmRowsEnabled: true,
        rhythmRowsDirection: "rtl",
        rhythmColsEnabled: true,
        rhythmColsDirection: "ttb",
      }
    case 0:
    case 360:
    default:
      return defaultGridRhythmAxisSettings()
  }
}
