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
- Two numeric ratio-unit inputs: `Width` and `Height`
- Range per field: min `0.1`, max `100`, step `0.001`
- Default: `4 : 5`
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
- `Pages`: click to switch, drag to reorder, rename/delete as needed, and `Add Page` duplicates the active page.
- Clicking a page card selects that page, opens it, and aligns its header to the top of the panel.
- Clicking the active open page card closes it again.
- Each page card also has an open/close toggle that reveals that page's layers inline.
- Newly added pages open automatically.
- Every page stores its own settings payload plus preview layout state.
- Expanded page cards show the mixed text/image stack for that page using current `layerOrder`.
- Text cards display hierarchy, font, and a short text preview rendered in the selected paragraph color and font.
- Image cards display `Image Placeholder` and a single color swatch.
- Hovering an active-page layer card mirrors the same active preview rollover/guides for that block.
- Dragging active-page layer cards changes z-index using a visible insertion marker between cards.
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
- Esc closes popup

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
- Drag to move with grid snapping
- Hover shows style/span/alignment tooltip when `i` is active

Editor controls:
- left sidebar editor that replaces layout settings while edit mode is active
- text editor sections: `Paragraph`, `Typo`, `Info`
- image editor sections: `Geometry`, `Color`, `Info`
- while edit mode is active, preview hover stays visible on other existing blocks and clicking one retargets the already open editor
- the text editor header uses the same user-facing layer label shown in the Project panel instead of the internal paragraph id
- Paragraph section:
  - rows
  - baselines
  - cols
  - horizontal alignment (`left`, `center`, `right`)
  - vertical alignment (`top`, `center`, `bottom`)
  - reflow (`On` / `Off`, available only when cols > 1)
  - hyphenation (`On` / `Off`)
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
- image Color section:
  - color scheme selector
  - color swatches
  - transparency
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
- Paragraphs and image placeholders are stored as logical grid anchors: `{ column, row, baselineOffset }`.
- `Shift` (or `Ctrl`) + drag snaps to nearest baseline row/column at drop point and allows overset placement.
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

`blockOrder`, `textContent`, `blockTextEdited`, `styleAssignments`, `blockFontFamilies`, `blockFontWeights`, `blockOpticalKerning`, `blockTrackingScales`, `blockTrackingRuns`, `blockTextFormatRuns`, `blockColumnSpans`, `blockRowSpans`, `blockHeightBaselines`, `blockTextAlignments`, `blockTextReflow`, `blockSyllableDivision`, `blockItalic`, `blockRotations`, `blockCustomSizes`, `blockCustomLeadings`, `blockTextColors`, `blockModulePositions`, `layerOrder`, `imageOrder`, `imageModulePositions`, `imageColumnSpans`, `imageRowSpans`, `imageHeightBaselines`, `imageColors`, `imageOpacities`

Notes:
- `blockFontFamilies` is an override map and may omit paragraphs inheriting `baseFont`.
- `blockModulePositions` and `imageModulePositions` are stored as logical anchors `{ column, row, baselineOffset }`; legacy absolute `{ col, row }` values are normalized on load.
- `blockRowSpans` / `imageRowSpans` store the module-row component of block height, while `blockHeightBaselines` / `imageHeightBaselines` store the additional baseline component.
