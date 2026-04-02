export type LayoutPresetUiSettings = Record<string, unknown> & {
  canvasRatio: "din_ab" | "letter_ansi_ab"
  orientation: "portrait" | "landscape"
  marginMethod: 1 | 2 | 3
  gridCols: number
  gridRows: number
  baselineMultiple: number
  gutterMultiple: number
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

export type LayoutPreset = {
  id: string
  label: string
  title?: string
  description?: string
  author?: string
  createdAt?: string
  uiSettings: LayoutPresetUiSettings
  previewLayout: Record<string, unknown> | null
  projectSource: LayoutPresetProjectSource
}
