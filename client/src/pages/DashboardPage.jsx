import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, LayoutDashboard, LogOut, ShieldCheck, ThumbsUp, Unplug } from 'lucide-react'
import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/common/Button.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import YouTubeDataPanel from '../components/dashboard/YouTubeDataPanel.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { apiError } from '../services/api.js'
import { googleLoginUrl, youtubeConnectUrl } from '../services/authService.js'
import { startRoast } from '../services/roastService.js'

export default function DashboardPage() {
  const { user, youtube, logout, disconnect } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  async function handleLogout() {
    setBusy('logout')
    setError(null)
    try {
      await logout()
    } catch (err) {
      setError(apiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  async function handleDisconnect() {
    setBusy('disconnect')
    setError(null)
    try {
      await disconnect()
    } catch (err) {
      setError(apiError(err).message)
    } finally {
      setBusy(null)
    }
  }

  async function handleGenerate() {
    setBusy('roast')
    setError(null)
    try {
      const job = await startRoast()
      navigate(`/roast?job=${job.id}`)
    } catch (err) {
      setError(apiError(err).message)
      setBusy(null)
    }
  }

  const connected = Boolean(youtube?.connected)

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar ctaHref={googleLoginUrl()} />

      <main className="flex-1 py-10">
        <PageContainer>
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-accent-600 uppercase">
            <LayoutDashboard className="size-3.5" aria-hidden="true" />
            Dashboard
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
            Hey {user?.displayName?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Review your connection, then generate a roast from the YouTube data
            you choose to share.
          </p>

          {error && <ErrorMessage className="mt-6" message={error} />}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <ThumbsUp className="size-4 text-accent-500" aria-hidden="true" />
                YouTube connection
              </h2>
              <p className="mt-3 text-sm text-muted">
                {connected
                  ? 'YouTube data access is connected. You can disconnect at any time.'
                  : 'YouTube data access is not connected yet. Connecting lets RoastTube read your likes, subscriptions, and playlists.'}
              </p>
              <div className="mt-4">
                {connected ? (
                  <Button
                    variant="secondary"
                    onClick={handleDisconnect}
                    disabled={busy !== null}
                  >
                    <Unplug className="size-4" aria-hidden="true" />
                    {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect YouTube'}
                  </Button>
                ) : (
                  <Button as="a" href={youtubeConnectUrl()}>
                    Connect YouTube
                  </Button>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-ink">Your account</h2>
              <div className="mt-3 flex items-center gap-3">
                {user?.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="size-10 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {user?.displayName}
                  </p>
                  <p className="truncate text-xs text-muted">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={handleLogout}
                disabled={busy !== null}
              >
                <LogOut className="size-4" aria-hidden="true" />
                {busy === 'logout' ? 'Signing out…' : 'Sign out'}
              </Button>
            </section>
          </div>

          <YouTubeDataPanel connected={connected} />

          <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Flame className="size-4 text-accent-500" aria-hidden="true" />
              Generate your roast
            </h2>
            <p className="mt-3 text-sm text-muted">
              {connected
                ? 'We will analyze the accessible data above and write a playful, personalized report.'
                : 'Connect YouTube first so we have something to roast.'}
            </p>
            <div className="mt-4">
              {connected ? (
                <Button onClick={handleGenerate} disabled={busy !== null}>
                  <Flame className="size-4" aria-hidden="true" />
                  {busy === 'roast' ? 'Starting…' : 'Roast me'}
                </Button>
              ) : (
                <Button as="a" href={youtubeConnectUrl()}>
                  Connect YouTube
                </Button>
              )}
            </div>
          </section>

          <p className="mt-6 flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent-500" aria-hidden="true" />
            RoastTube stores report metadata, not your raw viewing data, and
            never exposes your Google tokens to the browser.
          </p>
        </PageContainer>
      </main>

      <Footer />
    </div>
  )
}
