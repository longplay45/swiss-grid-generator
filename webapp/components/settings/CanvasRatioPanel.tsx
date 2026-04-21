import { memo, useCallback, useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DebouncedSlider } from "@/components/ui/slider"
import { LabeledControlRow } from "@/components/ui/labeled-control-row"
import {
  CANVAS_RATIOS,
  clampCustomCanvasRatioUnit,
  formatCustomCanvasRatio,
  getCanvasRatioDecimal,
  getCanvasRatioDisplayLabel,
  type CanvasRatioKey,
} from "@/lib/grid-calculator"
import { PanelCard } from "@/components/settings/PanelCard"

type Props = {
  collapsed: boolean
  onHeaderClick: (event: React.MouseEvent) => void
  onHeaderDoubleClick: (event: React.MouseEvent) => void
  canvasRatio: CanvasRatioKey
  onCanvasRatioChange: (value: CanvasRatioKey) => void
  onCanvasRatioPreviewChange?: (value: CanvasRatioKey | null) => void
  customRatioWidth: number
  onCustomRatioWidthChange: (value: number) => void
  customRatioHeight: number
  onCustomRatioHeightChange: (value: number) => void
  orientation: "portrait" | "landscape"
  onOrientationChange: (value: "portrait" | "landscape") => void
  onOrientationPreviewChange?: (value: "portrait" | "landscape" | null) => void
  rotation: number
  onRotationChange: (value: number) => void
  isDarkMode: boolean
}

export const CanvasRatioPanel = memo(function CanvasRatioPanel({
  collapsed,
  onHeaderClick,
  onHeaderDoubleClick,
  canvasRatio,
  onCanvasRatioChange,
  onCanvasRatioPreviewChange,
  customRatioWidth,
  onCustomRatioWidthChange,
  customRatioHeight,
  onCustomRatioHeightChange,
  orientation,
  onOrientationChange,
  onOrientationPreviewChange,
  rotation,
  onRotationChange,
  isDarkMode,
}: Props) {
  const [customRatioWidthInput, setCustomRatioWidthInput] = useState(customRatioWidth.toString())
  const [customRatioHeightInput, setCustomRatioHeightInput] = useState(customRatioHeight.toString())

  useEffect(() => {
    setCustomRatioWidthInput(customRatioWidth.toString())
  }, [customRatioWidth])

  useEffect(() => {
    setCustomRatioHeightInput(customRatioHeight.toString())
  }, [customRatioHeight])

  const ratioLabel = getCanvasRatioDisplayLabel(canvasRatio, customRatioWidth, customRatioHeight)
  const customRatioText = formatCustomCanvasRatio(customRatioWidth, customRatioHeight)
  const customRatioDecimal = getCanvasRatioDecimal(customRatioWidth, customRatioHeight)
  const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

  const commitCustomRatioWidth = useCallback(() => {
    const parsed = Number(customRatioWidthInput)
    const nextValue = clampCustomCanvasRatioUnit(parsed, customRatioWidth)
    onCustomRatioWidthChange(nextValue)
    setCustomRatioWidthInput(nextValue.toString())
  }, [customRatioWidth, customRatioWidthInput, onCustomRatioWidthChange])

  const commitCustomRatioHeight = useCallback(() => {
    const parsed = Number(customRatioHeightInput)
    const nextValue = clampCustomCanvasRatioUnit(parsed, customRatioHeight)
    onCustomRatioHeightChange(nextValue)
    setCustomRatioHeightInput(nextValue.toString())
  }, [customRatioHeight, customRatioHeightInput, onCustomRatioHeightChange])

  return (
    <PanelCard
      title="I. Canvas Ratio & Rotation"
      tooltip="Ratio preset or custom width:height, orientation, and preview rotation; ratio and orientation lists preview on rollover"
      collapsed={collapsed}
      collapsedSummary={`${ratioLabel}, ${orientation}, ${rotation}°`}
      onHeaderClick={onHeaderClick}
      onHeaderDoubleClick={onHeaderDoubleClick}
      helpSectionKey="format"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-2">
        <LabeledControlRow label={<Label className="text-sm text-gray-600">Ratio</Label>}>
        <Select
          value={canvasRatio}
          onOpenChange={(open) => {
            if (!open) onCanvasRatioPreviewChange?.(null)
          }}
          onValueChange={(v: CanvasRatioKey) => onCanvasRatioChange(v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent onPointerLeave={() => onCanvasRatioPreviewChange?.(null)}>
            {CANVAS_RATIOS.map((opt) => (
              <SelectItem
                key={opt.key}
                value={opt.key}
                onFocus={() => onCanvasRatioPreviewChange?.(opt.key)}
                onPointerMove={() => onCanvasRatioPreviewChange?.(opt.key)}
              >
                {opt.key === "custom"
                  ? `${opt.label} (${customRatioText} / 1:${customRatioDecimal.toFixed(3)})`
                  : `${opt.label} (${opt.ratioLabel} / 1:${opt.ratioDecimal.toFixed(3)})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </LabeledControlRow>
      </div>
      {canvasRatio === "custom" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm text-gray-600">Ratio Units</Label>
            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">
              {customRatioText}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-[0.08em] text-gray-500">Width</Label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.001}
                inputMode="decimal"
                value={customRatioWidthInput}
                onChange={(event) => setCustomRatioWidthInput(event.target.value)}
                onBlur={commitCustomRatioWidth}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  commitCustomRatioWidth()
                  ;(event.currentTarget as HTMLInputElement).blur()
                }}
                className={inputClassName}
                aria-label="Custom ratio width unit"
              />
            </div>
            <span className="pb-2 text-sm text-gray-500">:</span>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-[0.08em] text-gray-500">Height</Label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.001}
                inputMode="decimal"
                value={customRatioHeightInput}
                onChange={(event) => setCustomRatioHeightInput(event.target.value)}
                onBlur={commitCustomRatioHeight}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  commitCustomRatioHeight()
                  ;(event.currentTarget as HTMLInputElement).blur()
                }}
                className={inputClassName}
                aria-label="Custom ratio height unit"
              />
            </div>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <LabeledControlRow label={<Label className="text-sm text-gray-600">Orientation</Label>}>
        <Select
          value={orientation}
          onOpenChange={(open) => {
            if (!open) onOrientationPreviewChange?.(null)
          }}
          onValueChange={(v: "portrait" | "landscape") => onOrientationChange(v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent onPointerLeave={() => onOrientationPreviewChange?.(null)}>
            <SelectItem
              value="portrait"
              onFocus={() => onOrientationPreviewChange?.("portrait")}
              onPointerMove={() => onOrientationPreviewChange?.("portrait")}
            >
              Portrait
            </SelectItem>
            <SelectItem
              value="landscape"
              onFocus={() => onOrientationPreviewChange?.("landscape")}
              onPointerMove={() => onOrientationPreviewChange?.("landscape")}
            >
              Landscape
            </SelectItem>
          </SelectContent>
        </Select>
        </LabeledControlRow>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-gray-600">Rotation</Label>
          <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded dark:bg-gray-800 dark:text-gray-100">{rotation}°</span>
        </div>
        <DebouncedSlider
          value={[rotation]}
          min={-180}
          max={180}
          step={1}
          onValueCommit={([v]) => onRotationChange(v)}
          onThumbDoubleClick={() => onRotationChange(0)}
        />
      </div>
    </PanelCard>
  )
})

CanvasRatioPanel.displayName = "CanvasRatioPanel"
