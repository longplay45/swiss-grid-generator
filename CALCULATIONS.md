# Swiss Grid Generator - Calculations

This document describes the mathematical calculations used in the Swiss Grid Generator, based on Josef Müller-Brockmann's *Grid Systems in Graphic Design* (1981).

## Table of Contents

1. [Baseline Grid](#baseline-grid)
2. [Margins](#margins)
3. [Gutters](#gutters)
4. [Modules](#modules)
5. [Typography](#typography)

---

## Baseline Grid

The baseline grid is the foundation of the entire system. All vertical measurements align to this grid.

### Auto Mode (Default)

When "Custom Baseline" is OFF (auto mode), each format uses a format-specific baseline optimized for its size:

| Format | Baseline | Rationale |
|--------|----------|-----------|
| A6 | 9pt | Small formats need tighter spacing |
| A5 | 10pt | Portable booklet size |
| A4 | 12pt | Standard document base |
| A3 | 13pt | Mid-size posters |
| A2 | 14pt | Larger posters |
| A1 | 16pt | Large format displays |
| A0 | 18pt | Poster scale |

```typescript
const FORMAT_BASELINES = {
  A0: 18.0, A1: 16.0, A2: 14.0, A3: 13.0,
  A4: 12.0, A5: 10.0, A6: 9.0
};
gridUnit = FORMAT_BASELINES[format]  // Auto mode
```

### Custom Mode

When "Custom Baseline" is ON, you can manually select any baseline value that fits the format. The default selection matches the format's auto baseline (shown above), but you can choose from predefined values (6-72pt).

### Landscape Orientation

Baseline value remains the same in landscape; only page dimensions swap.

---

## Margins

Margins are calculated as **baseline multiples** and then **snapped to the baseline grid** for precise alignment.

### Three Calculation Methods

#### Method 1: Progressive (1:2:2:3)

Swiss modern approach for single pages. Creates gentle visual weight shift downward.

```typescript
marginTop    = 1.0 × baseline × baselineMultiple
marginBottom = 3.0 × baseline × baselineMultiple
marginLeft   = 2.0 × baseline × baselineMultiple
marginRight  = 2.0 × baseline × baselineMultiple
```

**Example with 12pt baseline, 1× multiple:**
- Top: 12pt
- Bottom: 36pt
- Left/Right: 24pt

**With 2× multiple:**
- Top: 24pt
- Bottom: 72pt
- Left/Right: 48pt

#### Method 2: Van de Graaf-inspired (1:2:1.5:3)

Asymmetric margins inspired by the Van de Graaf canon, adapted to baseline multiples.

```typescript
marginTop    = 2.0 × baseline × baselineMultiple
marginBottom = 3.0 × baseline × baselineMultiple
marginLeft   = 1.0 × baseline × baselineMultiple
marginRight  = 1.5 × baseline × baselineMultiple
```

**Example with 12pt baseline, 1× multiple:**
- Top: 24pt
- Bottom: 36pt
- Left: 12pt
- Right: 18pt

#### Method 3: Grid-based (Symmetric)

Pure Müller-Brockmann approach: all margins equal to baseline × multiple.

```typescript
margin = baseline × baselineMultiple  // All sides
```

**Example with 12pt baseline, 2× multiple:**
- All margins: 24pt

### Snapping to Baseline Grid

After initial calculation, top and bottom margins are **snapped** to align with baseline grid:

```typescript
marginTop = Math.round(marginTop / baseline) × baseline
marginBottom = Math.round(marginBottom / baseline) × baseline
```

This ensures margins always land on baseline grid lines.

### Bottom Margin Adjustment

After calculating module heights (which are baseline-aligned), the bottom margin is adjusted to consume remaining space:

```typescript
netHAligned = gridRows × moduleHeight + (gridRows - 1) × gutterVertical
marginBottom = pageHeight - marginTop - netHAligned
```

This guarantees the grid fills the content area perfectly.

---

## Gutters

Gutters are the spacing between modules. They are **always equal to 1 baseline unit** (unscaled).

```typescript
gutterHorizontal = baseline
gutterVertical = baseline
```

**Example with 12pt baseline:**
- Horizontal gutter: 12pt
- Vertical gutter: 12pt

This ensures gutters align to the baseline grid, maintaining vertical rhythm.

---

## Modules

Modules are the individual grid cells. Their dimensions are calculated to perfectly fill the content area.

### Module Width

```typescript
netWidth = pageWidth - marginLeft - marginRight
moduleWidth = (netWidth - (gridCols - 1) × gutterHorizontal) / gridCols
```

**Example:** A4 portrait (595.276pt width) with 2× margins (24pt each), 4 columns, 12pt gutters:

```
netWidth = 595.276 - 24 - 24 = 547.276pt
moduleWidth = (547.276 - 3 × 12) / 4 = 127.819pt
```

### Module Height

Module height is **baseline-aligned** to ensure grid harmony:

```typescript
netHeight = pageHeight - marginTop - marginBottom
totalVerticalUnits = Math.round(netHeight / baseline)
unitsPerCell = totalVerticalUnits / gridRows
baselineUnitsPerCell = Math.floor(unitsPerCell)  // Must be integer
```

**Minimum 2 baseline units per cell:**
```typescript
if (baselineUnitsPerCell < 2) {
  baselineUnitsPerCell = 2
}
```

**Cell height calculation:**
```typescript
cellHeight = baselineUnitsPerCell × baseline
moduleHeight = cellHeight - gutterVertical
```

**Example:** A4 portrait (841.890pt height) with 12pt baseline, 6 rows:

```
netHeight = 841.890 - 12 - 36 = 793.890pt
totalVerticalUnits = Math.round(793.890 / 12) = 66
unitsPerCell = 66 / 6 = 11
baselineUnitsPerCell = 11
cellHeight = 11 × 12 = 132pt
moduleHeight = 132 - 12 = 120pt
```

### Aspect Ratio

```typescript
aspectRatio = moduleWidth / moduleHeight
```

---

## Typography

The typography system uses **pure baseline multiples** for all leading values, ensuring perfect alignment to the baseline grid.

### Base System (for A4, 12pt baseline)

| Style | Font Size | Leading | Baseline Multiple | Weight |
|-------|-----------|---------|-------------------|--------|
| Display | 60pt | 72pt | 6× | Bold |
| Headline | 30pt | 36pt | 3× | Bold |
| Subhead | 18pt | 24pt | 2× | Bold |
| Body | 10pt | 12pt | 1× | Regular |
| Caption | 7pt | 12pt | 1× | Regular |

**Key principles:**
- All leading values are **exact integer multiples** of the baseline
- Font sizes are **75-90% of leading** for readability
- Body and Caption share the same leading (1×) for tight rhythm
- Each level creates clear separation through baseline multiples

### Scaling to Other Formats

#### Font Size Scaling

Font sizes scale by the **format scale factor** (relative to A4):

```typescript
scaleFactor = min(formatWidth / A4_width, formatHeight / A4_height)
scaledFontSize = a4FontSize × scaleFactor
```

**Example for A3 (scale factor ≈ 1.4):**
- Body: 10pt × 1.4 = 14pt
- Headline: 30pt × 1.4 = 42pt
- Display: 60pt × 1.4 = 84pt

#### Leading Calculation

Leading is always **baseline multiple × current baseline**:

```typescript
leading = baselineMultiple × gridUnit
```

This ensures typography snaps to the baseline grid regardless of format or baseline value.

**Example with different baselines:**

| Format | Baseline | Body Leading (1×) | Subhead (2×) | Headline (3×) | Display (6×) |
|--------|----------|-------------------|--------------|---------------|--------------|
| A6 | 9pt | 9pt | 18pt | 27pt | 54pt |
| A5 | 10pt | 10pt | 20pt | 30pt | 60pt |
| A4 | 12pt | 12pt | 24pt | 36pt | 72pt |
| A3 | 13pt | 13pt | 26pt | 39pt | 78pt |
| A2 | 14pt | 14pt | 28pt | 42pt | 84pt |
| A1 | 16pt | 16pt | 32pt | 48pt | 96pt |
| A0 | 18pt | 18pt | 36pt | 54pt | 108pt |

### Alignment

All typography uses:
- **Text align:** Left (flush-left, ragged-right)
- **Font:** System sans-serif stack (Inter, Helvetica Neue, Helvetica, Arial, system-ui)
- **Baseline:** Alphabetic (text sits on baseline)

---

## Design Principles

### 1. Baseline Alignment (Critical)

All measurements align to the baseline grid:
- Margins snap to baseline multiples
- Module heights are integer baseline units
- Typography leading is exact baseline multiples
- Gutters equal 1 baseline unit

### 2. Format Hierarchy

Larger formats get proportionally larger:
- Baseline increases stepwise (A6→A0)
- Font sizes scale by format factor
- Leading maintains baseline relationship

### 3. Mathematical Harmony

All relationships are mathematical, not arbitrary:
- Margins use simple ratios (1:2:2:3, 1:2:1.5:3)
- Modules divide content area evenly
- Typography uses integer multiples

### 4. Swiss Style Characteristics

- **Objective order** through mathematical ratios
- **Visual harmony** through consistent proportions
- **Modular rhythm** through baseline alignment
- **Clear hierarchy** through baseline multiples

---

## Reference

*Müller-Brockmann, Josef. "Grid Systems in Graphic Design." Arthur Niggli Ltd, Teufen, 1981.*

Key pages:
- pp. 84-87: Van de Graaf canon and classical page construction
- pp. 92-93: Progressive margin ratios (1:2:3)
- pp. 102-107: Module-based construction
- pp. 108-113: Baseline grid and typographic alignment
