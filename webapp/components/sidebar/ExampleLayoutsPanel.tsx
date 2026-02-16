type ExamplePreset = {
  label: string
  cols: number
  rows: number
  canvasRatio: "din_ab" | "letter_ansi_ab"
  orientation: "portrait" | "landscape"
  marginMethod: 1 | 2 | 3
  baselineMultiple: number
  gutterMultiple: number
}

type Props = {
  onLoadPreset: (preset: ExamplePreset) => void
  isDarkMode?: boolean
}

const EXAMPLE_PRESETS: ExamplePreset[] = [
  {
    label: "6 × 8 Grid",
    cols: 6,
    rows: 8,
    canvasRatio: "din_ab",
    orientation: "portrait",
    marginMethod: 1,
    baselineMultiple: 2,
    gutterMultiple: 1,
  },
  {
    label: "4 × 3 Layout",
    cols: 4,
    rows: 3,
    canvasRatio: "din_ab",
    orientation: "landscape",
    marginMethod: 2,
    baselineMultiple: 3,
    gutterMultiple: 0.5,
  },
]

export function ExampleLayoutsPanel({ onLoadPreset, isDarkMode = false }: Props) {
  return (
    <div>
      <h3 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Example Layouts</h3>
      <p className={`text-xs mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Click a thumbnail to load a preset layout.</p>
      <div className="grid grid-cols-1 gap-3">
        {EXAMPLE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={`group relative rounded-md border-2 transition-colors cursor-pointer overflow-hidden ${preset.orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]"} ${isDarkMode ? "border-gray-700 bg-gray-800 hover:border-blue-400 hover:bg-gray-700" : "border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"}`}
            onClick={() => onLoadPreset(preset)}
          >
            <div className={`absolute inset-2 border ${isDarkMode ? "border-gray-600 bg-gray-900" : "border-gray-300 bg-white"}`}>
              <div
                className={`h-full w-full gap-px ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${preset.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${preset.rows}, 1fr)`,
                }}
              >
                {Array.from({ length: preset.cols * preset.rows }).map((_, i) => (
                  <div key={i} className={isDarkMode ? "bg-gray-800" : "bg-gray-100"} />
                ))}
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] text-center ${isDarkMode ? "bg-gray-900/90 text-gray-300" : "bg-white/90 text-gray-600"}`}>
              {preset.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
