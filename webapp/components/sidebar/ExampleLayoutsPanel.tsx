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

export function ExampleLayoutsPanel({ onLoadPreset }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Example Layouts</h3>
      <p className="text-xs text-gray-600 mb-4">Click a thumbnail to load a preset layout.</p>
      <div className="grid grid-cols-2 gap-3">
        {EXAMPLE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="group relative aspect-[3/4] rounded-md border-2 border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer overflow-hidden"
            onClick={() => onLoadPreset(preset)}
          >
            <div className="absolute inset-2 border border-gray-300 bg-white">
              <div
                className="h-full w-full gap-px bg-gray-200"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${preset.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${preset.rows}, 1fr)`,
                }}
              >
                {Array.from({ length: preset.cols * preset.rows }).map((_, i) => (
                  <div key={i} className="bg-gray-100" />
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 px-2 py-1 text-[10px] text-gray-600 text-center">
              {preset.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
