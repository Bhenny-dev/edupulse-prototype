import { HelpCircle, BookOpen, MessageSquare, ChevronDown, ExternalLink } from 'lucide-react'
import { useState } from 'react'

const FAQ_ITEMS = [
  { q: 'How does course loading work?', a: 'The Dean or Associate Dean loads each released course to an instructor in Course Loading. AI can suggest a ranked candidate per course (Assist) or propose the whole load at once (Auto) — either way, priority 1 is a master\'s degree holder and priority 2 is specialization or forte in the course. Nothing is assigned until you confirm it.' },
  { q: 'How do I build a syllabus, and what happens to it after?', a: 'On the Syllabus page, upload an existing file or build one with AI (Assist, section by section, or Auto for a full draft). It saves as Drafted either way — check and correct it, then Mark as Checked. Download it for the offline signatory route (Dean review → CAO approval → EVP noting), then upload the signed file back and extract the Course Outline. That activates the syllabus.' },
  { q: 'Why can\'t the Dean approve my syllabus inside EduPulse?', a: 'The signatory chain happens outside the system, on the downloaded file. EduPulse tracks which station a syllabus is at (Drafted → Checked → Out for Approval → Approved → Active) but the actual review and signatures are offline.' },
  { q: 'How does AI courseware generation work?', a: 'Once a syllabus is Active (its Course Outline is extracted), go to Courseware and generate by week, by term, or the whole outline. Each outline row\'s Contents + ILO drive learning materials, its Assessments column drives assessment items, and its TLA informs the activity type. Everything lands as a Draft — you finalize it, then publish. Only published items reach students.' },
  { q: 'Can students access unpublished courseware?', a: 'No. Students only see items published to their block. Draft and checked-but-unpublished items stay visible to the instructor only.' },
  { q: 'What is Student Monitoring, and is it my official grade sheet?', a: 'No — it\'s for tracking only. Student Monitoring has two views: Assessment Scores (auto-recorded scores per student per course) and Learning Material Access (which documents students have opened). Your instructor can send reminders about missing activities or unopened files. Institutional grades (MG/TFG/FG) are computed in the official KCP grading sheet, outside EduPulse.' },
  { q: 'How do I view student performance?', a: 'Performance shows topic mastery (mastered vs. needs-review) and score-threshold alerts for your own sections. College-wide syllabus status, delivery progress, and student oversight live in Monitor (Dean / Associate Dean).' },
  { q: 'How do I choose an AI provider?', a: 'Go to Settings > AI Provider (visible to instructors and the Dean/Associate Dean). Choose between a locally hosted model or a free API key — there is nothing else to configure.' },
  { q: 'What happens if I edit a syllabus mid-semester?', a: 'EduPulse flags any published courseware that is now out of alignment with the updated outline row, so you know what needs a refresh.' },
  { q: 'What can Pulse (the AI guide) do for a student?', a: 'Pulse can remind you about unopened materials or unanswered assessments and help you navigate the course. It will never answer or review your assessment items for you.' },
]

export default function HelpSupport() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="container">
      <div className="page-header">
        <h1>Help & Support</h1>
      </div>

      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header">
            <h3><BookOpen size={18} /> Getting Started</h3>
          </div>
          <div className="card-body">
            <p style={{ marginBottom: '12px' }}>EduPulse follows the confirmed CIT business flow, from records intake to student results:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { step: '1', title: 'Load Courses', desc: 'Dean/Assoc Dean load released courses to instructors — AI suggests or proposes, a human always confirms' },
                { step: '2', title: 'Build & Approve the Syllabus', desc: 'AI-assisted draft → checked → downloaded for the offline signatory route → approved file uploaded → outline extracted' },
                { step: '3', title: 'Generate Courseware', desc: 'From the extracted Course Outline, by week/term/whole outline — draft, finalize, then publish' },
                { step: '4', title: 'Students Open & Answer', desc: 'Students see only what\'s published to their block; Pulse guides and reminds, never answers for them' },
                { step: '5', title: 'Monitor Students', desc: 'Student Monitoring (assessment scores + material access tracking) plus Dean/Assoc Dean delivery monitoring and notifications' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', gap: '12px', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--sky-50)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)', background: 'var(--sky-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.title}</div>
                    <div className="text-sm text-muted">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3><MessageSquare size={18} /> Contact Support</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>IT Help Desk</div>
                <div className="text-sm text-muted">helpdesk@kcp.edu.ph</div>
                <div className="text-sm text-muted">+63 (074) 442-XXXX</div>
              </div>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Office Hours</div>
                <div className="text-sm text-muted">Monday - Friday, 8:00 AM - 5:00 PM</div>
              </div>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Quick Links</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <a href="#" style={{ fontSize: '0.8125rem', color: 'var(--sky-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ExternalLink size={12} /> CHED IT Curriculum Guidelines
                  </a>
                  <a href="#" style={{ fontSize: '0.8125rem', color: 'var(--sky-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ExternalLink size={12} /> KCP Faculty Portal
                  </a>
                  <a href="#" style={{ fontSize: '0.8125rem', color: 'var(--sky-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ExternalLink size={12} /> Student Information System
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3><HelpCircle size={18} /> Frequently Asked Questions</h3>
        </div>
        <div className="card-body">
          {FAQ_ITEMS.map((faq, i) => (
            <div key={i} style={{ borderBottom: i < FAQ_ITEMS.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '14px 0', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--gray-800)' }}>{faq.q}</span>
                <ChevronDown size={16} style={{
                  color: 'var(--gray-400)',
                  transform: openFaq === i ? 'rotate(180deg)' : 'none',
                  transition: 'transform 200ms',
                }} />
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 0 14px', fontSize: '0.875rem', color: 'var(--gray-600)', lineHeight: 1.6, animation: 'fadeSlideUp 200ms' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
