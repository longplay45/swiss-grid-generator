"use client"

import { X } from "lucide-react"
import { useEffect, useState } from "react"

import { GridPreview } from "@/components/grid-preview"
import { HelpPanel } from "@/components/sidebar/HelpPanel"
import { ImprintPanel } from "@/components/sidebar/ImprintPanel"
import { LayersPanel } from "@/components/sidebar/LayersPanel"
import { PresetLayoutsPanel } from "@/components/sidebar/PresetLayoutsPanel"
import { HeaderIconButton } from "@/components/ui/header-icon-button"
import type { FontFamily } from "@/lib/config/fonts"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { HelpSectionId } from "@/lib/help-registry"
import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"
import type { HeaderAction, HeaderItem } from "@/hooks/useHeaderActions"
import type { GridResult } from "@/lib/grid-calculator"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import type { LayoutPreset } from "@/lib/presets"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>

type UiTheme = {
  divider: string
  bodyText: string
  previewHeader: string
  previewShell: string
  previewContent: string
  sidebar: string
  sidebarBody: string
  sidebarHeading: string
}

type Props = {
  fileGroup: HeaderItem[]
  displayGroup: HeaderItem[]
  sidebarGroup: HeaderAction[]
  activeSidebarPanel: "settings" | "help" | "imprint" | "layers" | null
  activeHelpSectionId: HelpSectionId | null
  showPresetsBrowser: boolean
  isDarkUi: boolean
  showSectionHelpIcons: boolean
  showRolloverInfo: boolean
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders: boolean
  showTypography: boolean
  baseFont: FontFamily
  imageColorScheme: ImageColorSchemeId
  resolvedCanvasBackground: string | null
  rotation: number
  previewUndoNonce: number
  previewRedoNonce: number
  documentHistoryResetNonce: number
  paragraphColorResetNonce: number
  selectedLayerKey: string | null
  previewLayout: PreviewLayoutState | null
  loadedPreviewLayout: { token: number; layout: PreviewLayoutState } | null
  requestedLayerOrderState: { token: number; order: string[] } | null
  requestedLayerDeleteState: { token: number; target: string } | null
  requestedLayerEditorState: { token: number; target: string } | null
  uiTheme: UiTheme
  result: GridResult
  onLoadPreset: (preset: LayoutPreset) => void
  onHeaderHelpNavigate: (actionKey: string) => void
  onOpenHelpSection: (sectionId: HelpSectionId) => void
  onHistoryRecord: () => void
  onUndoRequest: () => void
  onRedoRequest: () => void
  onHistoryAvailabilityChange: (undoAvailable: boolean, redoAvailable: boolean) => void
  onRequestGridRestore: (cols: number, rows: number) => void
  onRequestNotice: (notice: { title: string; message: string }) => void
  onLayoutChange: (layout: PreviewLayoutState) => void
  onLayerOrderChange: (nextLayerOrder: string[]) => void
  onLayerSelect: (key: string | null) => void
  onLayerEditorToggle: (target: string) => void
  onLayerDelete: (target: string, kind: "text" | "image") => void
  onSelectedLayerKeyChange: (key: string | null) => void
  onImageColorSchemeChange: (value: ImageColorSchemeId) => void
  closeSidebarPanel: () => void
}

function renderHeaderAction(
  action: HeaderAction,
  showSectionHelpIcons: boolean,
  showRolloverInfo: boolean,
  onHeaderHelpNavigate: (actionKey: string) => void,
) {
  const shortcut = action.shortcutId
    ? PREVIEW_HEADER_SHORTCUTS.find((item) => item.id === action.shortcutId)?.combo
    : null
  const tooltip = shortcut ? `${action.tooltip}\n${shortcut}` : action.tooltip
  return (
    <div
      key={action.key}
      data-preview-header-action={action.key}
      className="inline-flex w-8 items-center justify-center"
      onMouseEnter={showSectionHelpIcons ? () => onHeaderHelpNavigate(action.key) : undefined}
    >
      <HeaderIconButton
        ariaLabel={action.ariaLabel}
        tooltip={tooltip}
        variant={action.variant ?? "outline"}
        aria-pressed={action.pressed}
        disabled={action.disabled}
        onClick={action.onClick}
        showTooltip={showRolloverInfo}
        buttonClassName={showSectionHelpIcons ? "relative" : undefined}
      >
        {showSectionHelpIcons ? <HelpIndicatorLine inset="icon" /> : null}
        {action.icon}
      </HeaderIconButton>
    </div>
  )
}

export function PreviewWorkspace({
  fileGroup,
  displayGroup,
  sidebarGroup,
  activeSidebarPanel,
  activeHelpSectionId,
  showPresetsBrowser,
  isDarkUi,
  showSectionHelpIcons,
  showRolloverInfo,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders,
  showTypography,
  baseFont,
  imageColorScheme,
  resolvedCanvasBackground,
  rotation,
  previewUndoNonce,
  previewRedoNonce,
  documentHistoryResetNonce,
  paragraphColorResetNonce,
  selectedLayerKey,
  previewLayout,
  loadedPreviewLayout,
  requestedLayerOrderState,
  requestedLayerDeleteState,
  requestedLayerEditorState,
  uiTheme,
  result,
  onLoadPreset,
  onHeaderHelpNavigate,
  onOpenHelpSection,
  onHistoryRecord,
  onUndoRequest,
  onRedoRequest,
  onHistoryAvailabilityChange,
  onRequestGridRestore,
  onRequestNotice,
  onLayoutChange,
  onLayerOrderChange,
  onLayerSelect,
  onLayerEditorToggle,
  onLayerDelete,
  onSelectedLayerKeyChange,
  onImageColorSchemeChange,
  closeSidebarPanel,
}: Props) {
  const [previewHoveredLayerKey, setPreviewHoveredLayerKey] = useState<string | null>(null)
  const [layerPanelHoveredLayerKey, setLayerPanelHoveredLayerKey] = useState<string | null>(null)
  const hoveredLayerKey = previewHoveredLayerKey ?? layerPanelHoveredLayerKey

  useEffect(() => {
    if (activeSidebarPanel === "layers" && !showPresetsBrowser) return
    setLayerPanelHoveredLayerKey(null)
  }, [activeSidebarPanel, showPresetsBrowser])

  useEffect(() => {
    if (!showPresetsBrowser) return
    setPreviewHoveredLayerKey(null)
  }, [showPresetsBrowser])

  return (
    <div className={`min-h-0 flex flex-1 flex-col ${uiTheme.previewShell}`}>
      <div className={`px-4 py-3 md:px-6 border-b ${uiTheme.previewHeader}`}>
        <div className="flex flex-col gap-2 landscape:flex-row landscape:items-center landscape:justify-between landscape:gap-3">
          <div className="flex flex-wrap items-start gap-2 landscape:flex-nowrap">
            {fileGroup.map((item) =>
              item.type === "divider"
                ? <div key={item.key} className={`h-6 w-px ${uiTheme.divider}`} aria-hidden="true" />
                : renderHeaderAction(item.action, showSectionHelpIcons, showRolloverInfo, onHeaderHelpNavigate),
            )}
          </div>

          <div className="flex flex-wrap items-start gap-2 landscape:flex-nowrap">
            {displayGroup.map((item) =>
              item.type === "divider"
                ? <div key={item.key} className={`h-6 w-px ${uiTheme.divider}`} aria-hidden="true" />
                : renderHeaderAction(item.action, showSectionHelpIcons, showRolloverInfo, onHeaderHelpNavigate),
            )}
          </div>

          <div className="flex flex-wrap items-start gap-2 landscape:flex-nowrap">
            {sidebarGroup.map((action) => renderHeaderAction(action, showSectionHelpIcons, showRolloverInfo, onHeaderHelpNavigate))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <div className={`flex min-h-0 flex-1 overflow-auto ${showPresetsBrowser ? "p-4 md:p-6" : ""} ${uiTheme.previewContent}`}>
          {showPresetsBrowser ? (
            <div className={`h-full min-h-[360px] rounded-md border p-4 ${isDarkUi ? "border-gray-700 bg-gray-900/40" : "border-gray-200 bg-gray-100/60"}`}>
              <PresetLayoutsPanel
                isDarkMode={isDarkUi}
                onLoadPreset={onLoadPreset}
                showRolloverInfo={showRolloverInfo}
                showHelpHints={showSectionHelpIcons}
                onHelpNavigate={() => onHeaderHelpNavigate("presets")}
                compact
              />
            </div>
          ) : (
            <GridPreview
              result={result}
              showBaselines={showBaselines}
              showModules={showModules}
              showMargins={showMargins}
              showImagePlaceholders={showImagePlaceholders}
              showTypography={showTypography}
              showRolloverInfo={showRolloverInfo}
              baseFont={baseFont}
              imageColorScheme={imageColorScheme}
              canvasBackground={resolvedCanvasBackground}
              onImageColorSchemeChange={onImageColorSchemeChange}
              initialLayout={loadedPreviewLayout?.layout ?? null}
              initialLayoutToken={loadedPreviewLayout?.token ?? 0}
              rotation={rotation}
              undoNonce={previewUndoNonce}
              redoNonce={previewRedoNonce}
              historyResetToken={documentHistoryResetNonce}
              paragraphColorResetToken={paragraphColorResetNonce}
              onHistoryRecord={onHistoryRecord}
              onUndoRequest={onUndoRequest}
              onRedoRequest={onRedoRequest}
              onOpenHelpSection={onOpenHelpSection}
              showEditorHelpIcon={showSectionHelpIcons}
              showPreviewHelpIndicator={showSectionHelpIcons}
              onHistoryAvailabilityChange={onHistoryAvailabilityChange}
              onRequestGridRestore={onRequestGridRestore}
              onRequestNotice={onRequestNotice}
              requestedLayerOrder={requestedLayerOrderState?.order ?? null}
              requestedLayerOrderToken={requestedLayerOrderState?.token ?? 0}
              requestedLayerDeleteTarget={requestedLayerDeleteState?.target ?? null}
              requestedLayerDeleteToken={requestedLayerDeleteState?.token ?? 0}
              requestedLayerEditorTarget={requestedLayerEditorState?.target ?? null}
              requestedLayerEditorToken={requestedLayerEditorState?.token ?? 0}
              selectedLayerKey={activeSidebarPanel === "layers" ? selectedLayerKey : null}
              hoveredLayerKey={layerPanelHoveredLayerKey}
              onHoverLayerChange={setPreviewHoveredLayerKey}
              onSelectLayer={onLayerSelect}
              isDarkMode={isDarkUi}
              onLayoutChange={onLayoutChange}
            />
          )}
        </div>
        {!showPresetsBrowser && activeSidebarPanel && (
          <div
            data-help-scroll-root="true"
            className={`w-[280px] shrink-0 border-l overflow-y-auto text-sm ${uiTheme.sidebar} ${
              activeSidebarPanel === "help"
                ? "px-4 pb-4 pt-0 md:px-6 md:pb-6 md:pt-0"
                : "p-4 md:p-6"
            }`}
          >
            {activeSidebarPanel === "settings" && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${uiTheme.sidebarHeading}`}>Settings</h3>
                  <button
                    type="button"
                    aria-label="Close settings panel"
                    onClick={closeSidebarPanel}
                    className={`rounded-sm p-1 transition-colors ${isDarkUi ? "text-gray-300 hover:bg-gray-700 hover:text-gray-100" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className={`space-y-2 text-xs ${uiTheme.sidebarBody}`}>
                  <p>This is a placeholder settings page.</p>
                  <p>
                    Future settings can be added here (profile, defaults, shortcuts, language,
                    etc.).
                  </p>
                </div>
              </div>
            )}
            {activeSidebarPanel === "help" && (
              <HelpPanel
                isDarkMode={isDarkUi}
                onClose={closeSidebarPanel}
                activeSectionId={activeHelpSectionId}
              />
            )}
            {activeSidebarPanel === "layers" && (
              <LayersPanel
                layout={previewLayout}
                baseFont={baseFont}
                imageColorScheme={imageColorScheme}
                selectedLayerKey={selectedLayerKey}
                hoveredLayerKey={hoveredLayerKey}
                onLayerOrderChange={onLayerOrderChange}
                onSelectLayer={onSelectedLayerKeyChange}
                onHoverLayerChange={setLayerPanelHoveredLayerKey}
                onToggleEditor={onLayerEditorToggle}
                onDeleteLayer={onLayerDelete}
                onClose={closeSidebarPanel}
                isDarkMode={isDarkUi}
              />
            )}
            {activeSidebarPanel === "imprint" && (
              <ImprintPanel
                isDarkMode={isDarkUi}
                onClose={closeSidebarPanel}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
