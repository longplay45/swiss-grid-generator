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
| `caption` | 7pt | 12pt | 1x | Regular |

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

- min: `-80`
- max: `80`
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

#### Baseline Multiple (Margins)

- min: `0.5`
- max: `7.0`
- step: `0.5`
- default: `1.0`

#### Custom Margins

- toggle: on/off
- per-side multipliers (`top,left,right,bottom`): min `1`, max `9`, step `1`

### IV. Gutter

- Columns (`gridCols`): min `1`, max `13`, step `1`, default `3` (from `default_v001.json`)
- Rows (`gridRows`): min `1`, max `13`, step `1`, default `6` (from `default_v001.json`)
- Gutter multiple: min `0.5`, max `4.0`, step `0.5`, default `1.0`

### V. Typo

- `Font Hierarchy`: select typography scale preset (see Typography Scale Presets).
- `Base Font`: sets the default canvas rendering font for all paragraphs that do not have an explicit paragraph-level font override.
- Font dropdown groups: `Sans-Serif`, `Serif`, `Poster` (same grouping in left panel and popup editor).

## Preview Header

### File Actions (icon buttons)

- `Examples` (layout-template icon): opens/closes example preset panel (placed before Load)
- `Load` (folder icon): load layout JSON
- `Save` (save icon): opens Save JSON popup
- `Export PDF` (download icon): opens Export PDF popup
- Divider placement: between `Examples` and `Load`, and between `Export PDF` and `Undo`

### Undo / Redo (icon buttons)

- `Undo` and `Redo` live in header
- keyboard:
  - `Cmd/Ctrl+Z` undo
  - `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` redo

### UI + Preview Controls (icon toggles)

- `Dark mode` (moon/sun icon): toggles dark UI for headers/panels/sidebars, preview shell background, and popup editor
- `Fullscreen` (maximize/minimize icon): toggles fullscreen mode for the preview side
- Order: dark mode icon appears to the left of fullscreen

### Display Options (icon toggles)

- Baselines
- Margins
- Gutter/modules
- Typo
- Divider placement: fullscreen and baselines are separated by a divider

### Sidebar Panels (icon selectors)

- `Settings` (gear icon): opens right sidebar settings placeholder panel
- `Help` (help icon): opens help/reference panel
- `Example layouts` (layout-template icon): opens example preset thumbnails panel
- Behavior: only one of these panels can be open at a time; clicking the active icon closes the panel.

### Left Footer (always visible)

- `Version` label: shows current app version string.
- `Imprint` link: opens the right sidebar imprint panel.

All header icons use styled rollover help tooltips with a second line showing the keyboard shortcut (including Undo/Redo).

### Header Keyboard Shortcuts

- `Cmd/Ctrl+O`: Load JSON
- `Cmd/Ctrl+S`: Save JSON
- `Cmd/Ctrl+Shift+E`: Export PDF
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`: Redo
- `Cmd/Ctrl+Shift+D`: Toggle dark mode
- `Cmd/Ctrl+Shift+F`: Toggle fullscreen preview
- `Cmd/Ctrl+Shift+B`: Toggle baselines
- `Cmd/Ctrl+Shift+M`: Toggle margins
- `Cmd/Ctrl+Shift+G`: Toggle modules/gutter
- `Cmd/Ctrl+Shift+T`: Toggle typography
- `Cmd/Ctrl+Shift+1`: Toggle settings sidebar
- `Cmd/Ctrl+Shift+2`: Toggle help sidebar
- `Cmd/Ctrl+Shift+3`: Toggle imprint sidebar
- `Cmd/Ctrl+Shift+4`: Toggle example layouts

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
- Hover shows style/span/alignment tooltip

Editor controls:
- font family
- style
- cols (1..gridCols)
- rows (1..gridRows)
- rotation input (`-80..80`, integer degrees)
- reflow toggle (off = full-span wrap, on = newspaper columns)
- syllable division toggle (`Hy`)
- italic toggle
- align left/right
- Save
- Delete paragraph (custom blocks)
- live `Characters` + `Words` counts in footer

Font behavior:
- If a paragraph font is set to the current `Base Font`, it is stored as inherited (no explicit override entry).
- If a paragraph font differs from `Base Font`, it is stored as an explicit paragraph override.
- Changing `Base Font` re-renders the preview immediately for inherited paragraphs only.

Syllable division behavior:
- Stored per paragraph in `blockSyllableDivision`.
- Default is `true` for `body` and `caption`.
- Default is `false` for other blocks unless explicitly enabled.
- Applied in both canvas preview and PDF export wrapping.

Drag behavior:
- Default drag moves a paragraph.
- `Shift` + drag duplicates a paragraph and drops the copy at the snapped position.

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

`canvasRatio`, `format`, `exportPaperSize`, `exportPrintPro`, `exportBleedMm`, `exportRegistrationMarks`, `exportFinalSafeGuides`, `orientation`, `rotation`, `marginMethod`, `gridCols`, `gridRows`, `baselineMultiple`, `gutterMultiple`, `typographyScale`, `baseFont`, `customBaseline`, `displayUnit`, `useCustomMargins`, `customMarginMultipliers`, `showBaselines`, `showModules`, `showMargins`, `showTypography`, `collapsed`

## JSON Preview Layout Fields (current)

`blockOrder`, `textContent`, `blockTextEdited`, `styleAssignments`, `blockFontFamilies`, `blockColumnSpans`, `blockRowSpans`, `blockTextAlignments`, `blockTextReflow`, `blockSyllableDivision`, `blockItalic`, `blockRotations`, `blockModulePositions`

Notes:
- `blockFontFamilies` is an override map and may omit paragraphs inheriting `baseFont`.
