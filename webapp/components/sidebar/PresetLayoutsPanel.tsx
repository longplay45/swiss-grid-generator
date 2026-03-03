import { LAYOUT_PRESETS, type LayoutPreset } from "@/lib/presets"

type Props = {
  onLoadPreset: (preset: LayoutPreset) => void
  isDarkMode?: boolean
  compact?: boolean
}

export function PresetLayoutsPanel({ onLoadPreset, isDarkMode = false, compact = false }: Props) {
  const cardGapClass = compact ? "gap-2" : "gap-3"
  return (
    <div>
      {!compact ? (
        <>
          <h3 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Presets</h3>
          <p className={`text-xs mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Double-click a thumbnail to load a preset layout.</p>
        </>
      ) : null}
      <div className={`grid grid-cols-1 ${cardGapClass}`}>
        {LAYOUT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`group relative rounded-md border-2 transition-colors cursor-pointer overflow-hidden ${preset.uiSettings.orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]"} ${compact ? "max-w-[140px]" : ""} ${isDarkMode ? "border-gray-700 bg-gray-800 hover:border-blue-400 hover:bg-gray-700" : "border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"}`}
            onDoubleClick={() => onLoadPreset(preset)}
          >
            <div className={`absolute inset-2 border ${isDarkMode ? "border-gray-600 bg-gray-900" : "border-gray-300 bg-white"}`}>
              <div
                className={`h-full w-full gap-px ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${preset.uiSettings.gridCols}, 1fr)`,
                  gridTemplateRows: `repeat(${preset.uiSettings.gridRows}, 1fr)`,
                }}
              >
                {Array.from({ length: preset.uiSettings.gridCols * preset.uiSettings.gridRows }).map((_, i) => (
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
