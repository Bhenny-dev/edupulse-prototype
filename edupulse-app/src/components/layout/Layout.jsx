import { NavLink, Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import {
  LayoutDashboard, BookOpen, FileText, BarChart3, LogOut,
  ChevronDown, Bell, Search, Menu, X, Moon, Sun, HelpCircle,
  ChevronRight, Globe, Keyboard, Layers, ClipboardCheck,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import KeyboardShortcutsModal from '../ui/KeyboardShortcutsModal'
import Pulse from '../pulse/Pulse'

// Navigation architecture — one top-bar station per FLOW_SPEC phase, max 5
// primary sections per role; anything below that altitude lives in the
// contextual left sidebar, addressed by `?tab=`.
// Admin (Dean / Associate Dean, one shared role): Dashboard → Records (Phase 0)
//   → Course Loading (Phase 1) → Monitor (Phase 5).
// Instructor: Dashboard → Syllabus (Phase 2) → Courseware (Phase 3) →
//   Student Monitoring + Performance (Phase 5).
// Student: Dashboard → My Courses (Phase 4) → My Performance.
const SECTIONS = [
  { key: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: 'all' },

  // ── Dean / Associate Dean (shared `admin` role) ───────────────────────
  {
    key: 'records', path: '/records', label: 'Records', icon: Layers, roles: ['admin'],
    sidebar: [
      { key: 'import', label: 'Import EduSuite Files', tab: 'import' },
      { key: 'sections', label: 'Blocks & Rosters', tab: 'sections' },
      { key: 'courses', label: 'Course Catalog', tab: 'courses' },
    ],
  },
  {
    key: 'course-loading', path: '/course-loading', label: 'Course Loading', icon: ClipboardCheck, roles: ['admin'],
    sidebar: [
      { key: 'assign', label: 'Load Courses', tab: 'assign' },
      { key: 'instructors', label: 'Instructors', tab: 'instructors' },
    ],
  },
  {
    key: 'monitor', path: '/monitor', label: 'Monitor', icon: BarChart3, roles: ['admin'],
    sidebar: [
      { key: 'syllabi', label: 'Syllabus Status', tab: 'syllabi' },
      { key: 'delivery', label: 'Delivery Progress', tab: 'delivery' },
      { key: 'students', label: 'Student Oversight', tab: 'students' },
      { key: 'alerts', label: 'Alerts', tab: 'alerts' },
    ],
  },

  // ── Instructor ────────────────────────────────────────────────────────
  {
    key: 'syllabus', path: '/syllabus', label: 'Syllabus', icon: BookOpen, roles: ['instructor'],
    sidebar: [
      { key: 'mine', label: 'My Courses', tab: 'mine' },
      { key: 'builder', label: 'Syllabus Builder', tab: 'builder' },
    ],
  },
  {
    key: 'courseware', path: '/courseware', label: 'Courseware', icon: FileText, roles: ['instructor'],
    relatedPaths: ['/content-editor'],
    sidebar: [
      { key: 'mine', label: 'My Courseware', tab: 'mine' },
      { key: 'builder', label: 'Courseware Builder', tab: 'builder' },
    ],
  },
  {
    key: 'scoring', path: '/student-monitoring', label: 'Student Monitoring', icon: ClipboardCheck, roles: ['instructor'],
    sidebar: [
      { key: 'assessments', label: 'Assessment Scores', tab: 'assessments' },
      { key: 'materials', label: 'Material Access', tab: 'materials' },
    ],
  },

  // ── Student ───────────────────────────────────────────────────────────
  {
    key: 'my-courses', path: '/courseware', label: 'My Courses', icon: BookOpen, roles: ['student'],
    relatedPaths: ['/assessment'],
    sidebar: [
      { key: 'published', label: 'My Materials', tab: 'published' },
      { key: 'assessments', label: 'My Assessments', path: '/assessment' },
    ],
  },
  {
    key: 'performance', path: '/performance', label: 'Performance', icon: BarChart3, roles: ['instructor', 'student'],
    sidebar: [
      { key: 'overview', label: 'Overview', tab: 'overview' },
      { key: 'bytopic', label: 'By Topic', tab: 'bytopic' },
      { key: 'alerts', label: 'Alerts', tab: 'alerts', roles: ['instructor'] },
    ],
  },
]

// Notifications follow SYSTEM_SPEC §5: unopened materials and unanswered
// assessments fan out to BOTH the instructor and the student; syllabus-status
// and delivery-gap notices go to the Dean / Associate Dean.
const ROLE_NOTIFICATIONS = {
  admin: [
    { id: 1, message: 'IT 107 syllabus still drafted — not yet checked by Sir Rogelio L. Guisdan', time: '2h ago', type: 'warning' },
    { id: 2, message: 'WMAD 303-1 approved syllabus uploaded — Course Outline pending extraction', time: '1d ago', type: 'info' },
    { id: 3, message: 'Delivery gap: IT 106 has no published courseware for Week 4 yet', time: '2d ago', type: 'warning' },
  ],
  instructor: [
    { id: 1, message: '3 AI-generated drafts waiting in your Courseware review queue', time: '1h ago', type: 'info' },
    { id: 2, message: '5 students in BSIT-3A have not opened "Week 1 — What is Programming"', time: '4h ago', type: 'warning' },
    { id: 3, message: '2 students missed "Week 4 — Conditional Statements: Seatwork & Quiz"', time: '1d ago', type: 'warning' },
  ],
  student: [
    { id: 1, message: 'New material published: Week 3 — Variables & Data Types', time: '30m ago', type: 'info' },
    { id: 2, message: 'Reminder: you haven\'t opened "Week 1 — What is Programming: Lecture Notes"', time: '2h ago', type: 'warning' },
    { id: 3, message: 'Unanswered assessment: Week 1 — Recitation & Short Quiz', time: '1d ago', type: 'warning' },
  ],
}

function canSee(item, role) {
  return item.roles === 'all' || item.roles.includes(role)
}

// Role-aware: student "My Courses" and instructor "Courseware" share /courseware.
function activeSection(pathname, role) {
  return SECTIONS.filter(s => canSee(s, role))
    .find(s => s.path === pathname || (s.relatedPaths || []).some(p => pathname.startsWith(p)))
}

function Sidebar({ section, role }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  if (!section?.sidebar) return null
  const items = section.sidebar.filter(item => !item.roles || item.roles.includes(role))
  if (items.length === 0) return null
  const activeTab = searchParams.get('tab') || items[0].tab

  return (
    <aside role="navigation" aria-label={`${section.label} sections`} style={{
      width: 224, flexShrink: 0, borderRight: '1px solid var(--gray-100)',
      background: 'var(--white)', padding: '20px 12px', minHeight: 'calc(100vh - 64px)',
    }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gray-400)', padding: '0 10px', marginBottom: '10px' }}>
        {section.label}
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {items.map(item => {
          const to = item.path || `${section.path}?tab=${item.tab}`
          const isActive = item.path
            ? location.pathname === item.path
            : location.pathname === section.path && activeTab === item.tab
          return (
            <NavLink key={item.key} to={to} style={{
              display: 'block', padding: '9px 12px', borderRadius: 'var(--radius-md)',
              fontSize: '0.8438rem', fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--sky-600)' : 'var(--gray-600)',
              background: isActive ? 'var(--sky-50)' : 'transparent',
              textDecoration: 'none', transition: 'all 150ms',
            }}>
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

function Breadcrumbs() {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'dashboard')) return null

  const crumbs = parts.map((part, i) => ({
    label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
    path: '/' + parts.slice(0, i + 1).join('/'),
  }))

  return (
    <div style={{
      padding: '12px 24px',
      display: 'flex', alignItems: 'center', gap: '8px',
      fontSize: '0.8125rem', color: 'var(--gray-500)',
      background: 'var(--white)',
      borderBottom: '1px solid var(--gray-100)',
    }}>
      <NavLink to="/dashboard" style={{ color: 'var(--sky-500)', fontWeight: 600 }}>Home</NavLink>
      {crumbs.map((crumb, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChevronRight size={12} />
          {i < crumbs.length - 1 ? (
            <NavLink to={crumb.path} style={{ color: 'var(--sky-500)', fontWeight: 600 }}>{crumb.label}</NavLink>
          ) : (
            <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{crumb.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

function SearchOverlay({ onClose }) {
  const [query, setQuery] = useState('')
  const suggestions = [
    'IT 102 Syllabus', 'Computer Programming 1', 'WMAD 303-1 Advanced Web Systems Technologies',
    'Week 4 — Conditional Statements: Seatwork & Quiz', 'Student Monitoring — IT 102', 'BSIT-3A Block Roster',
  ]
  const filtered = suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="overlay-backdrop" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '80px' }}>
      <div style={{
        width: '560px', maxWidth: '95%', background: 'var(--white)',
        borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-3d-hover)',
        border: '1px solid var(--sky-100)', overflow: 'hidden',
        animation: 'bounceIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
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
    </div>
  )
}

function RoleSwitchPopover({ onClose }) {
  const { switchRole, user } = useAuth()
  const navigate = useNavigate()
  // Dean and Associate Dean are one shared role (`admin`) with identical
  // permissions — two personas here only so both people can be demoed.
  const roles = [
    { key: 'dean', label: 'Dean', desc: 'Shared admin role — records, loading, monitoring' },
    { key: 'associate_dean', label: 'Associate Dean', desc: 'Shared admin role — same UI and permissions as the Dean' },
    { key: 'instructor', label: 'Instructor', desc: 'Syllabus, courseware, student monitoring' },
    { key: 'student', label: 'Student', desc: 'Open materials, answer assessments' },
  ]

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="popover-content" style={{ maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '4px' }}>Switch Role</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '16px' }}>Prototype-only affordance for demoing all four roles — not part of the production sign-in flow.</p>
        {roles.map(r => (
          <button key={r.key} onClick={() => { switchRole(r.key); navigate('/dashboard'); onClose() }} style={{
            display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
            padding: '12px', borderRadius: 'var(--radius-md)',
            background: user?.title === r.label ? 'var(--sky-50)' : 'transparent',
            border: user?.title === r.label ? '2px solid var(--sky-200)' : '2px solid transparent',
            cursor: 'pointer', marginBottom: '4px', transition: 'all 150ms',
          }}
          onMouseEnter={e => { if (user?.title !== r.label) e.currentTarget.style.background = 'var(--gray-50)' }}
          onMouseLeave={e => { if (user?.title !== r.label) e.currentTarget.style.background = 'transparent' }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', textAlign: 'left' }}>{r.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textAlign: 'left' }}>{r.desc}</div>
            </div>
            {user?.title === r.label && <span className="badge badge-published" style={{ marginLeft: 'auto' }}>Current</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { language, switchLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showRoleSwitch, setShowRoleSwitch] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const { dark: darkMode, toggleDark } = useTheme()
  const [fontScale, setFontScale] = useState('medium')
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true) }
      if (e.key === 'Escape') { setShowSearch(false); setShowUserMenu(false); setShowNotifications(false); setShowRoleSwitch(false); setShowMobileMenu(false); setShowShortcuts(false); setShowLangMenu(false) }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault(); setShowShortcuts(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }
  const notifs = ROLE_NOTIFICATIONS[user?.role] || []
  const unreadCount = notifs.length
  const sections = SECTIONS.filter(s => canSee(s, user?.role))
  const current = activeSection(location.pathname, user?.role)

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      fontSize: fontScale === 'small' ? '14px' : fontScale === 'large' ? '18px' : '16px',
    }}>
      <header role="banner" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--sky-100)',
        padding: '0 24px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <button
            className="mobile-menu-btn"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            style={{
              display: 'none', width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'var(--gray-100)', border: 'none', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gray-600)', cursor: 'pointer',
            }}
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>

          <NavLink to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--sky-400), var(--sky-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-3d)',
            }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: '0.875rem', fontFamily: 'var(--font-heading)' }}>EP</span>
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--gray-900)' }}>EduPulse</span>
          </NavLink>

          {/* Top bar: primary sections only — 5 max per role. See NFR-USE-01/02. */}
          <nav style={{ display: 'flex', gap: '4px' }} role="navigation" aria-label="Main navigation">
            {sections.map(item => {
              const isActive = current?.key === item.key
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: 'var(--radius-md)',
                    fontWeight: 600, fontSize: '0.875rem',
                    color: isActive ? 'var(--sky-600)' : 'var(--gray-500)',
                    background: isActive ? 'var(--sky-50)' : 'transparent',
                    boxShadow: isActive ? '0 0 0 3px rgba(14, 165, 233, 0.15)' : 'none',
                    transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    textDecoration: 'none',
                  }}
                >
                  <item.icon size={18} />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setShowSearch(true)} title="Search (Ctrl+K)" style={{
            width: 36, height: 36, borderRadius: 'var(--radius-full)',
            background: 'var(--gray-100)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--gray-500)', cursor: 'pointer', transition: 'all 200ms',
          }}>
            <Search size={16} />
          </button>

          <button onClick={toggleDark} title={darkMode ? 'Light mode' : 'Dark mode'} style={{
            width: 36, height: 36, borderRadius: 'var(--radius-full)',
            background: darkMode ? 'var(--sky-100)' : 'var(--gray-100)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: darkMode ? 'var(--sky-500)' : 'var(--gray-500)', cursor: 'pointer', transition: 'all 200ms',
          }}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <NavLink to="/help" title="Help & Support" style={{
            width: 36, height: 36, borderRadius: 'var(--radius-full)',
            background: 'var(--gray-100)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--gray-500)', cursor: 'pointer', transition: 'all 200ms',
          }}>
            <HelpCircle size={16} />
          </NavLink>

          <button onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)" style={{
            width: 36, height: 36, borderRadius: 'var(--radius-full)',
            background: 'var(--gray-100)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--gray-500)', cursor: 'pointer', transition: 'all 200ms',
          }}>
            <Keyboard size={16} />
          </button>

          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowLangMenu(!showLangMenu); setShowNotifications(false); setShowRoleSwitch(false); setShowUserMenu(false) }}
              title="Language" style={{
              width: 36, height: 36, borderRadius: 'var(--radius-full)',
              background: 'var(--gray-100)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gray-500)', cursor: 'pointer', transition: 'all 200ms', fontSize: '0.75rem', fontWeight: 700,
            }}>
              <Globe size={18} />
            </button>
            {showLangMenu && (
              <div style={{
                position: 'absolute', top: '48px', right: 0, width: '160px',
                background: 'var(--white)', borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-3d-hover)', border: '1px solid var(--sky-100)', padding: '8px',
                animation: 'bounceIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
                <div style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Language</div>
                {[{ code: 'en', label: 'English' }, { code: 'fil', label: 'Filipino' }].map(lang => (
                  <button key={lang.code} onClick={() => { switchLanguage(lang.code); setShowLangMenu(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none',
                      borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: language === lang.code ? 700 : 500,
                      background: language === lang.code ? 'var(--sky-50)' : 'transparent',
                      color: language === lang.code ? 'var(--sky-600)' : 'var(--gray-600)',
                      transition: 'all 0.15s',
                    }}>
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); setShowRoleSwitch(false) }} style={{
              width: 36, height: 36, borderRadius: 'var(--radius-full)',
              background: 'var(--gray-100)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gray-500)', cursor: 'pointer', position: 'relative', transition: 'all 200ms',
            }}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2, width: 16, height: 16,
                  borderRadius: 'var(--radius-full)', background: 'var(--red-500)',
                  color: 'white', fontSize: '0.625rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{unreadCount}</span>
              )}
            </button>
            {showNotifications && (
              <div style={{
                position: 'absolute', top: '48px', right: 0, width: '360px',
                background: 'var(--white)', borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-3d-hover)', border: '1px solid var(--sky-100)', padding: '16px',
                animation: 'bounceIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9375rem' }}>Notifications</h4>
                  <NavLink to="/notifications" onClick={() => setShowNotifications(false)} style={{ fontSize: '0.75rem', color: 'var(--sky-500)', fontWeight: 600 }}>View All</NavLink>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {notifs.map(n => (
                    <div key={n.id} style={{
                      padding: '10px 12px', borderRadius: 'var(--radius-md)',
                      background: n.type === 'warning' ? 'var(--amber-100)' : n.type === 'success' ? 'var(--green-100)' : n.type === 'error' ? 'var(--red-100)' : 'var(--sky-50)',
                      fontSize: '0.8125rem', fontWeight: 500,
                      color: n.type === 'warning' ? '#92400e' : n.type === 'success' ? '#166534' : n.type === 'error' ? '#991b1b' : 'var(--sky-700)',
                    }}>
                      <div>{n.message}</div>
                      <div style={{ fontSize: '0.6875rem', opacity: 0.7, marginTop: '4px' }}>{n.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowRoleSwitch(!showRoleSwitch); setShowUserMenu(false); setShowNotifications(false) }} title="Switch Role (prototype only)" style={{
              padding: '4px 10px', borderRadius: 'var(--radius-full)',
              background: 'var(--purple-100)', border: '1px solid var(--purple-100)',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: 'var(--purple-500)',
              transition: 'all 200ms',
            }}>
              {user?.title}
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); setShowRoleSwitch(false) }} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 10px 4px 4px', borderRadius: 'var(--radius-full)',
              background: 'var(--white)', border: '2px solid var(--sky-200)',
              cursor: 'pointer', transition: 'all 200ms',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--sky-300), var(--sky-400))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '0.75rem',
              }}>
                {user?.name?.charAt(0)}
              </div>
              <span className="profile-name" style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--gray-700)' }}>{user?.name?.split(' ')[0]}</span>
              <ChevronDown size={12} style={{ color: 'var(--gray-400)' }} />
            </button>
            {showUserMenu && (
              <div style={{
                position: 'absolute', top: '48px', right: 0, width: '260px',
                background: 'var(--white)', borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-3d-hover)', border: '1px solid var(--sky-100)', padding: '8px',
                animation: 'bounceIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
                <div style={{ padding: '12px', borderBottom: '1px solid var(--gray-100)', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{user?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{user?.email}</div>
                  <div style={{ marginTop: '4px' }}><span className="badge badge-published">{user?.title}</span></div>
                </div>
                <NavLink to="/settings" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--gray-700)', fontWeight: 500, transition: 'background 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--sky-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >Settings</NavLink>
                <NavLink to="/help" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--gray-700)', fontWeight: 500, transition: 'background 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--sky-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >Help & Support</NavLink>
                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 12px',
                  borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--red-500)', fontWeight: 600, fontSize: '0.875rem', transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--red-100)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                ><LogOut size={16} /> Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showMobileMenu && (
        <div style={{
          position: 'fixed', inset: 0, top: '64px', zIndex: 99,
          background: 'var(--white)', padding: '16px 24px',
          animation: 'slideIn 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sections.map(item => (
              <NavLink key={item.path} to={item.path} onClick={() => setShowMobileMenu(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: 'var(--radius-md)',
                  fontWeight: 600, fontSize: '1rem',
                  color: isActive ? 'var(--sky-600)' : 'var(--gray-600)',
                  background: isActive ? 'var(--sky-50)' : 'transparent',
                  textDecoration: 'none',
                })}
              >
                <item.icon size={20} /> {item.label}
              </NavLink>
            ))}
            <NavLink to="/help" onClick={() => setShowMobileMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '1rem', color: 'var(--gray-600)', textDecoration: 'none' }}>
              <HelpCircle size={20} /> Help & Support
            </NavLink>
          </nav>
        </div>
      )}

      <Breadcrumbs />

      <div style={{ flex: 1, display: 'flex' }}>
        <Sidebar section={current} role={user?.role} />
        <main id="main-content" style={{ flex: 1, minHeight: 'calc(100vh - 64px)', minWidth: 0 }} role="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <footer role="contentinfo" style={{
        borderTop: '1px solid var(--gray-100)',
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: '0.75rem', color: 'var(--gray-400)',
        background: 'var(--white)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>EduPulse</span>
          <span>King's College of the Philippines — Benguet</span>
          <span className="badge badge-draft" style={{ fontSize: '0.625rem' }}>Prototype v5.0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <NavLink to="/help" style={{ color: 'var(--gray-400)', transition: 'color 150ms' }}
            onMouseEnter={e => e.target.style.color = 'var(--sky-500)'}
            onMouseLeave={e => e.target.style.color = 'var(--gray-400)'}
          >Support</NavLink>
          <span>© 2026 College of Information Technology</span>
        </div>
      </footer>

      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      {showRoleSwitch && <RoleSwitchPopover onClose={() => setShowRoleSwitch(false)} />}
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <Pulse />

      <style>{`
        @media (max-width: 980px) {
          .nav-label, .profile-name { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .nav-label { display: none !important; }
          .profile-name { display: none !important; }
        }
      `}</style>
    </div>
  )
}
