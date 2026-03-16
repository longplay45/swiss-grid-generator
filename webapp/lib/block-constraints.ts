export const ROTATION_MIN = -180
export const ROTATION_MAX = 180
export const ROTATION_EPSILON = 0.001

export const FX_SIZE_MIN = 1
export const FX_LEADING_MIN = 1
export const FX_LEADING_MAX = 800

export function clampRotation(value: number): number {
  return Math.max(ROTATION_MIN, Math.min(ROTATION_MAX, value))
}

export function hasSignificantRotation(value: number): boolean {
  return Math.abs(value) > ROTATION_EPSILON
}

export function clampFxSize(value: number): number {
  return Math.max(FX_SIZE_MIN, value)
}

export function clampFxLeading(value: number): number {
  return Math.max(FX_LEADING_MIN, Math.min(FX_LEADING_MAX, value))
}
