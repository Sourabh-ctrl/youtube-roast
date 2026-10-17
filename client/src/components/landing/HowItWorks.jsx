import { Cookie, LayoutDashboard, Sparkles, ThumbsUp } from 'lucide-react'
import PageContainer from '../layout/PageContainer.jsx'

const steps = [
  {
    icon: ThumbsUp,
    title: 'Sign in with Google',
    description:
      'Authorize only the YouTube permissions you are comfortable with.',
  },
  {
    icon: Cookie,
    title: 'We fetch what you share',
    description:
      'Accessible likes, subscriptions, and playlists — never your full watch history.',
  },
  {
    icon: Sparkles,
    title: 'AI writes the roast',
    description:
      'Your metadata becomes a personalized, playful roast with a Brain Rot Score.',
  },
  {
    icon: LayoutDashboard,
    title: 'Read, share, delete',
    description:
      'Save your report, share a summary, or delete everything in one click.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-line bg-surface py-16 sm:py-20">
      <PageContainer>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-base text-muted">
            Four steps, one honest (and slightly insulting) report.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <li
                key={step.title}
                className="rounded-2xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent-50 text-accent-500">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-semibold text-muted">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </li>
            )
          })}
        </ol>
      </PageContainer>
    </section>
  )
}
