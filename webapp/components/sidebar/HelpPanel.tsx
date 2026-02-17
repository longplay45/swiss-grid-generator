import { useEffect } from "react"
import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"
import { HELP_INDEX_GROUPS } from "@/lib/help-registry"
import type { HelpSectionId } from "@/lib/help-registry"
import { ChevronUp, X } from "lucide-react"
import type { ReactNode } from "react"

type Props = {
  isDarkMode?: boolean
  onClose: () => void
  activeSectionId?: HelpSectionId | null
}

type SectionHeadingProps = {
  as?: "h4" | "h5"
  className: string
  jumpButtonClassName: string
  children: ReactNode
}

function SectionHeading({
  as = "h4",
  className,
  jumpButtonClassName,
  children,
}: SectionHeadingProps) {
  const Tag = as
  return (
    <Tag className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        aria-label="Jump to top"
        title="Jump to top"
        onClick={() => {
          document.getElementById("help-index")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${jumpButtonClassName}`}
      >
        <ChevronUp className="h-2.5 w-2.5" />
      </button>
      <span>{children}</span>
    </Tag>
  )
}

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
        jumpButton: "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100",
      }
    : {
        heading: "text-gray-900",
        body: "text-gray-600",
        divider: "border-gray-200",
        emphasis: "text-gray-700 font-medium",
        caption: "text-gray-400",
        indexLink: "text-blue-600 hover:underline",
        jumpButton: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
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
        {HELP_INDEX_GROUPS.map((group, groupIndex) => (
          <div key={group.title} className={groupIndex > 0 ? "mt-2" : ""}>
            <h5 className={`mb-1 text-xs font-semibold ${tone.heading}`}>{group.title}</h5>
            <ul className={`space-y-1 text-xs list-disc pl-4 ${tone.body}`}>
              {group.items.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className={tone.indexLink}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <hr className={tone.divider} />

      <section id="help-quick-start" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Quick Start
        </SectionHeading>
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

      <div className="space-y-1" id="help-general-overview">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          General Guidance
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Core workflows and operational reference for editing content, reflow behavior, file I/O, and troubleshooting.
        </p>
      </div>

      <hr className={tone.divider} />

      <section id="help-editor" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Text Editor Popup
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Open editor by double-clicking a block; double-click empty area creates a paragraph block.</li>
          <li>Top row controls: style hierarchy, font family, row span, column span, and paragraph rotation (`-80..80`).</li>
          <li>Formatting controls: bold, italic, align left/right, reflow toggle, and syllable-division toggle.</li>
          <li>Action controls: save applies changes, delete removes custom blocks, and live counters show characters/words.</li>
          <li>The small `?` icon at top-right of the popup opens Help and jumps to this section.</li>
          <li>`Esc` or click outside closes without saving; `Cmd/Ctrl+Enter` saves.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-drag-placement" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Drag and Placement
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Drag moves a block snapped to module anchors.</li>
          <li>`Shift` + drag duplicates a block and drops the copy.</li>
          <li>`Ctrl` + drag snaps drop row to nearest baseline row.</li>
          <li>Block spans and positions are clamped to valid grid bounds.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-history-reflow" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          History and Reflow
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Undo/redo includes settings changes and block edits/placement changes.</li>
          <li>Some structural grid changes trigger auto-reflow suggestions.</li>
          <li>Disruptive reflow opens an apply/cancel confirmation layer.</li>
          <li>Applied reflow shows a toast with one-click Undo.</li>
          <li>JSON layout loading suppresses disruptive reflow prompts.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <div className="space-y-1" id="help-ux-overview">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          UX Reference
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Interaction patterns for settings controls and header controls, including visibility toggles and panel behavior.
        </p>
      </div>

      <hr className={tone.divider} />

      <SectionHeading
        as="h5"
        className={`text-xs font-semibold ${tone.heading}`}
        jumpButtonClassName={tone.jumpButton}
      >
        Application Controls
      </SectionHeading>

      <section id="help-sidebars-header" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Header and Sidebars
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Header actions include Presets, Load, Save, Export, Undo/Redo, dark mode, fullscreen, display toggles.</li>
          <li>Sidebar actions include Settings and Help; footer `Imprint` link toggles imprint sidebar.</li>
          <li>Right-side content panels include close icons in their header rows.</li>
          <li>Only one right-side panel is open at a time.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-help-navigation" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Help Navigation
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Use the header Help icon to open or close the help sidebar.</li>
          <li>When help is open, small `?` markers appear under header icons and next to section titles.</li>
          <li>Hover a `?` marker to jump to the matching help topic without closing help.</li>
          <li>Use the small up-arrow beside each help title to jump back to the index at the top.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-examples" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Examples
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Opens example layouts panel. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+4</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-load" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Load
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Loads a saved JSON layout from disk. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+O</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-save" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Save
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Saves current UI settings and preview state as JSON. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+S</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-export" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Export PDF
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Opens export dialog for vector PDF output and print settings. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+E</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-undo" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Undo
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Reverts the latest history step when available. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Z</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-redo" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Redo
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Reapplies an undone history step when available. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+Z</span> or <span className={tone.emphasis}>Cmd/Ctrl+Y</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-dark-mode" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Dark Mode
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Toggles light and dark UI themes. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+D</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-fullscreen" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Fullscreen
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Enters or exits fullscreen preview mode. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+F</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-baselines" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Baselines Toggle
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Shows or hides baseline grid lines. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+B</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-margins" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Margins Toggle
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Shows or hides margin frame guides. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+M</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-modules" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Modules Toggle
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Shows or hides module and gutter guides. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+G</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-typography" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Typography Toggle
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Shows or hides text/style preview overlays. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+T</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-settings" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Settings Panel
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Opens or closes the right-side settings placeholder panel. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+1</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <SectionHeading
        as="h5"
        className={`text-xs font-semibold ${tone.heading}`}
        jumpButtonClassName={tone.jumpButton}
      >
        Grid Generator Settings
      </SectionHeading>

      <section id="help-canvas-ratio" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          I. Canvas Ratio &amp; Rotation
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Choose the base canvas ratio preset (DIN, ANSI, photo, square, editorial, etc.).</li>
          <li>Orientation changes between portrait and landscape at the layout level.</li>
          <li>Rotation rotates the preview/export composition between `-80..80` degrees.</li>
          <li>Paper sizing for DIN/ANSI exports is derived from this ratio selection.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-baseline-grid" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          II. Baseline Grid
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>The baseline unit controls vertical rhythm for grid and typography.</li>
          <li>All style leading values are baseline multiples to preserve alignment.</li>
          <li>Top and bottom margins are snapped to baseline units.</li>
          <li>Changing baseline can trigger structural reflow behavior for existing blocks.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-margins" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          III. Margins
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Margin methods: Progressive (`1:2:2:3`), Van de Graaf (`2:3:4:6`), Baseline (`1:1:1:1`).</li>
          <li>`Baseline Multiple` scales method ratios while staying baseline-aligned.</li>
          <li>`Custom Margins` sets top/left/right/bottom independently as baseline multiples.</li>
          <li>Bottom margin is expected to align with the last baseline line.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-gutter" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          IV. Gutter
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Grid range is `1..13` for both vertical and horizontal fields.</li>
          <li>Gutter multiple range is `0.5..4.0` in `0.5` steps.</li>
          <li>Module sizes are recomputed after each rows/cols/gutter change.</li>
          <li>Large structural changes may trigger reflow suggestions.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-typo" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          V. Typo
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Typography scales: Swiss, Golden Ratio, Perfect Fourth, Perfect Fifth, Fibonacci.</li>
          <li>`Base Font` is inherited by blocks that do not store explicit overrides.</li>
          <li>Font groups: `Sans-Serif`, `Serif`, `Poster`.</li>
          <li>Manual bold/italic in the editor can override defaults per paragraph.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-save-load" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Save and Load JSON
        </SectionHeading>
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
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Export PDF
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Export is vector-based (not raster screenshot export).</li>
          <li>DIN/ANSI ratios expose paper-size selection; other ratios use width-based sizing.</li>
          <li>Print Pro options include bleed, registration-style crop marks, and final-safe guides.</li>
          <li>Export applies current rotation, guides visibility toggles, and text styling.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-shortcuts" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Keyboard Shortcuts
        </SectionHeading>
        <p className={`text-[11px] leading-relaxed ${tone.body}`}>
          `Cmd/Ctrl` means use <span className={tone.emphasis}>Cmd</span> on macOS and <span className={tone.emphasis}>Ctrl</span> on Windows/Linux.
        </p>
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse text-xs ${tone.body}`}>
            <thead>
              <tr className={`border-b ${tone.divider}`}>
                <th className={`py-1 text-left font-semibold ${tone.heading}`}>Action</th>
                <th className={`py-1 text-left font-semibold ${tone.heading}`}>Shortcut</th>
              </tr>
            </thead>
            <tbody>
              {PREVIEW_HEADER_SHORTCUTS.map((shortcut) => (
                <tr key={shortcut.id} className={`border-b last:border-0 ${tone.divider}`}>
                  <td className="py-1 align-top">{shortcut.description}</td>
                  <td className={`py-1 pr-3 align-top ${tone.emphasis}`}>{shortcut.combo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <hr className={tone.divider} />

      <section id="help-troubleshooting" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Troubleshooting
        </SectionHeading>
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
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Grid Theory Notes
        </SectionHeading>
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
