export const PT_TO_MM = 0.352778  // 1 point = 0.352778 mm
export const PT_TO_PX = 96 / 72   // 1 point = 1.333... px (CSS pixels at 96ppi reference)

export function ptToMm(pt: number): number {
  return pt * PT_TO_MM
}

export function ptToPx(pt: number): number {
  return pt * PT_TO_PX
}

export function mmToPt(mm: number): number {
  return mm / PT_TO_MM
}

export function pxToPt(px: number): number {
  return px / PT_TO_PX
}

export function fromPt(valuePt: number, unit: "pt" | "mm" | "px"): number {
  if (unit === "mm") return ptToMm(valuePt)
  if (unit === "px") return ptToPx(valuePt)
  return valuePt
}

export function toPt(value: number, unit: "pt" | "mm" | "px"): number {
  if (unit === "mm") return mmToPt(value)
  if (unit === "px") return pxToPt(value)
  return value
}

export function formatValue(value: number, unit: "pt" | "mm" | "px"): string {
  return fromPt(value, unit).toFixed(3)
}
