import { useCallback, useEffect, useState } from 'react'
import {
  disconnectYouTube,
  fetchMe,
  googleLoginUrl,
  logout as logoutRequest,
} from '../services/authService.js'
import { apiError } from '../services/api.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    youtube: null,
    error: null,
  })

  const loadSession = useCallback(async () => {
    try {
      const data = await fetchMe()
      return {
        user: data.authenticated ? data.user : null,
        youtube: data.youtube,
        error: null,
      }
    } catch (error) {
      return { user: null, youtube: null, error: apiError(error) }
    }
  }, [])

  const refresh = useCallback(async () => {
    const next = { status: 'ready', ...(await loadSession()) }
    setState(next)
    return next
  }, [loadSession])

  useEffect(() => {
    let active = true
    loadSession().then((result) => {
      if (active) setState({ status: 'ready', ...result })
    })
    return () => {
      active = false
    }
  }, [loadSession])

  const login = useCallback(() => {
    window.location.assign(googleLoginUrl())
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    await refresh()
  }, [refresh])

  const disconnect = useCallback(async () => {
    const data = await disconnectYouTube()
    await refresh()
    return data
  }, [refresh])

  const value = { ...state, refresh, login, logout, disconnect }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
