import '../components/academic/academic.css'
import useSyllabusSharing from '../components/syllabus/useSyllabusSharing'
import { aiRequest } from '../lib/aiClient'
import {normalizeOutlineSections,addOutlineSection,weekSections,editOutlineSection} from '../utils/outlineSections'
import OutlineWeekTable from '../components/syllabus/OutlineWeekTable'
import '../components/syllabus/outline-editor.css'
import { revisedWorkspace } from '../utils/syllabusRevisions'
import { useAcademicRecords } from '../context/AcademicContext'
import ModalLayer from '../components/ui/ModalLayer'
import AutoTextarea from '../components/ui/AutoTextarea'
import { Spinner } from '../components/ui/LoadingFeedback'
import { downloadSyllabusPdf } from '../utils/pdfExport'
import { cloneElement, isValidElement, useState, useEffect, useRef, useMemo, useId } from 'react'
import { useSearchParams, Navigate, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CURRICULUM_COURSES, INSTRUCTORS, DEFAULT_INSTITUTIONAL_CONTEXT, SYLLABUS_STATUS_META } from '../data/mockData'
import { useToast } from '../context/ToastContext'
import {
  Upload, Plus, Trash2, Eye, History, Copy, Share2,
  GitCompare, Download, BookOpen, ChevronDown, ChevronUp,
  Sparkles, AlertCircle, CheckCircle, FileUp, ScanLine,
  Lock, Paperclip,
} from 'lucide-react'
import { useWorkspace, useWorkspaceViewState } from '../context/WorkspaceContext'
import ApprovedSyllabusUpload from '../components/syllabus/ApprovedSyllabusUpload'
import ApprovedSyllabusIntake from '../components/syllabus/ApprovedSyllabusIntake'
import { meaningfulOutline, downloadApprovedFile } from '../utils/syllabusFiles'
import UploadExistingSyllabus from '../components/syllabus/UploadExistingSyllabus'
import SharedSyllabusRepository from '../components/syllabus/SharedSyllabusRepository'
import { parsedToFormState } from '../utils/syllabusParser'
import { pulse as pulseBus } from '../components/pulse/pulseBus'
import { usePulseEditor } from '../agents/usePulseEditor'
import OutlineDraftPreview from '../components/syllabus/OutlineDraftPreview'
import {keepOutlineDraft} from '../agents/draftProgress'
import ReferenceIntake from '../components/syllabus/ReferenceIntake'
import {addSyllabusReference,removeSyllabusReference,bibliographicLabel} from '../lib/rag/syllabusReferences'

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

// Extraction preview — the parsed Section 5 (Course Outline) rows shown for
// confirmation before the syllabus becomes active (the mapping backbone for
// courseware generation). Exam weeks are flagged as milestones.
function ExtractionModal({ syllabus, onConfirm, onClose }) {
  const outline = syllabus.courseOutline || []
  const hasRows = meaningfulOutline(outline) && !!syllabus.approvedFile
  return (
    <ModalLayer className="overlay-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '760px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><ScanLine size={18} style={{ verticalAlign: 'middle' }} /> Extract Course Outline — {syllabus.courseCode}</h2>
          <button className="modal-close" aria-label="Close outline preview" onClick={onClose}>✕</button>
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
    </ModalLayer>
  )
}

/* ─── Upload Zone ─── */
/* ─── Syllabus View Modal — 7-Section KCP Template ─── */
function SyllabusViewModal({ syllabus, onClose }) {
  const { addToast } = useToast()
  const [exporting, setExporting] = useState(false)
  const exportPdf = async () => {
    setExporting(true)
    try { await downloadSyllabusPdf(syllabus) }
    catch (error) { addToast(error.message, 'error') }
    finally { setExporting(false) }
  }
  const [expandedSections, setExpandedSections] = useState({ s1: true, s2: true, s3: true, s4: true, s5: true, s6: true, s7: true })
  const toggle = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  const inst = INSTRUCTORS.find(i => i.id === syllabus.instructorId)
  const ci = syllabus.courseInfo || {}
  const outline = syllabus.courseOutline || []
  const refs = syllabus.references || { books: syllabus.books || [], onlineReferences: syllabus.onlineReferences || [] }
  const rp = syllabus.requirementsAndPolicies || syllabus
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
    <ModalLayer className="overlay-backdrop" onClick={onClose}>
      <div data-dialog="syllabus-view" role="dialog" aria-label="Syllabus details" className="modal-content syllabus-view-modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.125rem' }}>{ci.courseCode || syllabus.courseCode} — {ci.courseTitle || syllabus.courseTitle}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '0.75rem' }}>
              <span className={`badge badge-${syllabus.status || 'draft'}`}>{syllabus.status || 'Preview only'}</span>
              {syllabus.version&&<span className="badge badge-draft">v{syllabus.version}</span>}{syllabus.sharedCopy&&<span className="text-muted">Shared by {syllabus.sharedBy?.name} · Read-only copy</span>}
              {inst && <span className="text-muted">{inst.name}</span>}
            </div>
          </div>
          <button className="modal-close" aria-label="Close syllabus details" onClick={onClose}>✕</button>
        </div>

        <div className="syllabus-dialog-body">
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
                    {outline.flatMap(row=>weekSections(row).map(section=>({...section,week:row.week}))).map((row, i) => (
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
                    <li key={i} style={{ marginBottom: '4px', fontSize: '0.875rem' }}>{bibliographicLabel(b)}</li>
                  ))}</ol>
                </>
              )}
              {refs.onlineReferences?.length > 0 && (
                <>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 8px' }}>Online References</h4>
                  <ol style={{ margin: 0, paddingLeft: '20px' }}>{refs.onlineReferences.map((r, i) => (
                    <li key={i} style={{ marginBottom: '4px', fontSize: '0.875rem',overflowWrap:'anywhere' }}>{bibliographicLabel(r)}. <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-600)' }}>{r.url}</a></li>
                  ))}</ol>
                </>
              )}
            </div>
          )}
        </div>

        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary btn-sm" disabled={exporting} onClick={exportPdf}>{exporting ? <Spinner size={14} /> : <Download size={14} />} Download PDF</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </ModalLayer>
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
/* ─── Syllabus Builder — Single-Page 7-Section Form ─── */
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

// Required state and the note are exposed to assistive technology (and to Pulse) on the control itself.
const FormGroup = ({ label, required, error, children, note }) => {
  const id = useId()
  const controlId = isValidElement(children) ? children.props.id || `${id}-control` : undefined
  const control = isValidElement(children) ? cloneElement(children, { id: controlId, 'aria-required': required || undefined, 'aria-describedby': [children.props['aria-describedby'], note && `${id}-note`, error && `${id}-error`].filter(Boolean).join(' ') || undefined }) : children
  return (
    <div className="form-group" style={{ marginBottom: '12px', minWidth:0 }}>
      <label className="form-label" htmlFor={controlId}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      {note && <div id={`${id}-note`} style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontStyle: 'italic', marginBottom: '6px' }}>{note}</div>}
      {control}
      {error && <span id={`${id}-error`} className="form-error">{error}</span>}
    </div>
  )
}


function SyllabusBuilder({ onComplete, onCancel, initial }) {
  const [outlineDraft,setOutlineDraft]=useState(null)
  const { addToast } = useToast()
  const ic = DEFAULT_INSTITUTIONAL_CONTEXT

  const [uploadStep, setUploadStep] = useState(initial ? 'done' : 'pending')

  const defaultOutline = Array.from({ length: 18 }, (_, i) => ({
    week: i + 1, ilos: '', contents: [''], activities: '',
    assessments: i === 8 ? 'Midterm Examination' : i === 17 ? 'Final Examination' : '',
    teachingMaterials: [], assessmentTypes: [], resources: [],
  }))

  const [form, setForm] = useState(() => ({
    courseCode: '',
    courseTitle: '',
    courseInfo: { courseCode: '', courseTitle: '', periodOffered: '1st Semester', academicYear: '2026-2027', creditUnits: 3, classification: 'Major', noOfHours: 54, prerequisites: [] },
    courseDescription: '',
    institutionalContext: {
      kcp: { ...ic.kcp },
      cit: { ...ic.cit },
    },
    programOutcomes: [''],
    courseRequirements: [''],
    gradingSystem: '',
    coursePolicy: [''],
    books: [],
    onlineReferences: [],
    ...initial,
    courseOutline:normalizeOutlineSections(initial?.courseOutline||defaultOutline),
  }))

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
  })

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
        courseOutline: normalizeOutlineSections(prev.courseOutline.map(row => {
          if (row.week === 9 || row.week === 18) return row
          return {
            ...row,
            sections: weekSections(row).map(section=>({...section,ilos:'',activities:'',assessments:''})),
            ilos: '',
            contents: row.contents.some(c => c.trim()) ? row.contents : [''],
            activities: '',
            assessments: '',
          }
        })),
      }))
      setErrors({})
    }
  }

  // ── Upload existing syllabus — merge parsed data into form ──
  const [sourceFiles, setSourceFiles] = useState([])
  const handleUploadExtract = (parsed) => {
    const title = parsed.metadata?.title || 'Imported syllabus'
    setSourceFiles([{ title, fileName: title, text: parsed.sourceText || parsed.sections.map(section => section.raw).join('\n'), syllabus: parsed, kind: 'syllabus', sourceType: 'text' }])
    const merged = parsedToFormState(parsed)
    setForm(prev => ({
      ...prev,
      ...merged,
      courseOutline:normalizeOutlineSections(merged.courseOutline),
      institutionalContext: Object.fromEntries(Object.entries(prev.institutionalContext).map(([unit, fields]) => [unit, { ...fields, ...Object.fromEntries(Object.entries(merged.institutionalContext?.[unit] || {}).filter(([,value]) => Array.isArray(value) ? value.length : String(value || '').trim())) }])),
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
    onComplete(form, 'drafted')
  }

  // "Checked" = the instructor has verified the draft. Next step is to
  // download the file for the offline signatory route (Dean → CAO → EVP).
  const handleMarkChecked = () => {
    if (!validate()) { addToast('Please fix the highlighted fields before marking as checked', 'error'); return }
    if (!meaningfulOutline(form.courseOutline)) { addToast('Add weekly learning outcomes and contents before checking.', 'error'); return }
    addToast('Syllabus marked as Checked — you can now download it for the approval route', 'success')
    onComplete(form, 'checked')
  }

  usePulseEditor({ kind: 'syllabus', label: `${form.courseCode || 'New'} syllabus builder`, data: form, sources: sourceFiles,
    previewOutline:(progress,baseline)=>setOutlineDraft({...progress,baseline}),
    apply: next => { setForm({...next,courseOutline:normalizeOutlineSections(next.courseOutline)}); setUploadStep('done') },
    prepareCourse: (code, current) => {
      const course = CURRICULUM_COURSES.find(item => item.code === code)
      if (!course) throw new Error('Choose a course from the curriculum.')
      if (current.courseCode && current.courseCode !== code) throw new Error('The open builder belongs to another course. Open a new builder or select the intended course first.')
      return { ...current, courseCode: course.code, courseTitle: course.title, courseDescription: course.description || '', courseInfo: { ...current.courseInfo, courseCode: course.code, courseTitle: course.title, creditUnits: course.units, classification: course.classification || 'Major', noOfHours: course.units * 18, prerequisites: course.prerequisites || [] } }
    },
    save: async next => {
      if (!next.courseInfo?.courseCode || !next.programOutcomes?.some(value => value.trim())) throw new Error('Select a course and supply at least one program outcome before saving. You can apply the preview to the form first.')
      return onComplete(next, 'drafted', { confirmed: true })
    },
  })

  // Retain the existing curriculum-copy actions used by Pulse.
  const [errors, setErrors] = useState({})
  const [aiDrafted, setAiDrafted] = useState(false)
  const autoGenerateDraft = () => {
    const course = CURRICULUM_COURSES.find(s => s.code === form.courseCode)
    if (!course?.courseOutline?.length) { addToast('No curriculum outline is available. Import a PDF or Word (.docx) file, or enter the weekly outline.', 'info'); return }
    setForm(prev => ({ ...prev, courseOutline: normalizeOutlineSections(course.courseOutline.map(row => ({ teachingMaterials: [], assessmentTypes: [], resources: [], ...row }))) }))
    setAiDrafted(true)
    addToast('Curriculum reference loaded. Review and adapt it before checking.', 'info')
  }

  const addOutlineContent = weekIdx => setForm(previous=>({...previous,courseOutline:addOutlineSection(previous.courseOutline,previous.courseOutline[weekIdx].week,crypto.randomUUID())}))
  const addResource = (weekIdx,type) => setForm(previous=>{const row=previous.courseOutline[weekIdx],section=weekSections(row)[0];return {...previous,courseOutline:editOutlineSection(previous.courseOutline,row.week,section.id,{resources:[...(section.resources||[]),{type,name:'',url:''}]})}})

  // ── Section 5 AI Chat (now handled inside Pulse walkthrough panel) ──

  // Auto-generate: fill ALL outline fields from curriculum data (called via pulseBus formAction from Pulse panel)
  const s5AutoGenerate = autoGenerateDraft

  // ── Drag-and-drop reorder for outline rows ──

  const [outlineExpanded, setOutlineExpanded] = useState(false), [outlineTerm, setOutlineTerm] = useState('all'), [outlineWeek, setOutlineWeek] = useState('all')
  const outlineRef = useRef(null)
  useEffect(() => {
    if (!outlineExpanded) return
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; outlineRef.current?.focus()
    const close = event => { if (event.key === 'Escape' && !event.target.closest('[data-pulse-ui]') && !outlineRef.current?.querySelector('.outline-multi-select[aria-expanded="true"]')) { event.stopPropagation(); setOutlineExpanded(false) } }
    document.addEventListener('keydown', close, true)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', close, true) }
  }, [outlineExpanded])

  // ── Split outline into midterm/finals ──
  const visibleWeek = row => (outlineWeek === 'all' || String(row.week) === outlineWeek) && (outlineTerm === 'all' || (outlineTerm === 'midterm' ? row.week <= 9 : row.week >= 10))
  const midtermWeeks = form.courseOutline.filter(w => w.week <= 9 && visibleWeek(w)).sort((a, b) => a.week - b.week)
  const finalsWeeks = form.courseOutline.filter(w => w.week >= 10 && visibleWeek(w)).sort((a, b) => a.week - b.week)
  const outlineTerms = [
    { key: 'midterm', label: 'Midterm', range: 'Weeks 1–9', exam: 'Midterm Examination', weeks: midtermWeeks },
    { key: 'finals', label: 'Finals', range: 'Weeks 10–18', exam: 'Final Examination', weeks: finalsWeeks },
  ].filter(term => term.weeks.length > 0)

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

  const isExamWeek = (w) => w === 9 || w === 18

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '8px', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 0%', minWidth: 0 }}>
          <h1 style={{ fontSize: '1.25rem' }}>Syllabus Builder</h1>
          <p className="text-sm text-muted">Seven-section syllabus template. Import a PDF or Word (.docx) file, or write your own draft. Verify institutional policies before review.</p>
        </div>
        {uploadStep === 'done' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => { setUploadStep('pending'); addToast('Upload a new syllabus to replace current content', 'info') }}>
              <Upload size={14} /> Upload Different
            </button>
          </div>
        )}
      </div>

      {/* Upload existing syllabus step */}
      {sourceFiles.length > 0 && <p className="syllabus-source-context" role="status">Source available to Pulse: <strong>{sourceFiles.map(file => file.title).join(', ')}</strong>. Select a section to correct it against this file. Source context lasts while this builder is open.</p>}
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
            <strong>Curriculum reference loaded.</strong> It will be saved with status <strong>Drafted</strong> — check and correct every
            section before anything else can happen. Activation requires the approved file and your confirmation.
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
              <select aria-label="Course" className={`form-input ${errors.courseCode ? 'form-input-error' : ''}`} value={form.courseCode} onChange={e => selectCourse(e.target.value)}>
                <option value="">Select a course...</option>
                {form.courseCode&&!CURRICULUM_COURSES.some(s=>s.code===form.courseCode)&&<option value={form.courseCode}>{form.courseCode} — {form.courseInfo.courseTitle}</option>}
                {CURRICULUM_COURSES.map(s => <option key={s.code} value={s.code}>{s.code} — {s.code===form.courseCode?(form.courseInfo.courseTitle||s.title):s.title}</option>)}
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
              <AutoTextarea className="form-input" rows={3} data-pulse-field="institutionalContext.kcp.vision" aria-label="KCP vision" value={form.institutionalContext.kcp.vision} onChange={e => set('institutionalContext.kcp.vision', e.target.value)} style={{ resize: 'vertical' }} />
            </FormGroup>
            <FormGroup label="Mission">
              <AutoTextarea className="form-input" rows={3} data-pulse-field="institutionalContext.kcp.mission" aria-label="KCP mission" value={form.institutionalContext.kcp.mission} onChange={e => set('institutionalContext.kcp.mission', e.target.value)} style={{ resize: 'vertical' }} />
            </FormGroup>
          </div>
          <FormGroup label="Objectives">
            {form.institutionalContext.kcp.objectives.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--sky-500)', minWidth: '24px', fontSize: '0.8125rem' }}>{i + 1}.</span>
                <input className="form-input" style={{ flex: 1 }} data-pulse-field={`institutionalContext.kcp.objectives.${i}`} aria-label={`KCP objective ${i + 1}`} value={o} onChange={e => {
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
            <input className="form-input" data-pulse-field="institutionalContext.kcp.coreValues" value={form.institutionalContext.kcp.coreValues.join(', ')} onChange={e => set('institutionalContext.kcp.coreValues', e.target.value.split(',').map(v => v.trim()).filter(Boolean))} placeholder="e.g., Justice, Truth, Freedom" />
          </FormGroup>

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--gray-200)' }} />

          {/* CIT */}
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--sky-600)' }}>College of Information Technology — Mission, Objectives</h4>
          <FormGroup label="Mission">
            <AutoTextarea className="form-input" rows={3} data-pulse-field="institutionalContext.cit.mission" aria-label="CIT mission" value={form.institutionalContext.cit.mission} onChange={e => set('institutionalContext.cit.mission', e.target.value)} style={{ resize: 'vertical' }} />
          </FormGroup>
          <FormGroup label="Objectives">
            {form.institutionalContext.cit.objectives.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--sky-500)', minWidth: '24px', fontSize: '0.8125rem' }}>{i + 1}.</span>
                <input className="form-input" style={{ flex: 1 }} data-pulse-field={`institutionalContext.cit.objectives.${i}`} aria-label={`CIT objective ${i + 1}`} value={o} onChange={e => {
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
                <input className="form-input" style={{ flex: 1 }} data-pulse-field={`programOutcomes.${i}`} value={po} onChange={e => setList('programOutcomes', i, e.target.value)} placeholder={`Program outcome ${i + 1}`} />
                {form.programOutcomes.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeListItem('programOutcomes', i)}><Trash2 size={14} /></button>}
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => addListItem('programOutcomes', '')} style={{ marginTop: '4px' }}><Plus size={14} /> Add Program Outcome</button>
          </FormGroup>
        </div>
      </div>

      <section ref={outlineRef} tabIndex={-1} role="region" aria-label="Course Outline editor" className={`card outline-editor ${outlineExpanded ? 'is-expanded' : ''}`} data-section="5">
        <div className="card-body">
          <div className="outline-toolbar"><SectionLabel num={5} label="Course Outline" />
            <div className="outline-tools"><label>Term<select className="form-input" aria-label="Outline term" value={outlineTerm} onChange={event => { setOutlineTerm(event.target.value); setOutlineWeek('all') }}><option value="all">All terms</option><option value="midterm">Midterm</option><option value="finals">Finals</option></select></label>
            <label>Week<select className="form-input" aria-label="Outline week" value={outlineWeek} onChange={event => { setOutlineWeek(event.target.value); setOutlineTerm('all') }}><option value="all">All weeks</option>{form.courseOutline.map(row => <option key={row.week} value={row.week}>Week {row.week}{isExamWeek(row.week) ? ' - Examination' : ''}</option>)}</select></label>
            <button type="button" className="btn btn-secondary" aria-expanded={outlineExpanded} onClick={() => setOutlineExpanded(value => !value)}>{outlineExpanded ? 'Close expanded outline' : 'Expand outline'}</button></div>
          </div>
          {outlineDraft?.baseline.data.courseCode===form.courseCode&&<OutlineDraftPreview draft={outlineDraft} onDismiss={()=>setOutlineDraft(null)} onKeep={week=>{
            const {rows,kept,conflicts}=keepOutlineDraft(form.courseOutline,outlineDraft.baseline.data.courseOutline,outlineDraft.rows,week)
            setForm({...form,courseOutline:normalizeOutlineSections(rows)});if(kept)setUploadStep('done');addToast(`${kept} draft week(s) placed in the form.${conflicts?` ${conflicts} manually changed week(s) preserved.`:''} Review before saving.`,conflicts?'warning':'success')
          }}/>}
          <OutlineWeekTable rows={form.courseOutline} terms={outlineTerms} onChange={rows=>setForm(previous=>({...previous,courseOutline:rows}))}/>
        </div>
      </section>

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
                    <input className="form-input" style={{ flex: 1 }} data-pulse-field={`courseRequirements.${i}`} value={r} onChange={e => setList('courseRequirements', i, e.target.value)} placeholder="e.g., Attendance" />
                    {form.courseRequirements.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => removeListItem('courseRequirements', i)}><Trash2 size={14} /></button>}
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={() => addListItem('courseRequirements', '')}><Plus size={14} /> Add Requirement</button>
              </FormGroup>
            </div>
            <div>
              <FormGroup label="Evaluation and Grading System">
                <AutoTextarea className="form-input" rows={4} data-pulse-field="gradingSystem" value={form.gradingSystem} onChange={e => set('gradingSystem', e.target.value)}
                  placeholder="e.g., MG = 60% CS + 40% Exam&#10;TFG = 60% CS + 40% Exam&#10;FG = (MG + TFG) / 2" style={{ resize: 'vertical' }} />
              </FormGroup>
              <FormGroup label="Course Policy">
                {form.coursePolicy.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sky-500)', minWidth: '16px' }}>{i + 1}.</span>
                    <input className="form-input" style={{ flex: 1 }} data-pulse-field={`coursePolicy.${i}`} value={p} onChange={e => setList('coursePolicy', i, e.target.value)} placeholder="Policy..." />
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

          <ReferenceIntake syllabus={form} onAdd={reference=>setForm(previous=>addSyllabusReference(previous,reference))} onRemove={reference=>setForm(previous=>removeSyllabusReference(previous,reference))} />
        </div>
      </div>

      {/* Actions */}
      <div className="syllabus-builder-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', padding: '16px 0', borderTop: '1px solid var(--gray-200)' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => downloadSyllabusPdf(form).catch(error => addToast(error.message, 'error'))}><Download size={16} /> Download PDF draft</button>
          <button className="btn btn-secondary" data-pulse-action="save-syllabus" onClick={handleSave}>Save as Drafted</button>
          <button className="btn btn-primary" onClick={handleMarkChecked} title="Confirms you have checked this draft — next step is downloading it for the offline signatory route"><CheckCircle size={16} /> Mark as Checked</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Version Compare ─── */
function VersionCompare({ v1, v2, onClose }) {
  return (
    <ModalLayer className="overlay-backdrop" onClick={onClose}>
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
    </ModalLayer>
  )
}

/* ─── Main Component ─── */
export default function Syllabus() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tab, setTab] = useState(['mine', 'repository', 'builder'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'mine')
  const [readerId,setReaderId]=useWorkspaceViewState('syllabus-reader',null)
  const [readerVersion,setReaderVersion]=useWorkspaceViewState('syllabus-version',null)
  const [sharedReader,setSharedReader]=useState(null)
  const [previewSyllabus,setPreviewSyllabus]=useState(null)
  const sharing=useSyllabusSharing()
  const [shareId,setShareId]=useWorkspaceViewState('syllabus-share',null)
  const [deleteId,setDeleteId]=useWorkspaceViewState('syllabus-delete',null)
  const [email,setEmail]=useState(''),[actionError,setActionError]=useState(''),[actionBusy,setActionBusy]=useState(false)
  const [compareSyllabus, setCompareSyllabus] = useState(null)
  const [historyId,setHistoryId]=useWorkspaceViewState('syllabus-history',null)
  const showVersionHistory=!!historyId
  const setShowVersionHistory=value=>{if(!value)setHistoryId(null)}
  const setVersionHistorySyllabus=syllabus=>setHistoryId(syllabus?.id||null)
  const [extractingSyllabus, setExtractingSyllabus] = useState(null)
  const { syllabi, setSyllabi, commit, updateWorkspace,revision,dirty,saving,loading:workspaceLoading } = useWorkspace()
  const versionHistorySyllabus=syllabi.find(item=>item.id===historyId)
  const sharedId=readerId?.startsWith('shared:')?readerId.slice(7):null
  const readableShare=sharing.shares.find(item=>item.id===sharedId)
  const ownedReader=syllabi.find(item=>item.id===readerId)
  const selectedSyllabus=previewSyllabus||(sharedId?(readableShare&&sharedReader?.id===sharedId?sharedReader.syllabus:null):(readerVersion!==null?ownedReader?.versions?.[readerVersion]:ownedReader))
  const setSelectedSyllabus=syllabus=>{setReaderVersion(null);const saved=syllabus&&syllabi.some(item=>item.id===syllabus.id);setPreviewSyllabus(syllabus&&!saved?syllabus:null);setReaderId(saved?syllabus.id:null)}
  useEffect(()=>{
    setSharedReader(null)
    if(!readableShare)return
    const controller=new AbortController()
    aiRequest('syllabi','POST',{operation:'open',id:readableShare.id},controller.signal).then(result=>{if(!controller.signal.aborted)setSharedReader({id:readableShare.id,syllabus:{...result.syllabus,id:`shared:${readableShare.id}`,status:'drafted',sharedCopy:true,sharedBy:{name:readableShare.sender_name,id:readableShare.sender_id}}})}).catch(error=>{if(!controller.signal.aborted)setActionError(error.message)})
    return()=>controller.abort()
  },[readableShare])
  const incoming=sharing.shares.filter(item=>item.recipient_id===user?.id)
  const outgoing=sharing.shares.filter(item=>item.sender_id===user?.id)
  const deleteSyllabus=syllabi.find(item=>item.id===deleteId)
  const deleteShare=sharing.shares.find(item=>`shared:${item.id}`===deleteId)
  const sharingSyllabus=syllabi.find(item=>item.id===shareId)
  const activeOnly = searchParams.get('status') === 'active'
  const teachingSyllabi = syllabi.filter(syllabus => ['own','draft'].includes(syllabus.teachingSetRole))
  const listedSyllabi = activeOnly ? syllabi.filter(syllabus => syllabus.status === 'active') : teachingSyllabi.length && searchParams.get('status') !== 'all' ? teachingSyllabi : syllabi
  const {data:academic}=useAcademicRecords()
  const [editingSyllabus, setEditingSyllabus] = useState(null)
  const [uploadingSyllabus, setUploadingSyllabus] = useState(null)

  useEffect(() => {
    const t = searchParams.get('tab')
    if (['mine', 'repository', 'builder'].includes(t) && t !== tab) setTab(t)
  }, [searchParams, tab])

  if (!['instructor', 'admin'].includes(user?.role)) return <Navigate to="/dashboard" replace />
  if (searchParams.get('tab') === 'register') return <Navigate to="/student-monitoring?tab=students" replace />

  const switchTab = (t) => {
    setTab(t)
    setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('tab', t); p.delete('status'); return p })
  }

  const record = (syl, status) => ({ ...syl, status, lastUpdated: new Date().toISOString(), history: [...(syl.history || []), { status, version: syl.version || 1, timestamp: new Date().toISOString(), author: user?.name || 'Instructor' }].slice(-100) })
  const setStatus = (id, status) => setSyllabi(prev => prev.map(s => s.id === id ? record(s, status) : s))
  const saveBuilder = async (form, status, options = {}) => {
    const next = record({ ...form, id: editingSyllabus?.id || crypto.randomUUID(), instructorId: user?.id, version: (editingSyllabus?.version || 0) + 1, sample: false, approvedFile: undefined, extractedAt: undefined }, status)
    const change = data => revisedWorkspace(data,next)
    const saved = options.confirmed ? await commit(change) : null
    if (!options.confirmed) updateWorkspace(change)
    setEditingSyllabus(null); setTab('mine'); setSearchParams({tab:'mine',status:'all'})
    pulseBus.progress('syllabus-saved', next.courseCode)
    return { ...saved, id: next.id, status: next.status }
  }

  const handleUseApprovedSyllabus = async candidate => {
    const next = record({ ...candidate, instructorId: user?.id, history: [] }, 'active')
    await commit(data => revisedWorkspace(data, next))
    pulseBus.progress('syllabus-activated', next.courseCode)
    navigate(`/courseware?course=${encodeURIComponent(next.id)}`)
    addToast(`${next.courseCode} syllabus selected. Its outline is ready for courseware generation.`, 'success')
  }

  // One explicit human action per station — this is the approval loop of
  // FLOW_SPEC Phase 2, with the signatory chain happening offline.
  const markChecked = (syl) => {
    if (!meaningfulOutline(syl.courseOutline)) { addToast('Add weekly learning outcomes and contents in the builder first.', 'error'); return }
    setStatus(syl.id, 'checked')
    pulseBus.progress('syllabus-checked', syl.courseCode)
    addToast(`${syl.courseCode} marked as Checked — download it next for the approval route`, 'success')
  }
  const downloadForApproval = async (syl) => {
    try {
      await downloadSyllabusPdf(syl, `${syl.courseCode.replace(/[^a-z0-9-]/gi, '_')}-v${syl.version}-approval.pdf`)
      setStatus(syl.id, 'downloaded_for_approval')
      pulseBus.progress('syllabus-downloaded', syl.courseCode)
      addToast('PDF exported. Complete the offline approval route before uploading it.', 'info')
    } catch (error) { addToast(`Export failed: ${error.message}`, 'error') }
  }
  const uploadApproved = syl => setUploadingSyllabus(syl)
  const saveApproved = syl => {
    setSyllabi(previous => previous.map(item => item.id === syl.id ? record(syl, 'approved_uploaded') : item))
    setUploadingSyllabus(null)
    pulseBus.progress('syllabus-approved-uploaded', syl.courseCode)
    addToast('Approved file retained. Review the extracted outline before activation.', 'success')
  }
  const confirmExtraction = (syl) => {
    if (!syl.approvedFile || !meaningfulOutline(syl.courseOutline)) { addToast('Upload an approved PDF or Word (.docx) file with a usable outline first.', 'error'); return }
    setStatus(syl.id, 'active')
    pulseBus.progress('syllabus-activated', syl.courseCode)
    setExtractingSyllabus(null)
    addToast(`${syl.courseCode} is now Active — its Course Outline drives courseware generation`, 'success')
  }

  // The next action available at each station, rendered inline per row.
  const nextAction = (syl) => {
    switch (syl.status) {
      case 'drafted': return { label: 'Mark as Checked', icon: CheckCircle, onClick: () => markChecked(syl), title: 'Confirm you have checked and corrected this draft' }
      case 'checked': return { label: 'Download for Approval', icon: Download, onClick: () => downloadForApproval(syl), title: 'Download the file for the offline signatory route (Dean → CAO → EVP)' }
      case 'downloaded_for_approval': return { label: 'Upload Approved File', icon: FileUp, onClick: () => uploadApproved(syl), title: 'Upload the fully signed syllabus once the offline route is complete' }
      case 'approved_uploaded': return syl.approvedFile ? { label: 'Extract Outline', icon: ScanLine, onClick: () => setExtractingSyllabus(syl), title: 'Review the outline parsed from the approved file' } : { label: 'Upload Approved File', icon: FileUp, onClick: () => uploadApproved(syl), title: 'This sample has no retained approved file' }
      default: return null
    }
  }

  // Handle syllabus attachment from SharedSyllabusRepository
  const handleAttachSyllabus = async (syllabus) => {
    const copy = record({ ...syllabus, id: crypto.randomUUID(), instructorId: user?.id, version: 1, sample: false, approvedFile: undefined, extractedAt: undefined, history: [] }, 'drafted')
    await commit(data=>({...data,syllabi:[...data.syllabi,copy]}))
    addToast('Copied as a new draft. Review and complete its approval route.', 'success')
    switchTab('mine')
  }

  return (
    <div className="container" data-pulse-zone="syllabus-builder">
      <div className="page-header">
        <h1>Syllabus</h1>
      </div>

      {editingSyllabus?.status==='active'&&<p role="alert" className="mb-16">Saving a revision returns this syllabus to Drafted and hides its published courseware until the approved outline is activated again. Changed teaching weeks require another courseware review.</p>}
      {sharing.allowed&&<div className="academic-actions mb-16"><button className="btn btn-secondary btn-sm" disabled={sharing.loading} onClick={()=>sharing.load()}>{sharing.loading?'Loading shared syllabi…':'Refresh shared syllabi'}</button>{sharing.error&&<p role="alert">{sharing.error}</p>}</div>}
      {actionError&&!sharingSyllabus&&!deleteSyllabus&&!deleteShare&&<p role="alert">{actionError}</p>}
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
          My Syllabus
        </button>
        <button
          onClick={() => switchTab('repository')}
          style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.875rem', color: tab === 'repository' ? 'var(--sky-600)' : 'var(--gray-500)',
            borderBottom: tab === 'repository' ? '2px solid var(--sky-500)' : '2px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s',
          }}
        >
          Shared Repository
        </button>
        <button
          onClick={() => { setEditingSyllabus(null); switchTab('builder') }}
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

      {tab === 'mine' && (
        <>
          <ApprovedSyllabusIntake onUse={handleUseApprovedSyllabus} onView={setSelectedSyllabus} focusUpload={searchParams.get('upload') === 'approved'} />
          {teachingSyllabi.length>0&&!activeOnly&&<div className="academic-actions mt-16" role="status"><strong>Teaching set</strong><span>{teachingSyllabi.filter(s=>s.teachingSetRole==='own').length} own syllabi</span><span>{incoming.length} shared with me</span><span>{teachingSyllabi.filter(s=>s.teachingSetRole==='draft').length} complete drafts</span><button className="btn btn-secondary btn-sm" onClick={()=>setSearchParams({tab:'mine',...(searchParams.get('status')==='all'?{}:{status:'all'})})}>{searchParams.get('status')==='all'?'Show teaching set':'Show all syllabi'}</button></div>}
          {activeOnly && <div className="flex flex-wrap items-center gap-16 mb-16" role="status"><strong>Active syllabi</strong><button className="btn btn-secondary btn-sm" onClick={() => setSearchParams({ tab: 'mine' })}>Show all syllabi</button></div>}

          <div style={{ marginTop: '20px' }}>
            {listedSyllabi.length === 0 ? (
              <div className="card"><div className="card-body text-center text-muted" style={{ padding: '40px' }}>
                <BookOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>{activeOnly ? 'No active syllabi yet.' : 'No saved syllabi yet. Upload an approved copy above, or create a draft in Syllabus Builder.'}</p>
              </div></div>
            ) : (
              <div className="academic-table-wrap"><table className="data-table syllabus-list">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Instructor</th>
                    <th>Status</th>
                    <th>Next Step</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {listedSyllabi.map(syl => {
                    const inst = INSTRUCTORS.find(i => i.id === syl.instructorId)
                    const action = nextAction(syl)
                    return (
                      <tr key={syl.id} data-syllabus-id={syl.id} data-pulse-target={`${syl.courseCode} syllabus`}>
                        <td data-label="Course"><div style={{minWidth:0}}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{syl.courseCode}</div>
                          <div className="text-sm text-muted">{syl.courseTitle}{syl.sample && <span> · Sample</span>}</div>{syl.sharedBy?.name&&<div className="text-sm text-muted">Shared by {syl.sharedBy.name}</div>}
                        </div></td>
                        <td className="text-sm" data-label="Instructor">{inst?.name || user?.name || 'Instructor'}</td>
                        <td data-label="Status"><StatusBadge status={syl.status} /></td>
                        <td data-label="Next step">
                          {action ? (
                            <button className="btn btn-secondary btn-sm" onClick={action.onClick} title={action.title} style={{ whiteSpace: 'nowrap' }}>
                              <action.icon size={13} /> {action.label}
                            </button>
                          ) : (
                            <span className="text-sm" style={{ color: 'var(--green-600, #16a34a)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {syl.status === 'active' ? <><CheckCircle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /><span>Drives courseware</span> <Link to={`/courseware?course=${encodeURIComponent(syl.id)}`} className="btn btn-secondary btn-sm">Open course</Link></> : 'Archived'}
                            </span>
                          )}
                        </td>
                        <td data-label="Actions">
                          <div className="academic-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSyllabus(syl)} title="View Syllabus"><Eye size={14} /></button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setVersionHistorySyllabus(syl); setShowVersionHistory(true) }} title="Version History"><History size={14} /></button>
                            {!syl.sample && (
                              <button className="btn btn-ghost btn-sm" onClick={() => { setEditingSyllabus(syl); switchTab('builder') }} title="Edit in Builder"><BookOpen size={14} /></button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => handleAttachSyllabus(syl).catch(error=>setActionError(error.message))} title="Copy for next term"><Copy size={14} /></button>
                            {!syl.sample&&<button className="btn btn-ghost btn-sm" disabled={!sharing.allowed} onClick={()=>{setActionError('');setEmail('');setShareId(syl.id)}} title="Share syllabus"><Share2 size={14}/></button>}
                            <button className="btn btn-ghost btn-sm" onClick={()=>{setActionError('');setDeleteId(syl.id)}} title="Delete syllabus"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table></div>
            )}
          </div>
          {incoming.length>0&&!activeOnly&&<section className="card mt-24"><div className="card-header"><h2>Shared with me</h2></div><div className="card-body"><p className="text-sm text-muted mb-16">Received copies stay read-only. Use as draft creates your own copy for review and offline approval.</p>{incoming.map(share=><div className="academic-list-row" key={share.id} data-shared-id={share.id}><div><strong>{share.courseCode} — {share.courseTitle}</strong><div className="text-sm text-muted">Shared by {share.sender_name}</div></div><div className="academic-actions"><button className="btn btn-secondary btn-sm" onClick={()=>{setReaderVersion(null);setReaderId(`shared:${share.id}`)}}>View shared syllabus</button><button className="btn btn-secondary btn-sm" disabled={actionBusy} onClick={async()=>{setActionBusy(true);setActionError('');try{const result=await sharing.command({operation:'open',id:share.id});await handleAttachSyllabus({...result.syllabus,sharedBy:{id:share.sender_id,name:share.sender_name}});setSearchParams({tab:'mine',status:'all'})}catch(error){setActionError(error.message)}finally{setActionBusy(false)}}}>Use as draft</button><button className="btn btn-ghost btn-sm" title="Delete received syllabus" onClick={()=>setDeleteId(`shared:${share.id}`)}><Trash2 size={14}/></button></div></div>)}</div></section>}
        </>
      )}

      {tab === 'repository' && <SharedSyllabusRepository shares={outgoing} onView={share=>{setReaderVersion(null);setReaderId(`shared:${share.id}`)}} onRemove={share=>{setActionError('');setDeleteId(`shared:${share.id}`)}}/>}

      {/* Tab: Syllabus Builder */}
      {tab === 'builder' && (
        <div data-pulse-help="syllabus-field">
          <SyllabusBuilder key={editingSyllabus?.id || "new"} initial={editingSyllabus} onComplete={saveBuilder} onCancel={() => { setEditingSyllabus(null); switchTab('mine') }} />
        </div>
      )}

      {sharingSyllabus&&<ModalLayer onDismiss={()=>setShareId(null)}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Share syllabus"><div className="modal-header"><h2>Share {sharingSyllabus.courseCode} syllabus</h2><button className="modal-close" aria-label="Close sharing" onClick={()=>setShareId(null)}>×</button></div><p className="mb-16">Send a syllabus copy to another registered instructor. Their My Syllabus tab will show your name. Private source copies, approved attachments and courseware are excluded.</p><form onSubmit={async event=>{event.preventDefault();setActionBusy(true);setActionError('');try{const result=await sharing.command({operation:'send',syllabus:sharingSyllabus.id,revision,email});setShareId(null);addToast(`Syllabus shared with ${result.recipient}.`,'success')}catch(error){setActionError(error.message)}finally{setActionBusy(false)}}}><label className="form-label">Instructor email<input className="form-input" type="email" maxLength={254} required value={email} onChange={event=>setEmail(event.target.value)}/></label>{(dirty||saving||workspaceLoading)&&<p role="status">Wait for the workspace to finish saving before sharing.</p>}{actionError&&<p role="alert">{actionError}</p>}<div className="modal-actions"><button className="btn btn-secondary" type="button" onClick={()=>setShareId(null)}>Cancel</button><button className="btn btn-primary" type="submit" disabled={actionBusy||dirty||saving||workspaceLoading||!sharing.allowed}>{actionBusy?'Sharing…':'Share syllabus'}</button></div></form></section></ModalLayer>}
      {(deleteSyllabus||deleteShare)&&<ModalLayer onDismiss={()=>setDeleteId(null)}><section className="modal-content" role="dialog" aria-modal="true" aria-label="Delete syllabus"><h2>{deleteSyllabus?'Delete syllabus?':deleteShare.sender_id===user.id?'Remove shared syllabus?':'Delete received syllabus?'}</h2><p className="mt-16">{deleteSyllabus?`Delete ${deleteSyllabus.courseCode} and its authored courseware from your workspace? Its publications will be withdrawn. Recorded assessment history and independently shared copies are retained.`:deleteShare.sender_id===user.id?'Withdraw this shared entry from the recipient. Their independently saved draft is retained.':'Remove this received entry from My Syllabus. Your saved draft and the sender’s syllabus are retained.'}</p>{actionError&&<p role="alert">{actionError}</p>}<div className="modal-actions"><button className="btn btn-secondary" onClick={()=>setDeleteId(null)}>Cancel</button><button className="btn btn-primary" disabled={actionBusy} onClick={async()=>{setActionBusy(true);setActionError('');try{if(deleteSyllabus)await commit(data=>({...data,syllabi:data.syllabi.filter(item=>item.id!==deleteId),content:Object.fromEntries(Object.entries(data.content).filter(([,item])=>item.syllabusId!==deleteId))}));else await sharing.command({operation:'remove',id:deleteShare.id});setDeleteId(null);addToast('Syllabus removed.','success')}catch(error){setActionError(error.message)}finally{setActionBusy(false)}}}>{actionBusy?'Removing…':'Confirm delete'}</button></div></section></ModalLayer>}

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

      {uploadingSyllabus && <ApprovedSyllabusUpload syllabus={uploadingSyllabus} onSave={saveApproved} onClose={() => setUploadingSyllabus(null)} />}
      {showVersionHistory && versionHistorySyllabus && <ModalLayer className="overlay-backdrop" onDismiss={() => setShowVersionHistory(false)}><section role="dialog" aria-label="Syllabus history" className="modal-content" style={{ maxHeight: '80vh', overflow: 'auto' }}>
        <h2>Recorded syllabus changes</h2>
        {versionHistorySyllabus && <p className="text-sm text-muted">{versionHistorySyllabus.courseCode} — {versionHistorySyllabus.courseTitle}</p>}
        {versionHistorySyllabus?.history?.length ? (
          <ol className="version-timeline" style={{ listStyle: 'none', padding: 0, margin: '14px 0', display: 'grid', gap: 8 }}>
            {versionHistorySyllabus.history.map((entry, i) => (
              <li key={i} className="version-entry" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
                <StatusBadge status={entry.status} />
                <span className="text-sm">v{entry.version} · {new Date(entry.timestamp).toLocaleString()} · {entry.author}</span>
              </li>
            ))}
          </ol>
        ) : <p>No recorded changes yet. Sample history is not a saved audit trail.</p>}
        <h3 className="mt-16">Saved syllabus versions</h3>
        <p className="text-sm text-muted">Up to ten editable versions are retained. Restoring creates a draft and clears approval; changed outline weeks require courseware review again. Approved-file bytes are retained only on the current syllabus.</p>
        {(versionHistorySyllabus?.versions || []).map((version,index)=><div className="academic-list-row" key={index}><span>Version {version.version} · {version.courseTitle} · {version.lastUpdated && new Date(version.lastUpdated).toLocaleString()}</span><button className="btn btn-secondary btn-sm" onClick={()=>{setReaderId(versionHistorySyllabus.id);setReaderVersion(index)}}>View saved version</button><button className="btn btn-secondary btn-sm" onClick={async()=>{try{await commit(data=>{const current=data.syllabi.find(syl=>syl.id===versionHistorySyllabus.id);return revisedWorkspace(data,record({...version,id:current.id,version:(current.version || 1)+1,sample:false,approvedFile:undefined,extractedAt:undefined},'drafted'))});setShowVersionHistory(false);addToast('Historical version restored as a draft. Review it before the offline approval route.','success')}catch(failure){addToast(failure.message,'error')}}}>Restore version as draft</button></div>)}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          {versionHistorySyllabus?.approvedFile && <button className="btn btn-secondary" onClick={() => downloadApprovedFile(versionHistorySyllabus.approvedFile)}>Download retained approved file</button>}
          {versionHistorySyllabus?.approvedFile && <button className="btn btn-ghost" onClick={() => { setSyllabi(previous => previous.map(syl => syl.id === versionHistorySyllabus.id ? record({ ...syl, approvedFile: undefined, extractedAt: undefined }, 'drafted') : syl)); setShowVersionHistory(false) }}>Remove attachment and return to draft</button>}
          <button className="btn btn-ghost" onClick={() => setShowVersionHistory(false)}>Close</button>
        </div>
      </section></ModalLayer>}

    </div>
  )
}
