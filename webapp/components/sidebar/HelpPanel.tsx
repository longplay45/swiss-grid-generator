import { useEffect } from "react"
import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"
import { X } from "lucide-react"

type Props = {
  isDarkMode?: boolean
  onClose: () => void
  activeSectionId?: HelpSectionId | null
}

const INDEX_ITEMS = [
  { id: "help-quick-start", label: "Quick Start" },
  { id: "help-canvas-ratio", label: "I. Canvas Ratio & Rotation" },
  { id: "help-baseline-grid", label: "II. Baseline Grid" },
  { id: "help-margins", label: "III. Margins" },
  { id: "help-gutter", label: "IV. Gutter" },
  { id: "help-typo", label: "V. Typo" },
  { id: "help-editor", label: "Text Editor Popup" },
  { id: "help-drag-placement", label: "Drag and Placement" },
  { id: "help-history-reflow", label: "History and Reflow" },
  { id: "help-sidebars-header", label: "Header and Sidebars" },
  { id: "help-save-load", label: "Save and Load JSON" },
  { id: "help-export", label: "Export PDF" },
  { id: "help-shortcuts", label: "Keyboard Shortcuts" },
  { id: "help-troubleshooting", label: "Troubleshooting" },
  { id: "help-grid-theory", label: "Grid Theory Notes" },
] as const

export type HelpSectionId = (typeof INDEX_ITEMS)[number]["id"]

export function HelpPanel({ isDarkMode = false, onClose, activeSectionId }: Props) {
  useEffect(() => {
    if (!activeSectionId) return
    const target = document.getElementById(activeSectionId)
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [activeSectionId])

  const tone = isDarkMode
    ? {
        heading: "text-gray-100",
        body: "text-gray-300",
        divider: "border-gray-700",
        emphasis: "text-gray-200 font-medium",
        caption: "text-gray-500",
        indexLink: "text-blue-400 hover:underline",
      }
    : {
        heading: "text-gray-900",
        body: "text-gray-600",
        divider: "border-gray-200",
        emphasis: "text-gray-700 font-medium",
        caption: "text-gray-400",
        indexLink: "text-blue-600 hover:underline",
      }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${tone.heading}`}>Help</h3>
        <button
          type="button"
          aria-label="Close help panel"
          onClick={onClose}
          className={`rounded-sm p-1 transition-colors ${isDarkMode ? "text-gray-300 hover:bg-gray-700 hover:text-gray-100" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div id="help-index">
        <h4 className={`mb-2 text-sm font-semibold ${tone.heading}`}>Index</h4>
        <ul className={`space-y-1 text-xs list-disc pl-4 ${tone.body}`}>
          {INDEX_ITEMS.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className={tone.indexLink}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <hr className={tone.divider} />

      <section id="help-quick-start" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>Quick Start</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Pick a ratio in `I. Canvas Ratio` and set orientation/rotation.</li>
          <li>Set baseline in `II. Baseline Grid`; all vertical rhythm depends on it.</li>
          <li>Choose margin method in `III. Margins` or enable `Custom Margins`.</li>
          <li>Set columns/rows and gutter in `IV. Gutter`.</li>
          <li>Set type hierarchy and base font in `V. Typo`.</li>
          <li>Use display toggles in the header to inspect baselines, margins, modules, and type.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-canvas-ratio" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>I. Canvas Ratio &amp; Rotation</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Choose the base canvas ratio preset (DIN, ANSI, photo, square, editorial, etc.).</li>
          <li>Orientation changes between portrait and landscape at the layout level.</li>
          <li>Rotation rotates the preview/export composition between `-80..80` degrees.</li>
          <li>Paper sizing for DIN/ANSI exports is derived from this ratio selection.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-baseline-grid" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>II. Baseline Grid</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>The baseline unit controls vertical rhythm for grid and typography.</li>
          <li>All style leading values are baseline multiples to preserve alignment.</li>
          <li>Top and bottom margins are snapped to baseline units.</li>
          <li>Changing baseline can trigger structural reflow behavior for existing blocks.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-margins" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>III. Margins</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Margin methods: Progressive (`1:2:2:3`), Van de Graaf (`2:3:4:6`), Baseline (`1:1:1:1`).</li>
          <li>`Baseline Multiple` scales method ratios while staying baseline-aligned.</li>
          <li>`Custom Margins` sets top/left/right/bottom independently as baseline multiples.</li>
          <li>Bottom margin is expected to align with the last baseline line.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-gutter" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>IV. Gutter</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Grid range is `1..13` for both vertical and horizontal fields.</li>
          <li>Gutter multiple range is `0.5..4.0` in `0.5` steps.</li>
          <li>Module sizes are recomputed after each rows/cols/gutter change.</li>
          <li>Large structural changes may trigger reflow suggestions.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-typo" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>V. Typo</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Typography scales: Swiss, Golden Ratio, Perfect Fourth, Perfect Fifth, Fibonacci.</li>
          <li>`Base Font` is inherited by blocks that do not store explicit overrides.</li>
          <li>Font groups: `Sans-Serif`, `Serif`, `Poster`.</li>
          <li>Manual bold/italic in the editor can override defaults per paragraph.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-editor" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>Text Editor Popup</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Open editor by double-clicking a block; double-click empty area creates a paragraph block.</li>
          <li>Controls: style, font, row span, column span, rotation, bold, italic, alignment.</li>
          <li>Controls: reflow toggle, syllable division toggle, save, delete (custom blocks), live character/word count.</li>
          <li>`Esc` or click outside closes without saving; `Cmd/Ctrl+Enter` saves.</li>
          <li>Paragraph rotation is clamped to `-80..80` degrees in editor.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-drag-placement" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>Drag and Placement</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Drag moves a block snapped to module anchors.</li>
          <li>`Shift` + drag duplicates a block and drops the copy.</li>
          <li>`Ctrl` + drag snaps drop row to nearest baseline row.</li>
          <li>Block spans and positions are clamped to valid grid bounds.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-history-reflow" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>History and Reflow</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Undo/redo includes settings changes and block edits/placement changes.</li>
          <li>Some structural grid changes trigger auto-reflow suggestions.</li>
          <li>Disruptive reflow opens an apply/cancel confirmation layer.</li>
          <li>Applied reflow shows a toast with one-click Undo.</li>
          <li>JSON layout loading suppresses disruptive reflow prompts.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-sidebars-header" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>Header and Sidebars</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Header actions include Presets, Load, Save, Export, Undo/Redo, dark mode, fullscreen, display toggles.</li>
          <li>Sidebar actions include Settings and Help; footer `Imprint` link toggles imprint sidebar.</li>
          <li>Right-side content panels include close icons in their header rows.</li>
          <li>Only one right-side panel is open at a time.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-save-load" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>Save and Load JSON</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Save JSON stores UI settings and full preview layout state.</li>
          <li>Load JSON restores both settings and layout where valid.</li>
          <li>Unknown font overrides are dropped during load normalization.</li>
          <li>Overrides equal to inherited defaults are normalized away.</li>
          <li>Invalid/out-of-range spans/rows/positions are clamped safely.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-export" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>Export PDF</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Export is vector-based (not raster screenshot export).</li>
          <li>DIN/ANSI ratios expose paper-size selection; other ratios use width-based sizing.</li>
          <li>Print Pro options include bleed, registration-style crop marks, and final-safe guides.</li>
          <li>Export applies current rotation, guides visibility toggles, and text styling.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-shortcuts" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>Keyboard Shortcuts</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          {PREVIEW_HEADER_SHORTCUTS.map((shortcut) => (
            <li key={shortcut.id}>
              <span className={tone.emphasis}>{shortcut.combo}</span>: {shortcut.description}
            </li>
          ))}
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-troubleshooting" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>Troubleshooting</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>If blocks disappear, check display toggles and whether text content is empty.</li>
          <li>If paragraph flow looks clipped, increase row span or disable reflow for that block.</li>
          <li>If layout jumps after large grid changes, this is expected from structural reflow remapping.</li>
          <li>If custom margins seem odd, verify baseline value and side multipliers first.</li>
          <li>If keyboard shortcuts do not trigger, focus outside active text inputs.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-grid-theory" className="space-y-2">
        <h4 className={`text-sm font-semibold ${tone.heading}`}>Grid Theory Notes</h4>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>
            <span className={tone.emphasis}>Baseline alignment:</span> leading is an integer multiple of baseline.
          </li>
          <li>
            <span className={tone.emphasis}>Margins:</span> use proportional baseline-unit systems to balance page weight.
          </li>
          <li>
            <span className={tone.emphasis}>Modules:</span> define consistent content rhythm and repeatable placement anchors.
          </li>
          <li>
            <span className={tone.emphasis}>Typographic hierarchy:</span> scale presets keep proportion while preserving baseline rhythm.
          </li>
        </ul>
        <p className={`mt-3 text-[11px] leading-relaxed ${tone.caption}`}>
          Reference: Josef M{"\u00FC"}ller-Brockmann, <em>Grid Systems in Graphic Design</em> (1981)
        </p>
      </section>
    </div>
  )
}
