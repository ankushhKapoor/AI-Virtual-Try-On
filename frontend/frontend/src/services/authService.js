import { request } from './api'

function registerUser({ name, email, password }) {
  return request('/auth/register', { method: 'POST', params: { name, email, password } })
}

function loginUser({ email, password }) {
  return request('/auth/login', { method: 'POST', params: { email, password } })
}

function loginAdmin({ email, password }) {
  return request('/admin/login', { method: 'POST', params: { email, password } })
}

function getCurrentUser(accessToken) {
  return request('/users/me', { accessToken })
}

export { getCurrentUser, loginAdmin, loginUser, registerUser }