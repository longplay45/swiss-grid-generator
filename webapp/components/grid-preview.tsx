"use client"

import { Button } from "@/components/ui/button"
import { InlineBlockTextarea } from "@/components/editor/InlineBlockTextarea"
import {
  type BlockEditorState,
  type BlockEditorStyleOption,
  type BlockEditorTextAlign,
} from "@/components/editor/block-editor-types"
import {
  ImageEditorDialog,
  type ImageEditorState,
} from "@/components/dialogs/ImageEditorDialog"
import { TextEditorPanel } from "@/components/sidebar/TextEditorPanel"
import { GridResult } from "@/lib/grid-calculator"
import { getOpticalMarginAnchorOffset } from "@/lib/optical-margin"
import { renderStaticGuides } from "@/lib/render-static-guides"
import type { HelpSectionId } from "@/lib/help-registry"
import {
  buildAxisStarts,
  findAxisIndexAtOffset,
  findNearestAxisIndex,
  resolveAxisSizes,
  sumAxisSpan,
} from "@/lib/grid-rhythm"
import { usePreviewDrag } from "@/hooks/usePreviewDrag"
import type { DragState as PreviewDragState } from "@/hooks/usePreviewDrag"
import { usePreviewHistory } from "@/hooks/usePreviewHistory"
import { useLayoutSnapshot } from "@/hooks/useLayoutSnapshot"
import { useLayoutReflow } from "@/hooks/useLayoutReflow"
import { useCloseEditorsOnOutsidePointer } from "@/hooks/useCloseEditorsOnOutsidePointer"
import { useInitialLayoutHydration } from "@/hooks/useInitialLayoutHydration"
import { usePreviewLayerDelete } from "@/hooks/usePreviewLayerDelete"
import { usePreviewPerf } from "@/hooks/usePreviewPerf"
import { useTypographyRenderer } from "@/hooks/useTypographyRenderer"
import { usePreviewKeyboard } from "@/hooks/usePreviewKeyboard"
import { useBlockEditorActions } from "@/hooks/useBlockEditorActions"
import { useStateCommands } from "@/hooks/useStateCommands"
import type { Updater } from "@/hooks/useStateCommands"
import type { PreviewLayoutState as SharedPreviewLayoutState } from "@/lib/types/preview-layout"
import { normalizeInlineEditorText } from "@/lib/inline-text-normalization"
import { wrapText, getDefaultColumnSpan } from "@/lib/text-layout"
import {
  BASE_BLOCK_IDS,
  DEFAULT_STYLE_ASSIGNMENTS,
  DEFAULT_TEXT_CONTENT,
  createDefaultTextContent,
  isBaseBlockId,
} from "@/lib/document-defaults"
import { clampFxLeading, clampFxSize, clampRotation } from "@/lib/block-constraints"
import { resolveSyllableDivisionEnabled, resolveTextReflowEnabled } from "@/lib/typography-behavior"
import {
  computeAutoFitBatch,
  type AutoFitPlannerInput,
} from "@/lib/autofit-planner"
import {
  computeReflowPlan as computeReflowPlanPure,
  createReflowPlanSignature,
  type ReflowPlan as PlannerReflowPlan,
  type ReflowPlannerInput,
} from "@/lib/reflow-planner"
import {
  DEFAULT_BASE_FONT,
  getFontFamilyCss,
  isFontFamily,
  type FontFamily,
} from "@/lib/config/fonts"
import {
  getClosestImageSchemeColorToken,
  DEFAULT_IMAGE_COLOR_SCHEME_ID,
  getDefaultImagePlaceholderColor,
  getDefaultTextSchemeColor,
  getImageColorScheme,
  getImageSchemeColorReference,
  resolveImageSchemeColor,
  IMAGE_COLOR_SCHEMES,
  isImagePlaceholderColor,
  type ImageColorSchemeId,
} from "@/lib/config/color-schemes"
import { PREVIEW_INTERACTION_HINT_LINES } from "@/lib/preview-interaction-hints"
import { useWorkerBridge } from "@/hooks/useWorkerBridge"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"

type BlockId = string
type TypographyStyleKey = keyof GridResult["typography"]["styles"]
type TextAlignMode = BlockEditorTextAlign

type BlockRect = {
  x: number
  y: number
  width: number
  height: number
}

type TextDrawCommand = {
  text: string
  x: number
  y: number
}

type BlockRenderPlan = {
  key: BlockId
  rect: BlockRect
  signature: string
  font: string
  textColor: string
  textAlign: TextAlignMode
  blockRotation: number
  rotationOriginX: number
  rotationOriginY: number
  commands: TextDrawCommand[]
}

type ReflowPlan = PlannerReflowPlan

type ModulePosition = {
  col: number
  row: number
}

type DragState = PreviewDragState<BlockId>
type EditorState = BlockEditorState<TypographyStyleKey>
type PlaceholderEditorState = ImageEditorState

type BlockCollectionsState = {
  blockOrder: BlockId[]
  textContent: Record<BlockId, string>
  blockTextEdited: Record<BlockId, boolean>
  styleAssignments: Record<BlockId, TypographyStyleKey>
  blockModulePositions: Partial<Record<BlockId, ModulePosition>>
  blockColumnSpans: Partial<Record<BlockId, number>>
  blockRowSpans: Partial<Record<BlockId, number>>
  blockTextAlignments: Partial<Record<BlockId, TextAlignMode>>
  blockTextReflow: Partial<Record<BlockId, boolean>>
  blockSyllableDivision: Partial<Record<BlockId, boolean>>
  blockFontFamilies: Partial<Record<BlockId, FontFamily>>
  blockBold: Partial<Record<BlockId, boolean>>
  blockItalic: Partial<Record<BlockId, boolean>>
  blockRotations: Partial<Record<BlockId, number>>
}

type HoverState = {
  key: BlockId
}

type OverflowLinesByBlock = Partial<Record<BlockId, number>>
type NoticeRequest = {
  title: string
  message: string
}

const getDefaultTextContent = (): Record<BlockId, string> => (
  createDefaultTextContent() as Record<BlockId, string>
)
const getDefaultStyleAssignments = (): Record<BlockId, TypographyStyleKey> => (
  Object.fromEntries(BASE_BLOCK_IDS.map((key) => [key, key])) as Record<BlockId, TypographyStyleKey>
)
let runtimeIdCounter = 0
function createRuntimeId(prefix: "paragraph" | "image"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  runtimeIdCounter += 1
  return `${prefix}-${Date.now()}-${runtimeIdCounter}`
}
const getNextCustomBlockId = () => createRuntimeId("paragraph")
const getNextImagePlaceholderId = () => createRuntimeId("image")

function areStringArraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false
  }
  return true
}

function reconcileLayerOrder(
  current: readonly BlockId[],
  blockOrder: readonly BlockId[],
  imageOrder: readonly BlockId[],
): BlockId[] {
  const validKeys = new Set<BlockId>([...imageOrder, ...blockOrder])
  const next: BlockId[] = []
  const seen = new Set<BlockId>()

  for (const key of current) {
    if (!validKeys.has(key) || seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of imageOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of blockOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  return next
}

function createInitialBlockCollectionsState(): BlockCollectionsState {
  return {
    blockOrder: [...BASE_BLOCK_IDS],
    textContent: getDefaultTextContent(),
    blockTextEdited: BASE_BLOCK_IDS.reduce((acc, key) => {
      acc[key] = true
      return acc
    }, {} as Record<BlockId, boolean>),
    styleAssignments: getDefaultStyleAssignments(),
    blockModulePositions: {},
    blockColumnSpans: {},
    blockRowSpans: {},
    blockTextAlignments: {},
    blockTextReflow: {},
    blockSyllableDivision: {},
    blockFontFamilies: {},
    blockBold: {},
    blockItalic: {},
    blockRotations: {},
  }
}

const STYLE_OPTIONS: BlockEditorStyleOption<TypographyStyleKey>[] = [
  { value: "fx", label: "FX" },
  { value: "display", label: "Display" },
  { value: "headline", label: "Headline" },
  { value: "subhead", label: "Subhead" },
  { value: "body", label: "Body" },
  { value: "caption", label: "Caption" },
]

const DUMMY_TEXT_BY_STYLE: Record<TypographyStyleKey, string> = {
  fx: "Swiss Design",
  display: "Swiss Design",
  headline: "Modular Grid Systems",
  subhead: "A grid creates coherent visual structure and establishes a consistent spatial rhythm",
  body: "The modular grid allows designers to organize content with clarity and purpose. All typography aligns to the baseline grid, ensuring harmony across the page. Modular proportions guide contrast and emphasis while preserving coherence across complex layouts. Structure becomes a tool for expression rather than a constraint, enabling flexible yet unified systems.",
  caption: "Based on Müller-Brockmann's Book Grid Systems in Graphic Design (1981). Copyleft & -right 2026 by lp45.net",
}

const OVERFLOW_BADGE_RADIUS = 11
const OVERFLOW_BADGE_PADDING = 6
const OVERFLOW_BADGE_FILL = "rgba(255, 80, 80, 0.85)"

function formatPtSize(size: number): string {
  return Number.isInteger(size) ? `${size}pt` : `${size.toFixed(1)}pt`
}

function getDummyTextForStyle(style: TypographyStyleKey): string {
  return DUMMY_TEXT_BY_STYLE[style] ?? DUMMY_TEXT_BY_STYLE.body
}

interface GridPreviewProps {
  result: GridResult
  showBaselines: boolean
  showModules: boolean
  showMargins: boolean
  showImagePlaceholders?: boolean
  showTypography: boolean
  showRolloverInfo?: boolean
  initialLayout?: PreviewLayoutState | null
  initialLayoutToken?: number
  rotation?: number
  canvasBackground?: string | null
  undoNonce?: number
  redoNonce?: number
  historyResetToken?: number
  paragraphColorResetToken?: number
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  onLayoutChange?: (layout: PreviewLayoutState) => void
  onRequestGridRestore?: (cols: number, rows: number) => void
  onHistoryAvailabilityChange?: (canUndo: boolean, canRedo: boolean) => void
  onHistoryRecord?: () => void
  onUndoRequest?: () => void
  onRedoRequest?: () => void
  requestedLayerOrder?: BlockId[] | null
  requestedLayerOrderToken?: number
  requestedLayerDeleteTarget?: BlockId | null
  requestedLayerDeleteToken?: number
  requestedLayerEditorTarget?: BlockId | null
  requestedLayerEditorToken?: number
  selectedLayerKey?: BlockId | null
  onSelectLayer?: (key: BlockId | null) => void
  onOpenHelpSection?: (sectionId: HelpSectionId) => void
  onRequestNotice?: (notice: NoticeRequest) => void
  showEditorHelpIcon?: boolean
  baseFont?: FontFamily
  imageColorScheme?: ImageColorSchemeId
  onImageColorSchemeChange?: (value: ImageColorSchemeId) => void
  isDarkMode?: boolean
}

type PreviewLayoutState = SharedPreviewLayoutState<TypographyStyleKey, FontFamily, BlockId>

export const GridPreview = memo(function GridPreview({
  result,
  showBaselines,
  showModules,
  showMargins,
  showImagePlaceholders = true,
  showTypography,
  showRolloverInfo = true,
  initialLayout = null,
  initialLayoutToken = 0,
  rotation = 0,
  canvasBackground = null,
  undoNonce = 0,
  redoNonce = 0,
  historyResetToken = 0,
  paragraphColorResetToken = 0,
  onCanvasReady,
  onLayoutChange,
  onRequestGridRestore,
  onHistoryAvailabilityChange,
  onHistoryRecord,
  onUndoRequest,
  onRedoRequest,
  requestedLayerOrder = null,
  requestedLayerOrderToken = 0,
  requestedLayerDeleteTarget = null,
  requestedLayerDeleteToken = 0,
  requestedLayerEditorTarget = null,
  requestedLayerEditorToken = 0,
  selectedLayerKey = null,
  onSelectLayer,
  onOpenHelpSection,
  onRequestNotice,
  showEditorHelpIcon = false,
  baseFont = DEFAULT_BASE_FONT,
  imageColorScheme = DEFAULT_IMAGE_COLOR_SCHEME_ID,
  onImageColorSchemeChange,
  isDarkMode = false,
}: GridPreviewProps) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRectsRef = useRef<Record<BlockId, BlockRect>>({})
  const imageRectsRef = useRef<Record<BlockId, BlockRect>>({})
  const lastAppliedLayoutKeyRef = useRef(0)
  const lastAppliedImageLayoutKeyRef = useRef(0)
  const lastAppliedCustomSizeLayoutKeyRef = useRef(0)
  const lastAppliedLayerLayoutKeyRef = useRef(0)
  const lastAppliedLayerRequestKeyRef = useRef(0)
  const lastAppliedLayerDeleteRequestKeyRef = useRef(0)
  const lastAppliedLayerEditorRequestKeyRef = useRef(0)
  const suppressReflowCheckRef = useRef(false)
  const suppressImageModuleRemapRef = useRef(false)
  const previousImageGridRef = useRef<{ cols: number; rows: number } | null>(null)
  const previousImageRowStartsRef = useRef<number[] | null>(null)
  const measureWidthCacheRef = useRef<Map<string, number>>(new Map())
  const wrapTextCacheRef = useRef<Map<string, string[]>>(new Map())
  const opticalOffsetCacheRef = useRef<Map<string, number>>(new Map())
  const typographyBufferRef = useRef<HTMLCanvasElement | null>(null)
  const previousPlansRef = useRef<Map<BlockId, BlockRenderPlan>>(new Map())
  const typographyBufferTransformRef = useRef("")
  const reflowPlanCacheRef = useRef<Map<string, ReflowPlan>>(new Map())
  const lastHistoryResetTokenRef = useRef(historyResetToken)
  const lastParagraphColorResetTokenRef = useRef(paragraphColorResetToken)
  const onLayoutChangeDebounceRef = useRef<number | null>(null)
  const pendingLayoutEmissionRef = useRef<PreviewLayoutState | null>(null)
  const mouseMoveRafRef = useRef<number | null>(null)
  const lastLiveEditorSignatureRef = useRef("")
  const lastLiveImageEditorSignatureRef = useRef("")
  const PERF_ENABLED = process.env.NODE_ENV !== "production"

  const [scale, setScale] = useState(1)
  const [pixelRatio, setPixelRatio] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [layoutEmissionVersion, setLayoutEmissionVersion] = useState(0)
  const [overflowLinesByBlock, setOverflowLinesByBlock] = useState<OverflowLinesByBlock>({})
  const [fontRenderEpoch, setFontRenderEpoch] = useState(0)
  const [imageOrder, setImageOrder] = useState<BlockId[]>([])
  const [layerOrder, setLayerOrder] = useState<BlockId[]>([...BASE_BLOCK_IDS])
  const [imageModulePositions, setImageModulePositions] = useState<Partial<Record<BlockId, ModulePosition>>>({})
  const [imageColumnSpans, setImageColumnSpans] = useState<Partial<Record<BlockId, number>>>({})
  const [imageRowSpans, setImageRowSpans] = useState<Partial<Record<BlockId, number>>>({})
  const [imageColors, setImageColors] = useState<Partial<Record<BlockId, string>>>({})
  const [blockCustomSizes, setBlockCustomSizes] = useState<Partial<Record<BlockId, number>>>({})
  const [blockCustomLeadings, setBlockCustomLeadings] = useState<Partial<Record<BlockId, number>>>({})
  const [blockTextColors, setBlockTextColors] = useState<Partial<Record<BlockId, string>>>({})
  const {
    state: blockCollectionsState,
    merge: setBlockCollections,
    setField: setBlockCollectionField,
  } = useStateCommands<BlockCollectionsState>(
    createInitialBlockCollectionsState,
  )
  const {
    blockOrder,
    textContent,
    blockTextEdited,
    styleAssignments,
    blockModulePositions,
    blockColumnSpans,
    blockRowSpans,
    blockTextAlignments,
    blockTextReflow,
    blockSyllableDivision,
    blockFontFamilies,
    blockBold,
    blockItalic,
    blockRotations,
  } = blockCollectionsState
  const [hoverState, setHoverState] = useState<HoverState | null>(null)
  const [hoverImageKey, setHoverImageKey] = useState<BlockId | null>(null)
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [imageEditorState, setImageEditorState] = useState<PlaceholderEditorState | null>(null)
  const previousImageColorSchemeRef = useRef(imageColorScheme)
  const imagePalette = useMemo(
    () => getImageColorScheme(imageColorScheme).colors,
    [imageColorScheme],
  )
  const defaultImageColor = useMemo(
    () => getDefaultImagePlaceholderColor(imageColorScheme),
    [imageColorScheme],
  )
  const defaultTextColor = useMemo(
    () => getDefaultTextSchemeColor(imageColorScheme),
    [imageColorScheme],
  )
  const HISTORY_LIMIT = 50
  const TEXT_CACHE_LIMIT = 5000
  const REFLOW_PLAN_CACHE_LIMIT = 200
  const LAYOUT_CHANGE_DEBOUNCE_MS = 120
  const TOUCH_LONG_PRESS_MS = 180
  const TOUCH_CANCEL_DISTANCE_PX = 10
  const PERF_SAMPLE_LIMIT = 160
  const PERF_LOG_INTERVAL_MS = 10000

  const makeCachedValue = useCallback(
    <T,>(cache: Map<string, T>, key: string, compute: () => T): T => {
      const existing = cache.get(key)
      if (existing !== undefined) return existing
      const value = compute()
      cache.set(key, value)
      if (cache.size > TEXT_CACHE_LIMIT) cache.clear()
      return value
    },
    [],
  )

  const setBlockOrder = useCallback((next: Updater<BlockId[]>) => {
    setBlockCollectionField("blockOrder", next)
  }, [setBlockCollectionField])

  const setTextContent = useCallback((next: Updater<Record<BlockId, string>>) => {
    setBlockCollectionField("textContent", next)
  }, [setBlockCollectionField])

  const setBlockTextEdited = useCallback((next: Updater<Record<BlockId, boolean>>) => {
    setBlockCollectionField("blockTextEdited", next)
  }, [setBlockCollectionField])

  const setStyleAssignments = useCallback((next: Updater<Record<BlockId, TypographyStyleKey>>) => {
    setBlockCollectionField("styleAssignments", next)
  }, [setBlockCollectionField])

  const setBlockColumnSpans = useCallback((next: Updater<Partial<Record<BlockId, number>>>) => {
    setBlockCollectionField("blockColumnSpans", next)
  }, [setBlockCollectionField])

  const setBlockTextAlignments = useCallback((next: Updater<Partial<Record<BlockId, TextAlignMode>>>) => {
    setBlockCollectionField("blockTextAlignments", next)
  }, [setBlockCollectionField])

  const setBlockModulePositions = useCallback((next: Updater<Partial<Record<BlockId, ModulePosition>>>) => {
    setBlockCollectionField("blockModulePositions", next)
  }, [setBlockCollectionField])

  const { showPerfOverlay, perfOverlay, recordPerfMetric } = usePreviewPerf({
    enabled: PERF_ENABLED,
    logIntervalMs: PERF_LOG_INTERVAL_MS,
    sampleLimit: PERF_SAMPLE_LIMIT,
  })

  const handleOverflowLinesChange = useCallback((next: OverflowLinesByBlock) => {
    setOverflowLinesByBlock((prev) => {
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (prevKeys.length !== nextKeys.length) return next
      for (const key of nextKeys) {
        if ((prev[key] ?? 0) !== (next[key] ?? 0)) return next
      }
      return prev
    })
  }, [])

  const getBlockSpan = useCallback((key: BlockId) => {
    const raw = blockColumnSpans[key] ?? getDefaultColumnSpan(key, result.settings.gridCols)
    return Math.max(1, Math.min(result.settings.gridCols, raw))
  }, [blockColumnSpans, result.settings.gridCols])

  const getBlockRows = useCallback((key: BlockId) => {
    const raw = blockRowSpans[key] ?? 1
    return Math.max(1, Math.min(result.settings.gridRows, raw))
  }, [blockRowSpans, result.settings.gridRows])

  const getImageSpan = useCallback((key: BlockId) => {
    const raw = imageColumnSpans[key] ?? 1
    return Math.max(1, Math.min(result.settings.gridCols, raw))
  }, [imageColumnSpans, result.settings.gridCols])

  const getImageRows = useCallback((key: BlockId) => {
    const raw = imageRowSpans[key] ?? 1
    return Math.max(1, Math.min(result.settings.gridRows, raw))
  }, [imageRowSpans, result.settings.gridRows])

  const getImageColorReference = useCallback((key: BlockId): string => {
    const raw = imageColors[key]
    if (typeof raw === "string") {
      return getImageSchemeColorReference(raw, imageColorScheme)
    }
    return getImageSchemeColorReference(defaultImageColor, imageColorScheme)
  }, [defaultImageColor, imageColorScheme, imageColors])

  const getImageColor = useCallback((key: BlockId): string => {
    return resolveImageSchemeColor(getImageColorReference(key), imageColorScheme)
  }, [getImageColorReference, imageColorScheme])

  const normalizeImageColorReferences = useCallback((
    colors: Partial<Record<BlockId, string>>,
    schemeId: ImageColorSchemeId,
  ): Partial<Record<BlockId, string>> => {
    let changed = false
    const next = { ...colors }
    for (const [key, value] of Object.entries(colors)) {
      const normalized = getImageSchemeColorReference(value, schemeId)
      if (normalized === value) continue
      next[key] = normalized
      changed = true
    }
    return changed ? next : colors
  }, [])

  const isImagePlaceholderKey = useCallback((key: BlockId): boolean => (
    key.startsWith("image-")
    || imageOrder.includes(key)
  ), [imageOrder])

  const resolvedLayerOrder = useMemo(
    () => reconcileLayerOrder(layerOrder, blockOrder, imageOrder),
    [blockOrder, imageOrder, layerOrder],
  )

  useEffect(() => {
    setLayerOrder((prev) => {
      const next = reconcileLayerOrder(prev, blockOrder, imageOrder)
      return areStringArraysEqual(prev, next) ? prev : next
    })
  }, [blockOrder, imageOrder])

  const getPlacementSpan = useCallback((key: BlockId): number => (
    isImagePlaceholderKey(key) ? getImageSpan(key) : getBlockSpan(key)
  ), [getBlockSpan, getImageSpan, isImagePlaceholderKey])

  const getPlacementRows = useCallback((key: BlockId): number => (
    isImagePlaceholderKey(key) ? getImageRows(key) : getBlockRows(key)
  ), [getBlockRows, getImageRows, isImagePlaceholderKey])

  const getStyleKeyForBlock = useCallback((key: BlockId): TypographyStyleKey => {
    const assigned = styleAssignments[key]
    if (assigned === "fx" || assigned === "display" || assigned === "headline" || assigned === "subhead" || assigned === "body" || assigned === "caption") {
      return assigned
    }
    return isBaseBlockId(key) ? DEFAULT_STYLE_ASSIGNMENTS[key] : "body"
  }, [styleAssignments])

  const isTextReflowEnabled = useCallback((key: BlockId) => {
    const styleKey = getStyleKeyForBlock(key)
    return resolveTextReflowEnabled(key, styleKey, getBlockSpan(key), blockTextReflow)
  }, [blockTextReflow, getBlockSpan, getStyleKeyForBlock])

  const isSyllableDivisionEnabled = useCallback((key: BlockId) => {
    const styleKey = getStyleKeyForBlock(key)
    return resolveSyllableDivisionEnabled(key, styleKey, blockSyllableDivision)
  }, [blockSyllableDivision, getStyleKeyForBlock])

  const getBlockFont = useCallback((key: BlockId): FontFamily => {
    return blockFontFamilies[key] ?? baseFont
  }, [baseFont, blockFontFamilies])

  const getStyleForBlock = useCallback((key: BlockId) => {
    const styleKey = getStyleKeyForBlock(key)
    return result.typography.styles[styleKey]
  }, [getStyleKeyForBlock, result.typography.styles])

  const getStyleSize = useCallback((styleKey: TypographyStyleKey): number => {
    const fallback = result.typography.styles.body?.size ?? result.grid.gridUnit
    return result.typography.styles[styleKey]?.size ?? fallback
  }, [result.grid.gridUnit, result.typography.styles])

  const getStyleLeading = useCallback((styleKey: TypographyStyleKey): number => {
    const fallback = result.typography.styles.body?.leading ?? result.grid.gridUnit
    return result.typography.styles[styleKey]?.leading ?? fallback
  }, [result.grid.gridUnit, result.typography.styles])

  const getBlockFontSize = useCallback((key: BlockId, styleKey: TypographyStyleKey): number => {
    const defaultSize = getStyleSize(styleKey)
    if (styleKey !== "fx") return defaultSize
    const raw = blockCustomSizes[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultSize
    return clampFxSize(raw)
  }, [blockCustomSizes, getStyleSize])

  const getBlockBaselineMultiplier = useCallback((key: BlockId, styleKey: TypographyStyleKey): number => {
    const defaultLeading = getStyleLeading(styleKey)
    const defaultMultiplier = result.typography.styles[styleKey]?.baselineMultiplier
      ?? Math.max(0.01, defaultLeading / result.grid.gridUnit)
    if (styleKey !== "fx") return defaultMultiplier
    const raw = blockCustomLeadings[key]
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return defaultMultiplier
    return Math.max(0.01, Math.min(800, raw) / result.grid.gridUnit)
  }, [blockCustomLeadings, getStyleLeading, result.grid.gridUnit, result.typography.styles])

  const getBlockTextColor = useCallback((key: BlockId): string => {
    const raw = blockTextColors[key]
    if (isImagePlaceholderColor(raw)) return raw
    return defaultTextColor
  }, [blockTextColors, defaultTextColor])

  const getStyleDefaultBold = useCallback((key: BlockId): boolean => {
    return getStyleForBlock(key)?.weight === "Bold"
  }, [getStyleForBlock])

  const getStyleDefaultItalic = useCallback((key: BlockId): boolean => {
    return getStyleForBlock(key)?.blockItalic === true
  }, [getStyleForBlock])

  const isBlockBold = useCallback((key: BlockId): boolean => {
    const override = blockBold[key]
    if (override === true || override === false) return override
    return getStyleDefaultBold(key)
  }, [blockBold, getStyleDefaultBold])

  const isBlockItalic = useCallback((key: BlockId): boolean => {
    const override = blockItalic[key]
    if (override === true || override === false) return override
    return getStyleDefaultItalic(key)
  }, [blockItalic, getStyleDefaultItalic])

  useEffect(() => {
    if (!showTypography || typeof document === "undefined" || !("fonts" in document)) return

    let cancelled = false
    const fontFaceSet = document.fonts
    const specs = new Set<string>()
    for (const key of blockOrder) {
      const styleKey = getStyleKeyForBlock(key)
      const style = result.typography.styles[styleKey]
      if (!style) continue
      const fontFamily = getBlockFont(key)
      const fontWeight = isBlockBold(key) ? "700" : "400"
      const fontStyle = isBlockItalic(key) ? "italic" : "normal"
      const fontSize = getBlockFontSize(key, styleKey) * scale
      specs.add(`${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`)
    }

    if (!specs.size) return

    void Promise
      .allSettled([...specs].map((spec) => fontFaceSet.load(spec)))
      .then(() => {
        if (cancelled) return
        measureWidthCacheRef.current.clear()
        wrapTextCacheRef.current.clear()
        opticalOffsetCacheRef.current.clear()
        reflowPlanCacheRef.current.clear()
        setFontRenderEpoch((value) => value + 1)
      })

    return () => {
      cancelled = true
    }
  }, [
    blockOrder,
    getBlockFont,
    getBlockFontSize,
    getStyleKeyForBlock,
    isBlockBold,
    isBlockItalic,
    result.typography.styles,
    scale,
    showTypography,
  ])

  const getBlockRotation = useCallback((key: BlockId): number => {
    const raw = blockRotations[key]
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 0
    return clampRotation(raw)
  }, [blockRotations])

  const { buildSnapshot: buildTextSnapshot, applySnapshot: applyTextSnapshot } = useLayoutSnapshot<
    BlockId,
    TypographyStyleKey,
    FontFamily,
    TextAlignMode,
    ModulePosition,
    PreviewLayoutState
  >({
    state: blockCollectionsState,
    gridCols: result.settings.gridCols,
    baseFont,
    getDefaultColumnSpan,
    getBlockRows,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isBlockBold,
    isBlockItalic,
    getBlockRotation,
    isFontFamily,
    toSnapshot: (value) => value as PreviewLayoutState,
    fromSnapshot: (snapshot) => ({
      blockOrder: [...snapshot.blockOrder],
      textContent: { ...snapshot.textContent },
      blockTextEdited: { ...snapshot.blockTextEdited },
      styleAssignments: { ...snapshot.styleAssignments },
      blockFontFamilies: { ...(snapshot.blockFontFamilies ?? {}) },
      blockBold: { ...(snapshot.blockBold ?? {}) },
      blockItalic: { ...(snapshot.blockItalic ?? {}) },
      blockRotations: { ...(snapshot.blockRotations ?? {}) },
      blockColumnSpans: { ...snapshot.blockColumnSpans },
      blockRowSpans: { ...(snapshot.blockRowSpans ?? {}) },
      blockTextAlignments: { ...snapshot.blockTextAlignments },
      blockTextReflow: { ...(snapshot.blockTextReflow ?? {}) },
      blockSyllableDivision: { ...(snapshot.blockSyllableDivision ?? {}) },
      blockModulePositions: { ...snapshot.blockModulePositions },
    }),
    setState: setBlockCollections,
  })

  const buildSnapshot = useCallback((): PreviewLayoutState => ({
    ...buildTextSnapshot(),
    blockCustomSizes: blockOrder.reduce((acc, key) => {
      const styleKey = styleAssignments[key] ?? "body"
      if (styleKey !== "fx") return acc
      const raw = blockCustomSizes[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
      acc[key] = clampFxSize(raw)
      return acc
    }, {} as Partial<Record<BlockId, number>>),
    blockCustomLeadings: blockOrder.reduce((acc, key) => {
      const styleKey = styleAssignments[key] ?? "body"
      if (styleKey !== "fx") return acc
      const raw = blockCustomLeadings[key]
      if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
      acc[key] = clampFxLeading(raw)
      return acc
    }, {} as Partial<Record<BlockId, number>>),
    blockTextColors: blockOrder.reduce((acc, key) => {
      const raw = blockTextColors[key]
      if (!isImagePlaceholderColor(raw)) return acc
      acc[key] = raw
      return acc
    }, {} as Partial<Record<BlockId, string>>),
    layerOrder: [...resolvedLayerOrder],
    imageOrder: [...imageOrder],
    imageModulePositions: { ...imageModulePositions },
    imageColumnSpans: imageOrder.reduce((acc, key) => {
      acc[key] = getImageSpan(key)
      return acc
    }, {} as Partial<Record<BlockId, number>>),
    imageRowSpans: imageOrder.reduce((acc, key) => {
      acc[key] = getImageRows(key)
      return acc
    }, {} as Partial<Record<BlockId, number>>),
      imageColors: imageOrder.reduce((acc, key) => {
        acc[key] = getImageColorReference(key)
        return acc
      }, {} as Partial<Record<BlockId, string>>),
  }), [
    blockCustomLeadings,
    blockTextColors,
    blockCustomSizes,
    blockOrder,
    buildTextSnapshot,
    getImageColorReference,
    getImageRows,
    getImageSpan,
    imageModulePositions,
    imageOrder,
    resolvedLayerOrder,
    styleAssignments,
  ])

  const applyImageSnapshot = useCallback((snapshot: PreviewLayoutState) => {
    const normalizedOrder = (Array.isArray(snapshot.imageOrder) ? snapshot.imageOrder : [])
      .filter((key): key is BlockId => typeof key === "string" && key.length > 0)
      .filter((key, index, source) => source.indexOf(key) === index)

    const contentHeight = (result.pageSizePt.height - result.grid.margins.top - result.grid.margins.bottom) * scale
    const baselineStep = result.grid.gridUnit * scale
    const maxBaselineRow = Math.max(0, Math.floor(contentHeight / baselineStep))
    const nextPositions = normalizedOrder.reduce((acc, key) => {
      const raw = snapshot.imageModulePositions?.[key]
      if (!raw || typeof raw.col !== "number" || typeof raw.row !== "number") return acc
      const span = Math.max(1, Math.min(result.settings.gridCols, snapshot.imageColumnSpans?.[key] ?? 1))
      const minCol = -Math.max(0, span - 1)
      const maxCol = Math.max(0, result.settings.gridCols - 1)
      const minRow = -Math.max(0, maxBaselineRow)
      acc[key] = {
        col: Math.max(minCol, Math.min(maxCol, Math.round(raw.col))),
        row: Math.max(minRow, Math.min(maxBaselineRow, raw.row)),
      }
      return acc
    }, {} as Partial<Record<BlockId, ModulePosition>>)

    const nextSpans = normalizedOrder.reduce((acc, key) => {
      acc[key] = Math.max(1, Math.min(result.settings.gridCols, snapshot.imageColumnSpans?.[key] ?? 1))
      return acc
    }, {} as Partial<Record<BlockId, number>>)
    const nextRows = normalizedOrder.reduce((acc, key) => {
      acc[key] = Math.max(1, Math.min(result.settings.gridRows, snapshot.imageRowSpans?.[key] ?? 1))
      return acc
    }, {} as Partial<Record<BlockId, number>>)
    const nextColors = normalizedOrder.reduce((acc, key) => {
      const raw = snapshot.imageColors?.[key]
      acc[key] = getImageSchemeColorReference(raw ?? defaultImageColor, imageColorScheme)
      return acc
    }, {} as Partial<Record<BlockId, string>>)

    suppressImageModuleRemapRef.current = true
    setImageOrder(normalizedOrder)
    setImageModulePositions(nextPositions)
    setImageColumnSpans(nextSpans)
    setImageRowSpans(nextRows)
    setImageColors(nextColors)
    setImageEditorState(null)
  }, [
    defaultImageColor,
    imageColorScheme,
    result.grid.gridUnit,
    result.grid.margins.bottom,
    result.grid.margins.top,
    result.pageSizePt.height,
    result.settings.gridCols,
    result.settings.gridRows,
    scale,
  ])

  const applyLayerOrderSnapshot = useCallback((snapshot: PreviewLayoutState) => {
    const rawLayerOrder = Array.isArray(snapshot.layerOrder) ? snapshot.layerOrder : []
    const normalizedLayerOrder = rawLayerOrder
      .filter((key): key is BlockId => typeof key === "string" && key.length > 0)
      .filter((key, index, source) => source.indexOf(key) === index)
    const fallbackBlockOrder = (Array.isArray(snapshot.blockOrder) ? snapshot.blockOrder : [])
      .filter((key): key is BlockId => typeof key === "string" && key.length > 0)
    const fallbackImageOrder = (Array.isArray(snapshot.imageOrder) ? snapshot.imageOrder : [])
      .filter((key): key is BlockId => typeof key === "string" && key.length > 0)
    setLayerOrder(reconcileLayerOrder(normalizedLayerOrder, fallbackBlockOrder, fallbackImageOrder))
  }, [])

  const applyCustomSizeSnapshot = useCallback((snapshot: PreviewLayoutState) => {
    const normalizedOrder = (Array.isArray(snapshot.blockOrder) ? snapshot.blockOrder : [])
      .filter((key): key is BlockId => typeof key === "string" && key.length > 0)
    const nextSizes = normalizedOrder
      .reduce((acc, key) => {
        const styleKey = snapshot.styleAssignments?.[key] ?? "body"
        if (styleKey !== "fx") return acc
        const raw = snapshot.blockCustomSizes?.[key]
        if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
        acc[key] = clampFxSize(raw)
        return acc
      }, {} as Partial<Record<BlockId, number>>)
    const nextLeadings = normalizedOrder
      .reduce((acc, key) => {
        const styleKey = snapshot.styleAssignments?.[key] ?? "body"
        if (styleKey !== "fx") return acc
        const raw = snapshot.blockCustomLeadings?.[key]
        if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
        acc[key] = clampFxLeading(raw)
        return acc
      }, {} as Partial<Record<BlockId, number>>)
    const nextTextColors = normalizedOrder
      .reduce((acc, key) => {
        const raw = snapshot.blockTextColors?.[key]
        if (!isImagePlaceholderColor(raw)) return acc
        acc[key] = raw
        return acc
      }, {} as Partial<Record<BlockId, string>>)
    setBlockCustomSizes(nextSizes)
    setBlockCustomLeadings(nextLeadings)
    setBlockTextColors(nextTextColors)
  }, [])

  const applySnapshot = useCallback((snapshot: PreviewLayoutState) => {
    applyTextSnapshot(snapshot)
    applyImageSnapshot(snapshot)
    applyLayerOrderSnapshot(snapshot)
    applyCustomSizeSnapshot(snapshot)
  }, [applyCustomSizeSnapshot, applyImageSnapshot, applyLayerOrderSnapshot, applyTextSnapshot])

  const {
    pushHistory,
    recordHistoryBeforeChange,
    resetHistory,
    undo,
    redo,
  } = usePreviewHistory<PreviewLayoutState>({
    historyLimit: HISTORY_LIMIT,
    undoNonce,
    redoNonce,
    buildSnapshot,
    applySnapshot,
    onHistoryAvailabilityChange,
    onRecordHistory: onHistoryRecord,
  })

  const getGridMetrics = useCallback(() => {
    const { margins, gridMarginHorizontal, gridMarginVertical, gridUnit } = result.grid
    const { width: modW, height: modH } = result.module
    const { gridCols, gridRows } = result.settings
    const contentHeight = (result.pageSizePt.height - margins.top - margins.bottom) * scale
    const baselineStep = gridUnit * scale
    const moduleWidths = resolveAxisSizes(result.module.widths, gridCols, modW)
    const moduleHeights = resolveAxisSizes(result.module.heights, gridRows, modH)
    const colStarts = buildAxisStarts(moduleWidths, gridMarginHorizontal)
    const rowStarts = buildAxisStarts(moduleHeights, gridMarginVertical)
    const rowStartBaselines = rowStarts.map((value) => value / Math.max(0.0001, gridUnit))
    const firstColumnStep = (moduleWidths[0] ?? modW) + gridMarginHorizontal
    const firstRowStep = (moduleHeights[0] ?? modH) + gridMarginVertical
    const getColumnX = (col: number) => (
      col < 0
        ? margins.left * scale + col * firstColumnStep * scale
        : margins.left * scale + (colStarts[col] ?? col * firstColumnStep) * scale
    )
    const getNearestCol = (pageX: number) => {
      const relative = (pageX - margins.left * scale) / Math.max(scale, 0.0001)
      return findNearestAxisIndex(colStarts, relative)
    }
    const getNearestRowIndex = (pageY: number) => {
      const relative = (pageY - margins.top * scale) / Math.max(scale, 0.0001)
      return findNearestAxisIndex(rowStarts, relative)
    }
    const getRowStartBaseline = (rowIndex: number) => rowStartBaselines[rowIndex] ?? 0
    const maxBaselineRow = Math.max(0, Math.floor(contentHeight / baselineStep))

    return {
      contentLeft: margins.left * scale,
      contentTop: margins.top * scale,
      moduleWidth: (moduleWidths[0] ?? modW) * scale,
      moduleHeight: (moduleHeights[0] ?? modH) * scale,
      moduleWidths,
      moduleHeights,
      colStarts,
      rowStarts,
      rowStartBaselines,
      xStep: firstColumnStep * scale,
      yStep: baselineStep,
      gridCols,
      gridRows,
      maxBaselineRow,
      gutterX: gridMarginHorizontal * scale,
      baselineStep,
      baselineOriginTop: margins.top * scale - baselineStep,
      moduleYStep: firstRowStep * scale,
      getColumnX,
      getNearestCol,
      getNearestRowIndex,
      getRowStartBaseline,
    }
  }, [result.grid, result.module, result.pageSizePt.height, result.settings, scale])

  const getMeasuredTextWidth = useCallback((ctx: CanvasRenderingContext2D, text: string): number => {
    const key = `${ctx.font}::${text}`
    return makeCachedValue(measureWidthCacheRef.current, key, () => ctx.measureText(text).width)
  }, [makeCachedValue])

  const getWrappedText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    hyphenate: boolean,
  ): string[] => {
    const key = `${ctx.font}::${maxWidth.toFixed(4)}::${hyphenate ? 1 : 0}::${text}`
    const cached = makeCachedValue(wrapTextCacheRef.current, key, () =>
      wrapText(text, maxWidth, hyphenate, (sample) => getMeasuredTextWidth(ctx, sample)),
    )
    return [...cached]
  }, [getMeasuredTextWidth, makeCachedValue])

  const getOpticalOffset = useCallback((
    ctx: CanvasRenderingContext2D,
    line: string,
    align: TextAlignMode,
    fontSize: number,
  ): number => {
    const key = `${ctx.font}::${line}::${align}::${fontSize.toFixed(4)}`
    return makeCachedValue(opticalOffsetCacheRef.current, key, () =>
      getOpticalMarginAnchorOffset({
        line,
        align,
        fontSize,
        measureWidth: (sample) => getMeasuredTextWidth(ctx, sample),
      }),
    )
  }, [getMeasuredTextWidth, makeCachedValue])

  const toPagePoint = useCallback((canvasX: number, canvasY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const pageWidth = result.pageSizePt.width * scale
    const pageHeight = result.pageSizePt.height * scale
    const centerCanvasX = canvas.width / (2 * pixelRatio)
    const centerCanvasY = canvas.height / (2 * pixelRatio)
    const theta = (rotation * Math.PI) / 180
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    const dx = canvasX - centerCanvasX
    const dy = canvasY - centerCanvasY

    return {
      x: dx * cos + dy * sin + pageWidth / 2,
      y: -dx * sin + dy * cos + pageHeight / 2,
    }
  }, [pixelRatio, result.pageSizePt.height, result.pageSizePt.width, rotation, scale])

  const clampModulePosition = useCallback((position: ModulePosition, key: BlockId): ModulePosition => {
    const metrics = getGridMetrics()
    const span = getPlacementSpan(key)
    const maxCol = Math.max(0, metrics.gridCols - span)
    return {
      col: Math.max(0, Math.min(maxCol, position.col)),
      row: Math.max(0, Math.min(metrics.maxBaselineRow, position.row)),
    }
  }, [getGridMetrics, getPlacementSpan])

  const clampBaselinePosition = useCallback((position: ModulePosition, key: BlockId): ModulePosition => {
    const metrics = getGridMetrics()
    const span = getPlacementSpan(key)
    const minCol = -Math.max(0, span - 1)
    const maxCol = Math.max(0, metrics.gridCols - 1)
    const minRow = -Math.max(0, metrics.maxBaselineRow)
    return {
      col: Math.max(minCol, Math.min(maxCol, position.col)),
      row: Math.max(minRow, Math.min(metrics.maxBaselineRow, position.row)),
    }
  }, [getGridMetrics, getPlacementSpan])

  const clampImageModulePosition = useCallback((
    position: ModulePosition,
    columns: number,
    rows: number,
  ): ModulePosition => {
    const metrics = getGridMetrics()
    const safeCols = Math.max(1, Math.min(result.settings.gridCols, columns))
    const safeRows = Math.max(1, Math.min(result.settings.gridRows, rows))
    const maxCol = Math.max(0, metrics.gridCols - safeCols)
    const maxRowStartIndex = Math.max(0, result.settings.gridRows - safeRows)
    const maxRow = metrics.rowStartBaselines[maxRowStartIndex] ?? 0
    return {
      col: Math.max(0, Math.min(maxCol, position.col)),
      row: Math.max(0, Math.min(maxRow, position.row)),
    }
  }, [getGridMetrics, result.settings.gridCols, result.settings.gridRows])

  const clampImageBaselinePosition = useCallback((
    position: ModulePosition,
    columns: number,
  ): ModulePosition => {
    const metrics = getGridMetrics()
    const safeCols = Math.max(1, Math.min(result.settings.gridCols, columns))
    const minCol = -Math.max(0, safeCols - 1)
    const maxCol = Math.max(0, metrics.gridCols - 1)
    const minRow = -Math.max(0, metrics.maxBaselineRow)
    return {
      col: Math.max(minCol, Math.min(maxCol, position.col)),
      row: Math.max(minRow, Math.min(metrics.maxBaselineRow, position.row)),
    }
  }, [getGridMetrics, result.settings.gridCols])

  const snapToModule = useCallback((pageX: number, pageY: number, key: BlockId): ModulePosition => {
    const metrics = getGridMetrics()
    const rawCol = metrics.getNearestCol(pageX)
    const moduleIndex = metrics.getNearestRowIndex(pageY)
    const rawRow = metrics.getRowStartBaseline(moduleIndex)
    return clampModulePosition({ col: rawCol, row: rawRow }, key)
  }, [clampModulePosition, getGridMetrics])

  const snapToBaseline = useCallback((pageX: number, pageY: number, key: BlockId): ModulePosition => {
    const metrics = getGridMetrics()
    const rawCol = metrics.getNearestCol(pageX)
    const rawRow = Math.round((pageY - metrics.baselineOriginTop) / metrics.baselineStep)
    return clampBaselinePosition({ col: rawCol, row: rawRow }, key)
  }, [clampBaselinePosition, getGridMetrics])

  const findTopmostLayerAtPoint = useCallback((pageX: number, pageY: number): BlockId | null => {
    for (let index = resolvedLayerOrder.length - 1; index >= 0; index -= 1) {
      const key = resolvedLayerOrder[index]
      const isImage = imageOrder.includes(key)
      if (isImage && !showImagePlaceholders) continue
      const rect = isImage ? imageRectsRef.current[key] : blockRectsRef.current[key]
      if (!rect || rect.width <= 0 || rect.height <= 0) continue
      if (
        pageX >= rect.x
        && pageX <= rect.x + rect.width
        && pageY >= rect.y
        && pageY <= rect.y + rect.height
      ) {
        return key
      }
    }
    return null
  }, [imageOrder, resolvedLayerOrder, showImagePlaceholders])

  const findTopmostBlockAtPoint = useCallback((pageX: number, pageY: number): BlockId | null => {
    const key = findTopmostLayerAtPoint(pageX, pageY)
    if (!key || imageOrder.includes(key)) return null
    return key
  }, [findTopmostLayerAtPoint, imageOrder])

  const findTopmostImageAtPoint = useCallback((pageX: number, pageY: number): BlockId | null => {
    const key = findTopmostLayerAtPoint(pageX, pageY)
    if (!key || !imageOrder.includes(key)) return null
    return key
  }, [findTopmostLayerAtPoint, imageOrder])

  const findTopmostDraggableAtPoint = useCallback((pageX: number, pageY: number): BlockId | null => (
    findTopmostLayerAtPoint(pageX, pageY)
  ), [findTopmostLayerAtPoint])

  const resolveSelectedLayerAtClientPoint = useCallback((clientX: number, clientY: number): BlockId | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(clientX - rect.left, clientY - rect.top)
    if (!pagePoint) return null
    return findTopmostDraggableAtPoint(pagePoint.x, pagePoint.y)
  }, [findTopmostDraggableAtPoint, toPagePoint])

  const getAutoFitForPlacement = useCallback(({
    key,
    text,
    styleKey,
    rowSpan,
    reflow,
    syllableDivision,
    baselineMultiplierOverride,
    position,
  }: {
      key: BlockId
      text: string
    styleKey: TypographyStyleKey
    rowSpan: number
    reflow: boolean
    syllableDivision: boolean
    baselineMultiplierOverride?: number
    position?: ModulePosition | null
  }): { span: number; position: ModulePosition | null } | null => {
    if (!reflow) return null
    const trimmed = text.trim()
    if (!trimmed) return null
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    const style = result.typography.styles[styleKey]
    if (!style) return null

    const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
    const metrics = getGridMetrics()
    const baselinePx = gridUnit * scale
    const baselineMultiplier = (typeof baselineMultiplierOverride === "number" && Number.isFinite(baselineMultiplierOverride) && baselineMultiplierOverride > 0)
      ? baselineMultiplierOverride
      : style.baselineMultiplier
    const lineStep = baselineMultiplier * baselinePx
    const startRowIndex = position
      ? Math.max(0, Math.min(result.settings.gridRows - 1, findNearestAxisIndex(metrics.rowStartBaselines, position.row)))
      : 0
    const moduleHeightPx = sumAxisSpan(metrics.moduleHeights, startRowIndex, rowSpan, gridMarginVertical) * scale
    let maxLinesPerColumn = Math.max(1, Math.floor(moduleHeightPx / lineStep))

    if (position) {
      const contentTop = margins.top * scale
      const baselineOriginTop = contentTop - baselinePx
      const originY = baselineOriginTop + position.row * baselinePx
      const pageBottomY = result.pageSizePt.height * scale - margins.bottom * scale
      const firstLineTop = originY + baselinePx
      const availableByPage = Math.max(0, Math.floor((pageBottomY - firstLineTop) / lineStep) + 1)
      maxLinesPerColumn = Math.min(maxLinesPerColumn, availableByPage)
    }
    if (maxLinesPerColumn <= 0) return null

    const fontSize = getBlockFontSize(key, styleKey) * scale
    const fontFamily = getBlockFont(key)
    const fontWeight = isBlockBold(key) ? "700" : "400"
    const fontStyle = isBlockItalic(key) ? "italic " : ""
    ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${getFontFamilyCss(fontFamily)}`
    const startCol = position
      ? Math.max(0, Math.min(result.settings.gridCols - 1, position.col))
      : 0
    const columnWidth = sumAxisSpan(metrics.moduleWidths, startCol, 1, gridMarginHorizontal) * scale
    const lines = getWrappedText(ctx, trimmed, columnWidth, syllableDivision)
    const neededCols = Math.max(1, Math.ceil(lines.length / maxLinesPerColumn))

    const maxColsFromPlacement = position
      ? Math.max(1, result.settings.gridCols - Math.max(0, Math.min(result.settings.gridCols - 1, position.col)))
      : result.settings.gridCols
    const nextSpan = Math.max(1, Math.min(neededCols, maxColsFromPlacement))
    const nextPosition = position
      ? {
          col: Math.max(0, Math.min(Math.max(0, result.settings.gridCols - nextSpan), position.col)),
          row: position.row,
        }
      : null

    return { span: nextSpan, position: nextPosition }
  }, [
    getBlockFontSize,
    getBlockFont,
    getWrappedText,
    isBlockBold,
    isBlockItalic,
    getGridMetrics,
    result.grid,
    result.pageSizePt.height,
    result.settings.gridCols,
    result.settings.gridRows,
    result.typography.styles,
    scale,
  ])

  const applyDragDrop = useCallback((drag: DragState, nextPreview: ModulePosition, copyOnDrop: boolean) => {
    if (isImagePlaceholderKey(drag.key)) {
      const sourceColumns = getImageSpan(drag.key)
      const sourceRows = getImageRows(drag.key)
      const sourceColor = getImageColorReference(drag.key)
      const metrics = getGridMetrics()
      const minCol = -Math.max(0, sourceColumns - 1)
      const minRow = -Math.max(0, metrics.maxBaselineRow)
      const resolvedPosition = {
        col: Math.max(minCol, Math.min(Math.max(0, result.settings.gridCols - 1), nextPreview.col)),
        row: Math.max(minRow, Math.min(metrics.maxBaselineRow, nextPreview.row)),
      }

      if (copyOnDrop) {
        const newKey = getNextImagePlaceholderId()
        recordHistoryBeforeChange()
        setImageOrder((current) => {
          const sourceIndex = current.indexOf(drag.key)
          const next = [...current]
          if (sourceIndex >= 0) next.splice(sourceIndex + 1, 0, newKey)
          else next.push(newKey)
          return next
        })
        setImageModulePositions((current) => ({ ...current, [newKey]: resolvedPosition }))
        setImageColumnSpans((current) => ({ ...current, [newKey]: sourceColumns }))
        setImageRowSpans((current) => ({ ...current, [newKey]: sourceRows }))
        setImageColors((current) => ({ ...current, [newKey]: sourceColor }))
        onSelectLayer?.(newKey)
        return
      }

      recordHistoryBeforeChange()
      setImageModulePositions((current) => ({
        ...current,
        [drag.key]: resolvedPosition,
      }))
      return
    }

    if (copyOnDrop) {
      const sourceText = textContent[drag.key] ?? ""
      const maxParagraphCount = result.settings.gridCols * result.settings.gridRows
      const activeParagraphCount = blockOrder.filter((key) => (textContent[key] ?? "").trim().length > 0).length
      if (sourceText.trim().length > 0 && activeParagraphCount >= maxParagraphCount) {
        onRequestNotice?.({
          title: "Paragraph Limit Reached",
          message: `Maximum paragraphs reached (${maxParagraphCount}).`,
        })
        return
      }

      const styleKey = getStyleKeyForBlock(drag.key)
      const sourceRows = getBlockRows(drag.key)
      const sourceReflow = isTextReflowEnabled(drag.key)
      const sourceSyllableDivision = isSyllableDivisionEnabled(drag.key)
      const sourceSpan = getBlockSpan(drag.key)
      const sourceCustomSize = blockCustomSizes[drag.key]
      const sourceCustomLeading = blockCustomLeadings[drag.key]
      const sourceTextColor = blockTextColors[drag.key]
      const nextSpan = sourceSpan
      const metrics = getGridMetrics()
      const minCol = -Math.max(0, nextSpan - 1)
      const minRow = -Math.max(0, metrics.maxBaselineRow)
      const resolvedPosition = {
        col: Math.max(minCol, Math.min(Math.max(0, result.settings.gridCols - 1), nextPreview.col)),
        row: Math.max(minRow, Math.min(metrics.maxBaselineRow, nextPreview.row)),
      }
      const newKey = getNextCustomBlockId()

      recordHistoryBeforeChange()
      setBlockCollections((current) => {
        const sourceIndex = current.blockOrder.indexOf(drag.key)
        const nextOrder = [...current.blockOrder]
        if (sourceIndex >= 0) nextOrder.splice(sourceIndex + 1, 0, newKey)
        else nextOrder.push(newKey)

        const sourceFont = current.blockFontFamilies[drag.key] ?? baseFont
        const nextFonts = { ...current.blockFontFamilies }
        if (sourceFont === baseFont) {
          delete nextFonts[newKey]
        } else {
          nextFonts[newKey] = sourceFont
        }
        const nextItalic = { ...current.blockItalic }
        if (current.blockItalic[drag.key] === true || current.blockItalic[drag.key] === false) {
          nextItalic[newKey] = current.blockItalic[drag.key]
        } else {
          delete nextItalic[newKey]
        }
        const nextBold = { ...current.blockBold }
        if (current.blockBold[drag.key] === true || current.blockBold[drag.key] === false) {
          nextBold[newKey] = current.blockBold[drag.key]
        } else {
          delete nextBold[newKey]
        }
        const nextRotations = { ...current.blockRotations }
        const sourceRotation = current.blockRotations[drag.key]
        if (typeof sourceRotation === "number" && Number.isFinite(sourceRotation) && Math.abs(sourceRotation) > 0.001) {
          nextRotations[newKey] = clampRotation(sourceRotation)
        } else {
          delete nextRotations[newKey]
        }

        return {
          ...current,
          blockOrder: nextOrder,
          textContent: {
            ...current.textContent,
            [newKey]: current.textContent[drag.key] ?? "",
          },
          blockTextEdited: {
            ...current.blockTextEdited,
            [newKey]: current.blockTextEdited[drag.key] ?? true,
          },
          styleAssignments: {
            ...current.styleAssignments,
            [newKey]: styleKey,
          },
          blockFontFamilies: nextFonts,
          blockBold: nextBold,
          blockItalic: nextItalic,
          blockRotations: nextRotations,
          blockColumnSpans: {
            ...current.blockColumnSpans,
            [newKey]: nextSpan,
          },
          blockRowSpans: {
            ...current.blockRowSpans,
            [newKey]: sourceRows,
          },
          blockTextAlignments: {
            ...current.blockTextAlignments,
            [newKey]: current.blockTextAlignments[drag.key] ?? "left",
          },
          blockTextReflow: {
            ...current.blockTextReflow,
            [newKey]: sourceReflow,
          },
          blockSyllableDivision: {
            ...current.blockSyllableDivision,
            [newKey]: sourceSyllableDivision,
          },
          blockModulePositions: {
            ...current.blockModulePositions,
            [newKey]: resolvedPosition,
          },
        }
      })
      setBlockCustomSizes((current) => {
        const next = { ...current }
        if (styleKey === "fx" && typeof sourceCustomSize === "number" && Number.isFinite(sourceCustomSize) && sourceCustomSize > 0) {
          next[newKey] = clampFxSize(sourceCustomSize)
        } else {
          delete next[newKey]
        }
        return next
      })
      setBlockCustomLeadings((current) => {
        const next = { ...current }
        if (styleKey === "fx" && typeof sourceCustomLeading === "number" && Number.isFinite(sourceCustomLeading) && sourceCustomLeading > 0) {
          next[newKey] = clampFxLeading(sourceCustomLeading)
        } else {
          delete next[newKey]
        }
        return next
      })
      setBlockTextColors((current) => {
        const next = { ...current }
        if (isImagePlaceholderColor(sourceTextColor)) {
          next[newKey] = sourceTextColor
        } else {
          delete next[newKey]
        }
        return next
      })
      onSelectLayer?.(newKey)
    } else {
      recordHistoryBeforeChange()
      const span = getBlockSpan(drag.key)
      const metrics = getGridMetrics()
      const minCol = -Math.max(0, span - 1)
      const minRow = -Math.max(0, metrics.maxBaselineRow)
      setBlockModulePositions((current) => ({
        ...current,
        [drag.key]: {
          col: Math.max(minCol, Math.min(Math.max(0, result.settings.gridCols - 1), nextPreview.col)),
          row: Math.max(minRow, Math.min(metrics.maxBaselineRow, nextPreview.row)),
        },
      }))
    }
  }, [
    baseFont,
    blockCustomLeadings,
    blockTextColors,
    blockCustomSizes,
    blockOrder,
    getBlockRows,
    getBlockSpan,
    getImageColorReference,
    getImageRows,
    getImageSpan,
    getGridMetrics,
    getStyleKeyForBlock,
    isImagePlaceholderKey,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    onRequestNotice,
    onSelectLayer,
    recordHistoryBeforeChange,
    result.settings.gridCols,
    result.settings.gridRows,
    setImageColors,
    setImageColumnSpans,
    setImageModulePositions,
    setImageOrder,
    setImageRowSpans,
    setBlockCollections,
    setBlockCustomLeadings,
    setBlockTextColors,
    setBlockCustomSizes,
    setBlockModulePositions,
    textContent,
  ])

  const draggableModulePositions = useMemo(
    () => ({
      ...blockModulePositions,
      ...imageModulePositions,
    }),
    [blockModulePositions, imageModulePositions],
  )

  const {
    dragState,
    setDragState,
    dragEndedAtRef,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasPointerCancel,
    handleCanvasLostPointerCapture,
  } = usePreviewDrag<BlockId>({
    showTypography,
    isEditorOpen: Boolean(editorState || imageEditorState),
    canvasRef,
    blockRectsRef,
    getBlockRect: (key) => blockRectsRef.current[key] ?? imageRectsRef.current[key] ?? null,
    blockModulePositions: draggableModulePositions,
    findTopmostBlockAtPoint: findTopmostDraggableAtPoint,
    toPagePoint,
    snapToModule,
    snapToBaseline,
    onDrop: applyDragDrop,
    onClearHover: () => {
      setHoverState(null)
      setHoverImageKey(null)
    },
    touchLongPressMs: TOUCH_LONG_PRESS_MS,
    touchCancelDistancePx: TOUCH_CANCEL_DISTANCE_PX,
  })

  useEffect(() => {
    if (historyResetToken === lastHistoryResetTokenRef.current) return
    lastHistoryResetTokenRef.current = historyResetToken
    resetHistory()
    lastAppliedLayoutKeyRef.current = 0
    lastAppliedImageLayoutKeyRef.current = 0
    lastAppliedCustomSizeLayoutKeyRef.current = 0
    lastAppliedLayerLayoutKeyRef.current = 0
    lastAppliedLayerRequestKeyRef.current = 0
    lastAppliedLayerDeleteRequestKeyRef.current = 0
    suppressReflowCheckRef.current = true
    suppressImageModuleRemapRef.current = true
    previousImageGridRef.current = null
    previousImageRowStartsRef.current = null
    setDragState(null)
    setHoverState(null)
    setHoverImageKey(null)
    setEditorState(null)
    setImageEditorState(null)
  }, [historyResetToken, resetHistory, setDragState])

  useEffect(() => {
    if (paragraphColorResetToken === lastParagraphColorResetTokenRef.current) return
    lastParagraphColorResetTokenRef.current = paragraphColorResetToken
    const hasCustomParagraphColors = Object.keys(blockTextColors).length > 0
    const nextImageColors = imageOrder.reduce((acc, key) => {
      acc[key] = getClosestImageSchemeColorToken(imageColors[key] ?? defaultImageColor, imageColorScheme)
      return acc
    }, {} as Partial<Record<BlockId, string>>)
    const hasCustomImageColors = imageOrder.some((key) => nextImageColors[key] !== imageColors[key])
      || Object.keys(imageColors).some((key) => !imageOrder.includes(key))
    setEditorState((prev) => {
      if (!prev) return prev
      if (prev.draftColor.toLowerCase() === defaultTextColor.toLowerCase()) return prev
      return { ...prev, draftColor: defaultTextColor }
    })
    if (!hasCustomParagraphColors && !hasCustomImageColors) return
    recordHistoryBeforeChange()
    if (hasCustomParagraphColors) {
      setBlockTextColors({})
    }
    if (hasCustomImageColors) {
      setImageColors(nextImageColors)
    }
  }, [
    blockTextColors,
    defaultImageColor,
    defaultTextColor,
    imageColorScheme,
    imageColors,
    imageOrder,
    paragraphColorResetToken,
    recordHistoryBeforeChange,
    setBlockTextColors,
  ])

  const buildReflowPlannerInput = useCallback((
    gridCols: number,
    gridRows: number,
    sourcePositions: Partial<Record<BlockId, ModulePosition>> = blockModulePositions,
  ): ReflowPlannerInput => {
    const moduleHeights = resolveAxisSizes(result.module.heights, gridRows, result.module.height)
    const rowStarts = buildAxisStarts(moduleHeights, result.grid.gridMarginVertical)
    const rowStartsInBaselines = rowStarts.map((value) => value / Math.max(0.0001, result.grid.gridUnit))
    return {
      moduleRowStarts: rowStartsInBaselines,
      gridCols,
      gridRows,
      blockOrder,
      blockColumnSpans,
      sourcePositions,
      pageHeight: result.pageSizePt.height,
      marginTop: result.grid.margins.top,
      marginBottom: result.grid.margins.bottom,
      gridUnit: result.grid.gridUnit,
      moduleHeight: result.module.height,
      gridMarginVertical: result.grid.gridMarginVertical,
    }
  }, [
    blockColumnSpans,
    blockModulePositions,
    blockOrder,
    result.grid.gridMarginVertical,
    result.grid.gridUnit,
    result.grid.margins.bottom,
    result.grid.margins.top,
    result.module.heights,
    result.module.height,
    result.pageSizePt.height,
  ])

  const computeReflowPlan = useCallback((input: ReflowPlannerInput): ReflowPlan => {
    const signature = createReflowPlanSignature(input)
    const cached = reflowPlanCacheRef.current.get(signature)
    if (cached) return cached
    const plan = computeReflowPlanPure(input)
    reflowPlanCacheRef.current.set(signature, plan)
    if (reflowPlanCacheRef.current.size > REFLOW_PLAN_CACHE_LIMIT) {
      const firstKey = reflowPlanCacheRef.current.keys().next().value
      if (firstKey) reflowPlanCacheRef.current.delete(firstKey)
    }
    return plan
  }, [])

  const {
    postRequest: postReflowWorkerRequest,
    cancelRequest: cancelReflowWorkerRequest,
  } = useWorkerBridge<ReflowPlannerInput, ReflowPlan>({
    strategy: "latest",
    createWorker: () => new Worker(new URL("../workers/reflowPlanner.worker.ts", import.meta.url)),
    parseMessage: (data) => {
      if (!data || typeof data !== "object") return null
      const typed = data as { id?: unknown; plan?: ReflowPlan }
      if (typeof typed.id !== "number" || !typed.plan) return null
      return { id: typed.id, result: typed.plan }
    },
  })

  const postReflowPlanRequest = useCallback((input: ReflowPlannerInput) => {
    const workerRequest = postReflowWorkerRequest(input)
    if (!workerRequest) {
      return {
        requestId: -1,
        promise: Promise.resolve(computeReflowPlan(input)),
      }
    }
    return workerRequest
  }, [computeReflowPlan, postReflowWorkerRequest])

  const {
    postRequest: postAutoFitWorkerRequest,
    cancelRequest: cancelAutoFitWorkerRequest,
  } = useWorkerBridge<
    AutoFitPlannerInput,
    {
      spanUpdates: Partial<Record<string, number>>
      positionUpdates: Partial<Record<string, ModulePosition>>
    }
  >({
    enabled: typeof OffscreenCanvas !== "undefined",
    strategy: "latest",
    createWorker: () => new Worker(new URL("../workers/autoFit.worker.ts", import.meta.url)),
    parseMessage: (data) => {
      if (!data || typeof data !== "object") return null
      const typed = data as {
        id?: unknown
        output?: {
          spanUpdates: Partial<Record<string, number>>
          positionUpdates: Partial<Record<string, ModulePosition>>
        }
      }
      if (typeof typed.id !== "number" || !typed.output) return null
      return { id: typed.id, result: typed.output }
    },
  })

  const postAutoFitRequest = useCallback((input: AutoFitPlannerInput) => {
    const workerRequest = postAutoFitWorkerRequest(input)
    if (!workerRequest) {
      return {
        requestId: -1,
        promise: Promise.resolve(computeAutoFitBatch(input, (font, text) => {
          const canvas = canvasRef.current
          if (!canvas) return 0
          const ctx = canvas.getContext("2d")
          if (!ctx) return 0
          ctx.font = font
          return ctx.measureText(text).width
        })),
      }
    }
    return workerRequest
  }, [postAutoFitWorkerRequest])

  useInitialLayoutHydration<TypographyStyleKey, BlockId>({
    initialLayout,
    initialLayoutToken,
    lastAppliedLayoutTokenRef: lastAppliedLayoutKeyRef,
    pushHistory,
    buildSnapshot,
    baseFont,
    gridCols: result.settings.gridCols,
    gridRows: result.settings.gridRows,
    typographyStyles: result.typography.styles,
    isBaseBlockId,
    defaultTextContent: DEFAULT_TEXT_CONTENT as Record<string, string>,
    defaultStyleAssignments: Object.fromEntries(
      BASE_BLOCK_IDS.map((key) => [key, DEFAULT_STYLE_ASSIGNMENTS[key]]),
    ) as Record<string, TypographyStyleKey>,
    isFontFamily,
    getDefaultColumnSpan,
    getGridMetrics,
    setBlockCollections,
    onBeforeApply: () => {
      suppressReflowCheckRef.current = true
    },
    onAfterApply: () => {
      setDragState(null)
      setHoverState(null)
      setHoverImageKey(null)
      setEditorState(null)
      setImageEditorState(null)
    },
  })

  useEffect(() => {
    if (!initialLayout || initialLayoutToken === 0) return
    if (lastAppliedImageLayoutKeyRef.current === initialLayoutToken) return
    lastAppliedImageLayoutKeyRef.current = initialLayoutToken
    applyImageSnapshot(initialLayout)
  }, [applyImageSnapshot, initialLayout, initialLayoutToken])

  useEffect(() => {
    if (!initialLayout || initialLayoutToken === 0) return
    if (lastAppliedLayerLayoutKeyRef.current === initialLayoutToken) return
    lastAppliedLayerLayoutKeyRef.current = initialLayoutToken
    applyLayerOrderSnapshot(initialLayout)
  }, [applyLayerOrderSnapshot, initialLayout, initialLayoutToken])

  useEffect(() => {
    if (!initialLayout || initialLayoutToken === 0) return
    if (lastAppliedCustomSizeLayoutKeyRef.current === initialLayoutToken) return
    lastAppliedCustomSizeLayoutKeyRef.current = initialLayoutToken
    applyCustomSizeSnapshot(initialLayout)
  }, [applyCustomSizeSnapshot, initialLayout, initialLayoutToken])

  useEffect(() => {
    if (!requestedLayerOrder || requestedLayerOrderToken === 0) return
    if (lastAppliedLayerRequestKeyRef.current === requestedLayerOrderToken) return
    lastAppliedLayerRequestKeyRef.current = requestedLayerOrderToken
    const nextLayerOrder = reconcileLayerOrder(requestedLayerOrder, blockOrder, imageOrder)
    if (areStringArraysEqual(layerOrder, nextLayerOrder)) return
    recordHistoryBeforeChange()
    setLayerOrder(nextLayerOrder)
  }, [blockOrder, imageOrder, layerOrder, recordHistoryBeforeChange, requestedLayerOrder, requestedLayerOrderToken])
  usePreviewLayerDelete({
    imageOrder,
    requestedLayerDeleteTarget,
    requestedLayerDeleteToken,
    lastAppliedLayerDeleteRequestKeyRef,
    recordHistoryBeforeChange,
    setImageOrder,
    setImageModulePositions,
    setImageColumnSpans,
    setImageRowSpans,
    setImageColors,
    setLayerOrder,
    setImageEditorState,
    setBlockCollections,
    setBlockCustomSizes,
    setBlockCustomLeadings,
    setBlockTextColors,
    setEditorState,
  })

  const handlePreviewPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    onSelectLayer?.(resolveSelectedLayerAtClientPoint(event.clientX, event.clientY))
    handleCanvasPointerDown(event)
  }, [handleCanvasPointerDown, onSelectLayer, resolveSelectedLayerAtClientPoint])

  useEffect(() => {
    const canvas = staticCanvasRef.current
    if (!canvas) return

    const frame = window.requestAnimationFrame(() => {
      const markName = "sgg:guides"
      if (typeof performance.mark === "function") performance.mark(`${markName}:start`)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const cssWidth = canvas.width / pixelRatio
      const cssHeight = canvas.height / pixelRatio
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      renderStaticGuides({
        ctx,
        canvasWidth: cssWidth,
        canvasHeight: cssHeight,
        result,
        scale,
        rotation,
        backgroundColor: canvasBackground,
        showMargins,
        showModules,
        showBaselines,
        isMobile,
      })
      if (typeof performance.mark === "function" && typeof performance.measure === "function") {
        performance.mark(`${markName}:end`)
        try {
          performance.measure(markName, `${markName}:start`, `${markName}:end`)
        } catch {
          // Ignore missing/invalid marks.
        }
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [canvasBackground, isMobile, pixelRatio, result, rotation, scale, showBaselines, showMargins, showModules])

  useEffect(() => {
    const canvas = imageCanvasRef.current
    if (!canvas) return

    const frame = window.requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const cssWidth = canvas.width / pixelRatio
      const cssHeight = canvas.height / pixelRatio
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, cssWidth, cssHeight)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pixelRatio])

  useTypographyRenderer<BlockId>({
    canvasRef,
    blockRectsRef,
    imageRectsRef,
    typographyBufferRef,
    previousPlansRef,
    typographyBufferTransformRef,
    result,
    scale,
    fontRenderEpoch,
    rotation,
    showTypography,
    showImagePlaceholders,
    blockOrder,
    imageOrder,
    layerOrder: resolvedLayerOrder,
    textContent,
    styleAssignments,
    blockTextAlignments,
    blockModulePositions,
    imageModulePositions,
    dragState,
    getBlockFont,
    isBlockItalic,
    isBlockBold,
    getBlockRotation,
    getBlockSpan,
    getBlockRows,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    getBlockTextColor,
    getImageSpan,
    getImageRows,
    getImageColor,
    clampImageBaselinePosition,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    getWrappedText,
    getOpticalOffset,
    onOverflowLinesChange: handleOverflowLinesChange,
    onCanvasReady,
    recordPerfMetric,
    pixelRatio,
  })

  useEffect(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const frame = window.requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const cssWidth = canvas.width / pixelRatio
      const cssHeight = canvas.height / pixelRatio
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, cssWidth, cssHeight)
      if (!showTypography) return
      const hasOverflow = blockOrder.some((key) => (overflowLinesByBlock[key] ?? 0) > 0)
      const activeEditorPlan = editorState ? previousPlansRef.current.get(editorState.target) : null
      const selectedImageRect = selectedLayerKey && imageOrder.includes(selectedLayerKey)
        ? imageRectsRef.current[selectedLayerKey]
        : null
      const selectedTextPlan = selectedLayerKey ? previousPlansRef.current.get(selectedLayerKey) : null
      const hasSelectedLayer = Boolean(selectedImageRect || selectedTextPlan)
      if (!dragState && !hasOverflow && !activeEditorPlan && !hasSelectedLayer) return

      const { width, height } = result.pageSizePt
      const { margins, gridUnit, gridMarginHorizontal, gridMarginVertical } = result.grid
      const pageWidth = width * scale
      const pageHeight = height * scale
      const baselineStep = gridUnit * scale
      const baselineOriginTop = margins.top * scale - baselineStep
      const contentLeft = margins.left * scale
      const metrics = getGridMetrics()
      const firstColumnStepPt = (metrics.moduleWidths[0] ?? result.module.width) + gridMarginHorizontal

      ctx.save()
      ctx.translate(cssWidth / 2, cssHeight / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-pageWidth / 2, -pageHeight / 2)
      const drawPlacementGuide = (x: number, lineY: number, width: number, height: number) => {
        ctx.strokeStyle = "#f97316"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, lineY)
        ctx.lineTo(x + width, lineY)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x, lineY)
        ctx.lineTo(x, lineY + height)
        ctx.stroke()
      }
      if (dragState) {
        const dragSpan = getPlacementSpan(dragState.key)
        const dragRows = getPlacementRows(dragState.key)
        const snapX = dragState.preview.col < 0
          ? contentLeft + dragState.preview.col * firstColumnStepPt * scale
          : contentLeft + (metrics.colStarts[dragState.preview.col] ?? dragState.preview.col * firstColumnStepPt) * scale
        const snapY = baselineOriginTop + dragState.preview.row * baselineStep
        const dragRowStart = Math.max(
          0,
          Math.min(result.settings.gridRows - 1, findNearestAxisIndex(metrics.rowStartBaselines, dragState.preview.row)),
        )
        const snapWidth = sumAxisSpan(metrics.moduleWidths, dragState.preview.col, dragSpan, gridMarginHorizontal) * scale
        const snapHeight = sumAxisSpan(metrics.moduleHeights, dragRowStart, dragRows, gridMarginVertical) * scale
        drawPlacementGuide(snapX, snapY + baselineStep, snapWidth, snapHeight)
      } else if (selectedImageRect) {
        drawPlacementGuide(
          selectedImageRect.x,
          selectedImageRect.y,
          selectedImageRect.width,
          selectedImageRect.height,
        )
      } else if (selectedTextPlan) {
        drawPlacementGuide(
          selectedTextPlan.rotationOriginX,
          selectedTextPlan.rotationOriginY + baselineStep,
          selectedTextPlan.rect.width,
          selectedTextPlan.rect.height,
        )
      }
      if (activeEditorPlan) {
        const editorSpan = getBlockSpan(activeEditorPlan.key)
        const editorRows = getBlockRows(activeEditorPlan.key)
        const editorX = activeEditorPlan.rotationOriginX
        const editorY = activeEditorPlan.rotationOriginY
        const manual = blockModulePositions[activeEditorPlan.key]
        const startCol = manual
          ? Math.max(-Math.max(0, editorSpan - 1), Math.min(result.settings.gridCols - 1, manual.col))
          : 0
        const startRow = manual
          ? Math.max(
              0,
              Math.min(result.settings.gridRows - 1, findNearestAxisIndex(metrics.rowStartBaselines, manual.row)),
            )
          : 0
        const editorWidth = sumAxisSpan(metrics.moduleWidths, startCol, editorSpan, gridMarginHorizontal) * scale
        const editorHeight = sumAxisSpan(metrics.moduleHeights, startRow, editorRows, gridMarginVertical) * scale
        const lineY = editorY + baselineStep
        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.moveTo(editorX, lineY)
        ctx.lineTo(editorX + editorWidth, lineY)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(editorX, lineY)
        ctx.lineTo(editorX, lineY + editorHeight)
        ctx.stroke()
      }
      if (hasOverflow) {
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.font = `700 ${Math.max(10, OVERFLOW_BADGE_RADIUS * 1.2)}px Inter, system-ui, -apple-system, sans-serif`
        for (const key of blockOrder) {
          const overflowLines = overflowLinesByBlock[key] ?? 0
          if (overflowLines <= 0) continue
          const rect = blockRectsRef.current[key]
          if (!rect || rect.width <= 0 || rect.height <= 0) continue
          const cx = rect.x + rect.width - OVERFLOW_BADGE_RADIUS - OVERFLOW_BADGE_PADDING
          const cy = rect.y + rect.height - OVERFLOW_BADGE_RADIUS - OVERFLOW_BADGE_PADDING
          ctx.save()
          ctx.beginPath()
          ctx.fillStyle = OVERFLOW_BADGE_FILL
          ctx.arc(cx, cy, OVERFLOW_BADGE_RADIUS, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#ffffff"
          ctx.fillText("…", cx, cy + 0.5)
          ctx.restore()
        }
      }
      ctx.restore()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [
    blockModulePositions,
    blockOrder,
    dragState,
    editorState,
    imageOrder,
    getBlockRows,
    getBlockSpan,
    getGridMetrics,
    getPlacementRows,
    getPlacementSpan,
    overflowLinesByBlock,
    pixelRatio,
    result,
    rotation,
    scale,
    selectedLayerKey,
    showTypography,
  ])

  useEffect(() => {
    const calculateScale = () => {
      const container = previewContainerRef.current
      if (!container) return

      const { width, height } = result.pageSizePt
      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40

      const nextScale = Math.min(containerWidth / width, containerHeight / height)
      setScale((prev) => (Math.abs(prev - nextScale) < 0.0001 ? prev : nextScale))
    }

    calculateScale()
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(calculateScale)
      : null
    if (observer && previewContainerRef.current) observer.observe(previewContainerRef.current)
    window.addEventListener("resize", calculateScale)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", calculateScale)
    }
  }, [result])

  useEffect(() => {
    const readDevicePixelRatio = () => Math.max(1, window.devicePixelRatio || 1)
    const applyDevicePixelRatio = () => {
      const nextRatio = readDevicePixelRatio()
      setPixelRatio((prev) => (Math.abs(prev - nextRatio) < 0.01 ? prev : nextRatio))
    }

    applyDevicePixelRatio()
    let mediaQuery = window.matchMedia(`(resolution: ${readDevicePixelRatio()}dppx)`)
    const handleDprChange = () => {
      applyDevicePixelRatio()
      mediaQuery.removeEventListener("change", handleDprChange)
      mediaQuery = window.matchMedia(`(resolution: ${readDevicePixelRatio()}dppx)`)
      mediaQuery.addEventListener("change", handleDprChange)
    }

    mediaQuery.addEventListener("change", handleDprChange)
    window.addEventListener("resize", applyDevicePixelRatio)
    window.addEventListener("orientationchange", applyDevicePixelRatio)
    window.visualViewport?.addEventListener("resize", applyDevicePixelRatio)
    return () => {
      mediaQuery.removeEventListener("change", handleDprChange)
      window.removeEventListener("resize", applyDevicePixelRatio)
      window.removeEventListener("orientationchange", applyDevicePixelRatio)
      window.visualViewport?.removeEventListener("resize", applyDevicePixelRatio)
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const {
    pendingReflow,
    reflowToast,
    applyPendingReflow,
    cancelPendingReflow,
    dismissReflowToast,
  } = useLayoutReflow<BlockId, ReflowPlannerInput, PreviewLayoutState>({
    suppressReflowCheckRef,
    blockOrder,
    blockColumnSpans,
    blockModulePositions,
    textContent,
    scale,
    gridCols: result.settings.gridCols,
    gridRows: result.settings.gridRows,
    moduleWidth: result.module.width,
    moduleHeight: result.module.height,
    moduleWidths: resolveAxisSizes(result.module.widths, result.settings.gridCols, result.module.width),
    moduleHeights: resolveAxisSizes(result.module.heights, result.settings.gridRows, result.module.height),
    moduleRowStarts: buildAxisStarts(
      resolveAxisSizes(result.module.heights, result.settings.gridRows, result.module.height),
      result.grid.gridMarginVertical,
    ).map((value) => value / Math.max(0.0001, result.grid.gridUnit)),
    gridUnit: result.grid.gridUnit,
    gridMarginVertical: result.grid.gridMarginVertical,
    marginTop: result.grid.margins.top,
    marginBottom: result.grid.margins.bottom,
    pageHeight: result.pageSizePt.height,
    typographyStyles: result.typography.styles,
    getDefaultColumnSpan,
    getBlockRows,
    getBlockSpan,
    getStyleKeyForBlock,
    getBlockFontSize,
    getBlockBaselineMultiplier,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    buildSnapshot,
    pushHistory,
    onRequestGridRestore,
    setBlockColumnSpans,
    setBlockModulePositions,
    buildReflowPlannerInput,
    postReflowPlanRequest,
    cancelReflowWorkerRequest,
    computeReflowPlan,
    postAutoFitRequest,
    cancelAutoFitWorkerRequest,
    computeAutoFitFallback: (input) => computeAutoFitBatch(input, (font, text) => {
      const canvas = canvasRef.current
      if (!canvas) return 0
      const ctx = canvas.getContext("2d")
      if (!ctx) return 0
      ctx.font = font
      return ctx.measureText(text).width
    }),
    recordPerfMetric,
  })

  useEffect(() => {
    const currentGrid = { cols: result.settings.gridCols, rows: result.settings.gridRows }
    const moduleHeights = resolveAxisSizes(result.module.heights, result.settings.gridRows, result.module.height)
    const currentRowStarts = buildAxisStarts(moduleHeights, result.grid.gridMarginVertical)
      .map((value) => value / Math.max(0.0001, result.grid.gridUnit))
    const maxBaselineRow = Math.max(
      0,
      Math.floor((result.pageSizePt.height - result.grid.margins.top - result.grid.margins.bottom) / result.grid.gridUnit),
    )

    if (!previousImageGridRef.current) {
      previousImageGridRef.current = currentGrid
      previousImageRowStartsRef.current = currentRowStarts
      return
    }

    if (suppressImageModuleRemapRef.current) {
      suppressImageModuleRemapRef.current = false
      previousImageGridRef.current = currentGrid
      previousImageRowStartsRef.current = currentRowStarts
      return
    }

    const previousGrid = previousImageGridRef.current
    const previousRowStarts = previousImageRowStartsRef.current ?? currentRowStarts
    const gridChanged = previousGrid.cols !== currentGrid.cols || previousGrid.rows !== currentGrid.rows
    const rowStartsChanged = (
      previousRowStarts.length !== currentRowStarts.length
      || previousRowStarts.some((value, index) => Math.abs(value - (currentRowStarts[index] ?? value)) > 0.0001)
    )
    if (!gridChanged && !rowStartsChanged) return

    const hasGridReduction = currentGrid.cols < previousGrid.cols || currentGrid.rows < previousGrid.rows
    if (!hasGridReduction && rowStartsChanged) {
      setImageModulePositions((prev) => {
        let changed = false
        const next: Partial<Record<BlockId, ModulePosition>> = { ...prev }
        for (const key of imageOrder) {
          const position = prev[key]
          if (!position) continue
          const span = Math.max(1, Math.min(currentGrid.cols, imageColumnSpans[key] ?? 1))
          const minCol = -Math.max(0, span - 1)
          const maxCol = Math.max(0, currentGrid.cols - 1)
          const moduleIndex = findNearestAxisIndex(previousRowStarts, position.row)
          const previousStart = previousRowStarts[moduleIndex] ?? 0
          const targetStart = currentRowStarts[Math.min(moduleIndex, Math.max(0, currentRowStarts.length - 1))] ?? 0
          const baselineOffset = position.row - previousStart
          const remappedRow = targetStart + baselineOffset
          const clampedRow = Math.max(-maxBaselineRow, Math.min(maxBaselineRow, remappedRow))
          const clampedCol = Math.max(minCol, Math.min(maxCol, position.col))
          if (Math.abs(clampedRow - position.row) > 0.0001 || clampedCol !== position.col) {
            next[key] = { col: clampedCol, row: clampedRow }
            changed = true
          }
        }
        return changed ? next : prev
      })
    }

    previousImageGridRef.current = currentGrid
    previousImageRowStartsRef.current = currentRowStarts
  }, [
    imageColumnSpans,
    imageOrder,
    result.grid.gridMarginVertical,
    result.grid.gridUnit,
    result.grid.margins.bottom,
    result.grid.margins.top,
    result.module.heights,
    result.module.height,
    result.pageSizePt.height,
    result.settings.gridCols,
    result.settings.gridRows,
  ])

  const {
    closeEditor,
    saveEditor,
    applyEditorDraftLive,
    deleteEditorBlock,
    handleCanvasDoubleClick: handleTextCanvasDoubleClick,
  } = useBlockEditorActions({
    showTypography,
    dragEndedAtRef,
    canvasRef,
    editorState,
    setEditorState,
    baseFont,
    resultGridCols: result.settings.gridCols,
    resultGridRows: result.settings.gridRows,
    resultTypographyStyles: result.typography.styles,
    blockOrder,
    textContent,
    blockTextEdited,
    styleAssignments,
    blockCustomSizes,
    blockCustomLeadings,
    blockTextAlignments,
    blockModulePositions,
    recordHistoryBeforeChange,
    setBlockCollections,
    setBlockOrder,
    setTextContent,
    setBlockTextEdited,
    setStyleAssignments,
    setBlockCustomSizes,
    setBlockCustomLeadings,
    setBlockTextColors,
    setBlockColumnSpans,
    setBlockTextAlignments,
    setBlockModulePositions,
    getAutoFitForPlacement,
    getGridMetrics,
    isBaseBlockId,
    getNextCustomBlockId,
    getDummyTextForStyle,
    getStyleSize,
    getStyleLeading,
    getBlockTextColor,
    defaultTextColor,
    getDefaultColumnSpan,
    resultGridUnit: result.grid.gridUnit,
    toPagePoint,
    findTopmostBlockAtPoint,
    snapToModule,
    getBlockFont,
    getBlockSpan,
    getBlockRows,
    isTextReflowEnabled,
    isSyllableDivisionEnabled,
    isBlockBold,
    isBlockItalic,
    getBlockRotation,
    onRequestNotice,
  })

  useEffect(() => {
    if (!editorState) {
      lastLiveEditorSignatureRef.current = ""
      return
    }
    const signature = [
      editorState.target,
      editorState.draftStyle,
      editorState.draftFont,
      editorState.draftColumns,
      editorState.draftRows,
      editorState.draftAlign,
      editorState.draftColor,
      editorState.draftReflow ? "1" : "0",
      editorState.draftSyllableDivision ? "1" : "0",
      editorState.draftBold ? "1" : "0",
      editorState.draftItalic ? "1" : "0",
      editorState.draftRotation.toFixed(3),
      editorState.draftFxSize,
      editorState.draftFxLeading,
      editorState.draftTextEdited ? "1" : "0",
      editorState.draftText,
    ].join("|")
    if (lastLiveEditorSignatureRef.current === signature) return
    lastLiveEditorSignatureRef.current = signature
    applyEditorDraftLive(editorState)
  }, [applyEditorDraftLive, editorState])

  useEffect(() => {
    if (!imageEditorState) {
      lastLiveImageEditorSignatureRef.current = ""
      return
    }
    const signature = [
      imageEditorState.target,
      imageEditorState.draftColumns,
      imageEditorState.draftRows,
      imageEditorState.draftColor,
    ].join("|")
    if (lastLiveImageEditorSignatureRef.current === signature) return
    lastLiveImageEditorSignatureRef.current = signature

    const key = imageEditorState.target
    const columns = Math.max(1, Math.min(result.settings.gridCols, imageEditorState.draftColumns))
    const rows = Math.max(1, Math.min(result.settings.gridRows, imageEditorState.draftRows))
    const color = getImageSchemeColorReference(imageEditorState.draftColor, imageColorScheme)
    const existingPosition = imageModulePositions[key] ?? { col: 0, row: 0 }
    const clampedPosition = clampImageBaselinePosition(existingPosition, columns)

    setImageColumnSpans((prev) => (
      prev[key] === columns
        ? prev
        : { ...prev, [key]: columns }
    ))
    setImageRowSpans((prev) => (
      prev[key] === rows
        ? prev
        : { ...prev, [key]: rows }
    ))
    setImageColors((prev) => (
      prev[key] === color
        ? prev
        : { ...prev, [key]: color }
    ))
    setImageModulePositions((prev) => {
      const current = prev[key]
      if (current && current.col === clampedPosition.col && current.row === clampedPosition.row) {
        return prev
      }
      return { ...prev, [key]: clampedPosition }
    })
  }, [
    clampImageBaselinePosition,
    defaultImageColor,
    imageColorScheme,
    imageEditorState,
    imageModulePositions,
    result.settings.gridCols,
    result.settings.gridRows,
  ])

  const openImageEditor = useCallback((key: BlockId, options?: { recordHistory?: boolean }) => {
    setEditorState(null)
    if (options?.recordHistory !== false) {
      recordHistoryBeforeChange()
    }
    setImageEditorState({
      target: key,
      draftColumns: getImageSpan(key),
      draftRows: getImageRows(key),
      draftColor: getImageColor(key),
    })
  }, [getImageColor, getImageRows, getImageSpan, recordHistoryBeforeChange])

  const closeImageEditor = useCallback(() => {
    setImageEditorState(null)
  }, [])

  const openTextEditor = useCallback((key: BlockId, options?: { recordHistory?: boolean }) => {
    setImageEditorState(null)
    if (options?.recordHistory !== false) {
      recordHistoryBeforeChange()
    }
    const styleKey = styleAssignments[key] ?? "body"
    setEditorState({
      target: key,
      draftText: normalizeInlineEditorText(textContent[key] ?? ""),
      draftStyle: styleKey,
      draftFxSize: styleKey === "fx"
        ? clampFxSize(blockCustomSizes[key] ?? getStyleSize("fx"))
        : getStyleSize("fx"),
      draftFxLeading: styleKey === "fx"
        ? clampFxLeading(blockCustomLeadings[key] ?? getStyleLeading("fx"))
        : getStyleLeading("fx"),
      draftFont: getBlockFont(key),
      draftColumns: getBlockSpan(key),
      draftRows: getBlockRows(key),
      draftAlign: blockTextAlignments[key] ?? "left",
      draftColor: getBlockTextColor(key),
      draftReflow: isTextReflowEnabled(key),
      draftSyllableDivision: isSyllableDivisionEnabled(key),
      draftBold: isBlockBold(key),
      draftItalic: isBlockItalic(key),
      draftRotation: getBlockRotation(key),
      draftTextEdited: blockTextEdited[key] ?? true,
    })
  }, [
    blockCustomLeadings,
    blockCustomSizes,
    blockTextAlignments,
    blockTextEdited,
    getBlockFont,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getBlockTextColor,
    getStyleLeading,
    getStyleSize,
    isBlockBold,
    isBlockItalic,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    recordHistoryBeforeChange,
    styleAssignments,
    textContent,
  ])

  const handleImageColorSchemeChange = useCallback((nextScheme: ImageColorSchemeId) => {
    setImageColors((prev) => normalizeImageColorReferences(prev, imageColorScheme))
    onImageColorSchemeChange?.(nextScheme)
  }, [imageColorScheme, normalizeImageColorReferences, onImageColorSchemeChange])

  useEffect(() => {
    if (!requestedLayerEditorTarget || requestedLayerEditorToken === 0) return
    if (lastAppliedLayerEditorRequestKeyRef.current === requestedLayerEditorToken) return
    lastAppliedLayerEditorRequestKeyRef.current = requestedLayerEditorToken

    if (imageOrder.includes(requestedLayerEditorTarget)) {
      if (imageEditorState?.target === requestedLayerEditorTarget) {
        closeImageEditor()
      } else {
        openImageEditor(requestedLayerEditorTarget)
      }
      return
    }

    if (!blockOrder.includes(requestedLayerEditorTarget)) return
    if (editorState?.target === requestedLayerEditorTarget) {
      closeEditor()
    } else {
      openTextEditor(requestedLayerEditorTarget)
    }
  }, [
    blockOrder,
    closeEditor,
    closeImageEditor,
    editorState?.target,
    imageEditorState?.target,
    imageOrder,
    openImageEditor,
    openTextEditor,
    requestedLayerEditorToken,
    requestedLayerEditorTarget,
  ])

  useEffect(() => {
    const previousScheme = previousImageColorSchemeRef.current
    if (previousScheme === imageColorScheme) return
    setImageColors((prev) => normalizeImageColorReferences(prev, previousScheme))
    previousImageColorSchemeRef.current = imageColorScheme
  }, [imageColorScheme, normalizeImageColorReferences])

  useEffect(() => {
    setImageEditorState((prev) => {
      if (!prev) return prev
      const nextColor = resolveImageSchemeColor(imageColors[prev.target], imageColorScheme)
      if (prev.draftColor.toLowerCase() === nextColor.toLowerCase()) return prev
      return { ...prev, draftColor: nextColor }
    })
  }, [defaultImageColor, imageColorScheme, imageColors])

  useEffect(() => {
    if (imageEditorState?.target) {
      onSelectLayer?.(imageEditorState.target)
      return
    }
    if (editorState?.target) {
      onSelectLayer?.(editorState.target)
    }
  }, [editorState?.target, imageEditorState?.target, onSelectLayer])

  const deleteImagePlaceholder = useCallback(() => {
    if (!imageEditorState) return
    const key = imageEditorState.target
    recordHistoryBeforeChange()
    setImageOrder((prev) => prev.filter((item) => item !== key))
    setImageModulePositions((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageColumnSpans((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageRowSpans((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageColors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setImageEditorState(null)
  }, [imageEditorState, recordHistoryBeforeChange])

  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showTypography || Date.now() - dragEndedAtRef.current < 250) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const pagePoint = toPagePoint(event.clientX - rect.left, event.clientY - rect.top)
    if (!pagePoint) return

    const textKey = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (textKey) {
      setImageEditorState(null)
      handleTextCanvasDoubleClick(event)
      return
    }

    if (!showImagePlaceholders) {
      setImageEditorState(null)
      handleTextCanvasDoubleClick(event)
      return
    }

    const imageKey = findTopmostImageAtPoint(pagePoint.x, pagePoint.y)
    if (imageKey) {
      openImageEditor(imageKey)
      return
    }

    if (!(event.shiftKey || event.ctrlKey)) {
      setImageEditorState(null)
      handleTextCanvasDoubleClick(event)
      return
    }

    const metrics = getGridMetrics()
    const relativeX = (pagePoint.x - metrics.contentLeft) / Math.max(scale, 0.0001)
    const relativeY = (pagePoint.y - metrics.contentTop) / Math.max(scale, 0.0001)
    const moduleColIndex = findAxisIndexAtOffset(metrics.colStarts, metrics.moduleWidths, relativeX)
    const moduleRowIndex = findAxisIndexAtOffset(metrics.rowStarts, metrics.moduleHeights, relativeY)
    if (moduleColIndex < 0 || moduleRowIndex < 0) {
      return
    }
    const moduleX = metrics.contentLeft + (metrics.colStarts[moduleColIndex] ?? 0) * scale
    const moduleY = metrics.contentTop + (metrics.rowStarts[moduleRowIndex] ?? 0) * scale
    const moduleWidth = (metrics.moduleWidths[moduleColIndex] ?? metrics.moduleWidth / Math.max(scale, 0.0001)) * scale
    const moduleHeight = (metrics.moduleHeights[moduleRowIndex] ?? metrics.moduleHeight / Math.max(scale, 0.0001)) * scale
    const localX = pagePoint.x - moduleX
    const localY = pagePoint.y - moduleY
    const insideModuleX = localX >= 0 && localX <= moduleWidth
    const insideModuleY = localY >= 0 && localY <= moduleHeight
    if (
      moduleColIndex < 0
      || moduleColIndex >= result.settings.gridCols
      || moduleRowIndex < 0
      || moduleRowIndex >= result.settings.gridRows
      || !insideModuleX
      || !insideModuleY
    ) {
      return
    }
    const rawPosition = {
      col: moduleColIndex,
      row: metrics.rowStartBaselines[moduleRowIndex] ?? 0,
    }
    const newKey = getNextImagePlaceholderId()
    const snapped = clampImageModulePosition(rawPosition, 1, 1)
    recordHistoryBeforeChange()
    setImageOrder((prev) => [...prev, newKey])
    setImageModulePositions((prev) => ({ ...prev, [newKey]: snapped }))
    setImageColumnSpans((prev) => ({ ...prev, [newKey]: 1 }))
    setImageRowSpans((prev) => ({ ...prev, [newKey]: 1 }))
    setImageColors((prev) => ({ ...prev, [newKey]: getImageSchemeColorReference(defaultImageColor, imageColorScheme) }))
    openImageEditor(newKey, { recordHistory: false })
  }, [
    canvasRef,
    clampImageModulePosition,
    dragEndedAtRef,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    getGridMetrics,
    handleTextCanvasDoubleClick,
    openImageEditor,
    defaultImageColor,
    imageColorScheme,
    recordHistoryBeforeChange,
    result.settings.gridCols,
    result.settings.gridRows,
    scale,
    showImagePlaceholders,
    showTypography,
    toPagePoint,
  ])

  const focusEditor = useCallback(() => {
    if (!editorState) return
    textareaRef.current?.focus()
  }, [editorState])

  const closeAnyEditor = useCallback(() => {
    closeEditor()
    closeImageEditor()
  }, [closeEditor, closeImageEditor])

  usePreviewKeyboard({
    editorTarget: editorState?.target ?? imageEditorState?.target ?? null,
    isEditorOpen: Boolean(editorState || imageEditorState),
    focusEditor,
    onCloseEditor: closeAnyEditor,
    undo: onUndoRequest ?? undo,
    redo: onRedoRequest ?? redo,
  })
  useCloseEditorsOnOutsidePointer({
    isEditorOpen: Boolean(editorState || imageEditorState),
    textareaRef,
    onCloseEditors: closeAnyEditor,
  })

  const handleCanvasMouseMoveInner = useCallback((clientX: number, clientY: number) => {
    mouseMoveRafRef.current = null

    if (!showTypography || editorState || imageEditorState || dragState) {
      if (hoverState) setHoverState(null)
      if (hoverImageKey) setHoverImageKey(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = clientX - rect.left
    const canvasY = clientY - rect.top
    const pagePoint = toPagePoint(canvasX, canvasY)
    if (!pagePoint) {
      if (hoverState) setHoverState(null)
      if (hoverImageKey) setHoverImageKey(null)
      return
    }

    const textKey = findTopmostBlockAtPoint(pagePoint.x, pagePoint.y)
    if (textKey) {
      if (hoverImageKey) setHoverImageKey(null)
      setHoverState((prev) => {
        if (prev && prev.key === textKey) {
          return prev
        }
        return { key: textKey }
      })
      return
    }

    const imageKey = findTopmostImageAtPoint(pagePoint.x, pagePoint.y)
    if (imageKey) {
      if (hoverState) setHoverState(null)
      if (hoverImageKey !== imageKey) setHoverImageKey(imageKey)
      return
    }

    if (hoverState) setHoverState(null)
    if (hoverImageKey) setHoverImageKey(null)
  }, [
    dragState,
    editorState,
    findTopmostBlockAtPoint,
    findTopmostImageAtPoint,
    hoverImageKey,
    hoverState,
    imageEditorState,
    showTypography,
    toPagePoint,
  ])

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (mouseMoveRafRef.current !== null) return
    const { clientX, clientY } = event
    mouseMoveRafRef.current = requestAnimationFrame(() => handleCanvasMouseMoveInner(clientX, clientY))
  }, [handleCanvasMouseMoveInner])

  useEffect(() => {
    return () => {
      if (mouseMoveRafRef.current !== null) cancelAnimationFrame(mouseMoveRafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!onLayoutChange) {
      if (onLayoutChangeDebounceRef.current !== null) {
        window.clearTimeout(onLayoutChangeDebounceRef.current)
        onLayoutChangeDebounceRef.current = null
      }
      pendingLayoutEmissionRef.current = null
      return
    }

    const resolvedSpans = blockOrder.reduce((acc, key) => {
      acc[key] = getBlockSpan(key)
      return acc
    }, {} as Record<BlockId, number>)
    const resolvedAlignments = blockOrder.reduce((acc, key) => {
      acc[key] = blockTextAlignments[key] ?? "left"
      return acc
    }, {} as Record<BlockId, TextAlignMode>)

    pendingLayoutEmissionRef.current = {
      blockOrder,
      textContent,
      blockTextEdited,
      styleAssignments,
      blockFontFamilies: { ...blockFontFamilies },
      blockColumnSpans: resolvedSpans,
      blockRowSpans: blockOrder.reduce((acc, key) => {
        acc[key] = getBlockRows(key)
        return acc
      }, {} as Record<BlockId, number>),
      blockTextAlignments: resolvedAlignments,
      blockTextReflow: blockOrder.reduce((acc, key) => {
        acc[key] = isTextReflowEnabled(key)
        return acc
      }, {} as Record<BlockId, boolean>),
      blockSyllableDivision: blockOrder.reduce((acc, key) => {
        acc[key] = isSyllableDivisionEnabled(key)
        return acc
      }, {} as Record<BlockId, boolean>),
      blockBold: blockOrder.reduce((acc, key) => {
        acc[key] = isBlockBold(key)
        return acc
      }, {} as Record<BlockId, boolean>),
      blockItalic: blockOrder.reduce((acc, key) => {
        acc[key] = isBlockItalic(key)
        return acc
      }, {} as Record<BlockId, boolean>),
      blockRotations: blockOrder.reduce((acc, key) => {
        acc[key] = getBlockRotation(key)
        return acc
      }, {} as Record<BlockId, number>),
      blockCustomSizes: blockOrder.reduce((acc, key) => {
        const styleKey = styleAssignments[key] ?? "body"
        if (styleKey !== "fx") return acc
        const raw = blockCustomSizes[key]
        if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
        acc[key] = clampFxSize(raw)
        return acc
      }, {} as Partial<Record<BlockId, number>>),
      blockCustomLeadings: blockOrder.reduce((acc, key) => {
        const styleKey = styleAssignments[key] ?? "body"
        if (styleKey !== "fx") return acc
        const raw = blockCustomLeadings[key]
        if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return acc
        acc[key] = clampFxLeading(raw)
        return acc
      }, {} as Partial<Record<BlockId, number>>),
      blockTextColors: blockOrder.reduce((acc, key) => {
        const raw = blockTextColors[key]
        if (!isImagePlaceholderColor(raw)) return acc
        acc[key] = raw
        return acc
      }, {} as Partial<Record<BlockId, string>>),
      blockModulePositions,
      layerOrder: [...resolvedLayerOrder],
      imageOrder: [...imageOrder],
      imageModulePositions: { ...imageModulePositions },
      imageColumnSpans: imageOrder.reduce((acc, key) => {
        acc[key] = getImageSpan(key)
        return acc
      }, {} as Partial<Record<BlockId, number>>),
      imageRowSpans: imageOrder.reduce((acc, key) => {
        acc[key] = getImageRows(key)
        return acc
      }, {} as Partial<Record<BlockId, number>>),
      imageColors: imageOrder.reduce((acc, key) => {
        acc[key] = getImageColorReference(key)
        return acc
      }, {} as Partial<Record<BlockId, string>>),
    }
    if (onLayoutChangeDebounceRef.current !== null) {
      window.clearTimeout(onLayoutChangeDebounceRef.current)
    }
    onLayoutChangeDebounceRef.current = window.setTimeout(() => {
      if (!pendingLayoutEmissionRef.current) return
      setLayoutEmissionVersion((prev) => prev + 1)
      onLayoutChangeDebounceRef.current = null
    }, LAYOUT_CHANGE_DEBOUNCE_MS)
    return () => {
      if (onLayoutChangeDebounceRef.current !== null) {
        window.clearTimeout(onLayoutChangeDebounceRef.current)
        onLayoutChangeDebounceRef.current = null
      }
    }
  }, [
    blockFontFamilies,
    blockCustomLeadings,
    blockTextColors,
    blockCustomSizes,
    blockModulePositions,
    blockOrder,
    blockTextAlignments,
    blockTextEdited,
    getBlockRotation,
    getBlockRows,
    getBlockSpan,
    getImageColorReference,
    getImageRows,
    getImageSpan,
    imageColors,
    imageModulePositions,
    imageOrder,
    isBlockBold,
    isBlockItalic,
    isSyllableDivisionEnabled,
    isTextReflowEnabled,
    onLayoutChange,
    resolvedLayerOrder,
    styleAssignments,
    textContent,
  ])

  useEffect(() => {
    if (!onLayoutChange || !pendingLayoutEmissionRef.current) return
    onLayoutChange(pendingLayoutEmissionRef.current)
    pendingLayoutEmissionRef.current = null
  }, [layoutEmissionVersion, onLayoutChange])

  const pageWidthCss = result.pageSizePt.width * scale
  const pageHeightCss = result.pageSizePt.height * scale
  const pageWidthPx = Math.max(1, Math.round(pageWidthCss * pixelRatio))
  const pageHeightPx = Math.max(1, Math.round(pageHeightCss * pixelRatio))

  const canvasCursorClass = dragState
    ? (dragState.copyOnDrop ? "cursor-copy" : "cursor-grabbing")
    : (hoverState || hoverImageKey)
      ? "cursor-grab"
      : "cursor-default"
  const hierarchyOptionLabels = useMemo(
    () =>
      STYLE_OPTIONS.map(
        (option) => `${option.label} (${formatPtSize(result.typography.styles[option.value].size)})`,
      ),
    [result.typography.styles],
  )
  const hierarchyTriggerMinWidthCh = useMemo(
    () => Math.max(12, hierarchyOptionLabels.reduce((max, label) => Math.max(max, label.length), 0) + 4),
    [hierarchyOptionLabels],
  )
  const rowTriggerMinWidthCh = 10
  const colTriggerMinWidthCh = 10
  const inlineEditorLayout = editorState ? (() => {
    const rect = blockRectsRef.current[editorState.target]
    if (!rect) return null
    const plan = previousPlansRef.current.get(editorState.target)
    const textAscent = plan?.commands[0]
      ? Math.max(0, plan.commands[0].y - ((plan?.rotationOriginY ?? rect.y) + result.grid.gridUnit * scale))
      : result.grid.gridUnit * scale
    return {
      rect,
      blockRotation: plan?.blockRotation ?? editorState.draftRotation,
      rotationOriginX: plan?.rotationOriginX ?? rect.x,
      rotationOriginY: plan?.rotationOriginY ?? rect.y,
      textAscent,
      textAlign: plan?.textAlign ?? editorState.draftAlign,
      commands: plan?.commands ?? [],
    }
  })() : null

  return (
    <div
      ref={previewContainerRef}
      className={`relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="relative" style={{ width: pageWidthCss, height: pageHeightCss }}>
        <canvas
          ref={staticCanvasRef}
          width={pageWidthPx}
          height={pageHeightPx}
          style={{ width: pageWidthCss, height: pageHeightCss }}
          className="absolute inset-0 block shadow-lg"
        />
        <canvas
          ref={imageCanvasRef}
          width={pageWidthPx}
          height={pageHeightPx}
          style={{ width: pageWidthCss, height: pageHeightCss }}
          className="pointer-events-none absolute inset-0 block"
        />
        <canvas
          ref={canvasRef}
          width={pageWidthPx}
          height={pageHeightPx}
          style={{ width: pageWidthCss, height: pageHeightCss }}
          className={`absolute inset-0 block touch-none ${canvasCursorClass}`}
          onPointerDown={handlePreviewPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerCancel}
          onLostPointerCapture={handleCanvasLostPointerCapture}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => {
            setHoverState(null)
            setHoverImageKey(null)
          }}
          onDoubleClick={handleCanvasDoubleClick}
        />
        <canvas
          ref={overlayCanvasRef}
          width={pageWidthPx}
          height={pageHeightPx}
          style={{ width: pageWidthCss, height: pageHeightCss }}
          className="pointer-events-none absolute inset-0 block"
        />
        <InlineBlockTextarea
          editorState={editorState}
          setEditorState={setEditorState}
          textareaRef={textareaRef}
          layout={inlineEditorLayout}
          pageWidth={pageWidthCss}
          pageHeight={pageHeightCss}
          pageRotation={rotation}
          scale={scale}
          baselineStep={result.grid.gridUnit * scale}
          closeEditor={closeEditor}
          saveEditor={saveEditor}
          getStyleSizeValue={getStyleSize}
          getStyleLeadingValue={getStyleLeading}
          isFxStyle={(styleKey) => styleKey === "fx"}
        />
      </div>

      {pendingReflow ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-md border border-gray-300 bg-white p-4 shadow-xl">
            <div className="text-sm font-semibold text-gray-900">Rearrange Layout?</div>
            <div className="mt-2 text-xs text-gray-600">
              This grid change will rearrange {pendingReflow.movedCount} block{pendingReflow.movedCount === 1 ? "" : "s"}.
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={cancelPendingReflow}>Cancel</Button>
              <Button size="sm" onClick={applyPendingReflow}>Apply</Button>
            </div>
          </div>
        </div>
      ) : null}

      {reflowToast ? (
        <div className="absolute bottom-3 right-3 z-30 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-lg">
          <div className="text-xs text-gray-700">Layout rearranged.</div>
          <div className="mt-1 flex items-center justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => {
                const performUndo = onUndoRequest ?? undo
                performUndo()
                dismissReflowToast()
              }}
            >
              Undo
            </Button>
          </div>
        </div>
      ) : null}

      {(showRolloverInfo && hoverState) || (PERF_ENABLED && showPerfOverlay && perfOverlay) ? (
        <div className="pointer-events-none absolute left-3 top-3 z-40 flex flex-col gap-2">
          {showRolloverInfo && hoverState ? (
            <div className="w-72 rounded-md border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
              <div className="text-[11px] font-medium text-gray-900">Interaction</div>
              {PREVIEW_INTERACTION_HINT_LINES.map((line, index) => (
                <div key={line} className={`${index === 0 ? "mt-1" : ""} text-[11px] text-gray-600`}>
                  {line}
                </div>
              ))}
            </div>
          ) : null}

          {PERF_ENABLED && showPerfOverlay && perfOverlay ? (
            <div className="rounded-md border border-gray-300 bg-white/95 px-3 py-2 text-[11px] text-gray-700 shadow-md backdrop-blur-sm">
              <div className="font-semibold text-gray-900">Perf (Ctrl/Cmd+Shift+P)</div>
              <div>draw p50/p95: {perfOverlay.draw?.p50.toFixed(1) ?? "-"} / {perfOverlay.draw?.p95.toFixed(1) ?? "-"} ms</div>
              <div>reflow p50/p95: {perfOverlay.reflow?.p50.toFixed(1) ?? "-"} / {perfOverlay.reflow?.p95.toFixed(1) ?? "-"} ms</div>
              <div>autofit p50/p95: {perfOverlay.autofit?.p50.toFixed(1) ?? "-"} / {perfOverlay.autofit?.p95.toFixed(1) ?? "-"} ms</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {editorState ? (
        <div
          data-text-editor-panel="true"
          className={`absolute left-3 top-3 z-40 ${showEditorHelpIcon ? "rounded-md ring-1 ring-blue-500" : ""}`}
          onMouseEnter={showEditorHelpIcon ? () => onOpenHelpSection?.("help-editor") : undefined}
        >
          <TextEditorPanel
            isHelpActive={showEditorHelpIcon}
            showRolloverInfo={showRolloverInfo}
            controls={{
              editorState,
              setEditorState,
              deleteEditorBlock,
              gridRows: result.settings.gridRows,
              gridCols: result.settings.gridCols,
              hierarchyTriggerMinWidthCh,
              rowTriggerMinWidthCh,
              colTriggerMinWidthCh,
              styleOptions: STYLE_OPTIONS,
              getStyleSizeLabel: (styleKey) => formatPtSize(getStyleSize(styleKey)),
              getStyleSizeValue: getStyleSize,
              getStyleLeadingValue: getStyleLeading,
              isFxStyle: (styleKey) => styleKey === "fx",
              getDummyTextForStyle,
              colorSchemes: IMAGE_COLOR_SCHEMES,
              selectedColorScheme: imageColorScheme,
              onColorSchemeChange: handleImageColorSchemeChange,
              palette: imagePalette,
            }}
          />
        </div>
      ) : null}
      {imageEditorState ? (
        <div
          data-image-editor-panel="true"
          className={`absolute left-3 top-3 z-40 ${showEditorHelpIcon ? "rounded-md ring-1 ring-blue-500" : ""}`}
          onMouseEnter={showEditorHelpIcon ? () => onOpenHelpSection?.("help-image-editor") : undefined}
        >
          <ImageEditorDialog
            editorState={imageEditorState}
            setEditorState={setImageEditorState}
            deleteEditor={deleteImagePlaceholder}
            gridRows={result.settings.gridRows}
            gridCols={result.settings.gridCols}
            colorSchemes={IMAGE_COLOR_SCHEMES}
            selectedColorScheme={imageColorScheme}
            onColorSchemeChange={handleImageColorSchemeChange}
            palette={imagePalette}
            rowTriggerMinWidthCh={rowTriggerMinWidthCh}
            colTriggerMinWidthCh={colTriggerMinWidthCh}
            isHelpActive={showEditorHelpIcon}
            showRolloverInfo={showRolloverInfo}
          />
        </div>
      ) : null}

    </div>
  )
})

GridPreview.displayName = "GridPreview"
