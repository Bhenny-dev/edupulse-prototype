import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ContentStoreProvider } from './context/ContentStoreContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Syllabus from './pages/Syllabus'
import Courseware from './pages/Courseware'
import Assessment from './pages/Assessment'
import Performance from './pages/Performance'
import Records from './pages/Records'
import CourseLoading from './pages/CourseLoading'
import MonitorProgress from './pages/MonitorProgress'
import StudentMonitoring from './pages/StudentMonitoring'
import Settings from './pages/Settings'
import NotificationCenter from './pages/Notifications'
import HelpSupport from './pages/HelpSupport'
import ContentEditor from './pages/ContentEditor'
import NotFound from './pages/NotFound'
import ServerError from './pages/ServerError'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

// Route list follows docs/FLOW_SPEC.md (the source of truth for the business
// flow) — one route per station in the flow, per role. There is no in-system
// Dean review route: the syllabus signatory chain (Dean → CAO → EVP) happens
// OUTSIDE the system on the downloaded file. Do not add a route without a
// corresponding step in the flow.
function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="skip-to-content"
      tabIndex={0}
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/500" element={<ServerError />} />
      <Route
        element={
          <ProtectedRoute>
            <SkipToContent />
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/syllabus" element={<ProtectedRoute allowedRoles={['instructor']}><Syllabus /></ProtectedRoute>} />
        <Route path="/courseware" element={<Courseware />} />
        <Route path="/assessment" element={<ProtectedRoute allowedRoles={['student']}><Assessment /></ProtectedRoute>} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/records" element={<ProtectedRoute allowedRoles={['admin']}><Records /></ProtectedRoute>} />
        {/* Old bookmark — Curriculum was absorbed into Records (Phase 0 intake). */}
        <Route path="/curriculum" element={<Navigate to="/records" replace />} />
        <Route path="/course-loading" element={<ProtectedRoute allowedRoles={['admin']}><CourseLoading /></ProtectedRoute>} />
        <Route path="/monitor" element={<ProtectedRoute allowedRoles={['admin']}><MonitorProgress /></ProtectedRoute>} />
        <Route path="/student-monitoring" element={<ProtectedRoute allowedRoles={['instructor']}><StudentMonitoring /></ProtectedRoute>} />
        <Route path="/scoring-sheet" element={<ProtectedRoute allowedRoles={['instructor']}><StudentMonitoring /></ProtectedRoute>} />
        <Route path="/content-editor/:itemId?" element={<ProtectedRoute allowedRoles={['instructor']}><ContentEditor /></ProtectedRoute>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<NotificationCenter />} />
        <Route path="/help" element={<HelpSupport />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <ContentStoreProvider>
              <AppRoutes />
            </ContentStoreProvider>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  )
}
