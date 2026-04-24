# Help

Edit this file to update the in-app Help panel content.

Format rules:
- `## Group Title` starts a top-level index group.
- `### Section Title {#section-id}` starts an indexed top-level help section.
- Add `[noindex]` after the section id to keep a top-level section out of the index.
- `#### Subsection Title {#section-id}` starts a subsection inside the current top-level section.
- Use normal paragraphs and `-` bullet lists.
- Use backticks for inline code and shortcut labels.
- Use markdown links for external URLs.
- Use `{{AVAILABLE_FONTS}}` as a standalone block to render the dynamic font list.
- Use `{{SHORTCUT_TABLE}}` as a standalone block to render the dynamic shortcut table.
- Use `{{DOCUMENT_VARIABLE_TOKENS}}` inline to render the current variable-token list.

## Quick Start

### Quick Start {#help-quick-start}
- Pick a ratio preset or `Custom Ratio` in `I. Canvas Ratio` and set orientation/rotation.
- Set baseline in `II. Baseline Grid`; all vertical rhythm depends on it.
- Choose a margin method in `III. Margins`, or select `Custom Margins` from the same dropdown.
- Set columns/rows, gutter, and rhythm in `IV. Grid & Rhythms`.
- Set type hierarchy and base font in `V. Typo`, then use `VI. Available Fonts` for the full family list and Google Fonts links.
- Set default placeholder palette in `VII. Color Scheme`.
- Supported dropdown menus preview the hovered item live in the page; leaving or closing the menu restores the committed state until you select an option.
- Use display toggles in the header to inspect baselines, margins, modules, and type.

## General Guidance

### General Guidance {#help-general-overview} [noindex]
Core workflows and operational reference for editing content, reflow behavior, file I/O, and troubleshooting.

### Preview Workspace {#help-preview-workspace}
- The preview page is the live layout surface for the active project page, including placement, editing, duplication, and deletion.
- Supported layout and editor dropdowns can temporarily redraw the page while open so you can judge a hovered option before committing it.
- Double-click an empty module to add a text paragraph; `Shift` + double-click adds an image placeholder (`Ctrl` fallback).
- When a project has multiple pages, `Page Up` activates the previous page, `Page Down` activates the next one, and `Home` / `End` jump to the first or last page.
- Hover a paragraph or image placeholder to reveal its edit affordance and its orange top/left guide lines.
- Paragraph guide lines resolve from the configured paragraph height (`rows + baselines`), not only from the rendered text bounds.
- The paragraph hover edit icon is anchored at the paragraph's top-left origin so it stays reachable on shallow frames such as `0 rows + 1 baseline`.
- Click the hover edit affordance to open the matching text or image editor in the left sidebar without leaving the page.
- When a text or image editor is already open, preview rollover stays active on other unlocked blocks so you can see the next target before switching.
- Drag blocks to move them between modules; paragraphs follow their `Snap to Columns (X)` setting and, when `Snap to Baseline (Y)` is on, default to module-top Y snapping with baseline drag available on `Shift`/`Ctrl`.
- With a selected unlocked layer and no active editor field, arrow keys nudge the layer through the same logic: snapped X moves by columns, snapped Y moves by module rows by default, `Shift` uses baseline rows, and unsnapped axes use tenth-step logical nudges with `Shift` as a 10x multiplier.
- `Alt/Option` + drag duplicates the hovered block and drops the copy at the new position.
- Locked layers are skipped by preview hover, hit-testing, drag, and editor retargeting until you unlock them from the Project panel.
- Delete blocks from the Project panel; base text blocks are cleared while custom blocks/placeholders are removed.
- Preview hover and Project-panel layer hover stay linked, so moving across either surface reveals the same active guides for the same block.
- Undo/redo includes preview edits, placement changes, duplication, deletion, and editor saves.

### Text Editor {#help-editor}
- Open editor from the hover edit icon on a text block; double-click empty area creates a paragraph block.
- When edit mode is active, the left sidebar switches from layout settings to text settings.
- The editor uses the same section layout rhythm as the main settings sidebar: `Paragraph`, `Typo`, `Placeholders`, and `Info`.
- The paragraph header uses the same user-facing layer label shown in the Project panel instead of the internal block id.
- When help is open, the editor section headers pick up the same blue help line and rollover jump behavior as the main settings sidebar.
- Hover a blue-marked section header to jump directly to its matching help subsection below.
- Section headers single-click to toggle one section; double-click opens or closes all editor sections.
- `Esc` or outside click exits edit mode; double-clicking another active-page unlocked layer card or clicking another existing unlocked preview block retargets the already open editor instead.
- Inside inline text edit, double-click selects the clicked word, triple-click selects the containing sentence, `Alt+A` or `Cmd/Ctrl+A` select the whole paragraph, and `Arrow` / `Home` / `End` navigation follows the rendered line geometry.

#### Paragraph Section {#help-editor-paragraph}
- Rows, baselines, columns, horizontal alignment, vertical alignment, newspaper reflow, hyphenation, `Snap to Columns (X)`, `Snap to Baseline (Y)`, and paragraph rotation (`-180..180`).
- Paragraph height is composed as `rows + baselines`; `rows` may be `0` when the baseline height is greater than `0`.
- The `Baselines` control is a bounded dropdown from `0` to the current document's baselines-per-grid-module count.
- `Rows`, `Baselines`, and `Cols` preview live on dropdown rollover before commit.
- Increasing paragraph `Cols` preserves the anchored column even when the wider frame intentionally overhangs the page edge.
- Vertical alignment (`Top`, `Center`, `Bottom`) positions the line stack inside the configured paragraph frame while staying on the baseline system.
- `Snap to Columns (X)` locks paragraph placement to logical column anchors; turning it off allows free horizontal placement with symmetric one-column overhang into the side margins.
- `Snap to Baseline (Y)` keeps paragraph placement on editorial Y anchors; normal drag snaps to module tops, `Shift`/`Ctrl` drag snaps to baseline rows, and turning it off allows free vertical placement.
- Newspaper reflow is available only when paragraph columns are `2+`.
- With reflow active, text flows across configured columns (column 1 top-to-bottom, then column 2, etc.).

#### Typo Section {#help-editor-typo}
- Font family, font cut, style hierarchy, scheme preview, paragraph swatches, kerning, tracking, and Custom size/leading when `Custom` is selected.
- When a text range is selected, type and color controls apply to that selection instead of rebasing the whole paragraph.
- Font family, font cut, hierarchy, and scheme hover in their dropdowns preview the active result before you commit it.

#### Placeholders Section {#help-editor-placeholders}
- Lists the available document-variable tokens for fitted lorem, project title, folios, and proof timestamps.
- Clicking a token inserts it at the current caret position or replaces the current text selection.
- While editing, placeholder tokens stay visible as raw text in the active paragraph; outside edit mode they render to live values.
- `<%lorem%>` fills the active paragraph frame according to its rows, baselines, columns, reflow, and hyphenation settings.
- Available tokens: {{DOCUMENT_VARIABLE_TOKENS}}.

#### Info Section {#help-editor-info}
- Info includes geometry, type summary, character count, word count, and `Max/Line`.
- Changes apply live while editing.

### Image Editor {#help-image-editor}
- Open from the hover edit icon on an image placeholder or by `Shift` + double-click on an empty module.
- When edit mode is active, the left sidebar switches from layout settings to image placeholder settings.
- The editor uses the same section layout as the main settings sidebar: `Geometry`, `Color`, and `Info`.
- The image header shows `IMAGE` plus the current placeholder swatch color.
- When help is open, the editor section headers pick up the same blue help line and rollover jump behavior as the main settings sidebar.
- Hover a blue-marked section header to jump directly to its matching help subsection below.
- Section headers single-click to toggle one section; double-click opens or closes all editor sections.
- `Esc` or outside click exits edit mode; double-clicking another active-page layer card retargets the editor instead.

#### Geometry Section {#help-image-editor-geometry}
- Rows, baselines, columns, `Snap to Columns (X)`, `Snap to Baseline (Y)`, and placeholder rotation (`-180..180`).
- Placeholder height is composed as `rows + baselines`; `rows` may be `0` when the baseline height is greater than `0`.
- The `Baselines` control is a bounded dropdown from `0` to the current document's baselines-per-grid-module count.
- `Rows`, `Baselines`, and `Cols` preview live on dropdown rollover before commit.
- `Snap to Columns (X)` locks horizontal placement to logical column anchors; turning it off allows free horizontal placement with symmetric one-column overhang into the side margins.
- `Snap to Baseline (Y)` keeps placeholder placement on editorial Y anchors; normal drag snaps to module tops, `Shift`/`Ctrl` drag snaps to baseline rows, and turning it off allows free vertical placement.

#### Color Section {#help-image-editor-color}
- Scheme, swatch color, and transparency.
- Scheme hover in the dropdown previews the active placeholder palette before you commit it.

#### Info Section {#help-image-editor-info}
- Info summarizes the current rows, baselines, columns, X/Y snap state, rotation, scheme, color, and transparency for the active placeholder.

### Drag and Placement {#help-drag-placement}
- Default paragraph and image-placeholder drag respect each layer's current `Snap to Columns (X)` state; when `Snap to Baseline (Y)` is on, the default Y target is the nearest module top.
- `Alt/Option` + drag duplicates a block and drops the copy.
- `Shift` + double-click on an empty module creates an image placeholder and opens its editor (`Ctrl` fallback).
- Holding `Shift` during paragraph or image-placeholder drag temporarily snaps the Y position to the nearest baseline row (`Ctrl` fallback).
- Paragraph and image-placeholder drag stay within their current placement bounds, including the extended overset range used by unsnapped and overhanging placements.

### History and Reflow {#help-history-reflow}
- Undo/redo includes settings changes and block edits/placement changes.
- Reducing columns or rows does not auto-reposition paragraphs or image placeholders.
- If a reduction would push positioned paragraphs or image placeholders beyond the proposed grid, the grid stays unchanged.
- An invalid reduction shows a temporary warning in the preview instead of opening a modal.
- Reposition or delete the conflicting paragraphs or image placeholders, then try the reduction again.

### Save and Load Project JSON {#help-save-load}
- Save Project JSON stores metadata, `activePageId`, the full `pages[]` array with per-page settings and preview layout state, and an optional `tour` block for onboarding flows.
- Bundled presets use the same project JSON schema as saved documents and are loaded through the same parser.
- Paragraphs and image placeholders are saved with logical anchors (`column`, `row`, `baselineOffset`) so their positions stay stable across grid changes; both layer types also persist independent `Snap to Columns (X)`, `Snap to Baseline (Y)`, and rotation values.
- Load Project JSON restores the full project structure and the active page where valid.
- Legacy single-page JSON is still accepted and is wrapped into a one-page project during import.
- Unknown font overrides are dropped during load normalization.
- Overrides equal to inherited defaults are normalized away.
- Invalid/out-of-range spans/rows/positions are clamped safely.

### Export {#help-export}
- All export formats are vector-based, not raster screenshots.
- The export dialog defaults to the full project page range and lets you narrow it with `From` / `To` selectors when the project has multiple pages.
- All export formats use each page's stored document size directly; the dialog no longer offers paper-size or width overrides.
- `PDF` offers `Digital Print` (default) and `Press Proof`, with bleed, registration-style marks, and embedded output intents where applicable. It remains vector-based and visually faithful, but frozen non-live typography is the `SVG` / `IDML` path.
- `SVG v1` exports trim-size SVGs with typography converted to exact glyph outlines, or a ZIP with one trim-size SVG per page for multi-page ranges. Exported text is no longer live-editable.
- `IDML v1` exports the selected page range with separate `Guides`, `Typography`, and `Placeholders` layers plus frozen text-frame geometry and resolved font family/style names. Exported text is no longer live-editable.
- All export formats preserve the current page rotation and the visible guide/content systems they support.

## Application Controls

### UX Reference {#help-ux-overview} [noindex]
Interaction patterns for settings controls and header controls, including visibility toggles and panel behavior.

### Application Controls {#help-application-controls-overview} [noindex]

### Header and Sidebars {#help-sidebars-header}
- Header actions include Presets, Load, Save, Export, Undo/Redo, dark mode, smart text zoom, and display toggles.
- Display controls include baselines, margins, modules, image placeholders, typography, and the Project panel toggle.
- `Save`, `Export`, and the display toggles stay disabled until a preview layout is available.
- The Project toggle sits directly after the image-placeholder toggle, separated by a divider.
- The right-side header actions are ordered as `i` (information/tooltips) and `?` (help).
- `i` toggles rollover info/tooltips globally across the app. Shortcut: `Cmd/Ctrl+Shift+I`.
- The Project panel can also be toggled from the keyboard via `Cmd/Ctrl+Shift+P`.
- `?` opens or closes the help sidebar. Shortcut: `Cmd/Ctrl+Shift+H`.
- While the presets browser is open, side panels and the header Project toggle are temporarily disabled.
- Footer `Feedback` link toggles the feedback sidebar panel; `Imprint` toggles the imprint panel, and both remain active while presets are open.
- Right-side content panels include close icons in their header rows.
- Only one right-side panel is open at a time.

### Help Navigation {#help-help-navigation}
- Use the header Help icon to open or close the help sidebar.
- When help is open, blue-highlighted targets become hover-jump sensitive in the header, preview page, presets, editor sidebars, and settings sections.
- Hover a highlighted target to jump to the matching help topic without closing help.
- Use the small up-arrow beside each help title to jump back to the index at the top.

### Presets {#help-header-examples}
- Opens the presets browser in the preview area.
- Bundled files are grouped into `1. Presets` and `2. Examples`; `3. Users` is reserved for user-created layout JSONs.
- Double-click a thumbnail to load it.
- Press `Esc` to close the browser without loading a preset.
- When help is open, hovering the presets panel (or its `?` marker) jumps here.
- Shortcut: `Cmd/Ctrl+Shift+4`.

### Load {#help-header-load}
Loads a saved project JSON from disk; legacy single-page JSON is still accepted and wrapped into a one-page project. Shortcut: `Cmd/Ctrl+O`.

### Save {#help-header-save}
Saves project metadata plus every page's settings and layout state as project JSON; optional project tours are stored in the same file. Shortcut: `Cmd/Ctrl+S`.

### Export {#help-header-export}
Opens the export dialog for vector PDF, SVG, and IDML output. Use `SVG` or `IDML` when you need typography frozen into non-live geometry. Shortcut: `Cmd/Ctrl+Shift+E`.

### Undo {#help-header-undo}
Reverts the latest history step when available. Shortcut: `Cmd/Ctrl+Z`.

### Redo {#help-header-redo}
Reapplies an undone history step when available. Shortcut: `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`.

### Dark Mode {#help-header-dark-mode}
Toggles light and dark UI themes. Shortcut: `Cmd/Ctrl+Shift+D`.

### Smart Text Zoom {#help-header-smart-text-zoom}
Toggles the preview's text-edit zoom mode. It is enabled by default, zooms to the active text paragraph on entry, stays stable through ordinary text and style edits, refits when paragraph frame geometry changes (`Rows`, `Baselines`, `Cols`), and returns to full-page fit when text edit mode closes.

### Baselines Toggle {#help-header-baselines}
Shows or hides baseline grid lines. Shortcut: `Cmd/Ctrl+Shift+B`.

### Margins Toggle {#help-header-margins}
Shows or hides margin frame guides. Shortcut: `Cmd/Ctrl+Shift+M`.

### Modules Toggle {#help-header-modules}
Shows or hides module and gutter guides. Shortcut: `Cmd/Ctrl+Shift+G`.

### Typography Toggle {#help-header-typography}
Shows or hides text/style preview overlays. Shortcut: `Cmd/Ctrl+Shift+T`.

### Image Placeholders Toggle {#help-header-image-placeholders}
Shows or hides image placeholder overlays. Shortcut: `Cmd/Ctrl+Shift+J`.

### Project Panel {#help-header-layers}
- Opens the right-side Project panel with an editable project name and a `Pages` section.
- The name row edits the project title, and that title drives the default JSON filename stem.
- `Pages` stays visible in the fixed project-panel header while the page list scrolls; single-click a page card to activate it and double-click the card to open or close its inline layer list.
- Opened page cards expose a one-way `Facing pages` checkbox above `Layers`, converting the page into a true spread with mirrored inner/outer margins and a zero-gap preview seam.
- `Page Up` and `Page Down` also step through project pages when multiple pages are available, and `Home` / `End` jump to the first or last one.
- After conversion, the spread stays a single page card and edits inside one doubled coordinate space instead of managing a hidden companion page.
- Each page card has its own open/close toggle; opening a page reveals that page's mixed text/image layer stack inline.
- Newly added pages open automatically.
- Active-page layer cards mirror the same preview rollover/guides, so layer inspection stays linked to the page surface.
- For the active page, drag unlocked layer cards to reorder z-index; single-click selects the layer, double-click opens or retargets the editor, and clicks elsewhere in the Project panel exit edit mode.
- Each layer card includes a lock toggle to the left of delete. Locked layers stay visible and selectable in the stack, but preview hover, move, and editor access are disabled until unlocked.

### Information Toggle {#help-header-information}
Toggles rollover info/tooltips globally across header controls, side panels, and editor affordances. Shortcut: `Cmd/Ctrl+Shift+I`.

### Keyboard Shortcuts {#help-shortcuts}
`Cmd/Ctrl` means use `Cmd` on macOS and `Ctrl` on Windows/Linux.

{{SHORTCUT_TABLE}}

## Grid Generator Settings

### Grid Generator Settings {#help-grid-generator-settings-overview} [noindex]

### I. Canvas Ratio & Rotation {#help-canvas-ratio}
- Choose a base canvas ratio preset, or select `Custom Ratio` and enter width:height units directly, including fractional ratios such as `2:1.414` for spread-style proportions like facing A4. Actual `Facing pages` conversion is configured per page in the Project panel.
- `Ratio` and `Orientation` preview live on dropdown rollover before commit.
- Orientation changes between portrait and landscape at the layout level.
- Rotation rotates the preview/export composition between `-180..180` degrees.
- Custom ratios generate page dimensions at A4-equivalent area before orientation is applied.
- Paper sizing for DIN/ANSI exports is derived from this ratio selection.

### II. Baseline Grid {#help-baseline-grid}
- The baseline unit controls vertical rhythm for grid and typography.
- Most style leading values follow baseline multiples; Swiss caption uses a tighter `7pt / 8pt` pairing.
- Top and bottom margins are snapped to baseline units.
- Changing baseline does not auto-reposition blocks.

### III. Margins {#help-margins}
- The `Margin Method` dropdown offers Progressive (`1:2:2:3`), Van de Graaf (`2:3:4:6`), Baseline (`1:1:1:1`), and `Custom Margins`.
- The `Margin Method` list previews hovered options live before commit.
- `Baseline Multiple` scales both method ratios and custom margin ratios while staying baseline-aligned.
- Selecting `Custom Margins` reveals independent top/left/right/bottom sliders that still scale through the shared baseline multiple.
- Bottom margin is expected to align with the last baseline line.

### IV. Grid & Rhythms {#help-gutter}
- Grid range is `1..13` for both columns and rows.
- Gutter multiple range is `1.0..4.0` in `0.5` steps.
- `Rhythms` options: `Fibonacci`, `Golden Ratio`, `Perfect Fifth`, `Perfect Fourth`, `Repetitive` (default).
- `Rhythms` plus the non-repetitive direction lists preview hovered options live before commit.
- For all non-repetitive rhythms, rows can be toggled on/off with direction `Left to right` or `Right to left` (default: on, `Left to right`).
- For all non-repetitive rhythms, cols can be toggled on/off with direction `Top to Bottom` or `Bottom to top` (default: on, `Top to Bottom`).
- Module sizes are recomputed after each rows/cols/gutter change.
- Reducing rows or columns is blocked when paragraphs or image placeholders would fall outside the new grid.

### V. Typo {#help-typo}
- Typography scales: Swiss, Golden Ratio, Perfect Fourth, Perfect Fifth, Fibonacci.
- The Typo panel shows current size and leading for `Display`, `Headline`, `Subhead`, `Body`, and `Caption` on the active baseline.
- `Custom` is paragraph-level only and is seeded from the paragraph's current size and leading when first selected in the text editor.
- In Swiss scale on the 12pt A4 reference baseline, Display is `64pt / 72pt`.
- In Swiss scale, caption uses `7pt` size with `8pt` leading on the A4 reference baseline.
- `Font Hierarchy` and `Base Font` preview live on dropdown rollover before commit.
- `Base Font` is inherited by blocks that do not store explicit overrides.
- The text editor can override the paragraph cut with any available family variant, while untouched weight/slant defaults still follow the selected hierarchy.

### VI. Available Fonts {#help-available-fonts}
- Base-font and paragraph font-family pickers use the same grouped family list.
- Supported font-family pickers preview hovered families live before commit.
- Every listed family links to its Google Fonts specimen/download page.

{{AVAILABLE_FONTS}}

### VII. Color Scheme {#help-color-scheme}
- Selects the base scheme used for new image placeholders.
- `Background` applies `None` or any color from the selected scheme to the page.
- `Base Color Scheme` and `Background` preview live on dropdown rollover before commit.
- The same selector appears in the image editor.
- Image editor starts with the current global scheme selected.
- Each placeholder still stores its own final color value.
