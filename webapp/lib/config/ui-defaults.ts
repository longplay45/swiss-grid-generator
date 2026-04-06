import type { CanvasRatioKey } from "@/lib/grid-calculator"
import { getImageSchemeColorToken } from "@/lib/config/color-schemes"
import type { UiSettingsSnapshot } from "@/lib/workspace-ui-schema"

export type MarginMethod = 1 | 2 | 3
export type Orientation = "portrait" | "landscape"

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

export const DEFAULT_UI: UiSettingsSnapshot = {
  canvasRatio: "din_ab",
  orientation: "portrait",
  rotation: 0,
  marginMethod: 1,
  gridCols: 3,
  gridRows: 6,
  baselineMultiple: 1,
  gutterMultiple: 1,
  rhythm: "repetitive",
  rhythmRowsEnabled: true,
  rhythmRowsDirection: "ltr",
  rhythmColsEnabled: true,
  rhythmColsDirection: "ttb",
  typographyScale: "swiss",
  baseFont: "Inter",
  imageColorScheme: "swiss-modern",
  canvasBackground: getImageSchemeColorToken(0),
  customBaseline: 12,
  useCustomMargins: true,
  customMarginMultipliers: {
    top: 2,
    left: 2,
    right: 2,
    bottom: 3,
  },
  showBaselines: true,
  showModules: true,
  showMargins: true,
  showImagePlaceholders: true,
  showTypography: true,
  showLayers: false,
  collapsed: {
    format: true,
    baseline: true,
    margins: true,
    gutter: true,
    typo: true,
    color: true,
    summary: true,
  },
  exportPrintPro: false,
  exportBleedMm: 0,
  exportRegistrationMarks: false,
}
