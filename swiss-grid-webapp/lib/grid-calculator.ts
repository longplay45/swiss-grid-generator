// Swiss Grid Calculator - Ported from Python to TypeScript
// Based on Müller-Brockmann's "Grid Systems in Graphic Design" (1981)

export interface FormatDimensions {
  width: number;
  height: number;
}

export interface GridSettings {
  format: string;
  orientation: "portrait" | "landscape";
  marginMethod: 1 | 2 | 3;
  gridCols: number;
  gridRows: number;
  baseline?: number;
  baselineMultiple?: number;
}

export interface GridResult {
  format: string;
  settings: {
    orientation: string;
    marginMethod: string;
    marginMethodId: number;
    gridCols: number;
    gridRows: number;
    baselineMultiple: number;
    customBaseline: number | undefined;
  };
  pageSizePt: {
    width: number;
    height: number;
  };
  grid: {
    gridUnit: number;
    gridMarginHorizontal: number;
    gridMarginVertical: number;
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    gutter: number;
    scaleFactor: number;
    baselineUnitsPerCell: number;
  };
  contentArea: {
    width: number;
    height: number;
  };
  module: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  typography: {
    metadata: {
      format: string;
      unit: string;
      baselineGrid: number;
      a4Baseline: number;
      scaleFactor: number;
    };
    styles: Record<string, {
      size: number;
      leading: number;
      weight: string;
      alignment: string;
      baselineMultiplier: number;
      bodyLines: number;
    }>;
  };
}

// A-series formats in points (ISO 216)
export const FORMATS_PT: Record<string, FormatDimensions> = {
  A6: { width: 297.638, height: 419.528 },
  A5: { width: 419.528, height: 595.276 },
  A4: { width: 595.276, height: 841.890 },
  A3: { width: 841.890, height: 1190.551 },
  A2: { width: 1190.551, height: 1683.780 },
  A1: { width: 1683.780, height: 2383.937 },
  A0: { width: 2383.937, height: 3370.394 },
};

// Base typographic values for A4
const BASE_GRID_UNIT = 12.0;
const BASE_GUTTER = 6.0;

// A4 Typography System
const A4_TYPOGRAPHY: Record<string, { size: number; leading: number; baselineMult: number; bodyLines: number; weight: string }> = {
  caption: { size: 7.0, leading: 8.0, baselineMult: 0.67, bodyLines: 0.67, weight: "Regular" },
  footnote: { size: 6.0, leading: 12.0, baselineMult: 1.0, bodyLines: 1.0, weight: "Regular" },
  body: { size: 10.0, leading: 12.0, baselineMult: 1.0, bodyLines: 1.0, weight: "Regular" },
  lead: { size: 12.0, leading: 12.0, baselineMult: 1.0, bodyLines: 1.0, weight: "Regular" },
  subhead_small: { size: 14.0, leading: 24.0, baselineMult: 2.0, bodyLines: 2.0, weight: "Bold" },
  subhead_medium: { size: 18.0, leading: 24.0, baselineMult: 2.0, bodyLines: 2.0, weight: "Bold" },
  headline_3: { size: 20.0, leading: 24.0, baselineMult: 2.0, bodyLines: 2.0, weight: "Bold" },
  headline_2: { size: 28.0, leading: 36.0, baselineMult: 3.0, bodyLines: 3.0, weight: "Bold" },
  headline_1: { size: 48.0, leading: 48.0, baselineMult: 4.0, bodyLines: 4.0, weight: "Bold" },
  display: { size: 72.0, leading: 72.0, baselineMult: 6.0, bodyLines: 6.0, weight: "Bold" },
};

const MARGIN_METHOD_LABELS: Record<number, string> = {
  1: "Progressive (1:2:2:3)",
  2: "Van de Graaf (page/9)",
  3: "Grid-based (baseline multiples)",
};

// Margin calculation methods
interface MarginResult {
  top: number;
  bottom: number;
  left: number;
  right: number;
  gutterH: number;
  gutterV: number;
}

function calculateProgressiveMargins(
  gridUnit: number,
  w: number,
  _h: number,
  _gridCols: number,
  _gridRows: number,
  baselineMultiple: number = 1.0
): MarginResult {
  // Progressive 1:2:2:3 ratio (Swiss modern approach for single pages)
  // Top is smallest, left/right are equal (symmetric), bottom is largest
  // Creates gentle visual weight shift downward for better flow
  // All margins are multiples of the baseline grid unit

  // The baselineMultiple slider scales the base ratios
  // Example with 12pt baseline:
  //   1x = 12:24:24:36pt (1:2:2:3)
  //   2x = 24:48:48:72pt (2:4:4:6)
  //   3x = 36:72:72:108pt (3:6:6:9)

  return {
    top: gridUnit * 1.0 * baselineMultiple,     // 1× baseline × multiplier
    bottom: gridUnit * 3.0 * baselineMultiple,  // 3× baseline × multiplier
    left: gridUnit * 2.0 * baselineMultiple,    // 2× baseline × multiplier
    right: gridUnit * 2.0 * baselineMultiple,   // 2× baseline × multiplier (same as left)
    gutterH: gridUnit,
    gutterV: gridUnit,
  };
}

function calculateVandegraafMargins(
  gridUnit: number,
  w: number,
  _h: number,
  _gridCols: number,
  _gridRows: number,
  baselineMultiple: number = 1.0
): MarginResult {
  // Van de Graaf Canon adapted for modern Swiss design
  // Based on page width / 9 for inner margin, with baseline multiplier scaling
  // The baselineMultiple scales all margins proportionally

  // Inner margin ≈ page width / 9 (classic canon)
  const unit = w / 9;

  // Adapted Swiss version scaled by baselineMultiple
  // Inner: 1/9, top: 1.5/9, outer: 2/9, bottom: 3/9 of page width
  // Then scaled by baselineMultiple
  return {
    top: unit * 1.5 * baselineMultiple,      // ~1.5/9 scaled
    bottom: unit * 3.0 * baselineMultiple,   // ~3/9 scaled
    left: unit * 1.0 * baselineMultiple,     // 1/9 scaled
    right: unit * 2.0 * baselineMultiple,    // 2/9 scaled
    gutterH: gridUnit,
    gutterV: gridUnit,
  };
}

function calculateGridBasedMargins(
  gridUnit: number,
  _w: number,
  _h: number,
  _gridCols: number,
  _gridRows: number,
  baselineMultiple: number = 1.0
): MarginResult {
  // Pure Müller-Brockmann approach: margins as baseline multiples
  // All margins are multiples of the baseline unit for grid harmony
  // Symmetric margins (common for single sheets/posters in Swiss style)

  return {
    top: baselineMultiple * gridUnit,
    bottom: baselineMultiple * gridUnit,
    left: baselineMultiple * gridUnit,
    right: baselineMultiple * gridUnit,
    gutterH: gridUnit,
    gutterV: gridUnit,
  };
}

const MARGIN_CALCULATORS: Record<number, (gridUnit: number, w: number, h: number, gridCols: number, gridRows: number, baselineMultiple?: number) => MarginResult> = {
  1: calculateProgressiveMargins,
  2: calculateVandegraafMargins,
  3: calculateGridBasedMargins,
};

function calculateScaleFactor(formatName: string, orientation: "portrait" | "landscape"): number {
  const a4 = FORMATS_PT.A4;
  const format = FORMATS_PT[formatName];
  const w = orientation === "landscape" ? format.height : format.width;
  const h = orientation === "landscape" ? format.width : format.height;

  return Math.min(w / a4.width, h / a4.height);
}

function generateTypographyStyles(
  scaleFactor: number,
  gridUnit: number,
  formatName: string
): GridResult["typography"] {
  const scaledStyles: GridResult["typography"]["styles"] = {};

  for (const [styleName, a4Style] of Object.entries(A4_TYPOGRAPHY)) {
    const scaledSize = a4Style.size * scaleFactor;
    const scaledLeading = a4Style.leading * (gridUnit / BASE_GRID_UNIT);

    scaledStyles[styleName] = {
      size: Math.round(scaledSize * 1000) / 1000,
      leading: Math.round(scaledLeading * 1000) / 1000,
      weight: a4Style.weight,
      alignment: "Left",
      baselineMultiplier: a4Style.baselineMult,
      bodyLines: a4Style.bodyLines,
    };
  }

  return {
    metadata: {
      format: formatName,
      unit: "pt",
      baselineGrid: Math.round(gridUnit * 1000) / 1000,
      a4Baseline: BASE_GRID_UNIT,
      scaleFactor: Math.round(scaleFactor * 1000) / 1000,
    },
    styles: scaledStyles,
  };
}

export function generateSwissGrid(settings: GridSettings): GridResult {
  const { format, orientation, marginMethod, gridCols, gridRows, baseline: customBaseline, baselineMultiple = 1.0 } = settings;

  if (!FORMATS_PT[format]) {
    throw new Error(`Unsupported format: ${format}`);
  }

  const formatDim = FORMATS_PT[format];
  let w = formatDim.width;
  let h = formatDim.height;

  if (orientation === "landscape") {
    [w, h] = [h, w];
  }

  const formatScaleFactor = calculateScaleFactor(format, orientation);
  const gridUnit = customBaseline ?? BASE_GRID_UNIT * formatScaleFactor;
  const scale_factor = formatScaleFactor;

  const marginCalculator = MARGIN_CALCULATORS[marginMethod];
  const margins = marginCalculator(gridUnit, w, h, gridCols, gridRows, baselineMultiple);

  let { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight, gutterH: gridMarginHorizontal, gutterV: gridMarginVertical } = margins;

  // Snap margins to baseline grid
  marginTop = Math.round(marginTop / gridUnit) * gridUnit;
  marginBottom = Math.round(marginBottom / gridUnit) * gridUnit;

  const gutter = gridMarginHorizontal;

  const netW = w - (marginLeft + marginRight);
  const modW = (netW - (gridCols - 1) * gridMarginHorizontal) / gridCols;

  let netH = h - (marginTop + marginBottom);

  // Height: Calculate baseline units per cell for alignment
  const totalVerticalUnits = Math.round(netH / gridUnit);
  let unitsPerCell = totalVerticalUnits / gridRows;
  let baselineUnitsPerCell = Math.round(unitsPerCell);

  if (baselineUnitsPerCell < 2) {
    baselineUnitsPerCell = 2;
  }

  const cellHeight = baselineUnitsPerCell * gridUnit;
  const modH = cellHeight - gridMarginVertical;

  // Recalculate actual net_h to match aligned modules
  const netHAligned = gridRows * modH + (gridRows - 1) * gridMarginVertical;

  // Adjust bottom margin
  marginBottom = h - marginTop - netHAligned;

  const typoSettings = generateTypographyStyles(scale_factor, gridUnit, format);

  return {
    format,
    settings: {
      orientation,
      marginMethod: MARGIN_METHOD_LABELS[marginMethod],
      marginMethodId: marginMethod,
      gridCols,
      gridRows,
      baselineMultiple,
      customBaseline,
    },
    pageSizePt: {
      width: Math.round(w * 1000) / 1000,
      height: Math.round(h * 1000) / 1000,
    },
    grid: {
      gridUnit: Math.round(gridUnit * 1000) / 1000,
      gridMarginHorizontal: Math.round(gridMarginHorizontal * 1000) / 1000,
      gridMarginVertical: Math.round(gridMarginVertical * 1000) / 1000,
      margins: {
        top: Math.round(marginTop * 1000) / 1000,
        bottom: Math.round(marginBottom * 1000) / 1000,
        left: Math.round(marginLeft * 1000) / 1000,
        right: Math.round(marginRight * 1000) / 1000,
      },
      gutter: Math.round(gutter * 1000) / 1000,
      scaleFactor: Math.round(scale_factor * 1000) / 1000,
      baselineUnitsPerCell,
    },
    contentArea: {
      width: Math.round(netW * 1000) / 1000,
      height: Math.round(netHAligned * 1000) / 1000,
    },
    module: {
      width: Math.round(modW * 1000) / 1000,
      height: Math.round(modH * 1000) / 1000,
      aspectRatio: Math.round((modW / modH) * 1000) / 1000,
    },
    typography: typoSettings,
  };
}
