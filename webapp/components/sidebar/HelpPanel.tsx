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
    const maybeDivider = target.previousElementSibling
    const scrollTarget = maybeDivider instanceof HTMLHRElement ? maybeDivider : target
    const scrollRoot = scrollTarget.closest("[data-help-scroll-root='true']") as HTMLElement | null
    if (!scrollRoot) return

    const topGapPx = -1
    const rootRect = scrollRoot.getBoundingClientRect()
    const targetRect = scrollTarget.getBoundingClientRect()
    const deltaToTop = targetRect.top - rootRect.top
    const nextTop = scrollRoot.scrollTop + deltaToTop - topGapPx
    window.requestAnimationFrame(() => {
      scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" })
    })
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
          <li>Pick a ratio preset or `Custom Ratio` in `I. Canvas Ratio` and set orientation/rotation.</li>
          <li>Set baseline in `II. Baseline Grid`; all vertical rhythm depends on it.</li>
          <li>Choose a margin method in `III. Margins`, or select `Custom Margins` from the same dropdown.</li>
          <li>Set columns/rows, gutter, and rhythm in `IV. Grid &amp; Rhythms`.</li>
          <li>Set type hierarchy and base font in `V. Typo`.</li>
          <li>Set default placeholder palette in `VI. Color Scheme`.</li>
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

      <section id="help-preview-workspace" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Preview Workspace
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>The preview page is the live layout surface for the active project page, including placement, editing, duplication, and deletion.</li>
          <li>Double-click an empty module to add a text paragraph; `Shift` + double-click adds an image placeholder (`Ctrl` fallback).</li>
          <li>Hover a paragraph or image placeholder to reveal its edit affordance and its orange top/left guide lines.</li>
          <li>Click the hover edit affordance to open the matching text or image editor overlay without leaving the page.</li>
          <li>Drag blocks to move them between modules; placement stays snapped to the grid unless you invoke baseline/overset placement.</li>
          <li>`Alt/Option` + drag duplicates the hovered block and drops the copy at the new position.</li>
          <li>Delete blocks from the editor rail or from the Project panel; base text blocks are cleared while custom blocks/placeholders are removed.</li>
          <li>Preview hover and Project-panel layer hover stay linked, so moving across either surface reveals the same active guides for the same block.</li>
          <li>Undo/redo includes preview edits, placement changes, duplication, deletion, and editor saves.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-editor" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Text Editor Popup
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Open editor from the hover edit icon on a text block; double-click empty area creates a paragraph block.</li>
          <li>Layout uses a left icon rail with contextual submenus: Geometry, Type, and Info, plus Delete on the rail.</li>
          <li>Geometry submenu: row span, column span, alignment, newspaper reflow, hyphenation, and paragraph rotation (`-180..180`).</li>
          <li>Type submenu: font family, font cut, style hierarchy, kerning, tracking, scheme, color, and FX size/leading when `FX` is selected.</li>
          <li>When a text range is selected, type controls apply font family, cut, hierarchy, color, and tracking to that selection instead of rebasing the whole paragraph.</li>
          <li>Info submenu includes geometry, type summary, character count, word count, and `Max/Line`.</li>
          <li>Newspaper reflow is available only when paragraph columns are `2+`.</li>
          <li>With reflow active, text flows across configured columns (column 1 top-to-bottom, then column 2, etc.).</li>
          <li>Save applies changes; delete removes custom blocks (base blocks are cleared).</li>
          <li>`Esc` or click outside closes without saving; `Cmd/Ctrl+Enter` saves.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-image-editor" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Image Editor
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Open from the hover edit icon on an image placeholder or by `Shift` + double-click on an empty module.</li>
          <li>Layout uses a left icon rail with contextual submenus for Geometry and Info, plus Delete on the rail.</li>
          <li>Geometry submenu: row span, column span, scheme, swatch color, and transparency.</li>
          <li>Each image setting sits on its own row with icon, label, and value/control, matching the text editor structure.</li>
          <li>Info submenu summarizes the current rows, columns, scheme, color, and transparency for the active placeholder.</li>
          <li>Delete lives in the rail and removes the placeholder immediately.</li>
          <li>`Esc` or click outside closes the editor.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-drag-placement" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Drag and Placement
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Drag moves a block snapped to module anchors.</li>
          <li>`Alt/Option` + drag duplicates a block and drops the copy.</li>
          <li>`Shift` + double-click on an empty module creates an image placeholder and opens its editor (`Ctrl` fallback).</li>
          <li>`Shift` + drag snaps to baseline rows and baseline columns (not module rows, `Ctrl` fallback).</li>
          <li>`Shift` + drag allows overset placement for “angeschnitten” layouts (left/right/top/bottom, `Ctrl` fallback).</li>
          <li>Standard drag stays within module-fit bounds; baseline drag uses extended overset bounds.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-history-reflow" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          History and Reflow
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Undo/redo includes settings changes and block edits/placement changes.</li>
          <li>Reducing columns or rows does not auto-reposition paragraphs or image placeholders.</li>
          <li>If a reduction would push positioned paragraphs or image placeholders beyond the proposed grid, the grid stays unchanged.</li>
          <li>An invalid reduction shows a temporary warning in the preview instead of opening a modal.</li>
          <li>Reposition or delete the conflicting paragraphs or image placeholders, then try the reduction again.</li>
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
        className={`text-sm font-semibold ${tone.heading}`}
        jumpButtonClassName={tone.jumpButton}
      >
        Application Controls
      </SectionHeading>

      <section id="help-sidebars-header" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Header and Sidebars
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Header actions include Presets, Load, Save, Export, Undo/Redo, dark mode, and display toggles.</li>
          <li>Display controls include baselines, margins, modules, image placeholders, typography, and the Project panel toggle.</li>
          <li>`Save`, `Export`, and the display toggles stay disabled until a preview layout is available.</li>
          <li>The Project toggle sits directly after the image-placeholder toggle, separated by a divider.</li>
          <li>The right-side header actions are ordered as `i` (information/tooltips) and `?` (help).</li>
          <li>`i` toggles rollover info/tooltips globally across the app. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+I</span>.</li>
          <li>The Project panel can also be toggled from the keyboard via <span className={tone.emphasis}>Cmd/Ctrl+Shift+P</span>.</li>
          <li>`?` opens or closes the help sidebar. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+H</span>.</li>
          <li>While the presets browser is open, side panels and the header Project toggle are temporarily disabled.</li>
          <li>Footer `Feedback` link toggles the feedback sidebar panel; `Imprint` toggles the imprint panel, and both remain active while presets are open.</li>
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
          <li>When help is open, blue-highlighted targets become hover-jump sensitive in the header, preview page, presets, editor overlays, and settings sections.</li>
          <li>Hover a highlighted target to jump to the matching help topic without closing help.</li>
          <li>Use the small up-arrow beside each help title to jump back to the index at the top.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-examples" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Presets
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Opens the presets browser in the preview area.</li>
          <li>Double-click a thumbnail to load it.</li>
          <li>Press `Esc` to close the browser without loading a preset.</li>
          <li>When help is open, hovering the presets panel (or its `?` marker) jumps here.</li>
          <li>Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+4</span>.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-load" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Load
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Loads a saved project JSON from disk; legacy single-page JSON is still accepted and wrapped into a one-page project. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+O</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-save" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Save
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Saves project metadata plus every page&apos;s settings and layout state as project JSON. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+S</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-export" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Export
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Opens the export dialog for vector PDF, SVG, and IDML output. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+E</span>.
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

      <section id="help-header-layers" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Project Panel
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Opens the right-side Project panel with an editable project name plus `Pages` and `Layers` sections.</li>
          <li>The name row edits the project title, and that title drives the default JSON filename stem.</li>
          <li>`Pages`: click a page card to switch, drag to reorder, rename/delete as needed, and `Add Page` duplicates the current active page.</li>
          <li>`Layers`: shows the mixed stack of text paragraphs and image placeholders for the active page only.</li>
          <li>Layer cards mirror the same active preview rollover/guides, so layer inspection stays linked to the page surface.</li>
          <li>Drag layer cards to reorder z-index; click selects, double-click opens the editor, and trash removes the layer from the active page.</li>
          <li>Section headers single-click to collapse and double-click to toggle both `Pages` and `Layers` together.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-information" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Information Toggle
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Toggles rollover info/tooltips globally across header controls, side panels, and editor affordances. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+I</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <SectionHeading
        as="h5"
        className={`text-sm font-semibold ${tone.heading}`}
        jumpButtonClassName={tone.jumpButton}
      >
        Grid Generator Settings
      </SectionHeading>

      <section id="help-canvas-ratio" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          I. Canvas Ratio &amp; Rotation
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Choose a base canvas ratio preset, or select `Custom Ratio` and enter width:height units directly.</li>
          <li>Orientation changes between portrait and landscape at the layout level.</li>
          <li>Rotation rotates the preview/export composition between `-180..180` degrees.</li>
          <li>Custom ratios generate page dimensions at A4-equivalent area before orientation is applied.</li>
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
          <li>Most style leading values follow baseline multiples; Swiss caption uses a tighter `7pt / 8pt` pairing.</li>
          <li>Top and bottom margins are snapped to baseline units.</li>
          <li>Changing baseline does not auto-reposition blocks.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-margins" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          III. Margins
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>The `Margin Method` dropdown offers Progressive (`1:2:2:3`), Van de Graaf (`2:3:4:6`), Baseline (`1:1:1:1`), and `Custom Margins`.</li>
          <li>`Baseline Multiple` scales both method ratios and custom margin ratios while staying baseline-aligned.</li>
          <li>Selecting `Custom Margins` reveals independent top/left/right/bottom sliders that still scale through the shared baseline multiple.</li>
          <li>Bottom margin is expected to align with the last baseline line.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-gutter" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          IV. Grid &amp; Rhythms
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Grid range is `1..13` for both columns and rows.</li>
          <li>Gutter multiple range is `1.0..4.0` in `0.5` steps.</li>
          <li>`Rhythms` options: `Fibonacci`, `Golden Ratio`, `Perfect Fifth`, `Perfect Fourth`, `Repetitive` (default).</li>
          <li>For all non-repetitive rhythms, rows can be toggled on/off with direction `Left to right` or `Right to left` (default: on, `Left to right`).</li>
          <li>For all non-repetitive rhythms, cols can be toggled on/off with direction `Top to Bottom` or `Bottom to top` (default: on, `Top to Bottom`).</li>
          <li>Module sizes are recomputed after each rows/cols/gutter change.</li>
          <li>Reducing rows or columns is blocked when paragraphs or image placeholders would fall outside the new grid.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-typo" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          V. Typo
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Typography scales: Swiss, Golden Ratio, Perfect Fourth, Perfect Fifth, Fibonacci.</li>
          <li>The Typo panel shows the current hierarchy table with style, size, and leading for the active baseline.</li>
          <li>In Swiss scale on the 12pt A4 reference baseline, Display is `64pt / 72pt` and FX is `96pt / 96pt`.</li>
          <li>In Swiss scale, caption uses `7pt` size with `8pt` leading on the A4 reference baseline.</li>
          <li>`Base Font` is inherited by blocks that do not store explicit overrides.</li>
          <li>Font groups: `Sans-Serif`, `Serif`, `Poster`.</li>
          <li>Available families: Sans-Serif `Inter`, `Work Sans`, `Jost`, `IBM Plex Sans`, `Libre Franklin`; Serif `EB Garamond`, `Libre Baskerville`, `Bodoni Moda`, `Besley`; Poster `Playfair Display`.</li>
          <li>The text editor can override the paragraph cut with any available family variant, while untouched weight/slant defaults still follow the selected hierarchy.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-color-scheme" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          VI. Color Scheme
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Selects the base scheme used for new image placeholders.</li>
          <li>`Background` applies `None` or any color from the selected scheme to the page.</li>
          <li>The same selector appears in the image editor.</li>
          <li>Image editor starts with the current global scheme selected.</li>
          <li>Each placeholder still stores its own final color value.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-save-load" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Save and Load Project JSON
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Save Project JSON stores metadata, `activePageId`, and the full `pages[]` array with per-page settings and preview layout state.</li>
          <li>Bundled presets use the same project JSON schema as saved documents and are loaded through the same parser.</li>
          <li>Paragraphs and image placeholders are saved with logical grid anchors (`column`, `row`, `baselineOffset`) so their positions stay stable across grid changes.</li>
          <li>Load Project JSON restores the full project structure and the active page where valid.</li>
          <li>Legacy single-page JSON is still accepted and is wrapped into a one-page project during import.</li>
          <li>Unknown font overrides are dropped during load normalization.</li>
          <li>Overrides equal to inherited defaults are normalized away.</li>
          <li>Invalid/out-of-range spans/rows/positions are clamped safely.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-export" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Export
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Export is vector-based (not raster screenshot export).</li>
          <li>The export dialog defaults to the full project page range and lets you narrow it with `From` / `To` selectors when the project has multiple pages.</li>
          <li>All export formats use each page&apos;s stored document size directly; the dialog no longer offers paper-size or width overrides.</li>
          <li>`PDF` offers `Digital Print` (default) and `Press Proof`, with bleed, registration-style marks, and embedded output intents where applicable.</li>
          <li>`SVG v1` exports a trim-size live-text SVG for a single selected page, or a ZIP with one trim-size SVG per page for multi-page ranges.</li>
          <li>`IDML v1` exports the selected page range with separate `Guides`, `Typography`, and `Placeholders` layers plus frozen text-frame geometry and resolved font family/style names.</li>
          <li>All export formats preserve the current page rotation and the visible guide/content systems they support.</li>
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
    </div>
  )
}
