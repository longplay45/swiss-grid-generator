import {
  LAYOUT_PRESET_CATEGORY_LABELS,
  LAYOUT_PRESET_GROUPS,
  type LayoutPreset,
} from "@/lib/presets"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"
import { PresetPageThumbnail } from "@/components/sidebar/PresetPageThumbnail"

type Props = {
  onLoadPreset: (preset: LayoutPreset) => void
  isDarkMode?: boolean
  compact?: boolean
  showHelpHints?: boolean
  onHelpNavigate?: () => void
  showRolloverInfo?: boolean
}

function formatPresetCreatedAt(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function PresetCard({
  preset,
  onLoadPreset,
  isDarkMode,
  showRolloverInfo,
}: {
  preset: LayoutPreset
  onLoadPreset: (preset: LayoutPreset) => void
  isDarkMode: boolean
  showRolloverInfo: boolean
}) {
  return (
    <HoverTooltip
      className="block"
      disabled={!showRolloverInfo}
      constrainToClosestSelector='[data-tooltip-boundary="preset-browser"]'
      constrainAxes="horizontal"
      viewportPaddingPx={36}
      tooltipClassName={`w-72 max-w-[80vw] whitespace-normal border px-2 py-2 text-[11px] leading-snug ${
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
        className={`relative w-full rounded-md border-2 transition-colors cursor-pointer overflow-hidden ${preset.browserPage.uiSettings.orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]"} ${isDarkMode ? "border-gray-700 bg-gray-800 hover:border-blue-400 hover:bg-gray-700" : "border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"}`}
        onDoubleClick={() => onLoadPreset(preset)}
      >
        <div className={`absolute inset-2 border ${isDarkMode ? "border-gray-600 bg-gray-900" : "border-gray-300 bg-white"}`}>
          <PresetPageThumbnail page={preset.browserPage} />
        </div>
        <div className={`absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] text-center ${isDarkMode ? "bg-gray-900/90 text-gray-300" : "bg-white/90 text-gray-600"}`}>
          {preset.label}
        </div>
      </button>
    </HoverTooltip>
  )
}

export function PresetLayoutsPanel({
  onLoadPreset,
  isDarkMode = false,
  compact = false,
  showHelpHints = false,
  onHelpNavigate,
  showRolloverInfo = true,
}: Props) {
  const cardGapClass = compact ? "gap-2" : "gap-3"
  const minCardWidth = compact ? 120 : 168
  return (
    <div
      data-tooltip-boundary="preset-browser"
      className={showHelpHints ? "relative rounded-md p-2 -m-2" : undefined}
      onMouseEnter={showHelpHints ? onHelpNavigate : undefined}
    >
      {showHelpHints ? <HelpIndicatorLine /> : null}
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
          <p className={`text-xs mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
            Double-click a thumbnail to load a preset layout, or press `Esc` to close the browser.
          </p>
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
      <div className="space-y-6">
        {LAYOUT_PRESET_GROUPS.map((group) => (
          <section key={group.category} className="space-y-3">
            <div className="space-y-1">
              <h4 className={`text-xs font-semibold uppercase tracking-[0.08em] ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                {group.label}
              </h4>
              {group.category === "users" ? (
                <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Saved or imported user layout JSONs will appear here.
                </p>
              ) : null}
            </div>

            {group.presets.length > 0 ? (
              <div
                className={`grid items-end ${cardGapClass}`}
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))` }}
              >
                {group.presets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    onLoadPreset={onLoadPreset}
                    isDarkMode={isDarkMode}
                    showRolloverInfo={showRolloverInfo}
                  />
                ))}
              </div>
            ) : group.category === "users" ? (
              <div className={`rounded-md border border-dashed px-3 py-4 text-xs ${isDarkMode ? "border-gray-700 text-gray-400" : "border-gray-300 text-gray-500"}`}>
                {LAYOUT_PRESET_CATEGORY_LABELS.users} is reserved for user-created layout files.
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  )
}
