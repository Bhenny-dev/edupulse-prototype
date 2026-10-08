import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, File } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { CURRICULUM_COURSES } from '../../data/mockData'
import { extractDocument } from '../../lib/aiClient'
import { parseRoster, ROSTER_HEADERS } from '../../utils/rosterParser'
import { findCourseMentions } from '../../agents/operator'

// Block Section Uploader — reads an EduSuite class list (CSV, Excel, PDF, Word or text)
// to register a course's block section. Office and PDF files are read by the same
// sandboxed extractor as the knowledge library; nothing is registered until the
// instructor checks the preview and presses Register Course.

const FILE_EXTENSIONS = '.csv,.xlsx,.pdf,.docx,.txt'
const EXTENSIONS = ['csv', 'xlsx', 'pdf', 'docx', 'txt']

/** Reads a class list file into students, or explains why it could not. */
async function readClassList(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const text = ext === 'csv' || ext === 'txt' ? await file.text() : (await extractDocument(file)).text
  const roster = parseRoster(text, file.name)
  if (!roster) throw new Error('No class list was found in this file. Use a table with a Name column (or Last Name and First Name), one student per row.')
  const course = findCourseMentions(`${file.name} ${roster.courseValues.join(' ')} ${text.slice(0, 600)}`, CURRICULUM_COURSES)[0]?.code || ''
  return { students: roster.students, headers: ROSTER_HEADERS, warnings: roster.warnings, block: roster.block, course }
}

export default function BlockSectionUploader({ onRegister, onCancel }) {
  const { addToast } = useToast()
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBlock, setSelectedBlock] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)
  const parsingRef = useRef(false)

  const handleFile = useCallback(async (f) => {
    if (!f || parsingRef.current) return
    setFile(f)
    setParsed(null)
    setSelectedCourse('')
    setSelectedBlock('')

    const ext = f.name.split('.').pop().toLowerCase()
    if (!EXTENSIONS.includes(ext)) {
      setFile(f)
      setError('Supported formats: CSV, Excel (.xlsx), PDF, Word (.docx) or text. Save older .xls files as .xlsx.')
      return
    }
    if (f.size > 4_000_000) {
      setFile(f)
      setError('Files must be 4 MB or smaller.')
      return
    }

    setFile(f)
    setError(null)
    parsingRef.current = true
    setParsing(true)

    try {
      const result = await readClassList(f)
      if (result.course) setSelectedCourse(result.course)
      if (result.block) setSelectedBlock(result.block)
      setParsed(result)
      addToast(`Read ${result.students.length} students from ${f.name}`, 'success')
    } catch (err) {
      setError(err.message || 'The file could not be read. Check the format and try again.')
      setParsed(null)
    } finally {
      parsingRef.current = false
      setParsing(false)
    }
  }, [addToast])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer?.files?.[0]
    handleFile(f)
  }, [handleFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleRegister = () => {
    if (!selectedCourse) {
      addToast('Please select a course to register', 'error')
      return
    }
    if (!parsed || parsed.students.length === 0) {
      addToast('No student data to register', 'error')
      return
    }

    if (!selectedBlock.trim()) {
      addToast('Enter the block section, for example BSIT-1A', 'error')
      return
    }

    const course = CURRICULUM_COURSES.find(c => c.code === selectedCourse)
    onRegister({ courseCode: selectedCourse, courseTitle: course?.title || '', blockSection: selectedBlock.trim().toUpperCase(), students: parsed.students, fileName: file.name })
    reset()
  }
  const reset = () => { setFile(null); setParsed(null); setError(null); setSelectedCourse(''); setSelectedBlock('') }

  const getFileIcon = () => {
    if (!file) return <Upload size={24} style={{ color: 'var(--sky-500)' }} />
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'csv') return <FileText size={24} style={{ color: 'var(--sky-500)' }} />
    if (ext === 'xlsx') return <FileSpreadsheet size={24} style={{ color: 'var(--green-600, #16a34a)' }} />
    if (ext === 'pdf') return <File size={24} style={{ color: 'var(--red-500)' }} />
    return <FileText size={24} style={{ color: 'var(--sky-500)' }} />
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !parsing && inputRef.current?.click()}
        style={{ cursor: 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={FILE_EXTENSIONS}
          style={{ display: 'none' }}
          disabled={parsing}
          onChange={e => { const selected = e.target.files?.[0]; e.target.value = ''; handleFile(selected) }}
        />

        {parsing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ animation: 'spin 1s linear infinite' }}>
              <Loader2 size={24} style={{ color: 'var(--sky-500)' }} />
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Reading the class list…</div>
          </div>
        ) : !file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div className="upload-zone-icon">
              <Upload size={24} style={{ color: 'var(--sky-500)' }} />
            </div>
            <p style={{ fontWeight: 700, marginBottom: '4px' }}>Drop your EduSuite block section file here or click to browse</p>
            <p className="text-sm text-muted">Upload the EduSuite class list as CSV, Excel, PDF or Word: one student per row with a Name column</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: '4px' }}>
              Accepted: .csv, .xlsx, .pdf, .docx, .txt · Max 4 MB · You can also attach it to Pulse
            </p>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="upload-zone-icon" style={{ background: 'linear-gradient(135deg, var(--red-100, #fee2e2), var(--red-200, #fecaca))' }}>
              <AlertCircle size={24} style={{ color: 'var(--red-500)' }} />
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--red-600)' }}>{error}</div>
            <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setFile(null); setParsed(null); setError(null) }}>
              Try Again
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="upload-zone-icon" style={{ background: 'linear-gradient(135deg, var(--green-100, #dcfce7), var(--green-200, #bbf7d0))' }}>
              {getFileIcon()}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>{file.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              {(file.size / 1024).toFixed(0)} KB · {parsed ? `${parsed.students.length} students read` : 'Ready to read'}
            </div>
          </div>
        )}
      </div>

      {/* Registration Form */}
      {parsed && (
        <div style={{ marginTop: '16px' }}>
          {/* Course Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label" htmlFor="register-course">Select Course *</label>
              <select
                id="register-course"
                className="form-input"
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
              >
                <option value="">Choose a course...</option>
                {CURRICULUM_COURSES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="register-block">Block Section *</label>
              <input
                id="register-block"
                className="form-input"
                value={selectedBlock}
                maxLength={20}
                onChange={e => setSelectedBlock(e.target.value)}
                placeholder="e.g., BSIT-1A"
              />
            </div>
          </div>

          {parsed.warnings.length > 0 && (
            <ul role="status" style={{ margin: '0 0 12px', paddingLeft: '18px', fontSize: '0.75rem', color: 'var(--amber-700, #b45309)' }}>
              {parsed.warnings.map(warning => <li key={warning}>{warning}</li>)}
            </ul>
          )}

          {/* Student Preview */}
          {parsed.students.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '8px' }}>
                Student Preview ({parsed.students.length} records)
              </div>
              <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', overflow: 'auto', maxHeight: '200px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                      {parsed.headers.slice(0, 5).map(header => (
                        <th key={header} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--gray-600)' }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.students.slice(0, 5).map((student, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        {parsed.headers.slice(0, 5).map(header => (
                          <td key={header} style={{ padding: '8px 12px', color: 'var(--gray-700)' }}>
                            {student[header] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.students.length > 5 && (
                  <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--gray-500)', textAlign: 'center', background: 'var(--gray-50)' }}>
                    ... and {parsed.students.length - 5} more students
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleRegister} disabled={!selectedCourse || !selectedBlock.trim()}>
              <CheckCircle size={14} /> Register Course
            </button>
            <button className="btn btn-secondary" onClick={reset}>
              Choose Different File
            </button>
            <button className="btn btn-ghost" onClick={() => { reset(); onCancel?.() }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
