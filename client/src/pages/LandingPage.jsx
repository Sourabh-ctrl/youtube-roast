import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'
import PageContainer from '../components/layout/PageContainer.jsx'
import Hero from '../components/landing/Hero.jsx'
import HowItWorks from '../components/landing/HowItWorks.jsx'
import FeatureCards from '../components/landing/FeatureCards.jsx'
import PrivacySection from '../components/landing/PrivacySection.jsx'
import ScoreCard from '../components/roast/ScoreCard.jsx'
import CategoryBreakdown from '../components/roast/CategoryBreakdown.jsx'
import PersonalityCard from '../components/roast/PersonalityCard.jsx'
import RedFlagsList from '../components/roast/RedFlagsList.jsx'
import RoastCard from '../components/roast/RoastCard.jsx'
import ShareReport from '../components/roast/ShareReport.jsx'
import { mockReport } from '../data/mockReport.js'

const ctaHref = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'}/auth/google`

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar ctaHref={ctaHref} />

      <main className="flex-1">
        <Hero ctaHref={ctaHref} />
        <HowItWorks />
        <FeatureCards />

        <section
          id="report-preview"
          className="scroll-mt-20 border-b border-line bg-surface py-16 sm:py-20"
        >
          <PageContainer>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                A taste of your report
              </h2>
              <p className="mt-3 text-base text-muted">
                Every report is generated from your own accessible YouTube
                metadata. This preview uses clearly labeled illustrative sample
                data.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
              <ScoreCard report={mockReport} illustrative />
              <PersonalityCard report={mockReport} illustrative />
              <CategoryBreakdown report={mockReport} illustrative />
              <RedFlagsList report={mockReport} illustrative />
              <div className="lg:col-span-2">
                <RoastCard report={mockReport} illustrative />
              </div>
              <div className="lg:col-span-2">
                <ShareReport report={mockReport} illustrative />
              </div>
            </div>
          </PageContainer>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <PageContainer className="flex flex-col items-center gap-6 text-center">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Ready to hear the truth?
            </h2>
            <p className="max-w-xl text-base text-muted">
              Connect your YouTube account and get a personalized, playful roast
              in under a minute.
            </p>
            <a
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-7 py-3 text-base font-medium text-white transition-colors hover:bg-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              Get roasted
            </a>
          </PageContainer>
        </section>

        <PrivacySection />
      </main>

      <Footer />
    </div>
  )
}
