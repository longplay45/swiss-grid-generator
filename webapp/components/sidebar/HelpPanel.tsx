export function HelpPanel() {
  return (
    <>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">How to Use</h3>
        <ul className="space-y-1.5 text-xs text-gray-600 list-disc pl-4">
          <li>Double-click the canvas to edit a text block or create a new one</li>
          <li>Drag text blocks to reposition them on the grid</li>
          <li>
            Use the display toggles above to show/hide baselines, margins, modules, and typography
          </li>
          <li>Cmd/Ctrl+Z to undo, Cmd/Ctrl+Shift+Z to redo</li>
          <li>Save/load layouts as JSON, export as vector PDF</li>
          <li>Click a section header to collapse it; double-click to toggle all sections</li>
        </ul>
      </div>
      <hr className="border-gray-200" />
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Grid Theory</h3>
        <ul className="space-y-1.5 text-xs text-gray-600 list-disc pl-4">
          <li>
            <span className="font-medium text-gray-700">Baseline alignment:</span> all typography
            leading is an integer multiple of the baseline unit
          </li>
          <li>
            <span className="font-medium text-gray-700">Margin methods:</span> Progressive
            (1:2:2:3), Van de Graaf (2:3:4:6), Baseline (1:1:1:1)
          </li>
          <li>
            <span className="font-medium text-gray-700">Typography scales:</span> Swiss, Golden
            Ratio, Perfect Fourth, Perfect Fifth, Fibonacci
          </li>
          <li>
            <span className="font-medium text-gray-700">Format scaling:</span> baseline defaults
            scale by {"\u221A"}2 steps (A4 = 12pt reference)
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
          Reference: Josef M{"\u00FC"}ller-Brockmann,{" "}
          <em>Grid Systems in Graphic Design</em> (1981)
        </p>
      </div>
    </>
  )
}
