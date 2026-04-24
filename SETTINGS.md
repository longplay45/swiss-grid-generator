# SETTINGS.md

Current, implementation-accurate reference for all user-facing options and defaults.

## Typography System

6-level hierarchy, baseline-aligned system. Swiss caption keeps its intentional `7pt / 8pt` exception.

| Level | A4 Size | A4 Leading | Baseline Multiple | Weight |
|---|---:|---:|---:|---|
| `display` | 64pt | 72pt | 6x | Bold |
| `headline` | 30pt | 36pt | 3x | Bold |
| `subhead` | 20pt | 24pt | 2x | Regular |
| `body` | 10pt | 12pt | 1x | Regular |
| `caption` | 7pt | 8pt | 0.667x | Regular Italic |
| `fx` | 96pt | 96pt | 8x | Bold |

### Typography Scale Presets

| Value | Label |
|---|---|
| `swiss` | Swiss (Hand-tuned) |
| `golden` | Golden Ratio (phi) |
| `fibonacci` | Fibonacci (8, 13, 21, 34, 55) |
| `fourth` | Perfect Fourth (4:3) |
| `fifth` | Perfect Fifth (3:2) |

Default: `swiss`

## Settings Panel (Left)

- Supported dropdown controls preview hovered items live in the page while the menu is open; leaving or closing the menu restores the committed value until you select an option.

### I. Canvas Ratio

#### Ratio options

| Label | Ratio | Decimal |
|---|---|---:|
| `DIN` | 1:sqrt(2) | 1.414 |
| `ANSI` | 1:1.294 | 1.294 |
| `Balanced` | 3:4 | 1.333 |
| `Photo` | 2:3 | 1.500 |
| `Screen` | 16:9 | 1.778 |
| `Square` | 1:1 | 1.000 |
| `Editorial` | 4:5 | 1.250 |
| `Wide Impact` | 2:1 | 2.000 |
| `Custom Ratio` | user-defined | derived from width:height |

#### Custom Ratio

- Available when `Ratio` is set to `Custom Ratio`
- Two floating-point ratio-unit inputs: `Width` and `Height`
- Range per field: min `0.1`, max `100`, step `0.001`
- Default: `4 : 5`
- Decimal point and decimal comma input are both accepted, so ratios like `2 : 1.414` or `2 : 1,414` are valid.
- Orientation is applied after the ratio pair.
- Export/preview dimensions are generated from the custom ratio at A4-equivalent area.

#### Orientation

- `portrait` (default from `default_v001.json`)
- `landscape`
- `Ratio` and `Orientation` dropdown items preview live on rollover before commit

#### Rotation

- min: `-180`
- max: `180`
- step: `1`
- default: `0`

### II. Baseline Grid

- Grid unit options: `6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72`
- Default baseline in UI: **A4 baseline (12pt)**
- Dynamic max baseline protection remains active (ensures usable line count)

### III. Margins

#### Margin method

| ID | Label | Top | Left | Right | Bottom |
|---:|---|---:|---:|---:|---:|
| `1` | Progressive (1:2:2:3) | 1x | 2x | 2x | 3x |
| `2` | Van de Graaf (2:3:4:6) | 2x | 3x | 4x | 6x |
| `3` | Baseline (1:1:1:1) | 1x | 1x | 1x | 1x |
| `custom` | Custom Margins | user-defined | user-defined | user-defined | user-defined |

#### Baseline Multiple (Margins and Custom Margins)

- min: `1.0`
- max: `4.0`
- step: `0.5`
- default: `1.0`

#### Custom Margins

- available as the last option in the `Margin Method` dropdown
- per-side multipliers (`top,left,right,bottom`): min `1`, max `9`, step `1`
- selecting `Custom Margins` reveals the four side sliders
- actual custom margin = `sideMultiplier × baselineMultiple × gridUnit`
- `Margin Method` dropdown items preview live on rollover before commit

### IV. Grid & Rhythms

- Columns (`gridCols`): min `1`, max `13`, step `1`, default `3` (from `default_v001.json`)
- Rows (`gridRows`): min `1`, max `13`, step `1`, default `6` (from `default_v001.json`)
- Gutter multiple: min `1.0`, max `4.0`, step `0.5`, default `1.0`
- Rhythms (`rhythm`): `fibonacci`, `golden`, `fifth`, `fourth`, `repetitive` (default)
- `Rhythms` and non-repetitive direction dropdown items preview live on rollover before commit
- Non-repetitive rhythm rows:
  - enabled (`rhythmRowsEnabled`): `true|false` (default `true`)
  - direction (`rhythmRowsDirection`): `ltr` (`Left to right`) or `rtl` (`Right to left`) (default `ltr`)
- Non-repetitive rhythm cols:
  - enabled (`rhythmColsEnabled`): `true|false` (default `true`)
  - direction (`rhythmColsDirection`): `ttb` (`Top to Bottom`) or `btt` (`Bottom to top`) (default `ttb`)

### V. Typo

- `Font Hierarchy`: select typography scale preset (see Typography Scale Presets).
- Hierarchy table: shows current size and leading for `Display`, `Headline`, `Subhead`, `Body`, and `Caption` on the active baseline/scale.
- Swiss on the A4 12pt reference baseline:
  - `Display`: `64pt / 72pt`
  - `Headline`: `30pt / 36pt`
  - `Subhead`: `20pt / 24pt`
  - `Body`: `10pt / 12pt`
  - `Caption`: `7pt / 8pt`
- `Custom` is paragraph-level only; when first selected in the text editor it copies the paragraph's currently resolved size and leading into `Custom Size` and `Custom Leading`.
- `Base Font`: sets the default canvas rendering font for all paragraphs that do not have an explicit paragraph-level font override.
- Paragraph text supports dynamic document variables in raw text:
  - `<%lorem%>` fills the current paragraph frame with fitted lorem ipsum
  - `<%project_title%>` and alias `<%title%>`
  - `<%page%>` uses the current physical page number; on facing spreads the right side resolves to `left + 1`
  - `<%pages%>` uses the total physical page count across single pages and facing spreads
  - `<%date%>` rendered as local `YYYY-MM-DD`
  - `<%time%>` rendered as local `HH:mm`
- Preview freezes `date` and `time` to the current preview session; PDF/SVG/IDML freeze them to the export run so all pages share one consistent timestamp.
- In text edit mode, placeholders stay visible as raw tokens in the edited paragraph; outside edit mode they render as live values.
- `Font Hierarchy` and `Base Font` dropdown items preview live on rollover before commit.
- Font dropdown groups: `Sans-Serif`, `Serif`, `Poster` (same grouping in left panel and popup editor).
- Available fonts:
  - Sans-Serif: [Inter](https://fonts.google.com/specimen/Inter), [Work Sans](https://fonts.google.com/specimen/Work+Sans), [Jost](https://fonts.google.com/specimen/Jost), [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans), [Libre Franklin](https://fonts.google.com/specimen/Libre+Franklin)
  - Serif: [EB Garamond](https://fonts.google.com/specimen/EB+Garamond), [Libre Baskerville](https://fonts.google.com/specimen/Libre+Baskerville), [Bodoni Moda](https://fonts.google.com/specimen/Bodoni+Moda), [Besley](https://fonts.google.com/specimen/Besley)
  - Poster: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display)

### VI. Color Scheme

- Selects the global base scheme for image placeholders.
- `Background`: applies a page background color using `None` or any color from the selected scheme; this setting is stored per page.
- `Base Color Scheme` and `Background` dropdown items preview live on rollover before commit.
- Available schemes:
  - `Swiss Modern`: `#0b3536`, `#e5e7de`, `#0098d8`, `#f54123`
  - `Stone Cyan`: `#35342f`, `#e1e0dd`, `#f1f2f0`, `#37bbe4`
  - `Fresh Contrast`: `#fef9f7`, `#1aa9bc`, `#457c39`, `#ffeb00`
- The same selector appears in the image editor Color section and defaults to the current global selection.
- Image placeholders can also override swatch color and transparency directly in that Color section.

## Preview Header

### File Actions (icon buttons)

- `Presets` (layout-template icon): opens/closes the presets browser in the preview area (placed before Load)
- `Load` (folder icon): load project JSON
- `Save` (save icon): opens Save Project JSON popup
- `Export` (download icon): opens the export popup
- `Save` and `Export` stay disabled until a preview layout is available.
- Divider placement: between `Presets` and `Load`, and between `Export` and `Undo`
- `Esc` closes the presets browser without loading a preset

### Undo / Redo (icon buttons)

- `Undo` and `Redo` live in header
- keyboard:
  - `Cmd/Ctrl+Z` undo
  - `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` redo

### UI + Preview Controls (icon toggles)

- `Dark mode` (moon/sun icon): toggles dark UI for headers/panels/sidebars, preview shell background, and popup editor
- `Smart Text Zoom` (zoom icon): enabled by default; when active, entering text edit mode zooms to the active paragraph, ordinary text/style edits keep the current zoom, frame-geometry changes (`Rows`, `Baselines`, `Cols`) refit it, and leaving text edit restores full-page fit
- Order: dark mode icon appears to the left of Smart Text Zoom, which appears to the left of the display toggles

### Display Options (icon toggles)

- Baselines
- Margins
- Gutter/modules
- Typo
- Image placeholders
- Project panel toggle (layers icon)
- Divider placement: Smart Text Zoom and baselines are separated by a divider
- Divider placement: image placeholders and the Project toggle are separated by a divider
- Baselines, margins, gutter/modules, typo, and image placeholders stay disabled until a preview layout is available.

### Sidebar Panels (icon selectors)

- `Layers` (layers icon): opens the right sidebar Project panel
- `Information` (`i` icon): toggles rollover info/tooltips globally
- Shortcuts: `Cmd/Ctrl+Shift+P` toggles the Project sidebar, `Cmd/Ctrl+Shift+I` toggles Information
- `Help` (`?` icon): opens help/reference panel
- `Presets` (layout-template icon): opens preset thumbnails in the preview area
- Behavior: only one right sidebar panel can be open at a time; clicking the active Project or Help control closes that panel.
- Behavior: while presets are open, the left settings panel and header Project toggle are disabled.

### Project Panel

- `Name`: editable project title; also drives the default project JSON filename stem.
- Project header includes a small `i` toggle that shows or hides the document info text; when inactive no collapsed summary is shown.
- `Pages`: single-click to select, double-click to open or close inline layers, drag to reorder, rename/delete as needed, and `Add Page` always creates a new single page.
- Page creation is capped at `1000` pages per project.
- `Facing pages`: one-way control inside an opened page card, positioned above `Layers`. It converts the current page into a true spread. The preview becomes a zero-gap `Doppelseite`, inner/outer margins mirror automatically, and the effective column count doubles across the spread.
- `Page Up` selects the previous project page, `Page Down` selects the next one, and `Home` / `End` jump to the first or last page when multiple pages exist.
- After conversion, the spread remains one project page and edits inside one continuous spread coordinate space.
- Single-clicking a page card selects that page.
- Double-clicking a page card toggles its inline layer list and aligns opened pages to the top of the panel.
- Each page card also has an open/close toggle that reveals that page's layers inline.
- Newly added pages open automatically.
- Every page stores its own settings payload plus preview layout state.
- Project JSON can also carry an optional `tour` block for guided onboarding that steps through pages, layers, help, and editor targets.
- Expanded page cards show the mixed text/image stack for that page using current `layerOrder`.
- Text cards display hierarchy, font, and a short text preview rendered in the selected paragraph color and font.
- Image cards display `Image Placeholder` and a single color swatch.
- Hovering an active-page layer card mirrors the same active preview rollover/guides for that block.
- Dragging active-page layer cards changes z-index using a visible insertion marker between cards.
- Single-clicking an active-page layer card selects that layer; double-clicking opens or retargets its editor.
- Layer cards include a lock toggle to the left of delete. Locked layers stay visible in the stack but cannot be hovered, edited, or moved in preview until unlocked.
- Selecting a layer card also highlights the corresponding layer in preview; selecting in preview scrolls the matching card into view in the panel.
- Deleting from the panel removes the layer from the active page and saved project JSON.
- `Pages` section header single-clicks to collapse.
- Text and image editor section headers follow the same rule inside edit mode: single-click toggles one section, double-click opens or closes all sections.

### Left Footer (always visible)

- `Version` label: shows current app version string.
- `Feedback` link: opens the right sidebar feedback panel.
- `Imprint` link: opens the right sidebar imprint panel.
- `Feedback` and `Imprint` remain active even while the presets browser is open.

When `i` is active, header icons show rollover tooltips with a second line for keyboard shortcuts (including Undo/Redo).

### Header Keyboard Shortcuts

- `Cmd/Ctrl+O`: Load project JSON
- `Cmd/Ctrl+S`: Save project JSON
- `Cmd/Ctrl+Shift+E`: Open export popup
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`: Redo
- `Cmd/Ctrl+Shift+D`: Toggle dark mode
- `Cmd/Ctrl+Shift+B`: Toggle baselines
- `Cmd/Ctrl+Shift+M`: Toggle margins
- `Cmd/Ctrl+Shift+G`: Toggle modules/gutter
- `Cmd/Ctrl+Shift+T`: Toggle typography
- `Cmd/Ctrl+Shift+J`: Toggle image placeholders
- `Cmd/Ctrl+Shift+P`: Toggle project sidebar
- `Cmd/Ctrl+Shift+I`: Toggle information
- `Cmd/Ctrl+Shift+H`: Toggle help sidebar
- `Cmd/Ctrl+Shift+3`: Toggle imprint sidebar
- `Cmd/Ctrl+Shift+4`: Toggle presets browser
- `Page Up`: Select previous project page
- `Page Down`: Select next project page
- `Home`: Select first project page
- `End`: Select last project page
- `Esc`: Close presets browser without loading a preset

## Popups

### Save Project JSON popup

- Filename input seeded from the current project title
- Project Title input
- Description input
- Author input
- Confirm/Cancel

### Export popup

- Format buttons: `PDF`, `SVG`, `IDML`
- `Pages` range controls (`From`, `To`) appear for multipage projects
  - default selection is the full project page range
- All export formats use each page's stored document size
  - no paper-size override controls
  - no custom width override controls
- All export formats stay vector-based
- Use `SVG` or `IDML` when typography must be frozen as non-live geometry
- `IDML`:
  - exports the selected page range
  - keeps each page at its stored document size
  - freezes typography into outlined/non-live geometry
- Filename input
- `PDF` print presets:
  - `Digital Print` (default)
  - `Press Proof`
  - Bleed input (mm)
  - Registration-style marks toggle
- `SVG` does not expose PDF print settings
  - converts typography to exact glyph outlines, so exported text is not live-editable
- Confirm/Cancel
- `Esc` closes the popup when idle and cancels a running export at the next safe checkpoint

## Paper Size Sets

### DIN ratio family

- A6, A5, A4, A3, A2, A1, A0
- B6, B5, B4, B3, B2, B1, B0

### ANSI ratio family

- LETTER, LEGAL, ANSI_B, ANSI_C, ANSI_D, ANSI_E

### Single-size ratio families

- BALANCED_3_4
- PHOTO_2_3
- SCREEN_16_9
- SQUARE_1_1
- EDITORIAL_4_5
- WIDE_2_1

## Text Editing + Placement

- Double-click text block to open editor
- Double-click empty module creates a paragraph in the clicked module.
- Holding `1..6` while double-clicking empty module sets the new paragraph hierarchy: `1 Caption`, `2 Body`, `3 Subhead`, `4 Headline`, `5 Custom`, `6 Display`.
- Drag to move; paragraphs and image placeholders respect `Snap to Columns (X)` and use module-top Y snapping by default when `Snap to Baseline (Y)` is enabled
- With a selected unlocked layer and no active editor field, arrow keys nudge the layer through the same logic: snapped X moves by columns, snapped Y moves by module rows by default, `Shift` uses baseline rows, and unsnapped axes move in tenth-step logical increments with `Shift` as a 10x multiplier
- With `Snap to Columns (X)` off, free horizontal placement may overhang one column into either side margin.
- Hover shows style/span/alignment tooltip when `i` is active

Editor controls:
- left sidebar editor that replaces layout settings while edit mode is active
- text editor sections: `Paragraph`, `Typo`, `Placeholders`, `Info`
- image editor sections: `Geometry`, `Color`, `Info`
- while edit mode is active, preview hover stays visible on other unlocked existing blocks and clicking one retargets the already open editor
- locked layers are excluded from preview hover, drag, and editor retarget/open behavior until unlocked from the Project panel
- the text editor header uses the same user-facing layer label shown in the Project panel instead of the internal paragraph id
- Paragraph section:
  - rows
  - baselines
  - cols
  - horizontal alignment (`left`, `center`, `right`)
  - vertical alignment (`top`, `center`, `bottom`)
  - reflow (`On` / `Off`, available only when cols > 1)
  - hyphenation (`On` / `Off`)
  - `Snap to Columns (X)` (`On` / `Off`)
  - `Snap to Baseline (Y)` (`On` / `Off`)
  - rotation (`-180..180`, integer degrees)
- paragraph and placeholder height resolve as `rows + baselines`
- `rows` may be `0` when `baselines > 0`
- `Baselines` is a dropdown from `0` to the current document's `baselines per grid module`
- text `Rows`, `Baselines`, and `Cols` dropdown items preview live on rollover before commit
- increasing paragraph `Cols` preserves the current anchored column even when the wider frame intentionally overhangs the page edge
- vertical alignment offsets the line stack inside the selected paragraph frame in baseline increments
- Typo section:
  - font family
  - font cut
  - hierarchy (`Typo`)
  - Custom size / Custom leading when `Custom` is selected
  - kerning (`Optical` / `Metric`, default `Optical`)
  - tracking numeric input (`-120..+300`, `1/1000 em`)
  - color scheme selector
  - color swatches
- text `font family`, `font cut`, `hierarchy`, and `color scheme` dropdown items preview live on rollover before commit
- Placeholders section:
  - lists all available document-variable tokens
  - inserts the clicked token at the current caret or over the current selection
  - `<%lorem%>` fills the active paragraph frame according to its rows, baselines, columns, reflow, and hyphenation settings
- image Color section:
  - color scheme selector
  - color swatches
  - transparency
- image Geometry section:
  - rows
  - baselines
  - cols
  - `Snap to Columns (X)` (`On` / `Off`)
  - `Snap to Baseline (Y)` (`On` / `Off`)
  - rotation (`-180..180`, integer degrees)
- the image editor header shows `IMAGE` plus the current placeholder swatch color
- image `Rows`, `Baselines`, `Cols`, and `color scheme` dropdown items preview live on rollover before commit
- Info section: geometry, type/color summary, counts, and `Max/Line`
- section headers single-click to toggle one section; double-click opens or closes all editor sections
- newspaper reflow is available only with cols > 1
- reflow with cols > 1: newspaper flow across configured columns, exhausting the selected `rows + baselines` height before moving to the next column
- font cut uses the available family-specific weight/style list
- tracking applies letter-spacing, not horizontal scaling
- tracking is stored in `1/1000 em`
- selection-aware styling is supported for:
  - font family
  - font cut
  - hierarchy
  - color
  - tracking
- paragraph-wide defaults are rebased when the current selection covers the full text or no range is selected
- textarea preview mirrors font family, selected cut, paragraph alignment, and the current frame-relative text position
- live `Characters`, `Words`, and `Max/Line` counts in the Info section
- inline caret and selection are rendered from the current text geometry, not DOM line boxes
- inline caret blinks while the text editor is focused with a collapsed selection
- double-click inside inline text edit selects the clicked word
- triple-click inside inline text edit selects the containing sentence
- `Alt+A` and `Cmd/Ctrl+A` select the whole paragraph while inline text edit is active
- `Arrow Left` / `Arrow Right` move the caret by the editor's own selection model, and `Arrow Up` / `Arrow Down` / `Home` / `End` follow the rendered line geometry
- repeated spaces and blank lines are preserved in the source model
- soft-wrap boundary spaces stay in the source text but do not render as visible indent at the start of the next visual line

Font behavior:
- If a paragraph font is set to the current `Base Font`, it is stored as inherited (no explicit override entry).
- If a paragraph font differs from `Base Font`, it is stored as an explicit paragraph override.
- Changing `Base Font` re-renders the preview immediately for inherited paragraphs only.
- Preview + PDF parity depends on local strict font assets:
  - `public/fonts/google/<slug>/regular.ttf`
  - `public/fonts/google/<slug>/bold.ttf`
  - `public/fonts/google/<slug>/italic.ttf`
  - `public/fonts/google/<slug>/bolditalic.ttf`
- Asset sync routine:
  - `npm run fonts:sync` (reads `lib/config/fonts.ts` and rebuilds local Google font assets)

Syllable division behavior:
- Stored per paragraph in `blockSyllableDivision`.
- Default is `true` for `body` and `caption`.
- Default is `false` for other blocks unless explicitly enabled.
- Applied in both canvas preview and PDF export wrapping.

Drag behavior:
- Default drag moves a paragraph.
- `Alt/Option` + drag duplicates a paragraph and drops the copy.
- Paragraphs and image placeholders are stored as logical anchors: `{ column, row, baselineOffset }`.
- Paragraphs and image placeholders also persist independent `Snap to Columns (X)` and `Snap to Baseline (Y)` flags. When either axis snap is off, the corresponding `column` and/or `baselineOffset` value may remain fractional while the logical row anchor stays stable.
- With `Snap to Columns (X)` off, horizontal placement clamps symmetrically: one-column side-margin overhang remains available on both left and right.
- Paragraph and image-placeholder rotation is stored independently per layer.
- With `Snap to Baseline (Y)` on, default paragraph and image-placeholder drag snap Y to the nearest module top.
- Holding `Shift` (or `Ctrl`) during paragraph or image-placeholder drag temporarily snaps the Y position to the nearest baseline row.
- Image placeholders now use the same X/Y drag resolution model as paragraphs, while keeping their own span, height, color, opacity, and rotation controls.
- Hovering a paragraph reveals the edit affordance at the paragraph's exact top-left origin so very shallow frames remain reachable.

## Grid Change Reflow Logic

Structural changes do not auto-reposition existing paragraphs or image placeholders anymore.

Behavior:
1. Text paragraphs and image placeholders store logical anchors as `{ column, row, baselineOffset }`.
2. Increasing columns or rows preserves those anchors exactly.
3. Decreasing columns or rows is blocked when any paragraph or image placeholder would fall outside the proposed grid or span.
4. Invalid reductions keep the current grid unchanged.
5. Invalid reductions show a temporary preview warning instead of a blocking dialog.
6. Users must reposition or delete conflicting items manually before reducing the grid.

## Export Format Notes

- JSON: full UI + preview layout state.
- PDF: vector selected-range output with `Digital Print` and `Press Proof` presets, embedded output intents, grouped guide vectors, and stored page geometry per exported page.
- SVG: single-page trim-size vector output with typography converted to exact glyph outlines plus guides and placeholders, or a ZIP with one SVG per selected page for multi-page ranges; exported text is not live-editable.
- IDML: selected-range export with one InDesign page per app page and separate `Guides`, `Typography`, and `Placeholders` layers; exported text is frozen as geometry rather than live text.

## JSON UI Fields (current)

`canvasRatio`, `customRatioWidth`, `customRatioHeight`, `format`, `exportPaperSize`, `exportPrintPro`, `exportBleedMm`, `exportRegistrationMarks`, `orientation`, `rotation`, `marginMethod`, `gridCols`, `gridRows`, `baselineMultiple`, `gutterMultiple`, `rhythm`, `rhythmRowsEnabled`, `rhythmRowsDirection`, `rhythmColsEnabled`, `rhythmColsDirection`, `typographyScale`, `baseFont`, `imageColorScheme`, `canvasBackground`, `customBaseline`, `displayUnit`, `useCustomMargins`, `customMarginMultipliers`, `showBaselines`, `showModules`, `showMargins`, `showImagePlaceholders`, `showTypography`, `collapsed`

Notes:
- `exportPrintPro` is retained as the persisted legacy backing field for the PDF print-preset mode.

## JSON Preview Layout Fields (current)

`blockOrder`, `textContent`, `blockTextEdited`, `styleAssignments`, `blockFontFamilies`, `blockFontWeights`, `blockOpticalKerning`, `blockTrackingScales`, `blockTrackingRuns`, `blockTextFormatRuns`, `blockColumnSpans`, `blockRowSpans`, `blockHeightBaselines`, `blockTextAlignments`, `blockTextReflow`, `blockSyllableDivision`, `blockItalic`, `blockRotations`, `blockCustomSizes`, `blockCustomLeadings`, `blockTextColors`, `blockModulePositions`, `blockSnapToColumns`, `blockSnapToBaseline`, `lockedLayers`, `layerOrder`, `imageOrder`, `imageModulePositions`, `imageColumnSpans`, `imageRowSpans`, `imageHeightBaselines`, `imageColors`, `imageOpacities`

Notes:
- `blockFontFamilies` is an override map and may omit paragraphs inheriting `baseFont`.
- `blockModulePositions` and `imageModulePositions` are stored as logical anchors `{ column, row, baselineOffset }`; paragraph anchors may carry fractional `column` and/or `baselineOffset` values when X or Y snapping is disabled; legacy absolute `{ col, row }` values are normalized on load.
- `blockSnapToColumns` and `blockSnapToBaseline` store the paragraph-level X/Y snap state. Omitted values default to `true`.
- `lockedLayers` stores per-layer lock state. Omitted entries are unlocked.
- `blockRowSpans` / `imageRowSpans` store the module-row component of block height, while `blockHeightBaselines` / `imageHeightBaselines` store the additional baseline component.
