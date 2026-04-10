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

- Hierarchy levels: `FX`, `Display`, `Headline`, `Subhead`, `Body`, `Caption`.
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
- FX-specific size and leading overrides.
- Paragraph alignment: left, center, right.
- Hyphenation toggle per paragraph.
- Newspaper reflow across paragraph columns.
- Optical margin alignment engine for preview/export.

## Text Editing

- Inline editor overlay on the page surface.
- Geometry submenu: rows, cols, alignment, reflow, hyphenation, rotation.
- Type submenu: font, cut, hierarchy, FX size/leading, kerning, tracking, scheme, color.
- Info submenu: geometry, style, font, size, leading, kerning, tracking, counts, `Max/Line`.
- Selection-aware styling for selected text:
  - font family
  - font cut
  - hierarchy (`Typo`)
  - color
  - tracking
- Paragraph defaults are rebased when edits are applied without a scoped selection.
- Caret and selection rendering follow rendered text geometry.
- Preserves repeated spaces and blank lines in the source model.
- Soft-wrap boundary spaces remain in the source text but do not render as visible indent on the next visual line.

## Placement and Layers

- Double-click empty module to create a text paragraph.
- `Shift` + double-click empty module to create an image placeholder (`Ctrl` fallback).
- Drag paragraphs and placeholders to move them.
- `Alt/Option` + drag duplicates the hovered layer.
- `Shift` + drag switches to baseline/overset placement (`Ctrl` fallback).
- Project panel supports page switching, reordering, renaming, deletion, and duplication.
- Layer cards support selection, reordering, deletion, and editor opening.
- Text paragraphs and image placeholders use logical grid anchors:
  - `column`
  - `row`
  - `baselineOffset`
- Increasing columns/rows preserves existing anchors.
- Decreasing columns/rows is blocked when any paragraph or image placeholder would fall outside the new grid.
- Invalid grid reductions show a temporary warning instead of auto-repositioning content.

## Image Placeholders

- Independent row/column spans.
- Color-scheme aware placeholder fills.
- Placeholder-specific transparency control.
- Stable logical positioning across grid changes.
- Separate editor with Geometry and Info rails.
- Geometry submenu uses one parameter row per setting.
- Scheme, swatch color, and transparency live in the geometry submenu.
- Info submenu summarizes rows, columns, scheme, color, and transparency.

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
- Visibility toggles for baselines, margins, modules, image placeholders, and typography.
- Undo/redo across settings, layout, and editor operations.
- Help sidebar with hover-jump references.
- Rollover-info toggle for tooltips and affordances.
- Keyboard shortcuts for header controls and panel toggles.
