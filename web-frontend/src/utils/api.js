import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截器
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// API 方法
export const eventAPI = {
  list: (status) => api.get('/events', { params: { status } }),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  close: (id) => api.post(`/events/${id}/close`),
  archive: (id) => api.post(`/events/${id}/archive`),
  getMembers: (id) => api.get(`/events/${id}/members`),
  addMember: (id, userId, role) => api.post(`/events/${id}/members`, { userId, role }),
  removeMember: (id, userId) => api.delete(`/events/${id}/members/${userId}`)
}

export const materialAPI = {
  listByEvent: (eventId, since) => api.get(`/materials/event/${eventId}`, { params: { since } }),
  get: (id) => api.get(`/materials/${id}`),
  create: (data) => api.post('/materials', data),
  updateVoiceText: (id, text) => api.put(`/materials/${id}/voice-text`, { text }),
  updateOcrText: (id, text) => api.put(`/materials/${id}/ocr-text`, { text }),
  delete: (id) => api.delete(`/materials/${id}`)
}

export const reportAPI = {
  listByEvent: (eventId) => api.get(`/reports/event/${eventId}`),
  getLatest: (eventId, finalOnly) => api.get(`/reports/event/${eventId}/latest`, { params: { final: finalOnly } }),
  get: (id) => api.get(`/reports/${id}`),
  generate: (eventId) => api.post(`/reports/generate/${eventId}`),
  finalize: (id, reviewerId) => api.post(`/reports/${id}/finalize`, { reviewerId })
}

export const userAPI = {
  list: () => api.get('/users'),
  get: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
}

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  changePassword: (oldPassword, newPassword) => api.put('/auth/password', { oldPassword, newPassword }),
  register: (data) => api.post('/auth/register', data)
}

export const templateAPI = {
  list: () => api.get('/templates'),
  getDefault: () => api.get('/templates/default'),
  create: (data) => api.post('/templates', data),
  setDefault: (id) => api.post(`/templates/${id}/default`)
}
