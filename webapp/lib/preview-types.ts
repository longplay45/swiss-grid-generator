import type { TextAlignMode, TextVerticalAlignMode } from "@/lib/types/layout-primitives"
import type { TextTrackingRun } from "@/lib/text-tracking-runs"
import type { PositionedTextFormatTrackingSegment } from "@/lib/text-format-runs"
import type { BlockRect, TextDrawCommand } from "@/lib/typography-layout-plan"

export type { BlockRect, TextAlignMode, TextDrawCommand, TextVerticalAlignMode }

export type PagePoint = {
  x: number
  y: number
}

export type NoticeRequest = {
  title: string
  message: string
}

export type OverflowLinesByBlock<Key extends string> = Partial<Record<Key, number>>

export type RenderedCaretStop = {
  index: number
  x: number
}

export type RenderedTextLine = {
  sourceStart: number
  sourceEnd: number
  left: number
  top: number
  width: number
  height: number
  baselineY: number
  caretStops: RenderedCaretStop[]
}

export type BlockRenderPlan<Key extends string> = {
  key: Key
  rect: BlockRect
  guideRects: BlockRect[]
  signature: string
  font: string
  textColor: string
  textAlign: TextAlignMode
  textVerticalAlign: TextVerticalAlignMode
  blockRotation: number
  rotationOriginX: number
  rotationOriginY: number
  opticalKerning: boolean
  trackingScale: number
  trackingRuns: TextTrackingRun[]
  sourceText: string
  segmentLines: PositionedTextFormatTrackingSegment[][]
  renderedLines: RenderedTextLine[]
  commands: TextDrawCommand[]
}
