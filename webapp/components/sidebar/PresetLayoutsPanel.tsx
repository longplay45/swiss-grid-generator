import { LAYOUT_PRESETS, type LayoutPreset } from "@/lib/presets"
import { HoverTooltip } from "@/components/ui/hover-tooltip"

type Props = {
  onLoadPreset: (preset: LayoutPreset) => void
  isDarkMode?: boolean
  compact?: boolean
  showHelpHints?: boolean
  onHelpNavigate?: () => void
}

function formatPresetCreatedAt(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export function PresetLayoutsPanel({
  onLoadPreset,
  isDarkMode = false,
  compact = false,
  showHelpHints = false,
  onHelpNavigate,
}: Props) {
  const cardGapClass = compact ? "gap-2" : "gap-3"
  const minCardWidth = compact ? 120 : 168
  return (
    <div
      className={showHelpHints ? "rounded-md ring-1 ring-blue-500 p-2 -m-2" : undefined}
      onMouseEnter={showHelpHints ? onHelpNavigate : undefined}
    >
      {!compact ? (
        <>
          <h3 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            <span>Presets</span>
            {showHelpHints ? (
              <span
                className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[10px] leading-none ${
                  isDarkMode
                    ? "border-blue-400 bg-blue-500 text-white"
                    : "border-blue-500 bg-blue-500 text-white"
                }`}
              >
                ?
              </span>
            ) : null}
          </h3>
          <p className={`text-xs mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Double-click a thumbnail to load a preset layout.</p>
        </>
      ) : null}
      {compact && showHelpHints ? (
        <div className="mb-2 flex justify-end">
          <span
            className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[10px] leading-none ${
              isDarkMode
                ? "border-blue-400 bg-blue-500 text-white"
                : "border-blue-500 bg-blue-500 text-white"
            }`}
          >
            ?
          </span>
        </div>
      ) : null}
      <div
        className={`grid items-end ${cardGapClass}`}
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))` }}
      >
        {LAYOUT_PRESETS.map((preset) => (
          <HoverTooltip
            key={preset.id}
            className="block"
            tooltipClassName={`left-2 top-2 w-72 max-w-[80vw] whitespace-normal border px-2 py-2 text-[11px] leading-snug ${
              isDarkMode
                ? "border-gray-600 bg-gray-900/95 text-gray-200"
                : "border-gray-300 bg-white/95 text-gray-700"
            }`}
            label={(
              <div className="space-y-0.5">
                <div><span className="font-semibold">Title:</span> {preset.title ?? preset.label}</div>
                <div><span className="font-semibold">Description:</span> {preset.description || "—"}</div>
                <div><span className="font-semibold">Author:</span> {preset.author || "—"}</div>
                <div><span className="font-semibold">Date Created:</span> {formatPresetCreatedAt(preset.createdAt)}</div>
              </div>
            )}
          >
            <button
              type="button"
              className={`relative w-full rounded-md border-2 transition-colors cursor-pointer overflow-hidden ${preset.uiSettings.orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]"} ${isDarkMode ? "border-gray-700 bg-gray-800 hover:border-blue-400 hover:bg-gray-700" : "border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"}`}
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
          </HoverTooltip>
        ))}
      </div>
    </div>
  )
}
