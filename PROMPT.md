You are assisting with swiss-grid-generator, a Next.js static-export web app
that produces typographic grid systems based on Josef Müller-Brockmann's
"Grid Systems in Graphic Design" (1981) / International Typographic Style.

Live: https://dev.lp45.net/swiss-grid-generator/
Codebase root: swiss-grid-generator/webapp/

## TECH STACK
Next.js 14 (App Router, static export), TypeScript, Tailwind CSS, jsPDF,
Canvas API, Web Workers (ESM). Tests: Node native test runner (ESM).

## KEY FILES
lib/grid-calculator.ts          — Core engine; generateSwissGrid(GridSettings) → GridResult
app/page.tsx                    — Root UI; all settings state, undo/redo, export dialogs
components/grid-preview.tsx     — Canvas preview; owns layout state (blocks, drag, editor)
lib/reflow-planner.ts           — Pure deterministic reflow scoring
lib/autofit-planner.ts          — Pure batch autofit planner
lib/pdf-vector-export.ts        — jsPDF vector export (CMYK, bleed, crop/reg marks)
lib/text-layout.ts              — Canonical word-wrap + syllable hyphenation
lib/optical-margin.ts           — Hanging punctuation offsets
lib/preview-header-shortcuts.ts — Canonical keyboard shortcut registry
workers/reflowPlanner.worker.ts — Async reflow (fallback: lib/reflow-planner.ts)
workers/autoFit.worker.ts       — Async autofit (fallback: lib/autofit-planner.ts)
hooks/useWorkerBridge.ts        — Generic worker request/response bridge
hooks/useSettingsHistory.ts     — Settings undo/redo (100-item stack)
hooks/usePreviewHistory.ts      — Layout undo/redo
lib/config/ui-defaults.ts       — DEFAULT_UI, format-ratio defaults
public/default_v001.json        — Default preset (schemaVersion 1)

## CORE TYPES

GridSettings → generateSwissGrid() → GridResult
  GridResult.grid.gridUnit     — Base unit in pt (12pt for A4)
  GridResult.grid.margins      — Baseline-snapped { top, bottom, left, right }
  GridResult.module            — { width, height, aspectRatio }
  GridResult.typography.styles — caption | body | subhead | headline | display

PreviewLayoutState              — blockOrder[], textContent, styleAssignments,
                                  blockColumnSpans, blockRowSpans, blockModulePositions,
                                  blockTextAlignments, blockTextReflow, blockFontFamilies,
                                  blockBold, blockItalic, blockRotations, blockSyllableDivision

JSON save format: { schemaVersion, gridResult, uiSettings, previewLayout }

## DESIGN INVARIANTS (never violate these)
1. All typography leading = integer × gridUnit
2. Module height ≥ 2 baseline units (Math.floor, min 2)
3. Margins snap to baseline: Math.round(margin / gridUnit) × gridUnit
4. Gutter = gridUnit × gutterMultiple
5. Font size = gridUnit × sizeRatio (scales proportionally with format)
6. All dimensions use Math.round(v * 1000) / 1000 (3-decimal precision)
7. Reflow planner is pure and deterministic
8. Text wrapping (lib/text-layout.ts) is canonical — identical in canvas, PDF, autofit
9. Undo is two-level: settings (page.tsx) cascades first, then layout (grid-preview.tsx)
10. Default block spans: display=full cols, headline=⌈cols/2⌉+1, caption=1, others=⌈cols/2⌉

## FORMATS
Paper families: DIN (A0–A6, B0–B6), ANSI (Letter, Legal, ANSI B–E),
Custom (BALANCED_3_4, PHOTO_2_3, SCREEN_16_9, SQUARE_1_1, EDITORIAL_4_5, WIDE_2_1).
A4 = 12pt reference baseline; adjacent sizes scale by √2. B-series: 2^(1/4) offset.

## MARGIN METHODS
1 Progressive  T:L:R:B = 1:2:2:3
2 Van de Graaf T:L:R:B = 2:3:4:6
3 Baseline     T:L:R:B = 1:1:1:1
All × baselineMultiple. Custom mode: per-side multipliers (1–9×).

## TYPOGRAPHY SCALES
swiss | golden | fourth | fifth | fibonacci
Each defines (sizeRatio, leadingMultiplier) pairs for 5 levels.
Leading is always integer multiples of gridUnit.

## CANVAS RENDERING
4-layer stack: guideCanvas (static) → textCanvas (full) → textCanvasDirty (incremental) → dragCanvas (overlay).
Guide colors: margins=#3b82f6 dashed, modules=#06b6d4 @0.7, baselines=#ec4899 @0.5.
PDF export uses CMYK equivalents.

## REFLOW SCORING (workers/reflowPlanner.worker.ts)
Column reposition cost:  6
Row reposition cost:     3
Overflow:             1000
Reading-order violation: 250 + 0.5×rank
Non-module-row:         80
Outside grid:          600
Pure column increases skip reflow. Column decreases trigger confirmation dialog.

## UNDO/REDO
Settings level (page.tsx):  settingsPast/settingsFuture, UiSettingsSnapshot, 100-item limit
Layout level (grid-preview.tsx): historyPast/historyFuture, BlockCollectionsState
Global Cmd+Z dispatches to settings first; falls through to layout via undoNonce/redoNonce.

## COMMANDS (run from webapp/)
npm run dev          — localhost:3000
npm run build        — static export → out/
npm run test:grid    — grid math + edge cases
npm run test:reflow  — reflow planner + worker contract
npm run test:perf    — performance smoke tests
npm test             — full suite

## DEPLOYMENT
python3 deploy.py --user i --key ~/.ssh/id_ed25519
(uploads webapp/out/ via SFTP to dev.lp45.net/swiss-grid-generator/)

## EXTENDING THE SYSTEM
New margin method:      add to MARGIN_CALCULATORS + MARGIN_VERTICAL_UNITS + Select in page.tsx
New paper format:       add to FORMATS_PT + FORMAT_BASELINES + CANVAS_RATIOS[].paperSizes
New typography scale:   add TypographyRatios to TYPOGRAPHY_SCALE_MAP + TYPOGRAPHY_SCALE_LABELS
New preview-header btn: register in lib/preview-header-shortcuts.ts; add to header group array

## DOMAIN KNOWLEDGE
Primary reference: assets/Mueller-Brockmann_Josef_Grid_Systems_in_Graphic_Design_...pdf
All grid math, margin proportions, and typography rules derive from this source.
