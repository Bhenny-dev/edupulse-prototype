import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, BookOpen, Shield, CalendarCog } from 'lucide-react'

// Dean and Associate Dean share one role in the business process — same
// shared UI and permission set — and are offered as two personas here purely
// so both people can be demoed (FLOW_SPEC ground truth #5).
const ROLES = [
  { key: 'dean', label: 'Dean', desc: 'Records intake, course loading, delivery monitoring', icon: Shield, color: 'var(--purple-500)', bg: 'var(--purple-100)' },
  { key: 'associate_dean', label: 'Associate Dean', desc: 'Same shared admin role as the Dean', icon: CalendarCog, color: 'var(--amber-500)', bg: 'var(--amber-100)' },
  { key: 'instructor', label: 'Instructor', desc: 'Syllabus, courseware, and the scoring sheet', icon: BookOpen, color: 'var(--sky-500)', bg: 'var(--sky-100)' },
  { key: 'student', label: 'Student', desc: 'Open materials and answer assessments', icon: GraduationCap, color: 'var(--green-500)', bg: 'var(--green-100)' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = (role) => {
    login(role)
    navigate('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--sky-50) 0%, var(--white) 50%, var(--sky-50) 100%)',
      padding: '20px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '520px', width: '100%' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--sky-400), var(--sky-500))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', boxShadow: 'var(--shadow-3d-hover)',
          animation: 'float 3s ease-in-out infinite',
        }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>EP</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '2rem',
          color: 'var(--gray-900)', marginBottom: '8px',
        }}>
          EduPulse
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.9375rem', marginBottom: '40px', lineHeight: 1.6 }}>
          AI-Driven Syllabus & Courseware Generation<br />
          King's College of the Philippines - Benguet
        </p>

        <h2 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem',
          color: 'var(--gray-700)', marginBottom: '20px',
        }}>
          Select your role to continue
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ROLES.map(role => (
            <button
              key={role.key}
              onClick={() => handleLogin(role.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                width: '100%', padding: '20px 24px',
                background: 'var(--white)',
                border: '2px solid var(--gray-100)',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: 'var(--shadow-3d)',
                transition: 'all 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)'
                e.currentTarget.style.boxShadow = 'var(--shadow-3d-hover)'
                e.currentTarget.style.borderColor = 'var(--sky-300)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = 'var(--shadow-3d)'
                e.currentTarget.style.borderColor = 'var(--gray-100)'
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-lg)',
                background: role.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <role.icon size={24} style={{ color: role.color }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>
                  {role.label}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                  {role.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        <p style={{ marginTop: '32px', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
          Prototype v4.0 — College of Information Technology
        </p>
      </div>
    </div>
  )
}
