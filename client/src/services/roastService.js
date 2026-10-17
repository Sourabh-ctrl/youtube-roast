import { api } from './api.js'

export async function startRoast() {
  const { data } = await api.post('/api/roasts')
  return data.job
}

export async function fetchRoastJob(jobId) {
  const { data } = await api.get(`/api/roasts/jobs/${jobId}`)
  return data.job
}

export async function fetchReport(id) {
  const { data } = await api.get(`/api/roasts/${id}`)
  return data
}

export async function fetchHistory() {
  const { data } = await api.get('/api/roasts/history')
  return data.reports
}

export async function removeReport(id) {
  const { data } = await api.delete(`/api/roasts/${id}`)
  return data
}
