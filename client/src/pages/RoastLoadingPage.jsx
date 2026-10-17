import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Flame, LoaderCircle } from 'lucide-react'
import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import PageContainer from '../components/layout/PageContainer.jsx'
import Button from '../components/common/Button.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import { ROAST_STEPS, useRoast } from '../hooks/useRoast.js'

function StepRow({ step, index, activeIndex, running, complete }) {
  const done = complete || index < activeIndex
  const active = !complete && running && index === activeIndex

  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${
          done
            ? 'border-accent-500 bg-accent-500 text-white'
            : active
              ? 'border-accent-500 text-accent-600'
              : 'border-line text-muted'
        }`}
      >
        {done ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : active ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          index + 1
        )}
      </span>
      <div>
        <p className={`text-sm font-medium ${done || active ? 'text-ink' : 'text-muted'}`}>
          {step.label}
        </p>
        <p className="text-xs text-muted">{step.detail}</p>
      </div>
    </li>
  )
}

export default function RoastLoadingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('job')
  const { status, reportId, error, activeIndex, retry } = useRoast(jobId)

  useEffect(() => {
    if (status === 'ready' && reportId) {
      navigate(`/roast/${reportId}`, { replace: true })
    }
  }, [navigate, reportId, status])

  const running = status === 'running'

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar ctaHref="/" />

      <main className="flex-1 py-10">
        <PageContainer className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-accent-600 uppercase">
            <Flame className="size-3.5" aria-hidden="true" />
            Roasting in progress
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
            Reading your YouTube taste
          </h1>
          <p className="mt-2 text-sm text-muted">
            We only look at the data you connected. This usually takes a few
            seconds.
          </p>

          <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
            {status === 'error' ? (
              <ErrorMessage message={error} onRetry={jobId ? retry : undefined} />
            ) : (
              <ol className="space-y-5">
                {ROAST_STEPS.map((step, index) => (
                  <StepRow
                    key={step.stage}
                    step={step}
                    index={index}
                    activeIndex={activeIndex}
                    running={running}
                    complete={status === 'ready'}
                  />
                ))}
              </ol>
            )}

            <Button as={Link} to="/dashboard" variant="ghost" className="mt-4">
              Back to dashboard
            </Button>
          </div>
        </PageContainer>
      </main>

      <Footer />
    </div>
  )
}
