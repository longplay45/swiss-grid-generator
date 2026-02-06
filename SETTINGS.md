# SETTINGS.md

All configurable parameters of the Swiss Grid Generator with their possible values and defaults.

## Font Hierarchy Table

5-level typography system based on A4 with 12pt baseline grid.

| Level      | Size  | Leading | Baseline Multiple | Body Lines | Weight  | Alignment |
|------------|-------|---------|-------------------|------------|---------|-----------|
| `display`  | 64pt  | 72pt    | 6×                | 6.0        | Bold    | Left      |
| `headline` | 30pt  | 36pt    | 3×                | 3.0        | Bold    | Left      |
| `subhead`  | 20pt  | 24pt    | 2×                | 2.0        | Regular | Left      |
| `body`     | 10pt  | 12pt    | 1×                | 1.0        | Regular | Left      |
| `caption`  | 7pt   | 12pt    | 1×                | 1.0        | Regular | Left      |

Font sizes and leading scale automatically by format (relative to A4) and baseline ratio.

## Format & Layout

### Page Format

| Value | Width (pt) | Height (pt) |
|-------|------------|-------------|
| A6    | 297.638    | 419.528     |
| A5    | 419.528    | 595.276     |
| **A4**| **595.276**| **841.890** |
| A3    | 841.890    | 1190.551    |
| A2    | 1190.551   | 1683.780    |
| A1    | 1683.780   | 2383.937    |
| A0    | 2383.937   | 3370.394    |

**Default:** A4

### Orientation

| Value       | Description                |
|-------------|----------------------------|
| **portrait**| Height > Width (default)   |
| landscape   | Width > Height             |

**Default:** portrait

### Rotation

Preview-only rotation of the page.

| Parameter | Value |
|-----------|-------|
| Min       | -80°  |
| Max       | 80°   |
| Step      | 1°    |
| **Default** | **0°** |

## Baseline Grid

### Custom Baseline

Toggle to override auto-calculated baseline with a manual value.

**Default:** Off (auto)

When auto, each format uses a preset baseline:

| Format | Baseline (pt) |
|--------|---------------|
| A0     | 18.0          |
| A1     | 16.0          |
| A2     | 14.0          |
| A3     | 13.0          |
| A4     | 12.0          |
| A5     | 10.0          |
| A6     | 9.0           |

### Grid Unit (Custom Baseline enabled)

Available values: 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72 pt

Values are filtered to only show options that fit the current format and grid configuration.

**Default:** Format-specific baseline (e.g. 12 pt for A4)

## Margins

### Custom Margins

Toggle to override margin method with individual per-side multipliers.

**Default:** Off

### Margin Method (Custom Margins off)

| Value | Label                   | Top   | Left  | Right | Bottom |
|-------|-------------------------|-------|-------|-------|--------|
| **1** | **Progressive (1:2:2:3)** | 1× BL | 2× BL | 2× BL | 3× BL |
| 2     | Van de Graaf (2:3:4:6)  | 2× BL | 3× BL | 4× BL | 6× BL |
| 3     | Baseline (1:1:1:1)      | 1× BL | 1× BL | 1× BL | 1× BL |

BL = baseline unit × baseline multiple

**Default:** 1 (Progressive)

### Baseline Multiple (Margins)

Scales all margin ratios.

| Parameter | Value           |
|-----------|-----------------|
| Min       | 0.5             |
| Max       | 7.0             |
| Step      | 0.5             |
| **Default** | **1.0**       |

Possible values: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0

### Custom Margin Multipliers (Custom Margins on)

Per-side baseline multipliers for top, left, right, bottom.

| Parameter | Value           |
|-----------|-----------------|
| Min       | 1               |
| Max       | 9               |
| Step      | 1               |

Initial values when enabled are derived from the current margin method.

## Gutter

### Columns

| Parameter | Value           |
|-----------|-----------------|
| Min       | 1               |
| Max       | 13              |
| Step      | 1               |
| **Default** | **4**         |

### Rows

| Parameter | Value           |
|-----------|-----------------|
| Min       | 1               |
| Max       | 13              |
| Step      | 1               |
| **Default** | **9**         |

### Baseline Multiple (Gutter)

Scales gutter size (horizontal and vertical gutters).

| Parameter | Value           |
|-----------|-----------------|
| Min       | 0.5             |
| Max       | 4.0             |
| Step      | 0.5             |
| **Default** | **1.0**       |

Possible values: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0

## Display Options

### Layer Toggles

| Toggle     | Description              | Default |
|------------|--------------------------|---------|
| Baselines  | Baseline grid lines      | On      |
| Margins    | Margin area highlight    | On      |
| Gutter     | Module outlines          | On      |
| Type       | Typography preview       | On      |

### Display Unit

| Value  | Description          |
|--------|----------------------|
| mm     | Millimeters          |
| **pt** | **Points (default)** |
| px     | Pixels (at 96 dpi)   |

**Default:** pt

### Zoom

| Value        | Description                                    |
|--------------|------------------------------------------------|
| original     | Scale capped at 100%                           |
| **fit**      | **Scale to fill available preview area (default)** |

**Default:** fit

### Typography Preview Layout

If `Rows` is 2 or more, the preview positions the `display` line on the last baseline of row 1, and starts `headline`, `subhead`, and `body` inside row 2. If `Columns` is 2 or more, `subhead` and `body` flow into two columns.

## Export

Three export formats available:

| Format | Description                                         |
|--------|-----------------------------------------------------|
| PDF    | Visual grid reference with modules and baselines    |
| JSON   | Complete GridResult object (machine-readable)       |
| TXT    | Human-readable text with all parameters             |

Filename pattern: `{format}_{orientation}_{cols}x{rows}_method{id}_{baseline}pt_grid.{ext}`
