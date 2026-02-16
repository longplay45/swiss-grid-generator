import type { CanvasRatioKey } from "@/lib/grid-calculator"
import defaultPreset from "@/public/default_v001.json"
import { DEFAULT_BASE_FONT, isFontFamily, type FontFamily } from "@/lib/config/fonts"
import {
  isDisplayUnit,
  isTypographyScale,
  type DisplayUnit,
  type TypographyScale,
} from "@/lib/config/defaults"

export type MarginMethod = 1 | 2 | 3
export type Orientation = "portrait" | "landscape"

type UiSettingsLike = {
  canvasRatio?: unknown
  orientation?: unknown
  marginMethod?: unknown
  typographyScale?: unknown
  displayUnit?: unknown
  baseFont?: unknown
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
  customBaseline: number
} {
  return {
    canvasRatio: isCanvasRatioKey(uiSettings.canvasRatio) ? uiSettings.canvasRatio : "din_ab",
    orientation: resolveOrientation(uiSettings.orientation),
    marginMethod: resolveMarginMethod(uiSettings.marginMethod),
    typographyScale: resolveTypographyScale(uiSettings.typographyScale),
    displayUnit: resolveDisplayUnit(uiSettings.displayUnit),
    baseFont: resolveBaseFont(uiSettings.baseFont),
    customBaseline: resolveCustomBaseline(uiSettings.customBaseline, defaultA4Baseline),
  }
}
