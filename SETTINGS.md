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

- `portrait` (default)
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

- Columns (`gridCols`): min `1`, max `13`, step `1`, default `4`
- Rows (`gridRows`): min `1`, max `13`, step `1`, default `9`
- Gutter multiple: min `0.5`, max `4.0`, step `0.5`, default `1.0`

### V. Typo

- Select typography scale preset (see Typography Scale Presets).

## Preview Header

### File Actions (icon buttons)

- `Load` (folder icon): load layout JSON
- `Save` (save icon): opens Save JSON popup
- `Export PDF` (download icon): opens Export PDF popup

### Undo / Redo (icon buttons)

- `Undo` and `Redo` live in header
- keyboard:
  - `Cmd/Ctrl+Z` undo
  - `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` redo

### Display Options (icon toggles)

- Baselines
- Margins
- Gutter/modules
- Typo

All header icons use styled rollover help tooltips.

## Popups

### Save JSON popup

- Filename input
- Confirm/Cancel

### Export PDF popup

- Paper Size dropdown (filtered by selected ratio family)
- Units dropdown: `pt`, `mm`, `px`
- Width input in selected unit
- Height is derived automatically from aspect ratio
- Filename input
- Confirm/Cancel

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
- Drag to move (snaps to module columns + baseline rows)
- Hover shows style/span/alignment tooltip

Editor controls:
- style
- span (1..gridCols)
- align left/right
- Save
- Delete paragraph (custom blocks)

## Grid Change Reflow Logic

When structural grid changes would force relocation:

1. Keep row if possible; clamp col for span.
2. Resolve collisions row-major (same row then following rows).
3. If no module slot exists, fallback to baseline stack placement.
4. If `gridRows === 1`, all blocks use baseline stack placement.
5. Placement priority:
   - display, headline, subhead, body, caption, then custom paragraphs.

UX safeguards:
- Pre-apply warning dialog before rearrange.
- Cancel restores previous grid values.
- After apply: toast with one-click Undo.

## Export Format Notes

- JSON: full UI + preview layout state.
- PDF: current implementation places rendered preview image into a PDF page (not pure vector primitives yet).

## JSON UI Fields (current)

`canvasRatio`, `format`, `exportPaperSize`, `orientation`, `rotation`, `marginMethod`, `gridCols`, `gridRows`, `baselineMultiple`, `gutterMultiple`, `typographyScale`, `customBaseline`, `displayUnit`, `useCustomMargins`, `customMarginMultipliers`, `showBaselines`, `showModules`, `showMargins`, `showTypography`, `collapsed`
