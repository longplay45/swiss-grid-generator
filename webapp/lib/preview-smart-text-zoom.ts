type SmartTextZoomGeometryArgs = {
  target: string
  columns: number
  rows: number
  heightBaselines: number
}

export function buildSmartTextZoomGeometrySignature({
  target,
  columns,
  rows,
  heightBaselines,
}: SmartTextZoomGeometryArgs): string {
  return `${target}|${columns}|${rows}|${heightBaselines}`
}
