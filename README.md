# Swiss Grid Generator

A toolkit for generating typographic grid systems based on Josef Müller-Brockmann's *[Grid Systems in Graphic Design](https://ia802309.us.archive.org/4/items/GridSystemsInGraphicDesignJosefMullerBrockmann/Grid%20systems%20in%20graphic%20design%20-%20Josef%20Muller-Brockmann_text.pdf)* (1981). Implements International Typographic Style (Swiss Style) principles for print and digital design.

**Live Preview:** [https://dev.lp45.net/swiss-grid-generator/](https://dev.lp45.net/swiss-grid-generator/)

## Overview

The Swiss Grid Generator provides tools for creating modular grid systems with baseline-aligned typography. It supports A-series paper formats (A0-A6) in portrait and landscape orientations, with customizable grid configurations and margin calculation methods.

## Screenshots

### Web Application 
![Web App Screenshot](swiss-grid-generator-webapp-screenshot.png)
**Live Preview:** [https://dev.lp45.net/swiss-grid-generator/](https://dev.lp45.net/swiss-grid-generator/)

## Features

- A-series paper formats (A0-A6) in portrait/landscape
- Modular grids (1×1 to 13×13)
- Preview rotation slider (−80° to +80°)
- Three margin calculation methods:
  - Method 1: Progressive margins (1:2:2:3 — top:left:right:bottom)
  - Method 2: Van de Graaf ratios (2:3:4:6 — top:left:right:bottom)
  - Method 3: Baseline margins (1:1:1:1 — symmetric)
- Custom margin overrides with per-side baseline multipliers
- Adjustable gutter spacing (1×–4× baseline)
- 5-level typography system aligned to baseline grid
- Real-time canvas preview with toggleable layers, rotation, and column-aware text flow
- Multiple export formats (JSON, TXT, PDF)

## Design Principles

The Swiss Grid Generator implements Müller-Brockmann's core teachings:

1. **Functional clarity** - Grid serves content, not vice versa
2. **Objective order** - Mathematical ratios, not arbitrary spacing
3. **Visual harmony** - All elements relate through consistent proportions
4. **Format scalability** - System works across all A-series formats

## Tech Stack

- **Framework** - Next.js 15 with App Router
- **Language** - TypeScript
- **Styling** - Tailwind CSS with custom animations
- **UI Components** - Radix UI primitives (Select, Slider, Switch, Tabs, Label)
- **PDF Generation** - jsPDF
- **Icons** - Lucide React

## Installation

```bash
cd swiss-grid-webapp
```

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
npm run build
```

Static files are exported to the `out/` directory.

## Configuration Options

### Paper Format

Select from A0 through A6 formats in either portrait or landscape orientation.

### Orientation

Choose portrait or landscape orientation for the selected format.

### Rotation

Rotate the preview from −80° to +80° in 1° steps.

### Margin Method

Choose from three calculation methods:

1. **Progressive (1:2:2:3)** - Top: 1×, Left: 2×, Right: 2×, Bottom: 3× baseline
2. **Van de Graaf (2:3:4:6)** - Top: 2×, Left: 3×, Right: 4×, Bottom: 6× baseline
3. **Baseline (1:1:1:1)** - Symmetric margins as baseline multiples

All margin methods support a baseline multiple slider (1×–7×) for scaling.
Custom margins allow per-side control (1×–9× baseline).

### Gutter

Configure columns (1–13) and rows (1–13) for your modular grid.
Gutter spacing is adjustable from 0.5× to 4× baseline, keeping gutters aligned to the baseline grid.

### Baseline Grid

Adjust the baseline unit from 6 to 72 points. Format-specific defaults are provided (A4: 12pt, A3: 13pt, etc.). All typography scales accordingly.

### Display Options

Toggle baselines, margins, gutter, and typography overlays. Choose display units (pt, mm, px) and preview zoom. Default zoom is Fit.

## Typography System

The app includes a 5-level hierarchy aligned to the baseline grid (A4 reference, 12pt baseline):

| Style | Size | Leading | Baseline | Weight | Use Case |
|-------|------|---------|----------|--------|----------|
| display | 64pt | 72pt | 6× | Bold | Display titles, cover text |
| headline | 30pt | 36pt | 3× | Bold | Main headlines |
| subhead | 20pt | 24pt | 2× | Regular | Subheadings |
| body | 10pt | 12pt | 1× | Regular | Body text, paragraphs |
| caption | 7pt | 12pt | 1× | Regular | Captions, photo credits |

Preview layout rules:
- If grid rows are 2 or more, the display line sits on the last baseline of row 1.
- Headline, subhead, and body start inside row 2.
- Subhead and body flow into two columns when there are 2 or more columns.

## Component Structure

```
app/
├── layout.tsx              # Root layout with SEO metadata
├── page.tsx                # Main grid generator interface
├── globals.css             # Global styles and Tailwind directives

components/
├── grid-preview.tsx        # Canvas-based grid visualization
└── ui/                     # Radix UI primitives (shadcn/ui style)

lib/
├── grid-calculator.ts      # Core grid computation engine
└── utils.ts                # Utility functions (cn helper)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Reference

*Müller-Brockmann, Josef. "Grid Systems in Graphic Design." Arthur Niggli Ltd, Teufen, 1981.*

## Copyleft & -right
[https://lp45.net/](https://lp45.net/)

## License

MIT
