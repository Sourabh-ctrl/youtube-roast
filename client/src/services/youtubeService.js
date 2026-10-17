import { api } from './api.js'

export async function fetchYouTubeStatus() {
  const { data } = await api.get('/api/youtube/status')
  return data
}

export async function fetchDataAvailability({ refresh = false } = {}) {
  const { data } = await api.get('/api/youtube/data-availability', {
    params: refresh ? { refresh: '1' } : undefined,
  })
  return data
}

export async function fetchPreview({ refresh = false } = {}) {
  const { data } = await api.get('/api/youtube/preview', {
    params: refresh ? { refresh: '1' } : undefined,
  })
  return data
}
