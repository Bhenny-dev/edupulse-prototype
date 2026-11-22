import ModalLayer from '../ui/ModalLayer'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { WorkspaceStatus, useWorkspace, useWorkspaceViewState } from '../../context/WorkspaceContext'
import { SkeletonContent } from '../ui/LoadingFeedback'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { useNotifications } from '../../data/notifications'
import {
  Home, BookOpen, FileText, BarChart3, LogOut,
  ChevronDown, Bell, Search, Menu, X, Moon, Sun,
  ChevronRight, Globe, ClipboardCheck, Users, GraduationCap, Settings as SettingsIcon,
} from 'lucide-react'
import { Suspense, useState, useEffect, useRef } from 'react'
import Pulse from '../pulse/Pulse'
import EduPulseMark from '../brand/EduPulseMark'
import { recordAudit } from '../../lib/audit'
import { PERFORMANCE_ROLES } from '../../lib/access'
import './layout.css'

// Classroom-style shell (UI redesign U1, feature-documentation/CORE-FLOW-WORKSPACE.md):
// top bar with the page title, a left rail (Home, the role's sections, Settings) that collapses to
// icons, and a drawer on phones. Below a section, views stay in page tabs addressed by `?tab=`.
// Rail groups: `main` (role sections) and `system` (Settings). Labels are the names tests and Pulse use.
const SECTIONS = [
  { key: 'dashboard', path: '/dashboard', label: 'Home', icon: Home, roles: 'all' },
  ...[['dean','Dean'],['associate_dean','Program Coordinator'],['instructor','Instructor'],['student','Student']].map(([role,label]) => ({key:`admin-${role}`,path:`/dashboard?role=${role}`,label,icon:Users,roles:['admin'],monitorRole:role,group:'Role views'})),
  { key: 'dean-course', path: '/records', label: 'Course', icon: BookOpen, roles: ['dean','associate_dean'], relatedPaths:['/course-loading','/monitor'] },
  { key: 'dean-instructors', path: '/instructors', label: 'Instructors', icon: GraduationCap, roles: ['dean','associate_dean'] },
  { key: 'dean-students', path: '/students', label: 'Students', icon: Users, roles: ['dean','associate_dean'], relatedPaths:['/performance'] },

  // ── Instructor ────────────────────────────────────────────────────────
  { key: 'syllabus', path: '/syllabus', label: 'Syllabus', icon: BookOpen, roles: ['instructor'] },
  { key: 'courseware', path: '/courseware', label: 'Course', icon: FileText, roles: ['instructor'], relatedPaths: ['/content-editor'] },
  { key: 'scoring', path: '/student-monitoring', label: 'Student Monitoring', icon: ClipboardCheck, roles: ['instructor'], relatedPaths: ['/scoring-sheet'] },

  // ── Student ───────────────────────────────────────────────────────────
  { key: 'my-courses', path: '/courseware', label: 'My Courses', icon: BookOpen, roles: ['student'] },
  { key: 'assessments', path: '/assessment', label: 'Practice Assessments', icon: ClipboardCheck, roles: ['student'] },
  { key: 'performance', path: '/performance', label: 'Performance', icon: BarChart3, roles: PERFORMANCE_ROLES.filter(role=>role==='student') },

  { key: 'settings', path: '/settings', label: 'Settings', icon: SettingsIcon, roles: 'all', group: 'system' },
]
const PAGE_NAMES = { 'content-editor': 'Content editor', notifications: 'Notifications', 'course-loading': 'Course loading', monitor: 'Monitoring', performance: 'Performance', 'scoring-sheet': 'Scoring sheet' }
const RAIL_KEY = 'edupulse-rail'

function canSee(item, role) {
  return item.roles === 'all' || item.roles.includes(role)
}

function savedRail() {
  try { return localStorage.getItem(RAIL_KEY) } catch { return null }
}

// Rail links, grouped like Classroom's drawer. Collapsed rails keep each link's accessible name.
function RailLinks({ sections, current, onNavigate }) {
  const groups = [
    ['main', null, sections.filter(item => !item.group)],
    ['roles', 'Role views', sections.filter(item => item.group === 'Role views')],
    ['system', null, sections.filter(item => item.group === 'system')],
  ].filter(([, , items]) => items.length)
  return groups.map(([key, heading, items]) => <div key={key} className="rail-group">
    {heading && <div className="rail-heading">{heading}</div>}
    {items.map(item => <NavLink key={item.key} to={item.path} title={item.label} aria-label={item.label} className="rail-link"
      aria-current={current?.key === item.key ? 'page' : false} onClick={onNavigate}>
      <item.icon size={20} aria-hidden="true" /><span className="rail-label">{item.label}</span>
    </NavLink>)}
  </div>)
}

// Top-bar title (Classroom shows the class name here). A page below a section links back to it.
function PageTitle({ current }) {
  const location = useLocation()
  const leaf = location.pathname.split('/').filter(Boolean)[0]
  if (!current) return PAGE_NAMES[leaf] ? <div className="app-page-title"><span>{PAGE_NAMES[leaf]}</span></div> : null
  const sectionPath = current.path.split('?')[0]
  const nested = location.pathname !== sectionPath && !current.monitorRole
  const leafName = PAGE_NAMES[leaf] || leaf?.replace(/-/g, ' ')
  return <div className="app-page-title">
    {nested && leafName ? <><NavLink to={current.path}>{current.label}</NavLink><ChevronRight size={14} aria-hidden="true" /><span>{leafName}</span></> : <span>{current.label}</span>}
  </div>
}

function SearchOverlay({ onClose }) {
  const [query, setQuery] = useState('')
  const suggestions = [
    'IT 102 Syllabus', 'Computer Programming 1', 'WMAD 303-1 Advanced Web Systems Technologies',
    'Week 4 — Conditional Statements: Seatwork & Quiz', 'Student Monitoring — IT 102', 'BSIT-3A Block Class List',
  ]
  const filtered = suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()))

  return (
    <ModalLayer className="overlay-backdrop" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '80px' }}>
      <div style={{
        width: '560px', maxWidth: '95%', background: 'var(--white)',
        borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-3d-hover)',
        border: '1px solid var(--sky-100)', overflow: 'hidden',
        animation: 'bounceIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1)', transformOrigin: 'top center',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: '10px', borderBottom: '1px solid var(--gray-100)' }}>
          <Search size={18} style={{ color: 'var(--sky-500)' }} />
          <input
            autoFocus
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9375rem', fontFamily: 'var(--font-body)', background: 'transparent' }}
            placeholder="Search syllabi, courseware, students..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={14} />
          </button>
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: '8px', maxHeight: '300px', overflow: 'auto' }}>
            {filtered.map((item, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', gap: '10px',
                cursor: 'pointer', transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sky-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Search size={14} style={{ color: 'var(--gray-400)' }} />
                <span style={{ fontSize: '0.875rem' }}>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalLayer>
  )
}

function RoleSwitchPopover({ onClose }) {
  const { switchRole, user } = useAuth()
  const navigate = useNavigate()
  const roles = [
    { key: 'admin', label: 'System Admin', desc: 'System health, accounts and audit logs' },
    { key: 'dean', label: 'Dean', desc: 'Course loading and academic monitoring' },
    { key: 'associate_dean', label: 'Program Coordinator', desc: 'Course loading and academic monitoring' },
    { key: 'instructor', label: 'Instructor', desc: 'Syllabus, courseware, student monitoring' },
    { key: 'student', label: 'Student', desc: 'Open materials, answer assessments' },
  ]

  return (
    <ModalLayer className="overlay-backdrop" onClick={onClose}>
      <div className="popover-content" style={{ maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '4px' }}>Switch View</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '16px' }}>You remain signed in as the admin. Choose an account to view its academic records. Your AI connection stays with the admin.</p>
        {roles.map(r => (
          <button key={r.key} onClick={async () => { onClose(); if (await switchRole(r.key)) navigate('/dashboard') }} style={{
            display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
            padding: '12px', borderRadius: 'var(--radius-md)',
            background: user?.role === r.key ? 'var(--sky-50)' : 'transparent',
            border: user?.role === r.key ? '2px solid var(--sky-200)' : '2px solid transparent',
            cursor: 'pointer', marginBottom: '4px', transition: 'all 150ms',
          }}
          onMouseEnter={e => { if (user?.role !== r.key) e.currentTarget.style.background = 'var(--gray-50)' }}
          onMouseLeave={e => { if (user?.role !== r.key) e.currentTarget.style.background = 'transparent' }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', textAlign: 'left' }}>{r.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textAlign: 'left' }}>{r.desc}</div>
            </div>
            {user?.role === r.key && <span className="badge badge-published" style={{ marginLeft: 'auto' }}>Current</span>}
          </button>
        ))}
      </div>
    </ModalLayer>
  )
}

export default function Layout() {
  const workspace = useWorkspace()

  const { user, logout, authLoading } = useAuth()
  const { language, switchLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  // Only the open surface is retained; search text and account/notification data stay transient.
  const [overlay, setOverlay] = useWorkspaceViewState('layout-overlay', null)
  const activeOverlay = authLoading ? null : overlay
  const showUserMenu = activeOverlay === 'account', showNotifications = activeOverlay === 'notifications'
  const showSearch = activeOverlay === 'search', showRoleSwitch = activeOverlay === 'roles'
  const showMobileMenu = activeOverlay === 'mobile', showLangMenu = activeOverlay === 'language'
  const toggleOverlay = name => setOverlay(previous => previous === name ? null : name)
  const { dark: darkMode, toggleDark, fontScale } = useTheme()
  // 'open' | 'collapsed' | null (null follows the screen width: wide opens, tablets collapse).
  const [rail, setRail] = useState(savedRail)
  const toggleRail = () => {
    const wide = window.matchMedia?.('(min-width: 1181px)').matches ?? true
    const next = (rail ? rail === 'open' : wide) ? 'collapsed' : 'open'
    setRail(next)
    try { localStorage.setItem(RAIL_KEY, next) } catch { /* private window: the choice lasts this visit */ }
  }

  // One audit entry per page visit; the user object is replaced on token refresh and must not log the page again.
  const lastAuditedPage = useRef('')
  useEffect(() => {
    const visit = `${user?.id}|${location.pathname}`
    if (!user?.authenticated || lastAuditedPage.current === visit) return
    lastAuditedPage.current = visit
    void recordAudit(user, 'navigation', 'success', location.pathname)
  }, [location.pathname, user])

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOverlay('search') }
      if (e.key === 'Escape') setOverlay(null)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT' && !e.target.closest?.('[role="dialog"], [contenteditable="true"]')) {
        e.preventDefault(); navigate('/settings?tab=keyboard-shortcuts')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [navigate, setOverlay])

  useEffect(() => {
    if (!authLoading && overlay === 'roles' && !user?.canSwitchRoles) setOverlay(null)
  }, [authLoading, overlay, user?.canSwitchRoles, setOverlay])

  const handleLogout = () => { setOverlay(null); logout(); navigate('/') }
  const { notifications: notifs, unreadCount, loading: noticesLoading, error: noticesError } = useNotifications(user?.role)
  const sections = SECTIONS.filter(s => canSee(s, user?.role))
  const monitorRole = user?.role === 'admin' ? new URLSearchParams(location.search).get('role') : null
  const current = sections.find(item => item.monitorRole ? item.monitorRole === monitorRole : item.path === location.pathname && !monitorRole || item.relatedPaths?.some(path => location.pathname.startsWith(path)))

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [location.pathname])
  // Keyed by the first path segment: changing section replays the page entrance, while
  // moving within one (a content-editor item, a ?tab= view) keeps the page's state.
  const pageKey = location.pathname.split('/')[1] || 'dashboard'
  const shellClass = `app-shell${rail === 'open' ? ' rail-open' : rail === 'collapsed' ? ' rail-collapsed' : ''}`

  return (
    <div className={shellClass} style={{ fontSize: fontScale === 'small' ? '14px' : fontScale === 'large' ? '18px' : '16px' }}>
      <header className="app-topbar" role="banner">
        <div className="app-brand">
          <button type="button" className="rail-toggle" aria-label={rail === 'collapsed' ? 'Expand navigation' : 'Collapse navigation'} title="Main menu" onClick={toggleRail}>
            <Menu size={22} />
          </button>
          <button type="button" className="mobile-menu-btn" aria-label={showMobileMenu ? 'Close menu' : 'Open menu'} aria-expanded={showMobileMenu} onClick={() => toggleOverlay('mobile')}>
            {showMobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
          <NavLink to="/dashboard" className="app-brand-link">
            <span className="app-brand-mark"><EduPulseMark size={20} /></span>
            <span className="app-brand-name">EduPulse</span>
          </NavLink>
          <PageTitle current={current} />
        </div>

        <div className="app-tools">
          <button type="button" className="app-tool desktop-tool" onClick={() => setOverlay('search')} title="Search (Ctrl+K)" aria-label="Search">
            <Search size={18} />
          </button>
          <button type="button" className="app-tool" onClick={toggleDark} title={darkMode ? 'Light mode' : 'Dark mode'} aria-label={darkMode ? 'Light mode' : 'Dark mode'}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div style={{ position: 'relative' }}>
            <button type="button" className="app-tool desktop-tool" onClick={() => toggleOverlay('language')} title="Language" aria-label="Language">
              <Globe size={18} />
            </button>
            {showLangMenu && (
              <div className="app-popover" style={{ width: 170 }}>
                <div className="rail-heading" style={{ padding: '6px 12px' }}>Language</div>
                {[{ code: 'en', label: 'English' }, { code: 'fil', label: 'Filipino' }].map(lang => (
                  <button key={lang.code} type="button" className="app-menu-item" aria-pressed={language === lang.code} onClick={() => { switchLanguage(lang.code); setOverlay(null) }}>
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button type="button" className="app-tool" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} aria-expanded={showNotifications} onClick={() => toggleOverlay('notifications')}>
              <Bell size={18} />
              {unreadCount > 0 && <span className="app-tool-badge" aria-hidden="true">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="app-popover" style={{ width: 'min(360px, calc(100vw - 24px))', padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9375rem' }}>Notifications</h4>
                  <NavLink to="/notifications" onClick={() => setOverlay(null)} style={{ fontSize: '0.8125rem', color: 'var(--sky-600)', fontWeight: 600 }}>View All</NavLink>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {noticesLoading && !notifs.length && <SkeletonContent label="Loading notifications…" rows={3} />}
                  {noticesError && <p role="alert">{noticesError}</p>}
                  {!noticesLoading && !noticesError && !notifs.length && <p className="text-sm text-muted">No notifications yet.</p>}
                  {notifs.slice(0, 3).map(n => (
                    <div key={n.id} style={{ padding: '10px 4px', borderTop: '1px solid var(--gray-100)', fontSize: '0.8125rem', fontWeight: n.read ? 500 : 700, color: 'var(--gray-700)' }}>
                      <div>{n.message}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)', fontWeight: 500, marginTop: 4 }}>{n.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hidden on phones like the other desktop tools; the role and the view switch are in the account menu there. */}
          {user?.canSwitchRoles
            ? <button type="button" className="app-role-chip desktop-tool" aria-label="Switch admin view" aria-expanded={showRoleSwitch} onClick={() => toggleOverlay('roles')} title="Switch admin view">Admin · {user?.title}</button>
            : <span className="app-role-chip desktop-tool">{user?.title}</span>}

          <div style={{ position: 'relative' }}>
            <button type="button" className="app-account-btn" aria-label="Account menu" title={user?.name} aria-expanded={showUserMenu} onClick={() => toggleOverlay('account')}>
              <span className="app-avatar">{user?.name?.charAt(0)}</span>
              <span className="profile-name" style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--gray-700)' }}>{user?.name?.split(' ')[0]}</span>
              <ChevronDown size={12} style={{ color: 'var(--gray-400)' }} />
            </button>
            {showUserMenu && (
              <div className="app-popover" role="group" aria-label="Account" style={{ width: 260 }}>
                <div style={{ padding: 12, borderBottom: '1px solid var(--gray-100)', marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{user?.name}</div>
                  {user?.baseRole !== 'admin' && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{user?.email}</div>}
                  <div style={{ marginTop: 4 }}><span className="badge badge-published">{user?.title}</span></div>
                </div>
                {user?.canSwitchRoles && <button type="button" className="app-menu-item" onClick={() => setOverlay('roles')}>Switch view</button>}
                <NavLink to="/settings" className="app-menu-item" onClick={() => setOverlay(null)}>Settings</NavLink>
                <button type="button" className="app-menu-item danger" onClick={handleLogout}><LogOut size={16} /> Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showMobileMenu && (
        <div className="app-drawer-backdrop" onClick={() => setOverlay(null)}>
          <nav aria-label="Mobile navigation" className="app-drawer" onClick={event => event.stopPropagation()}>
            <RailLinks sections={sections} current={current} onNavigate={() => setOverlay(null)} />
          </nav>
        </div>
      )}

      <WorkspaceStatus />

      <div className="app-body app-workspace">
        <aside className="app-rail">
          <nav aria-label="Main navigation"><RailLinks sections={sections} current={current} /></nav>
        </aside>
        <main id="main-content" className="app-main" role="main" tabIndex={-1}>
          <div key={pageKey} className="page-enter">
            {workspace.loading && !workspace.mode && ['/syllabus', '/courseware', '/content-editor'].some(path => location.pathname.startsWith(path)) ? <div className="container"><SkeletonContent variant="page" label="Loading your workspace…" /></div> : <Suspense fallback={<div className="container"><SkeletonContent variant="page" label="Opening the page…" /></div>}><Outlet /></Suspense>}
          </div>
        </main>
      </div>

      {showSearch && <SearchOverlay onClose={() => setOverlay(null)} />}
      {showRoleSwitch && user?.canSwitchRoles && <RoleSwitchPopover onClose={() => setOverlay(null)} />}
      <Pulse />
    </div>
  )
}
