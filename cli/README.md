# Swiss Grid Generator - CLI

Python CLI tool for generating typographic grid systems based on Josef Müller-Brockmann's *Grid Systems in Graphic Design* (1981). Implements International Typographic Style (Swiss Style) principles for print and digital design.

![CLI Screenshot](./swiss-grid-generator-cli-screenshot.png)

## Features

- A-series paper formats (A0-A6) in portrait/landscape
- Modular grids (1×1 to 13×13)
- Three margin calculation methods
- 10-style typography system aligned to baseline grid
- Export to JSON, TXT, and PDF formats
- Interactive wizard mode (TUI)

## Installation

1. Ensure you have Python 3.7+ installed
2. Install the required dependency:

```bash
pip install rich
```

3. (Optional) For PDF generation, install reportlab:

```bash
pip install reportlab
```

## Usage

### Command-Line Interface

```bash
python swiss_grid_generator.py [OPTIONS]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--format` | Paper format (A0-A6) | `A4` |
| `--orientation` | Page orientation | `portrait` |
| `--grid` | Grid dimensions (e.g., `3x4`) | `2x4` |
| `--method` | Margin calculation method (1-3) | `1` |
| `--baseline` | Baseline grid unit in points | `12.0` |
| `--output` | Output file path (no extension) | Auto-generated |
| `--no-pdf` | Skip PDF generation | `False` |
| `--wizard` | Launch interactive wizard | `False` |

#### Examples

Generate a 3×3 grid on A4 portrait with method 1 margins:

```bash
python swiss_grid_generator.py --format A4 --grid 3x3 --method 1
```

Generate a 4×6 grid on A3 landscape with custom baseline:

```bash
python swiss_grid_generator.py --format A3 --orientation landscape --grid 4x6 --baseline 18
```

Use interactive wizard mode:

```bash
python swiss_grid_generator.py --wizard
```

### Output Files

Three files are generated (naming: `{format}_{orientation}_{cols}x{rows}_method{N}_baseline{X}pt_grid.{ext}`):

- **JSON** - Complete grid parameters and all 10 typography styles (machine-readable)
- **TXT** - Human-readable text format with sections for settings, dimensions, grid & margins, typography, and principles
- **PDF** - Visual grid reference with blue module outlines and magenta baseline grid (clean template for design overlay)

## Typography System

The tool includes 10 typography styles, all aligned to the baseline grid:

| Style | A4 Size | A4 Leading | Baseline Mult. |
|-------|---------|------------|----------------|
| caption | 7pt | 8pt | 0.67 |
| footnote | 6pt | 12pt | 1.0 |
| body | 10pt | 12pt | 1.0 |
| lead | 12pt | 12pt | 1.0 |
| subhead_small | 14pt | 24pt | 2.0 |
| subhead_medium | 18pt | 24pt | 2.0 |
| headline_3 | 20pt | 24pt | 2.0 |
| headline_2 | 28pt | 36pt | 3.0 |
| headline_1 | 48pt | 48pt | 4.0 |
| display | 72pt | 72pt | 6.0 |

Font sizes scale proportionally for other A-series formats while maintaining baseline relationships.

## Margin Calculation Methods

### Method 1: Progressive Margins (1:2:3)
Based on Müller-Brockmann's progressive margin ratios:
- Top: 1× baseline
- Bottom: 3× baseline
- Inner/Outer: 2× baseline each

### Method 2: Van de Graaf Ratios (2:3:4:6)
Based on the Van de Graaf canon for classical page construction:
- Inner: 2× baseline
- Top: 3× baseline
- Outer: 4× baseline
- Bottom: 6× baseline

### Method 3: Grid-Based Margins
Margins equal to one module width/height on each side.

## Design Principles

1. **Baseline Alignment** - All typography aligns to the baseline grid
2. **Format Scaling** - Typography scales proportionally with format size
3. **Grid Gutters** - Gutters equal 1 baseline unit (horizontal and vertical)
4. **Module Alignment** - Each module spans an integer number of baseline units

## Reference

*Müller-Brockmann, Josef. "Grid Systems in Graphic Design." Arthur Niggli Ltd, Teufen, 1981.*
