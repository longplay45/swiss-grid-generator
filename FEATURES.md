# Swiss Grid Generator Features

Implementation-accurate feature inventory for the current app.

## Purpose

Swiss Grid Generator is a production-oriented layout tool for building Swiss/editorial compositions from page ratio, baseline, margins, modules, typography, layers, and export settings.

## Canvas and Format Control

- Choose the canvas ratio from built-in families: `DIN`, `ANSI`, `Balanced`, `Photo`, `Screen`, `Square`, `Editorial`, `Wide Impact`.
- Switch page orientation between `portrait` and `landscape`.
- Rotate the composition from `-180` to `180` degrees.
- Use DIN and ANSI ratio families with mapped paper-size sets during export.
- Work with per-page settings inside a multi-page project.

## Baseline Grid

- Choose the baseline/grid unit from predefined values: `6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72`.
- Build all vertical rhythm from that baseline.
- Keep top and bottom margins snapped to the baseline.
- Keep typography leading aligned to baseline multiples.
- Change baseline without auto-repositioning existing paragraphs.

## Margins

- Use three margin systems:
  - `Progressive (1:2:2:3)`
  - `Van de Graaf (2:3:4:6)`
  - `Baseline (1:1:1:1)`
- Scale the margin system with a shared `Baseline Multiple`.
- Enable `Custom Margins` and set top/left/right/bottom independently.
- Keep custom margins tied to the same baseline multiple and baseline grid logic.

## Grid and Rhythms

- Set columns from `1` to `13`.
- Set rows from `1` to `13`.
- Set gutter multiple from `1.0` to `4.0` in `0.5` steps.
- Use rhythm modes:
  - `Repetitive`
  - `Fibonacci`
  - `Golden Ratio`
  - `Perfect Fourth`
  - `Perfect Fifth`
- Enable or disable rhythm behavior independently for rows and columns on non-repetitive systems.
- Reverse rhythm direction per axis.
- Recompute module sizes whenever rows, columns, gutter, or rhythm settings change.
- Prevent invalid row/column reductions when positioned paragraphs would fall outside the new grid.
- Show a temporary warning instead of auto-moving those paragraphs.

## Typography System

- Use typography scales:
  - `Swiss`
  - `Golden Ratio`
  - `Fibonacci`
  - `Perfect Fourth`
  - `Perfect Fifth`
- Work with the hierarchy levels:
  - `FX`
  - `Display`
  - `Headline`
  - `Subhead`
  - `Body`
  - `Caption`
- Review the current size/leading table for the active baseline and scale.
- Set a project/page base font for paragraphs without explicit overrides.
- Choose fonts from grouped families:
  - Sans-Serif: `Inter`, `Work Sans`, `Nunito Sans`, `IBM Plex Sans`, `Libre Franklin`
  - Serif: `EB Garamond`, `Libre Baskerville`, `Bodoni Moda`, `Besley`
  - Poster: `Playfair Display`

## Color and Page Surface

- Choose a global image placeholder color scheme.
- Use built-in schemes:
  - `Swiss Modern`
  - `Stone Cyan`
  - `Fresh Contrast`
- Apply a page background color from the active scheme or use `None`.
- Use per-block text colors in text layers.
- Use per-placeholder colors in image layers.

## Preview Workspace

- Use the central preview as the live layout surface for the active page.
- Show or hide:
  - baselines
  - margins
  - modules/gutters
  - image placeholders
  - typography
- Double-click an empty module to create a text paragraph.
- `Shift` + double-click an empty module to create an image placeholder.
- Hover text and image layers to reveal their active guides and edit affordances.
- Keep Project-panel hover and preview hover linked to the same layer.

## Text Layer Editing

- Create custom paragraph layers.
- Edit existing text layers from the popup editor.
- Clear base text blocks or delete custom blocks.
- Set per-text-layer:
  - content
  - column span
  - row span
  - rotation
  - alignment
  - style assignment
  - font family
  - font cut / weight / italic state
  - optical kerning
  - tracking
  - color
  - newspaper reflow
  - syllable division
- When `FX` is assigned, set custom `FX` size and leading.
- Review live character count and word count in the editor info panel.
- Save with `Cmd/Ctrl+Enter`.
- Close without saving via `Esc` or outside click.

## Text Positioning and Placement

- Place paragraphs on logical grid coordinates rather than unstable pixel offsets.
- Keep paragraph position stable across grid growth.
- Keep paragraph position stable across valid grid changes.
- Anchor text layers by column, row, and baseline offset.
- Drag text layers to move them around the grid.
- Snap standard drag to module placement.
- Use `Shift` + drag for baseline/overset placement.
- Allow overset placement for edge-cut compositions.
- `Alt/Option` + drag duplicates a text block.

## Image Placeholder Editing

- Create image placeholders directly in the preview.
- Open the image editor from the preview affordance.
- Set placeholder row span.
- Set placeholder column span.
- Set placeholder color.
- Delete the placeholder from the editor or Project panel.

## Project Structure

- Work inside a `Project -> Pages -> Layers` model.
- Edit the project title.
- Use the project title as the default save filename stem.
- Keep each page’s UI settings and layout state separate.
- Switch active pages from the Project panel.
- Add a page by duplicating the active page.
- Rename pages.
- Delete pages.
- Reorder pages by drag and drop.
- Reorder layers by drag and drop.
- Keep the layer stack mixed across text and image layers.
- Select a layer from the Project panel and highlight the matching preview layer.
- Scroll the Project panel to the selected layer when selection happens from preview.

## Presets

- Open the preset browser from the header or keyboard shortcut.
- Browse bundled layout presets.
- View rendered page-1 thumbnails in the preset browser.
- Double-click a preset thumbnail to load it.
- Close the preset browser with `Esc` without loading anything.
- Load presets stored as canonical project JSON.

## Saving and Loading

- Save the current project as project JSON.
- Save project metadata including:
  - project title
  - filename
  - description
  - author
- Persist:
  - `activePageId`
  - `pages[]`
  - per-page settings
  - per-page preview layout state
- Load saved project JSON from disk.
- Accept legacy single-page JSON and wrap it into the current project model.

## Export

- Export vector PDF output.
- Open an export dialog with filename and print settings.
- For DIN/ANSI ratios, choose units and paper size.
- For other ratios, set width and derive height from the aspect ratio.
- Use `Print Pro` export controls.
- Choose print presets:
  - `Press Proof`
  - `Offset Final`
  - `Digital Print`
- Set bleed in millimeters.
- Enable registration-style crop marks.
- Enable final-safe guide colors.
- Export PDF with embedded layout, typography, guides, and print settings.

## History and Validation

- Undo settings changes.
- Undo preview edits.
- Undo placement changes.
- Undo duplication and deletion.
- Redo undone actions.
- Keep invalid grid reductions from changing the layout.
- Show a temporary warning toast for invalid reductions instead of a blocking modal.

## Header Controls

- Open the preset browser.
- Load project JSON.
- Save project JSON.
- Export PDF.
- Undo.
- Redo.
- Toggle dark mode.
- Toggle baseline visibility.
- Toggle margin visibility.
- Toggle module/gutter visibility.
- Toggle typography visibility.
- Toggle the Project panel.
- Toggle rollover info/tooltips.
- Toggle Help.
- Toggle the right-side settings panel.

## Side Panels and Aux Panels

- Open the right-side Project panel.
- Open the right-side Help panel.
- Open the right-side settings placeholder panel.
- Open the right-side Feedback panel.
- Open the right-side Imprint panel.
- Keep only one right-side panel open at a time.
- Collapse and expand the `Pages` and `Layers` sections.
- Double-click a Project section header to toggle both sections together.

## Help and Guidance

- Open contextual help from the header.
- Use the in-app Help panel as an indexed feature reference.
- Jump from highlighted UI targets to matching help sections.
- Use rollover info/tooltips for header actions and shortcuts.

## Keyboard Shortcuts

- `Cmd/Ctrl+O`: Load project JSON
- `Cmd/Ctrl+S`: Save project JSON
- `Cmd/Ctrl+Shift+E`: Export PDF
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`: Redo
- `Cmd/Ctrl+Shift+D`: Toggle dark mode
- `Cmd/Ctrl+Shift+B`: Toggle baselines
- `Cmd/Ctrl+Shift+M`: Toggle margins
- `Cmd/Ctrl+Shift+G`: Toggle modules/gutters
- `Cmd/Ctrl+Shift+T`: Toggle typography
- `Cmd/Ctrl+Shift+1`: Toggle settings panel
- `Cmd/Ctrl+Shift+2`: Toggle help panel
- `Cmd/Ctrl+Shift+3`: Toggle imprint panel
- `Cmd/Ctrl+Shift+4`: Toggle preset browser
- `Cmd/Ctrl+Shift+5`: Toggle Project panel
- `Cmd/Ctrl+Shift+6`: Toggle rollover info
- `Esc`: Close presets browser, dialogs, and popup editors where supported

## UI Themes and Surface Behavior

- Toggle light and dark UI themes.
- Keep preview, side panels, dialogs, and editor surfaces synchronized to the current theme.
- Show version information in the footer.
- Show release-channel-driven beta labeling when configured.
