import type { CanvasRatioKey } from "@/lib/grid-calculator"
import defaultPreset from "@/public/default_v001.json"
import { DEFAULT_BASE_FONT, isFontFamily, type FontFamily } from "@/lib/config/fonts"
import {
  defaultGridRhythmAxisSettings,
  isGridRhythm,
  isGridRhythmColsDirection,
  isGridRhythmRowsDirection,
  isDisplayUnit,
  isTypographyScale,
  resolveLegacyGridRhythmAxisSettings,
  type DisplayUnit,
  type GridRhythmAxisSettings,
  type GridRhythmColsDirection,
  type GridRhythm,
  type GridRhythmRowsDirection,
  type TypographyScale,
} from "@/lib/config/defaults"
import {
  DEFAULT_IMAGE_COLOR_SCHEME_ID,
  isImageColorSchemeId,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"

export type MarginMethod = 1 | 2 | 3
export type Orientation = "portrait" | "landscape"

type UiSettingsLike = {
  canvasRatio?: unknown
  orientation?: unknown
  marginMethod?: unknown
  typographyScale?: unknown
  displayUnit?: unknown
  baseFont?: unknown
  imageColorScheme?: unknown
  rhythm?: unknown
  rhythmRowsEnabled?: unknown
  rhythmRowsDirection?: unknown
  rhythmColsEnabled?: unknown
  rhythmColsDirection?: unknown
  rhythmRotation?: unknown
  rhythmRotate90?: unknown
  customBaseline?: unknown
}

export const CANVAS_RATIO_KEYS = [
  "din_ab",
  "letter_ansi_ab",
  "balanced_3_4",
  "photo_2_3",
  "screen_16_9",
  "square_1_1",
  "editorial_4_5",
  "wide_2_1",
] as const satisfies readonly CanvasRatioKey[]

const CANVAS_RATIO_SET = new Set<CanvasRatioKey>(CANVAS_RATIO_KEYS)

export function isCanvasRatioKey(value: unknown): value is CanvasRatioKey {
  return typeof value === "string" && CANVAS_RATIO_SET.has(value as CanvasRatioKey)
}

export const PREVIEW_DEFAULT_FORMAT_BY_RATIO: Record<CanvasRatioKey, string> = {
  din_ab: "A4",
  letter_ansi_ab: "LETTER",
  balanced_3_4: "BALANCED_3_4",
  photo_2_3: "PHOTO_2_3",
  screen_16_9: "SCREEN_16_9",
  square_1_1: "SQUARE_1_1",
  editorial_4_5: "EDITORIAL_4_5",
  wide_2_1: "WIDE_2_1",
}

export const DEFAULT_UI = defaultPreset.uiSettings
export const DEFAULT_PREVIEW_LAYOUT = defaultPreset.previewLayout

function resolveOrientation(value: unknown): Orientation {
  return value === "landscape" ? "landscape" : "portrait"
}

function resolveMarginMethod(value: unknown): MarginMethod {
  return value === 2 || value === 3 ? value : 1
}

function resolveTypographyScale(value: unknown): TypographyScale {
  return isTypographyScale(value) ? value : "swiss"
}

function resolveDisplayUnit(value: unknown): DisplayUnit {
  return isDisplayUnit(value) ? value : "pt"
}

function resolveBaseFont(value: unknown): FontFamily {
  return isFontFamily(value) ? value : DEFAULT_BASE_FONT
}

function resolveImageColorScheme(value: unknown): ImageColorSchemeId {
  return isImageColorSchemeId(value) ? value : DEFAULT_IMAGE_COLOR_SCHEME_ID
}

function resolveRhythm(value: unknown): GridRhythm {
  return isGridRhythm(value) ? value : "repetitive"
}

function resolveRhythmRowsDirection(value: unknown, fallback: GridRhythmRowsDirection): GridRhythmRowsDirection {
  return isGridRhythmRowsDirection(value) ? value : fallback
}

function resolveRhythmColsDirection(value: unknown, fallback: GridRhythmColsDirection): GridRhythmColsDirection {
  return isGridRhythmColsDirection(value) ? value : fallback
}

function resolveRhythmAxisSettings(uiSettings: UiSettingsLike): GridRhythmAxisSettings {
  const fallback = resolveLegacyGridRhythmAxisSettings(uiSettings.rhythmRotation, uiSettings.rhythmRotate90)
  const defaults = defaultGridRhythmAxisSettings()
  return {
    rhythmRowsEnabled: typeof uiSettings.rhythmRowsEnabled === "boolean"
      ? uiSettings.rhythmRowsEnabled
      : fallback.rhythmRowsEnabled ?? defaults.rhythmRowsEnabled,
    rhythmRowsDirection: resolveRhythmRowsDirection(
      uiSettings.rhythmRowsDirection,
      fallback.rhythmRowsDirection ?? defaults.rhythmRowsDirection,
    ),
    rhythmColsEnabled: typeof uiSettings.rhythmColsEnabled === "boolean"
      ? uiSettings.rhythmColsEnabled
      : fallback.rhythmColsEnabled ?? defaults.rhythmColsEnabled,
    rhythmColsDirection: resolveRhythmColsDirection(
      uiSettings.rhythmColsDirection,
      fallback.rhythmColsDirection ?? defaults.rhythmColsDirection,
    ),
  }
}

function resolveCustomBaseline(value: unknown, defaultA4Baseline: number): number {
  return typeof value === "number" ? value : defaultA4Baseline
}

export function resolveUiDefaults(
  uiSettings: UiSettingsLike,
  defaultA4Baseline: number,
): {
  canvasRatio: CanvasRatioKey
  orientation: Orientation
  marginMethod: MarginMethod
  typographyScale: TypographyScale
  displayUnit: DisplayUnit
  baseFont: FontFamily
  imageColorScheme: ImageColorSchemeId
  rhythm: GridRhythm
  rhythmRowsEnabled: boolean
  rhythmRowsDirection: GridRhythmRowsDirection
  rhythmColsEnabled: boolean
  rhythmColsDirection: GridRhythmColsDirection
  customBaseline: number
} {
  const rhythmAxisSettings = resolveRhythmAxisSettings(uiSettings)
  return {
    canvasRatio: isCanvasRatioKey(uiSettings.canvasRatio) ? uiSettings.canvasRatio : "din_ab",
    orientation: resolveOrientation(uiSettings.orientation),
    marginMethod: resolveMarginMethod(uiSettings.marginMethod),
    typographyScale: resolveTypographyScale(uiSettings.typographyScale),
    displayUnit: resolveDisplayUnit(uiSettings.displayUnit),
    baseFont: resolveBaseFont(uiSettings.baseFont),
    imageColorScheme: resolveImageColorScheme(uiSettings.imageColorScheme),
    rhythm: resolveRhythm(uiSettings.rhythm),
    rhythmRowsEnabled: rhythmAxisSettings.rhythmRowsEnabled,
    rhythmRowsDirection: rhythmAxisSettings.rhythmRowsDirection,
    rhythmColsEnabled: rhythmAxisSettings.rhythmColsEnabled,
    rhythmColsDirection: rhythmAxisSettings.rhythmColsDirection,
    customBaseline: resolveCustomBaseline(uiSettings.customBaseline, defaultA4Baseline),
  }
}
