import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"

type Props = {
  isDarkMode?: boolean
}

export function HelpPanel({ isDarkMode = false }: Props) {
  const tone = isDarkMode
    ? {
        heading: "text-gray-100",
        body: "text-gray-300",
        divider: "border-gray-700",
        emphasis: "text-gray-200 font-medium",
        caption: "text-gray-500",
      }
    : {
        heading: "text-gray-900",
        body: "text-gray-600",
        divider: "border-gray-200",
        emphasis: "text-gray-700 font-medium",
        caption: "text-gray-400",
      }

  return (
    <>
      <div>
        <h3 className={`text-sm font-semibold mb-2 ${tone.heading}`}>How to Use</h3>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Double-click the canvas to edit a text block or create a new one</li>
          <li>Drag text blocks to reposition them on the grid (Shift-drag duplicates)</li>
          <li>
            Use the display toggles above to show/hide baselines, margins, modules, and typography
          </li>
          <li>Use keyboard shortcuts below for every preview header action</li>
          <li>Click a section header to collapse it; double-click to toggle all sections</li>
        </ul>
      </div>
      <hr className={tone.divider} />
      <div>
        <h3 className={`text-sm font-semibold mb-2 ${tone.heading}`}>Keyboard Shortcuts</h3>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          {PREVIEW_HEADER_SHORTCUTS.map((shortcut) => (
            <li key={shortcut.id}>
              <span className={tone.emphasis}>
                {shortcut.combo}
              </span>
              : {shortcut.description}
            </li>
          ))}
        </ul>
      </div>
      <hr className={tone.divider} />
      <div>
        <h3 className={`text-sm font-semibold mb-2 ${tone.heading}`}>Grid Theory</h3>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>
            <span className={tone.emphasis}>Baseline alignment:</span> all typography
            leading is an integer multiple of the baseline unit
          </li>
          <li>
            <span className={tone.emphasis}>Margin methods:</span> Progressive
            (1:2:2:3), Van de Graaf (2:3:4:6), Baseline (1:1:1:1)
          </li>
          <li>
            <span className={tone.emphasis}>Typography scales:</span> Swiss, Golden
            Ratio, Perfect Fourth, Perfect Fifth, Fibonacci
          </li>
          <li>
            <span className={tone.emphasis}>Format scaling:</span> baseline defaults
            scale by {"\u221A"}2 steps (A4 = 12pt reference)
          </li>
        </ul>
        <p className={`mt-3 text-[11px] leading-relaxed ${tone.caption}`}>
          Reference: Josef M{"\u00FC"}ller-Brockmann,{" "}
          <em>Grid Systems in Graphic Design</em> (1981)
        </p>
      </div>
    </>
  )
}
