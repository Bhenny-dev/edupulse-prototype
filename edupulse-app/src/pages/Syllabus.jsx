import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_SYLLABI, CURRICULUM_COURSES, INSTRUCTORS, SYLLABUS_VERSIONS, DEFAULT_INSTITUTIONAL_CONTEXT, SYLLABUS_STATUS_META, SYLLABUS_STATUS_ORDER } from '../data/mockData'
import { useToast } from '../context/ToastContext'
import {
  Upload, Plus, Trash2, Eye, FileText, History, Copy, Archive,
  GitCompare, Download, BookOpen, ChevronDown, ChevronUp,
  GripVertical, Sparkles, AlertCircle, CheckCircle, FileUp, ScanLine,
  Lock, X, Link2, Paperclip, Send,
} from 'lucide-react'
import VersionHistory from '../components/ui/VersionHistory'
import UploadExistingSyllabus from '../components/syllabus/UploadExistingSyllabus'
import { parsedToFormState } from '../utils/syllabusParser'
import { TEACHING_MATERIAL_CATEGORIES, ASSESSMENT_CATEGORIES } from '../data/sixLayerCategories'
import { pulse as pulseBus } from '../components/pulse/pulseBus'

// Syllabus — FLOW_SPEC Phase 2. Lifecycle: drafted → checked →
// downloaded_for_approval → approved_uploaded → active. The signatory chain
// (Dean review → CAO approval → EVP noting) happens OUTSIDE the system on the
// downloaded file — there is no in-system approval. Uploading the signed file
// and extracting Section 5 (Course Outline) is what activates a syllabus and
// unlocks courseware generation.

function StatusBadge({ status }) {
  const meta = SYLLABUS_STATUS_META[status]
  if (!meta) return <span className="badge badge-draft">{status}</span>
  return <span className={`badge badge-${meta.badge}`} title={meta.hint}>{meta.label}</span>
}

// The five stations of the lifecycle, with the offline signatory chain called
// out where it actually happens — between download and re-upload.
function LifecycleStrip() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', padding: '12px 16px', background: 'var(--sky-50)', border: '1px solid var(--sky-100)', borderRadius: 'var(--radius-lg)', marginBottom: '16px', fontSize: '0.75rem' }}>
      {SYLLABUS_STATUS_ORDER.map((s, i) => {
        const meta = SYLLABUS_STATUS_META[s]
        return (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span title={meta.hint} style={{
              padding: '3px 10px', borderRadius: 'var(--radius-full)', fontWeight: 600,
              background: 'var(--white)', color: 'var(--gray-600)', border: '1px solid var(--gray-200)',
            }}>{i + 1}. {meta.label}</span>
            {i < SYLLABUS_STATUS_ORDER.length - 1 && <span style={{ color: 'var(--gray-300)' }}>→</span>}
            {s === 'downloaded_for_approval' && (
              <span style={{ color: 'var(--gray-400)', fontStyle: 'italic', marginRight: '4px' }}>
                (offline: Dean review → CAO approval → EVP noting)
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

// Extraction preview — the parsed Section 5 (Course Outline) rows shown for
// confirmation before the syllabus becomes active (the mapping backbone for
// courseware generation). Exam weeks are flagged as milestones.
function ExtractionModal({ syllabus, onConfirm, onClose }) {
  const outline = syllabus.courseOutline || []
  const hasRows = outline.length > 0
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '760px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><ScanLine size={18} style={{ verticalAlign: 'middle' }} /> Extract Course Outline — {syllabus.courseCode}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>
          Section 5 of the approved file was parsed into the rows below. Each row becomes a generation unit for
          courseware — confirm to activate this syllabus.
        </p>
        {hasRows ? (
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', overflow: 'auto', maxHeight: '45vh' }}>
            <table className="data-table" style={{ fontSize: '0.75rem', minWidth: '640px' }}>
              <thead><tr><th>Week</th><th>Intended Learning Outcomes</th><th>Contents</th><th>Assessments</th></tr></thead>
              <tbody>
                {outline.map((row, i) => {
                  const exam = /examination/i.test(row.assessments || '') && !row.ilos
                  return (
                    <tr key={i} style={exam ? { background: 'var(--sky-50)' } : undefined}>
                      <td style={{ fontWeight: 700 }}>{row.week}{exam && <span className="badge badge-published" style={{ marginLeft: 6, fontSize: '0.5625rem' }}>Milestone</span>}</td>
                      <td>{row.ilos || <span className="text-muted">— exam week —</span>}</td>
                      <td>{Array.isArray(row.contents) ? row.contents.join('; ') : row.contents}</td>
                      <td>{row.assessments || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="warning-banner">
            <span><strong>No outline rows could be parsed from the approved file.</strong> Map the Course Outline manually in the Syllabus Builder, then extract again.</span>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!hasRows} onClick={onConfirm}>
            <CheckCircle size={14} /> Confirm Extraction — Activate Syllabus ({outline.length} weeks)
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Upload Zone ─── */
/* ─── Syllabus View Modal — 7-Section KCP Template ─── */
function SyllabusViewModal({ syllabus, onClose }) {
  const [expandedSections, setExpandedSections] = useState({ s1: true, s2: true, s3: true, s4: true, s5: true, s6: true, s7: true })
  const toggle = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  const inst = INSTRUCTORS.find(i => i.id === syllabus.instructorId)
  const ci = syllabus.courseInfo || {}
  const outline = syllabus.courseOutline || []
  const refs = syllabus.references || { books: [], onlineReferences: [] }
  const rp = syllabus.requirementsAndPolicies || {}
  const po = syllabus.programOutcomes || []
  const ic = syllabus.institutionalContext || DEFAULT_INSTITUTIONAL_CONTEXT

  const SectionHeader = ({ num, label, sectionKey }) => (
    <div
      onClick={() => toggle(sectionKey)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
        borderRadius: expandedSections[sectionKey] ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '28px', height: '28px', borderRadius: '50%', background: 'var(--sky-500)', color: '#fff',
          fontSize: '0.8125rem', fontWeight: 700,
        }}>{num}</span>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9375rem', margin: 0 }}>{label}</h3>
      </div>
      {expandedSections[sectionKey] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </div>
  )

  const Table = ({ children, style: s }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', ...s }}>
      {children}
    </table>
  )
  const Th = ({ children, width }) => (
    <th style={{ textAlign: 'left', padding: '10px 14px', background: 'var(--sky-50)', borderBottom: '2px solid var(--sky-200)', fontWeight: 700, color: 'var(--gray-700)', whiteSpace: 'nowrap', width }}>{children}</th>
  )
  const Td = ({ children, bold, style: s }) => (
    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', verticalAlign: 'top', fontWeight: bold ? 600 : 400, ...s }}>{children}</td>
  )

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.125rem' }}>{ci.courseCode || syllabus.courseCode} — {ci.courseTitle || syllabus.courseTitle}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '0.75rem' }}>
              <span className={`badge badge-${syllabus.status}`}>{syllabus.status}</span>
              <span className="badge badge-draft">v{syllabus.version}</span>
              {inst && <span className="text-muted">{inst.name}</span>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Section 1: Course Information (locked — from curriculum) */}
        <div style={{ marginBottom: '16px' }}>
          <SectionHeader num={1} label="Course Information" sectionKey="s1" />
          {expandedSections.s1 && (
            <div style={{ border: '1px solid var(--gray-200)', borderTop: 0, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '4px 0' }}>
              <Table>
                <tbody>
                  <Tr label="Course" value={ci.courseCode} />
                  <Tr label="Course Title" value={ci.courseTitle} />
                  <Tr label="Period Offered" value={ci.periodOffered} />
                  <Tr label="Academic Year" value={ci.academicYear} />
                </tbody>
              </Table>
            </div>
          )}
        </div>

        {/* Section 2: Course Description + Metadata (locked — from curriculum) */}
        <div style={{ marginBottom: '16px' }}>
          <SectionHeader num={2} label="Course Description" sectionKey="s2" />
          {expandedSections.s2 && (
            <div style={{ border: '1px solid var(--gray-200)', borderTop: 0, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)' }}>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, margin: 0, textAlign: 'justify' }}>
                  {syllabus.courseDescription || <span className="text-muted">No description provided.</span>}
                </p>
              </div>
              <Table>
                <tbody>
                  <Tr label="Credit Units" value={ci.creditUnits ? `${ci.creditUnits} unit${ci.creditUnits !== 1 ? 's' : ''}` : null} />
                  <Tr label="Classification" value={ci.classification} />
                  <Tr label="No. of Hours" value={ci.noOfHours ? `${ci.noOfHours} hours` : null} />
                  <Tr label="Prerequisites" value={ci.prerequisites?.length ? ci.prerequisites.join(', ') : 'None'} />
                </tbody>
              </Table>
            </div>
          )}
        </div>

        {/* Section 3: Institutional Context */}
        <div style={{ marginBottom: '16px' }}>
          <SectionHeader num={3} label="Vision, Mission, Objectives — King's College of the Philippines" sectionKey="s3" />
          {expandedSections.s3 && (
            <div style={{ border: '1px solid var(--gray-200)', borderTop: 0, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '16px 20px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--sky-600)' }}>KCP</h4>
              <Table>
                <tbody>
                  <Tr label="Vision" value={ic.kcp.vision} />
                  <Tr label="Mission" value={ic.kcp.mission} />
                  <Tr label="Objectives" value={<ol style={{ margin: '4px 0 0 18px', padding: 0 }}>{ic.kcp.objectives.map((o, i) => <li key={i} style={{ marginBottom: '4px' }}>{o}</li>)}</ol>} />
                  <Tr label="Core Values" value={ic.kcp.coreValues.join(', ')} />
                </tbody>
              </Table>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '16px 0 10px', color: 'var(--sky-600)' }}>College of Information Technology</h4>
              <Table>
                <tbody>
                  <Tr label="Mission" value={ic.cit.mission} />
                  <Tr label="Objectives" value={<ol style={{ margin: '4px 0 0 18px', padding: 0 }}>{ic.cit.objectives.map((o, i) => <li key={i} style={{ marginBottom: '4px' }}>{o}</li>)}</ol>} />
                </tbody>
              </Table>
            </div>
          )}
        </div>

        {/* Section 4: Program Outcomes */}
        <div style={{ marginBottom: '16px' }}>
          <SectionHeader num={4} label="Program Outcomes" sectionKey="s4" />
          {expandedSections.s4 && (
            <div style={{ border: '1px solid var(--gray-200)', borderTop: 0, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '16px 20px' }}>
              {po.length > 0 ? (
                <ol style={{ margin: 0, paddingLeft: '20px' }}>
                  {po.map((p, i) => <li key={i} style={{ marginBottom: '6px', fontSize: '0.875rem' }}>{p}</li>)}
                </ol>
              ) : <p className="text-muted" style={{ margin: 0 }}>No program outcomes specified.</p>}
            </div>
          )}
        </div>

        {/* Section 5: Course Outline */}
        <div style={{ marginBottom: '16px' }}>
          <SectionHeader num={5} label="Course Outline" sectionKey="s5" />
          {expandedSections.s5 && (
            <div style={{ border: '1px solid var(--gray-200)', borderTop: 0, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', overflow: 'auto' }}>
              {outline.length > 0 ? (
                <Table style={{ minWidth: '700px' }}>
                  <thead>
                    <tr>
                      <Th width="60px">Week</Th>
                      <Th>Intended Learning Outcomes</Th>
                      <Th>Contents</Th>
                      <Th>Teaching-Learning Activities</Th>
                      <Th>Assessments</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {outline.map((row, i) => (
                      <tr key={i}>
                        <Td bold>{row.week}</Td>
                        <Td>{row.ilos || '—'}</Td>
                        <Td>
                          {Array.isArray(row.contents) ? (
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>{row.contents.map((c, j) => <li key={j}>{c}</li>)}</ul>
                          ) : row.contents || '—'}
                        </Td>
                        <Td>{row.activities || '—'}</Td>
                        <Td>{row.assessments || '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted" style={{ padding: '16px 20px', margin: 0 }}>No course outline yet. Use the Syllabus Builder to create one.</p>
              )}
            </div>
          )}
        </div>

        {/* Section 6: Requirements, Grading, Policy */}
        <div style={{ marginBottom: '16px' }}>
          <SectionHeader num={6} label="Course Requirements, Evaluation and Grading System, Course Policy" sectionKey="s6" />
          {expandedSections.s6 && (
            <div style={{ border: '1px solid var(--gray-200)', borderTop: 0, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '16px 20px' }}>
              {rp.courseRequirements?.length > 0 && (
                <>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 8px' }}>Course Requirements</h4>
                  <ul style={{ margin: '0 0 16px', paddingLeft: '20px' }}>{rp.courseRequirements.map((r, i) => <li key={i} style={{ marginBottom: '4px', fontSize: '0.875rem' }}>{r}</li>)}</ul>
                </>
              )}
              {rp.gradingSystem && (
                <>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 8px' }}>Evaluation and Grading System</h4>
                  <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem', whiteSpace: 'pre-line' }}>
                    {rp.gradingSystem}
                  </div>
                </>
              )}
              {rp.coursePolicy?.length > 0 && (
                <>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 8px' }}>Course Policy</h4>
                  <ol style={{ margin: 0, paddingLeft: '20px' }}>{rp.coursePolicy.map((p, i) => <li key={i} style={{ marginBottom: '4px', fontSize: '0.875rem' }}>{p}</li>)}</ol>
                </>
              )}
            </div>
          )}
        </div>

        {/* Section 7: References */}
        <div style={{ marginBottom: '16px' }}>
          <SectionHeader num={7} label="References" sectionKey="s7" />
          {expandedSections.s7 && (
            <div style={{ border: '1px solid var(--gray-200)', borderTop: 0, borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '16px 20px' }}>
              {refs.books?.length > 0 && (
                <>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 8px' }}>Books</h4>
                  <ol style={{ margin: '0 0 16px', paddingLeft: '20px' }}>{refs.books.map((b, i) => (
                    <li key={i} style={{ marginBottom: '4px', fontSize: '0.875rem' }}>{b.authors} ({b.year}). <em>{b.title}</em>. {b.publisher}.</li>
                  ))}</ol>
                </>
              )}
              {refs.onlineReferences?.length > 0 && (
                <>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 8px' }}>Online References</h4>
                  <ol style={{ margin: 0, paddingLeft: '20px' }}>{refs.onlineReferences.map((r, i) => (
                    <li key={i} style={{ marginBottom: '4px', fontSize: '0.875rem' }}>{r.title}. <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-600)' }}>{r.url}</a></li>
                  ))}</ol>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', padding: '12px 0', borderTop: '1px solid var(--gray-200)' }}>
          <button className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function Tr({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <tr>
      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', fontWeight: 600, width: '180px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{label}</td>
      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', verticalAlign: 'top' }}>{value}</td>
    </tr>
  )
}

/* ─── Multi-Select Dropdown for Six-Layer Categories ─── */
function MultiSelectDropdown({ categories, selected = [], onChange, placeholder = 'Select items...' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (item) => {
    const next = selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]
    onChange(next)
  }

  const remove = (item) => onChange(selected.filter(s => s !== item))

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center',
          minHeight: '30px', padding: '4px 6px', border: '1px solid var(--gray-300)',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem',
          background: 'var(--bg)',
        }}
      >
        {selected.length === 0 && <span style={{ color: 'var(--gray-400)' }}>{placeholder}</span>}
        {selected.map(item => (
          <span key={item} style={{
            display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '1px 6px',
            background: 'var(--sky-100)', color: 'var(--sky-700)', borderRadius: 'var(--radius-sm)',
            fontSize: '0.6875rem', whiteSpace: 'nowrap',
          }}>
            {item}
            <button onClick={(e) => { e.stopPropagation(); remove(item) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.625rem', lineHeight: 1 }}><X size={10} /></button>
          </span>
        ))}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          maxHeight: '200px', overflowY: 'auto', background: 'var(--bg)',
          border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', marginTop: '4px',
        }}>
          {categories.map(cat => (
            <div key={cat.layer}>
              <div style={{ padding: '4px 10px', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--sky-600)', background: 'var(--gray-50)', position: 'sticky', top: 0 }}>
                {cat.layer}
              </div>
              {cat.items.map(item => (
                <label key={item} style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px 4px 20px',
                  fontSize: '0.75rem', cursor: 'pointer', background: selected.includes(item) ? 'var(--sky-50)' : 'transparent',
                }}>
                  <input type="checkbox" checked={selected.includes(item)} onChange={() => toggle(item)} style={{ width: '12px', height: '12px' }} />
                  {item}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Syllabus Builder — Single-Page 7-Section Form ─── */
function SyllabusBuilder({ onComplete, onCancel }) {
  const { addToast } = useToast()
  const ic = DEFAULT_INSTITUTIONAL_CONTEXT

  const [uploadStep, setUploadStep] = useState('pending')

  const defaultOutline = Array.from({ length: 18 }, (_, i) => ({
    week: i + 1, ilos: '', contents: [''], activities: '',
    assessments: i === 8 ? 'Midterm Examination' : i === 17 ? 'Final Examination' : '',
    teachingMaterials: [], assessmentTypes: [], resources: [],
  }))

  const [form, setForm] = useState({
    courseCode: '',
    courseTitle: '',
    courseInfo: { courseCode: '', courseTitle: '', periodOffered: '1st Semester', academicYear: '2026-2027', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: '',
    institutionalContext: {
      kcp: { ...ic.kcp },
      cit: { ...ic.cit },
    },
    programOutcomes: [''],
    courseOutline: defaultOutline,
    courseRequirements: ['Attendance', 'Reading Assignments', 'Individual Outputs/Case Analyses', 'Regular and Online Quizzes, Laboratory Activities, and Examinations per term', 'Portfolio'],
    gradingSystem: 'MG = 60% CS + 40% Exam\nTFG = 60% CS + 40% Exam\nFG = (MG + TFG) / 2',
    coursePolicy: [
      'Students are expected to attend all scheduled classes on time.',
      'A maximum of 3 absences is allowed; exceeding this may result in a failing grade in accordance with institutional policy.',
      'Late arrivals beyond 15 minutes will be considered absent.',
      'Active participation in discussions, group work, and activities is required.',
      'All assignments must be submitted on or before the deadline.',
    ],
    books: [{ title: '', authors: '', year: '', publisher: '' }],
    onlineReferences: [{ title: '', url: '' }],
  })

  // ── Pulse form interactions: listen for formAction events from Pulse ──
  const s5AutoGenerateRef = useRef(null)
  useEffect(() => { s5AutoGenerateRef.current = s5AutoGenerate })

  useEffect(() => {
    const unsub = pulseBus.subscribe(evt => {
      if (evt.type !== 'formAction') return
      const { action, payload } = evt
      switch (action) {
        case 'selectCourse':
          if (payload?.code) selectCourse(payload.code)
          break
        case 'setField':
          if (payload?.path && payload?.value !== undefined) set(payload.path, payload.value)
          break
        case 'addProgramOutcome':
          addListItem('programOutcomes', payload?.value || '')
          break
        case 'addOutlineContent':
          if (payload?.weekIdx != null) addOutlineContent(payload.weekIdx)
          break
        case 'addResource':
          if (payload?.weekIdx != null && payload?.type) addResource(payload.weekIdx, payload.type)
          break
        case 'autoGenerate':
          autoGenerateDraft()
          break
        case 's5Generate':
          s5AutoGenerateRef.current?.()
          break
        default:
          break
      }
    })
    return unsub
  }, [])

  // ── Generic form helpers ──
  const set = (path, value) => {
    setForm(prev => {
      const next = { ...prev }
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) {
        if (Array.isArray(obj[keys[i]])) {
          obj[keys[i]] = [...obj[keys[i]]]
        } else {
          obj[keys[i]] = { ...obj[keys[i]] }
        }
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return next
    })
  }

  const setList = (key, idx, value) => {
    setForm(prev => {
      const arr = [...prev[key]]
      arr[idx] = value
      return { ...prev, [key]: arr }
    })
  }

  const addListItem = (key, value) => {
    setForm(prev => ({ ...prev, [key]: [...prev[key], value] }))
  }

  const removeListItem = (key, idx) => {
    setForm(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }))
  }

  // ── Select course — auto-fills locked fields from curriculum ──
  const selectCourse = (code) => {
    const subj = CURRICULUM_COURSES.find(s => s.code === code)
    if (subj) {
      const noOfHours = subj.units * 18
      const periodOffered = subj.semester === 1 ? '1st Semester' : subj.semester === 2 ? '2nd Semester' : 'Summer'
      const academicYear = '2026-2027'
      setForm(prev => ({
        ...prev,
        courseCode: subj.code,
        courseTitle: subj.title,
        courseDescription: subj.description || '',
        courseInfo: {
          courseCode: subj.code,
          courseTitle: subj.title,
          periodOffered,
          academicYear,
          creditUnits: subj.units,
          classification: subj.classification || 'Major',
          noOfHours,
          prerequisites: subj.prerequisites || [],
        },
        programOutcomes: subj.programOutcomes?.length
          ? [...subj.programOutcomes]
          : prev.programOutcomes.some(o => o.trim()) ? prev.programOutcomes : [''],
        courseOutline: prev.courseOutline.map((row, i) => {
          if (row.week === 9 || row.week === 18) return row
          return {
            ...row,
            ilos: '',
            contents: row.contents.some(c => c.trim()) ? row.contents : [''],
            activities: '',
            assessments: '',
          }
        }),
      }))
      setErrors({})
    }
  }

  // ── Upload existing syllabus — merge parsed data into form ──
  const handleUploadExtract = (parsed) => {
    const merged = parsedToFormState(parsed)
    setForm(prev => ({
      ...prev,
      ...merged,
      institutionalContext: prev.institutionalContext,
    }))
    setUploadStep('done')
    addToast('Syllabus content extracted — review and edit each section below', 'success')
  }

  // ── Validation ──
  const validate = () => {
    const e = {}
    if (!form.courseInfo.courseCode) e.courseCode = 'Required — select a course'
    if (form.programOutcomes.filter(o => o.trim()).length === 0) e.programOutcomes = 'At least one program outcome required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Saving always lands as `drafted` — whether AI-generated (Auto) or written
  // by hand. Nothing moves further until the instructor explicitly checks it.
  const handleSave = () => {
    if (!validate()) { addToast('Please fix the highlighted fields', 'error'); return }
    addToast('Syllabus saved as Drafted — check and correct it before downloading for approval', 'success')
    onComplete()
  }

  // "Checked" = the instructor has verified the draft. Next step is to
  // download the file for the offline signatory route (Dean → CAO → EVP).
  const handleMarkChecked = () => {
    if (!validate()) { addToast('Please fix the highlighted fields before marking as checked', 'error'); return }
    addToast('Syllabus marked as Checked — you can now download it for the approval route', 'success')
    onComplete()
  }

  // AI Auto mode: generate a complete draft in one pass. Output is always
  // `drafted` — the instructor must check and correct it (FLOW_SPEC Phase 2).
  const [errors, setErrors] = useState({})
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [aiDrafted, setAiDrafted] = useState(false)
  const autoGenerateDraft = () => {
    if (!form.courseCode) { addToast('Select a course first', 'error'); return }
    setAutoGenerating(true)
    setTimeout(() => {
      const course = CURRICULUM_COURSES.find(s => s.code === form.courseCode)
      const outline = form.courseOutline.map((row, i) => {
        if (row.week === 9 || row.week === 18) return row
        return {
          ...row,
          ilos: row.ilos || `Apply ${course?.title || 'course'} concepts covered in week ${row.week}.`,
          contents: row.contents.some(c => c.trim()) ? row.contents : [`${course?.title || 'Course'} — week ${row.week} topic (AI-proposed from the curriculum reference)`],
          activities: row.activities || 'Lecture-discussion, hands-on exercise',
          assessments: row.assessments || (i % 2 === 0 ? 'Quiz' : 'Lab exercise'),
        }
      })
      setForm(prev => ({
        ...prev,
        courseDescription: prev.courseDescription || course?.description || '',
        courseInfo: { ...prev.courseInfo, courseDescription: prev.courseDescription || course?.description || '' },
        programOutcomes: prev.programOutcomes.some(o => o.trim()) ? prev.programOutcomes : [`Apply ${course?.title || 'course'} principles to real-world IT problems (AI-proposed from PSG outcomes — select and edit)`],
        courseOutline: outline,
      }))
      setAutoGenerating(false)
      setAiDrafted(true)
      addToast('Full draft generated (Auto mode). Review every section — it stays Drafted until you check it.', 'info')
    }, 1800)
  }

  // ── Outline field editor ──
  const setOutlineField = (idx, field, value) => {
    setForm(prev => {
      const outline = [...prev.courseOutline]
      outline[idx] = { ...outline[idx], [field]: value }
      return { ...prev, courseOutline: outline }
    })
  }

  const setOutlineContent = (weekIdx, contentIdx, value) => {
    setForm(prev => {
      const outline = [...prev.courseOutline]
      const contents = [...outline[weekIdx].contents]
      contents[contentIdx] = value
      outline[weekIdx] = { ...outline[weekIdx], contents }
      return { ...prev, courseOutline: outline }
    })
  }

  const addOutlineContent = (weekIdx) => {
    setForm(prev => {
      const outline = [...prev.courseOutline]
      outline[weekIdx] = { ...outline[weekIdx], contents: [...outline[weekIdx].contents, ''] }
      return { ...prev, courseOutline: outline }
    })
  }

  const removeOutlineContent = (weekIdx, contentIdx) => {
    setForm(prev => {
      const outline = [...prev.courseOutline]
      outline[weekIdx] = { ...outline[weekIdx], contents: outline[weekIdx].contents.filter((_, i) => i !== contentIdx) }
      return { ...prev, courseOutline: outline }
    })
  }

  // ── Resource attachments per week ──
  const [expandedResources, setExpandedResources] = useState({})
  const toggleResources = (idx) => setExpandedResources(prev => ({ ...prev, [idx]: !prev[idx] }))

  const addResource = (weekIdx, type) => {
    setForm(prev => {
      const outline = [...prev.courseOutline]
      const resources = [...(outline[weekIdx].resources || []), { type, name: '', url: '' }]
      outline[weekIdx] = { ...outline[weekIdx], resources }
      return { ...prev, courseOutline: outline }
    })
  }

  const updateResource = (weekIdx, resIdx, field, value) => {
    setForm(prev => {
      const outline = [...prev.courseOutline]
      const resources = [...outline[weekIdx].resources]
      resources[resIdx] = { ...resources[resIdx], [field]: value }
      outline[weekIdx] = { ...outline[weekIdx], resources }
      return { ...prev, courseOutline: outline }
    })
  }

  const removeResource = (weekIdx, resIdx) => {
    setForm(prev => {
      const outline = [...prev.courseOutline]
      outline[weekIdx] = { ...outline[weekIdx], resources: outline[weekIdx].resources.filter((_, i) => i !== resIdx) }
      return { ...prev, courseOutline: outline }
    })
  }

  // ── Section 5 AI Chat (now handled inside Pulse walkthrough panel) ──

  // Auto-generate: fill ALL outline fields from curriculum data (called via pulseBus formAction from Pulse panel)
  const s5AutoGenerate = () => {
    const course = CURRICULUM_COURSES.find(s => s.code === form.courseCode)
    if (!course) { addToast('Select a course first', 'error'); return }

    setTimeout(() => {
      // Strategy 1: Course has pre-filled courseOutline in curriculum — use it directly
      if (course.courseOutline && course.courseOutline.length > 0) {
        setForm(prev => {
          const merged = prev.courseOutline.map((emptyRow, i) => {
            const curriculumRow = course.courseOutline.find(r => r.week === emptyRow.week)
            if (!curriculumRow) return emptyRow
            return {
              ...emptyRow,
              ilos: curriculumRow.ilos || '',
              contents: curriculumRow.contents?.length ? curriculumRow.contents : [''],
              activities: curriculumRow.activities || '',
              assessments: curriculumRow.assessments || '',
              teachingMaterials: curriculumRow.teachingMaterials?.length ? curriculumRow.teachingMaterials : [],
              assessmentTypes: curriculumRow.assessmentTypes?.length ? curriculumRow.assessmentTypes : [],
            }
          })
          return { ...prev, courseOutline: merged }
        })
        addToast(`Loaded ${course.courseOutline.length}-week outline from curriculum`, 'success')
        return
      }

      // Strategy 2: Course has topics array — distribute across 18 weeks
      if (course.topics && course.topics.length > 0) {
        const nonExamWeeks = []
        for (let w = 1; w <= 18; w++) { if (w !== 9 && w !== 18) nonExamWeeks.push(w) }

        // Flatten all subtopics and items from the topics array
        const allSubtopics = []
        course.topics.forEach(topic => {
          if (topic.subtopics?.length) {
            topic.subtopics.forEach(sub => {
              allSubtopics.push({ topicTitle: topic.title, subtopic: sub.title, items: sub.items || [], ilos: topic.ilos || [] })
            })
          } else {
            allSubtopics.push({ topicTitle: topic.title, subtopic: topic.title, items: [], ilos: topic.illos || [] })
          }
        })

        // Distribute subtopics evenly across non-exam weeks
        const perWeek = Math.ceil(allSubtopics.length / nonExamWeeks.length)

        const activitiesByDifficulty = [
          ['Lecture-discussion, class orientation', 'Recitation, guided practice'],
          ['Hands-on laboratory exercise', 'Code-along, demonstration'],
          ['Group coding activity, peer review', 'Problem-solving workshop'],
          ['Interactive lecture, code walkthrough', 'Seatwork, short quiz'],
          ['Hands-on laboratory exercises', 'Practical exercise, output submission'],
          ['Demonstration, guided practice', 'Quiz, worksheets'],
          ['Group activity, collaborative exercise', 'Lab exercise, lab report'],
          ['Research activity, concept mapping', 'Case study analysis'],
          ['Project-based learning, capstone work', 'Presentation, peer evaluation'],
          ['Capstone project work, implementation', 'Project milestone, reflection essay'],
        ]

        const assessmentPool = [
          { text: 'Quiz', types: ['Quizzes'] },
          { text: 'Lab exercise', types: ['Lab Reports', 'Demonstrations'] },
          { text: 'Seatwork', types: ['Worksheets'] },
          { text: 'Short quiz', types: ['Quizzes', 'Recitations'] },
          { text: 'Group activity output', types: ['Group Presentations', 'Oral Explanations'] },
          { text: 'Problem set', types: ['Applied Problem-Solving'] },
          { text: 'Case study analysis', types: ['Case Study Analyses'] },
          { text: 'Project milestone', types: ['Projects', 'Project Reports'] },
        ]

        const materialPool = [
          ['Lecture Notes', 'Reading Lists'],
          ['Concept Maps', 'Case Studies'],
          ['Lab Manuals', 'Worksheets'],
          ['Infographics', 'Summary Guides'],
          ['Debates', 'Comparative Charts'],
          ['Role-Plays', 'Applied Problem-Solving Reports'],
        ]

        setForm(prev => {
          const outline = prev.courseOutline.map((row, i) => {
            if (row.week === 9 || row.week === 18) return row

            const weekIdx = nonExamWeeks.indexOf(row.week)
            if (weekIdx === -1) return row

            const startIdx = weekIdx * perWeek
            const endIdx = Math.min(startIdx + perWeek, allSubtopics.length)
            const weekSubs = allSubtopics.slice(startIdx, endIdx)

            // Build contents from subtopic items
            const contents = []
            weekSubs.forEach(s => {
              if (s.items.length > 0) {
                s.items.forEach(item => contents.push(item))
              } else {
                contents.push(s.subtopic)
              }
            })
            const finalContents = contents.length > 0 ? contents.slice(0, 4) : [`Week ${row.week} topic`]

            // Build ILO from topic ilos
            const topicTitles = [...new Set(weekSubs.map(s => s.topicTitle))]
            const iloText = `Describe and apply the concepts of ${topicTitles.join(', ')} covered in week ${row.week}.`

            // Pick activities and assessments based on week position
            const actSet = activitiesByDifficulty[weekIdx % activitiesByDifficulty.length]
            const assess = assessmentPool[weekIdx % assessmentPool.length]
            const mats = materialPool[weekIdx % materialPool.length]

            return {
              ...row,
              ilos: iloText,
              contents: finalContents,
              activities: actSet[weekIdx % actSet.length],
              assessments: assess.text,
              teachingMaterials: mats,
              assessmentTypes: assess.types,
            }
          })
          return { ...prev, courseOutline: outline }
        })
        addToast(`Generated 18-week outline from ${course.topics.length} curriculum topics`, 'success')
        return
      }

      // Strategy 3: No curriculum data — generate generic outline from course title
      const courseTitle = course.courseInfo?.courseTitle || form.courseInfo?.courseTitle || 'this course'
      setForm(prev => {
        const outline = prev.courseOutline.map((row, i) => {
          if (row.week === 9 || row.week === 18) return row
          const weekIdx = i < 8 ? i : i - 1
          return {
            ...row,
            ilos: `Describe and apply the concepts of ${courseTitle} covered in week ${row.week}.`,
            contents: [`Week ${row.week} — ${courseTitle} topic`],
            activities: weekIdx % 2 === 0 ? 'Lecture-discussion with visual aids' : 'Hands-on laboratory exercise',
            assessments: weekIdx % 2 === 0 ? 'Quiz' : 'Lab exercise',
            teachingMaterials: ['Lecture Notes', 'Reading Lists'],
            assessmentTypes: ['Quizzes'],
          }
        })
        return { ...prev, courseOutline: outline }
      })
      addToast('Generated generic outline — add curriculum data for richer content', 'success')
    }, 1500)
  }

  // ── Drag-and-drop reorder for outline rows ──
  const [dragIdx, setDragIdx] = useState(null)

  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, targetIdx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === targetIdx) return
    setForm(prev => {
      const outline = [...prev.courseOutline]
      const [moved] = outline.splice(dragIdx, 1)
      outline.splice(targetIdx, 0, moved)
      return { ...prev, courseOutline: outline }
    })
    setDragIdx(null)
  }

  const handleDragEnd = () => setDragIdx(null)

  // ── Split outline into midterm/finals ──
  const midtermWeeks = form.courseOutline.filter(w => w.week <= 9)
  const finalsWeeks = form.courseOutline.filter(w => w.week >= 10)

  // ── Auto-collect resources from all weeks for Section 7 sync ──
  const autoCollectedResources = useMemo(() => {
    const files = []
    const links = []
    form.courseOutline.forEach(row => {
      (row.resources || []).forEach(res => {
        if (res.type === 'file' && res.name.trim()) {
          files.push({ name: res.name.trim(), description: res.url.trim(), week: row.week })
        } else if (res.type === 'link' && res.url.trim()) {
          links.push({ title: res.name.trim() || res.url.trim(), url: res.url.trim(), week: row.week })
        }
      })
    })
    return { files, links }
  }, [form.courseOutline])

  const SectionLabel = ({ num, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', marginTop: '24px' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px', borderRadius: '50%', background: 'var(--sky-500)', color: '#fff',
        fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0,
      }}>{num}</span>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9375rem', margin: 0 }}>{label}</h3>
    </div>
  )

  const FormGroup = ({ label, required, error, children, note }) => (
    <div className="form-group" style={{ marginBottom: '12px' }}>
      <label className="form-label">{label}{required && ' *'}</label>
      {note && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontStyle: 'italic', marginBottom: '6px' }}>{note}</div>}
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )

  const isExamWeek = (w) => w === 9 || w === 18

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem' }}>Syllabus Builder</h1>
          <p className="text-sm text-muted">Official KCP 7-section template. Upload an existing syllabus or work section by section with AI assist, or let Auto mode generate a full draft for you to check.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {uploadStep === 'done' && (
            <button className="btn btn-secondary" onClick={() => { setUploadStep('pending'); addToast('Upload a new syllabus to replace current content', 'info') }}>
              <Upload size={14} /> Upload Different
            </button>
          )}
          <button className="btn btn-primary" onClick={autoGenerateDraft} disabled={autoGenerating || !form.courseCode} title={!form.courseCode ? 'Select a course first' : 'Generate a complete draft grounded in the curriculum reference'}>
            {autoGenerating ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Generating full draft…</>
            ) : (
              <><Sparkles size={14} /> AI Auto — Full Draft</>
            )}
          </button>
        </div>
      </div>

      {/* Upload existing syllabus step */}
      {uploadStep === 'pending' && (
        <UploadExistingSyllabus
          onExtract={handleUploadExtract}
          onCancel={() => setUploadStep('done')}
        />
      )}

      {aiDrafted && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: 'var(--amber-50, #fffbeb)', borderRadius: 'var(--radius-md)', border: '1px solid var(--amber-200, #fde68a)', margin: '8px 0', fontSize: '0.8125rem' }}>
          <Sparkles size={16} style={{ color: 'var(--amber-500, #f59e0b)', flexShrink: 0, marginTop: '2px' }} />
          <span style={{ color: 'var(--amber-800, #92400e)' }}>
            <strong>AI-generated draft.</strong> It will be saved with status <strong>Drafted</strong> — check and correct every
            section before anything else can happen. Nothing AI-generated moves downstream without your explicit action.
          </span>
        </div>
      )}

      {/* Section 1: Course Information — LOCKED (auto-filled from curriculum) */}
      <div className="card" data-section="1" style={{ marginTop: '16px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '50%', background: 'var(--sky-500)', color: '#fff',
              fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0,
            }}>1</span>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9375rem', margin: 0 }}>Course Information</h3>
            {form.courseCode && <Lock size={14} style={{ color: 'var(--gray-400)' }} title="Auto-filled from curriculum — not editable" />}
          </div>
          <div className="grid-2">
            <FormGroup label="Course" required error={errors.courseCode} note="Select a course — all fields auto-fill from curriculum">
              <select className={`form-input ${errors.courseCode ? 'form-input-error' : ''}`} value={form.courseCode} onChange={e => selectCourse(e.target.value)}>
                <option value="">Select a course...</option>
                {CURRICULUM_COURSES.map(s => <option key={s.code} value={s.code}>{s.code} — {s.title}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Course Title" required>
              <input className="form-input" value={form.courseInfo.courseTitle} readOnly style={{ background: 'var(--gray-50)', cursor: 'not-allowed' }} placeholder="Auto-fills from curriculum" />
            </FormGroup>
            <FormGroup label="Period Offered" required>
              <input className="form-input" value={form.courseInfo.periodOffered} readOnly style={{ background: 'var(--gray-50)', cursor: 'not-allowed' }} />
            </FormGroup>
            <FormGroup label="Academic Year" required>
              <input className="form-input" value={form.courseInfo.academicYear} readOnly style={{ background: 'var(--gray-50)', cursor: 'not-allowed' }} />
            </FormGroup>
          </div>
        </div>
      </div>

      {/* Section 2: Course Description + Metadata — LOCKED (auto-filled from curriculum) */}
      <div className="card" data-section="2" style={{ marginTop: '16px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', borderRadius: '50%', background: 'var(--sky-500)', color: '#fff',
              fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0,
            }}>2</span>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9375rem', margin: 0 }}>Course Description</h3>
            {form.courseCode && <Lock size={14} style={{ color: 'var(--gray-400)' }} title="Auto-filled from curriculum — not editable" />}
          </div>
          {form.courseCode ? (
            <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {/* Course Description */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Course Description</div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, margin: 0, color: 'var(--gray-800)' }}>
                  {form.courseDescription || <span className="text-muted">No description available.</span>}
                </p>
              </div>
              {/* Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0 }}>
                <div style={{ padding: '12px 16px', borderRight: '1px solid var(--gray-200)', borderBottom: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Credit Units</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>{form.courseInfo.creditUnits} unit{form.courseInfo.creditUnits !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ padding: '12px 16px', borderRight: '1px solid var(--gray-200)', borderBottom: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Classification</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>{form.courseInfo.classification}</div>
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-200)' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>No. of Hours</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>{form.courseInfo.noOfHours} hours</div>
                </div>
              </div>
              {/* Prerequisites */}
              <div style={{ padding: '12px 16px', background: 'var(--gray-50)' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Prerequisites</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>
                  {form.courseInfo.prerequisites.length > 0
                    ? form.courseInfo.prerequisites.map(code => {
                        const course = CURRICULUM_COURSES.find(c => c.code === code)
                        return course ? `${code} — ${course.title}` : code
                      }).join(', ')
                    : 'None'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
              Select a course in Section 1 to auto-fill course details.
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Institutional Context — KCP + CIT */}
      <div className="card" data-section="3" style={{ marginTop: '16px' }}>
        <div className="card-body">
          <SectionLabel num={3} label="Vision, Mission, Objectives — King's College of the Philippines" />

          {/* KCP */}
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--sky-600)' }}>KCP — Vision, Mission, Objectives, Core Values</h4>
          <div className="grid-2" style={{ gap: '12px', marginBottom: '16px' }}>
            <FormGroup label="Vision">
              <textarea className="form-input" rows={3} value={form.institutionalContext.kcp.vision} onChange={e => set('institutionalContext.kcp.vision', e.target.value)} style={{ resize: 'vertical' }} />
            </FormGroup>
            <FormGroup label="Mission">
              <textarea className="form-input" rows={3} value={form.institutionalContext.kcp.mission} onChange={e => set('institutionalContext.kcp.mission', e.target.value)} style={{ resize: 'vertical' }} />
            </FormGroup>
          </div>
          <FormGroup label="Objectives">
            {form.institutionalContext.kcp.objectives.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--sky-500)', minWidth: '24px', fontSize: '0.8125rem' }}>{i + 1}.</span>
                <input className="form-input" style={{ flex: 1 }} value={o} onChange={e => {
                  const obj = [...form.institutionalContext.kcp.objectives]; obj[i] = e.target.value
                  set('institutionalContext.kcp.objectives', obj)
                }} />
                {form.institutionalContext.kcp.objectives.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => {
                  const obj = form.institutionalContext.kcp.objectives.filter((_, j) => j !== i); set('institutionalContext.kcp.objectives', obj)
                }}><Trash2 size={14} /></button>}
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => {
              set('institutionalContext.kcp.objectives', [...form.institutionalContext.kcp.objectives, ''])
            }}><Plus size={14} /> Add Objective</button>
          </FormGroup>
          <FormGroup label="Core Values">
            <input className="form-input" value={form.institutionalContext.kcp.coreValues.join(', ')} onChange={e => set('institutionalContext.kcp.coreValues', e.target.value.split(',').map(v => v.trim()).filter(Boolean))} placeholder="e.g., Justice, Truth, Freedom" />
          </FormGroup>

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--gray-200)' }} />

          {/* CIT */}
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--sky-600)' }}>College of Information Technology — Mission, Objectives</h4>
          <FormGroup label="Mission">
            <textarea className="form-input" rows={3} value={form.institutionalContext.cit.mission} onChange={e => set('institutionalContext.cit.mission', e.target.value)} style={{ resize: 'vertical' }} />
          </FormGroup>
          <FormGroup label="Objectives">
            {form.institutionalContext.cit.objectives.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--sky-500)', minWidth: '24px', fontSize: '0.8125rem' }}>{i + 1}.</span>
                <input className="form-input" style={{ flex: 1 }} value={o} onChange={e => {
                  const obj = [...form.institutionalContext.cit.objectives]; obj[i] = e.target.value
                  set('institutionalContext.cit.objectives', obj)
                }} />
                {form.institutionalContext.cit.objectives.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => {
                  const obj = form.institutionalContext.cit.objectives.filter((_, j) => j !== i); set('institutionalContext.cit.objectives', obj)
                }}><Trash2 size={14} /></button>}
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => {
              set('institutionalContext.cit.objectives', [...form.institutionalContext.cit.objectives, ''])
            }}><Plus size={14} /> Add Objective</button>
          </FormGroup>
        </div>
      </div>

      {/* Section 4: Program Outcomes */}
      <div className="card" data-section="4" style={{ marginTop: '16px' }}>
        <div className="card-body">
          <SectionLabel num={4} label="Program Outcomes" />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: 'var(--amber-50, #fef3c7)', borderRadius: 'var(--radius-md)', border: '1px solid var(--amber-200, #fde68a)', marginBottom: '16px', fontSize: '0.8125rem' }}>
            <AlertCircle size={16} style={{ color: 'var(--amber-500, #f59e0b)', flexShrink: 0, marginTop: '2px' }} />
            <span style={{ color: 'var(--amber-800, #92400e)' }}>Please refer to your PSGs Program Outcomes and copy/enumerate here what is relevant/applicable to this course.</span>
          </div>
          <FormGroup error={errors.programOutcomes}>
            {form.programOutcomes.map((po, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--sky-500)', minWidth: '32px', fontSize: '0.8125rem' }}>{i + 1}.</span>
                <input className="form-input" style={{ flex: 1 }} value={po} onChange={e => setList('programOutcomes', i, e.target.value)} placeholder={`Program outcome ${i + 1}`} />
                {form.programOutcomes.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeListItem('programOutcomes', i)}><Trash2 size={14} /></button>}
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => addListItem('programOutcomes', '')} style={{ marginTop: '4px' }}><Plus size={14} /> Add Program Outcome</button>
          </FormGroup>
        </div>
      </div>

      {/* Section 5: Course Outline — Midterm */}
      <div className="card" data-section="5" style={{ marginTop: '16px' }}>
        <div className="card-body" style={{ overflow: 'auto' }}>
          <SectionLabel num={5} label="Course Outline" />

          {/* Midterm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', marginTop: '8px' }}>
            <span style={{ padding: '4px 12px', background: 'var(--sky-500)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.8125rem' }}>Midterm</span>
            <span className="text-sm text-muted">Weeks 1–9 · Collated content context for Midterm Examination</span>
          </div>
          <table className="data-table" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '50px' }}>Week</th>
                <th style={{ width: '18%' }}>Intended Learning Outcomes</th>
                <th style={{ width: '24%' }}>Contents</th>
                <th style={{ width: '22%' }}>Activities &amp; Teaching Materials</th>
                <th style={{ width: '22%' }}>Assessment Details &amp; Type</th>
              </tr>
            </thead>
            <tbody>
              {midtermWeeks.map((row, localIdx) => {
                const wi = localIdx
                const exam = isExamWeek(row.week)
                const resExpanded = expandedResources[wi]
                const resourceCount = (row.resources || []).length
                return (
                  <>
                    <tr
                      key={wi}
                      draggable={!exam}
                      onDragStart={e => handleDragStart(e, wi)}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, wi)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: exam ? 'var(--sky-50)' : dragIdx === wi ? 'var(--amber-50, #fef3c7)' : undefined,
                        opacity: dragIdx === wi ? 0.5 : 1,
                        borderLeft: exam ? '3px solid var(--sky-500)' : '3px solid transparent',
                      }}
                    >
                      <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '8px' }}>
                        {!exam && <GripVertical size={14} style={{ color: 'var(--gray-400)', cursor: 'grab' }} />}
                        {!exam && (
                          <button
                            onClick={() => toggleResources(wi)}
                            title={resExpanded ? 'Hide resources' : 'Attach files/links'}
                            style={{
                              display: 'block', margin: '4px auto 0', background: 'none', border: 'none',
                              cursor: 'pointer', padding: '2px', color: resourceCount > 0 ? 'var(--sky-500)' : 'var(--gray-400)',
                              position: 'relative',
                            }}
                          >
                            <Paperclip size={13} />
                            {resourceCount > 0 && (
                              <span style={{
                                position: 'absolute', top: '-4px', right: '-6px', width: '14px', height: '14px',
                                borderRadius: '50%', background: 'var(--sky-500)', color: '#fff',
                                fontSize: '0.5625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>{resourceCount}</span>
                            )}
                          </button>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.week}</td>
                      <td>
                        <textarea
                          className="form-input" rows={2} value={row.ilos}
                          onChange={e => setOutlineField(wi, 'ilos', e.target.value)}
                          placeholder={exam ? '' : 'Learning outcome...'}
                          style={{ fontSize: '0.75rem', resize: 'vertical', padding: '6px 8px' }}
                          disabled={exam}
                        />
                      </td>
                      <td>
                        {exam ? (
                          <div style={{ padding: '8px', fontWeight: 600, color: 'var(--sky-600)', fontSize: '0.8125rem' }}>Midterm Examination</div>
                        ) : (
                          <>
                            {row.contents.map((c, ci) => (
                              <div key={ci} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.625rem', color: 'var(--sky-500)', minWidth: '14px' }}>{ci + 1}.</span>
                                <input className="form-input" value={c} onChange={e => setOutlineContent(wi, ci, e.target.value)}
                                  style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }} placeholder="Topic..." />
                                {row.contents.length > 1 && <button className="btn btn-ghost" style={{ padding: '0' }} onClick={() => removeOutlineContent(wi, ci)}><Trash2 size={10} /></button>}
                              </div>
                            ))}
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '0.6875rem' }} onClick={() => addOutlineContent(wi)}><Plus size={10} /> Add Topic</button>
                          </>
                        )}
                      </td>
                      <td>
                        <textarea
                          className="form-input" rows={2} value={row.activities}
                          onChange={e => setOutlineField(wi, 'activities', e.target.value)}
                          placeholder="Activities..." disabled={exam}
                          style={{ fontSize: '0.75rem', resize: 'vertical', padding: '6px 8px', marginBottom: '4px' }}
                        />
                        {!exam && (
                          <MultiSelectDropdown
                            categories={TEACHING_MATERIAL_CATEGORIES}
                            selected={row.teachingMaterials || []}
                            onChange={(val) => setOutlineField(wi, 'teachingMaterials', val)}
                            placeholder="Teaching materials..."
                          />
                        )}
                      </td>
                      <td>
                        <input className="form-input" value={row.assessments}
                          onChange={e => setOutlineField(wi, 'assessments', e.target.value)}
                          placeholder="Assessment..." disabled={exam}
                          style={{ fontSize: '0.75rem', padding: '4px 6px', marginBottom: '4px' }}
                        />
                        {!exam && (
                          <MultiSelectDropdown
                            categories={ASSESSMENT_CATEGORIES}
                            selected={row.assessmentTypes || []}
                            onChange={(val) => setOutlineField(wi, 'assessmentTypes', val)}
                            placeholder="Assessment type..."
                          />
                        )}
                      </td>
                    </tr>
                    {!exam && resExpanded && (
                      <tr key={`res-${wi}`}>
                        <td colSpan={6} style={{ padding: '8px 16px 12px 48px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Paperclip size={12} style={{ color: 'var(--sky-500)' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>Resources for Week {row.week}</span>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '0.6875rem', marginLeft: 'auto' }} onClick={() => addResource(wi, 'file')}><Plus size={10} /> Add File</button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '0.6875rem' }} onClick={() => addResource(wi, 'link')}><Plus size={10} /> Add Link</button>
                          </div>
                          {(row.resources || []).length === 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>No resources attached — files and links added here auto-populate Section 7 (References)</div>
                          )}
                          {(row.resources || []).map((res, ri) => (
                            <div key={ri} style={{ display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'center' }}>
                              {res.type === 'file' ? <FileText size={12} style={{ color: 'var(--sky-500)', flexShrink: 0 }} /> : <Link2 size={12} style={{ color: 'var(--green-500, #22c55e)', flexShrink: 0 }} />}
                              <input className="form-input" value={res.name} onChange={e => updateResource(wi, ri, 'name', e.target.value)}
                                placeholder={res.type === 'file' ? 'File name (e.g., Lecture3-notes.pdf)' : 'Reference title'}
                                style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }} />
                              <input className="form-input" value={res.url} onChange={e => updateResource(wi, ri, 'url', e.target.value)}
                                placeholder={res.type === 'file' ? 'Description (optional)' : 'https://...'}
                                style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }} />
                              <button className="btn btn-ghost" style={{ padding: '0' }} onClick={() => removeResource(wi, ri)}><Trash2 size={10} /></button>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5: Course Outline — Finals */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-body" style={{ overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ padding: '4px 12px', background: 'var(--sky-700, #0369a1)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.8125rem' }}>Finals</span>
            <span className="text-sm text-muted">Weeks 10–18 · Collated content context for Final Examination</span>
          </div>
          <table className="data-table" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '50px' }}>Week</th>
                <th style={{ width: '18%' }}>Intended Learning Outcomes</th>
                <th style={{ width: '24%' }}>Contents</th>
                <th style={{ width: '22%' }}>Activities &amp; Teaching Materials</th>
                <th style={{ width: '22%' }}>Assessment Details &amp; Type</th>
              </tr>
            </thead>
            <tbody>
              {finalsWeeks.map((row, localIdx) => {
                const wi = 9 + localIdx
                const exam = isExamWeek(row.week)
                const resExpanded = expandedResources[wi]
                const resourceCount = (row.resources || []).length
                return (
                  <>
                    <tr
                      key={wi}
                      draggable={!exam}
                      onDragStart={e => handleDragStart(e, wi)}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, wi)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: exam ? 'var(--sky-50)' : dragIdx === wi ? 'var(--amber-50, #fef3c7)' : undefined,
                        opacity: dragIdx === wi ? 0.5 : 1,
                        borderLeft: exam ? '3px solid var(--sky-500)' : '3px solid transparent',
                      }}
                    >
                      <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '8px' }}>
                        {!exam && <GripVertical size={14} style={{ color: 'var(--gray-400)', cursor: 'grab' }} />}
                        {!exam && (
                          <button
                            onClick={() => toggleResources(wi)}
                            title={resExpanded ? 'Hide resources' : 'Attach files/links'}
                            style={{
                              display: 'block', margin: '4px auto 0', background: 'none', border: 'none',
                              cursor: 'pointer', padding: '2px', color: resourceCount > 0 ? 'var(--sky-500)' : 'var(--gray-400)',
                              position: 'relative',
                            }}
                          >
                            <Paperclip size={13} />
                            {resourceCount > 0 && (
                              <span style={{
                                position: 'absolute', top: '-4px', right: '-6px', width: '14px', height: '14px',
                                borderRadius: '50%', background: 'var(--sky-500)', color: '#fff',
                                fontSize: '0.5625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>{resourceCount}</span>
                            )}
                          </button>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.week}</td>
                      <td>
                        <textarea
                          className="form-input" rows={2} value={row.ilos}
                          onChange={e => setOutlineField(wi, 'ilos', e.target.value)}
                          placeholder={exam ? '' : 'Learning outcome...'}
                          style={{ fontSize: '0.75rem', resize: 'vertical', padding: '6px 8px' }}
                          disabled={exam}
                        />
                      </td>
                      <td>
                        {exam ? (
                          <div style={{ padding: '8px', fontWeight: 600, color: 'var(--sky-600)', fontSize: '0.8125rem' }}>Final Examination</div>
                        ) : (
                          <>
                            {row.contents.map((c, ci) => (
                              <div key={ci} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.625rem', color: 'var(--sky-500)', minWidth: '14px' }}>{ci + 1}.</span>
                                <input className="form-input" value={c} onChange={e => setOutlineContent(wi, ci, e.target.value)}
                                  style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }} placeholder="Topic..." />
                                {row.contents.length > 1 && <button className="btn btn-ghost" style={{ padding: '0' }} onClick={() => removeOutlineContent(wi, ci)}><Trash2 size={10} /></button>}
                              </div>
                            ))}
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '0.6875rem' }} onClick={() => addOutlineContent(wi)}><Plus size={10} /> Add Topic</button>
                          </>
                        )}
                      </td>
                      <td>
                        <textarea
                          className="form-input" rows={2} value={row.activities}
                          onChange={e => setOutlineField(wi, 'activities', e.target.value)}
                          placeholder="Activities..." disabled={exam}
                          style={{ fontSize: '0.75rem', resize: 'vertical', padding: '6px 8px', marginBottom: '4px' }}
                        />
                        {!exam && (
                          <MultiSelectDropdown
                            categories={TEACHING_MATERIAL_CATEGORIES}
                            selected={row.teachingMaterials || []}
                            onChange={(val) => setOutlineField(wi, 'teachingMaterials', val)}
                            placeholder="Teaching materials..."
                          />
                        )}
                      </td>
                      <td>
                        <input className="form-input" value={row.assessments}
                          onChange={e => setOutlineField(wi, 'assessments', e.target.value)}
                          placeholder="Assessment..." disabled={exam}
                          style={{ fontSize: '0.75rem', padding: '4px 6px', marginBottom: '4px' }}
                        />
                        {!exam && (
                          <MultiSelectDropdown
                            categories={ASSESSMENT_CATEGORIES}
                            selected={row.assessmentTypes || []}
                            onChange={(val) => setOutlineField(wi, 'assessmentTypes', val)}
                            placeholder="Assessment type..."
                          />
                        )}
                      </td>
                    </tr>
                    {!exam && resExpanded && (
                      <tr key={`res-${wi}`}>
                        <td colSpan={6} style={{ padding: '8px 16px 12px 48px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Paperclip size={12} style={{ color: 'var(--sky-500)' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-600)' }}>Resources for Week {row.week}</span>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '0.6875rem', marginLeft: 'auto' }} onClick={() => addResource(wi, 'file')}><Plus size={10} /> Add File</button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '0.6875rem' }} onClick={() => addResource(wi, 'link')}><Plus size={10} /> Add Link</button>
                          </div>
                          {(row.resources || []).length === 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>No resources attached — files and links added here auto-populate Section 7 (References)</div>
                          )}
                          {(row.resources || []).map((res, ri) => (
                            <div key={ri} style={{ display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'center' }}>
                              {res.type === 'file' ? <FileText size={12} style={{ color: 'var(--sky-500)', flexShrink: 0 }} /> : <Link2 size={12} style={{ color: 'var(--green-500, #22c55e)', flexShrink: 0 }} />}
                              <input className="form-input" value={res.name} onChange={e => updateResource(wi, ri, 'name', e.target.value)}
                                placeholder={res.type === 'file' ? 'File name (e.g., Lecture3-notes.pdf)' : 'Reference title'}
                                style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }} />
                              <input className="form-input" value={res.url} onChange={e => updateResource(wi, ri, 'url', e.target.value)}
                                placeholder={res.type === 'file' ? 'Description (optional)' : 'https://...'}
                                style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }} />
                              <button className="btn btn-ghost" style={{ padding: '0' }} onClick={() => removeResource(wi, ri)}><Trash2 size={10} /></button>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 6: Requirements, Grading, Policy — pre-filled */}
      <div className="card" data-section="6" style={{ marginTop: '16px' }}>
        <div className="card-body">
          <SectionLabel num={6} label="Course Requirements, Evaluation and Grading System, Course Policy" />
          <div className="grid-2" style={{ gap: '16px' }}>
            <div>
              <FormGroup label="Course Requirements">
                {form.courseRequirements.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sky-500)', minWidth: '16px' }}>{i + 1}.</span>
                    <input className="form-input" style={{ flex: 1 }} value={r} onChange={e => setList('courseRequirements', i, e.target.value)} placeholder="e.g., Attendance" />
                    {form.courseRequirements.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeListItem('courseRequirements', i)}><Trash2 size={14} /></button>}
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={() => addListItem('courseRequirements', '')}><Plus size={14} /> Add Requirement</button>
              </FormGroup>
            </div>
            <div>
              <FormGroup label="Evaluation and Grading System">
                <textarea className="form-input" rows={4} value={form.gradingSystem} onChange={e => set('gradingSystem', e.target.value)}
                  placeholder="e.g., MG = 60% CS + 40% Exam&#10;TFG = 60% CS + 40% Exam&#10;FG = (MG + TFG) / 2" style={{ resize: 'vertical' }} />
              </FormGroup>
              <FormGroup label="Course Policy">
                {form.coursePolicy.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sky-500)', minWidth: '16px' }}>{i + 1}.</span>
                    <input className="form-input" style={{ flex: 1 }} value={p} onChange={e => setList('coursePolicy', i, e.target.value)} placeholder="Policy..." />
                    {form.coursePolicy.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeListItem('coursePolicy', i)}><Trash2 size={14} /></button>}
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={() => addListItem('coursePolicy', '')}><Plus size={14} /> Add Policy</button>
              </FormGroup>
            </div>
          </div>
        </div>
      </div>

      {/* Section 7: References */}
      <div className="card" data-section="7" style={{ marginTop: '16px' }}>
        <div className="card-body">
          <SectionLabel num={7} label="References" />

          {/* Auto-synced resources from Section 5 */}
          {(autoCollectedResources.files.length > 0 || autoCollectedResources.links.length > 0) && (
            <div style={{ padding: '12px 16px', background: 'var(--sky-50)', border: '1px solid var(--sky-200)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Paperclip size={13} style={{ color: 'var(--sky-500)' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sky-700)' }}>Auto-synced from Section 5 resources</span>
              </div>
              {autoCollectedResources.files.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)' }}>Attached Files: </span>
                  {autoCollectedResources.files.map((f, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', color: 'var(--gray-700)' }}>
                      {f.name}{f.description ? ` (${f.description})` : ''}{i < autoCollectedResources.files.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
              {autoCollectedResources.links.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)' }}>Online Links: </span>
                  {autoCollectedResources.links.map((l, i) => (
                    <span key={i} style={{ fontSize: '0.75rem' }}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-600)' }}>{l.title}</a>
                      {i < autoCollectedResources.links.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid-2" style={{ gap: '16px' }}>
            <div>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '8px' }}>Books</h4>
              {form.books.map((b, i) => (
                <div key={i} style={{ padding: '10px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', marginBottom: '8px', background: 'var(--gray-50)' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input className="form-input" style={{ flex: 1 }} value={b.title} onChange={e => { const books = [...form.books]; books[i] = { ...books[i], title: e.target.value }; setForm(prev => ({ ...prev, books })) }} placeholder="Title" />
                    {form.books.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeListItem('books', i)}><Trash2 size={14} /></button>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input className="form-input" style={{ flex: 1 }} value={b.authors} onChange={e => { const books = [...form.books]; books[i] = { ...books[i], authors: e.target.value }; setForm(prev => ({ ...prev, books })) }} placeholder="Authors" />
                    <input className="form-input" style={{ width: '70px' }} value={b.year} onChange={e => { const books = [...form.books]; books[i] = { ...books[i], year: e.target.value }; setForm(prev => ({ ...prev, books })) }} placeholder="Year" />
                    <input className="form-input" style={{ flex: 1 }} value={b.publisher} onChange={e => { const books = [...form.books]; books[i] = { ...books[i], publisher: e.target.value }; setForm(prev => ({ ...prev, books })) }} placeholder="Publisher" />
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={() => addListItem('books', { title: '', authors: '', year: '', publisher: '' })}><Plus size={14} /> Add Book</button>
            </div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '8px' }}>Online References</h4>
              {form.onlineReferences.map((r, i) => (
                <div key={i} style={{ padding: '10px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', marginBottom: '8px', background: 'var(--gray-50)' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input className="form-input" style={{ flex: 1 }} value={r.title} onChange={e => { const refs = [...form.onlineReferences]; refs[i] = { ...refs[i], title: e.target.value }; setForm(prev => ({ ...prev, onlineReferences: refs })) }} placeholder="Title" />
                    {form.onlineReferences.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeListItem('onlineReferences', i)}><Trash2 size={14} /></button>}
                  </div>
                  <input className="form-input" style={{ width: '100%' }} value={r.url} onChange={e => { const refs = [...form.onlineReferences]; refs[i] = { ...refs[i], url: e.target.value }; setForm(prev => ({ ...prev, onlineReferences: refs })) }} placeholder="https://..." />
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={() => addListItem('onlineReferences', { title: '', url: '' })}><Plus size={14} /> Add Online Reference</button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', padding: '16px 0', borderTop: '1px solid var(--gray-200)' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleSave}>Save as Drafted</button>
          <button className="btn btn-primary" onClick={handleMarkChecked} title="Confirms you have checked this draft — next step is downloading it for the offline signatory route"><CheckCircle size={16} /> Mark as Checked</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Version Compare ─── */
function VersionCompare({ v1, v2, onClose }) {
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2><GitCompare size={20} /> Version Comparison</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="grid-2">
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>v{v1.version} <span className="badge badge-draft">Earlier</span></div>
            <div className="text-sm text-muted">Updated: {v1.lastUpdated}</div>
            <div className="text-sm">Topics: {v1.topics.length}</div>
          </div>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--sky-50)', border: '1px solid var(--sky-200)' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>v{v2.version} <span className="badge badge-published">Current</span></div>
            <div className="text-sm text-muted">Updated: {v2.lastUpdated}</div>
            <div className="text-sm">Topics: {v2.topics.length}</div>
          </div>
        </div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}

/* ─── Main Component ─── */
export default function Syllabus() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'mine')
  const [selectedSyllabus, setSelectedSyllabus] = useState(null)
  const [compareSyllabus, setCompareSyllabus] = useState(null)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [versionHistorySyllabus, setVersionHistorySyllabus] = useState(null)
  const [extractingSyllabus, setExtractingSyllabus] = useState(null)
  // Local copy so the lifecycle actions below actually move syllabi through
  // the stations during a demo session. Admin sees all; instructors see own.
  const [syllabi, setSyllabi] = useState(() =>
    user?.role === 'admin' ? DEFAULT_SYLLABI : DEFAULT_SYLLABI.filter(s => s.instructorId === user?.id)
  )

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && t !== tab) setTab(t)
  }, [searchParams])

  const switchTab = (t) => {
    setTab(t)
    setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('tab', t); return p })
  }

  const setStatus = (id, status) => setSyllabi(prev => prev.map(s => s.id === id ? { ...s, status } : s))

  // One explicit human action per station — this is the approval loop of
  // FLOW_SPEC Phase 2, with the signatory chain happening offline.
  const markChecked = (syl) => {
    setStatus(syl.id, 'checked')
    addToast(`${syl.courseCode} marked as Checked — download it next for the approval route`, 'success')
  }
  const downloadForApproval = (syl) => {
    setStatus(syl.id, 'downloaded_for_approval')
    addToast(`${syl.courseCode} downloaded. Route the file offline: Dean review → CAO approval → EVP noting`, 'info')
  }
  const uploadApproved = (syl) => {
    setStatus(syl.id, 'approved_uploaded')
    addToast(`Approved file for ${syl.courseCode} uploaded — extract the Course Outline to activate it`, 'success')
  }
  const confirmExtraction = (syl) => {
    setStatus(syl.id, 'active')
    setExtractingSyllabus(null)
    addToast(`${syl.courseCode} is now Active — its Course Outline drives courseware generation`, 'success')
  }

  // The next action available at each station, rendered inline per row.
  const nextAction = (syl) => {
    switch (syl.status) {
      case 'drafted': return { label: 'Mark as Checked', icon: CheckCircle, onClick: () => markChecked(syl), title: 'Confirm you have checked and corrected this draft' }
      case 'checked': return { label: 'Download for Approval', icon: Download, onClick: () => downloadForApproval(syl), title: 'Download the file for the offline signatory route (Dean → CAO → EVP)' }
      case 'downloaded_for_approval': return { label: 'Upload Approved File', icon: FileUp, onClick: () => uploadApproved(syl), title: 'Upload the fully signed syllabus once the offline route is complete' }
      case 'approved_uploaded': return { label: 'Extract Outline', icon: ScanLine, onClick: () => setExtractingSyllabus(syl), title: 'Parse Section 5 (Course Outline) from the approved file' }
      default: return null
    }
  }

  return (
    <div className="container" data-pulse-zone="syllabus-builder">
      <div className="page-header">
        <h1>Syllabus</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--gray-200)', marginBottom: '20px' }}>
        <button
          onClick={() => switchTab('mine')}
          style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.875rem', color: tab === 'mine' ? 'var(--sky-600)' : 'var(--gray-500)',
            borderBottom: tab === 'mine' ? '2px solid var(--sky-500)' : '2px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s',
          }}
        >
          My Courses
        </button>
        <button
          onClick={() => switchTab('builder')}
          style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.875rem', color: tab === 'builder' ? 'var(--sky-600)' : 'var(--gray-500)',
            borderBottom: tab === 'builder' ? '2px solid var(--sky-500)' : '2px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s',
          }}
        >
          Syllabus Builder
        </button>
      </div>

      {/* Tab: My Courses (loaded courses with syllabus station + next action) */}
      {tab === 'mine' && (
        <>
          <LifecycleStrip />

          <div style={{ marginTop: '20px' }}>
            {syllabi.length === 0 ? (
              <div className="card"><div className="card-body text-center text-muted" style={{ padding: '40px' }}>
                <BookOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>No syllabi yet. Upload a ready-made syllabus above, or build one in the Syllabus Builder.</p>
              </div></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Instructor</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th>Outline</th>
                    <th>Next Step</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {syllabi.map(syl => {
                    const inst = INSTRUCTORS.find(i => i.id === syl.instructorId)
                    const outlineCount = syl.courseOutline?.length || 0
                    const action = nextAction(syl)
                    return (
                      <tr key={syl.id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{syl.courseCode}</div>
                          <div className="text-sm text-muted">{syl.courseTitle}</div>
                        </td>
                        <td className="text-sm">{inst?.name || '—'}</td>
                        <td><StatusBadge status={syl.status} /></td>
                        <td><span className="badge badge-draft">v{syl.version}</span></td>
                        <td className="text-sm">
                          {syl.status === 'active'
                            ? `${outlineCount} weeks extracted`
                            : outlineCount > 0 ? `${outlineCount} weeks (not yet extracted)` : 'Not extracted'}
                        </td>
                        <td>
                          {action ? (
                            <button className="btn btn-secondary btn-sm" onClick={action.onClick} title={action.title} style={{ whiteSpace: 'nowrap' }}>
                              <action.icon size={13} /> {action.label}
                            </button>
                          ) : (
                            <span className="text-sm" style={{ color: 'var(--green-600, #16a34a)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              <CheckCircle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Drives courseware
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSyllabus(syl)} title="View Syllabus"><Eye size={14} /></button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setVersionHistorySyllabus(syl); setShowVersionHistory(true) }} title="Version History"><History size={14} /></button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setCompareSyllabus(syl)} title="Compare Versions"><GitCompare size={14} /></button>
                            {(syl.status === 'drafted' || syl.status === 'checked') && (
                              <button className="btn btn-ghost btn-sm" onClick={() => { setCompareSyllabus(null); switchTab('builder') }} title="Edit in Builder"><BookOpen size={14} /></button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => addToast('Copied as a starting point for next term', 'info')} title="Copy for next term"><Copy size={14} /></button>
                            <button className="btn btn-ghost btn-sm" onClick={() => addToast('Syllabus archived', 'info')} title="Archive"><Archive size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Tab: Syllabus Builder */}
      {tab === 'builder' && (
        <div data-pulse-help="syllabus-field">
          <SyllabusBuilder onComplete={() => switchTab('mine')} onCancel={() => switchTab('mine')} />
        </div>
      )}

      {/* View Modal */}
      {selectedSyllabus && <SyllabusViewModal syllabus={selectedSyllabus} onClose={() => setSelectedSyllabus(null)} />}

      {/* Extraction preview → activate */}
      {extractingSyllabus && (
        <ExtractionModal
          syllabus={extractingSyllabus}
          onConfirm={() => confirmExtraction(extractingSyllabus)}
          onClose={() => setExtractingSyllabus(null)}
        />
      )}

      {/* Version Compare */}
      {compareSyllabus && <VersionCompare v1={compareSyllabus} v2={compareSyllabus} onClose={() => setCompareSyllabus(null)} />}

      {/* Version History */}
      {showVersionHistory && (
        <VersionHistory
          versions={SYLLABUS_VERSIONS.filter(v => v.syllabusId === (versionHistorySyllabus?.id || 'syl-1'))}
          entityType="syllabus"
          onClose={() => { setShowVersionHistory(false); setVersionHistorySyllabus(null) }}
        />
      )}
    </div>
  )
}
