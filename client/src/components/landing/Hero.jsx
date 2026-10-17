import { ArrowRight, Flame } from 'lucide-react'
import Button from '../common/Button.jsx'
import PageContainer from '../layout/PageContainer.jsx'

export default function Hero({ ctaHref }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-accent-50 to-transparent"
      />
      <PageContainer className="relative flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700">
          <Flame className="size-3.5" aria-hidden="true" />
          AI-powered YouTube roast
        </span>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Your YouTube history.{' '}
          <span className="text-accent-500">Our honest opinion.</span>
        </h1>

        <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          RoastTube looks at the YouTube content you have actually shared with
          us — likes, subscriptions, playlists — and turns it into a brutally
          honest, playful roast, complete with a Brain Rot Score and red flags.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button as="a" href={ctaHref} size="lg" className="group">
            Get roasted
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Button>
          <Button as="a" href="#report-preview" variant="secondary" size="lg">
            See a sample report
          </Button>
        </div>

        <p className="text-xs text-muted">
          Sign in with Google. You choose what we can see. Disconnect anytime.
        </p>
      </PageContainer>
    </section>
  )
}
