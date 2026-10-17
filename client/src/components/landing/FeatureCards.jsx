import { Eye, Flag, Lock, ShieldCheck } from 'lucide-react'
import PageContainer from '../layout/PageContainer.jsx'

const features = [
  {
    icon: Eye,
    title: 'Grounded in real data',
    description:
      'Every observation is based on the accessible metadata you authorized — not invented viewing habits.',
  },
  {
    icon: Flag,
    title: 'Red flags, done right',
    description:
      'Playful, personalized callouts about your content habits, backed by actual counts from your sample.',
  },
  {
    icon: Lock,
    title: 'Privacy-conscious by design',
    description:
      'We store report metadata, not raw viewing data or OAuth tokens. Delete your reports anytime.',
  },
  {
    icon: ShieldCheck,
    title: 'Entertainment, not diagnosis',
    description:
      'The Brain Rot Score is an AI-generated entertainment score — clearly labeled, never presented as science.',
  },
]

export default function FeatureCards() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-line bg-white py-16 sm:py-20">
      <PageContainer>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            What you get
          </h2>
          <p className="mt-3 text-base text-muted">
            A structured roast report you can actually read — and share.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-line bg-surface p-6 transition-shadow hover:shadow-md"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent-500 text-white">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </article>
            )
          })}
        </div>
      </PageContainer>
    </section>
  )
}
