import { api } from './api.js'

export function googleLoginUrl() {
  return `${api.defaults.baseURL}/auth/google`
}

export function youtubeConnectUrl() {
  return `${api.defaults.baseURL}/auth/google/youtube`
}

export async function fetchMe() {
  const { data } = await api.get('/api/auth/me')
  return data
}

export async function logout() {
  const { data } = await api.post('/api/auth/logout')
  return data
}

export async function disconnectYouTube() {
  const { data } = await api.post('/api/auth/disconnect-youtube')
  return data
}
