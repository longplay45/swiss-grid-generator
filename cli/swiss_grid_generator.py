#!/usr/bin/env python3
"""
Swiss Grid Generator
====================

A comprehensive tool for generating Swiss-style grid assets based on the principles
detailed in "Grid Systems in Graphic Design" by Josef Müller-Brockmann.

Key Müller-Brockmann principles implemented:
- Proportional grid divisions using mathematical ratios (Van de Graaf canon, golden section)
- Progressive margins (1:2:3, 2:3:4:6 ratios) for visual harmony
- Baseline grids aligned to typographic leading
- Module-based layouts for rhythm and consistency
- Scaling across formats while maintaining proportional relationships
- Functional clarity: grid serves content, not vice versa

Reference: Müller-Brockmann, Josef. "Grid Systems in Graphic Design."
Arthur Niggli Ltd, Teufen, 1981.
"""

import argparse
import json
import math
import sys
import termios
import tty
from decimal import Decimal, getcontext
from typing import Dict, List, Tuple, Any, Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

# Set high precision for decimal calculations
getcontext().prec = 10

# ============================================================================
# CONSTANTS - A-SERIES FORMATS IN POINTS (ISO 216)
# ============================================================================
# Müller-Brockmann emphasizes working with standardized formats. A-series is
# the European standard based on √2 aspect ratio, maintaining consistent
# proportions when scaling (A0 → A1 → A2, etc.)

FORMATS_PT: Dict[str, Tuple[float, float]] = {
    "A6": (297.638, 419.528),   # 105 × 148 mm
    "A5": (419.528, 595.276),   # 148 × 210 mm
    "A4": (595.276, 841.890),   # 210 × 297 mm - Base reference format
    "A3": (841.890, 1190.551),  # 297 × 420 mm
    "A2": (1190.551, 1683.780), # 420 × 594 mm
    "A1": (1683.780, 2383.937), # 594 × 841 mm
    "A0": (2383.937, 3370.394), # 841 × 1189 mm
}

# Base typographic values for A4 (Müller-Brockmann's reference format)
# A4 baseline is 12pt - all typography relates to this baseline grid
BASE_GRID_UNIT = 12.0     # Baseline grid unit (pt) for A4
BASE_GUTTER = 6.0         # Gutter width (pt) - half the baseline for rhythm

# A4 Typography System - all sizes and leading relate to 12pt baseline
# Format: (size_pt, leading_pt, baseline_multiplier, body_line_multiplier)
A4_TYPOGRAPHY = {
    "caption": {"size": 7.0, "leading": 8.0, "baseline_mult": 0.67, "body_lines": 0.67, "weight": "Regular"},
    "footnote": {"size": 6.0, "leading": 12.0, "baseline_mult": 1.0, "body_lines": 1.0, "weight": "Regular"},
    "body": {"size": 10.0, "leading": 12.0, "baseline_mult": 1.0, "body_lines": 1.0, "weight": "Regular"},
    "lead": {"size": 12.0, "leading": 12.0, "baseline_mult": 1.0, "body_lines": 1.0, "weight": "Regular"},
    "subhead_small": {"size": 14.0, "leading": 24.0, "baseline_mult": 2.0, "body_lines": 2.0, "weight": "Bold"},
    "subhead_medium": {"size": 18.0, "leading": 24.0, "baseline_mult": 2.0, "body_lines": 2.0, "weight": "Bold"},
    "headline_3": {"size": 20.0, "leading": 24.0, "baseline_mult": 2.0, "body_lines": 2.0, "weight": "Bold"},
    "headline_2": {"size": 28.0, "leading": 36.0, "baseline_mult": 3.0, "body_lines": 3.0, "weight": "Bold"},
    "headline_1": {"size": 48.0, "leading": 48.0, "baseline_mult": 4.0, "body_lines": 4.0, "weight": "Bold"},
    "display": {"size": 72.0, "leading": 72.0, "baseline_mult": 6.0, "body_lines": 6.0, "weight": "Bold"},
}

# ============================================================================
# MÜLLER-BROCKMANN MARGIN CALCULATION METHODS
# ============================================================================

def calculate_progressive_margins(
    grid_unit: float,
    w: float,
    h: float,
    grid_cols: int,
    grid_rows: int,
    baseline_multiple: float = 1.0,
) -> Tuple[float, float, float, float, float, float]:
    """
    Method 1: Progressive Margins (1:2:2:3 ratio - Swiss modern)

    A modern Swiss-inspired approach using gentle progressive ratios.
    Top is smallest, left/right are equal (symmetric), bottom is largest.
    Creates visual weight shift downward for better flow.

    All margins are multiples of the baseline grid unit.
    Example with 12pt baseline:
      1x = 12:24:24:36pt (1:2:2:3)
      2x = 24:48:48:72pt (2:4:4:6)

    Reference: Müller-Brockmann-inspired contemporary practice

    Args:
        grid_unit: Baseline grid unit in points
        w: Page width in points
        h: Page height in points
        grid_cols: Number of horizontal modules (columns)
        grid_rows: Number of vertical modules (rows)
        baseline_multiple: Multiplier for baseline ratios (default 1.0)

    Returns:
        Tuple of (top, bottom, left, right, gutter_h, gutter_v) margins in points
    """
    # Progressive 1:2:2:3 ratio scaled by baseline_multiple
    margin_top = grid_unit * 1.0 * baseline_multiple
    margin_bottom = grid_unit * 3.0 * baseline_multiple
    margin_left = grid_unit * 2.0 * baseline_multiple
    margin_right = grid_unit * 2.0 * baseline_multiple

    # Gutters equal 1 baseline unit
    grid_margin_horizontal = grid_unit
    grid_margin_vertical = grid_unit

    return (
        margin_top,
        margin_bottom,
        margin_left,
        margin_right,
        grid_margin_horizontal,
        grid_margin_vertical,
    )


def calculate_vandegraaf_margins(
    grid_unit: float,
    w: float,
    h: float,
    grid_cols: int,
    grid_rows: int,
    baseline_multiple: float = 1.0,
) -> Tuple[float, float, float, float, float, float]:
    """
    Method 2: Van de Graaf Canon (2:3:4:6 as baseline multiples)

    Van de Graaf ratios adapted as baseline multiples for Swiss consistency.
    Left:top:right:bottom ratios scale with baselineMultiple.

    Example with 12pt baseline and 1x:
      Left: 1×12 = 12pt, Top: 2×12 = 24pt, Right: 1.5×12 = 18pt, Bottom: 3×12 = 36pt
    With 2x multiple: all values double

    Reference: Van de Graaf canon, Müller-Brockmann p. 84-87

    Args:
        grid_unit: Baseline grid unit in points
        w: Page width in points
        h: Page height in points
        grid_cols: Number of horizontal modules (columns)
        grid_rows: Number of vertical modules (rows)
        baseline_multiple: Multiplier for baseline ratios (default 1.0)

    Returns:
        Tuple of (top, bottom, left, right, gutter_h, gutter_v) margins in points
    """
    # Van de Graaf-inspired ratios as baseline multiples
    margin_left = grid_unit * 1.0 * baseline_multiple
    margin_top = grid_unit * 2.0 * baseline_multiple
    margin_right = grid_unit * 1.5 * baseline_multiple
    margin_bottom = grid_unit * 3.0 * baseline_multiple

    # Gutters equal 1 baseline unit
    grid_margin_horizontal = grid_unit
    grid_margin_vertical = grid_unit

    return (
        margin_top,
        margin_bottom,
        margin_left,
        margin_right,
        grid_margin_horizontal,
        grid_margin_vertical,
    )


def calculate_grid_based_margins(
    grid_unit: float,
    w: float,
    h: float,
    grid_cols: int,
    grid_rows: int,
    baseline_multiple: float = 1.0,
) -> Tuple[float, float, float, float, float, float]:
    """
    Method 3: Grid-Based Margins (baseline multiples - pure Müller-Brockmann)

    Pure Müller-Brockmann approach: margins as baseline multiples for perfect
    grid harmony. All margins are multiples of the baseline unit, ensuring
    the entire layout—including gutters—feels unified.

    Uses symmetric margins (common for single sheets/posters in Swiss style).
    User-defined baselines all around = clean, balanced, and grid-aligned.

    This is the purest Swiss approach, where margins relate directly to
    the vertical rhythm of the typography system.

    Reference: Müller-Brockmann, p. 102-107 (Module-based construction)

    Args:
        grid_unit: Baseline grid unit in points
        w: Page width in points
        h: Page height in points
        grid_cols: Number of horizontal modules (columns)
        grid_rows: Number of vertical modules (rows)
        baseline_multiple: Multiplier for baseline (default 1.0)

    Returns:
        Tuple of (top, bottom, left, right, gutter_h, gutter_v) margins in points
    """
    # Pure Müller-Brockmann approach: margins as baseline multiples
    # All margins equal baseline_multiple × grid_unit

    margin_top = baseline_multiple * grid_unit
    margin_bottom = baseline_multiple * grid_unit
    margin_left = baseline_multiple * grid_unit
    margin_right = baseline_multiple * grid_unit

    # Gutters equal 1 baseline unit (Müller-Brockmann's recommendation)
    grid_margin_horizontal = grid_unit
    grid_margin_vertical = grid_unit

    return (
        margin_top,
        margin_bottom,
        margin_left,
        margin_right,
        grid_margin_horizontal,
        grid_margin_vertical,
    )


# Margin calculation dispatcher
MARGIN_CALCULATORS = {
    1: calculate_progressive_margins,
    2: calculate_vandegraaf_margins,
    3: calculate_grid_based_margins,
}

MARGIN_METHOD_LABELS = {
    1: "Progressive (1:2:2:3)",
    2: "Van de Graaf (page/9)",
    3: "Grid-based (baseline multiples)",
}

# ============================================================================
# TYPOGRAPHY SCALING (Müller-Brockmann Principles)
# ============================================================================

def calculate_scale_factor(format_name: str, orientation: str) -> float:
    """
    Calculate scale factor relative to A4.

    Müller-Brockmann uses A4 as the reference format (210×297mm). All other
    formats scale proportionally, maintaining the same grid relationships.
    The scale factor ensures typography and grid units scale appropriately.

    Scaling uses the smaller dimension to ensure consistency in both
    portrait and landscape orientations.
    """
    a4_w, a4_h = FORMATS_PT["A4"]
    w, h = FORMATS_PT[format_name]

    if orientation == "landscape":
        w, h = h, w

    # Use minimum dimension for consistent scaling
    scale_factor = min(w / a4_w, h / a4_h)

    return scale_factor


def generate_typography_styles(
    scale_factor: float,
    grid_unit: float,
    format_name: str,
) -> Dict[str, Any]:
    """
    Generate comprehensive typography styles based on A4 reference.

    Swiss Design Principle: All typography aligns to baseline grid.
    - Font sizes scale by format (scale_factor)
    - Leading maintains relationship to baseline grid
    - Based on A4 reference with 12pt baseline

    The system includes 10 styles from caption to display type.
    """
    scaled_styles = {}

    for style_name, a4_style in A4_TYPOGRAPHY.items():
        # Scale size by format, but keep leading in baseline relationship
        scaled_size = a4_style["size"] * scale_factor
        scaled_leading = a4_style["leading"] * (grid_unit / BASE_GRID_UNIT)

        scaled_styles[style_name] = {
            "size": round(scaled_size, 3),
            "leading": round(scaled_leading, 3),
            "weight": a4_style["weight"],
            "alignment": "Left",
            "baseline_multiplier": a4_style["baseline_mult"],
            "body_lines": a4_style["body_lines"],
        }

    typo_settings = {
        "metadata": {
            "format": format_name,
            "unit": "pt",
            "baseline_grid": round(grid_unit, 3),
            "a4_baseline": BASE_GRID_UNIT,
            "scale_factor": round(scale_factor, 3),
        },
        "styles": scaled_styles,
    }

    return typo_settings


# ============================================================================
# SVG GENERATION
# ============================================================================

def generate_grid_gutters_svg(
    w: float,
    h: float,
    margin_left: float,
    margin_right: float,
    margin_top: float,
    margin_bottom: float,
    mod_w: float,
    mod_h: float,
    grid_modules: int,
    grid_margin_horizontal: float,
    grid_margin_vertical: float,
) -> str:
    """
    Generate SVG showing grid modules with gutters.

    Müller-Brockmann visualizes grids as rectangles separated by gutters.
    This SVG shows the modular structure clearly, which is fundamental to
    understanding grid-based layouts.
    """

    # SVG header with precise dimensions
    svg_parts = [
        f'<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg width="{w:.3f}" height="{h:.3f}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.3f} {h:.3f}">',
        f'  <defs>',
        f'    <pattern id="gridPattern" width="{mod_w + grid_margin_horizontal:.3f}" height="{mod_h + grid_margin_vertical:.3f}" patternUnits="userSpaceOnUse">',
        f'      <rect x="0" y="0" width="{mod_w:.3f}" height="{mod_h:.3f}" fill="none" stroke="cyan" stroke-width="0.5" stroke-opacity="0.7"/>',
        f'    </pattern>',
        f'  </defs>',
        f'  <!-- Page background -->',
        f'  <rect width="100%" height="100%" fill="white"/>',
        f'  <!-- Page boundary -->',
        f'  <rect x="0" y="0" width="{w:.3f}" height="{h:.3f}" fill="none" stroke="gray" stroke-width="0.5"/>',
        f'  <!-- Content area boundary (dashed) -->',
        f'  <rect x="{margin_left:.3f}" y="{margin_top:.3f}" width="{w - margin_left - margin_right:.3f}" height="{h - margin_top - margin_bottom:.3f}" fill="none" stroke="blue" stroke-width="0.3" stroke-dasharray="2,2"/>',
    ]

    # Draw each module - explicit approach for clarity
    for r in range(grid_modules):
        for c in range(grid_modules):
            x = margin_left + c * (mod_w + grid_margin_horizontal)
            y = margin_top + r * (mod_h + grid_margin_vertical)
            svg_parts.append(
                f'  <rect x="{x:.3f}" y="{y:.3f}" width="{mod_w:.3f}" height="{mod_h:.3f}" '
                f'fill="none" stroke="cyan" stroke-width="0.5" stroke-opacity="0.7"/>'
            )

    # Add margin labels
    svg_parts.extend([
        f'  <!-- Margin labels -->',
        f'  <text x="{margin_left / 2:.3f}" y="{h / 2:.3f}" font-size="8" text-anchor="middle" transform="rotate(-90, {margin_left / 2:.3f}, {h / 2:.3f})" fill="gray">{margin_left:.1f}pt</text>',
        f'  <text x="{w - margin_right / 2:.3f}" y="{h / 2:.3f}" font-size="8" text-anchor="middle" transform="rotate(90, {w - margin_right / 2:.3f}, {h / 2:.3f})" fill="gray">{margin_right if margin_right else 0:.1f}pt</text>',
        f'  <text x="{w / 2:.3f}" y="{margin_top / 2 + 3:.3f}" font-size="8" text-anchor="middle" fill="gray">{margin_top:.1f}pt</text>',
        f'  <text x="{w / 2:.3f}" y="{h - margin_bottom / 2 + 3:.3f}" font-size="8" text-anchor="middle" fill="gray">{margin_bottom if margin_bottom else 0:.1f}pt</text>',
    ])

    svg_parts.append('</svg>')

    return '\n'.join(svg_parts)


def generate_baselines_svg(
    w: float,
    h: float,
    margin_left: float,
    margin_right: float,
    margin_top: float,
    margin_bottom: float,
    grid_unit: float,
) -> str:
    """
    Generate SVG showing baseline grid.

    The baseline grid is the foundation of typographic alignment in
    Müller-Brockmann's system. All text sits on these horizontal lines,
    creating vertical rhythm and consistency.
    """
    svg_parts = [
        f'<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg width="{w:.3f}" height="{h:.3f}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.3f} {h:.3f}">',
        f'  <!-- Page background -->',
        f'  <rect width="100%" height="100%" fill="white"/>',
        f'  <!-- Margin boundaries -->',
        f'  <rect x="{margin_left:.3f}" y="{margin_top:.3f}" width="{w - margin_left - margin_right:.3f}" height="{h - margin_top - margin_bottom:.3f}" fill="none" stroke="lightgray" stroke-width="0.3"/>',
        f'  <!-- Baseline grid -->',
    ]

    # Draw baseline lines across content area
    # Start from top margin and continue to bottom margin
    current_y = margin_top
    epsilon = 0.01  # Small value to handle floating-point precision

    while current_y <= (h - margin_bottom + epsilon):
        y_pos = current_y

        # Alternate line styles for readability
        line_num = int(round((current_y - margin_top) / grid_unit))
        stroke_color = "magenta" if line_num % 4 == 0 else "blue"
        stroke_width = 0.3 if line_num % 4 == 0 else 0.15
        stroke_opacity = 0.6 if line_num % 4 == 0 else 0.3

        svg_parts.append(
            f'  <line x1="{margin_left:.3f}" y1="{y_pos:.3f}" '
            f'x2="{w - margin_right:.3f}" y2="{y_pos:.3f}" '
            f'stroke="{stroke_color}" stroke-width="{stroke_width}" stroke-opacity="{stroke_opacity}"/>'
        )
        current_y += grid_unit

    # Add grid unit label
    svg_parts.extend([
        f'  <text x="{margin_left + 10:.3f}" y="{margin_top - 5:.3f}" font-size="8" fill="gray">Baseline grid: {grid_unit:.1f}pt</text>',
        f'</svg>',
    ])

    return '\n'.join(svg_parts)


# ============================================================================
# PDF GENERATION (Optional - requires reportlab)
# ============================================================================

def generate_baseline_grid_pdf(
    path: str,
    w: float,
    h: float,
    margin_left: float,
    margin_right: float,
    margin_top: float,
    margin_bottom: float,
    grid_unit: float,
    grid_margin_horizontal: float,
    grid_margin_vertical: float,
    grid_cols: int,
    grid_rows: int,
    mod_w: float = None,
    mod_h: float = None,
    typo_settings: Dict[str, Any] = None,
    format_name: str = None,
    orientation: str = None,
    margin_method: int = None,
    scale_factor: float = None,
) -> bool:
    """
    Generate PDF with filled modules, baseline grid, and sample typography.

    This creates a printable reference document showing both the modular
    grid structure, the baseline overlay, and sample typography aligned
    to the baseline grid - useful for visual reference and for overlaying
    on design work.

    Returns True if successful, False if reportlab not available.
    """
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch
    except ImportError:
        print("Note: reportlab not installed. PDF export skipped.", file=sys.stderr)
        print("Install with: pip install reportlab", file=sys.stderr)
        return False

    try:
        pdf = canvas.Canvas(path, pagesize=(w, h))

        # Use provided module dimensions or calculate them
        if mod_w is None or mod_h is None:
            net_w = w - (margin_left + margin_right)
            net_h = h - (margin_top + margin_bottom)
            mod_w = (net_w - (grid_cols - 1) * grid_margin_horizontal) / grid_cols
            mod_h = (net_h - (grid_rows - 1) * grid_margin_vertical) / grid_rows

        # Draw module backgrounds (alternating light gray)
        pdf.setFillColorRGB(0.96, 0.96, 0.96)
        for r in range(grid_rows):
            for c in range(grid_cols):
                # Alternate shading for visual clarity
                if (r + c) % 2 == 0:
                    x = margin_left + c * (mod_w + grid_margin_horizontal)
                    y = h - margin_top - (r + 1) * (mod_h + grid_margin_vertical)  # PDF y-axis is from bottom
                    pdf.rect(x, y, mod_w, mod_h, fill=1, stroke=0)

        # Draw module outlines
        pdf.setLineWidth(0.25)
        pdf.setStrokeColorRGB(0, 0.5, 1)
        for r in range(grid_rows):
            for c in range(grid_cols):
                x = margin_left + c * (mod_w + grid_margin_horizontal)
                y = h - margin_top - (r + 1) * (mod_h + grid_margin_vertical)
                pdf.rect(x, y, mod_w, mod_h, fill=0, stroke=1)

        # Draw baseline grid - spans entire document
        pdf.setLineWidth(0.15)
        pdf.setStrokeColorRGB(1, 0, 1)

        current_y = h  # Start from top of page
        epsilon = 0.01
        while current_y >= 0 - epsilon:  # Go to bottom of page
            # Emphasize every 4th line
            line_num = int(round((h - current_y) / grid_unit))
            if line_num % 4 == 0:
                pdf.setLineWidth(0.25)
                pdf.setStrokeColorRGB(1, 0, 1)
            else:
                pdf.setLineWidth(0.15)
                pdf.setStrokeColorRGB(1, 0, 1, alpha=0.5)

            pdf.line(0, current_y, w, current_y)  # Full width of page
            current_y -= grid_unit

        # Draw footer text (always 7pt) - positioned at bottom with margin
        footer_size = 7
        footer_line_height = 10  # 7pt + 3pt leading
        footer_y_start = margin_bottom - 25  # Start 25pt from bottom margin edge

        pdf.setFont("Helvetica", footer_size)
        pdf.setFillColorRGB(0.3, 0.3, 0.3)  # Dark gray for better readability

        # Line 1 (top line of footer)
        line1 = "Based on Muller-Brockmann's Grid Systems in Graphic Design (1981)."
        pdf.drawString(margin_left, footer_y_start, line1)

        # Line 2
        line2 = "Copyleft & -right 2026 by https://lp45.net"
        pdf.drawString(margin_left, footer_y_start - footer_line_height, line2)

        # Line 3 (bottom line of footer)
        line3 = "License MIT. Source Code: https://github.com/longplay45/swiss-grid-generator"
        pdf.drawString(margin_left, footer_y_start - footer_line_height * 2, line3)

        pdf.save()
        return True

    except Exception as e:
        print(f"Error generating PDF: {e}", file=sys.stderr)
        return False


# ============================================================================
# SUMMARY GENERATION
# ============================================================================

def build_summary(
    format_name: str,
    orientation: str,
    margin_method: int,
    grid_cols: int,
    grid_rows: int,
    w: float,
    h: float,
    grid_unit: float,
    grid_margin_horizontal: float,
    grid_margin_vertical: float,
    margin_top: float,
    margin_bottom: float,
    margin_left: float,
    margin_right: float,
    gutter: float,
    net_w: float,
    net_h: float,
    mod_w: float,
    mod_h: float,
    typo_settings: Dict[str, Any],
    scale_factor: float,
    json_path: str,
    pdf_path: str,
    baseline_units_per_cell: int = None,
) -> Dict[str, Any]:
    """
    Build comprehensive summary dictionary of the grid system.

    This summary captures all calculated values for documentation and
    user reference, following Müller-Brockmann's documentation style.
    """
    # Calculate baseline units per cell if not provided
    if baseline_units_per_cell is None:
        cell_height = mod_h + grid_margin_vertical
        baseline_units_per_cell = round(cell_height / grid_unit)

    return {
        "format": format_name,
        "settings": {
            "orientation": orientation,
            "margin_method": MARGIN_METHOD_LABELS.get(margin_method, f"Method {margin_method}"),
            "margin_method_id": margin_method,
            "grid_cols": grid_cols,
            "grid_rows": grid_rows,
        },
        "page_size_pt": {
            "width": round(w, 3),
            "height": round(h, 3),
        },
        "grid": {
            "grid_unit": round(grid_unit, 3),
            "grid_margin_horizontal": round(grid_margin_horizontal, 3),
            "grid_margin_vertical": round(grid_margin_vertical, 3),
            "margins": {
                "top": round(margin_top, 3),
                "bottom": round(margin_bottom, 3),
                "left": round(margin_left, 3),
                "right": round(margin_right, 3),
            },
            "gutter": round(gutter, 3),
            "scale_factor": round(scale_factor, 3),
            "baseline_units_per_cell": baseline_units_per_cell,
        },
        "content_area": {
            "width": round(net_w, 3),
            "height": round(net_h, 3),
        },
        "module": {
            "width": round(mod_w, 3),
            "height": round(mod_h, 3),
            "aspect_ratio": round(mod_w / mod_h, 3),
        },
        "typography": {
            "metadata": typo_settings["metadata"],
            "styles": {
                name: {
                    "size": round(vals["size"], 3),
                    "leading": round(vals["leading"], 3),
                    "weight": vals["weight"],
                    "alignment": vals["alignment"],
                }
                for name, vals in typo_settings["styles"].items()
            },
        },
        "outputs": {
            "grid_json": json_path,
            "baseline_grid_pdf": pdf_path,
        },
        "principles": {
            "reference": "Müller-Brockmann, Grid Systems in Graphic Design (1981)",
            "baseline_alignment": "All typography aligns to baseline grid",
            "modular_consistency": "Grid modules maintain proportional relationships",
            "scalability": "System scales across A-series formats",
        },
    }


def generate_text_format(summary: Dict[str, Any]) -> str:
    """
    Generate human-readable text format of grid parameters.

    Creates a plain text representation suitable for reference or
    inclusion in documentation.
    """
    lines = []
    lines.append("=" * 70)
    lines.append("SWISS GRID SYSTEM - PARAMETERS")
    lines.append("=" * 70)
    lines.append("")

    # Settings
    lines.append("SETTINGS")
    lines.append("-" * 70)
    lines.append(f"  Format:          {summary['format']}")
    lines.append(f"  Orientation:     {summary['settings']['orientation']}")
    lines.append(f"  Margin Method:   {summary['settings']['margin_method']}")
    lines.append(f"  Grid:            {summary['settings']['grid_cols']} cols × {summary['settings']['grid_rows']} rows")
    lines.append("")

    # Page Dimensions
    lines.append("PAGE DIMENSIONS")
    lines.append("-" * 70)
    lines.append(f"  Page Size:       {summary['page_size_pt']['width']:.3f} × {summary['page_size_pt']['height']:.3f} pt")
    lines.append(f"  Content Area:    {summary['content_area']['width']:.3f} × {summary['content_area']['height']:.3f} pt")
    lines.append(f"  Module Size:     {summary['module']['width']:.3f} × {summary['module']['height']:.3f} pt")
    lines.append(f"  Aspect Ratio:    {summary['module']['aspect_ratio']:.3f}")
    lines.append(f"  Scale Factor:    {summary['grid']['scale_factor']:.3f}× (relative to A4)")
    lines.append("")

    # Gutter Configuration
    lines.append("GUTTER CONFIGURATION")
    lines.append("-" * 70)
    lines.append(f"  Baseline Grid:   {summary['grid']['grid_unit']:.3f} pt")
    lines.append(f"  H. Gutter:       {summary['grid']['grid_margin_horizontal']:.3f} pt")
    lines.append(f"  V. Gutter:       {summary['grid']['grid_margin_vertical']:.3f} pt")

    if "baseline_units_per_cell" in summary["grid"]:
        baseline_units = summary["grid"]["baseline_units_per_cell"]
        cell_height = baseline_units * summary["grid"]["grid_unit"]
        lines.append(f"  Cell Height:     {cell_height:.3f} pt ({baseline_units} baseline units)")

    margins = summary["grid"]["margins"]
    lines.append(f"  Margins:         T:{margins['top']:.3f} B:{margins['bottom']:.3f} L:{margins['left']:.3f} R:{margins['right']:.3f}")
    lines.append("")

    # Typography System
    lines.append("TYPOGRAPHY SYSTEM")
    lines.append("-" * 70)
    lines.append(f"  {'Style':<12} {'Size':<12} {'Leading':<12} {'Weight':<10} {'Alignment'}")
    lines.append(f"  {'-'*12} {'-'*12} {'-'*12} {'-'*10} {'-'*10}")

    for style_name, style_vals in summary["typography"]["styles"].items():
        size_str = f"{style_vals['size']:.3f} pt"
        leading_str = f"{style_vals['leading']:.3f} pt"
        weight = style_vals['weight']
        alignment = style_vals['alignment']
        lines.append(f"  {style_name.capitalize():<12} {size_str:<12} {leading_str:<12} {weight:<10} {alignment}")

    lines.append("")

    # Design Principles
    lines.append("SWISS DESIGN PRINCIPLES")
    lines.append("-" * 70)
    lines.append(f"  Reference:  {summary['principles']['reference']}")
    lines.append(f"  ✓ {summary['principles']['baseline_alignment']}")
    lines.append(f"  ✓ {summary['principles']['modular_consistency']}")
    lines.append(f"  ✓ {summary['principles']['scalability']}")
    lines.append("")

    # Output Files
    lines.append("OUTPUT FILES")
    lines.append("-" * 70)
    lines.append(f"  Grid JSON:   {summary['outputs']['grid_json']}")
    if "grid_txt" in summary["outputs"]:
        lines.append(f"  Grid TXT:    {summary['outputs']['grid_txt']}")
    lines.append(f"  Grid PDF:    {summary['outputs']['baseline_grid_pdf']}")
    lines.append("")

    lines.append("=" * 70)
    lines.append("")
    lines.append("Copyleft & -right 2026 by https://lp45.net")
    lines.append("License MIT. Source Code: https://github.com/longplay45/swiss-grid-generator")

    return "\n".join(lines)


def pretty_print_summary(summary: Dict[str, Any]) -> None:
    """
    Display formatted summary using Rich tables.

    Provides clear, organized output showing all grid parameters,
    following the Swiss design principle of clarity and order.
    """
    console = Console()

    # Settings table
    settings_table = Table(show_header=False, box=None)
    settings_table.add_column("Parameter", style="dim")
    settings_table.add_column("Value")
    settings_table.add_row("Orientation", summary["settings"]["orientation"])
    settings_table.add_row("Margin method", summary["settings"]["margin_method"])
    settings_table.add_row(
        "Grid",
        f'{summary["settings"]["grid_cols"]} cols × {summary["settings"]["grid_rows"]} rows',
    )

    # Page dimensions table
    page_table = Table(show_header=False, box=None)
    page_table.add_column("Parameter", style="dim")
    page_table.add_column("Value")
    page_table.add_row("Format", summary["format"])
    page_table.add_row(
        "Page size",
        f'{summary["page_size_pt"]["width"]:.1f} × {summary["page_size_pt"]["height"]:.1f} pt',
    )
    page_table.add_row(
        "Content area",
        f'{summary["content_area"]["width"]:.3f} × {summary["content_area"]["height"]:.3f} pt',
    )
    page_table.add_row(
        "Module size",
        f'{summary["module"]["width"]:.3f} × {summary["module"]["height"]:.3f} pt '
        f'(ratio: {summary["module"]["aspect_ratio"]:.2f})',
    )
    page_table.add_row(
        "Scale factor",
        f'{summary["grid"]["scale_factor"]:.3f}× (relative to A4)',
    )

    # Gutter and margins table
    grid_table = Table(show_header=False, box=None)
    grid_table.add_column("Parameter", style="dim")
    grid_table.add_column("Value")
    grid_table.add_row(
        "Baseline grid",
        f'{summary["grid"]["grid_unit"]:.3f} pt',
    )
    grid_table.add_row(
        "Horizontal gutter",
        f'{summary["grid"]["grid_margin_horizontal"]:.3f} pt',
    )
    grid_table.add_row(
        "Vertical gutter",
        f'{summary["grid"]["grid_margin_vertical"]:.3f} pt',
    )

    # Show baseline units per cell for alignment verification
    if "baseline_units_per_cell" in summary["grid"]:
        baseline_units = summary["grid"]["baseline_units_per_cell"]
        cell_height = baseline_units * summary["grid"]["grid_unit"]
        grid_table.add_row(
            "Cell height",
            f'{cell_height:.3f} pt ({baseline_units} baseline units)',
        )

    margins = summary["grid"]["margins"]
    grid_table.add_row("Margins", f'T: {margins["top"]:.3f} | B: {margins["bottom"]:.3f} | L: {margins["left"]:.3f} | R: {margins["right"]:.3f}')
    grid_table.add_row(
        "Margin ratio",
        f'{margins["left"]/margins["top"]:.1f}:{margins["bottom"]/margins["top"]:.1f}:{margins["top"]/margins["top"]:.1f}'
    )

    # Typography table
    typo_table = Table(show_header=True, header_style="bold cyan", box=None)
    typo_table.add_column("Style", style="bold")
    typo_table.add_column("Size", justify="right")
    typo_table.add_column("Leading", justify="right")
    typo_table.add_column("Weight")
    typo_table.add_column("Alignment")

    for name, values in summary["typography"]["styles"].items():
        typo_table.add_row(
            name.capitalize(),
            f'{values["size"]:.3f} pt',
            f'{values["leading"]:.3f} pt',
            values["weight"],
            values["alignment"],
        )

    # Outputs table
    outputs_table = Table(show_header=False, box=None)
    outputs_table.add_column("Output", style="dim")
    outputs_table.add_column("Path")
    outputs_table.add_row("Grid parameters JSON", summary["outputs"]["grid_json"])
    if "grid_txt" in summary["outputs"]:
        outputs_table.add_row("Grid parameters TXT", summary["outputs"]["grid_txt"])
    outputs_table.add_row("Baseline grid PDF", summary["outputs"]["baseline_grid_pdf"])

    # Print panels
    console.print(Panel(settings_table, title="[bold]Settings[/bold]", border_style="blue"))
    console.print()
    console.print(Panel(page_table, title="[bold]Page Dimensions[/bold]", border_style="blue"))
    console.print()
    console.print(Panel(grid_table, title="[bold]Grid & Margins[/bold]", border_style="blue"))
    console.print()
    console.print(Panel(typo_table, title="[bold]Typography System[/bold]", border_style="cyan"))
    console.print()
    console.print(Panel(outputs_table, title="[bold]Generated Files[/bold]", border_style="green"))
    console.print()

    # Design principles note
    console.print(
        Panel(
            f"[dim]{summary['principles']['reference']}\n"
            f"✓ Baseline alignment: {summary['principles']['baseline_alignment']}\n"
            f"✓ Modular consistency: {summary['principles']['modular_consistency']}\n"
            f"✓ Format scalability: {summary['principles']['scalability']}[/dim]",
            title="[bold]Swiss Design Principles[/bold]",
            border_style="bright_black",
        )
    )


# ============================================================================
# MAIN GENERATION FUNCTION
# ============================================================================

def generate_swiss_grid_assets(
    format_name: str = "A4",
    margin_method: int = 1,
    orientation: str = "portrait",
    grid_cols: int = 9,
    grid_rows: int = 9,
    custom_baseline: float = None,
) -> Tuple[Dict[str, Any], Dict[str, bytes], str, Dict[str, Any]]:
    """
    Generate complete Swiss grid system assets.

    This is the main generation function that orchestrates the entire
    grid calculation process according to Müller-Brockmann's principles.

    Args:
        format_name: A-series format (A0-A6)
        margin_method: 1=Progressive, 2=Van de Graaf, 3=Grid-based
        orientation: portrait or landscape
        grid_cols: Number of horizontal modules (columns)
        grid_rows: Number of vertical modules (rows)
        custom_baseline: Custom baseline unit in points (None for auto)

    Returns:
        Tuple of (summary_dict, outputs_dict, pdf_path)

    Raises:
        ValueError: If invalid parameters provided
    """
    # Validate inputs
    if format_name not in FORMATS_PT:
        raise ValueError(f"Unsupported format: {format_name}. Use: {', '.join(FORMATS_PT.keys())}")

    if margin_method not in MARGIN_CALCULATORS:
        raise ValueError(f"Unsupported margin method: {margin_method}. Use: 1, 2, or 3")

    if grid_cols < 1 or grid_rows < 1:
        raise ValueError(f"Grid dimensions must be positive integers. Got: {grid_cols}x{grid_rows}")

    if orientation not in ("portrait", "landscape"):
        raise ValueError(f"Unsupported orientation: {orientation}. Use: portrait or landscape")

    # Get page dimensions
    w, h = FORMATS_PT[format_name]
    if orientation == "landscape":
        w, h = h, w

    # Calculate scale factor for format-based typography scaling
    format_scale_factor = calculate_scale_factor(format_name, orientation)

    # Use custom baseline if provided, otherwise scale from base
    if custom_baseline is not None:
        grid_unit = custom_baseline
        # For typography, use format scale factor, not baseline scale factor
        scale_factor = format_scale_factor
    else:
        grid_unit = BASE_GRID_UNIT * format_scale_factor
        scale_factor = format_scale_factor

    base_gutter = BASE_GUTTER * scale_factor

    # Calculate margins using selected method
    margin_calculator = MARGIN_CALCULATORS[margin_method]
    (
        margin_top,
        margin_bottom,
        margin_left,
        margin_right,
        grid_margin_horizontal,
        grid_margin_vertical,
    ) = margin_calculator(grid_unit, w, h, grid_cols, grid_rows)

    # Use calculated horizontal gutter consistently
    gutter = grid_margin_horizontal

    # Generate typography styles
    typo_settings = generate_typography_styles(scale_factor, grid_unit, format_name)

    # Calculate content area and module dimensions
    # Müller-Brockmann: Content area = page area - margins
    # IMPORTANT: Snap margins to baseline grid for proper alignment
    margin_top = round(margin_top / grid_unit) * grid_unit
    margin_bottom = round(margin_bottom / grid_unit) * grid_unit

    net_w = w - (margin_left + margin_right)
    net_h = h - (margin_top + margin_bottom)

    # Module dimensions with BASELINE ALIGNMENT
    # Müller-Brockmann principle: Each module cell should span an integer number
    # of baseline units. This ensures module boundaries align with baselines.

    # Width: Calculate directly from columns
    mod_w = (net_w - (grid_cols - 1) * grid_margin_horizontal) / grid_cols

    # Height: For vertical alignment, calculate baseline units per cell
    total_vertical_units = round(net_h / grid_unit)
    units_per_cell = total_vertical_units / grid_rows

    # Ensure integer units per cell (floor to prevent overflow)
    baseline_units_per_cell = int(units_per_cell)
    if baseline_units_per_cell < 2:
        baseline_units_per_cell = 2  # Minimum 2 units per cell

    # Now calculate module height based on aligned cell height
    cell_height = baseline_units_per_cell * grid_unit
    mod_h = cell_height - grid_margin_vertical

    # Recalculate actual net_h to match aligned modules
    net_h_aligned = grid_rows * mod_h + (grid_rows - 1) * grid_margin_vertical

    # Adjust bottom margin to use remaining space (maintains top margin alignment)
    margin_bottom = h - margin_top - net_h_aligned

    # Generate file paths - JSON, PDF, and TXT
    safe_orientation = orientation.lower()
    safe_method = f"method{margin_method}"
    baseline_str = f"{grid_unit:.0f}pt"  # Baseline value without decimals for filename
    base_filename = f"{format_name.lower()}_{safe_orientation}_{grid_cols}x{grid_rows}_{safe_method}_baseline{baseline_str}"

    json_path = f"{base_filename}_grid.json"
    txt_path = f"{base_filename}_grid.txt"
    pdf_path = f"{base_filename}_grid.pdf"

    # Build summary first (needed for complete JSON export)
    summary = build_summary(
        format_name, orientation, margin_method, grid_cols, grid_rows,
        w, h, grid_unit, grid_margin_horizontal, grid_margin_vertical,
        margin_top, margin_bottom, margin_left, margin_right, gutter,
        net_w, net_h_aligned, mod_w, mod_h,
        typo_settings, scale_factor,
        json_path, pdf_path,
        baseline_units_per_cell,
    )

    # Update summary with txt path
    summary["outputs"]["grid_txt"] = txt_path

    # Generate outputs - complete summary as JSON and TXT
    json_content = json.dumps(summary, indent=2)
    txt_content = generate_text_format(summary)

    # Prepare outputs dictionary
    outputs = {
        json_path: json_content.encode("utf-8"),
        txt_path: txt_content.encode("utf-8"),
    }

    return summary, outputs, pdf_path, typo_settings


def export_swiss_assets(
    format_name: str = "A4",
    margin_method: int = 1,
    orientation: str = "portrait",
    grid_cols: int = 9,
    grid_rows: int = 9,
    custom_baseline: float = None,
) -> Tuple[Dict[str, Any], Dict[str, bytes]]:
    """
    Generate and export Swiss grid assets to files.

    Args:
        format_name: A-series format
        margin_method: Margin calculation method (1, 2, or 3)
        orientation: portrait or landscape
        grid_cols: Number of columns
        grid_rows: Number of rows
        custom_baseline: Custom baseline unit in points (None for auto)

    Returns:
        Tuple of (summary_dict, outputs_dict)
    """
    summary, outputs, pdf_path, typo_settings = generate_swiss_grid_assets(
        format_name, margin_method, orientation, grid_cols, grid_rows, custom_baseline
    )

    # Write JSON output file
    for path, content in outputs.items():
        try:
            with open(path, "wb") as f:
                f.write(content)
        except IOError as e:
            print(f"Error writing {path}: {e}", file=sys.stderr)

    # Generate PDF
    success = generate_baseline_grid_pdf(
        pdf_path,
        summary["page_size_pt"]["width"],
        summary["page_size_pt"]["height"],
        summary["grid"]["margins"]["left"],
        summary["grid"]["margins"]["right"],
        summary["grid"]["margins"]["top"],
        summary["grid"]["margins"]["bottom"],
        summary["grid"]["grid_unit"],
        summary["grid"]["grid_margin_horizontal"],
        summary["grid"]["grid_margin_vertical"],
        summary["settings"]["grid_cols"],
        summary["settings"]["grid_rows"],
        summary["module"]["width"],
        summary["module"]["height"],
        typo_settings,
        summary["format"],
        summary["settings"]["orientation"],
        summary["settings"]["margin_method_id"],
        summary["grid"]["scale_factor"],
    )

    if not success:
        print(f"Warning: Failed to generate PDF: {pdf_path}", file=sys.stderr)

    return summary, outputs


# ============================================================================
# INTERACTIVE TUI (Terminal User Interface)
# ============================================================================

def read_single_key() -> str:
    """Read a single keypress from stdin."""
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch = sys.stdin.read(1)
        # Handle escape sequences (arrows)
        if ch == "\x1b":
            ch += sys.stdin.read(2)
        return ch
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)


def select_option(title: str, options: List[str], default_index: int = 0) -> str:
    """
    Interactive menu selection using arrow keys.

    Müller-Brockmann values clarity in communication - this TUI follows
    that principle with clean, unambiguous navigation.
    """
    index = default_index
    console = Console()

    while True:
        console.clear()
        console.print(title, style="bold cyan", justify="center")
        console.print()

        for i, option in enumerate(options):
            if i == index:
                console.print(f"  → [bold white on blue] {option} [/]", highlight=False)
            else:
                console.print(f"    {option}")

        console.print()
        console.print("[dim]↑↓ Navigate  •  Enter to select[/dim]", justify="center")

        key = read_single_key()

        if key in ("\x1b[A", "k"):  # Up arrow
            index = (index - 1) % len(options)
        elif key in ("\x1b[B", "j"):  # Down arrow
            index = (index + 1) % len(options)
        elif key in ("\r", "\n"):  # Enter
            return options[index]
        elif key == "\x03":  # Ctrl+C
            raise KeyboardInterrupt()


def interactive_mode() -> Tuple[str, int, str, int, int]:
    """
    Run interactive TUI for parameter selection.

    Provides user-friendly selection of all grid parameters with
    clear explanations following Swiss design principles.
    """
    console = Console()

    # Welcome screen
    console.print()
    console.print(
        Panel(
            "[bold cyan]Swiss Grid Generator[/bold cyan]\n\n"
            "Based on Müller-Brockmann's [italic]Grid Systems in Graphic Design[/italic] (1981)\n"
            "Copyleft & -right 2026 by https://lp45.net\n"
            "License MIT. Source Code: https://github.com/longplay45/swiss-grid-generator\n\n"
            "Generate professional Swiss-style grid PDF, JSON, and TXT\n\n"
            "[dim]Navigate with arrow keys • Select with Enter[/dim]",
            border_style="cyan",
            padding=(1, 2),
        )
    )
    console.print()
    console.print("[dim]Press any key to continue...[/dim]")
    read_single_key()

    # Select format
    formats = sorted(FORMATS_PT.keys())
    format_display = [f"{f} - {FORMATS_PT[f][0]/28.3465:.0f}×{FORMATS_PT[f][1]/28.3465:.0f}mm" for f in formats]
    selected = select_option("Select Page Format", format_display, formats.index("A4"))
    format_name = formats[format_display.index(selected)]

    # Select orientation
    orientation = select_option(
        "Select Orientation",
        ["Portrait - Vertical layout", "Landscape - Horizontal layout"],
        0,
    )
    orientation = orientation.split()[0].lower()

    # Select columns
    col_options = [str(i) for i in range(1, 14)]
    selected = select_option("Select Number of Columns (1-13)", col_options, 8)  # Default to 9
    grid_cols = int(selected)

    # Select rows
    row_options = [str(i) for i in range(1, 14)]
    selected = select_option("Select Number of Rows (1-13)", row_options, 8)  # Default to 9
    grid_rows = int(selected)

    # Select margin method
    margin_options = [
        "Method 1: Progressive margins (1:2:3 ratio)",
        "Method 2: Van de Graaf ratios (2:3:4:6)",
        "Method 3: Grid-based margins (module units)",
    ]
    selected = select_option("Select Margin Method", margin_options, 0)
    # Extract the method number (e.g., "Method 1" -> 1)
    # Split by space, get second element "1:", remove trailing ":"
    margin_method = int(selected.split()[1].rstrip(":"))

    return format_name, margin_method, orientation, grid_cols, grid_rows


# ============================================================================
# CLI INTERFACE
# ============================================================================

def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        prog="swiss_grid_generator",
        description="Generate Swiss-style grid baseline PDF based on Müller-Brockmann's principles",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                              # Interactive mode
  %(prog)s --format A4 --grid 9x9       # Quick A4 with 9×9 grid
  %(prog)s --format A3 --landscape      # A3 landscape with defaults
  %(prog)s --format A2 --margin 2       # A2 with Van de Graaf margins
  %(prog)s --format A0 --grid 12x12     # A0 with 12×12 grid
  %(prog)s --format A4 --grid 2x4       # A4 with 2 columns × 4 rows
  %(prog)s --format A4 --grid 2x4 --baseline 24  # Custom 24pt baseline

Margin Methods (Müller-Brockmann):
  1 - Progressive margins (1:2:3 ratio)
  2 - Van de Graaf ratios (2:3:4:6)
  3 - Grid-based margins (module units)

Output:
  Generates a baseline grid PDF, complete grid parameters JSON, and TXT file.

Reference: Grid Systems in Graphic Design, Josef Müller-Brockmann, 1981
        """,
    )

    parser.add_argument(
        "--format",
        type=str.upper,
        choices=sorted(FORMATS_PT.keys()),
        help="A-series page format (A0-A6, default: A4 in interactive mode)",
    )

    parser.add_argument(
        "--orientation",
        choices=["portrait", "landscape"],
        help="Page orientation (default: portrait in interactive mode)",
    )

    parser.add_argument(
        "--grid",
        type=str,
        help="Grid dimensions as 'NxM' (e.g., 9x9, 2x4, 12x8)",
    )

    parser.add_argument(
        "--baseline",
        type=float,
        help="Baseline grid unit in points (default: 9.0 for A4, scaled for other formats)",
    )

    parser.add_argument(
        "--margin",
        type=int,
        choices=[1, 2, 3],
        help="Margin calculation method: 1=Progressive, 2=Van de Graaf, 3=Grid-based",
    )

    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 2.0 - Swiss Grid Generator",
    )

    args = parser.parse_args()

    # Parse grid argument if provided
    if args.grid:
        try:
            parts = args.grid.lower().split('x')
            if len(parts) != 2:
                raise ValueError
            args.grid_cols = int(parts[0])
            args.grid_rows = int(parts[1])
            if args.grid_cols < 1 or args.grid_rows < 1:
                raise ValueError
        except (ValueError, IndexError):
            parser.error(f"Invalid grid format: '{args.grid}'. Use 'NxM' format (e.g., 9x9, 2x4)")
    else:
        args.grid_cols = None
        args.grid_rows = None

    return args


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main() -> int:
    """Main entry point."""
    args = parse_args()

    # Extract parameters with defaults
    format_name = args.format
    margin_method = args.margin if args.margin else 1
    orientation = args.orientation if args.orientation else "portrait"
    grid_cols = args.grid_cols
    grid_rows = args.grid_rows
    custom_baseline = args.baseline  # Can be None

    # Determine if interactive mode is needed
    # Only need format and grid dimensions - others have defaults
    interactive = not all([format_name, grid_cols, grid_rows])

    if interactive:
        if not sys.stdin.isatty():
            print("Error: Interactive mode requires a TTY terminal", file=sys.stderr)
            print("Provide at minimum: --format --grid", file=sys.stderr)
            return 1

        try:
            format_name, margin_method, orientation, grid_cols, grid_rows = interactive_mode()
            custom_baseline = None  # Interactive mode uses default baseline
        except KeyboardInterrupt:
            print("\n\nCancelled by user", file=sys.stderr)
            return 130

    # Generate assets
    try:
        summary, outputs = export_swiss_assets(
            format_name=format_name,
            margin_method=margin_method,
            orientation=orientation,
            grid_cols=grid_cols,
            grid_rows=grid_rows,
            custom_baseline=custom_baseline,
        )

        # Display summary
        print()
        pretty_print_summary(summary)

        # Success message
        console = Console()
        console.print()
        console.print(
            f"[green]✓[/green] Generated [bold]{format_name}[/bold] "
            f"([dim]{orientation}[/dim], [cyan]{grid_cols}×{grid_rows}[/cyan] grid) "
            f"with grid PDF, JSON, and TXT parameters"
        )

    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
