# Swiss Grid Generator - Calculations

This document describes the mathematical calculations used in the Swiss Grid Generator, based on Josef Müller-Brockmann's *Grid Systems in Graphic Design* (1981).

All formulas reference `swiss-grid-webapp/lib/grid-calculator.ts`.

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

### Auto Mode (Default)

When "Custom Baseline" is OFF, each format uses a format-specific baseline:

| Format | Baseline | Rationale |
|--------|----------|-----------|
| A6 | 9pt | Small formats need tighter spacing |
| A5 | 10pt | Portable booklet size |
| A4 | 12pt | Standard document base |
| A3 | 13pt | Mid-size posters |
| A2 | 14pt | Larger posters |
| A1 | 16pt | Large format displays |
| A0 | 18pt | Poster scale |

```
gridUnit = FORMAT_BASELINES[format]  // Auto mode
```

### Custom Mode

When "Custom Baseline" is ON, the user selects from predefined values. Available options are filtered to only include values that fit the current format and grid configuration.

```
gridUnit = customBaseline ?? FORMAT_BASELINES[format] ?? 12.0
```

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

### Bottom Margin Adjustment

After calculating module heights (which are baseline-aligned), the bottom margin is recalculated to consume remaining space:

```
netHAligned   = gridRows × modH + (gridRows - 1) × gridMarginVertical
margin_bottom = pageHeight - margin_top - netHAligned
```

This guarantees the grid fills the content area perfectly.

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

---

## Typography

The typography system uses **pure baseline multiples** for all leading values, ensuring perfect alignment to the baseline grid.

### Base System (A4, 12pt baseline)

| Style    | Font Size | Leading | Baseline Multiple | Body Lines | Weight  |
|----------|-----------|---------|-------------------|------------|---------|
| Display  | 64pt      | 72pt    | 6×                | 6.0        | Bold    |
| Headline | 30pt      | 36pt    | 3×                | 3.0        | Bold    |
| Subhead  | 20pt      | 24pt    | 2×                | 2.0        | Regular |
| Body     | 10pt      | 12pt    | 1×                | 1.0        | Regular |
| Caption  | 7pt       | 12pt    | 1×                | 1.0        | Regular |

All styles use Left alignment.

### Scaling to Other Formats

#### Baseline Ratio

```
baselineRatio = gridUnit / 12.0
```

#### Font Size Scaling

Font sizes scale by both the format scale factor and the baseline ratio:

```
scaledSize = a4Size × scaleFactor × baselineRatio
```

#### Leading Scaling

Leading scales only by the baseline ratio (not the format factor), preserving baseline alignment:

```
scaledLeading = a4Leading × baselineRatio
```

The baseline multiplier relationship is preserved across all formats:

```
baselineMultiplier = scaledLeading / gridUnit  // constant per style
```

#### Example: A3 with 13pt Baseline

```
scaleFactor   = 1.414
baselineRatio = 13.0 / 12.0 = 1.0833

Body:    size = 10 × 1.414 × 1.0833 = 15.318pt,  leading = 12 × 1.0833 = 13.0pt  (1× baseline)
Subhead: size = 20 × 1.414 × 1.0833 = 30.636pt,  leading = 24 × 1.0833 = 26.0pt  (2× baseline)
Display: size = 64 × 1.414 × 1.0833 = 98.034pt,  leading = 72 × 1.0833 = 78.0pt  (6× baseline)
```

### Leading Across All Formats

| Format | Baseline | Body (1×) | Subhead (2×) | Headline (3×) | Display (6×) |
|--------|----------|-----------|--------------|---------------|--------------|
| A6     | 9pt      | 9pt       | 18pt         | 27pt          | 54pt         |
| A5     | 10pt     | 10pt      | 20pt         | 30pt          | 60pt         |
| A4     | 12pt     | 12pt      | 24pt         | 36pt          | 72pt         |
| A3     | 13pt     | 13pt      | 26pt         | 39pt          | 78pt         |
| A2     | 14pt     | 14pt      | 28pt         | 42pt          | 84pt         |
| A1     | 16pt     | 16pt      | 32pt         | 48pt          | 96pt         |
| A0     | 18pt     | 18pt      | 36pt         | 54pt          | 108pt        |

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

The preview calculates a display scale from the container size:

```
scaleX = (containerWidth - 40) / pageWidth
scaleY = (containerHeight - 40) / pageHeight
```

- **Original mode:** `scale = min(scaleX, scaleY, 1.0)` — never exceeds 100%
- **Fit mode:** `scale = min(scaleX, scaleY)` — fills available space

All drawing coordinates are multiplied by `scale` for rendering.

---

## Reference

*Müller-Brockmann, Josef. "Grid Systems in Graphic Design." Arthur Niggli Ltd, Teufen, 1981.*

Key pages:
- pp. 84-87: Van de Graaf canon and classical page construction
- pp. 92-93: Progressive margin ratios (1:2:3)
- pp. 102-107: Module-based construction
- pp. 108-113: Baseline grid and typographic alignment
