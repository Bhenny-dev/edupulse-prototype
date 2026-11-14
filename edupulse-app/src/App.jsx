import { lazy, Suspense } from 'react'
import { SkeletonContent, Spinner } from './components/ui/LoadingFeedback'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ContentStoreProvider } from './context/ContentStoreContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { AcademicProvider } from './context/AcademicContext'
import { AIProvider } from './context/AIContext'
import { ThemeProvider } from './context/ThemeContext'
import SkipToContent from './components/ui/SkipToContent'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'
import ServerError from './pages/ServerError'
import { PERFORMANCE_ROLES } from './lib/access'

// The public pages, one themed room each, loaded when first opened.
// Signed-in pages and the legal pages load on demand, so a visitor's first page downloads only the
// public site.
const Layout = lazy(() => import('./components/layout/Layout'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Syllabus = lazy(() => import('./pages/SyllabusRedirect'))
const Courseware = lazy(() => import('./pages/Courseware'))
const Assessment = lazy(() => import('./pages/Assessment'))
const Performance = lazy(() => import('./pages/Performance'))
const Records = lazy(() => import('./pages/Records'))
const CourseLoading = lazy(() => import('./pages/CourseLoading'))
const AcademicPortal = lazy(() => import('./components/academic/AcademicPortal'))
const MonitorProgress = lazy(() => import('./pages/MonitorProgress'))
const StudentMonitoring = lazy(() => import('./pages/StudentMonitoring'))
const Settings = lazy(() => import('./pages/Settings'))
const NotificationCenter = lazy(() => import('./pages/Notifications'))
const ContentEditor = lazy(() => import('./pages/ContentEditor'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const FeaturesPage = lazy(() => import('./pages/public/FeaturesPage'))
const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage'))
const RolesPage = lazy(() => import('./pages/public/RolesPage'))
const PulsePage = lazy(() => import('./pages/public/PulsePage'))
const ImpactPage = lazy(() => import('./pages/public/ImpactPage'))
const CollegesPage = lazy(() => import('./pages/public/CollegesPage'))
const PlayPage = lazy(() => import('./pages/public/PlayPage'))
const FaqPage = lazy(() => import('./pages/public/FaqPage'))
const publicPage = Page => <Suspense fallback={<div className="public-loading" role="status"><Spinner /> Opening the room…</div>}><Page /></Suspense>

// The system admin has a dedicated console. Academic management belongs to
// the separately authenticated Dean and Program Coordinator roles.
function ProtectedRoute({ children, allowedRoles }) {
  const { user, authLoading, authRestoreError, retryRestoration, returnToAdmin, canReturnToAdmin, logout } = useAuth()
  if (authLoading) return (
    <div className="session-loading">
      {authRestoreError ? (
        <section role="alert" className="card session-recovery">
          <h1>Could not restore your view</h1>
          <p>{authRestoreError}</p>
          <div className="flex flex-wrap gap-12">
            <button className="btn btn-primary" onClick={retryRestoration}>Retry restoring view</button>
            {canReturnToAdmin ? (
              <button className="btn btn-secondary" onClick={() => { if (returnToAdmin()) window.location.hash = '/dashboard' }}>Return to System Admin</button>
            ) : <button className="btn btn-secondary" onClick={logout}>Sign out</button>}
          </div>
        </section>
      ) : <SkeletonContent label="Restoring your session…" variant="page" />}
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/features" element={publicPage(FeaturesPage)} />
      <Route path="/how-it-works" element={publicPage(HowItWorksPage)} />
      <Route path="/roles" element={publicPage(RolesPage)} />
      <Route path="/pulse" element={publicPage(PulsePage)} />
      <Route path="/impact" element={publicPage(ImpactPage)} />
      <Route path="/colleges" element={publicPage(CollegesPage)} />
      <Route path="/play" element={publicPage(PlayPage)} />
      <Route path="/faq" element={publicPage(FaqPage)} />
      <Route path="/privacy" element={publicPage(Privacy)} />
      <Route path="/terms" element={publicPage(Terms)} />
      <Route path="/500" element={<ServerError />} />
      <Route
        element={
          <ProtectedRoute>
            <SkipToContent />
            <Suspense fallback={<div className="session-loading"><SkeletonContent label="Opening EduPulse…" variant="page" /></div>}><Layout /></Suspense>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/syllabus" element={<ProtectedRoute allowedRoles={['instructor']}><Syllabus /></ProtectedRoute>} />
        <Route path="/courseware" element={<Courseware />} />
        <Route path="/assessment" element={<ProtectedRoute allowedRoles={['student']}><Assessment /></ProtectedRoute>} />
        <Route path="/performance" element={<ProtectedRoute allowedRoles={PERFORMANCE_ROLES}><Performance /></ProtectedRoute>} />
        <Route path="/records" element={<ProtectedRoute allowedRoles={['dean', 'associate_dean']}><Records /></ProtectedRoute>} />
        <Route path="/instructors" element={<ProtectedRoute allowedRoles={['dean']}><AcademicPortal view="instructors" /></ProtectedRoute>} />
        <Route path="/students" element={<ProtectedRoute allowedRoles={['dean']}><AcademicPortal view="students" /></ProtectedRoute>} />
        {/* Old bookmark — Curriculum was absorbed into Records (Phase 0 intake). */}
        <Route path="/curriculum" element={<Navigate to="/records" replace />} />
        <Route path="/course-loading" element={<ProtectedRoute allowedRoles={['dean', 'associate_dean']}><CourseLoading /></ProtectedRoute>} />
        <Route path="/monitor" element={<ProtectedRoute allowedRoles={['dean', 'associate_dean']}><MonitorProgress /></ProtectedRoute>} />
        <Route path="/student-monitoring" element={<ProtectedRoute allowedRoles={['instructor']}><StudentMonitoring /></ProtectedRoute>} />
        <Route path="/scoring-sheet" element={<ProtectedRoute allowedRoles={['instructor']}><StudentMonitoring /></ProtectedRoute>} />
        <Route path="/content-editor/:itemId?" element={<ProtectedRoute allowedRoles={['instructor']}><ContentEditor /></ProtectedRoute>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<NotificationCenter />} />
        <Route path="/help" element={<Navigate to="/settings?tab=help" replace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AIProvider>
        <ThemeProvider>
          <ToastProvider>
            <WorkspaceProvider><AcademicProvider><ContentStoreProvider>
              <AppRoutes />
            </ContentStoreProvider></AcademicProvider></WorkspaceProvider>
          </ToastProvider>
        </ThemeProvider>
        </AIProvider>
      </AuthProvider>
    </HashRouter>
  )
}
