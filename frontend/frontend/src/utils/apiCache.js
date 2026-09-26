/**
 * apiCache.js
 * -----------
 * Shared browser-side cache for the AI Virtual Try-On frontend.
 *
 * Features
 *   - In-memory Map  (fastest, survives React re-renders)
 *   - sessionStorage  (survives page refresh in the same tab)
 *   - Configurable TTL per request
 *   - Automatic expiry check on every read
 *   - In-flight request deduplication
 *     (concurrent callers for the same URL share one network request)
 *   - All storage errors are silently ignored
 *   - Failed requests are never cached
 *
 * Usage
 *   import { fetchJsonWithCache, TTL_PRODUCT, TTL_SEARCH, clearApiCache } from '../utils/apiCache'
 *   const data = await fetchJsonWithCache(url, { ttl: TTL_SEARCH })
 */

// ---------------------------------------------------------------------------
// TTL constants (milliseconds)
// ---------------------------------------------------------------------------

/** 1 hour  – for /products */
export const TTL_PRODUCT = 60 * 60 * 1000

/** 30 minutes – for /search */
export const TTL_SEARCH = 30 * 60 * 1000

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const _STORAGE_PREFIX = '__aivto_cache__:'

/** In-memory store:  url → { data, expiresAt } */
const _mem = new Map()

/** In-flight promises:  url → Promise<data> */
const _inFlight = new Map()

// ---------------------------------------------------------------------------
// sessionStorage helpers  (all wrapped in try/catch)
// ---------------------------------------------------------------------------

function _storageGet(url) {
  try {
    const raw = sessionStorage.getItem(_STORAGE_PREFIX + url)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed.expiresAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function _storageSet(url, data, expiresAt) {
  try {
    sessionStorage.setItem(
      _STORAGE_PREFIX + url,
      JSON.stringify({ data, expiresAt })
    )
  } catch {
    // Quota exceeded or private mode — ignore
  }
}

function _storageRemove(url) {
  try {
    sessionStorage.removeItem(_STORAGE_PREFIX + url)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Cache read / write
// ---------------------------------------------------------------------------

function _read(url) {
  const now = Date.now()

  // 1. Memory (fastest)
  const memEntry = _mem.get(url)
  if (memEntry) {
    if (now < memEntry.expiresAt) return memEntry.data
    _mem.delete(url)
    _storageRemove(url)
    return null
  }

  // 2. sessionStorage (survives refresh)
  const stored = _storageGet(url)
  if (!stored) return null
  if (now >= stored.expiresAt) {
    _storageRemove(url)
    return null
  }

  // Warm memory from sessionStorage
  _mem.set(url, stored)
  return stored.data
}

function _write(url, data, ttl) {
  const expiresAt = Date.now() + ttl
  _mem.set(url, { data, expiresAt })
  _storageSet(url, data, expiresAt)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch *url* and return its parsed JSON, using the cache.
 *
 * @param {string} url             Full URL to request
 * @param {object} [opts]
 * @param {number} [opts.ttl]      Cache TTL in ms.  Default: TTL_SEARCH
 * @param {object} [opts.fetchOptions]  Passed directly to fetch()
 * @returns {Promise<any>}         The parsed JSON response
 * @throws  On non-2xx responses (same as a raw fetch that failed)
 */
export async function fetchJsonWithCache(url, opts = {}) {
  const { ttl = TTL_SEARCH, fetchOptions = {} } = opts

  // --- 1. Cache hit ---
  const cached = _read(url)
  if (cached !== null) return cached

  // --- 2. In-flight deduplication ---
  if (_inFlight.has(url)) {
    return _inFlight.get(url)
  }

  // --- 3. Real network request ---
  const promise = (async () => {
    const res = await fetch(url, fetchOptions)
    if (!res.ok) {
      // Throw so callers get the same error as a raw fetch
      const err = new Error(`HTTP ${res.status}`)
      err.status = res.status
      throw err
    }
    const data = await res.json()
    _write(url, data, ttl)   // only cache successful responses
    return data
  })()

  _inFlight.set(url, promise)

  try {
    return await promise
  } finally {
    _inFlight.delete(url)
  }
}

/**
 * Clear the browser-side cache.
 *
 * @param {string} [url]  If given, clears only that URL's entry.
 *                        If omitted, clears everything.
 *
 * Intended for development use only.
 */
export function clearApiCache(url) {
  if (url !== undefined) {
    _mem.delete(url)
    _storageRemove(url)
    return
  }
  _mem.clear()
  try {
    const keys = Object.keys(sessionStorage).filter(k =>
      k.startsWith(_STORAGE_PREFIX)
    )
    keys.forEach(k => sessionStorage.removeItem(k))
  } catch {
    // ignore
  }
}
