# HELP

Comprehensive user reference for the in-app Help sidebar.

## Index

- [Quick Start](#quick-start)
- [Canvas and Grid](#canvas-and-grid)
- [Typography and Fonts](#typography-and-fonts)
- [Text Editor Popup](#text-editor-popup)
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
- Set columns/rows and gutter in `IV. Gutter`.
- Set type hierarchy and base font in `V. Typo`.
- Use display toggles in the header to inspect baselines, margins, modules, and type.

## Canvas and Grid

- Grid range is `1..13` for both columns and rows.
- Gutter multiple range is `0.5..4.0` in `0.5` steps.
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

## Text Editor Popup

- Open editor by double-clicking a block; double-click empty area creates a paragraph block.
- Header layout is a 2-column, 3-row control grid.
- Left column rows:
  - Row 1: row span, column span, paragraph rotation (`-80..80`)
  - Row 2: style hierarchy, font family
  - Row 3: bold/italic, align left/right, reflow/syllable division
- Right action column rows: save, delete, help (`?`).
- Textarea preview mirrors current paragraph style controls: font family, bold/italic, and left/right alignment.
- Live counters show characters/words in the footer.
- `Esc` or click outside closes without saving; `Cmd/Ctrl+Enter` saves.

## Drag and Placement

- Drag moves a block snapped to module anchors.
- `Shift` + drag duplicates a block and drops the copy.
- `Ctrl` + drag snaps drop row to nearest baseline row.
- Block spans and positions are clamped to valid grid bounds.

## History and Reflow

- Undo/redo includes settings changes and block edits/placement changes.
- Some structural grid changes trigger auto-reflow suggestions.
- Disruptive reflow opens an apply/cancel confirmation layer.
- Applied reflow shows a toast with one-click Undo.
- JSON layout loading suppresses disruptive reflow prompts.

## Header and Sidebars

- Header actions include Presets, Load, Save, Export, Undo/Redo, dark mode, fullscreen, display toggles.
- Sidebar actions include Settings and Help; footer `Imprint` link toggles imprint sidebar.
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
- `Cmd/Ctrl+Shift+F`: Toggle fullscreen preview
- `Cmd/Ctrl+Shift+B`: Toggle baselines
- `Cmd/Ctrl+Shift+M`: Toggle margins
- `Cmd/Ctrl+Shift+G`: Toggle modules and gutter
- `Cmd/Ctrl+Shift+T`: Toggle typography
- `Cmd/Ctrl+Shift+1`: Toggle settings sidebar
- `Cmd/Ctrl+Shift+2`: Toggle help sidebar
- `Cmd/Ctrl+Shift+3`: Toggle imprint sidebar
- `Cmd/Ctrl+Shift+4`: Toggle example layouts

## Troubleshooting

- If blocks disappear, check display toggles and whether text content is empty.
- If paragraph flow looks clipped, increase row span or disable reflow for that block.
- If layout jumps after large grid changes, this is expected from structural reflow remapping.
- If custom margins seem odd, verify baseline value and side multipliers first.
- If keyboard shortcuts do not trigger, focus outside active text inputs.

## Grid Theory Notes

- Baseline alignment: leading is an integer multiple of baseline.
- Margins: use proportional baseline-unit systems to balance page weight.
- Modules: define consistent content rhythm and repeatable placement anchors.
- Typographic hierarchy: scale presets keep proportion while preserving baseline rhythm.

Reference: Josef Müller-Brockmann, *Grid Systems in Graphic Design* (1981)
