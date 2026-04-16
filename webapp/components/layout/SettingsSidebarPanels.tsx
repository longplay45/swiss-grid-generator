"use client"

import { memo } from "react"

import { BaselineGridPanel } from "@/components/settings/BaselineGridPanel"
import { CanvasRatioPanel } from "@/components/settings/CanvasRatioPanel"
import { ColorSchemePanel } from "@/components/settings/ColorSchemePanel"
import { GutterPanel } from "@/components/settings/GutterPanel"
import { MarginsPanel } from "@/components/settings/MarginsPanel"
import { SettingsHelpNavigationProvider } from "@/components/settings/help-navigation-context"
import { TypographyPanel } from "@/components/settings/TypographyPanel"
import type {
  GridRhythm,
  GridRhythmColsDirection,
  GridRhythmRowsDirection,
  TypographyScale,
} from "@/lib/config/defaults"
import type { FontFamily } from "@/lib/config/fonts"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { CanvasRatioKey, GridResult } from "@/lib/grid-calculator"
import type { SectionKey } from "@/hooks/useSettingsHistory"

type CustomMarginMultipliers = {
  top: number
  left: number
  right: number
  bottom: number
}

type Props = {
  collapsed: Record<SectionKey, boolean>
  showSectionHelpIcons: boolean
  showRolloverInfo: boolean
  onHelpNavigate: (section: SectionKey) => void
  onSectionHeaderClick: (section: SectionKey) => (event: React.MouseEvent) => void
  onSectionHeaderDoubleClick: (event: React.MouseEvent) => void
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
  customBaseline: number
  availableBaselineOptions: number[]
  onCustomBaselineChange: (value: number) => void
  marginMethod: 1 | 2 | 3
  onMarginMethodChange: (value: 1 | 2 | 3) => void
  onMarginMethodPreviewChange?: (value: "1" | "2" | "3" | "custom" | null) => void
  baselineMultiple: number
  onBaselineMultipleChange: (value: number) => void
  useCustomMargins: boolean
  onUseCustomMarginsChange: (value: boolean) => void
  customMarginMultipliers: CustomMarginMultipliers
  onCustomMarginMultipliersChange: (value: CustomMarginMultipliers) => void
  currentMargins: GridResult["grid"]["margins"]
  gridUnit: number
  gridCols: number
  onGridColsChange: (value: number) => void
  gridRows: number
  onGridRowsChange: (value: number) => void
  gutterMultiple: number
  onGutterMultipleChange: (value: number) => void
  rhythm: GridRhythm
  onRhythmChange: (value: GridRhythm) => void
  onRhythmPreviewChange?: (value: GridRhythm | null) => void
  rhythmRowsEnabled: boolean
  onRhythmRowsEnabledChange: (value: boolean) => void
  rhythmRowsDirection: GridRhythmRowsDirection
  onRhythmRowsDirectionChange: (value: GridRhythmRowsDirection) => void
  onRhythmRowsDirectionPreviewChange?: (value: GridRhythmRowsDirection | null) => void
  rhythmColsEnabled: boolean
  onRhythmColsEnabledChange: (value: boolean) => void
  rhythmColsDirection: GridRhythmColsDirection
  onRhythmColsDirectionChange: (value: GridRhythmColsDirection) => void
  onRhythmColsDirectionPreviewChange?: (value: GridRhythmColsDirection | null) => void
  typographyScale: TypographyScale
  onTypographyScaleChange: (value: TypographyScale) => void
  onTypographyScalePreviewChange?: (value: TypographyScale | null) => void
  typographyStyles: GridResult["typography"]["styles"]
  baseFont: FontFamily
  onBaseFontChange: (value: FontFamily) => void
  onBaseFontPreviewChange?: (value: FontFamily | null) => void
  colorScheme: ImageColorSchemeId
  onColorSchemeChange: (value: ImageColorSchemeId) => void
  onColorSchemePreviewChange?: (value: ImageColorSchemeId | null) => void
  canvasBackground: string | null
  onCanvasBackgroundChange: (value: string | null) => void
  onCanvasBackgroundPreviewChange?: (value: string | null) => void
  isDarkMode: boolean
}

export const SettingsSidebarPanels = memo(function SettingsSidebarPanels({
  collapsed,
  showSectionHelpIcons,
  showRolloverInfo,
  onHelpNavigate,
  onSectionHeaderClick,
  onSectionHeaderDoubleClick,
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
  customBaseline,
  availableBaselineOptions,
  onCustomBaselineChange,
  marginMethod,
  onMarginMethodChange,
  onMarginMethodPreviewChange,
  baselineMultiple,
  onBaselineMultipleChange,
  useCustomMargins,
  onUseCustomMarginsChange,
  customMarginMultipliers,
  onCustomMarginMultipliersChange,
  currentMargins,
  gridUnit,
  gridCols,
  onGridColsChange,
  gridRows,
  onGridRowsChange,
  gutterMultiple,
  onGutterMultipleChange,
  rhythm,
  onRhythmChange,
  onRhythmPreviewChange,
  rhythmRowsEnabled,
  onRhythmRowsEnabledChange,
  rhythmRowsDirection,
  onRhythmRowsDirectionChange,
  onRhythmRowsDirectionPreviewChange,
  rhythmColsEnabled,
  onRhythmColsEnabledChange,
  rhythmColsDirection,
  onRhythmColsDirectionChange,
  onRhythmColsDirectionPreviewChange,
  typographyScale,
  onTypographyScaleChange,
  onTypographyScalePreviewChange,
  typographyStyles,
  baseFont,
  onBaseFontChange,
  onBaseFontPreviewChange,
  colorScheme,
  onColorSchemeChange,
  onColorSchemePreviewChange,
  canvasBackground,
  onCanvasBackgroundChange,
  onCanvasBackgroundPreviewChange,
  isDarkMode,
}: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
      <SettingsHelpNavigationProvider
        value={{ showHelpIcons: showSectionHelpIcons, showRolloverInfo, onNavigate: onHelpNavigate }}
      >
        <CanvasRatioPanel
          collapsed={collapsed.format}
          onHeaderClick={onSectionHeaderClick("format")}
          onHeaderDoubleClick={onSectionHeaderDoubleClick}
          canvasRatio={canvasRatio}
          onCanvasRatioChange={onCanvasRatioChange}
          onCanvasRatioPreviewChange={onCanvasRatioPreviewChange}
          customRatioWidth={customRatioWidth}
          onCustomRatioWidthChange={onCustomRatioWidthChange}
          customRatioHeight={customRatioHeight}
          onCustomRatioHeightChange={onCustomRatioHeightChange}
          orientation={orientation}
          onOrientationChange={onOrientationChange}
          onOrientationPreviewChange={onOrientationPreviewChange}
          rotation={rotation}
          onRotationChange={onRotationChange}
          isDarkMode={isDarkMode}
        />

        <BaselineGridPanel
          collapsed={collapsed.baseline}
          onHeaderClick={onSectionHeaderClick("baseline")}
          onHeaderDoubleClick={onSectionHeaderDoubleClick}
          customBaseline={customBaseline}
          availableBaselineOptions={availableBaselineOptions}
          onCustomBaselineChange={onCustomBaselineChange}
          isDarkMode={isDarkMode}
        />

        <MarginsPanel
          collapsed={collapsed.margins}
          onHeaderClick={onSectionHeaderClick("margins")}
          onHeaderDoubleClick={onSectionHeaderDoubleClick}
          marginMethod={marginMethod}
          onMarginMethodChange={onMarginMethodChange}
          onMarginMethodPreviewChange={onMarginMethodPreviewChange}
          baselineMultiple={baselineMultiple}
          onBaselineMultipleChange={onBaselineMultipleChange}
          useCustomMargins={useCustomMargins}
          onUseCustomMarginsChange={onUseCustomMarginsChange}
          customMarginMultipliers={customMarginMultipliers}
          onCustomMarginMultipliersChange={onCustomMarginMultipliersChange}
          currentMargins={currentMargins}
          gridUnit={gridUnit}
          isDarkMode={isDarkMode}
        />

        <GutterPanel
          collapsed={collapsed.gutter}
          onHeaderClick={onSectionHeaderClick("gutter")}
          onHeaderDoubleClick={onSectionHeaderDoubleClick}
          gridCols={gridCols}
          onGridColsChange={onGridColsChange}
          gridRows={gridRows}
          onGridRowsChange={onGridRowsChange}
          gutterMultiple={gutterMultiple}
          onGutterMultipleChange={onGutterMultipleChange}
          rhythm={rhythm}
          onRhythmChange={onRhythmChange}
          onRhythmPreviewChange={onRhythmPreviewChange}
          rhythmRowsEnabled={rhythmRowsEnabled}
          onRhythmRowsEnabledChange={onRhythmRowsEnabledChange}
          rhythmRowsDirection={rhythmRowsDirection}
          onRhythmRowsDirectionChange={onRhythmRowsDirectionChange}
          onRhythmRowsDirectionPreviewChange={onRhythmRowsDirectionPreviewChange}
          rhythmColsEnabled={rhythmColsEnabled}
          onRhythmColsEnabledChange={onRhythmColsEnabledChange}
          rhythmColsDirection={rhythmColsDirection}
          onRhythmColsDirectionChange={onRhythmColsDirectionChange}
          onRhythmColsDirectionPreviewChange={onRhythmColsDirectionPreviewChange}
          isDarkMode={isDarkMode}
        />

        <TypographyPanel
          collapsed={collapsed.typo}
          onHeaderClick={onSectionHeaderClick("typo")}
          onHeaderDoubleClick={onSectionHeaderDoubleClick}
          typographyScale={typographyScale}
          onTypographyScaleChange={onTypographyScaleChange}
          onTypographyScalePreviewChange={onTypographyScalePreviewChange}
          typographyStyles={typographyStyles}
          baseFont={baseFont}
          onBaseFontChange={onBaseFontChange}
          onBaseFontPreviewChange={onBaseFontPreviewChange}
          isDarkMode={isDarkMode}
        />

        <ColorSchemePanel
          collapsed={collapsed.color}
          onHeaderClick={onSectionHeaderClick("color")}
          onHeaderDoubleClick={onSectionHeaderDoubleClick}
          colorScheme={colorScheme}
          onColorSchemeChange={onColorSchemeChange}
          onColorSchemePreviewChange={onColorSchemePreviewChange}
          canvasBackground={canvasBackground}
          onCanvasBackgroundChange={onCanvasBackgroundChange}
          onCanvasBackgroundPreviewChange={onCanvasBackgroundPreviewChange}
          isDarkMode={isDarkMode}
        />
      </SettingsHelpNavigationProvider>
    </div>
  )
})

SettingsSidebarPanels.displayName = "SettingsSidebarPanels"
