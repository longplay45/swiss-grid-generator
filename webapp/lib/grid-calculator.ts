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
  gutterMultiple?: number;
  customMargins?: { top: number; bottom: number; left: number; right: number };
  typographyScale?: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci";
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

export type CanvasRatioKey =
  | "din_ab"
  | "letter_ansi_ab"
  | "balanced_3_4"
  | "photo_2_3"
  | "screen_16_9"
  | "square_1_1"
  | "editorial_4_5"
  | "wide_2_1";

export interface CanvasRatioOption {
  key: CanvasRatioKey;
  category: "Universal";
  label: string;
  ratioLabel: string;
  ratioDecimal: number;
  paperSizes: string[];
}

// Paper formats in points (1in = 72pt)
export const FORMATS_PT: Record<string, FormatDimensions> = {
  A6: { width: 297.638, height: 419.528 },
  A5: { width: 419.528, height: 595.276 },
  A4: { width: 595.276, height: 841.890 },
  A3: { width: 841.890, height: 1190.551 },
  A2: { width: 1190.551, height: 1683.780 },
  A1: { width: 1683.780, height: 2383.937 },
  A0: { width: 2383.937, height: 3370.394 },
  B6: { width: 354.331, height: 498.898 },
  B5: { width: 498.898, height: 708.661 },
  B4: { width: 708.661, height: 1000.630 },
  B3: { width: 1000.630, height: 1417.323 },
  B2: { width: 1417.323, height: 2004.094 },
  B1: { width: 2004.094, height: 2834.646 },
  B0: { width: 2834.646, height: 4008.189 },
  LETTER: { width: 612.0, height: 792.0 },      // 8.5" × 11"
  LEGAL: { width: 612.0, height: 1008.0 },      // 8.5" × 14"
  ANSI_B: { width: 792.0, height: 1224.0 },     // 11" × 17"
  ANSI_C: { width: 1224.0, height: 1584.0 },    // 17" × 22"
  ANSI_D: { width: 1584.0, height: 2448.0 },    // 22" × 34"
  ANSI_E: { width: 2448.0, height: 3168.0 },    // 34" × 44"
  BALANCED_3_4: { width: 600.0, height: 800.0 },   // 3:4
  PHOTO_2_3: { width: 600.0, height: 900.0 },      // 2:3
  SCREEN_16_9: { width: 540.0, height: 960.0 },    // 9:16 portrait base
  SQUARE_1_1: { width: 700.0, height: 700.0 },     // 1:1
  EDITORIAL_4_5: { width: 640.0, height: 800.0 },  // 4:5
  WIDE_2_1: { width: 500.0, height: 1000.0 },      // 1:2 portrait base
};

export const CANVAS_RATIOS: CanvasRatioOption[] = [
  {
    key: "din_ab",
    category: "Universal",
    label: "DIN",
    ratioLabel: "1:√2",
    ratioDecimal: Math.SQRT2,
    paperSizes: ["A6", "A5", "A4", "A3", "A2", "A1", "A0", "B6", "B5", "B4", "B3", "B2", "B1", "B0"],
  },
  {
    key: "letter_ansi_ab",
    category: "Universal",
    label: "ANSI",
    ratioLabel: "1:1.294",
    ratioDecimal: 1.294,
    paperSizes: ["LETTER", "LEGAL", "ANSI_B", "ANSI_C", "ANSI_D", "ANSI_E"],
  },
  {
    key: "balanced_3_4",
    category: "Universal",
    label: "Balanced",
    ratioLabel: "3:4",
    ratioDecimal: 1.333,
    paperSizes: ["BALANCED_3_4"],
  },
  {
    key: "photo_2_3",
    category: "Universal",
    label: "Photo",
    ratioLabel: "2:3",
    ratioDecimal: 1.5,
    paperSizes: ["PHOTO_2_3"],
  },
  {
    key: "screen_16_9",
    category: "Universal",
    label: "Screen",
    ratioLabel: "16:9",
    ratioDecimal: 1.778,
    paperSizes: ["SCREEN_16_9"],
  },
  {
    key: "square_1_1",
    category: "Universal",
    label: "Square",
    ratioLabel: "1:1",
    ratioDecimal: 1.0,
    paperSizes: ["SQUARE_1_1"],
  },
  {
    key: "editorial_4_5",
    category: "Universal",
    label: "Editorial",
    ratioLabel: "4:5",
    ratioDecimal: 1.25,
    paperSizes: ["EDITORIAL_4_5"],
  },
  {
    key: "wide_2_1",
    category: "Universal",
    label: "Wide Impact",
    ratioLabel: "2:1",
    ratioDecimal: 2.0,
    paperSizes: ["WIDE_2_1"],
  },
];

// Base typographic values for A4
const BASE_GRID_UNIT = 12.0;

// Typography defined as baseline ratios (A4 reference: size/12pt)
// Font sizes scale proportionally with baseline across all formats
// Leading is always an integer multiple of baseline (Swiss baseline alignment)
type TypographyRatios = Record<string, { sizeRatio: number; leadingMult: number; bodyLines: number; weight: string }>;

// Swiss (hand-tuned) — original ratios from Müller-Brockmann reference
const TYPOGRAPHY_RATIOS_SWISS: TypographyRatios = {
  caption:  { sizeRatio:  7 / 12, leadingMult: 1, bodyLines: 1, weight: "Regular" },  // 0.583× baseline
  body:     { sizeRatio: 10 / 12, leadingMult: 1, bodyLines: 1, weight: "Regular" },  // 0.833× baseline
  subhead:  { sizeRatio: 20 / 12, leadingMult: 2, bodyLines: 2, weight: "Regular" },  // 1.667× baseline
  headline: { sizeRatio: 30 / 12, leadingMult: 3, bodyLines: 3, weight: "Bold" },     // 2.500× baseline
  display:  { sizeRatio: 64 / 12, leadingMult: 6, bodyLines: 6, weight: "Bold" },     // 5.333× baseline
};

// Golden Ratio (φ=1.618) — steps from body: -1, 0, +1, +2, +4
const PHI = 1.618;
const TYPOGRAPHY_RATIOS_GOLDEN: TypographyRatios = {
  caption:  { sizeRatio: (10 / PHI) / 12,          leadingMult: 1, bodyLines: 1, weight: "Regular" },
  body:     { sizeRatio: 10 / 12,                   leadingMult: 1, bodyLines: 1, weight: "Regular" },
  subhead:  { sizeRatio: (10 * PHI) / 12,           leadingMult: 2, bodyLines: 2, weight: "Regular" },
  headline: { sizeRatio: (10 * PHI ** 2) / 12,      leadingMult: 3, bodyLines: 3, weight: "Bold" },
  display:  { sizeRatio: (10 * PHI ** 4) / 12,      leadingMult: 6, bodyLines: 6, weight: "Bold" },
};

// Perfect Fourth (4:3) — steps from body: -1, 0, +2, +3, +6
const P4 = 4 / 3;
const TYPOGRAPHY_RATIOS_FOURTH: TypographyRatios = {
  caption:  { sizeRatio: (10 / P4) / 12,        leadingMult: 1, bodyLines: 1, weight: "Regular" },
  body:     { sizeRatio: 10 / 12,                leadingMult: 1, bodyLines: 1, weight: "Regular" },
  subhead:  { sizeRatio: (10 * P4 ** 2) / 12,   leadingMult: 2, bodyLines: 2, weight: "Regular" },
  headline: { sizeRatio: (10 * P4 ** 3) / 12,   leadingMult: 3, bodyLines: 3, weight: "Bold" },
  display:  { sizeRatio: (10 * P4 ** 6) / 12,   leadingMult: 6, bodyLines: 6, weight: "Bold" },
};

// Perfect Fifth (3:2) — steps from body: -1, 0, +1, +2, +4
const P5 = 3 / 2;
const TYPOGRAPHY_RATIOS_FIFTH: TypographyRatios = {
  caption:  { sizeRatio: (10 / P5) / 12,        leadingMult: 1, bodyLines: 1, weight: "Regular" },
  body:     { sizeRatio: 10 / 12,               leadingMult: 1, bodyLines: 1, weight: "Regular" },
  subhead:  { sizeRatio: (10 * P5) / 12,        leadingMult: 2, bodyLines: 2, weight: "Regular" },
  headline: { sizeRatio: (10 * P5 ** 2) / 12,   leadingMult: 3, bodyLines: 3, weight: "Bold" },
  display:  { sizeRatio: (10 * P5 ** 4) / 12,   leadingMult: 6, bodyLines: 6, weight: "Bold" },
};

// Fibonacci sizes (A4 baseline reference): 8, 13, 21, 34, 55 pt
const TYPOGRAPHY_RATIOS_FIBONACCI: TypographyRatios = {
  caption:  { sizeRatio: 8 / 12,   leadingMult: 1, bodyLines: 1, weight: "Regular" },
  body:     { sizeRatio: 13 / 12,  leadingMult: 1, bodyLines: 1, weight: "Regular" },
  subhead:  { sizeRatio: 21 / 12,  leadingMult: 2, bodyLines: 2, weight: "Regular" },
  headline: { sizeRatio: 34 / 12,  leadingMult: 3, bodyLines: 3, weight: "Bold" },
  display:  { sizeRatio: 55 / 12,  leadingMult: 6, bodyLines: 6, weight: "Bold" },
};

const TYPOGRAPHY_SCALE_MAP: Record<string, TypographyRatios> = {
  swiss: TYPOGRAPHY_RATIOS_SWISS,
  golden: TYPOGRAPHY_RATIOS_GOLDEN,
  fourth: TYPOGRAPHY_RATIOS_FOURTH,
  fifth: TYPOGRAPHY_RATIOS_FIFTH,
  fibonacci: TYPOGRAPHY_RATIOS_FIBONACCI,
};

export const TYPOGRAPHY_SCALE_LABELS: Record<string, string> = {
  swiss: "Swiss (Hand-tuned)",
  golden: "Golden Ratio (φ)",
  fibonacci: "Fibonacci (8, 13, 21, 34, 55)",
  fourth: "Perfect Fourth (4:3 ♪)",
  fifth: "Perfect Fifth (3:2 ♪)",
};

const MARGIN_METHOD_LABELS: Record<number, string> = {
  1: "Progressive (1:2:2:3)",
  2: "Van de Graaf (2:3:4:6)",
  3: "Baseline (1:1:1:1)",
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
  // Van de Graaf-inspired 2:3:4:6 ratio (top:left:right:bottom)
  // All margins are multiples of the baseline grid unit
  // Example with 12pt baseline and 1x:
  //   Top: 2×12 = 24pt, Left: 3×12 = 36pt, Right: 4×12 = 48pt, Bottom: 6×12 = 72pt
  // With 2x multiple: all values double

  return {
    top: gridUnit * 2.0 * baselineMultiple,     // 2× baseline × multiplier
    bottom: gridUnit * 6.0 * baselineMultiple,  // 6× baseline × multiplier
    left: gridUnit * 3.0 * baselineMultiple,    // 3× baseline × multiplier
    right: gridUnit * 4.0 * baselineMultiple,   // 4× baseline × multiplier
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

// Baseline defaults scale by √2 steps (matching A-series paper scaling)
// A4 = 12pt reference; each format step multiplies/divides by √2
const SQRT2 = Math.SQRT2;
const FOURTH_ROOT_2 = Math.sqrt(SQRT2);
export const FORMAT_BASELINES: Record<string, number> = {
  A0: Math.round(BASE_GRID_UNIT * 4 * 1000) / 1000,               // 48.000
  A1: Math.round(BASE_GRID_UNIT * 2 * SQRT2 * 1000) / 1000,       // 33.941
  A2: Math.round(BASE_GRID_UNIT * 2 * 1000) / 1000,               // 24.000
  A3: Math.round(BASE_GRID_UNIT * SQRT2 * 1000) / 1000,           // 16.971
  A4: BASE_GRID_UNIT,                                               // 12.000
  A5: Math.round(BASE_GRID_UNIT / SQRT2 * 1000) / 1000,           //  8.485
  A6: Math.round(BASE_GRID_UNIT / 2 * 1000) / 1000,               //  6.000
  // B-series sits between adjacent A-series sizes; use 2^(1/4) offset from A4.
  B0: Math.round(BASE_GRID_UNIT * 4 * FOURTH_ROOT_2 * 1000) / 1000, // 57.064
  B1: Math.round(BASE_GRID_UNIT * 2 * SQRT2 * FOURTH_ROOT_2 * 1000) / 1000, // 40.365
  B2: Math.round(BASE_GRID_UNIT * 2 * FOURTH_ROOT_2 * 1000) / 1000, // 28.541
  B3: Math.round(BASE_GRID_UNIT * SQRT2 * FOURTH_ROOT_2 * 1000) / 1000, // 20.182
  B4: Math.round(BASE_GRID_UNIT * FOURTH_ROOT_2 * 1000) / 1000,     // 14.270
  B5: Math.round(BASE_GRID_UNIT / SQRT2 * FOURTH_ROOT_2 * 1000) / 1000, // 10.091
  B6: Math.round(BASE_GRID_UNIT / 2 * FOURTH_ROOT_2 * 1000) / 1000, //  7.135
  LETTER: BASE_GRID_UNIT,                                           // 12.000
};

// Minimum baselines in usable height for typographic flexibility
const MIN_BASELINES = 24;
const BASELINE_HARD_CAP = 72;

// Top+bottom margin ratios per method (at 1× multiple)
const MARGIN_VERTICAL_UNITS: Record<number, number> = {
  1: 4,  // Progressive: 1+3
  2: 8,  // Van de Graaf: 2+6
  3: 2,  // Baseline: 1+1
};

/**
 * Dynamic maximum baseline: ensures at least MIN_BASELINES (24) fit in
 * the usable height after subtracting top+bottom margins.
 *
 * Solves: (pageHeight - marginUnits × B) / B >= 24
 *       → B <= pageHeight / (24 + marginUnits)
 */
export function getMaxBaseline(
  pageHeight: number,
  marginMethod: number,
  baselineMultiple: number,
  customMarginUnits?: number,
): number {
  const marginUnits = customMarginUnits
    ?? (MARGIN_VERTICAL_UNITS[marginMethod] ?? 4) * baselineMultiple;
  const maxDynamic = Math.floor(pageHeight / (MIN_BASELINES + marginUnits));
  return Math.min(BASELINE_HARD_CAP, maxDynamic);
}

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
  formatName: string,
  typographyScale: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci" = "swiss"
): GridResult["typography"] {
  const scaledStyles: GridResult["typography"]["styles"] = {};
  const ratios = TYPOGRAPHY_SCALE_MAP[typographyScale] ?? TYPOGRAPHY_RATIOS_SWISS;

  for (const [styleName, style] of Object.entries(ratios)) {
    // Font size = baseline × ratio (proportional across all formats)
    const scaledSize = gridUnit * style.sizeRatio;
    // Leading = baseline × multiplier (always baseline-aligned)
    const scaledLeading = gridUnit * style.leadingMult;

    scaledStyles[styleName] = {
      size: Math.round(scaledSize * 1000) / 1000,
      leading: Math.round(scaledLeading * 1000) / 1000,
      weight: style.weight,
      alignment: "Left",
      baselineMultiplier: style.leadingMult,
      bodyLines: style.bodyLines,
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
  const { format, orientation, marginMethod, gridCols, gridRows, baseline: customBaseline, baselineMultiple = 1.0, gutterMultiple = 1.0, typographyScale = "swiss" } = settings;

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
  // When customBaseline is set (manual mode), use that value
  // When undefined (auto mode), use format-specific baseline from table
  const gridUnit = customBaseline ?? FORMAT_BASELINES[format] ?? BASE_GRID_UNIT;
  const scale_factor = formatScaleFactor;

  let marginTop: number, marginBottom: number, marginLeft: number, marginRight: number;
  let gridMarginHorizontal: number, gridMarginVertical: number;

  if (settings.customMargins) {
    marginTop = settings.customMargins.top;
    marginBottom = settings.customMargins.bottom;
    marginLeft = settings.customMargins.left;
    marginRight = settings.customMargins.right;
    gridMarginHorizontal = gridUnit * gutterMultiple;
    gridMarginVertical = gridUnit * gutterMultiple;
  } else {
    const marginCalculator = MARGIN_CALCULATORS[marginMethod];
    const margins = marginCalculator(gridUnit, w, h, gridCols, gridRows, baselineMultiple);
    ({ top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight } = margins);
    gridMarginHorizontal = gridUnit * gutterMultiple;
    gridMarginVertical = gridUnit * gutterMultiple;
  }

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
  let baselineUnitsPerCell = Math.floor(unitsPerCell);

  if (baselineUnitsPerCell < 2) {
    baselineUnitsPerCell = 2;
  }

  const cellHeight = baselineUnitsPerCell * gridUnit;
  const modH = cellHeight - gridMarginVertical;

  // Recalculate actual net_h to match aligned modules
  const netHAligned = gridRows * modH + (gridRows - 1) * gridMarginVertical;


  const typoSettings = generateTypographyStyles(scale_factor, gridUnit, format, typographyScale);

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
