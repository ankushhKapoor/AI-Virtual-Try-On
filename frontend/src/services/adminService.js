import { request } from './api'

function getAdminStatistics(accessToken) {
  return request('/admin/statistics', { accessToken })
}

function getAdminUsers(accessToken) {
  return request('/admin/users', { accessToken })
}

function getUserTryOnHistory(userId, accessToken) {
  return request(`/admin/users/${userId}/try-ons`, { accessToken })
}

// ──────────────────────────────────────────
// DWM Data Mining API Services
// ──────────────────────────────────────────

function getDwmStats(accessToken) {
  return request('/admin/dwm/stats', { accessToken })
}

function getDwmApriori(params = {}, accessToken) {
  const query = new URLSearchParams()
  if (params.source) query.set('source', params.source)
  if (params.category) query.set('category', params.category)
  if (params.search) query.set('search', params.search)
  if (params.min_confidence !== undefined && params.min_confidence !== null && params.min_confidence !== '') {
    query.set('min_confidence', params.min_confidence)
  }
  if (params.min_lift !== undefined && params.min_lift !== null && params.min_lift !== '') {
    query.set('min_lift', params.min_lift)
  }
  if (params.min_support !== undefined && params.min_support !== null && params.min_support !== '') {
    query.set('min_support', params.min_support)
  }
  const qs = query.toString() ? `?${query.toString()}` : ''
  return request(`/admin/dwm/apriori${qs}`, { accessToken })
}

function runDwmApriori(payload, accessToken) {
  return request('/admin/dwm/apriori/run', {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  })
}

function getDwmKMeans(params = {}, accessToken) {
  const query = new URLSearchParams()
  if (params.source) query.set('source', params.source)
  if (params.cluster_id !== undefined && params.cluster_id !== '') query.set('cluster_id', params.cluster_id)
  if (params.search) query.set('search', params.search)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return request(`/admin/dwm/kmeans${qs}`, { accessToken })
}

function runDwmKMeans(payload, accessToken) {
  return request('/admin/dwm/kmeans/run', {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  })
}

function getDwmCorrelations(params = {}, accessToken) {
  const query = new URLSearchParams()
  if (params.source) query.set('source', params.source)
  if (params.dimension) query.set('dimension', params.dimension)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return request(`/admin/dwm/correlations${qs}`, { accessToken })
}

function runDwmCorrelations(payload, accessToken) {
  return request('/admin/dwm/correlations/run', {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  })
}

function getDwmRollups(params = {}, accessToken) {
  const query = new URLSearchParams()
  if (params.period) query.set('period', params.period)
  if (params.source) query.set('source', params.source)
  if (params.limit) query.set('limit', params.limit)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return request(`/admin/dwm/rollups${qs}`, { accessToken })
}

function runDwmRollups(payload, accessToken) {
  return request('/admin/dwm/rollups/run', {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  })
}

export {
  getAdminStatistics,
  getAdminUsers,
  getUserTryOnHistory,
  getDwmStats,
  getDwmApriori,
  runDwmApriori,
  getDwmKMeans,
  runDwmKMeans,
  getDwmCorrelations,
  runDwmCorrelations,
  getDwmRollups,
  runDwmRollups,
}