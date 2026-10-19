import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import PageContainer from '../components/layout/PageContainer.jsx'
import { googleLoginUrl } from '../services/authService.js'

const LAST_UPDATED = 'October 17, 2026'
const CONTACT_EMAIL = 'support@example.com'

const sections = [
  {
    title: 'Information we collect',
    points: [
      'Account details from Google when you sign in: your name, email address, and profile picture.',
      'YouTube data only if you connect it: channel information, subscriptions, liked videos, playlists, and playlist items, read through the YouTube Data API with the youtube.readonly scope.',
      'The roast report we generate for you, plus the aggregated analysis metadata it contains.',
      'A single essential session cookie that keeps you signed in.',
    ],
  },
  {
    title: 'What we do not collect',
    points: [
      'Your full YouTube watch history — Google does not expose it to third-party apps, so it cannot be read.',
      'Your raw video lists or the full dataset we analyze. Only report metadata is stored.',
      'Your Google OAuth tokens are never stored in your browser or in your profile.',
      'We do not sell your data and we do not use it for advertising.',
    ],
  },
  {
    title: 'How we use your information',
    points: [
      'To sign you in and keep your session active.',
      'To read only the YouTube data you explicitly authorize.',
      'To generate your roast report and store it for your history.',
      'To let you review, and delete, what we hold about you.',
    ],
  },
  {
    title: 'Third-party services',
    points: [
      'Google — sign-in and YouTube Data API access.',
      'Groq — generates the roast text. An aggregated summary of your data (not your raw video lists) is sent to the AI model.',
      'MongoDB Atlas — stores session data and report metadata.',
      'Vercel — hosts the application.',
    ],
  },
  {
    title: 'Data retention',
    points: [
      'Reports expire automatically 24 hours after they are created.',
      'Sessions expire after 7 days of inactivity.',
      'Your profile is kept until you delete your account.',
    ],
  },
  {
    title: 'Your choices',
    points: [
      'Delete any single report from your dashboard.',
      'Disconnect YouTube, which revokes our access and removes reports derived from it.',
      'Delete your account, which removes your profile and reports and revokes our Google access.',
    ],
  },
  {
    title: 'Cookies',
    points: [
      'We use one essential cookie to keep you signed in. It is HTTP-only and is not readable by scripts.',
      'We do not use advertising or third-party tracking cookies.',
    ],
  },
  {
    title: 'Children',
    points: ['RoastTube is not intended for children under 13.'],
  },
  {
    title: 'Changes to this policy',
    points: [
      'We may update this policy. The "last updated" date at the top reflects the latest revision.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar ctaHref={googleLoginUrl()} />

      <main className="flex-1 py-12 sm:py-16">
        <PageContainer className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted">Last updated: {LAST_UPDATED}</p>

          <p className="mt-6 text-sm leading-relaxed text-muted">
            RoastTube is an entertainment app that uses your Google account and,
            with your permission, your YouTube data to generate a playful roast
            report. This policy explains what we collect, how we use it, and the
            choices you have.
          </p>

          {sections.map((section) => (
            <section key={section.title} className="mt-8">
              <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ))}

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Contact</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Questions about this policy? Email us at{' '}
              <a className="text-accent-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </PageContainer>
      </main>

      <Footer />
    </div>
  )
}
