# FEATURES.md

Current capability inventory for Swiss Grid Generator.

## Document Model

- Multi-page projects with project metadata (`title`, `description`, `author`, `createdAt`).
- Independent page settings and layout state per page.
- Mixed page layer stack with text paragraphs and image placeholders.
- Save/load as project JSON.
- Bundled presets use the same project JSON schema as saved documents.
- Legacy single-page JSON is still accepted and wrapped into a one-page project on load.

## Grid System

- Supported layout dropdowns render hovered options live in the preview and revert on close unless the option is committed.
- Ratio families: `DIN`, `ANSI`, `Balanced`, `Photo`, `Screen`, `Square`, `Editorial`, `Wide Impact`, `Custom Ratio`.
- Custom ratio width:height input resolved to A4-equivalent page area.
- Portrait and landscape orientation.
- Full page rotation from `-180..180`.
- Baseline units from `6pt` to `72pt`, filtered by usable line count.
- Margin method dropdown: `Progressive`, `Van de Graaf`, `Baseline`, `Custom Margins`.
- Custom per-side margins with shared baseline multiple.
- Grid size from `1..13` for both columns and rows.
- Gutter multiple from `1.0..4.0` in `0.5` steps.
- Rhythm modes: `Repetitive`, `Fibonacci`, `Golden Ratio`, `Perfect Fourth`, `Perfect Fifth`.
- Independent rhythm enable/direction per axis.

## Typography

- Hierarchy levels: `Display`, `Headline`, `Subhead`, `Body`, `Caption`, `Custom`.
- Scale systems: `Swiss`, `Golden Ratio`, `Fibonacci`, `Perfect Fourth`, `Perfect Fifth`.
- Base font inheritance plus block-level override support.
- Font family groups: `Sans-Serif`, `Serif`, `Poster`.
- Available Fonts:
  - Sans-Serif: [Inter](https://fonts.google.com/specimen/Inter), [Work Sans](https://fonts.google.com/specimen/Work+Sans), [Jost](https://fonts.google.com/specimen/Jost), [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans), [Libre Franklin](https://fonts.google.com/specimen/Libre+Franklin)
  - Serif: [EB Garamond](https://fonts.google.com/specimen/EB+Garamond), [Libre Baskerville](https://fonts.google.com/specimen/Libre+Baskerville), [Bodoni Moda](https://fonts.google.com/specimen/Bodoni+Moda), [Besley](https://fonts.google.com/specimen/Besley)
  - Poster: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display)
- Family cut selection from available local variants.
- Optical or metric kerning.
- Tracking input from `-120` to `+300` (`1/1000 em`).
- Custom-specific size and leading overrides.
- Paragraph horizontal alignment: left, center, right.
- Paragraph vertical alignment: top, center, bottom.
- Hyphenation toggle per paragraph.
- Newspaper reflow across paragraph columns.
- Optical margin alignment engine for preview/export.

## Text Editing

- Inline editor overlay on the page surface.
- Left-sidebar text editor with `Paragraph`, `Typo`, and `Info` sections.
- The text editor header uses the same user-facing layer label shown in the Project panel instead of the internal block id.
- Paragraph section: rows, baselines, cols, horizontal alignment, vertical alignment, reflow, hyphenation, `Snap to Columns (X)`, `Snap to Baseline (Y)`, rotation.
- Paragraph height resolves as `rows + baselines`, with `rows = 0` allowed when `baselines > 0`.
- `Baselines` is a bounded dropdown capped by the current document's baselines-per-grid-module count.
- Paragraph geometry dropdowns preview hovered row/col/baseline values live before commit.
- Vertical alignment positions the text stack inside the configured paragraph frame while preserving baseline rhythm.
- `Snap to Columns (X)` keeps paragraphs on logical column anchors; turning it off allows free horizontal placement with symmetric one-column overhang into the side margins.
- `Snap to Baseline (Y)` keeps paragraphs on editorial Y anchors; normal drag uses module tops, `Shift`/`Ctrl` drag uses baseline rows, and turning it off allows free vertical placement.
- Typo section: font, cut, hierarchy, Custom size/leading, kerning, tracking, scheme, color.
- Selecting `Custom` seeds Custom size/leading from the paragraph's currently resolved size and leading.
- Typo dropdowns preview hovered family, cut, hierarchy, and scheme values before commit.
- Info section: geometry, style, font, size, leading, kerning, tracking, counts, `Max/Line`.
- Selection-aware styling for selected text:
  - font family
  - font cut
  - hierarchy (`Typo`)
  - color
  - tracking
- Paragraph defaults are rebased when edits are applied without a scoped selection.
- Caret and selection rendering follow rendered text geometry.
- Double-click selects the clicked word in inline text edit mode.
- Triple-click selects the containing sentence in inline text edit mode.
- `Alt+A` and `Cmd/Ctrl+A` select the whole paragraph while inline text edit is active.
- `Arrow`, `Home`, and `End` navigation in inline text edit follows the rendered line geometry rather than DOM textarea line boxes.
- Preserves repeated spaces and blank lines in the source model.
- Soft-wrap boundary spaces remain in the source text but do not render as visible indent on the next visual line.

## Placement and Layers

- Double-click empty module to create a text paragraph.
- `Shift` + double-click empty module to create an image placeholder (`Ctrl` fallback).
- Drag paragraphs and placeholders to move them.
- `Alt/Option` + drag duplicates the hovered layer.
- Default paragraph drag respects each paragraph's current `Snap to Columns (X)` state and, when `Snap to Baseline (Y)` is on, snaps Y to the nearest module top.
- Holding `Shift` during paragraph or image-placeholder drag temporarily snaps the Y position to the nearest baseline row (`Ctrl` fallback).
- Image placeholders now use the same X/Y snap model as paragraphs, including free-axis placement and per-layer rotation.
- Paragraph hover guides follow the configured `rows + baselines` height rather than only the rendered text bounds.
- Paragraph hover edit affordance is anchored at the paragraph's top-left origin so shallow frames remain reachable.
- Preview rollover stays active while editing, so clicking another existing paragraph or image placeholder retargets the already open editor instead of leaving edit mode.
- Project panel supports page switching, page-card open/close toggles with inline layer lists, reordering, renaming, deletion, and duplication.
- `Page Up` and `Page Down` step through project pages when multiple pages are present.
- Single-clicking a page card selects it; double-clicking toggles its inline layer list and aligns opened pages to the top of the panel.
- Newly added pages open automatically.
- Layer cards support selection, reordering, deletion, and editor opening.
- Text paragraphs and image placeholders use logical grid anchors:
  - `column`
  - `row`
  - `baselineOffset`
- Paragraphs and image placeholders both persist independent X/Y snap flags; unsnapped anchors may carry fractional `column` and/or `baselineOffset` values.
- Increasing columns/rows preserves existing anchors.
- Increasing a paragraph's column span preserves its anchored column even when the wider frame intentionally overhangs the page edge.
- Decreasing columns/rows is blocked when any paragraph or image placeholder would fall outside the new grid.
- Invalid grid reductions show a temporary warning instead of auto-repositioning content.

## Image Placeholders

- Independent row/column spans plus additional baseline height.
- Color-scheme aware placeholder fills.
- Placeholder-specific transparency control.
- Placeholder-specific `Snap to Columns (X)`, `Snap to Baseline (Y)`, and rotation controls.
- With X snapping off, image placeholders use the same symmetric one-column side-margin overhang as paragraphs.
- Stable logical positioning across grid changes.
- Separate left-sidebar editor with `Geometry`, `Color`, and `Info` sections.
- The image editor header shows `IMAGE` plus the current placeholder swatch color.
- Geometry section includes rows, baselines, columns, X/Y snapping, and rotation.
- Geometry dropdowns preview hovered row/col/baseline values live before commit.
- Scheme, swatch color, and transparency live in the Color section.
- Scheme dropdown previews the hovered placeholder palette before commit.
- `Baselines` is a bounded dropdown capped by the current document's baselines-per-grid-module count.
- Info section summarizes rows, baselines, columns, X/Y snap state, rotation, scheme, color, and transparency.

## Presets

- Preset browser in the preview area.
- Rendered page-1 thumbnails for bundled presets.
- Double-click preset to load.
- `Esc` closes the browser without loading.

## Export

- `PDF` selected-range export.
- `SVG v1` selected-range export.
- `IDML v1` selected-range export.
- Export defaults to the full project page range.
- All export formats use stored page geometry directly.
- All export formats are vector-based, not raster captures.
- `PDF` print presets:
  - `Digital Print`
  - `Press Proof`
- PDF bleed and registration-style marks.
- Embedded PDF output intents:
  - `sRGB IEC61966-2.1` for digital export
  - `Coated FOGRA39` for print export
- PDF guide groups exported as separate form objects for margins, modules, and baselines.
- Use `SVG` or `IDML` when typography must be frozen as non-live geometry.
- Single-page SVG exports a trim-size vector file with exact glyph-outline typography, guides, and placeholders.
- Multi-page SVG exports a ZIP with one trim-size SVG per page.
- SVG typography is exported as outline geometry, so downstream text is not live-editable.
- IDML exports separate `Guides`, `Typography`, and `Placeholders` layers with frozen text-frame geometry, so downstream text is not live-editable.

## UI and Workflow

- Dark mode.
- Smart text-edit zoom toggle in the header, enabled by default.
- While smart text zoom is enabled, entering text edit mode focuses the active paragraph, ordinary text/style edits keep the current zoom, frame-geometry changes (`Rows`, `Baselines`, `Cols`) refit it, and leaving text edit returns to full-page fit.
- Visibility toggles for baselines, margins, modules, image placeholders, and typography.
- Undo/redo across settings, layout, and editor operations.
- Help sidebar with hover-jump references.
- Rollover-info toggle for tooltips and affordances.
- Keyboard shortcuts for header controls and panel toggles.
