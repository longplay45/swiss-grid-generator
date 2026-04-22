import { findNearestAxisIndex } from "./grid-rhythm.ts"
import type { ModulePosition, TextBlockPosition } from "./types/layout-primitives.ts"

function toRoundedInteger(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback
  return Math.round(value)
}

function normalizeFiniteNumber(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback
  return value
}

function normalizeRowIndex(value: number): number {
  return Math.max(0, toRoundedInteger(value))
}

function normalizeColumnIndex(value: number): number {
  return normalizeFiniteNumber(value)
}

function isTextBlockPosition(value: unknown): value is TextBlockPosition {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<TextBlockPosition>
  return (
    typeof candidate.column === "number"
    && Number.isFinite(candidate.column)
    && typeof candidate.row === "number"
    && Number.isFinite(candidate.row)
    && typeof candidate.baselineOffset === "number"
    && Number.isFinite(candidate.baselineOffset)
  )
}

function getAnchorRowIndex(row: number, rowStartBaselines: readonly number[]): number {
  if (rowStartBaselines.length === 0) return 0
  return Math.max(0, findNearestAxisIndex(Array.from(rowStartBaselines), row))
}

export function toTextBlockPosition(
  value: TextBlockPosition | ModulePosition,
  rowStartBaselines: readonly number[],
): TextBlockPosition {
  if (isTextBlockPosition(value)) {
    return {
      column: normalizeColumnIndex(value.column),
      row: normalizeRowIndex(value.row),
      baselineOffset: normalizeFiniteNumber(value.baselineOffset),
    }
  }

  const anchorRowIndex = getAnchorRowIndex(value.row, rowStartBaselines)
  const anchorRowStart = rowStartBaselines[anchorRowIndex] ?? 0
  return {
    column: normalizeColumnIndex(value.col),
    row: anchorRowIndex,
    baselineOffset: normalizeFiniteNumber(value.row - anchorRowStart),
  }
}

export function toAbsoluteTextBlockPosition(
  position: TextBlockPosition,
  rowStartBaselines: readonly number[],
): ModulePosition {
  const rowIndex = rowStartBaselines.length > 0
    ? Math.max(0, Math.min(rowStartBaselines.length - 1, normalizeRowIndex(position.row)))
    : 0
  const rowStart = rowStartBaselines[rowIndex] ?? 0
  return {
    col: normalizeColumnIndex(position.column),
    row: rowStart + normalizeFiniteNumber(position.baselineOffset),
  }
}

export function mapTextBlockPositionsToAbsolute<Key extends string>(
  positions: Partial<Record<Key, TextBlockPosition | ModulePosition>>,
  rowStartBaselines: readonly number[],
): Partial<Record<Key, ModulePosition>> {
  const next: Partial<Record<Key, ModulePosition>> = {}
  for (const rawKey of Object.keys(positions) as Key[]) {
    const rawPosition = positions[rawKey]
    if (!rawPosition) continue
    next[rawKey] = toAbsoluteTextBlockPosition(
      toTextBlockPosition(rawPosition, rowStartBaselines),
      rowStartBaselines,
    )
  }
  return next
}

export function mapAbsolutePositionsToTextBlockPositions<Key extends string>(
  positions: Partial<Record<Key, ModulePosition>>,
  rowStartBaselines: readonly number[],
): Partial<Record<Key, TextBlockPosition>> {
  const next: Partial<Record<Key, TextBlockPosition>> = {}
  for (const rawKey of Object.keys(positions) as Key[]) {
    const rawPosition = positions[rawKey]
    if (!rawPosition) continue
    next[rawKey] = toTextBlockPosition(rawPosition, rowStartBaselines)
  }
  return next
}
