import type { GridRhythm, GridRhythmColsDirection, GridRhythmRowsDirection, TypographyScale } from "@/lib/config/defaults"
import type { FontFamily } from "@/lib/config/fonts"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { CanvasRatioKey } from "@/lib/grid-calculator"

export const SECTION_KEYS = ["format", "baseline", "margins", "gutter", "typo", "color", "summary"] as const
export type SectionKey = typeof SECTION_KEYS[number]

export type CustomMarginMultipliers = {
  top: number
  left: number
  right: number
  bottom: number
}

export type UiSettingsSnapshot = {
  canvasRatio: CanvasRatioKey
  exportPrintPro: boolean
  exportBleedMm: number
  exportRegistrationMarks: boolean
  orientation: "portrait" | "landscape"
  rotation: number
  marginMethod: 1 | 2 | 3
  gridCols: number
  gridRows: number
  baselineMultiple: number
  gutterMultiple: number
  rhythm: GridRhythm
  rhythmRowsEnabled: boolean
  rhythmRowsDirection: GridRhythmRowsDirection
  rhythmColsEnabled: boolean
  rhythmColsDirection: GridRhythmColsDirection
  typographyScale: TypographyScale
  baseFont: FontFamily
  imageColorScheme: ImageColorSchemeId
  canvasBackground: string | null
  customBaseline: number
  useCustomMargins: boolean
  customMarginMultipliers: CustomMarginMultipliers
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
  showLayers: boolean
  collapsed: Record<SectionKey, boolean>
}

export function buildCollapsedSectionState(
  source?: Partial<Record<SectionKey, unknown>> | null,
  fallback?: Record<SectionKey, boolean>,
): Record<SectionKey, boolean> {
  return SECTION_KEYS.reduce(
    (acc, key) => {
      const fallbackValue = fallback?.[key]
      const raw = source?.[key]
      acc[key] = typeof raw === "boolean" ? raw : typeof fallbackValue === "boolean" ? fallbackValue : true
      return acc
    },
    {} as Record<SectionKey, boolean>,
  )
}
