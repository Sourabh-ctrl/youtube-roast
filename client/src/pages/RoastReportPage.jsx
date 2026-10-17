import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Flame, RefreshCw, Trash2 } from 'lucide-react'
import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/common/Button.jsx'
import Loader from '../components/common/Loader.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import ScoreCard from '../components/roast/ScoreCard.jsx'
import PersonalityCard from '../components/roast/PersonalityCard.jsx'
import CategoryBreakdown from '../components/roast/CategoryBreakdown.jsx'
import AnalysisSummary from '../components/roast/AnalysisSummary.jsx'
import RedFlagsList from '../components/roast/RedFlagsList.jsx'
import RoastCard from '../components/roast/RoastCard.jsx'
import ShareReport from '../components/roast/ShareReport.jsx'
import { apiError } from '../services/api.js'
import { fetchReport, removeReport, startRoast } from '../services/roastService.js'

export default function RoastReportPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', report: null, error: null })
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    setState({ status: 'loading', report: null, error: null })
    try {
      const data = await fetchReport(id)
      setState({ status: 'ready', report: data.report, error: null })
    } catch (error) {
      setState({ status: 'error', report: null, error: apiError(error) })
    }
  }, [id])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) load()
    })
    return () => {
      active = false
    }
  }, [load])

  async function handleDelete() {
    setBusy('delete')
    try {
      await removeReport(id)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setState((prev) => ({ ...prev, error: apiError(error), status: 'error' }))
      setBusy(null)
    }
  }

  async function handleRoastAgain() {
    setBusy('again')
    setState((prev) => ({ ...prev, error: null }))
    try {
      const job = await startRoast()
      navigate(`/roast?job=${job.id}`)
    } catch (error) {
      setState((prev) => ({ ...prev, error: apiError(error), status: 'error' }))
      setBusy(null)
    }
  }

  const { status, report, error } = state

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar ctaHref="/" />

      <main className="flex-1 py-10">
        <PageContainer>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button as={Link} to="/dashboard" variant="ghost" size="sm">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRoastAgain}
                disabled={busy !== null}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                {busy === 'again' ? 'Starting…' : 'Roast me again'}
              </Button>
              {report && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={busy !== null}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  {busy === 'delete' ? 'Deleting…' : 'Delete report'}
                </Button>
              )}
            </div>
          </div>

          {status === 'loading' && <Loader className="py-20" label="Loading your report…" />}

          {status === 'error' && (
            <ErrorMessage
              className="mt-8 max-w-xl"
              message={error?.message}
              onRetry={load}
            />
          )}

          {status === 'ready' && report && (
            <>
              <div className="mt-8 flex items-center gap-2 text-xs font-medium tracking-wide text-accent-600 uppercase">
                <Flame className="size-3.5" aria-hidden="true" />
                Your roast report
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
                The verdict is in
              </h1>
              {report.provenance?.generatedAt && (
                <p className="mt-2 text-sm text-muted">
                  Generated {new Date(report.provenance.generatedAt).toLocaleString()} from{' '}
                  {report.provenance.sampledRecords} records you shared
                  {report.provenance.model ? ` · ${report.provenance.model}` : ''}.
                </p>
              )}

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <ScoreCard report={report} />
                <PersonalityCard report={report} />
                <CategoryBreakdown report={report} />
                <RedFlagsList report={report} />
                <div className="lg:col-span-2">
                  <RoastCard report={report} />
                </div>
                <div className="lg:col-span-2">
                  <AnalysisSummary report={report} />
                </div>
                <div className="lg:col-span-2">
                  <ShareReport report={report} />
                </div>
              </div>

              <p className="mt-6 text-xs text-muted">{report.disclaimer}</p>
            </>
          )}
        </PageContainer>
      </main>

      <Footer />
    </div>
  )
}
