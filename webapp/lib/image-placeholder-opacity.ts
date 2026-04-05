export const DEFAULT_IMAGE_PLACEHOLDER_OPACITY = 0.92

export function clampImagePlaceholderOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_IMAGE_PLACEHOLDER_OPACITY
  return Math.max(0, Math.min(1, value))
}

export function normalizeImagePlaceholderOpacity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_IMAGE_PLACEHOLDER_OPACITY
  }
  return clampImagePlaceholderOpacity(value)
}

export function clampTransparencyPercent(value: number): number {
  if (!Number.isFinite(value)) return opacityToTransparencyPercent(DEFAULT_IMAGE_PLACEHOLDER_OPACITY)
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function opacityToTransparencyPercent(opacity: number): number {
  return clampTransparencyPercent((1 - clampImagePlaceholderOpacity(opacity)) * 100)
}

export function transparencyPercentToOpacity(percent: number): number {
  return clampImagePlaceholderOpacity(1 - clampTransparencyPercent(percent) / 100)
}
