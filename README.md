# Swiss Grid Generator

A toolkit for generating typographic grid systems based on Josef Müller-Brockmann's *Grid Systems in Graphic Design* (1981). Implements International Typographic Style (Swiss Style) principles for print and digital design.

## Overview

The Swiss Grid Generator provides tools for creating modular grid systems with baseline-aligned typography. It supports A-series paper formats (A0-A6) in portrait and landscape orientations, with customizable grid configurations and margin calculation methods.

## Components

This repository contains two implementations:

- **[Web App](./swiss-grid-webapp/)** - Next.js web application with interactive grid visualization and live preview
- **[CLI Tool](./cli/)** - Python command-line interface for generating grid specifications and exporting to JSON, TXT, and PDF formats

## Screenshots

### Web Application 
![Web App Screenshot](./swiss-grid-webapp/swiss-grid-generator-webapp-screenshot.png)
**Live Preview:** [https://dev.lp45.net/swiss-grid-generator/](https://dev.lp45.net/swiss-grid-generator/)

### CLI Interface
![CLI Screenshot](./cli/swiss-grid-generator-cli-screenshot.png)

## Features

- A-series paper formats (A0-A6) in portrait/landscape
- Modular grids (1×1 to 13×13)
- Three margin calculation methods:
  - Method 1: Progressive margins (1:2:3)
  - Method 2: Van de Graaf ratios (2:3:4:6)
  - Method 3: Grid-based margins
- 10-style typography system aligned to baseline grid
- Multiple export formats (JSON, TXT, PDF)

## Design Principles

The Swiss Grid Generator implements Müller-Brockmann's core teachings:

1. **Functional clarity** - Grid serves content, not vice versa
2. **Objective order** - Mathematical ratios, not arbitrary spacing
3. **Visual harmony** - All elements relate through consistent proportions
4. **Format scalability** - System works across all A-series formats

## Quick Start

### Web App

**Live Preview:** [https://dev.lp45.net/swiss-grid-generator/](https://dev.lp45.net/swiss-grid-generator/)

Or run locally:

```bash
cd swiss-grid-webapp
npm install
npm run dev
```

Visit `http://localhost:3000` to use the interactive web interface.

### CLI Tool

```bash
cd cli
python swiss_grid_generator.py --format A4 --grid 2x4 --method 1
```

## Reference

*Müller-Brockmann, Josef. "Grid Systems in Graphic Design." Arthur Niggli Ltd, Teufen, 1981.*

## Copyleft & -right
[https://lp45.net/](https://lp45.net/)

## License

MIT
