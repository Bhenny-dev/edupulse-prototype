import { Link } from 'react-router-dom'
import { Shield, ArrowLeft, Calendar } from 'lucide-react'

export default function Privacy() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--sky-50) 0%, var(--white) 50%, var(--sky-50) 100%)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--sky-600)', fontSize: '0.875rem', marginBottom: '24px', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Login
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--sky-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} style={{ color: 'var(--sky-500)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800 }}>Privacy Policy</h1>
        </div>
        <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gray-400)', fontSize: '0.8125rem', marginBottom: '32px' }}>
          <Calendar size={14} /> Effective: July 1, 2026
        </p>

        <div style={{ lineHeight: 1.8, color: 'var(--gray-700)' }}>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>1. Introduction</h2>
            <p style={{ marginBottom: '8px' }}>
              King's College of the Philippines – Benguet ("KCP") operates the EduPulse AI-Driven Syllabus & Courseware Generation system ("the System"). This Privacy Policy explains how we collect, use, and protect your personal data when you use the System.
            </p>
            <p>
              By accessing or using EduPulse, you agree to the collection and use of information in accordance with this policy. We comply with the Data Privacy Act of 2012 (RA 10173) and its Implementing Rules and Regulations.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>2. Information We Collect</h2>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Account Information:</strong> Name, email address, employee/student ID, role (Dean, Instructor, Student), and department assignment.</li>
              <li><strong>Educational Data:</strong> Syllabi, courseware content, grades, assessment scores, student performance metrics, and learning analytics.</li>
              <li><strong>System Usage Data:</strong> Login timestamps, pages visited, features used, AI assistant interactions, and file upload/download history.</li>
              <li><strong>AI Interaction Data:</strong> Prompts submitted to the AI assistant, generated content, confidence scores, and retrieval context used for responses.</li>
              <li><strong>Imported Data:</strong> Student rosters, grades, curriculum data, and other educational records uploaded by authorized users.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>3. How We Use Your Data</h2>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>To generate AI-powered syllabi, course materials, activities, and assessments.</li>
              <li>To monitor and analyze student academic performance and identify at-risk students.</li>
              <li>To provide role-appropriate dashboards, reports, and analytics.</li>
              <li>To ensure compliance with CHED standards and institutional policies.</li>
              <li>To maintain system security, audit logs, and usage records.</li>
              <li>To improve the quality and accuracy of AI-generated content.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>4. Data Sharing</h2>
            <p style={{ marginBottom: '8px' }}>
              We do not sell, rent, or trade your personal information. Data may be shared only in the following circumstances:
            </p>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Within KCP:</strong> Deans may access instructor and student data within their college. Instructors may access data for their assigned courses.</li>
              <li><strong>AI Processing:</strong> Content submitted for AI generation is processed by our AI service provider under strict data processing agreements.</li>
              <li><strong>Legal Requirements:</strong> When required by law, regulation, or valid legal process.</li>
              <li><strong>CHED Compliance:</strong> Aggregated, anonymized data may be shared with CHED for regulatory compliance reporting.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>5. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit (TLS 1.3), encryption at rest (AES-256), role-based access controls, session management with automatic timeout, comprehensive audit logging, and regular security assessments. Despite our efforts, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>6. Data Retention</h2>
            <p>
              Student academic data is retained for the duration of enrollment plus 5 years. Instructor data is retained for the duration of employment plus 3 years. System logs are retained for 2 years. AI interaction data is retained for 1 year. You may request early deletion of your data by contacting the Data Protection Officer.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>7. Your Rights</h2>
            <p style={{ marginBottom: '8px' }}>Under the Data Privacy Act of 2012, you have the right to:</p>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Be informed about the collection and processing of your personal data.</li>
              <li>Access the personal information we hold about you.</li>
              <li>Object to the processing of your personal data.</li>
              <li>Rectify or update inaccurate personal data.</li>
              <li>Erase or restrict the processing of your personal data.</li>
              <li>Data portability — receive your data in a structured, commonly used format.</li>
              <li>File a complaint with the National Privacy Commission.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>8. Contact Us</h2>
            <p>
              For privacy-related concerns, contact our Data Protection Officer:<br />
              <strong>Email:</strong> dpo@kcp.edu.ph<br />
              <strong>Phone:</strong> +63 (074) 422-XXXX<br />
              <strong>Address:</strong> King's College of the Philippines, La Trinidad, Benguet, Philippines
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
