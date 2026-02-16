# Swiss Grid Generator

A toolkit for building typographic grid systems inspired by Josef Muller-Brockmann's *Grid Systems in Graphic Design*.

**Live preview:** [https://preview.swissgridgenerator.com/](https://preview.swissgridgenerator.com/)

## Overview

Swiss Grid Generator is a Next.js app for ratio-first grid construction, baseline-aligned typography, interactive preview editing, and layout export.

## Screenshots

### Web Application
![Web App Screenshot 001](swiss-grid-generator-app-screenshot_001.png?001)

![Web App Screenshot 002](swiss-grid-generator-app-screenshot_002.png?001)

![Web App Screenshot 003](swiss-grid-generator-app-screenshot_003.png?001)

### PDF Export
![PDF Screenshot 001](swiss-grid-generator-pdfexport-screenshot_001.png?001)

## Features

- Ratio-first canvas workflow (`DIN`, `ANSI`, `Balanced`, `Photo`, `Screen`, `Square`, `Editorial`, `Wide Impact`)
- Orientation + preview rotation controls
- Grid controls: columns/rows (`1..13`) and gutter multiple (`0.5..4.0`)
- Margin methods:
  - Progressive (`1:2:2:3`)
  - Van de Graaf (`2:3:4:6`)
  - Baseline (`1:1:1:1`)
- Custom margins with per-side multipliers
- 5-level baseline-aligned typography with scale presets:
  - Swiss, Golden Ratio, Fibonacci, Perfect Fourth, Perfect Fifth
- Interactive preview:
  - drag-and-snap text blocks
  - `Shift` + drag duplicates a text block
  - `Ctrl` + drag snaps dropped paragraph rows to nearest baseline
  - double-click popup editor
  - hover info tooltips
  - per-paragraph font selection
  - per-paragraph italic toggle
  - live character + word count in editor footer
  - per-block `cols` and `rows`
  - per-block rotation input (`-80..80`)
  - per-block reflow toggle (newspaper-style column flow)
  - per-block syllable-division toggle (`Hy`)
  - optical margin alignment (hanging punctuation)
- Typography controls:
  - `Font Hierarchy` preset selector (Swiss/Golden/Fibonacci/Fourth/Fifth)
  - `Base Font` selector in `V. Typo` grouped as `Sans-Serif`, `Serif`, `Poster`
  - available base fonts:
    - Sans-Serif: `Inter`, `Work Sans`, `Nunito Sans`, `IBM Plex Sans`, `Libre Franklin`
    - Serif: `EB Garamond`, `Libre Baskerville`, `Bodoni Moda`, `Besley`
    - Poster: `Playfair Display`
  - base font applies to paragraphs without explicit per-paragraph font override
- Header icon actions:
  - Dark mode toggle
  - Presets/Examples (left of Load), Load JSON, Save JSON, Export PDF
  - Undo/Redo
  - Fullscreen preview toggle
  - Display toggles (baselines, margins, gutter/modules, typo)
  - Sidebar selectors: Settings, Help, Example layouts
  - Sidebar selectors are mutually exclusive and clicking the active icon closes the panel
  - Divider separators are shown between Presets and Load, Export and Undo, Fullscreen and Baselines
  - Tooltips show action + keyboard shortcut on two lines (including Undo/Redo)
- Left panel footer:
  - always-visible `Version` label
  - `Imprint` link opens the right-side imprint panel
- Grid-change behavior:
  - pure column increase keeps layout in place (adds capacity to the right)
  - row and baseline-structure changes remap blocks to nearest module-top anchors
  - scored auto-reposition model resolves collisions deterministically
  - reflow planning runs in a dedicated Web Worker with safe in-thread fallback
  - batch auto-fit planning runs in a dedicated Web Worker with safe in-thread fallback
  - warning/apply/cancel flow is used for disruptive non-row structural moves
  - post-apply undo toast
  - warning flow suppressed during JSON layout load
- Export popups:
  - Save JSON filename prompt (custom modal)
  - Export PDF with filename + Print Pro controls
  - DIN/ANSI ratios: Units + Paper Size controls
  - Other ratios: Width (mm) control
  - Print Pro presets: Press Proof, Offset Final, Digital Print
  - Esc key closes export popup

## PDF Export

PDF export is vector-based via jsPDF primitives (lines/text), not canvas raster embedding.

Includes print-focused options:
- CMYK color pipeline for guides/text/marks
- Print Pro bleed + crop marks
- Registration-style crop marks (optional)
- Final-safe monochrome guides (optional)
- PDF metadata + viewer print preferences

## Installation

```bash
cd webapp
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

## Configuration Summary

See full reference in [`SETTINGS.md`](SETTINGS.md).

Highlights:
- Baseline options: `6,7,8,9,10,11,12,14,16,18,20,24,28,32,36,48,60,72`
- Startup defaults are loaded from `webapp/public/default_v001.json`
- Rotation: `-80..80`
- Grid: cols/rows `1..13`

## Ratio Families and Paper Sizes

### DIN
- A6, A5, A4, A3, A2, A1, A0
- B6, B5, B4, B3, B2, B1, B0

### ANSI
- LETTER, LEGAL, ANSI_B, ANSI_C, ANSI_D, ANSI_E

### Single-size custom ratios
- BALANCED_3_4 (3:4)
- PHOTO_2_3 (2:3)
- SCREEN_16_9 (16:9)
- SQUARE_1_1 (1:1)
- EDITORIAL_4_5 (4:5)
- WIDE_2_1 (2:1)

## Keyboard Shortcuts

All preview-header actions are keyboard accessible:
- `Cmd/Ctrl+O` Load JSON
- `Cmd/Ctrl+S` Save JSON
- `Cmd/Ctrl+Shift+E` Export PDF
- `Cmd/Ctrl+Z` Undo
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` Redo
- `Cmd/Ctrl+Shift+D` Toggle dark mode
- `Cmd/Ctrl+Shift+F` Toggle fullscreen preview
- `Cmd/Ctrl+Shift+B` Toggle baselines
- `Cmd/Ctrl+Shift+M` Toggle margins
- `Cmd/Ctrl+Shift+G` Toggle modules/gutter
- `Cmd/Ctrl+Shift+T` Toggle typography
- `Cmd/Ctrl+Shift+1` Toggle settings sidebar
- `Cmd/Ctrl+Shift+2` Toggle help sidebar
- `Cmd/Ctrl+Shift+3` Toggle imprint sidebar
- `Cmd/Ctrl+Shift+4` Toggle example layouts

Includes:
- settings changes (ratio, grid, margins, toggles, etc.)
- preview block edits/moves
- structural reflow apply/cancel flows

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Radix UI primitives
- jsPDF
- Lucide React

## Project Structure

```text
webapp/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── grid-preview.tsx
│   ├── dialogs/
│   │   ├── ExportPdfDialog.tsx
│   │   └── SaveJsonDialog.tsx
│   ├── settings/
│   │   ├── CanvasRatioPanel.tsx
│   │   ├── BaselineGridPanel.tsx
│   │   ├── MarginsPanel.tsx
│   │   ├── GutterPanel.tsx
│   │   ├── TypographyPanel.tsx
│   │   └── PanelCard.tsx
│   ├── sidebar/
│   │   ├── HelpPanel.tsx
│   │   ├── ImprintPanel.tsx
│   │   └── ExampleLayoutsPanel.tsx
│   └── ui/
│       ├── font-select.tsx
│       ├── header-icon-button.tsx
│       └── hover-tooltip.tsx
├── hooks/
│   ├── useSettingsHistory.ts
│   └── useExportActions.ts
├── lib/
│   ├── config/
│   │   ├── defaults.ts
│   │   ├── fonts.ts
│   │   └── ui-defaults.ts
│   ├── autofit-planner.ts
│   ├── grid-calculator.ts
│   ├── reflow-planner.ts
│   ├── preview-header-shortcuts.ts
│   ├── pdf-vector-export.ts
│   ├── units.ts
│   └── utils.ts
└── workers/
    ├── autoFit.worker.ts
    └── reflowPlanner.worker.ts
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Next lint command |
| `npm run test:roundtrip` | Verify font-related JSON save/load roundtrip rules |
| `npm run test:grid` | Validate grid calculator invariants, edge cases, and input guard rails |
| `npm run test:reflow` | Validate reflow planner determinism + worker request/response contract rules |
| `npm run test:perf` | Performance smoke tests for `generateSwissGrid` and `computeReflowPlan` |
| `npm test` | Run all test suites (`roundtrip`, `grid`, `reflow`, `perf`) |

## Changelog (Recent Behavior Updates)

- Added per-paragraph editor controls for `cols`, `rows`, and `reflow`.
- Added per-paragraph italic toggle and rotation input (`-80..80`).
- Added dark mode for control panels/headers/sidebars, preview shell background, and editor popup.
- Added fullscreen preview toggle.
- Added shift-drag duplication for preview paragraphs.
- Added ctrl-drag baseline-row snapping for paragraph placement.
- Added grouped font selectors (`Sans-Serif`, `Serif`, `Poster`) via shared component.
- Added live character and word counts to the text editor footer.
- Added complete keyboard coverage for preview-header actions and surfaced shortcut hints in icon tooltips.
- Refactored UI primitives: shared `HeaderIconButton`, `HoverTooltip`, `PanelCard`, and centralized `preview-header-shortcuts`.
- Added optical margin alignment (hanging punctuation) in preview and PDF export.
- Reflow mode now supports newspaper-style multi-column flow constrained by selected row span.
- Added base-font control in `V. Typo` with per-paragraph font override inheritance.
- Added paragraph editor rollover tooltips and structured 3-row header layout.
- Added per-paragraph syllable-division toggle with defaults enabled for `body` and `caption`.
- Drag-and-drop and structural repositioning now use module-top row anchors.
- Grid structural changes now use deterministic scored auto-repositioning.
- Pure column increases keep existing layout positions (capacity is added to the right).
- Row-structure changes remap rows by module index before repositioning.
- Added runtime guard rails in `generateSwissGrid()` for invalid settings (invalid grid dimensions, non-positive baseline/multiples, invalid custom margins).
- Added deterministic planner/worker contract tests and performance smoke tests to prevent UX regressions.

## Reference

Josef Muller-Brockmann, *Grid Systems in Graphic Design*.

## License

MIT
