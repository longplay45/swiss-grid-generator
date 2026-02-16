# Swiss Grid Generator - Calculations

This document describes the mathematical calculations used in the Swiss Grid Generator, based on Josef Müller-Brockmann's *Grid Systems in Graphic Design* (1981).

Core grid formulas reference `webapp/lib/grid-calculator.ts`; preview reflow/autofit planning formulas are implemented in `webapp/lib/reflow-planner.ts` and `webapp/lib/autofit-planner.ts`.

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

Bypasses the method selection. Each side is set independently as an integer multiplier of the grid unit:

```
margin_[side] = multiplier_[side] × gridUnit
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
netHAligned = gridRows × modH + (gridRows - 1) × gridMarginVertical
```

This value is used as `contentArea.height` in the output. The bottom margin remains the baseline-snapped value from the initial calculation.

---

## Gutters

Gutters are the spacing between modules. They scale by the gutter baseline multiple slider.

```
gridMarginHorizontal = gridUnit × gutterMultiple
gridMarginVertical   = gridUnit × gutterMultiple
```

Where `gutterMultiple` defaults to 1.0 (range 0.5–4.0, step 0.5).

**Example with 12pt baseline:**

| Gutter Multiple | Gutter Size |
|-----------------|-------------|
| 0.5×            | 6pt         |
| 1.0× (default)  | 12pt        |
| 1.5×            | 18pt        |
| 2.0×            | 24pt        |

---

## Modules

Modules are the individual grid cells. Their dimensions are calculated to fill the content area.

### Module Width

```
netW = pageWidth - margin_left - margin_right
modW = (netW - (gridCols - 1) × gridMarginHorizontal) / gridCols
```

**Example:** A4 portrait with 24pt left/right margins, 4 columns, 12pt gutters:

```
netW = 595.276 - 24 - 24 = 547.276pt
modW = (547.276 - 3 × 12) / 4 = 127.819pt
```

### Module Height (Baseline-Aligned)

Module height must span an **integer number of baseline units**:

```
netH                 = pageHeight - margin_top - margin_bottom
totalVerticalUnits   = round(netH / gridUnit)
unitsPerCell         = totalVerticalUnits / gridRows
baselineUnitsPerCell = floor(unitsPerCell)

if baselineUnitsPerCell < 2:
    baselineUnitsPerCell = 2    # minimum 2 baseline units per cell

cellHeight = baselineUnitsPerCell × gridUnit
modH       = cellHeight - gridMarginVertical
```

**Example:** A4 portrait, 12pt baseline, 6 rows, margins 12pt top / 36pt bottom:

```
netH = 841.890 - 12 - 36 = 793.890pt
totalVerticalUnits = round(793.890 / 12) = 66
unitsPerCell = 66 / 6 = 11
baselineUnitsPerCell = 11
cellHeight = 11 × 12 = 132pt
modH = 132 - 12 = 120pt
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

The typography system uses **pure baseline multiples** for all leading values, ensuring perfect alignment to the baseline grid.

### Base System (Swiss, A4, 12pt baseline)

| Style    | Font Size | Leading | Baseline Multiple | Body Lines | Weight  |
|----------|-----------|---------|-------------------|------------|---------|
| Display  | 64pt      | 72pt    | 6×                | 6.0        | Bold    |
| Headline | 30pt      | 36pt    | 3×                | 3.0        | Bold    |
| Subhead  | 20pt      | 24pt    | 2×                | 2.0        | Regular |
| Body     | 10pt      | 12pt    | 1×                | 1.0        | Regular |
| Caption  | 7pt       | 12pt    | 1×                | 1.0        | Regular |

All styles use Left alignment.

### Font Hierarchy Methods

The hierarchy method selects the **size ratios** used for each style. All leading values remain pure baseline multiples.

Available methods:
- Swiss (Hand-tuned)
- Golden Ratio (φ)
- Fibonacci (8, 13, 21, 34, 55)
- Perfect Fourth (4:3)
- Perfect Fifth (3:2)

Formulas below are expressed as A4 reference sizes (pt) and converted to ratios by dividing by 12.

| Method | A4 Sizes (pt) (Caption → Display) |
|--------|---------------|
| Swiss (Hand-tuned) | 7, 10, 20, 30, 64 |
| Golden Ratio (φ = 1.618) | 10/φ, 10, 10φ, 10φ^2, 10φ^4 |
| Perfect Fourth (P4 = 4/3) | 10/P4, 10, 10P4^2, 10P4^3, 10P4^6 |
| Perfect Fifth (P5 = 3/2) | 10/P5, 10, 10P5, 10P5^2, 10P5^4 |
| Fibonacci | 8, 13, 21, 34, 55 |

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

Leading at any format is computed directly from the current baseline:

```
body_leading = gridUnit * 1
subhead_leading = gridUnit * 2
headline_leading = gridUnit * 3
display_leading = gridUnit * 6
```

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

Note: this affects only the rendered typography on the preview/export canvas; UI chrome fonts are unchanged.

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

## Canvas Preview Rotation

The preview applies a centered rotation transform before drawing all page elements:

```
ctx.translate(canvasWidth / 2, canvasHeight / 2)
ctx.rotate((rotation * Math.PI) / 180)
ctx.translate(-pageWidth / 2, -pageHeight / 2)
```

All modules, baselines, margins, and typography are drawn in the rotated coordinate space.

## Preview Placement + Reflow

Interactive placement is orchestrated in `webapp/components/grid-preview.tsx`, mirrored in PDF export (`webapp/lib/pdf-vector-export.ts`), and uses worker-backed planning (`webapp/workers/reflowPlanner.worker.ts`, `webapp/workers/autoFit.worker.ts`) with synchronous fallback to pure planner modules in `webapp/lib/`.

### Row Anchor Model

Rows are stored in baseline-row units but snapped/repositioned to module-top anchors:

```
moduleRowStep = (moduleHeight + verticalGutter) / gridUnit
moduleRowStart(i) = i * moduleRowStep
```

Drag-and-drop and structural reflow use nearest `moduleRowStart(i)` anchors.

Shift-duplicate behavior (`Shift` + drag) reuses the same snap math and anchor model; only the state mutation differs (new paragraph key is created instead of moving the original block).

### Per-Paragraph Span

Each paragraph has:
- `colSpan` (`1..gridCols`)
- `rowSpan` (`1..gridRows`)
- `reflow` (on/off)

### Reflow Modes

If `reflow = false`:
- text wraps over full selected span width

If `reflow = true`:
- newspaper flow by columns inside selected span
- width per text column = one module width
- lines per column constrained by selected row span height

```
moduleHeightForBlock = rowSpan * moduleHeight + (rowSpan - 1) * verticalGutter
maxLinesPerColumn = floor(moduleHeightForBlock / lineStep)
neededCols = ceil(totalWrappedLines / maxLinesPerColumn)
```

### Grid/Baseline Structural Changes

When horizontal fields (`gridRows`) or module row step change (e.g., baseline/gutter effects), existing rows remap by module index:

```
moduleIndex = round(oldRow / oldModuleRowStep)
newRow = moduleIndex * newModuleRowStep
```

Then the scored planner resolves collisions/out-of-bounds.

### Scored Reposition Planner

Placement candidates are scored deterministically with penalties for:
- movement from desired anchor
- overflow below content area
- positions outside current grid row structure
- non-module-row anchors
- reading-order violations

Lowest score wins; ties prefer top-most, then left-most.

---

## Reference

*Müller-Brockmann, Josef. "Grid Systems in Graphic Design." Arthur Niggli Ltd, Teufen, 1981.*

Key pages:
- pp. 84-87: Van de Graaf canon and classical page construction
- pp. 92-93: Progressive margin ratios (1:2:3)
- pp. 102-107: Module-based construction
- pp. 108-113: Baseline grid and typographic alignment
