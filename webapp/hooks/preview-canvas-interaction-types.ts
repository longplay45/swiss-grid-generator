import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"

import type { FontFamily } from "@/lib/config/fonts"
import type { BlockRect, NoticeRequest, PagePoint } from "@/lib/preview-types"
import type { PreviewTextLayerCollectionsState } from "@/lib/preview-text-layer-state"
import type { ModulePosition } from "@/lib/types/layout-primitives"

export type OpenImageEditorOptions = {
  recordHistory?: boolean
}

export type PreviewGridMetrics = {
  maxBaselineRow: number
  rowStartBaselines: number[]
}

export type PreviewCanvasInteractionArgs<Key extends string, StyleKey extends string> = {
  showTypography: boolean
  showImagePlaceholders: boolean
  editorOpen: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
  blockRectsRef: RefObject<Record<Key, BlockRect>>
  imageRectsRef: RefObject<Record<Key, BlockRect>>
  blockModulePositions: Partial<Record<Key, ModulePosition>>
  imageModulePositions: Partial<Record<Key, ModulePosition>>
  toPagePoint: (x: number, y: number) => PagePoint | null
  toPagePointFromClient: (clientX: number, clientY: number) => PagePoint | null
  snapToModule: (x: number, y: number, key: Key) => ModulePosition
  snapToBaseline: (x: number, y: number, key: Key) => ModulePosition
  getGridMetrics: () => PreviewGridMetrics
  findTopmostDraggableAtPoint: (x: number, y: number) => Key | null
  findTopmostBlockAtPoint: (x: number, y: number) => Key | null
  findTopmostImageAtPoint: (x: number, y: number) => Key | null
  resolveSelectedLayerAtClientPoint: (clientX: number, clientY: number) => Key | null
  resolveModulePositionAtPagePoint: (pageX: number, pageY: number) => ModulePosition | null
  clampImageModulePosition: (position: ModulePosition, columns: number, rows: number) => ModulePosition
  isImagePlaceholderKey: (key: Key) => boolean
  getImageSpan: (key: Key) => number
  getImageRows: (key: Key) => number
  getImageColorReference: (key: Key) => string
  getBlockRows: (key: Key) => number
  getBlockSpan: (key: Key) => number
  getStyleKeyForBlock: (key: Key) => StyleKey
  isTextReflowEnabled: (key: Key) => boolean
  isSyllableDivisionEnabled: (key: Key) => boolean
  blockOrder: Key[]
  textContent: Record<Key, string>
  blockCustomSizes: Partial<Record<Key, number>>
  blockCustomLeadings: Partial<Record<Key, number>>
  blockTextColors: Partial<Record<Key, string>>
  baseFont: FontFamily
  gridCols: number
  gridRows: number
  recordHistoryBeforeChange: () => void
  insertImagePlaceholder: (
    key: Key,
    options: {
      position: ModulePosition
      columns?: number
      rows?: number
      color?: string
      afterKey?: Key | null
    },
  ) => void
  setImageModulePositions: Dispatch<SetStateAction<Partial<Record<Key, ModulePosition>>>>
  setBlockCollections: (
    updater: (
      prev: PreviewTextLayerCollectionsState<Key, StyleKey>,
    ) => PreviewTextLayerCollectionsState<Key, StyleKey>,
  ) => void
  setBlockCustomSizes: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  setBlockCustomLeadings: Dispatch<SetStateAction<Partial<Record<Key, number>>>>
  setBlockTextColors: Dispatch<SetStateAction<Partial<Record<Key, string>>>>
  setBlockModulePositions: Dispatch<SetStateAction<Partial<Record<Key, ModulePosition>>>>
  onSelectLayer?: (key: Key | null) => void
  onRequestNotice?: (notice: NoticeRequest) => void
  getNextCustomBlockId: () => Key
  getNextImagePlaceholderId: () => Key
  handleTextCanvasDoubleClick: (event: ReactMouseEvent<HTMLCanvasElement>) => void
  openImageEditor: (key: Key, options?: OpenImageEditorOptions) => void
  closeImageEditorPanel: () => void
  clearHover: () => void
  dragEndedAtRef: MutableRefObject<number>
  touchLongPressMs: number
  touchCancelDistancePx: number
}
