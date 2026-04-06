import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { FontFamily } from "@/lib/config/fonts"
import type { GridResult, CanvasRatioKey } from "@/lib/grid-calculator"

export type LayoutPresetUiSettings = Record<string, unknown> & {
  canvasRatio: CanvasRatioKey
  customRatioWidth?: number
  customRatioHeight?: number
  orientation: "portrait" | "landscape"
  marginMethod: 1 | 2 | 3
  gridCols: number
  gridRows: number
  baselineMultiple: number
  gutterMultiple: number
  rotation?: number
  typographyScale?: "swiss" | "golden" | "fibonacci" | "fourth" | "fifth"
  baseFont?: FontFamily
  imageColorScheme?: ImageColorSchemeId
  canvasBackground?: string | null
  customBaseline?: number
  useCustomMargins?: boolean
  customMarginMultipliers?: {
    top: number
    left: number
    right: number
    bottom: number
  }
  rhythm?: "repetitive" | "fibonacci" | "golden" | "fourth" | "fifth"
  rhythmRowsEnabled?: boolean
  rhythmRowsDirection?: "ltr" | "rtl"
  rhythmColsEnabled?: boolean
  rhythmColsDirection?: "ttb" | "btt"
  // Legacy fallback for older saved presets.
  rhythmRotation?: 0 | 90 | 180 | 360
  // Legacy fallback for older saved presets.
  rhythmRotate90?: boolean
}

export type LayoutPresetProjectSource = Record<string, unknown>

export type LayoutPresetBrowserPage = {
  id: string
  name: string
  uiSettings: LayoutPresetUiSettings
  previewLayout: Record<string, unknown> | null
  result: GridResult
  baseFont: FontFamily
  imageColorScheme: ImageColorSchemeId
  resolvedCanvasBackground: string | null
}

export type LayoutPreset = {
  id: string
  label: string
  title?: string
  description?: string
  author?: string
  createdAt?: string
  projectSource: LayoutPresetProjectSource
  browserPage: LayoutPresetBrowserPage
}
