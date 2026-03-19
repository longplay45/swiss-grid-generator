export function areLayerOrdersEqual<Key extends string>(
  current: readonly Key[],
  next: readonly Key[],
): boolean {
  if (current.length !== next.length) return false
  for (let index = 0; index < current.length; index += 1) {
    if (current[index] !== next[index]) return false
  }
  return true
}

export function reconcileLayerOrder<Key extends string>(
  current: readonly Key[],
  blockOrder: readonly Key[],
  imageOrder: readonly Key[],
): Key[] {
  const validKeys = new Set<Key>([...imageOrder, ...blockOrder])
  const next: Key[] = []
  const seen = new Set<Key>()

  for (const key of current) {
    if (!validKeys.has(key) || seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of imageOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const key of blockOrder) {
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  return next
}
