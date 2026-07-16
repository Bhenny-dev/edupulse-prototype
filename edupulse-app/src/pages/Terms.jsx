import { Link } from 'react-router-dom'
import { FileText, ArrowLeft, Calendar } from 'lucide-react'

export default function Terms() {
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
            <FileText size={20} style={{ color: 'var(--sky-500)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 800 }}>Terms of Use</h1>
        </div>
        <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gray-400)', fontSize: '0.8125rem', marginBottom: '32px' }}>
          <Calendar size={14} /> Effective: July 1, 2026
        </p>

        <div style={{ lineHeight: 1.8, color: 'var(--gray-700)' }}>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the EduPulse AI-Driven Syllabus & Courseware Generation system ("the System"), operated by King's College of the Philippines – Benguet ("KCP"), you agree to be bound by these Terms of Use. If you do not agree, do not use the System.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>2. Eligibility</h2>
            <p>
              The System is available only to authorized KCP personnel — deans, instructors, and students — who have been issued valid credentials. Unauthorized access is strictly prohibited and may result in disciplinary and/or legal action.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>3. Account Responsibilities</h2>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You must not share your account with others or allow unauthorized persons to access the System under your credentials.</li>
              <li>You must immediately report any unauthorized use of your account to IT Administration.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>4. Acceptable Use</h2>
            <p style={{ marginBottom: '8px' }}>You agree to use the System only for legitimate educational and administrative purposes. You must not:</p>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Use the System for any unlawful purpose or in violation of KCP policies.</li>
              <li>Upload malicious files, viruses, or harmful code.</li>
              <li>Attempt to circumvent security measures, access controls, or authentication systems.</li>
              <li>Use AI-generated content without review and verification for accuracy and appropriateness.</li>
              <li>Misrepresent AI-generated content as original human-authored work in academic submissions.</li>
              <li>Reverse-engineer, decompile, or attempt to extract the source code of the System.</li>
              <li>Use automated tools (bots, scrapers) to access or interact with the System without authorization.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>5. AI-Generated Content Disclaimer</h2>
            <p style={{ marginBottom: '8px' }}>The System uses artificial intelligence to generate syllabi, course materials, activities, and assessments. You acknowledge and agree that:</p>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>AI-generated content is provided "as is" and may contain errors, inaccuracies, or omissions.</li>
              <li>All AI-generated content must be reviewed, verified, and approved by a qualified instructor before publication or use in instruction.</li>
              <li>AI-generated content does not constitute professional academic advice and should be adapted to the specific needs of the course and students.</li>
              <li>KCP does not guarantee the accuracy, completeness, or fitness of AI-generated content for any particular purpose.</li>
              <li>The confidence scores and provenance information are estimates and should not be treated as definitive quality indicators.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>6. Intellectual Property</h2>
            <p>
              All content generated by the System on behalf of KCP is the intellectual property of KCP. Instructors retain rights to their original contributions and notes. The System's design, code, and algorithms are proprietary to KCP and its development partners. You may not copy, modify, distribute, or reverse-engineer any part of the System.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>7. Data and Privacy</h2>
            <p>
              Your use of the System is also governed by our <Link to="/privacy" style={{ color: 'var(--sky-600)', fontWeight: 600 }}>Privacy Policy</Link>. By using the System, you consent to the collection, use, and processing of your data as described therein.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, KCP shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the System. KCP's total liability shall not exceed the amount you paid (if any) to access the System. The System is provided "as is" without warranties of any kind, express or implied.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>9. Termination</h2>
            <p>
              KCP reserves the right to suspend or terminate your access to the System at any time, without prior notice, for conduct that violates these Terms or is harmful to the System, other users, or KCP. Upon termination, your right to use the System ceases immediately.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>10. Modifications</h2>
            <p>
              KCP reserves the right to modify these Terms at any time. Changes will be posted within the System and are effective immediately upon posting. Continued use of the System after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Republic of the Philippines. Any disputes shall be resolved in the appropriate courts of Benguet Province.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>12. Contact</h2>
            <p>
              For questions about these Terms of Use:<br />
              <strong>Email:</strong> admin@kcp.edu.ph<br />
              <strong>Phone:</strong> +63 (074) 422-XXXX<br />
              <strong>Address:</strong> King's College of the Philippines, La Trinidad, Benguet, Philippines
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
