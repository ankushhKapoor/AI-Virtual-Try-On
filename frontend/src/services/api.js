import { API_BASE_URL } from './urls'

class ApiError extends Error {
  constructor(status, message, code = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request(path, { method = 'GET', body, params, accessToken, headers = {} } = {}) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)
  if (params) Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const reqHeaders = { ...headers }
  if (accessToken) {
    reqHeaders['Authorization'] = `Bearer ${accessToken}`
  }

  let reqBody = undefined
  if (body !== undefined && body !== null) {
    if (typeof body === 'object' && !(body instanceof FormData)) {
      reqBody = JSON.stringify(body)
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json'
      }
    } else {
      reqBody = body
      if (typeof body === 'string' && !reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json'
      }
    }
  }

  let response
  try {
    response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: reqBody,
    })
  } catch {
    throw new ApiError(0, 'Unable to reach the backend service. Check that the backend is running and allows this frontend origin.')
  }

  let resBody = null
  try {
    resBody = await response.json()
  } catch {
    resBody = null
  }

  if (!response.ok) {
    let detail = 'Unable to complete the request.'
    let code = resBody?.code || null

    if (typeof resBody?.detail === 'string') {
      detail = resBody.detail
    } else if (resBody?.detail && typeof resBody.detail === 'object' && !Array.isArray(resBody.detail)) {
      detail = resBody.detail.detail || resBody.detail.message || JSON.stringify(resBody.detail)
      code = resBody.detail.code || code
    } else if (Array.isArray(resBody?.detail)) {
      detail = resBody.detail
        .map(err => {
          const field = Array.isArray(err.loc) ? err.loc.filter(l => l !== 'body').join('.') : ''
          return field ? `${field}: ${err.msg}` : err.msg || JSON.stringify(err)
        })
        .join('; ')
    } else if (typeof resBody?.message === 'string') {
      detail = resBody.message
    } else if (response.statusText) {
      detail = `Request failed: ${response.status} ${response.statusText}`
    }

    throw new ApiError(response.status, detail, code)
  }
  return resBody
}

export { ApiError, request }