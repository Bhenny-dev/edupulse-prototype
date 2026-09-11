import { Link } from 'react-router-dom'
import LoginPanel from '../components/auth/LoginPanel'

export default function Login() {
  return (
    <div className="login-page">
      <div className="login-page-inner">
        <Link to="/" className="login-page-logo">
          <span>EP</span>
        </Link>
        <h1 className="login-page-title">EduPulse</h1>
        <p className="login-page-subtitle">
          AI-Driven Syllabus &amp; Courseware Generation<br />
          King's College of the Philippines - Benguet
        </p>

        <LoginPanel />

        <p className="login-page-footer">Prototype v4.0 — College of Information Technology</p>
      </div>
    </div>
  )
}
