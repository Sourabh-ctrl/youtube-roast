import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Loader from '../components/common/Loader.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import { useAuth } from '../hooks/useAuth.js'

const ERROR_MESSAGES = {
  oauth_cancelled: 'You cancelled the Google sign-in. No changes were made.',
  invalid_state: 'Your sign-in session expired or was tampered with. Please try again.',
  oauth_exchange_failed: 'Google could not confirm your sign-in. Please try again.',
  oauth_no_identity: 'Google did not share a verified identity. Please try again.',
  oauth_failed: 'We could not complete your sign-in. Please try again.',
}

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const oauthError = searchParams.get('error')
  const [message, setMessage] = useState(
    oauthError ? ERROR_MESSAGES[oauthError] : null,
  )

  useEffect(() => {
    if (oauthError) return

    let active = true
    refresh().then((result) => {
      if (!active) return
      if (result?.user) {
        navigate('/dashboard', { replace: true })
      } else {
        setMessage(result?.error?.message ?? 'We could not confirm your sign-in.')
      }
    })

    return () => {
      active = false
    }
  }, [navigate, oauthError, refresh])

  if (!message) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Loader label="Finishing sign-in…" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-ink">Could not sign you in</h1>
        <ErrorMessage
          className="mt-4"
          message={message}
          onRetry={() => navigate('/', { replace: true })}
          retryLabel="Back to home"
        />
      </div>
    </div>
  )
}
