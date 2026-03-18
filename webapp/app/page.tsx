"use client"

import { useReducer, useState, useMemo, useRef, useEffect, useCallback } from "react"
import {
  generateSwissGrid,
  FORMATS_PT,
  getMaxBaseline,
  CANVAS_RATIOS,
} from "@/lib/grid-calculator"
import type { CanvasRatioKey } from "@/lib/grid-calculator"
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
import { clampRotation } from "@/lib/block-constraints"
import { useDocumentController } from "@/hooks/useDocumentController"
import { usePreviewDocumentState } from "@/hooks/usePreviewDocumentState"
import { useShellKeyboardShortcuts } from "@/hooks/useShellKeyboardShortcuts"
import { useSidebarPanels } from "@/hooks/useSidebarPanels"
import { useWorkspaceHistory } from "@/hooks/useWorkspaceHistory"
import { type LoadedDocument } from "@/lib/document-session"
import {
  type FontFamily,
} from "@/lib/config/fonts"
import {
  BASELINE_OPTIONS,
  type DisplayUnit,
  type GridRhythm,
  type GridRhythmColsDirection,
  type GridRhythmRowsDirection,
  type TypographyScale
} from "@/lib/config/defaults"
import {
  getImageSchemeColorToken,
  isImageColorInScheme,
  isImageSchemeColorToken,
  resolveImageSchemeColor,
  type ImageColorSchemeId,
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

const CANVAS_RATIO_INDEX = new Map(CANVAS_RATIOS.map((option) => [option.key, option]))
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"
const RELEASE_CHANNEL = (process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? "prod").toLowerCase()
const SHOW_BETA_BADGE = RELEASE_CHANNEL === "beta"
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily>
const DEFAULT_PAGE_PREVIEW_LAYOUT = DEFAULT_PREVIEW_LAYOUT as PreviewLayoutState | null
type NoticeState = {
  title: string
  message: string
} | null

export default function Home() {
  const loadFileInputRef = useRef<HTMLInputElement | null>(null)
  const headerClickTimeoutRef = useRef<number | null>(null)
  const [noticeState, setNoticeState] = useState<NoticeState>(null)
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
  const {
    canvasRatio, exportPaperSize, exportPrintPro, exportBleedMm,
    exportRegistrationMarks, exportFinalSafeGuides, orientation, rotation,
    marginMethod, gridCols, gridRows, baselineMultiple, gutterMultiple, rhythm,
    rhythmRowsEnabled, rhythmRowsDirection, rhythmColsEnabled, rhythmColsDirection,
    typographyScale, baseFont, imageColorScheme, canvasBackground, customBaseline, displayUnit,
    useCustomMargins, customMarginMultipliers, showBaselines, showModules,
    showMargins, showImagePlaceholders, showTypography, showLayers, collapsed,
  } = ui
  // Stable dispatch wrappers for child component props
  const setCanvasRatio = useCallback((v: CanvasRatioKey) => dispatch({ type: "SET", key: "canvasRatio", value: v }), [dispatch])
  const setOrientation = useCallback((v: "portrait" | "landscape") => dispatch({ type: "SET", key: "orientation", value: v }), [dispatch])
  const setRotation = useCallback((v: number) => dispatch({ type: "SET", key: "rotation", value: clampRotation(v) }), [dispatch])
  const setMarginMethod = useCallback((v: 1 | 2 | 3) => dispatch({ type: "SET", key: "marginMethod", value: v }), [dispatch])
  const setGridCols = useCallback((v: number) => dispatch({ type: "SET", key: "gridCols", value: v }), [dispatch])
  const setGridRows = useCallback((v: number) => dispatch({ type: "SET", key: "gridRows", value: v }), [dispatch])
  const setBaselineMultiple = useCallback((v: number) => dispatch({ type: "SET", key: "baselineMultiple", value: v }), [dispatch])
  const setGutterMultiple = useCallback((v: number) => dispatch({ type: "SET", key: "gutterMultiple", value: v }), [dispatch])
  const setRhythm = useCallback((v: GridRhythm) => dispatch({ type: "SET", key: "rhythm", value: v }), [dispatch])
  const setRhythmRowsEnabled = useCallback((v: boolean) => dispatch({ type: "SET", key: "rhythmRowsEnabled", value: v }), [dispatch])
  const setRhythmRowsDirection = useCallback((v: GridRhythmRowsDirection) => dispatch({ type: "SET", key: "rhythmRowsDirection", value: v }), [dispatch])
  const setRhythmColsEnabled = useCallback((v: boolean) => dispatch({ type: "SET", key: "rhythmColsEnabled", value: v }), [dispatch])
  const setRhythmColsDirection = useCallback((v: GridRhythmColsDirection) => dispatch({ type: "SET", key: "rhythmColsDirection", value: v }), [dispatch])
  const setTypographyScale = useCallback((v: TypographyScale) => dispatch({ type: "SET", key: "typographyScale", value: v }), [dispatch])
  const setBaseFont = useCallback((v: FontFamily) => dispatch({ type: "SET", key: "baseFont", value: v }), [dispatch])
  const setImageColorScheme = useCallback((v: ImageColorSchemeId) => {
    const actions: UiAction[] = [{ type: "SET", key: "imageColorScheme", value: v }]
    if (canvasBackground && !isImageSchemeColorToken(canvasBackground) && !isImageColorInScheme(canvasBackground, v)) {
      actions.push({ type: "SET", key: "canvasBackground", value: getImageSchemeColorToken(0) })
    }
    dispatch(actions.length === 1 ? actions[0] : { type: "BATCH", actions })
  }, [canvasBackground, dispatch])
  const setCanvasBackground = useCallback((value: string | null) => {
    dispatch({ type: "SET", key: "canvasBackground", value })
  }, [dispatch])
  const resetParagraphColorsToScheme = useCallback(() => {
    setParagraphColorResetNonce((nonce) => nonce + 1)
  }, [])
  const setCustomBaseline = useCallback((v: number) => dispatch({ type: "SET", key: "customBaseline", value: v }), [dispatch])
  const setUseCustomMargins = useCallback((v: boolean) => dispatch({ type: "SET", key: "useCustomMargins", value: v }), [dispatch])
  const setCustomMarginMultipliers = useCallback((v: { top: number; left: number; right: number; bottom: number }) => dispatch({ type: "SET", key: "customMarginMultipliers", value: v }), [dispatch])

  const [isDarkUi, setIsDarkUi] = useState(false)
  const [showRolloverInfo, setShowRolloverInfo] = useState(true)
  const [isSmartphone, setIsSmartphone] = useState(false)
  const [paragraphColorResetNonce, setParagraphColorResetNonce] = useState(0)

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
    onShowLayersChange: (next) => dispatch({ type: "SET", key: "showLayers", value: next }),
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

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const applyTheme = (matches: boolean) => setIsDarkUi(matches)
    applyTheme(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => applyTheme(event.matches)
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

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

  const result = useMemo(() => {
    const customMargins = useCustomMargins
      ? {
          top: customMarginMultipliers.top * gridUnit,
          bottom: customMarginMultipliers.bottom * gridUnit,
          left: customMarginMultipliers.left * gridUnit,
          right: customMarginMultipliers.right * gridUnit,
        }
      : undefined
    return generateSwissGrid({
      format: previewFormat,
      orientation,
      marginMethod,
      gridCols,
      gridRows,
      baseline: customBaseline ?? DEFAULT_A4_BASELINE,
      baselineMultiple,
      gutterMultiple,
      rhythm,
      rhythmRowsEnabled,
      rhythmRowsDirection,
      rhythmColsEnabled,
      rhythmColsDirection,
      customMargins,
      typographyScale,
    })
  }, [
    previewFormat,
    orientation,
    marginMethod,
    gridCols,
    gridRows,
    customBaseline,
    baselineMultiple,
    gutterMultiple,
    rhythm,
    rhythmRowsEnabled,
    rhythmRowsDirection,
    rhythmColsEnabled,
    rhythmColsDirection,
    useCustomMargins,
    customMarginMultipliers,
    gridUnit,
    typographyScale,
  ])

  const maxBaseline = useMemo(() => {
    const formatDim = FORMATS_PT[previewFormat]
    const pageHeight = orientation === "landscape" ? formatDim.width : formatDim.height
    const customMarginUnits = useCustomMargins
      ? customMarginMultipliers.top + customMarginMultipliers.bottom
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

  const defaultJsonFilename = useMemo(() => `${baseFilename}_grid.json`, [baseFilename])

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

  const handleApplyLoadedDocument = useCallback((document: LoadedDocument<PreviewLayoutState>) => {
    const actions = buildUiActionsFromLoadedSettings(document.uiSettings, collapsed)
    applyLoadedUiActions(actions)
    applyLoadedPreviewLayout(document.previewLayout)
    setShowPresetsBrowser(false)
    markClean()
  }, [applyLoadedPreviewLayout, applyLoadedUiActions, collapsed, markClean, setShowPresetsBrowser])

  const {
    documentMetadata,
    setDocumentMetadata,
    loadDocumentFromInput: loadLayout,
    loadPresetDocument: handleLoadPresetLayout,
  } = useDocumentController<PreviewLayoutState>({
    onApplyDocument: handleApplyLoadedDocument,
    onLoadFailed: () => {
      handleRequestNotice({
        title: "Load Failed",
        message: "Could not load layout JSON.",
      })
    },
  })

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

  useEffect(() => {
    const checkSmartphone = () => {
      const isSmallViewport = window.matchMedia("(max-width: 767px)").matches
      setIsSmartphone(isSmallViewport)
    }

    checkSmartphone()
    window.addEventListener("resize", checkSmartphone)
    return () => window.removeEventListener("resize", checkSmartphone)
  }, [])

  // ─── Export / Save actions ────────────────────────────────────────────────

  const buildUiSettingsPayload = useCallback(
    () => ({ ...ui, format: previewFormat }),
    [ui, previewFormat],
  )

  const setDisplayUnit = useCallback((v: DisplayUnit) => dispatch({ type: "SET", key: "displayUnit", value: v }), [dispatch])
  const setExportPaperSize = useCallback((v: string) => dispatch({ type: "SET", key: "exportPaperSize", value: v }), [dispatch])
  const setExportPrintPro = useCallback((v: boolean) => dispatch({ type: "SET", key: "exportPrintPro", value: v }), [dispatch])
  const setExportBleedMm = useCallback((v: number) => dispatch({ type: "SET", key: "exportBleedMm", value: v }), [dispatch])
  const setExportRegistrationMarks = useCallback((v: boolean) => dispatch({ type: "SET", key: "exportRegistrationMarks", value: v }), [dispatch])
  const setExportFinalSafeGuides = useCallback((v: boolean) => dispatch({ type: "SET", key: "exportFinalSafeGuides", value: v }), [dispatch])
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
      exportFinalSafeGuides,
      setExportFinalSafeGuides,
      paperSizeOptions,
      previewFormat,
      defaultPdfFilename,
      defaultJsonFilename,
      documentMetadata,
      onDocumentMetadataChange: setDocumentMetadata,
      buildUiSettingsPayload,
    }),
    [
      result,
      previewLayout,
      baseFont,
      orientation,
      rotation,
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
      exportFinalSafeGuides,
      setExportFinalSafeGuides,
      paperSizeOptions,
      previewFormat,
      defaultPdfFilename,
      defaultJsonFilename,
      documentMetadata,
      setDocumentMetadata,
      buildUiSettingsPayload,
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
    onToggleDarkMode: () => setIsDarkUi((prev) => !prev),
    onToggleBaselines: () => dispatch({ type: "TOGGLE", key: "showBaselines" }),
    onToggleMargins: () => dispatch({ type: "TOGGLE", key: "showMargins" }),
    onToggleModules: () => dispatch({ type: "TOGGLE", key: "showModules" }),
    onToggleTypography: () => dispatch({ type: "TOGGLE", key: "showTypography" }),
    onToggleLayersPanel: toggleLayersPanel,
    onToggleRolloverInfo: () => setShowRolloverInfo((prev) => !prev),
    onToggleSettingsPanel: () => openSidebarPanel(activeSidebarPanel === "settings" ? null : "settings"),
    onToggleHelpPanel: toggleHelpPanel,
    onToggleImprintPanel: () => openSidebarPanel(activeSidebarPanel === "imprint" ? null : "imprint"),
    onOpenPresets: () => setShowPresetsBrowser(true),
    onClosePresets: () => setShowPresetsBrowser(false),
  })

  // ─── Render ───────────────────────────────────────────────────────────────

  const uiTheme = useMemo(() =>
    (isDarkUi
      ? {
          root: "bg-gray-950",
          leftPanel: "dark border-gray-700 bg-gray-900 text-gray-100",
          subtleBorder: "border-gray-700",
          bodyText: "text-gray-300",
          headingText: "text-gray-300",
          link: "text-gray-100 underline",
          previewShell: "bg-gray-950",
          previewHeader: "dark border-gray-700 bg-gray-900 text-gray-100",
          divider: "bg-gray-700",
          sidebar: "dark border-gray-700 bg-gray-900 text-gray-300",
          sidebarHeading: "text-gray-100",
          sidebarBody: "text-gray-400",
        }
      : {
          root: "bg-gray-100",
          leftPanel: "border-gray-200 bg-white",
          subtleBorder: "border-gray-200",
          bodyText: "text-gray-600",
          headingText: "text-gray-700",
          link: "underline",
          previewShell: "bg-white",
          previewHeader: "border-gray-200 bg-white",
          divider: "bg-gray-200",
          sidebar: "border-gray-200 bg-white text-gray-700",
          sidebarHeading: "text-gray-900",
          sidebarBody: "text-gray-600",
        }),
  [isDarkUi])

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
    onToggleDarkMode: () => setIsDarkUi((prev) => !prev),
    onToggleBaselines: () => dispatch({ type: "TOGGLE", key: "showBaselines" }),
    onToggleMargins: () => dispatch({ type: "TOGGLE", key: "showMargins" }),
    onToggleModules: () => dispatch({ type: "TOGGLE", key: "showModules" }),
    onToggleImagePlaceholders: () => dispatch({ type: "TOGGLE", key: "showImagePlaceholders" }),
    onToggleTypography: () => dispatch({ type: "TOGGLE", key: "showTypography" }),
    onToggleLayersPanel: toggleLayersPanel,
    onToggleRolloverInfo: () => setShowRolloverInfo((prev) => !prev),
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
      previewLayout={previewLayout}
      loadedPreviewLayout={loadedPreviewLayout}
      requestedLayerOrderState={requestedLayerOrderState}
      requestedLayerDeleteState={requestedLayerDeleteState}
      requestedLayerEditorState={requestedLayerEditorState}
      uiTheme={{
        divider: uiTheme.divider,
        bodyText: uiTheme.bodyText,
        previewHeader: uiTheme.previewHeader,
        previewShell: uiTheme.previewShell,
        sidebar: uiTheme.sidebar,
        sidebarBody: uiTheme.sidebarBody,
        sidebarHeading: uiTheme.sidebarHeading,
      }}
      result={result}
      onLoadPreset={handleLoadPresetLayout}
      onHeaderHelpNavigate={handleHeaderHelpNavigate}
      onOpenHelpSection={openHelpSection}
      onHistoryRecord={handlePreviewHistoryRecord}
      onUndoRequest={undoAny}
      onRedoRequest={redoAny}
      onHistoryAvailabilityChange={handlePreviewHistoryAvailabilityChange}
      onRequestGridRestore={handlePreviewGridRestore}
      onRequestNotice={handleRequestNotice}
      onLayoutChange={handlePreviewLayoutChange}
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
        onChange={loadLayout}
      />
      <div className={`flex h-screen flex-col md:flex-row ${uiTheme.root}`}>
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
              onGridColsChange={setGridCols}
              gridRows={gridRows}
              onGridRowsChange={setGridRows}
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
          onToggleImprintPanel={() => openSidebarPanel(activeSidebarPanel === "imprint" ? null : "imprint")}
        />

        {previewWorkspace}

        <WorkspaceDialogs
          ratioLabel={selectedCanvasRatio.label}
          orientation={orientation}
          rotation={rotation}
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
            filename: exportActions.exportFilenameDraft,
            onFilenameChange: exportActions.setExportFilenameDraft,
            defaultFilename: defaultPdfFilename,
            printPro: exportActions.exportPrintProDraft,
            onPrintProChange: exportActions.setExportPrintProDraft,
            onApplyPrintPreset: exportActions.applyPrintPreset,
            bleedMm: exportActions.exportBleedMmDraft,
            onBleedMmChange: exportActions.setExportBleedMmDraft,
            registrationMarks: exportActions.exportRegistrationMarksDraft,
            onRegistrationMarksChange: exportActions.setExportRegistrationMarksDraft,
            finalSafeGuides: exportActions.exportFinalSafeGuidesDraft,
            onFinalSafeGuidesChange: exportActions.setExportFinalSafeGuidesDraft,
            onConfirm: exportActions.confirmExportPDF,
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
