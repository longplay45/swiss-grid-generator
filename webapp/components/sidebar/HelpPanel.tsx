import { useEffect } from "react"
import { FONT_DEFINITIONS } from "@/lib/config/fonts"
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

const GOOGLE_FONTS_SPECIMEN_BASE_URL = "https://fonts.google.com/specimen/"
const FONT_CATEGORY_ORDER = ["Sans-Serif", "Serif", "Display"] as const
const FONT_CATEGORY_LABEL: Record<(typeof FONT_CATEGORY_ORDER)[number], string> = {
  "Sans-Serif": "Sans-Serif",
  Serif: "Serif",
  Display: "Poster",
}
const AVAILABLE_FONT_GROUPS = FONT_CATEGORY_ORDER.map((category) => ({
  category,
  label: FONT_CATEGORY_LABEL[category],
  fonts: FONT_DEFINITIONS.filter((definition) => definition.category === category),
}))

function getGoogleFontsSpecimenUrl(fontLabel: string): string {
  return `${GOOGLE_FONTS_SPECIMEN_BASE_URL}${fontLabel.replace(/\s+/g, "+")}`
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
        heading: "text-[#F4F6F8]",
        body: "text-[#A8B1BF]",
        divider: "border-[#313A47]",
        emphasis: "text-[#F4F6F8] font-medium",
        caption: "text-[#8D98AA]",
        indexLink: "text-blue-400 hover:underline",
        jumpButton: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
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
          className={`rounded-sm p-1 transition-colors ${isDarkMode ? "text-[#A8B1BF] hover:bg-[#232A35] hover:text-[#F4F6F8]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
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
          <li>Set type hierarchy and base font in `V. Typo`, then use `VI. Available Fonts` for the full family list and Google Fonts links.</li>
          <li>Set default placeholder palette in `VII. Color Scheme`.</li>
          <li>Supported dropdown menus preview the hovered item live in the page; leaving or closing the menu restores the committed state until you select an option.</li>
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
          <li>Supported layout and editor dropdowns can temporarily redraw the page while open so you can judge a hovered option before committing it.</li>
          <li>Double-click an empty module to add a text paragraph; `Shift` + double-click adds an image placeholder (`Ctrl` fallback).</li>
          <li>When a project has multiple pages, `Page Up` activates the previous page and `Page Down` activates the next one.</li>
          <li>Hover a paragraph or image placeholder to reveal its edit affordance and its orange top/left guide lines.</li>
          <li>Paragraph guide lines resolve from the configured paragraph height (`rows + baselines`), not only from the rendered text bounds.</li>
          <li>The paragraph hover edit icon is anchored at the paragraph&apos;s top-left origin so it stays reachable on shallow frames such as `0 rows + 1 baseline`.</li>
          <li>Click the hover edit affordance to open the matching text or image editor in the left sidebar without leaving the page.</li>
          <li>When a text or image editor is already open, preview rollover stays active on other blocks so you can see the next target before switching.</li>
          <li>Drag blocks to move them between modules; placement stays snapped to the grid unless you invoke baseline/overset placement.</li>
          <li>`Alt/Option` + drag duplicates the hovered block and drops the copy at the new position.</li>
          <li>Delete blocks from the Project panel; base text blocks are cleared while custom blocks/placeholders are removed.</li>
          <li>Preview hover and Project-panel layer hover stay linked, so moving across either surface reveals the same active guides for the same block.</li>
          <li>Undo/redo includes preview edits, placement changes, duplication, deletion, and editor saves.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-editor" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Text Editor
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Open editor from the hover edit icon on a text block; double-click empty area creates a paragraph block.</li>
          <li>When edit mode is active, the left sidebar switches from layout settings to text settings.</li>
          <li>The editor uses the same section layout rhythm as the main settings sidebar: `Paragraph`, `Typo`, and `Info`.</li>
          <li>The paragraph header uses the same user-facing layer label shown in the Project panel instead of the internal block id.</li>
          <li>When help is open, the editor section headers pick up the same blue help line and rollover jump behavior as the main settings sidebar.</li>
          <li>Hover a blue-marked section header to jump directly to its matching help subsection below.</li>
          <li>Section headers single-click to toggle one section; double-click opens or closes all editor sections.</li>
          <li>`Esc` or outside click exits edit mode; clicking another active-page layer card or another existing preview block retargets the already open editor instead.</li>
          <li>Inside inline text edit, double-click selects the clicked word, triple-click selects the containing sentence, and `Alt+A` or `Cmd/Ctrl+A` select the whole paragraph.</li>
        </ul>

        <div id="help-editor-paragraph" className="space-y-1 pt-1">
          <h5 className={`text-xs font-semibold ${tone.heading}`}>Paragraph Section</h5>
          <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
            <li>Rows, baselines, columns, horizontal alignment, vertical alignment, newspaper reflow, hyphenation, and paragraph rotation (`-180..180`).</li>
            <li>Paragraph height is composed as `rows + baselines`; `rows` may be `0` when the baseline height is greater than `0`.</li>
            <li>The `Baselines` control is a bounded dropdown from `0` to the current document&apos;s baselines-per-grid-module count.</li>
            <li>`Rows`, `Baselines`, and `Cols` preview live on dropdown rollover before commit.</li>
            <li>Increasing paragraph `Cols` preserves the anchored column even when the wider frame intentionally overhangs the page edge.</li>
            <li>Vertical alignment (`Top`, `Center`, `Bottom`) positions the line stack inside the configured paragraph frame while staying on the baseline system.</li>
            <li>Newspaper reflow is available only when paragraph columns are `2+`.</li>
            <li>With reflow active, text flows across configured columns (column 1 top-to-bottom, then column 2, etc.).</li>
          </ul>
        </div>

        <div id="help-editor-typo" className="space-y-1 pt-1">
          <h5 className={`text-xs font-semibold ${tone.heading}`}>Typo Section</h5>
          <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
            <li>Font family, font cut, style hierarchy, scheme preview, paragraph swatches, kerning, tracking, and Custom size/leading when `Custom` is selected.</li>
            <li>When a text range is selected, type and color controls apply to that selection instead of rebasing the whole paragraph.</li>
            <li>Font family, font cut, hierarchy, and scheme hover in their dropdowns preview the active result before you commit it.</li>
          </ul>
        </div>

        <div id="help-editor-info" className="space-y-1 pt-1">
          <h5 className={`text-xs font-semibold ${tone.heading}`}>Info Section</h5>
          <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
            <li>Info includes geometry, type summary, character count, word count, and `Max/Line`.</li>
            <li>Changes apply live while editing.</li>
          </ul>
        </div>
      </section>

      <hr className={tone.divider} />

      <section id="help-image-editor" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Image Editor
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Open from the hover edit icon on an image placeholder or by `Shift` + double-click on an empty module.</li>
          <li>When edit mode is active, the left sidebar switches from layout settings to image placeholder settings.</li>
          <li>The editor uses the same section layout as the main settings sidebar: `Geometry`, `Color`, and `Info`.</li>
          <li>The image header shows `IMAGE` plus the current placeholder swatch color.</li>
          <li>When help is open, the editor section headers pick up the same blue help line and rollover jump behavior as the main settings sidebar.</li>
          <li>Hover a blue-marked section header to jump directly to its matching help subsection below.</li>
          <li>Section headers single-click to toggle one section; double-click opens or closes all editor sections.</li>
          <li>`Esc` or outside click exits edit mode; clicking another active-page layer card retargets the editor instead.</li>
        </ul>

        <div id="help-image-editor-geometry" className="space-y-1 pt-1">
          <h5 className={`text-xs font-semibold ${tone.heading}`}>Geometry Section</h5>
          <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
            <li>Rows, baselines, and columns.</li>
            <li>Placeholder height is composed as `rows + baselines`; `rows` may be `0` when the baseline height is greater than `0`.</li>
            <li>The `Baselines` control is a bounded dropdown from `0` to the current document&apos;s baselines-per-grid-module count.</li>
            <li>`Rows`, `Baselines`, and `Cols` preview live on dropdown rollover before commit.</li>
          </ul>
        </div>

        <div id="help-image-editor-color" className="space-y-1 pt-1">
          <h5 className={`text-xs font-semibold ${tone.heading}`}>Color Section</h5>
          <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
            <li>Scheme, swatch color, and transparency.</li>
            <li>Scheme hover in the dropdown previews the active placeholder palette before you commit it.</li>
          </ul>
        </div>

        <div id="help-image-editor-info" className="space-y-1 pt-1">
          <h5 className={`text-xs font-semibold ${tone.heading}`}>Info Section</h5>
          <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
            <li>Info summarizes the current rows, baselines, columns, scheme, color, and transparency for the active placeholder.</li>
          </ul>
        </div>
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
          <li>Header actions include Presets, Load, Save, Export, Undo/Redo, dark mode, smart text zoom, and display toggles.</li>
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
          <li>When help is open, blue-highlighted targets become hover-jump sensitive in the header, preview page, presets, editor sidebars, and settings sections.</li>
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
          Opens the export dialog for vector PDF, SVG, and IDML output. Use `SVG` or `IDML` when you need typography
          frozen into non-live geometry. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+E</span>.
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

      <section id="help-header-smart-text-zoom" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Smart Text Zoom
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Toggles the preview&apos;s text-edit zoom mode. It is enabled by default, zooms to the active text paragraph on entry, stays stable through ordinary text and style edits, refits when paragraph frame geometry changes (`Rows`, `Baselines`, `Cols`), and returns to full-page fit when text edit mode closes.
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

      <section id="help-header-image-placeholders" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Image Placeholders Toggle
        </SectionHeading>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Shows or hides image placeholder overlays. Shortcut: <span className={tone.emphasis}>Cmd/Ctrl+Shift+J</span>.
        </p>
      </section>

      <hr className={tone.divider} />

      <section id="help-header-layers" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          Project Panel
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Opens the right-side Project panel with an editable project name and a `Pages` section.</li>
          <li>The name row edits the project title, and that title drives the default JSON filename stem.</li>
          <li>`Pages` stays visible in the fixed project-panel header while the page list scrolls; single-click a page card to activate it and double-click the card to open or close its inline layer list.</li>
          <li>`Page Up` and `Page Down` also step through project pages when multiple pages are available.</li>
          <li>Each page card has its own open/close toggle; opening a page reveals that page&apos;s mixed text/image layer stack inline.</li>
          <li>Newly added pages open automatically.</li>
          <li>Active-page layer cards mirror the same preview rollover/guides, so layer inspection stays linked to the page surface.</li>
          <li>For the active page, drag layer cards to reorder z-index; click selects and opens or retargets the editor, while clicks elsewhere in the Project panel exit edit mode.</li>
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
          <li>`Ratio` and `Orientation` preview live on dropdown rollover before commit.</li>
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
          <li>The `Margin Method` list previews hovered options live before commit.</li>
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
          <li>`Rhythms` plus the non-repetitive direction lists preview hovered options live before commit.</li>
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
          <li>The Typo panel shows current size and leading for `Display`, `Headline`, `Subhead`, `Body`, and `Caption` on the active baseline.</li>
          <li>`Custom` is paragraph-level only and is seeded from the paragraph&apos;s current size and leading when first selected in the text editor.</li>
          <li>In Swiss scale on the 12pt A4 reference baseline, Display is `64pt / 72pt`.</li>
          <li>In Swiss scale, caption uses `7pt` size with `8pt` leading on the A4 reference baseline.</li>
          <li>`Font Hierarchy` and `Base Font` preview live on dropdown rollover before commit.</li>
          <li>`Base Font` is inherited by blocks that do not store explicit overrides.</li>
          <li>The text editor can override the paragraph cut with any available family variant, while untouched weight/slant defaults still follow the selected hierarchy.</li>
        </ul>
      </section>

      <hr className={tone.divider} />

      <section id="help-available-fonts" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          VI. Available Fonts
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Base-font and paragraph font-family pickers use the same grouped family list.</li>
          <li>Supported font-family pickers preview hovered families live before commit.</li>
          <li>Every listed family links to its Google Fonts specimen/download page.</li>
        </ul>
        <div className="space-y-3">
          {AVAILABLE_FONT_GROUPS.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className={`text-xs font-semibold ${tone.heading}`}>{group.label}</p>
              <ul className={`space-y-1 text-xs list-disc pl-4 ${tone.body}`}>
                {group.fonts.map((font) => (
                  <li key={font.value}>
                    <a
                      href={getGoogleFontsSpecimenUrl(font.label)}
                      target="_blank"
                      rel="noreferrer"
                      className={tone.indexLink}
                    >
                      {font.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <hr className={tone.divider} />

      <section id="help-color-scheme" className="space-y-2">
        <SectionHeading className={`text-sm font-semibold ${tone.heading}`} jumpButtonClassName={tone.jumpButton}>
          VII. Color Scheme
        </SectionHeading>
        <ul className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          <li>Selects the base scheme used for new image placeholders.</li>
          <li>`Background` applies `None` or any color from the selected scheme to the page.</li>
          <li>`Base Color Scheme` and `Background` preview live on dropdown rollover before commit.</li>
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
          <li>All export formats are vector-based, not raster screenshots.</li>
          <li>The export dialog defaults to the full project page range and lets you narrow it with `From` / `To` selectors when the project has multiple pages.</li>
          <li>All export formats use each page&apos;s stored document size directly; the dialog no longer offers paper-size or width overrides.</li>
          <li>`PDF` offers `Digital Print` (default) and `Press Proof`, with bleed, registration-style marks, and embedded output intents where applicable. It remains vector-based and visually faithful, but frozen non-live typography is the `SVG` / `IDML` path.</li>
          <li>`SVG v1` exports trim-size SVGs with typography converted to exact glyph outlines, or a ZIP with one trim-size SVG per page for multi-page ranges. Exported text is no longer live-editable.</li>
          <li>`IDML v1` exports the selected page range with separate `Guides`, `Typography`, and `Placeholders` layers plus frozen text-frame geometry and resolved font family/style names. Exported text is no longer live-editable.</li>
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
