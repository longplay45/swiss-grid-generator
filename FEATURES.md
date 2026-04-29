# FEATURES.md

Current capability inventory for Swiss Grid Generator.

## Document Model

- Multi-page projects with project metadata (`title`, `description`, `author`, `createdAt`).
- Save to Library dialog for project title plus optional description and author metadata.
- Independent page settings and layout state per page.
- Mixed page layer stack with text paragraphs and image placeholders.
- Save/load as plain project JSON or gzip-compressed `.swissgridgenerator` archives.
- Bundled presets use the same project JSON schema as saved documents.
- Legacy single-page JSON is still accepted and wrapped into a one-page project on load.
- Optional guided project tours embedded in project JSON and rendered as an in-app step overlay.
- Optional Supabase email-code authentication for cloud sync.
- Authenticated projects keep a local offline cache and use Supabase as the remote source of truth.
- Saved user-library projects track `ownerUserId`, `remoteProjectId`, `remoteRevision`, `lastSyncedAt`, and sync state.
- Local cloud/account activity is stored in a capped support log and is not uploaded automatically.

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
- Left-panel hierarchy table showing the resolved `Display`, `Headline`, `Subhead`, `Body`, and `Caption` metrics for the active baseline/scale.
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
- Dynamic document variables for `lorem`, `project_title`, `page_title`, `page`, `pages`, `date`, `time`, and `url`.
- `%page%` / `%pages%` resolve against physical page counts; on facing spreads the right side advances by one physical page.

## Text Editing

- Inline editor overlay on the page surface.
- Left-sidebar text editor with `Paragraph`, `Typo`, `Symbols`, `Placeholders`, and `Info` sections.
- Text-editor section open/closed state and panel scroll position are remembered across pages and paragraphs inside the current document, with an all-closed first-use default. Opening a different document or preset resets the editor panels to the closed, top-aligned state.
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
- Symbols section inserts typographic marks from a grouped palette, stores recent picks, and assigns inserted symbols to `Noto Sans Symbols 2` as run-level formatting.
- Placeholders section lists the available document-variable tokens and inserts the clicked token at the caret or over the current selection.
- `<%lorem%>` fills the active paragraph frame according to its geometry, reflow, and hyphenation settings.
- Info section: geometry, style, font, size, leading, kerning, tracking, counts, `Max/Line`.
- Text editor can be opened from the preview affordance or by double-clicking an unlocked text layer card in the Project panel.
- When a text editor is already open, clicking another unlocked preview paragraph or double-clicking another unlocked text layer card retargets the editor to that paragraph.
- Selection-aware styling for selected text:
  - font family
  - font cut
  - hierarchy (`Typo`)
  - color
  - tracking
- Paragraph defaults are rebased when edits are applied without a scoped selection.
- Caret and selection rendering follow rendered text geometry.
- In text edit mode, placeholders stay visible as raw tokens in the edited paragraph; outside edit mode they render to live values.
- Double-click selects the clicked word in inline text edit mode.
- Triple-click selects the containing sentence in inline text edit mode.
- `Alt+A` and `Cmd/Ctrl+A` select the whole paragraph while inline text edit is active.
- `Arrow`, `Home`, and `End` navigation in inline text edit follows the rendered line geometry rather than DOM textarea line boxes.
- Preserves repeated spaces and blank lines in the source model.
- Soft-wrap boundary spaces remain in the source text but do not render as visible indent on the next visual line.

## Placement and Layers

- Double-click empty module to create a text paragraph.
- Hold `1..6` while double-clicking empty module to create a paragraph as `Caption`, `Body`, `Subhead`, `Headline`, `Custom`, or `Display`.
- `Shift` + double-click empty module to create an image placeholder (`Ctrl` fallback).
- Paragraph creation uses the actual clicked module rather than the nearest module center.
- Drag paragraphs and placeholders to move them.
- `Alt/Option` + drag duplicates the hovered layer.
- Hovered text paragraphs expose a `+` affordance: click copies the full paragraph, `Shift` + click copies `Paragraph` settings, `Alt/Option` + click copies `Typo` settings, and `Alt/Option` + `Shift` + click copies both for transfer onto another paragraph, even across pages and loaded layouts.
- Default paragraph drag respects each paragraph's current `Snap to Columns (X)` state and, when `Snap to Baseline (Y)` is on, snaps Y to the nearest module top.
- Holding `Shift` during paragraph or image-placeholder drag temporarily snaps the Y position to the nearest baseline row (`Ctrl` fallback).
- Arrow keys nudge the selected unlocked paragraph or image placeholder through the same logical placement model: snapped X moves by columns, snapped Y moves by module rows by default, `Shift` uses baseline rows, and unsnapped axes move in tenth-step logical increments with `Shift` as a 10x multiplier.
- Image placeholders now use the same X/Y snap model as paragraphs, including free-axis placement and per-layer rotation.
- Paragraph hover guides follow the configured `rows + baselines` height rather than only the rendered text bounds.
- Paragraph hover edit affordance is anchored at the paragraph's top-left origin so shallow frames remain reachable.
- Preview rollover stays active while editing, so clicking another existing unlocked paragraph or image placeholder retargets the already open editor instead of leaving edit mode.
- Project panel supports page switching, page-card open/close toggles with inline layer lists, reordering, renaming, deletion, and single-page creation.
- Project panel includes an editable `TITLE` section that expands to reveal inline `description` and `author` metadata fields storing on blur.
- Project panel includes a document-info toggle with project/page/layer/type summary text.
- Opened page cards expose a `Facing pages` control above `Layers`, converting a page into a true facing spread with mirrored inner/outer margins, a zero-gap preview seam, and doubled effective columns across the spread.
- The Project header includes an `i` toggle for document info text.
- `Page Up` and `Page Down` step through project pages when multiple pages are present, and `Home` / `End` jump to the first or last page.
- Facing spreads stay a single project page and keep the normal layer editing workflow inside one continuous spread space.
- `Add Page` always creates a new single page, even from a facing spread.
- Projects are capped at `1000` pages.
- Single-clicking a page card selects it; double-clicking toggles its inline layer list and aligns opened pages to the top of the panel.
- Expanded page cards expose rename, delete, facing-pages, and inline layer-management controls.
- Newly added pages open automatically.
- Project JSON supports an optional `tour` definition for quick onboarding tied to real pages and layers.
- Tour overlay supports open/close, back/next, step captions, optional layer focus, optional editor opening, and click-to-advance steps.
- Layer cards support selection, reordering, locking, deletion, and editor opening.
- Active-page layer cards now use single-click for selection and double-click for editor open/retarget, so keyboard nudging stays reachable from the Project panel without immediately entering edit mode.
- Double-clicking a layer-card lock toggle applies the same lock or unlock state to every layer on that page.
- Locked layers stay visible but are excluded from preview hover, drag, and editor retarget/open behavior until unlocked.
- `Custom Ratio` accepts fractional width/height units, including decimal comma input for formats such as `2:1,414`.
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
- Image-editor section open/closed state and panel scroll position are remembered across pages and placeholders inside the current document, with an all-closed first-use default. Opening a different document or preset resets the editor panels to the closed, top-aligned state.
- The image editor header shows `IMAGE` plus the current placeholder swatch color.
- Image editor can be opened from the preview affordance or by double-clicking the corresponding unlocked image layer card in the Project panel.
- When an image editor is already open, double-clicking another unlocked active-page image layer card retargets the editor.
- Geometry section includes rows, baselines, columns, X/Y snapping, and rotation.
- Geometry dropdowns preview hovered row/col/baseline values live before commit.
- Scheme, swatch color, and transparency live in the Color section.
- Scheme dropdown previews the hovered placeholder palette before commit.
- `Baselines` is a bounded dropdown capped by the current document's baselines-per-grid-module count.
- Info section summarizes rows, baselines, columns, X/Y snap state, rotation, scheme, color, and transparency.

## Presets

- Preset browser in the preview area.
- Rendered page-1 thumbnails for bundled presets.
- Preset rollover tooltip with title, description, author, and creation date metadata when rollover info is enabled.
- User-library thumbnails show a green status dot only while signed in and synced; signed-out, pending, or local-only states stay orange.
- Deleting a user-library thumbnail asks for confirmation first, then removes it locally and displays whether the cloud delete was performed, queued, or unnecessary.
- Double-click preset to load.
- `Esc` closes the browser without loading.

## Export

- Save dialog stores the current project into the local `Users` library with editable title, description, and author metadata.
- Local `Users` library records are stored as gzip-compressed project archives in IndexedDB.
- `PDF` selected-range export.
- `JSON` full-project export, optionally gzip-compressed as `.swissgridgenerator`.
- `SVG v1` selected-range export.
- `IDML v1` selected-range export.
- Export defaults to the full project page range.
- Export dialog includes JSON/PDF/SVG/IDML format switching, page-range controls for non-JSON exports, filename field, and progress state.
- Export is WYSIWYG with respect to the current preview visibility state for baselines, margins, modules, typography, and image placeholders.
- All export formats use stored page geometry directly.
- PDF, SVG, and IDML are vector-based, not raster captures.
- `PDF` print presets:
  - `Digital Print`
  - `Press Proof`
- PDF bleed and registration-style marks.
- Embedded PDF output intents:
  - `sRGB IEC61966-2.1` for digital export
  - `Coated FOGRA39` for print export
- PDF guide groups exported as separate form objects for margins, modules, and baselines.
- PDF exports preserve available project metadata (`title`, `description`, `author`, `createdAt`) where the format supports it.
- Use `SVG` or `IDML` when typography must be frozen as non-live geometry.
- Single-page SVG exports a trim-size vector file with exact glyph-outline typography, guides, and placeholders.
- Multi-page SVG exports a ZIP with one trim-size SVG per page.
- SVG exports embed available project metadata in the file metadata block.
- SVG typography is exported as outline geometry, so downstream text is not live-editable.
- IDML exports separate `Guides`, `Typography`, and `Placeholders` layers with frozen text-frame geometry, so downstream text is not live-editable.
- IDML exports preserve available project metadata in the package XMP metadata.
- `Esc` closes idle export UI and cancels a running export at the next safe checkpoint.

## UI and Workflow

- Dark mode.
- Smart text-edit zoom toggle in the header, enabled by default.
- While smart text zoom is enabled, entering text edit mode focuses the active paragraph, ordinary text/style edits keep the current zoom, frame-geometry changes (`Rows`, `Baselines`, `Cols`) refit it, and leaving text edit returns to full-page fit.
- Bottom-of-preview layout-open tooltip popup sourced from `TOOLTIPS.md`, with fade-in, `Next >` sequencing, `Tooltip x of y` count, and dismiss via `X` or outside click.
- Layout-open tooltip popup participates in the Help system: its orange top indicator appears only while Help is open, and hover routes the Help panel to the tooltip reference section.
- Visibility toggles for baselines, margins, modules, image placeholders, and typography.
- Undo/redo across settings, layout, and editor operations.
- Help sidebar with hover-jump references.
- Rollover-info toggle for tooltips and affordances.
- Feedback sidebar with required email/comment fields, optional screenshots, and optional support-log attachment.
- Legal Notice sidebar with provider, contact, privacy, cloud storage, terms, and dispute-resolution information.
- Header account panel with email-code sign-in, cloud sync status, and a green/orange header status dot.
- When signed out, the account panel status row reads `Not connected`.
- The account panel `Status` row expands to show recent local cloud/account events and a `Download` support action.
- Auth and cloud-sync failures surface as actionable product messages instead of raw provider errors.
- Hidden-tab / page-close transitions trigger a best-effort local autosave flush and a best-effort cloud sync for already-saved user-library projects.
- Keyboard shortcuts for header controls and panel toggles.

## Cloud Sync

- Supabase browser auth with email one-time-code sign-in.
- Cloud archives stored as gzip-compressed `.swissgridgenerator` files.
- On sign-in, the app syncs local library entries with Supabase and pulls remote-only projects into the local offline cache.
- Signed-in sessions request throttled background sync when the app regains focus, becomes visible, or opens the preset browser.
- Existing saved user-library projects auto-save locally and sync debounced to the cloud while editing.
- Revision mismatches are marked as `conflict` instead of overwriting local work silently.
- Remote deletions are applied locally on sync when the local copy has no newer unsynced changes; otherwise the project is marked as `conflict`.
- Account and sync events are recorded locally as capped support diagnostics with `info`, `success`, `warning`, or `error` severity.
- Remote-backed deletions are soft-deleted in Supabase via `deleted_at`, while local-only deletions purge the local cache record immediately.
