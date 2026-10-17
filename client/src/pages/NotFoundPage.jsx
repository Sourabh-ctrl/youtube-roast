import { Link } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import PageContainer from '../components/layout/PageContainer.jsx'

export default function NotFoundPage() {
  return (
    <PageContainer className="flex min-h-screen flex-col items-center justify-center gap-5 text-center">
      <p className="text-6xl font-bold text-accent-500">404</p>
      <h1 className="text-2xl font-semibold text-ink">
        This page took a break from uploading
      </h1>
      <p className="max-w-md text-sm text-muted">
        The page you are looking for does not exist. Head back home and get
        roasted instead.
      </p>
      <Button as={Link} to="/">
        Back to home
      </Button>
    </PageContainer>
  )
}
