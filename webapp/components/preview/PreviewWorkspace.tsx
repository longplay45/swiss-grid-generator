"use client"

import { Plus, X } from "lucide-react"
import { useEffect, useState } from "react"

import { GridPreview } from "@/components/grid-preview"
import { FeedbackPanel } from "@/components/sidebar/FeedbackPanel"
import { HelpPanel } from "@/components/sidebar/HelpPanel"
import { ImprintPanel } from "@/components/sidebar/ImprintPanel"
import { PagesPanel } from "@/components/sidebar/PagesPanel"
import { PresetLayoutsPanel } from "@/components/sidebar/PresetLayoutsPanel"
import { ProjectTitleSection } from "@/components/sidebar/ProjectTitleSection"
import { HeaderIconButton } from "@/components/ui/header-icon-button"
import { HoverTooltip } from "@/components/ui/hover-tooltip"
import type { FontFamily } from "@/lib/config/fonts"
import type { ImageColorSchemeId } from "@/lib/config/color-schemes"
import type { ProjectPage } from "@/lib/document-session"
import type { HelpSectionId } from "@/lib/help-registry"
import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"
import type { HeaderAction, HeaderItem } from "@/hooks/useHeaderActions"
import type { GridResult } from "@/lib/grid-calculator"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import type { LayoutPreset } from "@/lib/presets"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"

type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>
type PreviewProjectPage = ProjectPage<PreviewLayoutState>

type UiTheme = {
  divider: string
  bodyText: string
  previewHeader: string
  previewShell: string
  previewContent: string
  previewContentEdit: string
  sidebar: string
  sidebarBody: string
  sidebarHeading: string
}

type Props = {
  fileGroup: HeaderItem[]
  displayGroup: HeaderItem[]
  sidebarGroup: HeaderAction[]
  activeSidebarPanel: "settings" | "help" | "imprint" | "layers" | "feedback" | null
  activeHelpSectionId: HelpSectionId | null
  showPresetsBrowser: boolean
  isDarkUi: boolean
  showSectionHelpIcons: boolean
  showRolloverInfo: boolean
  smartTextZoomEnabled: boolean
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
  selectedLayerKey: string | null
  projectTitle: string
  projectPages: PreviewProjectPage[]
  activePageId: string
  loadedPreviewLayout: { token: number; layout: PreviewLayoutState } | null
  requestedLayerOrderState: { token: number; order: string[] } | null
  requestedLayerDeleteState: { token: number; target: string } | null
  requestedLayerEditorState: { token: number; target: string } | null
  appVersion: string
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
  gridReductionWarningToast: { id: number; message: string } | null
  onDismissGridReductionWarningToast: () => void
  onRequestGridReductionWarning: (message: string) => void
  onRequestNotice: (notice: { title: string; message: string }) => void
  onLayoutChange: (layout: PreviewLayoutState) => void
  onSnapshotGetterChange: (getSnapshot: (() => PreviewLayoutState) | null) => void
  onProjectTitleChange: (nextTitle: string) => void
  onPageSelect: (pageId: string) => void
  onPageAdd: () => void
  onPageRename: (pageId: string, nextName: string) => void
  onPageDelete: (pageId: string) => void
  onPageOrderChange: (orderedIds: string[]) => void
  onLayerOrderChange: (nextLayerOrder: string[]) => void
  onLayerSelect: (key: string | null) => void
  onLayerEditorToggle: (target: string) => void
  onLayerDelete: (target: string, kind: "text" | "image") => void
  onSelectedLayerKeyChange: (key: string | null) => void
  onImageColorSchemeChange: (value: ImageColorSchemeId) => void
  onShowImagePlaceholdersChange: (value: boolean) => void
  editorSidebarHost: HTMLDivElement | null
  editorMode: "text" | "image" | null
  onEditorModeChange: (mode: "text" | "image" | null) => void
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
        {showSectionHelpIcons ? <HelpIndicatorLine /> : null}
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
  smartTextZoomEnabled,
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
  selectedLayerKey,
  projectTitle,
  projectPages,
  activePageId,
  loadedPreviewLayout,
  requestedLayerOrderState,
  requestedLayerDeleteState,
  requestedLayerEditorState,
  appVersion,
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
  gridReductionWarningToast,
  onDismissGridReductionWarningToast,
  onRequestGridReductionWarning,
  onRequestNotice,
  onLayoutChange,
  onSnapshotGetterChange,
  onProjectTitleChange,
  onPageSelect,
  onPageAdd,
  onPageRename,
  onPageDelete,
  onPageOrderChange,
  onLayerOrderChange,
  onLayerSelect,
  onLayerEditorToggle,
  onLayerDelete,
  onSelectedLayerKeyChange,
  onImageColorSchemeChange,
  onShowImagePlaceholdersChange,
  editorSidebarHost,
  editorMode,
  onEditorModeChange,
  closeSidebarPanel,
}: Props) {
  const [previewHoveredLayerKey, setPreviewHoveredLayerKey] = useState<string | null>(null)
  const [layerPanelHoveredLayerKey, setLayerPanelHoveredLayerKey] = useState<string | null>(null)
  const [previewEditorOpenToken, setPreviewEditorOpenToken] = useState(0)
  const hoveredLayerKey = previewHoveredLayerKey ?? layerPanelHoveredLayerKey
  const shouldRenderSidebarPanel = activeSidebarPanel !== null && (
    !showPresetsBrowser
    || activeSidebarPanel === "feedback"
    || activeSidebarPanel === "imprint"
  )

  useEffect(() => {
    if (activeSidebarPanel === "layers" && !showPresetsBrowser) return
    setLayerPanelHoveredLayerKey(null)
  }, [activeSidebarPanel, showPresetsBrowser])

  useEffect(() => {
    if (!showPresetsBrowser) return
    setPreviewHoveredLayerKey(null)
  }, [showPresetsBrowser])

  return (
    <div className={`min-h-0 min-w-0 flex flex-1 flex-col ${uiTheme.previewShell}`}>
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-auto transition-colors ${
            showPresetsBrowser ? "p-4 md:p-6" : ""
          } ${
            editorMode ? uiTheme.previewContentEdit : uiTheme.previewContent
          }`}
        >
          {showPresetsBrowser ? (
            <div className={`h-full min-h-[360px] w-full rounded-md border p-4 ${isDarkUi ? "border-[#313A47] bg-[#1D232D]" : "border-gray-200 bg-gray-100/60"}`}>
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
              smartTextEditZoomEnabled={smartTextZoomEnabled}
              baseFont={baseFont}
              imageColorScheme={imageColorScheme}
              canvasBackground={resolvedCanvasBackground}
              onImageColorSchemeChange={onImageColorSchemeChange}
              onShowImagePlaceholdersChange={onShowImagePlaceholdersChange}
              initialLayout={loadedPreviewLayout?.layout ?? null}
              initialLayoutToken={loadedPreviewLayout?.token ?? 0}
              rotation={rotation}
              undoNonce={previewUndoNonce}
              redoNonce={previewRedoNonce}
              historyResetToken={documentHistoryResetNonce}
              onHistoryRecord={onHistoryRecord}
              onUndoRequest={onUndoRequest}
              onRedoRequest={onRedoRequest}
              onOpenHelpSection={onOpenHelpSection}
              showEditorHelpIcon={showSectionHelpIcons}
              showPreviewHelpIndicator={showSectionHelpIcons}
              onHistoryAvailabilityChange={onHistoryAvailabilityChange}
              onRequestGridRestore={onRequestGridRestore}
              gridReductionWarningToast={gridReductionWarningToast}
              onDismissGridReductionWarningToast={onDismissGridReductionWarningToast}
              onRequestGridReductionWarning={onRequestGridReductionWarning}
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
              editorSidebarHost={editorSidebarHost}
              onEditorModeChange={onEditorModeChange}
              onPreviewEditorOpen={() => setPreviewEditorOpenToken((current) => current + 1)}
              isDarkMode={isDarkUi}
              onLayoutChange={onLayoutChange}
              onSnapshotGetterChange={onSnapshotGetterChange}
            />
          )}
        </div>
        {shouldRenderSidebarPanel && (
          <div
            data-help-scroll-root={activeSidebarPanel === "layers" ? undefined : "true"}
            className={` min-h-0 w-[280px] basis-[280px] shrink-0 border-l overflow-x-hidden text-sm ${uiTheme.sidebar} ${
              activeSidebarPanel === "layers"
                ? "overflow-hidden"
                : activeSidebarPanel === "help"
                  ? "overflow-y-auto overscroll-contain px-4 pb-4 pt-0 md:px-6 md:pb-6 md:pt-0"
                  : "overflow-y-auto overscroll-contain p-4 md:p-6"
            }`}
          >
            {activeSidebarPanel === "help" && (
              <HelpPanel
                isDarkMode={isDarkUi}
                onClose={closeSidebarPanel}
                activeSectionId={activeHelpSectionId}
              />
            )}
            {activeSidebarPanel === "layers" && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-3 shrink-0 px-4 pt-4 md:px-6 md:pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`${SECTION_HEADLINE_CLASSNAME} mb-0 ${uiTheme.sidebarHeading}`}>Project Structure</h3>
                    <button
                      type="button"
                      aria-label="Close project panel"
                      onClick={closeSidebarPanel}
                      className={`rounded-sm p-1 transition-colors ${isDarkUi ? "text-[#A8B1BF] hover:bg-[#232A35] hover:text-[#F4F6F8]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {showRolloverInfo ? (
                    <p className={`mt-1 text-xs ${uiTheme.sidebarBody}`}>
                      Edit the project name, manage page order, and expand any page to inspect its layers inline. Add Page duplicates the active page, and active-page layer hover or selection stays linked to the preview.
                    </p>
                  ) : null}
                  <ProjectTitleSection
                    projectTitle={projectTitle}
                    pageCount={projectPages.length}
                    onProjectTitleChange={onProjectTitleChange}
                    isDarkMode={isDarkUi}
                  />
                  <div className="mt-4 flex items-center justify-between gap-3 leading-none">
                    <div className={`${SECTION_HEADLINE_CLASSNAME} ${uiTheme.sidebarHeading}`}>Pages</div>
                    <HoverTooltip
                      label="Duplicate the active page."
                      disabled={!showRolloverInfo}
                      tooltipClassName="border-gray-200 bg-white/95 text-gray-700 shadow-lg dark:border-[#313A47] dark:bg-[#1D232D]/95 dark:text-[#F4F6F8]"
                    >
                      <button
                        type="button"
                        aria-label="Add page"
                        onClick={onPageAdd}
                        className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isDarkUi
                            ? "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:text-[#F4F6F8]"
                            : "border-gray-300 bg-gray-100 text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        <Plus className="h-2 w-2" />
                      </button>
                    </HoverTooltip>
                  </div>
                </div>
                <div
                  data-help-scroll-root="true"
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 md:px-6"
                >
                  <PagesPanel
                    pages={projectPages}
                    activePageId={activePageId}
                    onSelectPage={onPageSelect}
                    onRenamePage={onPageRename}
                    onDeletePage={onPageDelete}
                    onPageOrderChange={onPageOrderChange}
                    baseFont={baseFont}
                    imageColorScheme={imageColorScheme}
                    selectedLayerKey={selectedLayerKey}
                    hoveredLayerKey={hoveredLayerKey}
                    editingLayerKey={editorMode ? selectedLayerKey : null}
                    editorMode={editorMode}
                    previewEditorOpenToken={previewEditorOpenToken}
                    onLayerOrderChange={onLayerOrderChange}
                    onSelectedLayerKeyChange={onSelectedLayerKeyChange}
                    onHoverLayerChange={setLayerPanelHoveredLayerKey}
                    onLayerEditorToggle={onLayerEditorToggle}
                    onLayerDelete={onLayerDelete}
                    isDarkMode={isDarkUi}
                  />
                </div>
                <div className={`shrink-0 border-t px-4 py-3 text-[11px] md:px-6 ${isDarkUi ? "border-[#313A47]" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between gap-3 leading-none">
                    <div className={`font-semibold uppercase tracking-[0.08em] ${uiTheme.sidebarHeading}`}>Add Page</div>
                    <HoverTooltip
                      label="Duplicate the active page."
                      disabled={!showRolloverInfo}
                      tooltipClassName="border-gray-200 bg-white/95 text-gray-700 shadow-lg dark:border-[#313A47] dark:bg-[#1D232D]/95 dark:text-[#F4F6F8]"
                    >
                      <button
                        type="button"
                        aria-label="Add page"
                        onClick={onPageAdd}
                        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center transition-colors ${isDarkUi ? "text-[#A8B1BF] hover:text-[#F4F6F8]" : "text-gray-500 hover:text-gray-900"}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </HoverTooltip>
                  </div>
                </div>
              </div>
            )}
            {activeSidebarPanel === "imprint" && (
              <ImprintPanel
                isDarkMode={isDarkUi}
                onClose={closeSidebarPanel}
              />
            )}
            {activeSidebarPanel === "feedback" && (
              <FeedbackPanel
                isDarkMode={isDarkUi}
                appVersion={appVersion}
                onClose={closeSidebarPanel}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
