# Help

Edit this file to update the in-app Help panel.

Format:
- `## Group Title` starts an index group.
- `### Section Title {#section-id}` starts a top-level section.
- Add `[noindex]` after the id to keep a section out of the index.
- `#### Subsection Title {#section-id}` starts a subsection.
- Use paragraphs and `-` bullet lists.
- Use backticks for inline code.
- Use markdown links for external URLs.
- Use `{{AVAILABLE_FONTS}}`, `{{SHORTCUT_TABLE}}`, and `{{DOCUMENT_VARIABLE_TOKENS}}` where needed.

## Quick Start

### Quick Start {#help-quick-start}
- Set ratio, orientation, and rotation in `I. Canvas Ratio`.
- Set the baseline first. It drives vertical rhythm.
- Set margins in `III. Margins`.
- Set columns, rows, gutter, and rhythm in `IV. Grid & Rhythms`.
- Set the type scale and base font in `V. Typo`.
- Use the header toggles to inspect baselines, margins, modules, and type.

## General Guidance

### General Guidance {#help-general-overview} [noindex]
Core editing and layout workflows.

### Preview Workspace {#help-preview-workspace}
- The preview is the live layout surface for the active page.
- Double-click inside a module to add text. `Shift` + double-click adds an image placeholder.
- Hold `1..6` while double-clicking empty space to choose the new paragraph hierarchy: `1 Caption`, `2 Body`, `3 Subhead`, `4 Headline`, `5 Custom`, `6 Display`.
- Hover a layer to reveal edit access and placement guides.
- Drag to move. `Alt/Option` + drag duplicates.
- Locked layers stay visible but cannot be hovered, moved, or edited until unlocked in the Project panel.
- Arrow keys nudge the selected unlocked layer. Snapped axes move by the grid; unsnapped axes move in fine steps. `Shift` increases the unsnapped step and switches snapped Y to baseline movement.
- `Page Up`, `Page Down`, `Home`, and `End` navigate project pages.
- Undo/redo includes placement, duplication, deletion, and editor changes.

### Text Editor {#help-editor}
- Open text edit from the preview affordance, or retarget an open editor by clicking another unlocked preview block.
- While editing, the left sidebar switches to `Paragraph`, `Typo`, `Placeholders`, and `Info`.
- `Esc` or outside click exits edit mode.
- Inside inline text edit: double-click selects a word, triple-click selects a sentence, `Alt+A` or `Cmd/Ctrl+A` selects all, and `Arrow` / `Home` / `End` follow the rendered line layout.

#### Paragraph Section {#help-editor-paragraph}
- Set rows, baselines, columns, alignment, reflow, hyphenation, X/Y snap, and rotation.
- Height is `rows + baselines`.
- `Rows`, `Baselines`, and `Cols` preview on dropdown hover before commit.
- `Snap to Columns (X)` locks to columns. Off allows free horizontal placement with controlled side overhang.
- `Snap to Baseline (Y)` locks to the editorial Y system. Off allows free vertical placement.

#### Typo Section {#help-editor-typo}
- Set font family, cut, hierarchy, color, kerning, tracking, and `Custom` size/leading.
- If text is selected, type and color controls apply to the selection instead of the whole paragraph.
- Font, cut, hierarchy, and scheme preview on dropdown hover before commit.

#### Placeholders Section {#help-editor-placeholders}
- Insert document-variable tokens at the caret or over the current selection.
- `<%lorem%>` fills the active frame using its current geometry and reflow settings.
- `<%page%>` and `<%pages%>` use physical page counts. On facing spreads, the right side resolves to the next physical page number.
- Available tokens: {{DOCUMENT_VARIABLE_TOKENS}}.

#### Info Section {#help-editor-info}
- Shows geometry, type summary, counts, and `Max/Line`.

### Image Editor {#help-image-editor}
- Open from the preview affordance or by `Shift` + double-clicking empty space.
- The left sidebar switches to `Geometry`, `Color`, and `Info`.
- `Esc` or outside click exits edit mode.
- Double-clicking another active-page layer card retargets the open image editor.

#### Geometry Section {#help-image-editor-geometry}
- Set rows, baselines, columns, X/Y snap, and rotation.
- Height is `rows + baselines`.
- `Rows`, `Baselines`, and `Cols` preview on dropdown hover before commit.

#### Color Section {#help-image-editor-color}
- Set scheme, swatch color, and transparency.

#### Info Section {#help-image-editor-info}
- Shows the current geometry, snap state, rotation, scheme, color, and transparency.

### Drag and Placement {#help-drag-placement}
- Drag respects each layer's current X/Y snap settings.
- With `Snap to Baseline (Y)` on, normal drag uses module tops.
- Holding `Shift` during drag switches Y movement to baseline rows.
- Unsnapped layers still stay inside their allowed placement bounds.

### History and Reflow {#help-history-reflow}
- Undo/redo covers settings, content edits, and placement changes.
- Reducing rows or columns never auto-repositions existing layers.
- If a grid reduction would push content out of bounds, the change is blocked and a warning is shown.

### Save and Load Project JSON {#help-save-load}
- Save stores project metadata, pages, page settings, layout state, and optional tours.
- Load restores the full project and active page.
- Legacy single-page JSON is still accepted and wrapped into a one-page project.
- Positioned layers are stored with logical anchors so layouts stay stable across grid changes.

### Export {#help-export}
- Export supports vector PDF, SVG, and IDML.
- Multi-page projects can export a page range.
- PDF stays visually faithful. SVG and IDML are the frozen-geometry path when you do not want live text.
- `Esc` closes the dialog when no export is running and cancels an in-progress export at the next safe checkpoint.

## Application Controls

### UX Reference {#help-ux-overview} [noindex]
Global controls and panel behavior.

### Application Controls {#help-application-controls-overview} [noindex]

### Header and Sidebars {#help-sidebars-header}
- Header actions cover presets, load, save, export, undo/redo, dark mode, smart text zoom, display toggles, Project, and help.
- `Save`, `Export`, and display toggles stay disabled until a preview layout exists.
- The Project panel can also be toggled with `Cmd/Ctrl+Shift+P`.
- Header icon labels are always available as hover popups.
- `Shift` + click on a page-visibility toggle applies the same state to every page in the project.
- Only one right-side panel is open at a time.

### Help Navigation {#help-help-navigation}
- Open help from the header.
- When help is open, blue-marked UI targets jump to their matching help topic on hover.
- Use the small up-arrow beside a help title to jump back to the index.

### Presets {#help-header-examples}
- Opens the presets browser.
- Bundled files are grouped into `1. Presets` and `2. Examples`. `3. Users` is reserved for user files.
- Double-click a thumbnail to load it.
- `Esc` closes the browser without loading.
- Shortcut: `Cmd/Ctrl+Shift+4`.

### Load {#help-header-load}
Loads a saved project JSON. Shortcut: `Cmd/Ctrl+O`.

### Save {#help-header-save}
Saves the current project JSON. Shortcut: `Cmd/Ctrl+S`.

### Export {#help-header-export}
Opens export for PDF, SVG, and IDML. Shortcut: `Cmd/Ctrl+Shift+E`.

### Undo {#help-header-undo}
Reverts the latest history step. Shortcut: `Cmd/Ctrl+Z`.

### Redo {#help-header-redo}
Reapplies an undone history step. Shortcut: `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`.

### Dark Mode {#help-header-dark-mode}
Toggles light and dark UI themes. Shortcut: `Cmd/Ctrl+Shift+D`.

### Smart Text Zoom {#help-header-smart-text-zoom}
Toggles automatic zoom-to-paragraph while text editing.

### Baselines Toggle {#help-header-baselines}
Shows or hides baseline guides on the active page. `Shift` + click applies the same state to all pages. Shortcut: `Cmd/Ctrl+Shift+B`.

### Margins Toggle {#help-header-margins}
Shows or hides margin guides on the active page. `Shift` + click applies the same state to all pages. Shortcut: `Cmd/Ctrl+Shift+M`.

### Modules Toggle {#help-header-modules}
Shows or hides modules and gutters on the active page. `Shift` + click applies the same state to all pages. Shortcut: `Cmd/Ctrl+Shift+G`.

### Typography Toggle {#help-header-typography}
Shows or hides typography overlays on the active page. `Shift` + click applies the same state to all pages. Shortcut: `Cmd/Ctrl+Shift+T`.

### Image Placeholders Toggle {#help-header-image-placeholders}
Shows or hides image placeholders on the active page. `Shift` + click applies the same state to all pages. Shortcut: `Cmd/Ctrl+Shift+J`.

### Project Panel {#help-header-layers}
- Opens the project title and page/layer management panel.
- The small `i` toggle in the Project header shows or hides the document info text.
- Single-click a page card to activate it. Double-click it to open or close its inline layer list.
- `Facing pages` converts a page into a spread inside the same page record.
- `Add Page` always creates a new single page, even if the active page is a facing spread.
- A project can contain up to `1000` pages.
- Active-page layer cards mirror preview hover/guides.
- Drag unlocked layer cards to reorder z-index.
- Single-click a layer card to select it. Double-click it to open or retarget the editor.
- Locked layers stay visible and selectable, but preview hover, move, and editor access are disabled until unlocked.

### Keyboard Shortcuts {#help-shortcuts}
`Cmd/Ctrl` means `Cmd` on macOS and `Ctrl` on Windows/Linux.

{{SHORTCUT_TABLE}}

## Grid Generator Settings

### Grid Generator Settings {#help-grid-generator-settings-overview} [noindex]

### I. Canvas Ratio & Rotation {#help-canvas-ratio}
- Choose a preset ratio or enter `Custom Ratio`.
- `Ratio` and `Orientation` preview on dropdown hover before commit.
- Rotation turns the full preview/export composition.

### II. Baseline Grid {#help-baseline-grid}
- The baseline controls vertical rhythm for the grid and type.
- Top and bottom margins stay baseline-aligned.

### III. Margins {#help-margins}
- Choose a margin method or `Custom Margins`.
- Margin method previews on dropdown hover before commit.
- `Baseline Multiple` scales the margin system while keeping baseline alignment.

### IV. Grid & Rhythms {#help-gutter}
- Set columns, rows, gutter, and rhythm.
- Rhythm options preview on dropdown hover before commit.
- Reducing rows or columns is blocked when existing content would fall outside the new grid.

### V. Typo {#help-typo}
- Set the type scale and base font for the document.
- `Font Hierarchy` and `Base Font` preview on dropdown hover before commit.
- Blocks without explicit overrides inherit the base font.

### VI. Available Fonts {#help-available-fonts}
- Base-font and paragraph font pickers use the same grouped family list.
- Font-family pickers preview hovered families live before commit.
- Each listed family links to its Google Fonts specimen page.

{{AVAILABLE_FONTS}}

### VII. Color Scheme {#help-color-scheme}
- Sets the base scheme for new image placeholders.
- `Background` applies `None` or a scheme color to the page.
- Scheme and background preview on dropdown hover before commit.
