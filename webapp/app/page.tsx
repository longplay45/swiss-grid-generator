"use client"

import { useState, useMemo } from "react"
import { GridResult, generateSwissGrid, FORMATS_PT, FORMAT_BASELINES, getMaxBaseline, TYPOGRAPHY_SCALE_LABELS } from "@/lib/grid-calculator"
import { GridPreview } from "@/components/grid-preview"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, Download, FileJson, FileText } from "lucide-react"
import jsPDF from "jspdf"

// Conversion factors
const PT_TO_MM = 0.352778  // 1 point = 0.352778 mm
const PT_TO_PX = 96 / 72   // 1 point = 1.333... px (at 96dpi: 1in = 72pt = 96px)

function ptToMm(pt: number): number {
  return pt * PT_TO_MM
}

function ptToPx(pt: number): number {
  return pt * PT_TO_PX
}

function formatValue(value: number, unit: "pt" | "mm" | "px"): string {
  const converted = unit === "mm" ? ptToMm(value) : unit === "px" ? ptToPx(value) : value
  return converted.toFixed(3)
}

const BASELINE_OPTIONS = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72]

export default function Home() {
  const [format, setFormat] = useState("A4")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [rotation, setRotation] = useState(0)
  const [marginMethod, setMarginMethod] = useState<1 | 2 | 3>(1)
  const [gridCols, setGridCols] = useState(4)
  const [gridRows, setGridRows] = useState(9)
  const [baselineMultiple, setBaselineMultiple] = useState(1.0)
  const [gutterMultiple, setGutterMultiple] = useState(1.0)
  const [typographyScale, setTypographyScale] = useState<"swiss" | "golden" | "fourth">("swiss")
  const [customBaseline, setCustomBaseline] = useState<number>(() => {
    const defaultVal = FORMAT_BASELINES["A4"] ?? 12
    return BASELINE_OPTIONS.reduce((prev, curr) =>
      Math.abs(curr - defaultVal) < Math.abs(prev - defaultVal) ? curr : prev
    )
  })
  const [showBaselines, setShowBaselines] = useState(true)
  const [showModules, setShowModules] = useState(true)
  const [showMargins, setShowMargins] = useState(true)
  const [showTypography, setShowTypography] = useState(true)
  const [displayUnit, setDisplayUnit] = useState<"pt" | "mm" | "px">("pt")
  const [useCustomMargins, setUseCustomMargins] = useState(false)
  const [customMarginMultipliers, setCustomMarginMultipliers] = useState({ top: 1, left: 2, right: 2, bottom: 3 })
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ format: true, baseline: true, margins: true, gutter: true, typo: true, export: true })
  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const gridUnit = useMemo(() => {
    return customBaseline ?? FORMAT_BASELINES[format] ?? 12.0
  }, [customBaseline, format])

  const result = useMemo(() => {
    const customMargins = useCustomMargins ? {
      top: customMarginMultipliers.top * gridUnit,
      bottom: customMarginMultipliers.bottom * gridUnit,
      left: customMarginMultipliers.left * gridUnit,
      right: customMarginMultipliers.right * gridUnit,
    } : undefined
    return generateSwissGrid({
      format,
      orientation,
      marginMethod,
      gridCols,
      gridRows,
      baseline: customBaseline,
      baselineMultiple,
      gutterMultiple,
      customMargins,
      typographyScale,
    })
  }, [format, orientation, marginMethod, gridCols, gridRows, customBaseline, baselineMultiple, gutterMultiple, useCustomMargins, customMarginMultipliers, gridUnit, typographyScale])

  // Dynamic maximum baseline: ensures at least 24 baselines fit in usable height
  const maxBaseline = useMemo(() => {
    const formatDim = FORMATS_PT[format]
    const pageHeight = orientation === "landscape" ? formatDim.width : formatDim.height
    const customMarginUnits = useCustomMargins
      ? customMarginMultipliers.top + customMarginMultipliers.bottom
      : undefined
    return getMaxBaseline(pageHeight, marginMethod, baselineMultiple, customMarginUnits)
  }, [format, orientation, marginMethod, baselineMultiple, useCustomMargins, customMarginMultipliers])


  // Filter available options based on max baseline
  const availableBaselineOptions = useMemo(() => {
    return BASELINE_OPTIONS.filter(val => val <= maxBaseline)
  }, [maxBaseline])

  // Generate base filename with baseline info
  const baseFilename = useMemo(() => {
    const baselineStr = customBaseline ? customBaseline.toFixed(3) : result.grid.gridUnit.toFixed(3)
    return `${format}_${orientation}_${gridCols}x${gridRows}_method${marginMethod}_${baselineStr}pt`
  }, [format, orientation, gridCols, gridRows, marginMethod, customBaseline, result.grid.gridUnit])

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${baseFilename}_grid.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportTXT = () => {
    const unit = displayUnit
    const lines = [
      "=" .repeat(70),
      "SWISS GRID SYSTEM - PARAMETERS",
      "=" .repeat(70),
      "",
      "SETTINGS",
      "-".repeat(70),
      `  Format:          ${result.format}`,
      `  Orientation:     ${result.settings.orientation}`,
      `  Margin Method:   ${result.settings.marginMethod}`,
      `  Grid:            ${result.settings.gridCols} cols × ${result.settings.gridRows} rows`,
      `  Baseline Multiple: ${result.settings.baselineMultiple.toFixed(1)}×`,
      `  Custom Baseline:  ${result.settings.customBaseline ? result.settings.customBaseline.toFixed(3) + " pt" : "Auto"}`,
      "",
      "PAGE DIMENSIONS",
      "-".repeat(70),
      `  Page Size:       ${formatValue(result.pageSizePt.width, unit)} × ${formatValue(result.pageSizePt.height, unit)} ${unit}`,
      `  Content Area:    ${formatValue(result.contentArea.width, unit)} × ${formatValue(result.contentArea.height, unit)} ${unit}`,
      `  Module Size:     ${formatValue(result.module.width, unit)} × ${formatValue(result.module.height, unit)} ${unit}`,
      `  Aspect Ratio:    ${result.module.aspectRatio.toFixed(3)}`,
      `  Scale Factor:    ${result.grid.scaleFactor.toFixed(3)}× (relative to A4)`,
      "",
      "GRID & MARGINS",
      "-".repeat(70),
      `  Baseline Grid:   ${formatValue(result.grid.gridUnit, unit)} ${unit}`,
      `  H. Gutter:       ${formatValue(result.grid.gridMarginHorizontal, unit)} ${unit}`,
      `  V. Gutter:       ${formatValue(result.grid.gridMarginVertical, unit)} ${unit}`,
      `  Cell Height:     ${formatValue(result.grid.baselineUnitsPerCell * result.grid.gridUnit, unit)} ${unit} (${result.grid.baselineUnitsPerCell} baseline units)`,
      `  Margins:         T:${formatValue(result.grid.margins.top, unit)} ${unit} B:${formatValue(result.grid.margins.bottom, unit)} ${unit} L:${formatValue(result.grid.margins.left, unit)} ${unit} R:${formatValue(result.grid.margins.right, unit)} ${unit}`,
      "",
      "TYPOGRAPHY SYSTEM",
      "-".repeat(70),
      `  ${"Style".padEnd(12)} ${"Size".padEnd(12)} ${"Leading".padEnd(12)} ${"Weight".padEnd(10)} Alignment`,
      `  ${"-".repeat(12)} ${"-".repeat(12)} ${"-".repeat(12)} ${"-".repeat(10)} ${"-".repeat(10)}`,
    ]

    for (const [styleName, styleVals] of Object.entries(result.typography.styles)) {
      lines.push(
        `  ${styleName.charAt(0).toUpperCase() + styleName.slice(1).padEnd(11)} ` +
        `${formatValue(styleVals.size, unit)} ${unit}   `.slice(0, 12) +
        `${formatValue(styleVals.leading, unit)} ${unit}   `.slice(0, 12) +
        `${styleVals.weight.padEnd(10)} ${styleVals.alignment}`
      )
    }

    lines.push(
      "",
      "SWISS DESIGN PRINCIPLES",
      "-".repeat(70),
      "  Reference:  Müller-Brockmann, Grid Systems in Graphic Design (1981)",
      "  ✓ All typography aligns to baseline grid",
      "  ✓ Grid modules maintain proportional relationships",
      "  ✓ System scales across A-series formats",
      "",
      "=".repeat(70),
      "",
      "Copyleft & -right 2026 by https://lp45.net",
      "License MIT. Source Code: https://github.com/longplay45/swiss-grid-generator"
    )

    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${baseFilename}_grid.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const { width, height } = result.pageSizePt
    const pdf = new jsPDF({
      orientation: width > height ? "landscape" : "portrait",
      unit: "pt",
      format: [width, height],
    })

    const { margins } = result.grid
    const { gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
    const { width: modW, height: modH } = result.module
    const { gridCols, gridRows } = result.settings

    // Draw module outlines (cyan color to match canvas #06b6d4)
    pdf.setLineWidth(0.5)
    pdf.setDrawColor(6, 188, 212)  // #06b6d4 in RGB (0-255 range)
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = margins.left + col * (modW + gridMarginHorizontal)
        const y = margins.top + row * (modH + gridMarginVertical)
        pdf.rect(x, y, modW, modH, "S")
      }
    }

    // Draw baseline grid (magenta/pink color to match canvas #ec4899)
    pdf.setLineWidth(0.15)
    pdf.setDrawColor(236, 72, 153)  // #ec4899 in RGB (0-255 range)
    const startY = margins.top
    const endY = height - margins.bottom
    let currentY = startY

    while (currentY <= endY) {
      pdf.line(margins.left, currentY, width - margins.right, currentY)
      currentY += gridUnit
    }

    // Draw footer text (always 7pt) - positioned at bottom with margin
    pdf.setFontSize(7)
    pdf.setTextColor(77, 77, 77)  // Dark gray for better readability (#4d4d4d)

    const footerLineHeight = 10  // 7pt + 3pt leading
    const footerYStart = height - margins.bottom + 15  // Start 15pt from bottom margin edge (Y is from top in jsPDF)

    // Line 1 (top line of footer)
    pdf.text("Based on Müller-Brockmann's Grid Systems in Graphic Design (1981).", margins.left, footerYStart)

    // Line 2
    pdf.text("Copyleft & -right 2026 by https://lp45.net", margins.left, footerYStart + footerLineHeight)

    // Line 3 (bottom line of footer)
    pdf.text("License MIT. Source Code: https://github.com/longplay45/swiss-grid-generator", margins.left, footerYStart + footerLineHeight * 2)

    pdf.save(`${baseFilename}_grid.pdf`)
  }

  const formatOptions = useMemo(() => {
    return Object.entries(FORMATS_PT).map(([name, dims]) => ({
      value: name,
      label: `${name} (${formatValue(dims.width, displayUnit)}×${formatValue(dims.height, displayUnit)} ${displayUnit})`,
    }))
  }, [displayUnit])

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      {/* Left Panel - Controls */}
      <div className="w-full md:w-96 flex flex-col border-r border-b md:border-b-0 bg-white max-h-[50vh] md:max-h-full">
        {/* Header - always visible */}
        <div className="shrink-0 space-y-2 p-4 md:px-6 md:pt-6 border-b">
          <h1 className="text-2xl font-bold tracking-tight">Swiss Grid Generator</h1>
          <p className="text-sm text-gray-600">
            Based on Müller-Brockmann's <em>Grid Systems in Graphic Design</em> (1981). Copyleft & -right 2026 by <a href="https://lp45.net">lp45.net</a>&gt;. License MIT. <a href="https://github.com/longplay45/swiss-grid-generator">Source Code</a>&gt;.
          </p>
        </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Format Settings */}
        <Card>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => toggle("format")}>
            <CardTitle className="text-sm flex items-center gap-2">
              Format & Layout
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${collapsed.format ? "-rotate-90" : ""}`} />
            </CardTitle>
          </CardHeader>
          {!collapsed.format && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Page Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formatOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orientation</Label>
                <Select value={orientation} onValueChange={(v: "portrait" | "landscape") => setOrientation(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Rotation</Label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{rotation}°</span>
                </div>
                <Slider value={[rotation]} min={-80} max={80} step={1} onValueChange={([v]) => setRotation(v)} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Baseline Grid Settings */}
        <Card>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => toggle("baseline")}>
            <CardTitle className="text-sm flex items-center gap-2">
              Baseline Grid ({result.grid.gridUnit.toFixed(3)} pt)
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${collapsed.baseline ? "-rotate-90" : ""}`} />
            </CardTitle>
          </CardHeader>
          {!collapsed.baseline && (
            <CardContent className="space-y-4">
              {availableBaselineOptions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Grid Unit</Label>
                    <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{customBaseline} pt</span>
                  </div>
                  <Slider
                    value={[availableBaselineOptions.indexOf(customBaseline) >= 0 ? availableBaselineOptions.indexOf(customBaseline) : 0]}
                    min={0}
                    max={availableBaselineOptions.length - 1}
                    step={1}
                    onValueChange={([v]) => setCustomBaseline(availableBaselineOptions[v])}
                  />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Margins */}
        <Card>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => toggle("margins")}>
            <CardTitle className="text-sm flex items-center gap-2">
              Margins
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${collapsed.margins ? "-rotate-90" : ""}`} />
            </CardTitle>
          </CardHeader>
          {!collapsed.margins && <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Custom Margins</Label>
              <Switch
                checked={useCustomMargins}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const methodBottomRatio: Record<number, number> = { 1: 3.0, 2: 3.0, 3: 1.0 }
                    setCustomMarginMultipliers({
                      top: Math.max(1, Math.min(9, Math.round(result.grid.margins.top / gridUnit))),
                      left: Math.max(1, Math.min(9, Math.round(result.grid.margins.left / gridUnit))),
                      right: Math.max(1, Math.min(9, Math.round(result.grid.margins.right / gridUnit))),
                      bottom: Math.max(1, Math.min(9, Math.round(methodBottomRatio[marginMethod] * baselineMultiple))),
                    })
                  }
                  setUseCustomMargins(checked)
                }}
              />
            </div>

            {!useCustomMargins ? (
              <>
                <div className="space-y-2">
                  <Label>Margin Method</Label>
                  <Select value={marginMethod.toString()} onValueChange={(v) => setMarginMethod(parseInt(v) as 1 | 2 | 3)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Progressive (1:2:2:3)</SelectItem>
                      <SelectItem value="2">Van de Graaf (2:3:4:6)</SelectItem>
                      <SelectItem value="3">Baseline (1:1:1:1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Baseline Multiple</Label>
                    <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{baselineMultiple.toFixed(1)}×</span>
                  </div>
                  <Slider value={[baselineMultiple]} min={0.5} max={7} step={0.5} onValueChange={([v]) => setBaselineMultiple(v)} />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {(["top", "left", "right"] as const).map((side) => (
                  <div key={side} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize">{side}</Label>
                      <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{customMarginMultipliers[side]}×</span>
                    </div>
                    <Slider
                      value={[customMarginMultipliers[side]]}
                      min={1}
                      max={9}
                      step={1}
                      onValueChange={([v]) => setCustomMarginMultipliers(prev => ({ ...prev, [side]: v }))}
                    />
                  </div>
                ))}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">Bottom</Label>
                    <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{customMarginMultipliers.bottom}×</span>
                  </div>
                  <Slider
                    value={[customMarginMultipliers.bottom]}
                    min={1}
                    max={9}
                    step={1}
                    onValueChange={([v]) => setCustomMarginMultipliers(prev => ({ ...prev, bottom: v }))}
                  />
                </div>
              </div>
            )}
          </CardContent>}
        </Card>

        {/* Gutter */}
        <Card>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => toggle("gutter")}>
            <CardTitle className="text-sm flex items-center gap-2">
              Gutter
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${collapsed.gutter ? "-rotate-90" : ""}`} />
            </CardTitle>
          </CardHeader>
          {!collapsed.gutter && (
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Vertical Fields</Label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{gridCols}</span>
                </div>
                <Slider value={[gridCols]} min={1} max={13} step={1} onValueChange={([v]) => setGridCols(v)} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Horizontal Fields</Label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{gridRows}</span>
                </div>
                <Slider value={[gridRows]} min={1} max={13} step={1} onValueChange={([v]) => setGridRows(v)} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Baseline Multiple</Label>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{gutterMultiple}×</span>
                </div>
                <Slider value={[gutterMultiple]} min={0.5} max={4} step={0.5} onValueChange={([v]) => setGutterMultiple(v)} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Typo */}
        <Card>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => toggle("typo")}>
            <CardTitle className="text-sm flex items-center gap-2">
              Typo
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${collapsed.typo ? "-rotate-90" : ""}`} />
            </CardTitle>
          </CardHeader>
          {!collapsed.typo && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Font Hierarchie Method</Label>
                <Select value={typographyScale} onValueChange={(v: "swiss" | "golden" | "fourth") => setTypographyScale(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPOGRAPHY_SCALE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Export */}
        <Card>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => toggle("export")}>
            <CardTitle className="text-sm flex items-center gap-2">
              Export
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${collapsed.export ? "-rotate-90" : ""}`} />
            </CardTitle>
          </CardHeader>
          {!collapsed.export && (
            <CardContent className="space-y-2">
              <Button onClick={exportPDF} className="w-full" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <div className="flex gap-2">
                <Button onClick={exportJSON} variant="outline" className="flex-1" size="sm">
                  <FileJson className="w-4 h-4 mr-2" />
                  JSON
                </Button>
                <Button onClick={exportTXT} variant="outline" className="flex-1" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  TXT
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

      </div>

        {/* Stats - always visible */}
        <div className="shrink-0 text-xs text-gray-500 space-y-1 p-4 md:px-6 border-t">
          <div className="flex justify-between">
            <span>Format:</span>
            <span className="font-mono">{result.format} {result.settings.orientation}</span>
          </div>
          <div className="flex justify-between">
            <span>Page Size:</span>
            <span className="font-mono">{formatValue(result.pageSizePt.width, displayUnit)} × {formatValue(result.pageSizePt.height, displayUnit)} {displayUnit}</span>
          </div>
          <div className="flex justify-between">
            <span>Scale Factor:</span>
            <span className="font-mono">{result.grid.scaleFactor.toFixed(3)}×</span>
          </div>
          <div className="flex justify-between">
            <span>Baseline:</span>
            <span className="font-mono">{formatValue(result.grid.gridUnit, displayUnit)} {displayUnit}</span>
          </div>
          <div className="flex justify-between">
            <span>Margin Method:</span>
            <span className="font-mono">{result.settings.marginMethod}</span>
          </div>
          <div className="flex justify-between">
            <span>Margins:</span>
            <span className="font-mono">T:{formatValue(result.grid.margins.top, displayUnit)} L:{formatValue(result.grid.margins.left, displayUnit)} R:{formatValue(result.grid.margins.right, displayUnit)} B:{formatValue(result.grid.margins.bottom, displayUnit)}</span>
          </div>
          <div className="flex justify-between">
            <span>Content Area:</span>
            <span className="font-mono">{formatValue(result.contentArea.width, displayUnit)} × {formatValue(result.contentArea.height, displayUnit)} {displayUnit}</span>
          </div>
          <div className="flex justify-between">
            <span>Gutter:</span>
            <span className="font-mono">{result.settings.gridCols} × {result.settings.gridRows}</span>
          </div>
          <div className="flex justify-between">
            <span>Module:</span>
            <span className="font-mono">{formatValue(result.module.width, displayUnit)} × {formatValue(result.module.height, displayUnit)} {displayUnit}</span>
          </div>
          <div className="flex justify-between">
            <span>Aspect Ratio:</span>
            <span className="font-mono">{result.module.aspectRatio.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Baselines/Cell:</span>
            <span className="font-mono">{result.grid.baselineUnitsPerCell}</span>
          </div>
          <div className="flex justify-between">
            <span>Gutter:</span>
            <span className="font-mono">{formatValue(result.grid.gutter, displayUnit)} {displayUnit}</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col min-h-[50vh] md:min-h-full">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-white">
          <h2 className="text-sm font-medium text-gray-700">Display Options</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="show-baselines" className="cursor-pointer text-xs text-gray-600">Baselines</Label>
              <Switch id="show-baselines" checked={showBaselines} onCheckedChange={setShowBaselines} />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-margins" className="cursor-pointer text-xs text-gray-600">Margins</Label>
              <Switch id="show-margins" checked={showMargins} onCheckedChange={setShowMargins} />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-modules" className="cursor-pointer text-xs text-gray-600">Gutter</Label>
              <Switch id="show-modules" checked={showModules} onCheckedChange={setShowModules} />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-typography" className="cursor-pointer text-xs text-gray-600">Type</Label>
              <Switch id="show-typography" checked={showTypography} onCheckedChange={setShowTypography} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-600">Units</Label>
              <Select value={displayUnit} onValueChange={(v: "pt" | "mm" | "px") => setDisplayUnit(v)}>
                <SelectTrigger className="w-[70px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">mm</SelectItem>
                  <SelectItem value="pt">pt</SelectItem>
                  <SelectItem value="px">px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <GridPreview
            result={result}
            showBaselines={showBaselines}
            showModules={showModules}
            showMargins={showMargins}
            showTypography={showTypography}
            displayUnit={displayUnit}
            rotation={rotation}
          />
        </div>
      </div>
    </div>
  )
}
