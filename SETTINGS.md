# SETTINGS.md

Current, implementation-accurate reference for all user-facing options and defaults.

## Typography System

6-level hierarchy, baseline-aligned system. Swiss caption keeps its intentional `7pt / 8pt` exception.

| Level | A4 Size | A4 Leading | Baseline Multiple | Weight |
|---|---:|---:|---:|---|
| `fx` | 96pt | 96pt | 8x | Bold |
| `display` | 64pt | 72pt | 6x | Bold |
| `headline` | 30pt | 36pt | 3x | Bold |
| `subhead` | 20pt | 24pt | 2x | Regular |
| `body` | 10pt | 12pt | 1x | Regular |
| `caption` | 7pt | 8pt | 0.667x | Regular Italic |

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

### IV. Grid & Rhythms

- Columns (`gridCols`): min `1`, max `13`, step `1`, default `3` (from `default_v001.json`)
- Rows (`gridRows`): min `1`, max `13`, step `1`, default `6` (from `default_v001.json`)
- Gutter multiple: min `1.0`, max `4.0`, step `0.5`, default `1.0`
- Rhythms (`rhythm`): `fibonacci`, `golden`, `fifth`, `fourth`, `repetitive` (default)
- Non-repetitive rhythm rows:
  - enabled (`rhythmRowsEnabled`): `true|false` (default `true`)
  - direction (`rhythmRowsDirection`): `ltr` (`Left to right`) or `rtl` (`Right to left`) (default `ltr`)
- Non-repetitive rhythm cols:
  - enabled (`rhythmColsEnabled`): `true|false` (default `true`)
  - direction (`rhythmColsDirection`): `ttb` (`Top to Bottom`) or `btt` (`Bottom to top`) (default `ttb`)

### V. Typo

- `Font Hierarchy`: select typography scale preset (see Typography Scale Presets).
- Hierarchy table: shows current style, size, and leading for the active baseline/scale.
- Swiss on the A4 12pt reference baseline:
  - `FX`: `96pt / 96pt`
  - `Display`: `64pt / 72pt`
  - `Headline`: `30pt / 36pt`
  - `Subhead`: `20pt / 24pt`
  - `Body`: `10pt / 12pt`
  - `Caption`: `7pt / 8pt`
- `Base Font`: sets the default canvas rendering font for all paragraphs that do not have an explicit paragraph-level font override.
- Font dropdown groups: `Sans-Serif`, `Serif`, `Poster` (same grouping in left panel and popup editor).
- Available fonts:
  - Sans-Serif: `Inter`, `Work Sans`, `Jost`, `IBM Plex Sans`, `Libre Franklin`
  - Serif: `EB Garamond`, `Libre Baskerville`, `Bodoni Moda`, `Besley`
  - Poster: `Playfair Display`

### VI. Color Scheme

- Selects the global base scheme for image placeholders.
- `Background`: applies a page background color using `None` or any color from the selected scheme; this setting is stored per page.
- Available schemes:
  - `Swiss Modern`: `#0b3536`, `#e5e7de`, `#0098d8`, `#f54123`
  - `Stone Cyan`: `#35342f`, `#e1e0dd`, `#f1f2f0`, `#37bbe4`
  - `Fresh Contrast`: `#fef9f7`, `#1aa9bc`, `#457c39`, `#ffeb00`
- The same selector appears in the image editor geometry submenu and defaults to the current global selection.
- Image placeholders can also override swatch color and transparency directly in that geometry submenu.

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
- Order: dark mode icon appears to the left of the display toggles

### Display Options (icon toggles)

- Baselines
- Margins
- Gutter/modules
- Typo
- Image placeholders
- Project panel toggle (layers icon)
- Divider placement: dark mode and baselines are separated by a divider
- Divider placement: image placeholders and the Project toggle are separated by a divider
- Baselines, margins, gutter/modules, typo, and image placeholders stay disabled until a preview layout is available.

### Sidebar Panels (icon selectors)

- `Layers` (layers icon): opens the right sidebar Project panel
- `Information` (`i` icon): toggles rollover info/tooltips globally
- Shortcuts: `Cmd/Ctrl+Shift+P` toggles the Project sidebar, `Cmd/Ctrl+Shift+I` toggles Information
- `Help` (`?` icon): opens help/reference panel
- `Presets` (layout-template icon): opens preset thumbnails in the preview area
- Behavior: only one right sidebar panel can be open at a time; clicking the active project/help/settings icon closes that panel.
- Behavior: while presets are open, the left settings panel and header Project toggle are disabled.
- Order of the right-side trio: `i`, `?`, `Settings`.

### Project Panel

- `Name`: editable project title; also drives the default project JSON filename stem.
- `Pages`: click to switch, drag to reorder, rename/delete as needed, and `Add Page` duplicates the active page.
- Every page stores its own settings payload plus preview layout state.
- `Layers`: shows the mixed text/image stack for the active page using current `layerOrder`.
- Text cards display hierarchy, font, and a short text preview rendered in the selected paragraph color and font.
- Image cards display `Image Placeholder` and a single color swatch.
- Hovering a layer card mirrors the same active preview rollover/guides for that block.
- Dragging cards changes z-index using a visible insertion marker between cards.
- Selecting a card also highlights the corresponding layer in preview; selecting in preview scrolls the matching card into view in the panel.
- Deleting from the panel removes the layer from the active page and saved project JSON.
- `Pages` and `Layers` section headers single-click to collapse; double-click on either header toggles both together.

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
- `IDML`:
  - exports the selected page range
  - keeps each page at its stored document size
- Filename input
- `PDF` print presets:
  - `Digital Print` (default)
  - `Press Proof`
  - Bleed input (mm)
  - Registration-style marks toggle
- `SVG` does not expose PDF print settings
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
- left icon rail with contextual submenus: `Geometry`, `Type`, `Info`, plus `Delete`
- Geometry submenu:
  - rows
  - cols
  - alignment (`left`, `center`, `right`)
  - reflow (`On` / `Off`, available only when cols > 1)
  - hyphenation (`On` / `Off`)
  - rotation (`-180..180`, integer degrees)
- Type submenu:
  - font family
  - font cut
  - hierarchy (`Typo`)
  - FX size / FX leading when `FX` is selected
  - kerning (`Optical` / `Metric`, default `Optical`)
  - tracking numeric input (`-120..+300`, `1/1000 em`)
  - color scheme selector
  - color swatches
- Info submenu: geometry, type, counts, and `Max/Line`
- delete lives on the rail
- newspaper reflow is available only with cols > 1
- reflow with cols > 1: newspaper flow across configured columns, exhausting the selected row-span height before moving to the next column
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
- textarea preview mirrors font family, selected cut, and left/right alignment
- live `Characters`, `Words`, and `Max/Line` counts in `Info` submenu
- inline caret and selection are rendered from the current text geometry, not DOM line boxes
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
- SVG: single-page trim-size vector output with typography converted to exact glyph outlines plus guides and placeholders, or a ZIP with one SVG per selected page for multi-page ranges.
- IDML: selected-range export with one InDesign page per app page and separate `Guides`, `Typography`, and `Placeholders` layers.

## JSON UI Fields (current)

`canvasRatio`, `customRatioWidth`, `customRatioHeight`, `format`, `exportPaperSize`, `exportPrintPro`, `exportBleedMm`, `exportRegistrationMarks`, `orientation`, `rotation`, `marginMethod`, `gridCols`, `gridRows`, `baselineMultiple`, `gutterMultiple`, `rhythm`, `rhythmRowsEnabled`, `rhythmRowsDirection`, `rhythmColsEnabled`, `rhythmColsDirection`, `typographyScale`, `baseFont`, `imageColorScheme`, `canvasBackground`, `customBaseline`, `displayUnit`, `useCustomMargins`, `customMarginMultipliers`, `showBaselines`, `showModules`, `showMargins`, `showImagePlaceholders`, `showTypography`, `collapsed`

Notes:
- `exportPrintPro` is retained as the persisted legacy backing field for the PDF print-preset mode.

## JSON Preview Layout Fields (current)

`blockOrder`, `textContent`, `blockTextEdited`, `styleAssignments`, `blockFontFamilies`, `blockFontWeights`, `blockOpticalKerning`, `blockTrackingScales`, `blockTrackingRuns`, `blockTextFormatRuns`, `blockColumnSpans`, `blockRowSpans`, `blockTextAlignments`, `blockTextReflow`, `blockSyllableDivision`, `blockItalic`, `blockRotations`, `blockCustomSizes`, `blockCustomLeadings`, `blockTextColors`, `blockModulePositions`, `layerOrder`, `imageOrder`, `imageModulePositions`, `imageColumnSpans`, `imageRowSpans`, `imageColors`

Notes:
- `blockFontFamilies` is an override map and may omit paragraphs inheriting `baseFont`.
- `blockModulePositions` and `imageModulePositions` are stored as logical anchors `{ column, row, baselineOffset }`; legacy absolute `{ col, row }` values are normalized on load.
