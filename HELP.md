# HELP

Comprehensive user reference for the in-app Help sidebar.

## Index

- [Quick Start](#quick-start)
- [Canvas and Grid](#canvas-and-grid)
- [Typography and Fonts](#typography-and-fonts)
- [Text Editor Popup](#text-editor-popup)
- [Image Editor Popup](#image-editor-popup)
- [Drag and Placement](#drag-and-placement)
- [History and Reflow](#history-and-reflow)
- [Header and Sidebars](#header-and-sidebars)
- [Save and Load JSON](#save-and-load-json)
- [Export PDF](#export-pdf)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Troubleshooting](#troubleshooting)
- [Grid Theory Notes](#grid-theory-notes)

## Quick Start

- Pick a ratio in `I. Canvas Ratio` and set orientation/rotation.
- Set baseline in `II. Baseline Grid`; all vertical rhythm depends on it.
- Choose margin method in `III. Margins` or enable `Custom Margins`.
- Set columns/rows, gutter, and rhythm in `IV. Grid & Rhythms`.
- Set type hierarchy and base font in `V. Typo`.
- Set default image placeholder palette and optional page background in `VI. Color Scheme`.
- Use display toggles in the header to inspect baselines, margins, modules, and type.

## Canvas and Grid

- Grid range is `1..13` for both columns and rows.
- Gutter multiple range is `1.0..4.0` in `0.5` steps.
- `Rhythms` options: `Fibonacci`, `Golden Ratio`, `Perfect Fifth`, `Perfect Fourth`, `Repetitive` (default).
- For non-repetitive rhythms, rows: on/off plus direction `Left to right` or `Right to left` (default: on + `Left to right`).
- For non-repetitive rhythms, cols: on/off plus direction `Top to Bottom` or `Bottom to top` (default: on + `Top to Bottom`).
- Margin methods: Progressive (`1:2:2:3`), Van de Graaf (`2:3:4:6`), Baseline (`1:1:1:1`).
- Top/bottom margins snap to baseline grid units.
- Custom margins are entered as baseline multiples per side.
- Grid/module geometry is always recomputed from current page, margins, baseline, and gutter.

## Typography and Fonts

- Typography scales: Swiss, Golden Ratio, Perfect Fourth, Perfect Fifth, Fibonacci.
- `Base Font` is inherited by blocks that do not store explicit font overrides.
- Font groups: `Sans-Serif`, `Serif`, `Poster`.
- Style defaults define base weight and optional default italic per style.
- Manual bold/italic in editor can override style defaults per paragraph.
- `VI. Color Scheme` offers `Swiss Modern`, `Stone Cyan`, and `Fresh Contrast`, plus a `Background` dropdown with `None` or any color from the active scheme.

## Text Editor Popup

- Open editor by double-clicking a block; double-click empty area creates a paragraph block.
- Layout uses a left icon rail with contextual submenus: Geometry, Type, Color, and Info.
- Geometry submenu: row span, column span, paragraph rotation (`-180..180`).
- Type submenu: style hierarchy, font family, and FX size/leading when `FX` is selected.
- Color submenu: scheme selector and swatches.
- Info submenu includes style/font/geometry/color plus character and word counts.
- Quick actions on the rail: bold/italic, align left/right, newspaper reflow, syllable division, and delete.
- Newspaper reflow is available only when paragraph columns are `2+`.
- Reflow with `col > 1`: newspaper flow across configured columns (col 1 top-to-bottom, then col 2, etc.).
- Textarea preview mirrors current paragraph style controls: font family, bold/italic, and left/right alignment.
- `Esc` or click outside closes without saving; `Cmd/Ctrl+Enter` saves.

## Image Editor Popup

- Open by double-clicking an image placeholder or by `Shift` + double-click on an empty module.
- Controls: color scheme selector, row span, column span, and color swatches.
- Save applies changes; delete removes the placeholder.
- `Esc` or click outside closes without saving.

## Drag and Placement

- Drag moves a block snapped to module anchors.
- `Alt/Option` + drag duplicates a block and drops the copy.
- `Shift` + double-click on an empty module creates an image placeholder and opens its editor (`Ctrl` fallback).
- `Shift` + drag snaps to baseline rows and baseline columns (instead of module-row anchors, `Ctrl` fallback).
- `Shift` + drag enables overset placement for “angeschnitten” layouts (left/right/top/bottom, `Ctrl` fallback).
- Standard drag stays within module-fit bounds; baseline drag uses extended overset bounds.

## History and Reflow

- Undo/redo includes settings changes and block edits/placement changes.
- Some structural grid changes trigger auto-reflow suggestions.
- Disruptive reflow opens an apply/cancel confirmation layer.
- Applied reflow shows a toast with one-click Undo.
- JSON layout loading suppresses disruptive reflow prompts.

## Header and Sidebars

- Header actions include Presets, Load, Save, Export, Undo/Redo, dark mode, and display toggles.
- Display toggles include baselines, margins, modules, image placeholders, and typography.
- The right-side trio is ordered as `i` (rollover info), `?` (help), and settings.
- `i` toggles rollover info/tooltips globally across the app.
- `?` opens/closes help; settings opens/closes the right settings panel.
- Footer `Imprint` link toggles imprint sidebar.
- Right-side content panels include close icons in their header rows.
- Only one right-side panel is open at a time.

## Save and Load JSON

- Save JSON stores UI settings and full preview layout state.
- Load JSON restores both settings and layout where valid.
- Unknown font overrides are dropped during load normalization.
- Overrides equal to inherited defaults are normalized away.
- Invalid/out-of-range spans/rows/positions are clamped safely.

## Export PDF

- Export is vector-based (not raster screenshot export).
- PDF typography uses embedded selected fonts (where available) to keep line-wrap parity with preview.
- DIN/ANSI ratios expose paper-size selection; other ratios use width-based sizing.
- Print Pro options include bleed, registration-style crop marks, and final-safe guides.
- Export applies current rotation, guides visibility toggles, and text styling.

## Keyboard Shortcuts

- `Cmd/Ctrl+O`: Load JSON
- `Cmd/Ctrl+S`: Save JSON
- `Cmd/Ctrl+Shift+E`: Export PDF
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y`: Redo
- `Cmd/Ctrl+Shift+D`: Toggle dark mode
- `Cmd/Ctrl+Shift+B`: Toggle baselines
- `Cmd/Ctrl+Shift+M`: Toggle margins
- `Cmd/Ctrl+Shift+G`: Toggle modules and gutter
- `Cmd/Ctrl+Shift+T`: Toggle typography
- `Cmd/Ctrl+Shift+1`: Toggle settings sidebar
- `Cmd/Ctrl+Shift+2`: Toggle help sidebar
- `Cmd/Ctrl+Shift+3`: Toggle imprint sidebar
- `Cmd/Ctrl+Shift+4`: Open presets browser

## Troubleshooting

- If blocks disappear, check display toggles and whether text content is empty.
- If paragraph flow looks clipped, increase row span or disable reflow for that block.
- If layout jumps after large grid changes, this is expected from structural reflow remapping.
- If custom margins seem odd, verify baseline value and side multipliers first.
- If hover tooltips or rollover hints are missing, enable the header `i` toggle.
- If keyboard shortcuts do not trigger, focus outside active text inputs.

## Grid Theory Notes

- Baseline alignment: leading is an integer multiple of baseline.
- Margins: use proportional baseline-unit systems to balance page weight.
- Modules: define consistent content rhythm and repeatable placement anchors.
- Typographic hierarchy: scale presets keep proportion while preserving baseline rhythm.

Reference: Josef Müller-Brockmann, *Grid Systems in Graphic Design* (1981)
