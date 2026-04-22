# Swiss Grid Generator - Calculations

This document describes the mathematical calculations used in the Swiss Grid Generator, based on Josef Müller-Brockmann's *Grid Systems in Graphic Design* (1981).

Core grid formulas reference `webapp/lib/grid-calculator.ts`; preview reflow/autofit planning formulas are implemented in `webapp/lib/reflow-planner.ts` and `webapp/lib/autofit-planner.ts`.

Recent UI updates (header dividers/tooltips, dark-mode shell styling, shortcut coverage, inline page-layer navigation) do not change these mathematical formulas.
In the Project -> Pages -> inline Layers architecture, these calculations are evaluated independently per page.
Supported dropdown rollover previews also use these same formulas; they apply transient preview state to the page or editor, then restore the committed state when the menu closes without a selection.

## Table of Contents

1. [Scale Factor](#scale-factor)
2. [Baseline Grid](#baseline-grid)
3. [Margins](#margins)
4. [Gutters](#gutters)
5. [Modules](#modules)
6. [Typography](#typography)
7. [Unit Conversions](#unit-conversions)
8. [Decimal Precision](#decimal-precision)
9. [Canvas Preview Scale](#canvas-preview-scale)
10. [Preview Placement + Reflow](#preview-placement--reflow)
11. [Font Assignment in Preview](#font-assignment-in-preview)

---

## Scale Factor

All calculations are relative to A4 as the reference format.

```
scale_factor = min(format_width / A4_width, format_height / A4_height)
```

Where A4 = 595.276 × 841.890 pt.

| Format | Scale Factor |
|--------|-------------|
| A6     | 0.500       |
| A5     | 0.707       |
| A4     | 1.000       |
| A3     | 1.414       |
| A2     | 2.000       |
| A1     | 2.828       |
| A0     | 4.000       |

### Custom Ratio Dimensions

When the user selects `Custom Ratio`, the page dimensions are generated from the entered width:height pair while preserving A4 area. The ratio pair is normalized to a portrait base before orientation is applied.

```
targetArea = A4_width × A4_height
portraitRatio = min(widthUnit, heightUnit) / max(widthUnit, heightUnit)

customHeight = sqrt(targetArea / portraitRatio)
customWidth  = targetArea / customHeight
```

This keeps custom ratios aligned with the same baseline/scale logic as the built-in single-size families.

---

## Baseline Grid

The baseline grid is the foundation of the entire system. All vertical measurements align to this grid.

### Baseline Slider

The user selects a baseline value from a predefined set via a slider. Available options are dynamically filtered to only include values that fit at least 24 baseline lines in the current format and margin configuration.

Available options: `6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72` (pt)

Default: **12pt** (A4 reference).

```
gridUnit = customBaseline ?? 12.0
```

### Format Baseline Defaults (`FORMAT_BASELINES`)

The `FORMAT_BASELINES` table defines per-format reference defaults (used as the initial slider value when loading a preset). Values are derived from an A4 12pt reference:
- A-series uses sqrt(2) steps.
- B-series uses 2^(1/4) offsets between adjacent A sizes.

| Format | Baseline (pt) |
|--------|---------------:|
| A0 | 48.000 |
| A1 | 33.941 |
| A2 | 24.000 |
| A3 | 16.971 |
| A4 | 12.000 |
| A5 | 8.485 |
| A6 | 6.000 |
| B0 | 57.064 |
| B1 | 40.365 |
| B2 | 28.541 |
| B3 | 20.182 |
| B4 | 14.270 |
| B5 | 10.091 |
| B6 | 7.135 |
| LETTER | 12.000 |

### Landscape Orientation

Baseline value remains the same in landscape; only page dimensions swap.

---

## Margins

Margins are calculated as **baseline multiples** and then **snapped to the baseline grid**.

### Three Calculation Methods

#### Method 1: Progressive (1:2:2:3)

Swiss modern approach for single pages. Creates gentle visual weight shift downward.

```
margin_top    = gridUnit × 1.0 × baselineMultiple
margin_left   = gridUnit × 2.0 × baselineMultiple
margin_right  = gridUnit × 2.0 × baselineMultiple
margin_bottom = gridUnit × 3.0 × baselineMultiple
```

**Example with 12pt baseline, 1× multiple:**
- Top: 12pt, Left/Right: 24pt, Bottom: 36pt

**With 2× multiple:**
- Top: 24pt, Left/Right: 48pt, Bottom: 72pt

#### Method 2: Van de Graaf (2:3:4:6)

Asymmetric margins inspired by the Van de Graaf canon, adapted to baseline multiples.

```
margin_top    = gridUnit × 2.0 × baselineMultiple
margin_left   = gridUnit × 3.0 × baselineMultiple
margin_right  = gridUnit × 4.0 × baselineMultiple
margin_bottom = gridUnit × 6.0 × baselineMultiple
```

**Example with 12pt baseline, 1× multiple:**
- Top: 24pt, Left: 36pt, Right: 48pt, Bottom: 72pt

#### Method 3: Baseline (1:1:1:1)

Pure Müller-Brockmann approach: all margins equal.

```
margin = gridUnit × baselineMultiple  // All sides
```

**Example with 12pt baseline, 2× multiple:**
- All margins: 24pt

### Custom Margins

Bypasses the method selection. Each side is set independently as an integer multiplier, then scaled by the shared baseline multiple:

```
margin_[side] = multiplier_[side] × baselineMultiple × gridUnit
```

Multiplier range: 1–9 (integer steps).

### Baseline Snapping

After initial calculation, top and bottom margins are snapped to the nearest baseline grid line:

```
margin_top    = round(margin_top / gridUnit) × gridUnit
margin_bottom = round(margin_bottom / gridUnit) × gridUnit
```

Left and right margins are not snapped (they don't affect vertical baseline alignment).

### Content Area Height

After calculating module heights (which are baseline-aligned), the actual content area height is computed from the aligned modules:

```
netHAligned = sum(moduleHeights) + (gridRows - 1) × gridMarginVertical
```

This value is used as `contentArea.height` in the output. The bottom margin remains the baseline-snapped value from the initial calculation.

---

## Gutters

Gutters are the spacing between modules. They scale by the gutter baseline multiple slider.

```
gridMarginHorizontal = gridUnit × gutterMultiple
gridMarginVertical   = gridUnit × gutterMultiple
```

Where `gutterMultiple` defaults to 1.0 (range 1.0–4.0, step 0.5).

**Example with 12pt baseline:**

| Gutter Multiple | Gutter Size |
|-----------------|-------------|
| 1.0× (default)  | 12pt        |
| 1.5×            | 18pt        |
| 2.0×            | 24pt        |

### Grid Rhythm

Module distribution supports these rhythm modes:

- `repetitive` (default): equal-width/equal-height modules
- `fibonacci`: normalized Fibonacci sequence per axis
- `golden`: normalized geometric sequence with ratio φ (1.618...) per axis
- `fourth`: normalized geometric sequence with ratio 4:3 per axis
- `fifth`: normalized geometric sequence with ratio 3:2 per axis

For all non-repetitive rhythms, each axis can be controlled independently:

- rows axis (`widths`): on/off, direction `Left to right` (`ltr`) or `Right to left` (`rtl`)
- cols axis (`heights`): on/off, direction `Top to Bottom` (`ttb`) or `Bottom to top` (`btt`)

Defaults are rows on + `Left to right`, cols on + `Top to Bottom`.

---

## Modules

Modules are the individual grid cells. Their dimensions are calculated to fill the content area budget.

### Module Width

```
netW = pageWidth - margin_left - margin_right
moduleWidthBudget = netW - (gridCols - 1) × gridMarginHorizontal
```

For `repetitive` rhythm:

```
widths[i] = moduleWidthBudget / gridCols
```

For `fibonacci` rhythm:

```
fib = [1, 2, 3, 5, ...]
widths[i] = moduleWidthBudget × fib[i] / sum(fib)
```

If rows Fibonacci is disabled, widths fall back to equal distribution:

```
widths[i] = moduleWidthBudget / gridCols
```

If rows direction is `Right to left`, the width sequence is reversed.

For geometric rhythms, the sequence is:

```
seq[i] = ratio^i
widths[i] = moduleWidthBudget × seq[i] / sum(seq)
```

The scalar `module.width` value in output is the axis average:

```
module.width = average(widths)
```

### Module Height (Baseline-Aligned Budget + Rhythm Distribution)

First the vertical module budget is baseline-aligned:

```
netH                 = pageHeight - margin_top - margin_bottom
moduleHeightBudget   = netH - (gridRows - 1) × gridMarginVertical
moduleBaselineUnits  = floor(moduleHeightBudget / (gridRows × gridUnit))
modH                 = max(2, moduleBaselineUnits) × gridUnit
moduleHeightDistributionBudget = gridRows × modH
```

Then rhythm is applied:

- `repetitive`: equal heights
- non-repetitive rhythms (`fibonacci`, `golden`, `fourth`, `fifth`): normalized sequence proportions (or equal heights if cols rhythm is disabled)

If cols direction is `Bottom to top`, the height sequence is reversed.

The scalar `module.height` value in output is the axis average:

```
module.height = average(heights)
```

### Aspect Ratio

```
aspectRatio = modW / modH
```

### Runtime Guardrails

`generateSwissGrid()` now validates critical inputs before running layout math to prevent `NaN`/`Infinity` results and unstable preview behavior.

Validated constraints:
- `orientation` must be `portrait` or `landscape`
- `marginMethod` must be `1`, `2`, or `3`
- `gridCols` and `gridRows` must be integers `>= 1`
- `baseline` (if provided), `baselineMultiple`, and `gutterMultiple` must be finite and `> 0`
- `customMargins` values must be finite and `>= 0`

Computed-dimension checks:
- `netW > 0`
- `netH > 0`
- `modW > 0`
- `modH > 0`

If any constraint fails, the calculator throws an explicit error message.

---

## Typography

The typography system uses **baseline-derived leading values**. Most styles stay on pure baseline multiples; Swiss caption is the intentional `7pt / 8pt` exception on the A4 `12pt` reference grid.

### Base System (Swiss, A4, 12pt baseline)

| Style    | Font Size | Leading | Baseline Multiple | Body Lines | Weight  |
|----------|-----------|---------|-------------------|------------|---------|
| FX       | 96pt      | 96pt    | 8×                | 8.0        | Bold    |
| Display  | 64pt      | 72pt    | 6×                | 6.0        | Bold    |
| Headline | 30pt      | 36pt    | 3×                | 3.0        | Bold    |
| Subhead  | 20pt      | 24pt    | 2×                | 2.0        | Regular |
| Body     | 10pt      | 12pt    | 1×                | 1.0        | Regular |
| Caption  | 7pt       | 8pt     | 0.667×            | 1.0        | Regular Italic |

Default text alignment is left.
Default vertical text alignment is top.

### Font Hierarchy Methods

The hierarchy method selects the **size ratios** used for each style. All leading values remain pure baseline multiples.

Available methods:
- Swiss (Hand-tuned)
- Golden Ratio (φ)
- Fibonacci (8, 13, 21, 34, 55)
- Perfect Fourth (4:3)
- Perfect Fifth (3:2)

Formulas below are expressed as A4 reference sizes (pt) and converted to ratios by dividing by 12.

| Method | A4 Sizes (pt) (Caption → FX) |
|--------|---------------|
| Swiss (Hand-tuned) | 7, 10, 20, 30, 64, 96 |
| Golden Ratio (φ = 1.618) | 10/φ, 10, 10φ, 10φ^2, 10φ^4, 10φ^5 |
| Perfect Fourth (P4 = 4/3) | 10/P4, 10, 10P4^2, 10P4^3, 10P4^6, 10P4^7 |
| Perfect Fifth (P5 = 3/2) | 10/P5, 10, 10P5, 10P5^2, 10P5^4, 10P5^5 |
| Fibonacci | 8, 13, 21, 34, 55, 89 |

### Scaling to Other Formats

#### Scaling

Font sizes scale only by the baseline grid (no separate format factor):

```
scaledSize = gridUnit × sizeRatio
```

Leading is always an integer multiple of the baseline:

```
scaledLeading = gridUnit × leadingMult
baselineMultiplier = leadingMult  // constant per style
```

#### Example: A3 with 16.971pt Baseline (Swiss)

```
gridUnit = 16.971pt

Body:    size = 16.971 × (10/12) = 14.142pt, leading = 16.971 × 1 = 16.971pt  (1× baseline)
Subhead: size = 16.971 × (20/12) = 28.285pt, leading = 16.971 × 2 = 33.942pt  (2× baseline)
Display: size = 16.971 × (64/12) = 90.512pt, leading = 16.971 × 6 = 101.826pt (6× baseline)
```

### Leading Across All Formats

Leading at any format is computed from the current style multiplier:

```
caption_leading = gridUnit * (8 / 12)   // Swiss caption only
body_leading = gridUnit * 1
subhead_leading = gridUnit * 2
headline_leading = gridUnit * 3
display_leading = gridUnit * 6
fx_leading = gridUnit * 8
```

For non-Swiss scales, caption leading falls back to `1 × baseline`.

---

## Font Assignment in Preview

Typography size/leading is computed by the style system above. Font family selection for canvas rendering is resolved separately:

```
effectiveFont(block) = blockFontFamilies[block] ?? baseFont
```

Where:
- `baseFont` is selected in `V. Typo` and saved in `uiSettings.baseFont`.
- `blockFontFamilies` is stored in `previewLayout` as an override map.

### Inheritance Rule

When saving a paragraph edit:

```
if draftFont === baseFont:
    remove blockFontFamilies[block]   # paragraph inherits baseFont
else:
    blockFontFamilies[block] = draftFont
```

Changing `baseFont` therefore updates all inherited paragraphs immediately, while explicit per-paragraph overrides remain unchanged.

### Load Normalization Rule

On JSON load, paragraph font overrides are validated against known fonts and normalized:

```
if font is unknown: discard override
if override === baseFont: discard override (inherit)
```

This keeps inheritance stable across save/load and avoids persisting redundant overrides.
Known font values are defined centrally in `webapp/lib/config/fonts.ts`.

Note: this affects only the rendered typography on the preview/export canvas; UI chrome fonts are unchanged.

### Font Load + Metric Stability

Preview text measurement waits for active font faces to load before finalizing wrap metrics:
- `document.fonts.load(...)` is requested for active block font/style/size combinations.
- On completion, text-measure caches are cleared and typography is redrawn.

This prevents fallback-font measurements from producing stale wraps when changing to fonts like `Bodoni Moda`.

### PDF Font Embedding Parity

PDF export embeds selected Google font assets before layout/draw:
- `regular`, `bold`, `italic`, `bolditalic` are registered per family.
- If local files are missing, registry can fall back to Google Fonts repository sources.

This keeps preview/PDF wrap and anchor calculations aligned across font choices.

Export rendering note:
- All export targets remain vector-based.
- Use `SVG` or `IDML` when typography must be frozen as non-live geometry.
- `SVG` and `IDML` resolve typography to frozen outline geometry for downstream fidelity.
- `PDF` keeps vector text drawing aligned with preview metrics rather than forcing all text into outlines.

---

## Unit Conversions

All internal calculations use points (pt). Display conversions:

```
mm = pt × 0.352778        # 1pt = 0.352778mm (1mm = 2.835pt)
px = pt × (96 / 72)       # 1pt = 1.333px at 96dpi
```

---

## Decimal Precision

All output values are rounded to 3 decimal places to prevent floating-point drift:

```
rounded = round(value × 1000) / 1000
```

---

## Canvas Preview Scale

The preview uses fit scaling:

```
scaleX = (containerWidth - 40) / pageWidth
scaleY = (containerHeight - 40) / pageHeight
scale  = min(scaleX, scaleY)
```

All drawing coordinates are multiplied by `scale`.

When `Smart Text Zoom` is enabled (default), text edit mode temporarily replaces pure full-page fit with a paragraph-focused viewport:

```
focusScale = min(
  (containerWidth  * 0.75) / targetWidth,
  (containerHeight * 0.75) / targetHeight
)

scale = clamp(focusScale, fitScale, fitScale * 8)
```

The focus target is resolved in stable page space from the active paragraph frame. If rendered type clearly exceeds the allocated column width, the target widens by whole-module steps rather than chasing transient glyph-width changes, so the zoom view stays stable while editing.

## Canvas Preview Rotation

The preview applies a centered rotation transform before drawing all page elements:

```
ctx.translate(canvasWidth / 2, canvasHeight / 2)
ctx.rotate((rotation * Math.PI) / 180)
ctx.translate(-pageWidth / 2, -pageHeight / 2)
```

All modules, baselines, margins, and typography are drawn in the rotated coordinate space.

## Transient Dropdown Preview

Supported layout dropdowns preview hovered items by merging a temporary UI patch onto the current page settings and recomputing the same `buildGridResultFromUiSettings()` output used for committed state.

```
previewUi = {
  ...uiSettings,
  ...previewPatch
}

previewResult = buildGridResultFromUiSettings(previewUi)
```

Supported text/image editor dropdowns preview hovered geometry or type values from an opening snapshot of the current draft state:

```
snapshot = editorDraftState_onOpen
previewDraft = applyValue(hoveredOption, currentDraftState)
restore(snapshot) on close/pointer-leave when no option was committed
```

This changes when preview recalculation runs, not the underlying grid, typography, or placement formulas.

When an editor is already open, preview hit-testing and rollover remain active for other existing blocks; clicking one retargets the current editor to that block instead of tearing edit mode down first.

## Preview Placement + Reflow

Interactive placement is orchestrated in `webapp/components/grid-preview.tsx`, mirrored in PDF export (`webapp/lib/pdf-vector-export.ts`), and uses worker-backed planning (`webapp/workers/reflowPlanner.worker.ts`, `webapp/workers/autoFit.worker.ts`) with synchronous fallback to pure planner modules in `webapp/lib/`.

### Logical Grid Anchor Model

Text paragraphs and image placeholders are stored with logical grid coordinates:

```
position = {
  column,
  row,
  baselineOffset
}
```

Where:
- `column` is the logical column anchor. It is integral when `Snap to Columns (X)` is on and may be fractional when X snapping is off.
- `row` is the logical module row anchor index.
- `baselineOffset` is the baseline-row offset inside that logical row anchor. It is integral when `Snap to Baseline (Y)` is on and may be fractional when Y snapping is off.

Absolute baseline position resolves from the current row starts:

```
absoluteRow = rowStartBaselines[row] + baselineOffset
absoluteCol = column
```

This is the anchor model used for preview placement, export resolution, and save/load normalization.

Paragraphs and image placeholders also persist two independent snap flags:

```
snapToColumnsX: boolean
snapToBaselineY: boolean
```

The flags affect drag/editor placement resolution only. The underlying anchor model remains the same for preview, export, and save/load. Both layer types also persist an independent rotation angle around the visible frame's top-left origin.

With `Snap to Columns (X)` off, the horizontal clamp keeps the free-placement envelope symmetric, including the `span = 1` case:

```
minCol = -max(1, span - 1)
maxCol = gridCols
```

So a free-X layer may overhang one column into either side margin while still staying inside the page field.

Alt/Option-duplicate behavior (`Alt/Option` + drag) reuses the same anchor math; only the state mutation differs (new layer key is created instead of moving the original).

During paragraph or image-placeholder drag, a layer with `Snap to Baseline (Y)` enabled resolves Y to the nearest module-top row start by default while leaving X placement under the layer's current `Snap to Columns (X)` setting:

```
rawRow = rowStartBaselines[nearestRowIndex(pageY)]
```

Holding `Shift` (Ctrl fallback) temporarily switches the Y resolution to the nearest baseline row:

```
rawRow = round((pageY - baselineOriginTop) / baselineStep)
```

Image placeholders now use the same X/Y drag resolution model as paragraphs. Their width and height still resolve from image spans and `rows + baselines`, and rotation pivots around the placeholder frame's visible top-left origin.

### Per-Paragraph Span

Each paragraph has:
- `colSpan` (`1..gridCols`)
- `rowSpan` (`0..gridRows`)
- `heightBaselines` (`0..baselinesPerGridModule`)
- `reflow` (on/off)

Effective block height is the combined paragraph/image frame height:

```
blockHeight = rows + baselines
```

`rows = 0` is valid when `heightBaselines > 0`.

For text paragraphs, vertical alignment offsets the line stack inside that frame while preserving baseline rhythm:

```
freeBaselineRows = floor((blockHeightPx - occupiedTextHeightPx) / baselineStepPx)
verticalOffsetPx =
  top    -> 0
  center -> floor(freeBaselineRows / 2) × baselineStepPx
  bottom -> freeBaselineRows × baselineStepPx
```

### Reflow Modes

If `reflow = false`:
- text wraps over full selected span width

If `reflow = true`:
- newspaper flow by columns inside selected span
- width per text column = active module-column width at placement
- lines per column constrained by selected row span height

```
moduleHeightForBlock = resolveBlockHeight(rowStartIndex, rowSpan, heightBaselines)
maxLinesPerColumn = floor(moduleHeightForBlock / lineStep)
neededCols = ceil(totalWrappedLines / maxLinesPerColumn)
```

The same combined `rows + baselines` height is also used for image placeholders, preview guide lines, hover affordances, and export geometry.

### Grid Structural Changes

Grid changes no longer auto-reposition text paragraphs or image placeholders.

Current behavior:
- increasing columns or rows preserves the stored logical anchors
- decreasing columns or rows validates the proposed grid against every paragraph and image placeholder span
- if any item would fall outside the new grid, the reduction is refused and the current grid remains unchanged

This keeps placement stable and predictable across baseline, rhythm, and grid changes.

---

## Reference

*Müller-Brockmann, Josef. "Grid Systems in Graphic Design." Arthur Niggli Ltd, Teufen, 1981.*

Key pages:
- pp. 84-87: Van de Graaf canon and classical page construction
- pp. 92-93: Progressive margin ratios (1:2:3)
- pp. 102-107: Module-based construction
- pp. 108-113: Baseline grid and typographic alignment
