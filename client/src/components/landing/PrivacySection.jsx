import { Lock, Trash2, Unplug } from 'lucide-react'
import PageContainer from '../layout/PageContainer.jsx'

const points = [
  {
    icon: Lock,
    title: 'What we access',
    description:
      'Only the YouTube permissions you approve — for example your channel info, subscriptions, likes, and playlists. We do not and cannot fetch your complete watch history.',
  },
  {
    icon: Trash2,
    title: 'What we store',
    description:
      'Minimal report metadata and your basic profile. Raw video lists and OAuth tokens are processed for the roast, then discarded — not kept in your profile.',
  },
  {
    icon: Unplug,
    title: 'What you control',
    description:
      'Disconnect YouTube and delete saved reports at any time. Signing in never gives us permission to share anything on your behalf.',
  },
]

export default function PrivacySection() {
  return (
    <section id="privacy" className="scroll-mt-20 border-b border-line bg-surface py-16 sm:py-20">
      <PageContainer>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Your data, your rules
          </h2>
          <p className="mt-3 text-base text-muted">
            A roast is only fun if you trust the roaster.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {points.map((point) => {
            const Icon = point.icon
            return (
              <article
                key={point.title}
                className="rounded-2xl border border-line bg-white p-6 shadow-sm"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent-50 text-accent-500">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {point.description}
                </p>
              </article>
            )
          })}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted">
          RoastTube is entertainment. It does not provide scientific
          psychological assessments, and no report should be taken as a
          diagnosis or a statement of fact about you.
        </p>
      </PageContainer>
    </section>
  )
}
