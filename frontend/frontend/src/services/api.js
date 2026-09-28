const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', params, accessToken } = {}) {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (params) Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))

  let response
  try {
    response = await fetch(url, {
      method,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
  } catch {
    throw new ApiError(0, 'Unable to reach the authentication service. Check that the backend is running and allows this frontend origin.')
  }
  let body = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const detail = typeof body?.detail === 'string' ? body.detail : 'Unable to complete the request.'
    throw new ApiError(response.status, detail)
  }
  return body
}

export { ApiError, request }