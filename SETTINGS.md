# SETTINGS.md

Current, implementation-accurate reference for all user-facing options and defaults.

## Typography System

5-level hierarchy, baseline-aligned.

| Level | A4 Size | A4 Leading | Baseline Multiple | Weight |
|---|---:|---:|---:|---|
| `display` | 64pt | 72pt | 6x | Bold |
| `headline` | 30pt | 36pt | 3x | Bold |
| `subhead` | 20pt | 24pt | 2x | Regular |
| `body` | 10pt | 12pt | 1x | Regular |
| `caption` | 7pt | 8pt | 0.667x | Regular |

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

#### Margin method (when Custom Margins is off)

| ID | Label | Top | Left | Right | Bottom |
|---:|---|---:|---:|---:|---:|
| `1` | Progressive (1:2:2:3) | 1x | 2x | 2x | 3x |
| `2` | Van de Graaf (2:3:4:6) | 2x | 3x | 4x | 6x |
| `3` | Baseline (1:1:1:1) | 1x | 1x | 1x | 1x |

#### Baseline Multiple (Margins and Custom Margins)

- min: `1.0`
- max: `4.0`
- step: `0.5`
- default: `1.0`

#### Custom Margins

- toggle: on/off
- per-side multipliers (`top,left,right,bottom`): min `1`, max `9`, step `1`
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
- `Base Font`: sets the default canvas rendering font for all paragraphs that do not have an explicit paragraph-level font override.
- Font dropdown groups: `Sans-Serif`, `Serif`, `Poster` (same grouping in left panel and popup editor).
- Available fonts:
  - Sans-Serif: `Inter`, `Work Sans`, `Nunito Sans`, `IBM Plex Sans`, `Libre Franklin`
  - Serif: `EB Garamond`, `Libre Baskerville`, `Bodoni Moda`, `Besley`
  - Poster: `Playfair Display`

### VI. Color Scheme

- Selects the global base scheme for image placeholders.
- `Background`: applies a page background color using `None` or any color from the selected scheme.
- Available schemes:
  - `Swiss Modern`: `#0b3536`, `#e5e7de`, `#0098d8`, `#f54123`
  - `Stone Cyan`: `#35342f`, `#e1e0dd`, `#f1f2f0`, `#37bbe4`
  - `Fresh Contrast`: `#fef9f7`, `#1aa9bc`, `#457c39`, `#ffeb00`
- The same selector appears in the image editor and defaults to the current global selection.

## Preview Header

### File Actions (icon buttons)

- `Presets` (layout-template icon): opens/closes the presets browser in the preview area (placed before Load)
- `Load` (folder icon): load layout JSON
- `Save` (save icon): opens Save JSON popup
- `Export PDF` (download icon): opens Export PDF popup
- Divider placement: between `Presets` and `Load`, and between `Export PDF` and `Undo`
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
- Layers
- Divider placement: dark mode and baselines are separated by a divider
- Divider placement: typography and layers are separated by a divider

### Sidebar Panels (icon selectors)

- `Layers` (layers icon): opens the right sidebar layers panel
- `Rollover Info` (`i` icon): toggles rollover info/tooltips globally
- Shortcuts: `Cmd/Ctrl+Shift+5` toggles Layers, `Cmd/Ctrl+Shift+6` toggles Rollover Info
- `Help` (`?` icon): opens help/reference panel
- `Settings` (gear icon): opens right sidebar settings placeholder panel
- `Presets` (layout-template icon): opens preset thumbnails in the preview area
- Behavior: only one right sidebar panel can be open at a time; clicking the active layers/help/settings icon closes that panel.
- Behavior: while presets are open, the left settings panel and header layers toggle are disabled.
- Order of the right-side trio: `i`, `?`, `Settings`.

### Layers Panel

- Shows a mixed stack of text and image layers using current `layerOrder`.
- Text cards display hierarchy, font, and a short text preview rendered in the selected paragraph color and font.
- Image cards display `Image Placeholder` and a single color swatch.
- Hovering a layer card mirrors the same active preview rollover/guides for that block.
- Dragging cards changes z-index using a visible insertion marker between cards.
- Selecting a card also highlights the corresponding layer in preview; selecting in preview scrolls the matching card into view in the panel.
- Deleting from the panel removes the layer from the document model and saved JSON.

### Left Footer (always visible)

- `Version` label: shows current app version string.
- `Feedback` link: opens the right sidebar feedback panel.
- `Imprint` link: opens the right sidebar imprint panel.

When `i` is active, header icons show rollover tooltips with a second line for keyboard shortcuts (including Undo/Redo).

### Header Keyboard Shortcuts

- `Cmd/Ctrl+O`: Load JSON
- `Cmd/Ctrl+S`: Save JSON
- `Cmd/Ctrl+Shift+E`: Export PDF
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`: Redo
- `Cmd/Ctrl+Shift+D`: Toggle dark mode
- `Cmd/Ctrl+Shift+B`: Toggle baselines
- `Cmd/Ctrl+Shift+M`: Toggle margins
- `Cmd/Ctrl+Shift+G`: Toggle modules/gutter
- `Cmd/Ctrl+Shift+T`: Toggle typography
- `Cmd/Ctrl+Shift+5`: Toggle layers sidebar
- `Cmd/Ctrl+Shift+6`: Toggle rollover info
- `Cmd/Ctrl+Shift+1`: Toggle settings sidebar
- `Cmd/Ctrl+Shift+2`: Toggle help sidebar
- `Cmd/Ctrl+Shift+3`: Toggle imprint sidebar
- `Cmd/Ctrl+Shift+4`: Toggle presets browser
- `Esc`: Close presets browser without loading a preset

## Popups

### Save JSON popup

- Filename input
- Confirm/Cancel

### Export PDF popup

- DIN/ANSI ratios:
  - Units dropdown: `pt`, `mm`, `px`
  - Paper Size dropdown (filtered by ratio family)
- Non-DIN/ANSI ratios:
  - Width input in `mm`
- Height is derived automatically from aspect ratio
- Filename input
- Print Pro:
  - toggle on/off
  - presets: Press Proof, Offset Final, Digital Print
  - Bleed input (mm)
  - Registration-style crop marks toggle
  - Final-safe guide colors toggle
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
- Drag to move (snaps to module columns + nearest module-top row anchors)
- Hover shows style/span/alignment tooltip when `i` is active

Editor controls:
- left icon rail with contextual submenus: `Geometry`, `Type`, `Color`, `Info`
- Geometry submenu: rows, cols, rotation (`-180..180`, integer degrees)
- Type submenu:
  - row 1: font family, font cut
  - row 2: hierarchy, plus FX size/leading when `FX` is selected
  - row 3: kerning (`Optical on/off`, default `Optical on`) and tracking presets (default `Normal`)
- Color submenu: scheme selector and color swatches
- Info submenu: style/font/size/geometry/color plus `Characters` + `Words`
- rail quick actions: alignment submenu and delete
- alignment submenu: left, center, right, then newspaper reflow (`Re`) and syllable division (`Hy`)
- save is in the inline textarea toolbar; delete is in the rail
- newspaper reflow is available only with cols > 1
- reflow with cols > 1: newspaper flow across configured columns
- font family
- font cut uses the available family-specific weight/style list
- kerning default: `Optical on`
- tracking presets:
  - applies uniform letter-spacing, not horizontal scaling
  - stored in `1/1000 em`
  - `Ultra-condensed` = `-120`
  - `Extra-condensed` = `-90`
  - `Condensed` = `-60`
  - `Semi-condensed` = `-30`
  - `Normal` = `0`
  - `Semi-expanded` = `+30`
  - `Expanded` = `+60`
  - `Extra-expanded` = `+120`
  - `Ultra-expanded` = `+200`
- hierarchy
- cols (1..gridCols)
- rows (1..gridRows)
- textarea preview mirrors font family, selected cut, and left/right alignment
- live `Characters` + `Words` counts in `Info` submenu

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
- `Shift` (or `Ctrl`) + drag snaps to nearest baseline row/column at drop point and allows overset placement.

## Grid Change Reflow Logic

Structural changes use a deterministic scored reposition planner.

Behavior:
1. Pure column increase (`gridCols` up, same row structure): keep current block positions.
2. Row-structure changes (`gridRows` or effective module-row step changes): remap rows by module index and auto-apply reposition.
3. Candidate rows are module-top anchors; collisions are resolved with scored placement.
4. Priority order remains: display, headline, subhead, body, caption, then custom paragraphs.

Scoring uses weighted penalties for:
- movement distance
- overflow below content area
- outside-grid row anchors
- non-module-row anchors
- reading-order violations

UX:
- Warning/apply/cancel flow is used for disruptive non-row structural reflows.
- Cancel restores previous grid values.
- After apply: toast with one-click Undo.
- Reflow warning is suppressed during JSON layout loading.

## Export Format Notes

- JSON: full UI + preview layout state.
- PDF: vector output via jsPDF primitives with print-focused options (bleed/crop marks, CMYK guides/marks).

## JSON UI Fields (current)

`canvasRatio`, `format`, `exportPaperSize`, `exportPrintPro`, `exportBleedMm`, `exportRegistrationMarks`, `exportFinalSafeGuides`, `orientation`, `rotation`, `marginMethod`, `gridCols`, `gridRows`, `baselineMultiple`, `gutterMultiple`, `rhythm`, `rhythmRowsEnabled`, `rhythmRowsDirection`, `rhythmColsEnabled`, `rhythmColsDirection`, `typographyScale`, `baseFont`, `imageColorScheme`, `canvasBackground`, `customBaseline`, `displayUnit`, `useCustomMargins`, `customMarginMultipliers`, `showBaselines`, `showModules`, `showMargins`, `showImagePlaceholders`, `showTypography`, `collapsed`

## JSON Preview Layout Fields (current)

`blockOrder`, `textContent`, `blockTextEdited`, `styleAssignments`, `blockFontFamilies`, `blockColumnSpans`, `blockRowSpans`, `blockTextAlignments`, `blockTextReflow`, `blockSyllableDivision`, `blockItalic`, `blockRotations`, `blockModulePositions`

Notes:
- `blockFontFamilies` is an override map and may omit paragraphs inheriting `baseFont`.
