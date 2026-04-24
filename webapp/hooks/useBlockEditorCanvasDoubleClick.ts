import { useCallback, useEffect, useRef } from "react"
import type { Dispatch, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from "react"

import type { BlockEditorState } from "@/components/editor/block-editor-types"
import { buildExistingBlockEditorState } from "@/lib/preview-block-editor-state"
import type { FontFamily } from "@/lib/config/fonts"
import { PREVIEW_DRAG_CLICK_GUARD_MS } from "@/lib/preview-interaction-constants"
import { insertTextLayerIntoCollections, type PreviewTextLayerCollectionsState } from "@/lib/preview-text-layer-state"
import type { NoticeRequest, PagePoint } from "@/lib/preview-types"
import type { TextFormatRun } from "@/lib/text-format-runs"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"
import type { ModulePosition, TextAlignMode, TextVerticalAlignMode } from "@/lib/types/layout-primitives"

const HIERARCHY_SHORTCUT_STYLE_BY_KEY: Readonly<Record<string, string>> = {
  "1": "caption",
  "2": "body",
  "3": "subhead",
  "4": "headline",
  "5": "fx",
  "6": "display",
}

function resolveHeldHierarchyShortcut(keys: ReadonlySet<string>): string | null {
  for (const key of ["6", "5", "4", "3", "2", "1"] as const) {
    if (keys.has(key)) return HIERARCHY_SHORTCUT_STYLE_BY_KEY[key] ?? null
  }
  return null
}

type Args = {
  showTypography: boolean
  dragEndedAtRef: RefObject<number>
  canvasRef: RefObject<HTMLCanvasElement | null>
  setEditorState: Dispatch<SetStateAction<BlockEditorState<string> | null>>
  resultGridCols: number
  resultGridRows: number
  blockOrder: string[]
  textContent: Record<string, string>
  blockTextEdited: Record<string, boolean>
  styleAssignments: Record<string, string>
  blockCustomSizes: Partial<Record<string, number>>
  blockCustomLeadings: Partial<Record<string, number>>
  blockTextAlignments: Partial<Record<string, TextAlignMode>>
  blockVerticalAlignments: Partial<Record<string, TextVerticalAlignMode>>
  recordHistoryBeforeChange: () => void
  setBlockCollections: (
    updater: (prev: PreviewTextLayerCollectionsState) => PreviewTextLayerCollectionsState,
  ) => void
  getNextCustomBlockId: () => string
  getDummyTextForStyle: (style: string) => string
  getStyleSize: (style: string) => number
  getStyleLeading: (style: string) => number
  getBlockTextColor: (key: string) => string
  isSnapToColumnsEnabled: (key: string) => boolean
  isSnapToBaselineEnabled: (key: string) => boolean
  getDefaultColumnSpan: (key: string, gridCols: number) => number
  getGridMetrics: () => { rowStartBaselines: number[] }
  toPagePoint: (canvasX: number, canvasY: number) => PagePoint | null
  findTopmostBlockAtPoint: (pageX: number, pageY: number) => string | null
  resolveModulePositionAtPagePoint: (pageX: number, pageY: number) => ModulePosition | null
  snapToModule: (pageX: number, pageY: number, key: string) => ModulePosition
  getBlockFont: (key: string) => FontFamily
  getBlockFontWeight: (key: string) => number
  getBlockTrackingScale: (key: string) => number
  getBlockTrackingRuns: (key: string) => TextTrackingRun[]
  getBlockTextFormatRuns: (key: string, color: string) => TextFormatRun<string, FontFamily>[]
  getBlockSpan: (key: string) => number
  getBlockRows: (key: string) => number
  getBlockHeightBaselines: (key: string) => number
  isTextReflowEnabled: (key: string) => boolean
  isSyllableDivisionEnabled: (key: string) => boolean
  isBlockItalic: (key: string) => boolean
  isBlockOpticalKerningEnabled: (key: string) => boolean
  getBlockRotation: (key: string) => number
  promoteLayerToTop: (key: string) => void
  onRequestNotice?: (notice: NoticeRequest) => void
}

export function useBlockEditorCanvasDoubleClick({
  showTypography,
  dragEndedAtRef,
  canvasRef,
  setEditorState,
  resultGridCols,
  resultGridRows,
  blockOrder,
  textContent,
  blockTextEdited,
  styleAssignments,
  blockCustomSizes,
  blockCustomLeadings,
  blockTextAlignments,
  blockVerticalAlignments,
  recordHistoryBeforeChange,
  setBlockCollections,
  getNextCustomBlockId,
  getDummyTextForStyle,
  getStyleSize,
  getStyleLeading,
  getBlockTextColor,
  isSnapToColumnsEnabled,
  isSnapToBaselineEnabled,
  getDefaultColumnSpan,
  getGridMetrics,
  toPagePoint,
  findTopmostBlockAtPoint,
  resolveModulePositionAtPagePoint,
  snapToModule,
  getBlockFont,
  getBlockFontWeight,
  getBlockTrackingScale,
  getBlockTrackingRuns,
  getBlockTextFormatRuns,
  getBlockSpan,
  getBlockRows,
  getBlockHeightBaselines,
  isTextReflowEnabled,
  isSyllableDivisionEnabled,
  isBlockItalic,
  isBlockOpticalKerningEnabled,
  getBlockRotation,
  promoteLayerToTop,
  onRequestNotice,
}: Args) {
  const heldHierarchyShortcutKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const resolvedKey = HIERARCHY_SHORTCUT_STYLE_BY_KEY[event.key]
        ? event.key
        : HIERARCHY_SHORTCUT_STYLE_BY_KEY[event.code.replace(/^Digit/, "")]
          ? event.code.replace(/^Digit/, "")
          : HIERARCHY_SHORTCUT_STYLE_BY_KEY[event.code.replace(/^Numpad/, "")]
            ? event.code.replace(/^Numpad/, "")
            : null
      if (!resolvedKey) return
      heldHierarchyShortcutKeysRef.current.add(resolvedKey)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const resolvedKey = HIERARCHY_SHORTCUT_STYLE_BY_KEY[event.key]
        ? event.key
        : HIERARCHY_SHORTCUT_STYLE_BY_KEY[event.code.replace(/^Digit/, "")]
          ? event.code.replace(/^Digit/, "")
          : HIERARCHY_SHORTCUT_STYLE_BY_KEY[event.code.replace(/^Numpad/, "")]
            ? event.code.replace(/^Numpad/, "")
            : null
      if (!resolvedKey) return
      heldHierarchyShortcutKeysRef.current.delete(resolvedKey)
    }

    const clearHeldKeys = () => {
      heldHierarchyShortcutKeysRef.current.clear()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", clearHeldKeys)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", clearHeldKeys)
    }
  }, [])

  return useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < PREVIEW_DRAG_CLICK_GUARD_MS) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    const key = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (key) {
      recordHistoryBeforeChange()
      setEditorState(buildExistingBlockEditorState({
        key,
        styleAssignments,
        textContent,
        blockCustomSizes,
        blockCustomLeadings,
        blockTextAlignments,
        blockVerticalAlignments,
        blockTextEdited,
        getBlockFont,
        getBlockRotation,
        getBlockRows,
        getBlockHeightBaselines,
        getBlockSpan,
        getBlockTextColor,
        getBlockFontWeight,
        getBlockTrackingScale,
        getBlockTrackingRuns,
        getBlockTextFormatRuns,
        getStyleLeading,
        getStyleSize,
        isBlockItalic,
        isBlockOpticalKerningEnabled,
        isSnapToColumnsEnabled,
        isSnapToBaselineEnabled,
        isSyllableDivisionEnabled,
        isTextReflowEnabled,
        fallbackStyle: "body",
        fxStyle: "fx",
      }))
      return
    }

    const maxParagraphCount = resultGridCols * resultGridRows
    const activeParagraphCount = blockOrder.filter((blockKey) => (textContent[blockKey] ?? "").trim().length > 0).length
    if (activeParagraphCount >= maxParagraphCount) {
      onRequestNotice?.({
        title: "Paragraph Limit Reached",
        message: `Maximum paragraphs reached (${maxParagraphCount}).`,
      })
      return
    }

    const newKey = getNextCustomBlockId()
    recordHistoryBeforeChange()
    const rawPosition = resolveModulePositionAtPagePoint(pagePoint.x, pagePoint.y)
    const snapped = rawPosition ?? snapToModule(pagePoint.x, pagePoint.y, newKey)
    const rowStartBaselines = getGridMetrics().rowStartBaselines
    const defaultSpan = getDefaultColumnSpan(newKey, resultGridCols)
    const shortcutStyle = resolveHeldHierarchyShortcut(heldHierarchyShortcutKeysRef.current) ?? "body"
    const defaultText = getDummyTextForStyle(shortcutStyle)
    setBlockCollections((prev) => insertTextLayerIntoCollections(prev, {
      newKey,
      text: defaultText,
      styleKey: shortcutStyle,
      gridCols: resultGridCols,
      gridRows: resultGridRows,
      columns: defaultSpan,
      rows: 1,
      heightBaselines: 0,
      position: snapped,
      rowStartBaselines,
    }))
    promoteLayerToTop(newKey)
  }, [
    blockCustomLeadings,
    blockCustomSizes,
    blockOrder,
    blockTextAlignments,
    blockVerticalAlignments,
    blockTextEdited,
    canvasRef,
    dragEndedAtRef,
    findTopmostBlockAtPoint,
    getBlockFont,
    getBlockFontWeight,
    getBlockTrackingScale,
    getBlockTrackingRuns,
    getBlockTextFormatRuns,
    getBlockRotation,
    getBlockRows,
    getBlockHeightBaselines,
    getBlockSpan,
    getBlockTextColor,
    getDefaultColumnSpan,
    getDummyTextForStyle,
    getGridMetrics,
    getNextCustomBlockId,
    getStyleLeading,
    getStyleSize,
    isBlockItalic,
    isBlockOpticalKerningEnabled,
    isSnapToColumnsEnabled,
    isSnapToBaselineEnabled,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    onRequestNotice,
    promoteLayerToTop,
    recordHistoryBeforeChange,
    resolveModulePositionAtPagePoint,
    resultGridCols,
    resultGridRows,
    setBlockCollections,
    setEditorState,
    showTypography,
    snapToModule,
    styleAssignments,
    textContent,
    toPagePoint,
  ])
}
