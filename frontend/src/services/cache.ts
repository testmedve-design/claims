type CacheEntry = {
  expiresAt: number
  value: any
}

const cache = new Map<string, CacheEntry>()

/**
 * Get cached value for a key or undefined if not present or expired
 */
export function getCached<T = any>(key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.value as T
}

/**
 * Set a key in cache with TTL in ms (default 5 minutes)
 */
export function setCached(key: string, value: any, ttl = 1000 * 60 * 5) {
  cache.set(key, { value, expiresAt: Date.now() + ttl })
}

/**
 * Clear cache for a key (or all if no key)
 */
export function clearCache(key?: string) {
  if (key) cache.delete(key)
  else cache.clear()
}
