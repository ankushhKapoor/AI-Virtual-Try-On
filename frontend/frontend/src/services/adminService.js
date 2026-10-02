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

export { getAdminStatistics, getAdminUsers, getUserTryOnHistory }