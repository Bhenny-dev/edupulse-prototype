import { Link } from 'react-router-dom'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--sky-50) 0%, var(--white) 50%, var(--sky-50) 100%)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px', padding: '32px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 'var(--radius-xl)', background: 'var(--sky-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          boxShadow: 'var(--shadow-3d)',
        }}>
          <AlertTriangle size={40} style={{ color: 'var(--sky-500)' }} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '4rem', fontWeight: 800, color: 'var(--sky-500)', lineHeight: 1 }}>
          404
        </h1>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, marginTop: '8px', marginBottom: '12px' }}>
          Page Not Found
        </h2>
        <p style={{ color: 'var(--gray-500)', marginBottom: '32px', lineHeight: 1.6 }}>
          The page you're looking for doesn't exist or has been moved. Please check the URL or return to the dashboard.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link to="/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Home size={16} /> Go to Dashboard
          </Link>
          <button className="btn btn-secondary" onClick={() => window.history.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
