"use client"

import { useReducer, useState, useMemo, useRef, useEffect, useCallback } from "react"
import {
  generateSwissGrid,
  FORMATS_PT,
  getMaxBaseline,
  CANVAS_RATIOS,
} from "@/lib/grid-calculator"
import type { GridResult } from "@/lib/grid-calculator"
import { PreviewWorkspace } from "@/components/preview/PreviewWorkspace"
import { ControlSidebar } from "@/components/layout/ControlSidebar"
import { SettingsSidebarPanels } from "@/components/layout/SettingsSidebarPanels"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { formatValue } from "@/lib/units"
import { SECTION_KEYS } from "@/hooks/useSettingsHistory"
import type { UiSettingsSnapshot, SectionKey } from "@/hooks/useSettingsHistory"
import { useExportActions } from "@/hooks/useExportActions"
import { useHeaderActions } from "@/hooks/useHeaderActions"
import {
  HELP_SECTION_BY_HEADER_ACTION,
  HELP_SECTION_BY_SETTINGS_SECTION,
} from "@/lib/help-registry"
import { WorkspaceDialogs } from "@/components/dialogs/WorkspaceDialogs"
import { usePreviewDocumentState } from "@/hooks/usePreviewDocumentState"
import { useProjectController } from "@/hooks/useProjectController"
import { useShellKeyboardShortcuts } from "@/hooks/useShellKeyboardShortcuts"
import { useSidebarPanels } from "@/hooks/useSidebarPanels"
import { useWorkspaceChrome } from "@/hooks/useWorkspaceChrome"
import { useWorkspaceHistory } from "@/hooks/useWorkspaceHistory"
import { useWorkspaceUiActions } from "@/hooks/useWorkspaceUiActions"
import { type LoadedProject, type ProjectPage } from "@/lib/document-session"
import { type FontFamily } from "@/lib/config/fonts"
import { BASELINE_OPTIONS } from "@/lib/config/defaults"
import {
  resolveImageSchemeColor,
} from "@/lib/config/color-schemes"
import {
  DEFAULT_PREVIEW_LAYOUT,
  PREVIEW_DEFAULT_FORMAT_BY_RATIO,
} from "@/lib/config/ui-defaults"
import {
  DEFAULT_A4_BASELINE,
  INITIAL_EXPORT_UI_STATE,
  INITIAL_GRID_UI_STATE,
  buildUiActionsFromLoadedSettings,
  exportUiReducer,
  gridUiReducer,
  type UiAction,
} from "@/lib/workspace-ui-state"
import { useProjectState } from "@/hooks/useProjectState"
import {
  findTextLayerGridReductionConflicts,
  getGridReductionWarningMessage,
} from "@/lib/grid-reduction-validation"
import { toProjectJsonFilename } from "@/lib/project-file-naming"
import { getDefaultColumnSpan } from "@/lib/text-layout"

const CANVAS_RATIO_INDEX = new Map(CANVAS_RATIOS.map((option) => [option.key, option]))
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"
const RELEASE_CHANNEL = (process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? "prod").toLowerCase()
const SHOW_BETA_BADGE = RELEASE_CHANNEL === "beta"
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>
const DEFAULT_PAGE_PREVIEW_LAYOUT = DEFAULT_PREVIEW_LAYOUT as unknown as PreviewLayoutState | null

type NoticeState = {
  title: string
  message: string
} | null

type GridReductionWarningToastState = {
  id: number
  message: string
} | null

export default function Home() {
  const loadFileInputRef = useRef<HTMLInputElement | null>(null)
  const livePreviewSnapshotGetterRef = useRef<(() => PreviewLayoutState) | null>(null)
  const headerClickTimeoutRef = useRef<number | null>(null)
  const [noticeState, setNoticeState] = useState<NoticeState>(null)
  const [gridReductionWarningToast, setGridReductionWarningToast] = useState<GridReductionWarningToastState>(null)
  const [gridUi, dispatchGrid] = useReducer(gridUiReducer, INITIAL_GRID_UI_STATE)
  const [exportUi, dispatchExport] = useReducer(exportUiReducer, INITIAL_EXPORT_UI_STATE)
  const dispatch = useCallback((action: UiAction) => {
    if (action.type === "BATCH") {
      dispatchGrid(action)
      dispatchExport(action)
      return
    }
    dispatchGrid(action)
    dispatchExport(action)
  }, [dispatchExport, dispatchGrid])
  const ui = useMemo(() => ({ ...gridUi, ...exportUi }), [gridUi, exportUi])
  const handleRequestNotice = useCallback((notice: NonNullable<NoticeState>) => {
    setNoticeState(notice)
  }, [])
  const handleRequestGridReductionWarning = useCallback((message: string) => {
    setGridReductionWarningToast({
      id: Date.now(),
      message,
    })
  }, [])
  const dismissGridReductionWarningToast = useCallback(() => {
    setGridReductionWarningToast(null)
  }, [])
  const {
    canvasRatio, exportPaperSize, exportPrintPro, exportBleedMm,
    exportRegistrationMarks, orientation, rotation,
    marginMethod, gridCols, gridRows, baselineMultiple, gutterMultiple, rhythm,
    rhythmRowsEnabled, rhythmRowsDirection, rhythmColsEnabled, rhythmColsDirection,
    typographyScale, baseFont, imageColorScheme, canvasBackground, customBaseline, displayUnit,
    useCustomMargins, customMarginMultipliers, showBaselines, showModules,
    showMargins, showImagePlaceholders, showTypography, showLayers, collapsed,
  } = ui
  const [paragraphColorResetNonce, setParagraphColorResetNonce] = useState(0)
  const {
    setCanvasRatio,
    setOrientation,
    setRotation,
    setMarginMethod,
    setGridCols,
    setGridRows,
    setBaselineMultiple,
    setGutterMultiple,
    setRhythm,
    setRhythmRowsEnabled,
    setRhythmRowsDirection,
    setRhythmColsEnabled,
    setRhythmColsDirection,
    setTypographyScale,
    setBaseFont,
    setImageColorScheme,
    setCanvasBackground,
    resetParagraphColorsToScheme,
    setCustomBaseline,
    setUseCustomMargins,
    setCustomMarginMultipliers,
    setDisplayUnit,
    setExportPaperSize,
    setExportPrintPro,
    setExportBleedMm,
    setExportRegistrationMarks,
    setShowLayers,
    toggleShowBaselines,
    toggleShowMargins,
    toggleShowModules,
    toggleShowImagePlaceholders,
    toggleShowTypography,
  } = useWorkspaceUiActions({
    dispatch,
    canvasBackground,
    setParagraphColorResetNonce,
  })
  const {
    isDarkUi,
    toggleDarkUi,
    showRolloverInfo,
    toggleRolloverInfo,
    isSmartphone,
    uiTheme,
  } = useWorkspaceChrome()

  const {
    activeSidebarPanel,
    activeHelpSectionId,
    showPresetsBrowser,
    showSectionHelpIcons,
    setActiveHelpSectionId,
    setShowPresetsBrowser,
    openSidebarPanel,
    closeSidebarPanel,
    openHelpSection,
    toggleHelpPanel,
    toggleLayersPanel,
  } = useSidebarPanels({
    showLayers,
    onShowLayersChange: setShowLayers,
  })
  const {
    previewLayout,
    loadedPreviewLayout,
    requestedLayerOrderState,
    requestedLayerDeleteState,
    requestedLayerEditorState,
    selectedLayerKey,
    setSelectedLayerKeyWithGrace,
    canUndoPreview,
    previewUndoNonce,
    previewRedoNonce,
    documentHistoryResetNonce,
    requestPreviewUndo,
    requestPreviewRedo,
    handlePreviewHistoryAvailabilityChange,
    applyLoadedPreviewLayout,
    handleLayerOrderChange,
    handleDeleteLayer,
    handlePreviewLayoutChange,
    handlePreviewLayerSelect,
    handleToggleLayerEditor,
  } = usePreviewDocumentState<TypographyStyleKey, FontFamily>({
    activeSidebarPanel,
    defaultLayout: DEFAULT_PAGE_PREVIEW_LAYOUT,
  })

  // ─── Derived values ───────────────────────────────────────────────────────

  const selectedCanvasRatio = useMemo(
    () => CANVAS_RATIO_INDEX.get(canvasRatio) ?? CANVAS_RATIOS[0],
    [canvasRatio],
  )
  const isDinOrAnsiRatio = canvasRatio === "din_ab" || canvasRatio === "letter_ansi_ab"

  const previewFormat = useMemo(() => {
    return PREVIEW_DEFAULT_FORMAT_BY_RATIO[canvasRatio] ?? (selectedCanvasRatio.paperSizes[0] ?? "A4")
  }, [canvasRatio, selectedCanvasRatio])

  const gridUnit = customBaseline ?? DEFAULT_A4_BASELINE

  const paperSizeOptions = useMemo(
    () =>
      selectedCanvasRatio.paperSizes
        .filter((name) => Boolean(FORMATS_PT[name]))
        .map((name) => {
          const dims = FORMATS_PT[name]
          return {
            value: name,
            label: `${name} (${formatValue(dims.width, displayUnit)}×${formatValue(dims.height, displayUnit)} ${displayUnit})`,
          }
        }),
    [displayUnit, selectedCanvasRatio],
  )

  useEffect(() => {
    const available = selectedCanvasRatio.paperSizes
    if (!available.includes(exportPaperSize) && available.length > 0) {
      dispatch({ type: "SET", key: "exportPaperSize", value: available[0] })
    }
  }, [dispatch, exportPaperSize, selectedCanvasRatio])

  const resolvedCustomMargins = useMemo(() => (
    useCustomMargins
      ? {
          top: customMarginMultipliers.top * baselineMultiple * gridUnit,
          bottom: customMarginMultipliers.bottom * baselineMultiple * gridUnit,
          left: customMarginMultipliers.left * baselineMultiple * gridUnit,
          right: customMarginMultipliers.right * baselineMultiple * gridUnit,
        }
      : undefined
  ), [baselineMultiple, customMarginMultipliers, gridUnit, useCustomMargins])

  const buildGridResult = useCallback((nextGridCols: number, nextGridRows: number) => (
    generateSwissGrid({
      format: previewFormat,
      orientation,
      marginMethod,
      gridCols: nextGridCols,
      gridRows: nextGridRows,
      baseline: customBaseline ?? DEFAULT_A4_BASELINE,
      baselineMultiple,
      gutterMultiple,
      rhythm,
      rhythmRowsEnabled,
      rhythmRowsDirection,
      rhythmColsEnabled,
      rhythmColsDirection,
      customMargins: resolvedCustomMargins,
      typographyScale,
    })
  ), [
    baselineMultiple,
    customBaseline,
    gutterMultiple,
    marginMethod,
    orientation,
    previewFormat,
    resolvedCustomMargins,
    rhythm,
    rhythmColsDirection,
    rhythmColsEnabled,
    rhythmRowsDirection,
    rhythmRowsEnabled,
    typographyScale,
  ])

  const result = useMemo(
    () => buildGridResult(gridCols, gridRows),
    [buildGridResult, gridCols, gridRows],
  )

  const maxBaseline = useMemo(() => {
    const formatDim = FORMATS_PT[previewFormat]
    const pageHeight = orientation === "landscape" ? formatDim.width : formatDim.height
    const customMarginUnits = useCustomMargins
      ? baselineMultiple * (customMarginMultipliers.top + customMarginMultipliers.bottom)
      : undefined
    return getMaxBaseline(pageHeight, marginMethod, baselineMultiple, customMarginUnits)
  }, [previewFormat, orientation, marginMethod, baselineMultiple, useCustomMargins, customMarginMultipliers])

  const availableBaselineOptions = useMemo(
    () => BASELINE_OPTIONS.filter((val) => val <= maxBaseline),
    [maxBaseline],
  )

  const baseFilename = useMemo(() => {
    const baselineStr = customBaseline
      ? customBaseline.toFixed(3)
      : result.grid.gridUnit.toFixed(3)
    return `${canvasRatio}_${orientation}_${gridCols}x${gridRows}_method${marginMethod}_${baselineStr}pt`
  }, [canvasRatio, orientation, gridCols, gridRows, marginMethod, customBaseline, result.grid.gridUnit])

  const defaultPdfFilename = useMemo(
    () => `${baseFilename}_${exportPaperSize}_grid.pdf`,
    [baseFilename, exportPaperSize],
  )
  const defaultSvgFilename = useMemo(
    () => `${baseFilename}_${exportPaperSize}_grid.svg`,
    [baseFilename, exportPaperSize],
  )
  const defaultIdmlFilename = useMemo(
    () => `${baseFilename}.idml`,
    [baseFilename],
  )

  // ─── Settings snapshot (for undo/redo) ───────────────────────────────────

  const buildUiSnapshot = useCallback((): UiSettingsSnapshot => ui, [ui])
  const {
    suppressNextSettingsHistory,
    resetSettingsHistory,
    resetHistoryDomains,
    canUndo,
    canRedo,
    undoAny,
    redoAny,
    handlePreviewHistoryRecord,
    markClean,
  } = useWorkspaceHistory({
    buildUiSnapshot,
    onApplyUiSnapshot: (snapshot) => {
      dispatch({ type: "APPLY_SNAPSHOT", snapshot })
    },
    canUndoPreview,
    requestPreviewUndo,
    requestPreviewRedo,
  })

  const applyLoadedUiActions = useCallback((actions: UiAction[]) => {
    const nextGridUi = actions.reduce(gridUiReducer, gridUi)
    const nextExportUi = actions.reduce(exportUiReducer, exportUi)
    const nextSnapshot = { ...nextGridUi, ...nextExportUi } as UiSettingsSnapshot
    resetSettingsHistory(nextSnapshot)
    resetHistoryDomains()
    if (actions.length > 0) {
      suppressNextSettingsHistory()
      dispatch({ type: "BATCH", actions })
    }
  }, [dispatch, exportUi, gridUi, resetHistoryDomains, resetSettingsHistory, suppressNextSettingsHistory])

  const currentUiSettingsPayload = useMemo(
    () => ({ ...ui, format: previewFormat }),
    [previewFormat, ui],
  )

  const getCurrentPreviewLayout = useCallback(
    () => livePreviewSnapshotGetterRef.current?.() ?? previewLayout,
    [previewLayout],
  )

  const handlePreviewSnapshotGetterChange = useCallback((getSnapshot: (() => PreviewLayoutState) | null) => {
    livePreviewSnapshotGetterRef.current = getSnapshot
  }, [])

  const handleApplyProjectPage = useCallback((page: ProjectPage<PreviewLayoutState>) => {
    const actions = buildUiActionsFromLoadedSettings(page.uiSettings, collapsed)
    applyLoadedUiActions(actions)
    applyLoadedPreviewLayout(page.previewLayout)
    setShowPresetsBrowser(false)
  }, [applyLoadedPreviewLayout, applyLoadedUiActions, collapsed, setShowPresetsBrowser])

  const {
    pages: projectPages,
    activePageId,
    applyLoadedProject,
    selectPage,
    addPage,
    renamePage,
    deletePage,
    reorderPages,
  } = useProjectState<PreviewLayoutState>({
    // NEW: Project/Pages/Layers architecture
    defaultUiSettings: currentUiSettingsPayload,
    defaultPreviewLayout: DEFAULT_PAGE_PREVIEW_LAYOUT,
    currentUiSettings: currentUiSettingsPayload,
    currentPreviewLayout: previewLayout,
    getCurrentPreviewLayout,
    onApplyPage: handleApplyProjectPage,
  })

  const handleApplyLoadedProject = useCallback((project: LoadedProject<PreviewLayoutState>) => {
    applyLoadedProject(project)
    setShowPresetsBrowser(false)
    markClean()
  }, [applyLoadedProject, markClean, setShowPresetsBrowser])

  const {
    projectMetadata,
    setProjectMetadata,
    loadProjectFromInput,
    loadPresetProject: handleLoadPresetProject,
  } = useProjectController<PreviewLayoutState>({
    onApplyProject: handleApplyLoadedProject,
    onLoadFailed: () => {
      handleRequestNotice({
        title: "Load Failed",
        message: "Could not load project JSON.",
      })
    },
  })

  const defaultJsonFilename = useMemo(() => {
    return toProjectJsonFilename(projectMetadata.title, baseFilename)
  }, [baseFilename, projectMetadata.title])

  const getGridReductionConflicts = useCallback((nextGridCols: number, nextGridRows: number) => {
    const layout = getCurrentPreviewLayout()
    if (!layout) {
      return {
        columnConflicts: [],
        rowConflicts: [],
      }
    }
    return findTextLayerGridReductionConflicts({
      blockOrder: layout.blockOrder,
      blockModulePositions: layout.blockModulePositions,
      resolveBlockSpan: (key) => {
        const raw = layout.blockColumnSpans[key]
        return typeof raw === "number" && Number.isFinite(raw)
          ? raw
          : getDefaultColumnSpan(key, gridCols)
      },
      resolveBlockRows: (key) => {
        const raw = layout.blockRowSpans?.[key]
        return typeof raw === "number" && Number.isFinite(raw) ? raw : 1
      },
      imageOrder: layout.imageOrder,
      imageModulePositions: layout.imageModulePositions,
      resolveImageSpan: (key) => {
        const raw = layout.imageColumnSpans?.[key]
        return typeof raw === "number" && Number.isFinite(raw) ? raw : 1
      },
      resolveImageRows: (key) => {
        const raw = layout.imageRowSpans?.[key]
        return typeof raw === "number" && Number.isFinite(raw) ? raw : 1
      },
      nextGridCols,
      nextGridRows,
    })
  }, [getCurrentPreviewLayout, gridCols])

  const handleGridColsChange = useCallback((nextGridCols: number) => {
    if (nextGridCols === gridCols) return
    if (nextGridCols < gridCols) {
      const { columnConflicts } = getGridReductionConflicts(nextGridCols, gridRows)
      if (columnConflicts.length > 0) {
        handleRequestGridReductionWarning(getGridReductionWarningMessage("columns"))
        return
      }
    }
    dismissGridReductionWarningToast()
    setGridCols(nextGridCols)
  }, [
    dismissGridReductionWarningToast,
    getGridReductionConflicts,
    gridCols,
    gridRows,
    handleRequestGridReductionWarning,
    setGridCols,
  ])

  const handleGridRowsChange = useCallback((nextGridRows: number) => {
    if (nextGridRows === gridRows) return
    if (nextGridRows < gridRows) {
      const { rowConflicts } = getGridReductionConflicts(gridCols, nextGridRows)
      if (rowConflicts.length > 0) {
        handleRequestGridReductionWarning(getGridReductionWarningMessage("rows"))
        return
      }
    }
    dismissGridReductionWarningToast()
    setGridRows(nextGridRows)
  }, [
    dismissGridReductionWarningToast,
    getGridReductionConflicts,
    gridCols,
    gridRows,
    handleRequestGridReductionWarning,
    setGridRows,
  ])

  const handleProjectTitleChange = useCallback((nextTitle: string) => {
    const trimmedTitle = nextTitle.trim()
    if (!trimmedTitle) return
    setProjectMetadata((current) => (
      current.title === trimmedTitle
        ? current
        : {
            ...current,
            title: trimmedTitle,
          }
    ))
  }, [setProjectMetadata])

  const handlePreviewGridRestore = useCallback((cols: number, rows: number) => {
    suppressNextSettingsHistory()
    dispatch({ type: "BATCH", actions: [
      { type: "SET", key: "gridCols", value: cols },
      { type: "SET", key: "gridRows", value: rows },
    ] })
  }, [dispatch, suppressNextSettingsHistory])

  // ─── Section collapse helpers ─────────────────────────────────────────────

  const toggle = useCallback((key: SectionKey) =>
    dispatch({ type: "TOGGLE_SECTION", key }), [dispatch])

  const toggleAllSections = useCallback(() => {
    const allClosed = SECTION_KEYS.every((key) => collapsed[key])
    dispatch({ type: "SET_ALL_SECTIONS", value: !allClosed })
  }, [collapsed, dispatch])

  const handleSectionHeaderClick = useCallback((key: SectionKey) => (event: React.MouseEvent) => {
    if (event.detail > 1) return
    if (headerClickTimeoutRef.current !== null) window.clearTimeout(headerClickTimeoutRef.current)
    headerClickTimeoutRef.current = window.setTimeout(() => {
      toggle(key)
      headerClickTimeoutRef.current = null
    }, 180)
  }, [toggle])

  const handleSectionHeaderDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    if (headerClickTimeoutRef.current !== null) {
      window.clearTimeout(headerClickTimeoutRef.current)
      headerClickTimeoutRef.current = null
    }
    toggleAllSections()
  }, [toggleAllSections])

  const handleSectionHelpNavigate = useCallback((key: SectionKey) => {
    const targetSectionId = HELP_SECTION_BY_SETTINGS_SECTION[key]
    setActiveHelpSectionId(targetSectionId)
  }, [setActiveHelpSectionId])
  const handleHeaderHelpNavigate = useCallback((actionKey: string) => {
    const targetSectionId = HELP_SECTION_BY_HEADER_ACTION[actionKey]
    if (!targetSectionId) return
    setActiveHelpSectionId(targetSectionId)
  }, [setActiveHelpSectionId])

  useEffect(() => {
    return () => {
      if (headerClickTimeoutRef.current !== null) window.clearTimeout(headerClickTimeoutRef.current)
    }
  }, [])

  // ─── Export / Save actions ────────────────────────────────────────────────

  const buildProjectPayload = useCallback(() => {
    const currentPreviewSnapshot = getCurrentPreviewLayout()
    const exportedPages = projectPages.map((page) => ({
      id: page.id,
      name: page.name,
      uiSettings: page.id === activePageId ? currentUiSettingsPayload : page.uiSettings,
      previewLayout: page.id === activePageId ? currentPreviewSnapshot : page.previewLayout,
    }))

    return {
      activePageId,
      pages: exportedPages,
    }
  }, [activePageId, currentUiSettingsPayload, getCurrentPreviewLayout, projectPages])

  const resolvedCanvasBackground = useMemo(
    () => (canvasBackground ? resolveImageSchemeColor(canvasBackground, imageColorScheme) : null),
    [canvasBackground, imageColorScheme],
  )

  const exportActionsContext = useMemo(
    () => ({
      result,
      previewLayout,
      baseFont,
      orientation,
      rotation,
      imageColorScheme,
      canvasBackground: resolvedCanvasBackground,
      showBaselines,
      showModules,
      showMargins,
      showImagePlaceholders,
      showTypography,
      isDinOrAnsiRatio,
      displayUnit,
      setDisplayUnit,
      exportPaperSize,
      setExportPaperSize,
      exportPrintPro,
      setExportPrintPro,
      exportBleedMm,
      setExportBleedMm,
      exportRegistrationMarks,
      setExportRegistrationMarks,
      paperSizeOptions,
      previewFormat,
      defaultPdfFilename,
      defaultSvgFilename,
      defaultIdmlFilename,
      defaultJsonFilename,
      projectMetadata,
      onProjectMetadataChange: setProjectMetadata,
      buildProjectPayload,
    }),
    [
      result,
      previewLayout,
      baseFont,
      orientation,
      rotation,
      imageColorScheme,
      resolvedCanvasBackground,
      showBaselines,
      showModules,
      showMargins,
      showImagePlaceholders,
      showTypography,
      isDinOrAnsiRatio,
      displayUnit,
      setDisplayUnit,
      exportPaperSize,
      setExportPaperSize,
      exportPrintPro,
      setExportPrintPro,
      exportBleedMm,
      setExportBleedMm,
      exportRegistrationMarks,
      setExportRegistrationMarks,
      paperSizeOptions,
      previewFormat,
      defaultPdfFilename,
      defaultSvgFilename,
      defaultIdmlFilename,
      defaultJsonFilename,
      projectMetadata,
      setProjectMetadata,
      buildProjectPayload,
    ],
  )

  const exportActions = useExportActions(exportActionsContext)

  useShellKeyboardShortcuts({
    canUndo,
    canRedo,
    showPresetsBrowser,
    onLoadJson: () => loadFileInputRef.current?.click(),
    onSaveJson: exportActions.openSaveDialog,
    onExportPdf: exportActions.openExportDialog,
    onUndo: undoAny,
    onRedo: redoAny,
    onToggleDarkMode: toggleDarkUi,
    onToggleBaselines: toggleShowBaselines,
    onToggleMargins: toggleShowMargins,
    onToggleModules: toggleShowModules,
    onToggleTypography: toggleShowTypography,
    onToggleLayersPanel: toggleLayersPanel,
    onToggleRolloverInfo: toggleRolloverInfo,
    onToggleSettingsPanel: () => openSidebarPanel(activeSidebarPanel === "settings" ? null : "settings"),
    onToggleHelpPanel: toggleHelpPanel,
    onToggleImprintPanel: () => openSidebarPanel(activeSidebarPanel === "imprint" ? null : "imprint"),
    onOpenPresets: () => setShowPresetsBrowser(true),
    onClosePresets: () => setShowPresetsBrowser(false),
  })

  const handleConfirmSaveJSON = useCallback(() => {
    exportActions.confirmSaveJSON()
    markClean()
  }, [exportActions, markClean])

  const { fileGroup, displayGroup, sidebarGroup } = useHeaderActions({
    activeSidebarPanel,
    showPresetsBrowser,
    isDarkUi,
    showBaselines,
    showMargins,
    showModules,
    showImagePlaceholders,
    showTypography,
    showLayers,
    showRolloverInfo,
    canUndo,
    canRedo,
    onOpenPresets: () => setShowPresetsBrowser(true),
    onLoadJson: () => loadFileInputRef.current?.click(),
    onSaveJson: exportActions.openSaveDialog,
    onExportPdf: exportActions.openExportDialog,
    onUndo: undoAny,
    onRedo: redoAny,
    onToggleDarkMode: toggleDarkUi,
    onToggleBaselines: toggleShowBaselines,
    onToggleMargins: toggleShowMargins,
    onToggleModules: toggleShowModules,
    onToggleImagePlaceholders: toggleShowImagePlaceholders,
    onToggleTypography: toggleShowTypography,
    onToggleLayersPanel: toggleLayersPanel,
    onToggleRolloverInfo: toggleRolloverInfo,
    onToggleSettingsPanel: () => openSidebarPanel(activeSidebarPanel === "settings" ? null : "settings"),
    onToggleHelpPanel: toggleHelpPanel,
  })

  const previewWorkspace = (
    <PreviewWorkspace
      fileGroup={fileGroup}
      displayGroup={displayGroup}
      sidebarGroup={sidebarGroup}
      activeSidebarPanel={activeSidebarPanel}
      activeHelpSectionId={activeHelpSectionId}
      showPresetsBrowser={showPresetsBrowser}
      isDarkUi={isDarkUi}
      showSectionHelpIcons={showSectionHelpIcons}
      showRolloverInfo={showRolloverInfo}
      showBaselines={showBaselines}
      showModules={showModules}
      showMargins={showMargins}
      showImagePlaceholders={showImagePlaceholders}
      showTypography={showTypography}
      baseFont={baseFont}
      imageColorScheme={imageColorScheme}
      resolvedCanvasBackground={resolvedCanvasBackground}
      rotation={rotation}
      previewUndoNonce={previewUndoNonce}
      previewRedoNonce={previewRedoNonce}
      documentHistoryResetNonce={documentHistoryResetNonce}
      paragraphColorResetNonce={paragraphColorResetNonce}
      selectedLayerKey={selectedLayerKey}
      projectTitle={projectMetadata.title}
      projectPages={projectPages}
      activePageId={activePageId}
      previewLayout={previewLayout}
      loadedPreviewLayout={loadedPreviewLayout}
      requestedLayerOrderState={requestedLayerOrderState}
      requestedLayerDeleteState={requestedLayerDeleteState}
      requestedLayerEditorState={requestedLayerEditorState}
      appVersion={APP_VERSION}
      uiTheme={{
        divider: uiTheme.divider,
        bodyText: uiTheme.bodyText,
        previewHeader: uiTheme.previewHeader,
        previewShell: uiTheme.previewShell,
        previewContent: uiTheme.previewContent,
        sidebar: uiTheme.sidebar,
        sidebarBody: uiTheme.sidebarBody,
        sidebarHeading: uiTheme.sidebarHeading,
      }}
      result={result}
      onLoadPreset={handleLoadPresetProject}
      onHeaderHelpNavigate={handleHeaderHelpNavigate}
      onOpenHelpSection={openHelpSection}
      onHistoryRecord={handlePreviewHistoryRecord}
      onUndoRequest={undoAny}
      onRedoRequest={redoAny}
      onHistoryAvailabilityChange={handlePreviewHistoryAvailabilityChange}
      onRequestGridRestore={handlePreviewGridRestore}
      gridReductionWarningToast={gridReductionWarningToast}
      onDismissGridReductionWarningToast={dismissGridReductionWarningToast}
      onRequestGridReductionWarning={handleRequestGridReductionWarning}
      onRequestNotice={handleRequestNotice}
      onLayoutChange={handlePreviewLayoutChange}
      onSnapshotGetterChange={handlePreviewSnapshotGetterChange}
      onProjectTitleChange={handleProjectTitleChange}
      onPageSelect={selectPage}
      onPageAdd={addPage}
      onPageRename={renamePage}
      onPageDelete={deletePage}
      onPageOrderChange={reorderPages}
      onLayerOrderChange={handleLayerOrderChange}
      onLayerSelect={handlePreviewLayerSelect}
      onLayerEditorToggle={handleToggleLayerEditor}
      onLayerDelete={handleDeleteLayer}
      onSelectedLayerKeyChange={setSelectedLayerKeyWithGrace}
      onImageColorSchemeChange={setImageColorScheme}
      closeSidebarPanel={closeSidebarPanel}
    />
  )

  if (isSmartphone) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-6 text-white">
        <div className="w-full max-w-md rounded-lg border border-white/20 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Screen Too Small</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/85">
            Swiss Grid Generator requires a viewport width of at least 768 pixels.
            Open it on a tablet, laptop, or desktop screen, or enlarge this window to continue.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <input
        ref={loadFileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={loadProjectFromInput}
      />
      <div className={`flex h-screen overflow-hidden flex-col md:flex-row ${uiTheme.root}`}>
        <ControlSidebar
          showPresetsBrowser={showPresetsBrowser}
          showBetaBadge={SHOW_BETA_BADGE}
          appVersion={APP_VERSION}
          uiTheme={{
            leftPanel: uiTheme.leftPanel,
            subtleBorder: uiTheme.subtleBorder,
            bodyText: uiTheme.bodyText,
            link: uiTheme.link,
          }}
          settingsPanels={(
            <SettingsSidebarPanels
              collapsed={collapsed}
              showSectionHelpIcons={showSectionHelpIcons}
              showRolloverInfo={showRolloverInfo}
              onHelpNavigate={handleSectionHelpNavigate}
              onSectionHeaderClick={handleSectionHeaderClick}
              onSectionHeaderDoubleClick={handleSectionHeaderDoubleClick}
              canvasRatio={canvasRatio}
              onCanvasRatioChange={setCanvasRatio}
              orientation={orientation}
              onOrientationChange={setOrientation}
              rotation={rotation}
              onRotationChange={setRotation}
              customBaseline={customBaseline}
              availableBaselineOptions={availableBaselineOptions}
              onCustomBaselineChange={setCustomBaseline}
              marginMethod={marginMethod}
              onMarginMethodChange={setMarginMethod}
              baselineMultiple={baselineMultiple}
              onBaselineMultipleChange={setBaselineMultiple}
              useCustomMargins={useCustomMargins}
              onUseCustomMarginsChange={setUseCustomMargins}
              customMarginMultipliers={customMarginMultipliers}
              onCustomMarginMultipliersChange={setCustomMarginMultipliers}
              currentMargins={result.grid.margins}
              gridUnit={gridUnit}
              gridCols={gridCols}
              onGridColsChange={handleGridColsChange}
              gridRows={gridRows}
              onGridRowsChange={handleGridRowsChange}
              gutterMultiple={gutterMultiple}
              onGutterMultipleChange={setGutterMultiple}
              rhythm={rhythm}
              onRhythmChange={setRhythm}
              rhythmRowsEnabled={rhythmRowsEnabled}
              onRhythmRowsEnabledChange={setRhythmRowsEnabled}
              rhythmRowsDirection={rhythmRowsDirection}
              onRhythmRowsDirectionChange={setRhythmRowsDirection}
              rhythmColsEnabled={rhythmColsEnabled}
              onRhythmColsEnabledChange={setRhythmColsEnabled}
              rhythmColsDirection={rhythmColsDirection}
              onRhythmColsDirectionChange={setRhythmColsDirection}
              typographyScale={typographyScale}
              onTypographyScaleChange={setTypographyScale}
              typographyStyles={result.typography.styles}
              baseFont={baseFont}
              onBaseFontChange={setBaseFont}
              colorScheme={imageColorScheme}
              onColorSchemeChange={setImageColorScheme}
              onResetParagraphColors={resetParagraphColorsToScheme}
              canvasBackground={canvasBackground}
              onCanvasBackgroundChange={setCanvasBackground}
              isDarkMode={isDarkUi}
            />
          )}
          onToggleFeedbackPanel={() => openSidebarPanel(activeSidebarPanel === "feedback" ? null : "feedback")}
          onToggleImprintPanel={() => openSidebarPanel(activeSidebarPanel === "imprint" ? null : "imprint")}
        />

        {previewWorkspace}

        <WorkspaceDialogs
          ratioLabel={selectedCanvasRatio.label}
          orientation={orientation}
          rotation={rotation}
          isDarkUi={isDarkUi}
          isDinOrAnsiRatio={isDinOrAnsiRatio}
          displayUnit={displayUnit}
          onDisplayUnitChange={setDisplayUnit}
          exportDialog={{
            isOpen: exportActions.isExportDialogOpen,
            onClose: () => exportActions.setIsExportDialogOpen(false),
            paperSize: exportActions.exportPaperSizeDraft,
            onPaperSizeChange: exportActions.setExportPaperSizeDraft,
            paperSizeOptions,
            width: exportActions.exportWidthDraft,
            onWidthChange: exportActions.setExportWidthDraft,
            format: exportActions.exportFormatDraft,
            onFormatChange: exportActions.setExportFormatDraft,
            filename: exportActions.exportFilenameDraft,
            onFilenameChange: exportActions.setExportFilenameDraft,
            defaultFilename: exportActions.defaultExportFilename,
            activePrintPreset: exportActions.activePrintPresetDraft,
            showPrintAdjustments: exportActions.showPrintAdjustmentsDraft,
            onApplyPrintPreset: exportActions.applyPrintPreset,
            bleedMm: exportActions.exportBleedMmDraft,
            onBleedMmChange: exportActions.setExportBleedMmDraft,
            registrationMarks: exportActions.exportRegistrationMarksDraft,
            onRegistrationMarksChange: exportActions.setExportRegistrationMarksDraft,
            onConfirm: exportActions.confirmExport,
            getOrientedDimensions: exportActions.getOrientedDimensions,
          }}
          saveDialog={{
            isOpen: exportActions.isSaveDialogOpen,
            onClose: () => exportActions.setIsSaveDialogOpen(false),
            filename: exportActions.saveFilenameDraft,
            onFilenameChange: exportActions.setSaveFilenameDraft,
            title: exportActions.saveTitleDraft,
            onTitleChange: exportActions.setSaveTitleDraft,
            description: exportActions.saveDescriptionDraft,
            onDescriptionChange: exportActions.setSaveDescriptionDraft,
            author: exportActions.saveAuthorDraft,
            onAuthorChange: exportActions.setSaveAuthorDraft,
            onConfirm: handleConfirmSaveJSON,
            defaultFilename: defaultJsonFilename,
          }}
          noticeState={noticeState}
          onCloseNotice={() => setNoticeState(null)}
        />
      </div>
    </>
  )
}
