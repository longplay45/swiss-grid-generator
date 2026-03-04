type FlagMap<Key extends string> = Partial<Record<Key, boolean>>

function isBodyOrCaptionStyle(styleKey: string): boolean {
  return styleKey === "body" || styleKey === "caption"
}

export function resolveSyllableDivisionEnabled<Key extends string>(
  key: Key,
  styleKey: string,
  blockSyllableDivision: FlagMap<Key>,
): boolean {
  const override = blockSyllableDivision[key]
  if (override === true || override === false) return override
  return isBodyOrCaptionStyle(styleKey)
}

export function resolveTextReflowEnabled<Key extends string>(
  key: Key,
  styleKey: string,
  span: number,
  blockTextReflow: FlagMap<Key>,
): boolean {
  const override = blockTextReflow[key]
  const enabled = (override === true || override === false)
    ? override
    : isBodyOrCaptionStyle(styleKey)
  return enabled && span > 1
}
