import { Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import AuthCallbackPage from './pages/AuthCallbackPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import RoastLoadingPage from './pages/RoastLoadingPage.jsx'
import RoastReportPage from './pages/RoastReportPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roast"
        element={
          <ProtectedRoute>
            <RoastLoadingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roast/:id"
        element={
          <ProtectedRoute>
            <RoastReportPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
