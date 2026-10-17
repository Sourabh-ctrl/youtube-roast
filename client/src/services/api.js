import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
})

export function apiError(error) {
  const payload = error?.response?.data?.error
  if (payload?.code) return { code: payload.code, message: payload.message }

  if (error?.code === 'ECONNABORTED') {
    return { code: 'TIMEOUT', message: 'The request timed out. Please try again.' }
  }

  return {
    code: 'NETWORK_ERROR',
    message: 'Could not reach the server. Please check your connection and try again.',
  }
}
