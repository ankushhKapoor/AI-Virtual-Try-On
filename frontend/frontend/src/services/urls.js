export const API_BASE_URL = '/api'
export const MODEL_BASE_URL = '/model'

export function apiUrl(path = '') {
  return `${API_BASE_URL}${path.startsWith('/') || !path ? path : `/${path}`}`
}

function isLocalServiceHost(hostname) {
  return hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '::1' ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
}

/** Resolve backend-generated paths through the same-origin dev proxy. */
export function resolveBackendUrl(value) {
  if (typeof value !== 'string' || !value || /^(data:|blob:|https?:\/\/)/i.test(value) && !isLocalAbsoluteUrl(value)) {
    return value
  }

  if (value.startsWith('//')) return value
  if (value.startsWith('/')) {
    return normalizeLocalPath(value, false)
  }

  if (isLocalAbsoluteUrl(value)) {
    const url = new URL(value)
    return normalizeLocalPath(`${url.pathname}${url.search}${url.hash}`, true)
  }

  return value
}

function normalizeLocalPath(path, forceBackend) {
  if (/^\/(assets|src|@vite|@fs|@id)(\/|$)/.test(path) || path === '/favicon.ico') {
    return path
  }
  if (path === API_BASE_URL || path.startsWith(`${API_BASE_URL}/`) ||
      path === MODEL_BASE_URL || path.startsWith(`${MODEL_BASE_URL}/`)) {
    return path
  }
  if (forceBackend || /^\/(image-proxy|uploads|static|media|generated|files)(\/|\?|#|$)/.test(path)) {
    return apiUrl(path)
  }
  return path
}

function isLocalAbsoluteUrl(value) {
  try {
    const url = new URL(value)
    return /^https?:$/.test(url.protocol) && isLocalServiceHost(url.hostname)
  } catch {
    return false
  }
}
