import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  CURRICULUM_COURSES, BLOCK_SECTIONS, INSTRUCTORS, STUDENT_RECORDS, FILE_IMPORT_CONFIG,
} from '../data/mockData'
import {
  Layers, Upload, Download, Check, X, Clock, Database,
  ChevronLeft, Users, BookOpen, Eye, GraduationCap, Mail, FileSpreadsheet, Info, Search,
} from 'lucide-react'

// Records — FLOW_SPEC Phase 0 (records intake), Dean / Associate Dean only.
// EduSuite is the system of record: EduPulse receives its exported files
// (course records, course loads, student rosters/blocks), parses them, shows
// what it understood, and the admin confirms. No live integration. Blocks are
// CONSUMED from EduSuite — EduPulse never creates or edits them.
const ALL_TABS = [
  { key: 'import', label: 'Import EduSuite Files' },
  { key: 'sections', label: 'Blocks & Rosters' },
  { key: 'courses', label: 'Course Catalog' },
]

/* ───────────────────────── Import tab (Phase 0) ───────────────────────── */

function UploadZone({ title, description, acceptedTypes, icon: Icon, onImported }) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [errors, setErrors] = useState([])
  const [validRows, setValidRows] = useState(0)

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragover') }
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]) }
  const handleChange = (e) => { if (e.target.files[0]) processFile(e.target.files[0]) }

  const processFile = (f) => {
    setFile(f)
    if (!acceptedTypes.some(t => f.name.endsWith(t))) {
      setErrors([{ row: 0, error: 'Invalid file type. Accepted: ' + acceptedTypes.join(', ') }])
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const lines = text.split('\n').filter(l => l.trim())
        const headers = (lines[0] || '').split(',').map(h => h.trim())
        const dataRows = lines.slice(1)
        let valid = 0
        const rowErrors = []
        dataRows.forEach((row, i) => {
          const cols = row.split(',')
          if (cols.length === headers.length && cols.every(c => c.trim())) valid++
          else rowErrors.push({ row: i + 2, error: 'Column count mismatch or empty fields' })
        })
        setPreview({ headers, sampleRows: dataRows.slice(0, 5).map(r => r.split(',')), totalRows: dataRows.length })
        setValidRows(valid)
        setErrors(rowErrors)
      } catch {
        setErrors([{ row: 0, error: 'Failed to parse file' }])
      }
    }
    reader.readAsText(f)
  }

  const reset = () => { setFile(null); setPreview(null); setValidRows(0); setErrors([]) }

  const handleConfirm = () => {
    if (file && onImported) {
      onImported({ filename: file.name, validRows, errorRows: errors.length })
      reset()
    }
  }

  return (
    <div className="card">
      <div className="card-header"><h3>{Icon && <Icon size={18} />} {title}</h3></div>
      <div className="card-body">
        {!file ? (
          <div onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} className="upload-zone" style={{ borderColor: dragActive ? 'var(--sky-500)' : undefined }}>
            <input type="file" style={{ display: 'none' }} onChange={handleChange} accept={acceptedTypes.join(',')} id={`upload-${title.replace(/\s/g, '')}`} />
            <label htmlFor={`upload-${title.replace(/\s/g, '')}`} style={{ cursor: 'pointer' }}>
              <div className="upload-zone-icon"><Upload size={24} style={{ color: 'var(--sky-500)' }} /></div>
              <p style={{ fontWeight: 700, marginBottom: '4px' }}>Drop the {title} export here or click to browse</p>
              <p className="text-sm text-muted">{description}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: '8px' }}>Accepted: {acceptedTypes.join(', ')} · Max 10MB</p>
            </label>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--sky-50)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--green-500)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{file.name}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--gray-500)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={reset}><X size={14} /></button>
            </div>
            {preview && (
              <div style={{ marginBottom: '12px', fontSize: '0.75rem' }}>
                <p style={{ fontWeight: 600, marginBottom: '6px' }}>Here's what the system understood — confirm to import.</p>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span><strong>Headers:</strong> {preview.headers.join(', ')}</span>
                  <span style={{ color: validRows === preview.totalRows ? 'var(--green-500)' : 'var(--amber-500)' }}><strong>Valid rows:</strong> {validRows}/{preview.totalRows}</span>
                  {errors.length > 0 && <span style={{ color: 'var(--red-500)' }}><strong>Rejected:</strong> {errors.length}</span>}
                </div>
                <div style={{ maxHeight: '180px', overflow: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)' }}>
                  <table className="data-table" style={{ fontSize: '0.6875rem' }}>
                    <thead><tr>{preview.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{preview.sampleRows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell || '<empty>'}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}
            {errors.length > 0 && (
              <div className="warning-banner mb-16">
                <span>
                  <strong>{errors.length} row(s) rejected — not imported:</strong>
                  <ul style={{ marginTop: '4px', paddingLeft: '18px' }}>
                    {errors.slice(0, 5).map((e, i) => <li key={i}>Row {e.row}: {e.error}</li>)}
                    {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
                  </ul>
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={validRows === 0}><Check size={14} /> Confirm Import ({validRows} records)</button>
              <button className="btn btn-secondary" onClick={reset}><X size={14} /> Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ImportTemplates() {
  const { addToast } = useToast()
  const downloadTemplate = (template) => {
    const csv = template.fields.join(',') + '\n' + template.fields.map(() => '').join(',')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = template.downloadName; a.click()
    URL.revokeObjectURL(url)
    addToast(`Downloaded ${template.name}`, 'success')
  }
  return (
    <div className="card">
      <div className="card-header">
        <h3><Download size={18} /> Import Templates</h3>
        <span className="text-sm text-muted">Expected column layouts for EduSuite exports</span>
      </div>
      <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
        {FILE_IMPORT_CONFIG.templates.map(template => (
          <div key={template.id} style={{ padding: '14px', borderRadius: 'var(--radius-lg)', background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <FileSpreadsheet size={18} style={{ color: 'var(--green-500)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{template.name}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '10px' }}>{template.description}</p>
            <button className="btn btn-primary btn-sm" onClick={() => downloadTemplate(template)} style={{ width: '100%' }}><Download size={12} /> Download</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function UploadHistoryPanel({ history }) {
  const statusStyles = {
    completed: { bg: 'var(--green-100)', color: '#166534', label: 'Completed' },
    partial: { bg: 'var(--amber-100)', color: '#92400e', label: 'Partial' },
    failed: { bg: 'var(--red-100)', color: '#991b1b', label: 'Failed' },
  }
  return (
    <div className="card">
      <div className="card-header"><h3><Clock size={18} /> Import History</h3></div>
      <div className="card-body" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr><th>Filename</th><th>Type</th><th>Uploaded By</th><th>Date</th><th>Status</th><th>Records</th><th>Created</th><th>Updated</th><th>Rejected</th></tr></thead>
          <tbody>
            {history.map(h => {
              const s = statusStyles[h.status] || statusStyles.completed
              return (
                <tr key={h.id}>
                  <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{h.filename}</td>
                  <td className="text-sm">{h.type}</td>
                  <td className="text-sm">{h.uploadedBy}</td>
                  <td className="text-sm">{new Date(h.uploadedAt).toLocaleString()}</td>
                  <td><span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.6875rem', fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span></td>
                  <td className="text-sm">{h.records}</td>
                  <td className="text-sm" style={{ color: 'var(--green-500)' }}>+{h.created}</td>
                  <td className="text-sm" style={{ color: 'var(--sky-500)' }}>↻{h.updated}</td>
                  <td className="text-sm">{h.errors > 0 ? <span style={{ color: 'var(--red-500)' }}>{h.errors}</span> : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ImportTab({ user }) {
  const { addToast } = useToast()
  const [subTab, setSubTab] = useState('records')
  const [history, setHistory] = useState(FILE_IMPORT_CONFIG.uploadHistory)

  const recordImport = (type) => ({ filename, validRows, errorRows }) => {
    setHistory(prev => [{
      id: `uh-${Date.now()}`, filename, type, uploadedBy: user?.name || 'Admin',
      uploadedAt: new Date().toISOString(), status: errorRows > 0 ? 'partial' : 'completed',
      records: validRows + errorRows, created: validRows, updated: 0, errors: errorRows, duration: '1.0s',
    }, ...prev])
    addToast(errorRows > 0
      ? `Imported ${validRows} records — ${errorRows} row(s) rejected and reported`
      : `Imported ${validRows} records successfully`, errorRows > 0 ? 'warning' : 'success')
  }

  const subTabs = [
    { id: 'records', label: 'Course Records' },
    { id: 'loads', label: 'Course Loads' },
    { id: 'roster', label: 'Student Rosters' },
    { id: 'templates', label: 'Templates' },
    { id: 'history', label: 'History' },
  ]

  return (
    <div>
      <p className="text-sm text-muted mb-16">
        EduSuite is the system of record. Upload its exported files — course records (per the CMO-based curriculum),
        course loads, and student rosters (blocks/sections with schedules). The system parses each file and shows
        what it understood; nothing is saved until you confirm. There is no live EduSuite integration.
      </p>
      <div className="tabs mb-24" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {subTabs.map(t => (
          <button key={t.id} className={`tab ${subTab === t.id ? 'active' : ''}`} onClick={() => setSubTab(t.id)} style={{ whiteSpace: 'nowrap' }}>{t.label}</button>
        ))}
      </div>

      {subTab === 'records' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <UploadZone title="Course Records" description="EduSuite course records per the CHED CMO No. 25 s. 2015 curriculum (CourseCode, CourseTitle, Units, Classification, Hours, Prerequisites, YearLevel, Semester). The curriculum is fixed — EduPulse never edits it." acceptedTypes={['.csv', '.xlsx']} icon={Database} onImported={recordImport('Course Records')} />
          <div className="card">
            <div className="card-header"><h3><Info size={16} /> About course records</h3></div>
            <div className="card-body" style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', lineHeight: 1.7 }}>
              Imported course records become the Course Catalog and the basis for course loading. They also serve as
              reference data when instructors build syllabi and as grounding for courseware generation — the
              curriculum is never edited inside EduPulse and only changes when CHED replaces it.
            </div>
          </div>
        </div>
      )}
      {subTab === 'loads' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <UploadZone title="Course Loads" description="EduSuite course-load export (InstructorID, InstructorName, Email, CourseCode, Block, Semester). Loads can also be assigned in Course Loading with AI assistance." acceptedTypes={['.csv', '.xlsx']} icon={BookOpen} onImported={recordImport('Course Loads')} />
          <ImportTemplates />
        </div>
      )}
      {subTab === 'roster' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <UploadZone title="Student Rosters" description="EduSuite block/section rosters (StudentID, Name, Email, YearLevel, Block, Schedule, Status). Students enroll in EduSuite and are blocked first come, first served — up to 35 per block. EduPulse consumes this structure; it never creates it." acceptedTypes={['.csv', '.xlsx']} icon={Users} onImported={recordImport('Student Rosters')} />
          <ImportTemplates />
        </div>
      )}
      {subTab === 'templates' && <ImportTemplates />}
      {subTab === 'history' && <UploadHistoryPanel history={history} />}
    </div>
  )
}

/* ─────────────── Blocks & Rosters tab — read-only (consumed from EduSuite) ─────────────── */

function StudentRosterTable({ section }) {
  const students = STUDENT_RECORDS.filter(s => s.section === section.code)
  return (
    <div className="card">
      <div className="card-header"><h3><Users size={16} /> Student Roster — {section.code}</h3></div>
      <div className="card-body" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr><th>Student ID</th><th>Name</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{s.id}</td>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td><span className="badge badge-published">Enrolled</span></td>
                <td><button className="btn btn-ghost btn-sm"><Eye size={12} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="text-center text-muted" style={{ padding: '24px' }}>No students enrolled in this block</p>}
      </div>
    </div>
  )
}

function BlockCoursesPanel({ section }) {
  // A block enlists the same courses on a shared schedule (FLOW_SPEC ground
  // truth #4) — this is the block's enlisted course list, read-only.
  const blockCourses = CURRICULUM_COURSES.filter(s => s.yearLevel === section.yearLevel && s.semester === section.semester)
  return (
    <div className="card">
      <div className="card-header"><h3><BookOpen size={16} /> Enlisted Courses — {section.code}</h3></div>
      <div className="card-body">
        <p className="text-sm text-muted mb-16">Every student in this block takes these courses on the block's shared schedule (from the EduSuite roster export).</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {blockCourses.map(course => (
            <div key={course.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--sky-100)', background: 'var(--sky-50)' }}>
              <BookOpen size={14} style={{ color: 'var(--sky-500)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{course.code}</div>
                <div className="text-sm text-muted">{course.title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BlockCard({ section, onViewStudents, onViewCourses }) {
  const adviser = INSTRUCTORS.find(i => i.id === section.adviserId)
  const studentCount = STUDENT_RECORDS.filter(s => s.section === section.code).length
  return (
    <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--sky-100)', background: 'var(--gray-50)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--sky-600)' }}>{section.code}</span>
            <span className={`badge ${section.semester === 1 ? 'badge-published' : 'badge-draft'}`} style={{ fontSize: '0.625rem' }}>{section.semester === 1 ? '1st Sem' : '2nd Sem'}</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)' }}>Year {section.yearLevel} · {studentCount} enrolled · capacity 35 (EduSuite blocks first come, first served)</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onViewStudents(section)}><Eye size={12} /> Students</button>
          <button className="btn btn-secondary btn-sm" onClick={() => onViewCourses(section)}><BookOpen size={12} /> Courses</button>
        </div>
      </div>
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--sky-100)', fontSize: '0.8125rem', color: 'var(--gray-600)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div><GraduationCap size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Adviser: {adviser?.name || 'Unassigned'}</div>
        <div><Mail size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {adviser?.email || '—'}</div>
      </div>
    </div>
  )
}

function SectionsTab() {
  const [view, setView] = useState('list')
  const [viewingStudents, setViewingStudents] = useState(null)
  const [viewingCourses, setViewingCourses] = useState(null)

  return (
    <div>
      <p className="text-sm text-muted" style={{ marginBottom: '16px' }}>
        Blocks and rosters as imported from EduSuite. Students are blocked into sections first come, first served
        (up to 35 per block); a block enlists the same courses on a shared schedule. EduPulse consumes this
        structure — to change it, re-export from EduSuite and re-import here.
      </p>

      {view === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
          {BLOCK_SECTIONS.map(section => (
            <BlockCard key={section.id} section={section}
              onViewStudents={(s) => { setViewingStudents(s); setView('students') }}
              onViewCourses={(s) => { setViewingCourses(s); setView('courses') }}
            />
          ))}
        </div>
      )}

      {view === 'students' && viewingStudents && (
        <div>
          <button className="btn btn-secondary btn-sm mb-16" onClick={() => setView('list')}><ChevronLeft size={14} /> Back to Blocks</button>
          <StudentRosterTable section={viewingStudents} />
        </div>
      )}

      {view === 'courses' && viewingCourses && (
        <div>
          <button className="btn btn-secondary btn-sm mb-16" onClick={() => setView('list')}><ChevronLeft size={14} /> Back to Blocks</button>
          <BlockCoursesPanel section={viewingCourses} />
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── Course Catalog tab — read-only ───────────────────────── */

function CoursesTab() {
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState('all')

  const filtered = CURRICULUM_COURSES.filter(s => {
    const matchSearch = s.code.toLowerCase().includes(search.toLowerCase()) || s.title.toLowerCase().includes(search.toLowerCase())
    const matchYear = filterYear === 'all' || s.yearLevel === Number(filterYear)
    return matchSearch && matchYear
  })

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Course Catalog</h3>
      <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: 16 }}>
        {CURRICULUM_COURSES.length} released courses across {new Set(CURRICULUM_COURSES.map(s => s.yearLevel)).size} year levels,
        from the imported EduSuite course records (CHED CMO No. 25 s. 2015 — read-only).
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', background: 'var(--white)', flex: 1 }}>
          <Search size={16} style={{ color: 'var(--gray-400)' }} />
          <input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: 'transparent' }} />
        </div>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)', fontSize: '0.8125rem' }}>
          <option value="all">All Years</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Code</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Title</th>
              <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Units</th>
              <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Year</th>
              <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Sem</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: 'var(--gray-600)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Curriculum Ref</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(course => (
              <tr key={course.code} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{course.code}</td>
                <td style={{ padding: '12px 16px', color: 'var(--gray-700)' }}>{course.title}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{course.units}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{course.yearLevel}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{course.semester === 'summer' ? 'Summer' : course.semester}</td>
                <td style={{ padding: '12px 16px', color: 'var(--gray-500)', fontSize: '0.75rem' }}>{course.curriculumCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ───────────────────────── Page shell ───────────────────────── */

export default function Records() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab = ALL_TABS.some(t => t.key === requested) ? requested : ALL_TABS[0].key
  const setTab = (key) => setSearchParams({ tab: key })
  const isAdmin = user?.role === 'admin'

  if (!isAdmin) return null

  return (
    <div className="container" data-pulse-zone="records">
      <div className="page-header">
        <div>
          <h1><Layers size={24} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Records</h1>
          <p className="text-sm text-muted mt-8">EduSuite records intake — course records, course loads, student rosters (blocks)</p>
        </div>
      </div>

      <div className="tabs mb-24" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {ALL_TABS.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} style={{ whiteSpace: 'nowrap' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'import' && <ImportTab user={user} />}
      {tab === 'sections' && <SectionsTab />}
      {tab === 'courses' && <CoursesTab />}
    </div>
  )
}
