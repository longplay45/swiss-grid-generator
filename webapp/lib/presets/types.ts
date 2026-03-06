export type LayoutPresetUiSettings = Record<string, unknown> & {
  canvasRatio: "din_ab" | "letter_ansi_ab"
  orientation: "portrait" | "landscape"
  marginMethod: 1 | 2 | 3
  gridCols: number
  gridRows: number
  baselineMultiple: number
  gutterMultiple: number
  rhythm?: "repetitive" | "fibonacci"
  rhythmRotate90?: boolean
}

export type LayoutPreset = {
  id: string
  label: string
  title?: string
  description?: string
  author?: string
  createdAt?: string
  uiSettings: LayoutPresetUiSettings
  previewLayout: Record<string, unknown> | null
}
