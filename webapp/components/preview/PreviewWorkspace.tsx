"use client"

import { Info, Plus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { GridPreview } from "@/components/grid-preview"
import { FeedbackPanel } from "@/components/sidebar/FeedbackPanel"
import { HelpPanel } from "@/components/sidebar/HelpPanel"
import { ImprintPanel } from "@/components/sidebar/ImprintPanel"
import { PagesPanel } from "@/components/sidebar/PagesPanel"
import { PresetLayoutsPanel } from "@/components/sidebar/PresetLayoutsPanel"
import { ProjectTitleSection } from "@/components/sidebar/ProjectTitleSection"
import { HeaderIconButton } from "@/components/ui/header-icon-button"
import { getStyleDefaultFontWeight, resolveFontVariant, type FontFamily } from "@/lib/config/fonts"
import {
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { type ProjectPage } from "@/lib/document-session"
import type { HelpSectionId } from "@/lib/help-registry"
import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"
import type { HeaderAction, HeaderItem } from "@/hooks/useHeaderActions"
import type { GridResult } from "@/lib/grid-calculator"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import type { LayoutPreset } from "@/lib/presets"
import { HelpIndicatorLine } from "@/components/ui/help-indicator-line"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"
import { ProjectTourOverlay } from "@/components/preview/ProjectTourOverlay"
import { buildGridResultFromUiSettings, resolveUiSettingsSnapshot } from "@/lib/ui-settings-resolver"
import {
  getProjectPagePhysicalPageNumber,
  getProjectPhysicalPageCount,
} from "@/lib/document-page-numbering"

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
  projectAuthor: string
  projectCreatedAt?: string
  projectPages: PreviewProjectPage[]
  activePageId: string
  loadedPreviewLayout: { token: number; layout: PreviewLayoutState } | null
  requestedLayerOrderState: { token: number; order: string[] } | null
  requestedLayerDeleteState: { token: number; target: string } | null
  requestedLayerEditorState: { token: number; target: string } | null
  requestedLayerLockState: { token: number; target: string; locked: boolean } | null
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
  onPageFacingToggle: (pageId: string, enabled: boolean) => void
  onPageRename: (pageId: string, nextName: string) => void
  onPageDelete: (pageId: string) => void
  onPageOrderChange: (orderedIds: string[]) => void
  onLayerOrderChange: (nextLayerOrder: string[]) => void
  onLayerSelect: (key: string | null) => void
  onLayerEditorToggle: (target: string) => void
  onLayerLockToggle: (target: string, locked: boolean) => void
  onLayerDelete: (target: string, kind: "text" | "image") => void
  onSelectedLayerKeyChange: (key: string | null) => void
  onImageColorSchemeChange: (value: ImageColorSchemeId) => void
  onShowImagePlaceholdersChange: (value: boolean) => void
  editorSidebarHost: HTMLDivElement | null
  editorMode: "text" | "image" | null
  onEditorModeChange: (mode: "text" | "image" | null) => void
  closeSidebarPanel: () => void
  tourState?: {
    title: string
    description?: string
    isOpen: boolean
    stepTitle?: string
    stepCaption?: string
    stepIndex: number
    stepCount: number
    waitingForLayerClick: boolean
    canGoBack: boolean
    canGoNext: boolean
    onStart: () => void
    onClose: () => void
    onBack: () => void
    onNext: () => void
  } | null
}

function renderHeaderAction(
  action: HeaderAction,
  showSectionHelpIcons: boolean,
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
        showTooltip
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
  projectAuthor,
  projectCreatedAt,
  projectPages,
  activePageId,
  loadedPreviewLayout,
  requestedLayerOrderState,
  requestedLayerDeleteState,
  requestedLayerEditorState,
  requestedLayerLockState,
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
  onPageFacingToggle,
  onPageRename,
  onPageDelete,
  onPageOrderChange,
  onLayerOrderChange,
  onLayerSelect,
  onLayerEditorToggle,
  onLayerLockToggle,
  onLayerDelete,
  onSelectedLayerKeyChange,
  onImageColorSchemeChange,
  onShowImagePlaceholdersChange,
  editorSidebarHost,
  editorMode,
  onEditorModeChange,
  closeSidebarPanel,
  tourState = null,
}: Props) {
  const [previewHoveredLayerKey, setPreviewHoveredLayerKey] = useState<string | null>(null)
  const [layerPanelHoveredLayerKey, setLayerPanelHoveredLayerKey] = useState<string | null>(null)
  const [previewEditorOpenToken, setPreviewEditorOpenToken] = useState(0)
  const [showProjectInfo, setShowProjectInfo] = useState(false)
  const previewVariableNow = useMemo(() => new Date(), [])
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

  const activePageNumber = useMemo(() => {
    return getProjectPagePhysicalPageNumber(projectPages, activePageId)
  }, [activePageId, projectPages])
  const documentVariablePageCount = useMemo(
    () => getProjectPhysicalPageCount(projectPages),
    [projectPages],
  )

  const totalLayerCount = useMemo(() => (
    projectPages.reduce((sum, page) => (
      sum
      + (page.previewLayout?.blockOrder.length ?? 0)
      + (page.previewLayout?.imageOrder?.length ?? 0)
    ), 0)
  ), [projectPages])

  const projectInfoStats = useMemo(() => {
    const usedFonts = new Set<string>()
    const usedCuts = new Set<string>()
    let wordCount = 0
    let characterCount = 0

    projectPages.forEach((page) => {
      const layout = page.previewLayout
      if (!layout) return

      const uiSnapshot = resolveUiSettingsSnapshot(page.uiSettings)
      const pageResult = buildGridResultFromUiSettings(uiSnapshot)
      const styleDefinitions = pageResult.typography.styles
      const pageBaseFont = uiSnapshot.baseFont
      const blockFonts = layout.blockFontFamilies ?? {}
      const blockWeights = layout.blockFontWeights ?? {}
      const blockItalic = layout.blockItalic ?? {}
      const styleAssignments = layout.styleAssignments ?? {}

      layout.blockOrder.forEach((key) => {
        const rawText = layout.textContent[key] ?? ""
        characterCount += rawText.length
        const words = rawText.trim().match(/\S+/g)
        wordCount += words?.length ?? 0

        const styleKey = styleAssignments[key] ?? "body"
        const family = blockFonts[key] ?? pageBaseFont
        const requestedWeight = typeof blockWeights[key] === "number" && Number.isFinite(blockWeights[key])
          ? blockWeights[key]!
          : getStyleDefaultFontWeight(styleDefinitions[styleKey]?.weight)
        const requestedItalic = typeof blockItalic[key] === "boolean"
          ? blockItalic[key]!
          : styleDefinitions[styleKey]?.blockItalic === true
        const variant = resolveFontVariant(family, requestedWeight, requestedItalic)
        usedFonts.add(family)
        usedCuts.add(`${family}:${variant.id}`)
      })
    })

    return {
      fontCount: usedFonts.size,
      cutCount: usedCuts.size,
      wordCount,
      characterCount,
    }
  }, [projectPages])

  const formattedProjectCreatedAt = useMemo(() => {
    if (!projectCreatedAt) return null
    const timestamp = Date.parse(projectCreatedAt)
    if (Number.isNaN(timestamp)) return null
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(timestamp))
  }, [projectCreatedAt])

  const projectInfoSentence = useMemo(() => {
    const authorText = projectAuthor.trim()
      ? ` It was created by ${projectAuthor.trim()}`
      : " It has no saved author"
    const createdAtText = formattedProjectCreatedAt
      ? ` on ${formattedProjectCreatedAt}.`
      : "."
    return `This document consists of ${documentVariablePageCount} ${documentVariablePageCount === 1 ? "page" : "pages"} with ${totalLayerCount} ${totalLayerCount === 1 ? "layer" : "layers"}, uses ${projectInfoStats.fontCount} ${projectInfoStats.fontCount === 1 ? "font" : "fonts"} and ${projectInfoStats.cutCount} ${projectInfoStats.cutCount === 1 ? "cut" : "cuts"}, and contains ${projectInfoStats.wordCount} ${projectInfoStats.wordCount === 1 ? "word" : "words"} and ${projectInfoStats.characterCount} ${projectInfoStats.characterCount === 1 ? "character" : "characters"}.${authorText}${createdAtText}`
  }, [documentVariablePageCount, formattedProjectCreatedAt, projectAuthor, projectInfoStats.characterCount, projectInfoStats.cutCount, projectInfoStats.fontCount, projectInfoStats.wordCount, totalLayerCount])

  const documentVariableContext = useMemo(() => ({
    projectTitle,
    pageNumber: activePageNumber,
    pageCount: documentVariablePageCount,
    now: previewVariableNow,
  }), [activePageNumber, documentVariablePageCount, previewVariableNow, projectTitle])

  return (
    <div className={`min-h-0 min-w-0 flex flex-1 flex-col ${uiTheme.previewShell}`}>
      <div className={`px-4 py-3 md:px-6 border-b ${uiTheme.previewHeader}`}>
        <div className="flex flex-col gap-2 landscape:flex-row landscape:items-center landscape:justify-between landscape:gap-3">
          <div className="flex flex-wrap items-start gap-2 landscape:flex-nowrap">
            {fileGroup.map((item) =>
              item.type === "divider"
                ? <div key={item.key} className={`h-6 w-px ${uiTheme.divider}`} aria-hidden="true" />
                : renderHeaderAction(item.action, showSectionHelpIcons, onHeaderHelpNavigate),
            )}
          </div>

          <div className="flex flex-wrap items-start gap-2 landscape:flex-nowrap">
            {displayGroup.map((item) =>
              item.type === "divider"
                ? <div key={item.key} className={`h-6 w-px ${uiTheme.divider}`} aria-hidden="true" />
                : renderHeaderAction(item.action, showSectionHelpIcons, onHeaderHelpNavigate),
            )}
          </div>

          <div className="flex flex-wrap items-start gap-2 landscape:flex-nowrap">
            {sidebarGroup.map((action) => renderHeaderAction(action, showSectionHelpIcons, onHeaderHelpNavigate))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
        <div
          className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-auto transition-colors ${
            showPresetsBrowser ? "p-4 md:p-6" : ""
          } ${
            editorMode ? uiTheme.previewContentEdit : uiTheme.previewContent
          }`}
        >
          {!showPresetsBrowser && tourState ? (
            <ProjectTourOverlay
              title={tourState.title}
              description={tourState.description}
              isOpen={tourState.isOpen}
              stepTitle={tourState.stepTitle}
              stepCaption={tourState.stepCaption}
              stepIndex={tourState.stepIndex}
              stepCount={tourState.stepCount}
              waitingForLayerClick={tourState.waitingForLayerClick}
              canGoBack={tourState.canGoBack}
              canGoNext={tourState.canGoNext}
              isDarkMode={isDarkUi}
              onStart={tourState.onStart}
              onClose={tourState.onClose}
              onBack={tourState.onBack}
              onNext={tourState.onNext}
            />
          ) : null}
          {showPresetsBrowser ? (
            <div className={`h-full min-h-[360px] w-full p-4 ${isDarkUi ? "bg-[#1D232D]" : "bg-gray-100/60"}`}>
              <PresetLayoutsPanel
                isDarkMode={isDarkUi}
                onLoadPreset={onLoadPreset}
                showRolloverInfo={false}
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
              showRolloverInfo={false}
              smartTextEditZoomEnabled={smartTextZoomEnabled}
              baseFont={baseFont}
              imageColorScheme={imageColorScheme}
              documentVariableContext={documentVariableContext}
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
              requestedLayerLockTarget={requestedLayerLockState?.target ?? null}
              requestedLayerLockValue={requestedLayerLockState?.locked ?? false}
              requestedLayerLockToken={requestedLayerLockState?.token ?? 0}
              selectedLayerKey={activeSidebarPanel === "layers" ? selectedLayerKey : null}
              keyboardSelectedLayerKey={selectedLayerKey}
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
                  <div className="rounded-md py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className={`${SECTION_HEADLINE_CLASSNAME} mb-0 ${uiTheme.sidebarHeading}`}>P R O J E C T</h3>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={showProjectInfo ? "Hide document info" : "Show document info"}
                          aria-pressed={showProjectInfo}
                          onClick={() => setShowProjectInfo((current) => !current)}
                          className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors ${
                            showProjectInfo
                              ? isDarkUi
                                ? "border-[#f54123] bg-[#f54123] text-[#F4F6F8]"
                                : "border-[#f54123] bg-[#f54123] text-white"
                              : isDarkUi
                                ? "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:text-[#F4F6F8]"
                                : "border-gray-300 bg-gray-100 text-gray-700 hover:text-gray-900"
                          }`}
                        >
                          <Info className="h-2 w-2" />
                        </button>
                        <button
                          type="button"
                          aria-label="Close project panel"
                          onClick={closeSidebarPanel}
                          className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors ${
                            isDarkUi
                              ? "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:text-[#F4F6F8]"
                              : "border-gray-300 bg-gray-100 text-gray-700 hover:text-gray-900"
                          }`}
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {showProjectInfo ? (
                    <div className="pb-4 pt-1">
                      <p className={`text-xs leading-[1.45] ${uiTheme.sidebarBody}`}>
                        {projectInfoSentence}
                      </p>
                    </div>
                  ) : null}
                  <ProjectTitleSection
                    projectTitle={projectTitle}
                    pageCount={documentVariablePageCount}
                    onProjectTitleChange={onProjectTitleChange}
                    isDarkMode={isDarkUi}
                  />
                  <div className="mt-4 rounded-md py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className={`${SECTION_HEADLINE_CLASSNAME} ${uiTheme.sidebarHeading}`}>Pages</div>
                      </div>
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
                    </div>
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
                    onFacingPageToggle={onPageFacingToggle}
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
                        onLayerLockToggle={onLayerLockToggle}
                        onLayerDelete={onLayerDelete}
                        isDarkMode={isDarkUi}
                      />
                </div>
                <div className={`shrink-0 border-t px-4 py-3 text-[11px] md:px-6 ${isDarkUi ? "border-[#313A47]" : "border-gray-200"}`}>
                  <div className="flex items-center justify-between gap-3 leading-none">
                    <div className={`font-semibold uppercase tracking-[0.08em] ${uiTheme.sidebarHeading}`}>Add Page</div>
                    <button
                      type="button"
                      aria-label="Add page"
                      onClick={onPageAdd}
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center transition-colors ${isDarkUi ? "text-[#A8B1BF] hover:text-[#F4F6F8]" : "text-gray-500 hover:text-gray-900"}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
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
