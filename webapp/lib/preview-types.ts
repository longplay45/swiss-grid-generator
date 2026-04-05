import type { TextAlignMode } from "@/lib/types/layout-primitives"
import type { PositionedTrackingSegment, TextTrackingRun } from "@/lib/text-tracking-runs"
import type { BlockRect, TextDrawCommand } from "@/lib/typography-layout-plan"

export type { BlockRect, TextAlignMode, TextDrawCommand }

export type PagePoint = {
  x: number
  y: number
}

export type NoticeRequest = {
  title: string
  message: string
}

export type OverflowLinesByBlock<Key extends string> = Partial<Record<Key, number>>

export type BlockRenderPlan<Key extends string> = {
  key: Key
  rect: BlockRect
  guideRects: BlockRect[]
  signature: string
  font: string
  textColor: string
  textAlign: TextAlignMode
  blockRotation: number
  rotationOriginX: number
  rotationOriginY: number
  opticalKerning: boolean
  trackingScale: number
  trackingRuns: TextTrackingRun[]
  sourceText: string
  segmentLines: PositionedTrackingSegment[][]
  commands: TextDrawCommand[]
}
