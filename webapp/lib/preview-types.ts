import type { BlockRect, TextAlignMode, TextDrawCommand } from "@/lib/typography-layout-plan"

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
  signature: string
  font: string
  textColor: string
  textAlign: TextAlignMode
  blockRotation: number
  rotationOriginX: number
  rotationOriginY: number
  commands: TextDrawCommand[]
}
