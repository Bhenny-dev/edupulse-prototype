/** JSONB may reorder object keys. Array order and every actual value remain significant. */
export function jsonValue(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item)
}
