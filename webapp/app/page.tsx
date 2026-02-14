"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import {
  GridResult,
  generateSwissGrid,
  FORMATS_PT,
  FORMAT_BASELINES,
  getMaxBaseline,
  TYPOGRAPHY_SCALE_LABELS,
  CANVAS_RATIOS,
} from "@/lib/grid-calculator"
import type { CanvasRatioKey } from "@/lib/grid-calculator"
import { GridPreview } from "@/components/grid-preview"
import type { PreviewLayoutState } from "@/components/grid-preview"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import jsPDF from "jspdf"

// Conversion factors
const PT_TO_MM = 0.352778  // 1 point = 0.352778 mm
const PT_TO_PX = 96 / 72   // 1 point = 1.333... px (CSS pixels at 96ppi reference)

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
const SECTION_KEYS = ["export", "format", "baseline", "margins", "gutter", "typo"] as const
type SectionKey = typeof SECTION_KEYS[number]

export default function Home() {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const loadFileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewLayout, setPreviewLayout] = useState<PreviewLayoutState | null>(null)
  const [loadedPreviewLayout, setLoadedPreviewLayout] = useState<{ key: number; layout: PreviewLayoutState } | null>(null)
  const [canvasRatio, setCanvasRatio] = useState<CanvasRatioKey>("din_ab")
  const [exportPaperSize, setExportPaperSize] = useState("A4")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [rotation, setRotation] = useState(0)
  const [marginMethod, setMarginMethod] = useState<1 | 2 | 3>(1)
  const [gridCols, setGridCols] = useState(4)
  const [gridRows, setGridRows] = useState(9)
  const [baselineMultiple, setBaselineMultiple] = useState(1.0)
  const [gutterMultiple, setGutterMultiple] = useState(1.0)
  const [typographyScale, setTypographyScale] = useState<"swiss" | "golden" | "fourth" | "fifth" | "fibonacci">("swiss")
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
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [exportFilenameDraft, setExportFilenameDraft] = useState("")
  const [exportPaperSizeDraft, setExportPaperSizeDraft] = useState("A4")
  const [exportWidthDraft, setExportWidthDraft] = useState("")
  const [saveFilenameDraft, setSaveFilenameDraft] = useState("")
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({ format: true, baseline: true, margins: true, gutter: true, typo: true, export: true })
  const headerClickTimeoutRef = useRef<number | null>(null)
  const toggle = (key: SectionKey) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleAllSections = () => {
    setCollapsed((prev) => {
      const allClosed = SECTION_KEYS.every((key) => prev[key])
      const nextValue = allClosed ? false : true
      return SECTION_KEYS.reduce((acc, key) => {
        acc[key] = nextValue
        return acc
      }, {} as Record<SectionKey, boolean>)
    })
  }
  const handleSectionHeaderClick = (key: SectionKey) => (event: React.MouseEvent) => {
    if (event.detail > 1) return
    if (headerClickTimeoutRef.current !== null) {
      window.clearTimeout(headerClickTimeoutRef.current)
    }
    headerClickTimeoutRef.current = window.setTimeout(() => {
      toggle(key)
      headerClickTimeoutRef.current = null
    }, 180)
  }
  const handleSectionHeaderDoubleClick = (event: React.MouseEvent) => {
    event.preventDefault()
    if (headerClickTimeoutRef.current !== null) {
      window.clearTimeout(headerClickTimeoutRef.current)
      headerClickTimeoutRef.current = null
    }
    toggleAllSections()
  }

  useEffect(() => {
    return () => {
      if (headerClickTimeoutRef.current !== null) {
        window.clearTimeout(headerClickTimeoutRef.current)
      }
    }
  }, [])

  const selectedCanvasRatio = useMemo(() => {
    return CANVAS_RATIOS.find((option) => option.key === canvasRatio) ?? CANVAS_RATIOS[0]
  }, [canvasRatio])

  const previewFormat = useMemo(() => {
    return selectedCanvasRatio.paperSizes[0] ?? "A4"
  }, [selectedCanvasRatio])

  const gridUnit = useMemo(() => {
    return customBaseline ?? FORMAT_BASELINES[previewFormat] ?? 12.0
  }, [customBaseline, previewFormat])

  const paperSizeOptions = useMemo(() => {
    return selectedCanvasRatio.paperSizes
      .filter((name) => Boolean(FORMATS_PT[name]))
      .map((name) => {
        const dims = FORMATS_PT[name]
        return {
          value: name,
          label: `${name} (${formatValue(dims.width, displayUnit)}×${formatValue(dims.height, displayUnit)} ${displayUnit})`,
        }
      })
  }, [displayUnit, selectedCanvasRatio])

  useEffect(() => {
    const available = selectedCanvasRatio.paperSizes
    if (!available.includes(exportPaperSize) && available.length > 0) {
      setExportPaperSize(available[0])
    }
  }, [exportPaperSize, selectedCanvasRatio])

  const result = useMemo(() => {
    const customMargins = useCustomMargins ? {
      top: customMarginMultipliers.top * gridUnit,
      bottom: customMarginMultipliers.bottom * gridUnit,
      left: customMarginMultipliers.left * gridUnit,
      right: customMarginMultipliers.right * gridUnit,
    } : undefined
    return generateSwissGrid({
      format: previewFormat,
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
  }, [previewFormat, orientation, marginMethod, gridCols, gridRows, customBaseline, baselineMultiple, gutterMultiple, useCustomMargins, customMarginMultipliers, gridUnit, typographyScale])

  // Dynamic maximum baseline: ensures at least 24 baselines fit in usable height
  const maxBaseline = useMemo(() => {
    const formatDim = FORMATS_PT[previewFormat]
    const pageHeight = orientation === "landscape" ? formatDim.width : formatDim.height
    const customMarginUnits = useCustomMargins
      ? customMarginMultipliers.top + customMarginMultipliers.bottom
      : undefined
    return getMaxBaseline(pageHeight, marginMethod, baselineMultiple, customMarginUnits)
  }, [previewFormat, orientation, marginMethod, baselineMultiple, useCustomMargins, customMarginMultipliers])


  // Filter available options based on max baseline
  const availableBaselineOptions = useMemo(() => {
    return BASELINE_OPTIONS.filter(val => val <= maxBaseline)
  }, [maxBaseline])

  // Generate base filename with baseline info
  const baseFilename = useMemo(() => {
    const baselineStr = customBaseline ? customBaseline.toFixed(3) : result.grid.gridUnit.toFixed(3)
    return `${canvasRatio}_${orientation}_${gridCols}x${gridRows}_method${marginMethod}_${baselineStr}pt`
  }, [canvasRatio, orientation, gridCols, gridRows, marginMethod, customBaseline, result.grid.gridUnit])

  const defaultPdfFilename = useMemo(() => {
    return `${baseFilename}_${exportPaperSize}_grid.pdf`
  }, [baseFilename, exportPaperSize])

  const defaultJsonFilename = useMemo(() => {
    return `${baseFilename}_grid.json`
  }, [baseFilename])

  const saveJSON = (filename: string) => {
    const trimmed = filename.trim()
    if (!trimmed) return
    const normalizedFilename = trimmed.toLowerCase().endsWith(".json") ? trimmed : `${trimmed}.json`

    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      gridResult: result,
      uiSettings: {
        canvasRatio,
        format: previewFormat,
        exportPaperSize,
        orientation,
        rotation,
        marginMethod,
        gridCols,
        gridRows,
        baselineMultiple,
        gutterMultiple,
        typographyScale,
        customBaseline,
        displayUnit,
        useCustomMargins,
        customMarginMultipliers,
        showBaselines,
        showModules,
        showMargins,
        showTypography,
        collapsed,
      },
      previewLayout,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = normalizedFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  const openSaveDialog = () => {
    setSaveFilenameDraft(defaultJsonFilename)
    setIsSaveDialogOpen(true)
  }

  const confirmSaveJSON = () => {
    const trimmedName = saveFilenameDraft.trim()
    if (!trimmedName) return
    saveJSON(trimmedName)
    setIsSaveDialogOpen(false)
  }

  const getOrientedDimensions = useCallback((paperSize: string) => {
    const base = FORMATS_PT[paperSize] ?? FORMATS_PT[previewFormat]
    if (orientation === "landscape") {
      return { width: base.height, height: base.width }
    }
    return { width: base.width, height: base.height }
  }, [orientation, previewFormat])

  const exportPDF = (width: number, height: number, filename: string) => {
    const pdf = new jsPDF({
      orientation: width > height ? "landscape" : "portrait",
      unit: "pt",
      format: [width, height],
    })

    const canvas = previewCanvasRef.current
    if (!canvas) return
    const imageData = canvas.toDataURL("image/png")
    pdf.addImage(imageData, "PNG", 0, 0, width, height)

    pdf.save(filename)
  }

  const openExportDialog = () => {
    const dims = getOrientedDimensions(exportPaperSize)
    setExportPaperSizeDraft(exportPaperSize)
    setExportFilenameDraft(defaultPdfFilename)
    setExportWidthDraft(dims.width.toFixed(3))
    setIsExportDialogOpen(true)
  }

  const confirmExportPDF = () => {
    const trimmedName = exportFilenameDraft.trim()
    if (!trimmedName) return
    const filename = trimmedName.toLowerCase().endsWith(".pdf") ? trimmedName : `${trimmedName}.pdf`
    const baseDims = getOrientedDimensions(exportPaperSizeDraft)
    const aspectRatio = baseDims.height / baseDims.width
    const parsedWidth = Number(exportWidthDraft)
    const width = Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : baseDims.width
    const height = width * aspectRatio
    setExportPaperSize(exportPaperSizeDraft)
    exportPDF(width, height, filename)
    setIsExportDialogOpen(false)
  }

  const loadLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const ui = parsed?.uiSettings
        if (!ui || typeof ui !== "object") {
          throw new Error("Invalid layout JSON: missing uiSettings.")
        }

        if (
          ui.canvasRatio === "din_ab"
          || ui.canvasRatio === "letter_ansi_ab"
          || ui.canvasRatio === "balanced_3_4"
          || ui.canvasRatio === "photo_2_3"
          || ui.canvasRatio === "screen_16_9"
          || ui.canvasRatio === "square_1_1"
          || ui.canvasRatio === "editorial_4_5"
          || ui.canvasRatio === "wide_2_1"
        ) {
          setCanvasRatio(ui.canvasRatio)
        }
        if (typeof ui.exportPaperSize === "string" && FORMATS_PT[ui.exportPaperSize]) {
          setExportPaperSize(ui.exportPaperSize)
        }
        if (typeof ui.format === "string" && FORMATS_PT[ui.format]) {
          if (/^[AB]/.test(ui.format)) {
            setCanvasRatio("din_ab")
            if (!ui.exportPaperSize) setExportPaperSize(ui.format)
          }
          if (ui.format === "LETTER") {
            setCanvasRatio("letter_ansi_ab")
            if (!ui.exportPaperSize) setExportPaperSize("LETTER")
          }
        }
        if (ui.orientation === "portrait" || ui.orientation === "landscape") setOrientation(ui.orientation)
        if (typeof ui.rotation === "number") setRotation(ui.rotation)
        if (ui.marginMethod === 1 || ui.marginMethod === 2 || ui.marginMethod === 3) setMarginMethod(ui.marginMethod)
        if (typeof ui.gridCols === "number") setGridCols(ui.gridCols)
        if (typeof ui.gridRows === "number") setGridRows(ui.gridRows)
        if (typeof ui.baselineMultiple === "number") setBaselineMultiple(ui.baselineMultiple)
        if (typeof ui.gutterMultiple === "number") setGutterMultiple(ui.gutterMultiple)
        if (ui.typographyScale === "swiss" || ui.typographyScale === "golden" || ui.typographyScale === "fourth" || ui.typographyScale === "fifth" || ui.typographyScale === "fibonacci") {
          setTypographyScale(ui.typographyScale)
        }
        if (typeof ui.customBaseline === "number") setCustomBaseline(ui.customBaseline)
        if (ui.displayUnit === "pt" || ui.displayUnit === "mm" || ui.displayUnit === "px") setDisplayUnit(ui.displayUnit)
        if (typeof ui.useCustomMargins === "boolean") setUseCustomMargins(ui.useCustomMargins)
        if (ui.customMarginMultipliers && typeof ui.customMarginMultipliers === "object") {
          const cm = ui.customMarginMultipliers
          if (typeof cm.top === "number" && typeof cm.left === "number" && typeof cm.right === "number" && typeof cm.bottom === "number") {
            setCustomMarginMultipliers({ top: cm.top, left: cm.left, right: cm.right, bottom: cm.bottom })
          }
        }
        if (typeof ui.showBaselines === "boolean") setShowBaselines(ui.showBaselines)
        if (typeof ui.showModules === "boolean") setShowModules(ui.showModules)
        if (typeof ui.showMargins === "boolean") setShowMargins(ui.showMargins)
        if (typeof ui.showTypography === "boolean") setShowTypography(ui.showTypography)
        if (ui.collapsed && typeof ui.collapsed === "object") {
          const loadedCollapsed: Partial<Record<SectionKey, boolean>> = {}
          if (typeof ui.collapsed.format === "boolean") loadedCollapsed.format = ui.collapsed.format
          if (typeof ui.collapsed.baseline === "boolean") loadedCollapsed.baseline = ui.collapsed.baseline
          if (typeof ui.collapsed.margins === "boolean") loadedCollapsed.margins = ui.collapsed.margins
          if (typeof ui.collapsed.gutter === "boolean") loadedCollapsed.gutter = ui.collapsed.gutter
          if (typeof ui.collapsed.typo === "boolean") loadedCollapsed.typo = ui.collapsed.typo
          if (typeof ui.collapsed.export === "boolean") loadedCollapsed.export = ui.collapsed.export
          setCollapsed((prev) => ({ ...prev, ...loadedCollapsed }))
        }
        if (parsed?.previewLayout) {
          const nextKey = Date.now()
          const layout = parsed.previewLayout as PreviewLayoutState
          setPreviewLayout(layout)
          setLoadedPreviewLayout({ key: nextKey, layout })
        } else {
          setPreviewLayout(null)
          setLoadedPreviewLayout(null)
        }
      } catch (error) {
        console.error(error)
        window.alert("Could not load layout JSON.")
      } finally {
        event.target.value = ""
      }
    }
    reader.readAsText(file)
  }

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
        {/* Layout */}
        <Card>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("export")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              Layout
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.export ? "" : "rotate-90"}`}>&gt;</span>
            </CardTitle>
          </CardHeader>
          {!collapsed.export && (
            <CardContent className="space-y-3">
              <input
                ref={loadFileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={loadLayout}
              />
              <Button variant="outline" className="w-full" size="sm" onClick={() => loadFileInputRef.current?.click()}>
                Load
              </Button>
              <Button onClick={openSaveDialog} variant="outline" className="w-full" size="sm">
                Save
              </Button>
              <div className="space-y-3">
                <Button onClick={openExportDialog} className="w-full" size="sm">
                  Export PDF
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Canvas Ratio Settings */}
        <Card>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("format")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              I. Canvas Ratio
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.format ? "" : "rotate-90"}`}>&gt;</span>
            </CardTitle>
          </CardHeader>
          {!collapsed.format && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ratio</Label>
                <Select value={canvasRatio} onValueChange={(v: CanvasRatioKey) => setCanvasRatio(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANVAS_RATIOS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label} ({opt.ratioLabel} / 1:{opt.ratioDecimal.toFixed(3)})
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
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("baseline")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              II. Baseline Grid ({result.grid.gridUnit.toFixed(3)} pt)
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.baseline ? "" : "rotate-90"}`}>&gt;</span>
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
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("margins")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              III. Margins
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.margins ? "" : "rotate-90"}`}>&gt;</span>
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
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("gutter")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              IV. Gutter
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.gutter ? "" : "rotate-90"}`}>&gt;</span>
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
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={handleSectionHeaderClick("typo")} onDoubleClick={handleSectionHeaderDoubleClick}>
            <CardTitle className="text-sm flex items-center gap-2">
              V. Typo
              <span className={`ml-auto text-base leading-none transition-transform ${collapsed.typo ? "" : "rotate-90"}`}>&gt;</span>
            </CardTitle>
          </CardHeader>
          {!collapsed.typo && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Select value={typographyScale} onValueChange={(v: "swiss" | "golden" | "fourth" | "fifth" | "fibonacci") => setTypographyScale(v)}>
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
              <Label htmlFor="show-typography" className="cursor-pointer text-xs text-gray-600">Typo</Label>
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
          initialLayout={loadedPreviewLayout?.layout ?? null}
          initialLayoutKey={loadedPreviewLayout?.key ?? 0}
          rotation={rotation}
          onCanvasReady={(canvas) => {
            previewCanvasRef.current = canvas
          }}
          onLayoutChange={setPreviewLayout}
        />
        </div>
      </div>

      {isExportDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-4 shadow-xl space-y-4">
            <h3 className="text-base font-semibold">Export PDF</h3>
            <p className="text-xs text-gray-600">
              Ratio: {selectedCanvasRatio.label} | Orientation: {orientation} | Rotation: {rotation}°
            </p>
            <div className="space-y-2">
              <Label>Paper Size</Label>
              <Select
                value={exportPaperSizeDraft}
                onValueChange={(value) => {
                  setExportPaperSizeDraft(value)
                  const dims = getOrientedDimensions(value)
                  setExportWidthDraft(dims.width.toFixed(3))
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paperSizeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Width (pt)</Label>
              <input
                type="number"
                min={1}
                step="0.001"
                value={exportWidthDraft}
                onChange={(event) => setExportWidthDraft(event.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-gray-600">
              Height will follow the selected aspect ratio automatically.
            </p>
            <div className="space-y-2">
              <Label>Filename</Label>
              <input
                type="text"
                value={exportFilenameDraft}
                onChange={(event) => setExportFilenameDraft(event.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder={defaultPdfFilename}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmExportPDF}>
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {isSaveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-4 shadow-xl space-y-4">
            <h3 className="text-base font-semibold">Save JSON</h3>
            <p className="text-xs text-gray-600">
              Ratio: {selectedCanvasRatio.label} | Orientation: {orientation} | Rotation: {rotation}°
            </p>
            <div className="space-y-2">
              <Label>Filename</Label>
              <input
                type="text"
                value={saveFilenameDraft}
                onChange={(event) => setSaveFilenameDraft(event.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder={defaultJsonFilename}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmSaveJSON}>
                Save JSON
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
