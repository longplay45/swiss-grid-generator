export function omitOptionalRecordKey<Key extends string, Value>(
  source: Partial<Record<Key, Value>> | undefined,
  key: string,
): Partial<Record<Key, Value>> {
  const next: Partial<Record<Key, Value>> = { ...(source ?? {}) }
  delete next[key as Key]
  return next
}

export function omitRequiredRecordKey<Key extends string, Value>(
  source: Record<Key, Value>,
  key: string,
): Record<Key, Value> {
  return omitOptionalRecordKey(source, key) as Record<Key, Value>
}
