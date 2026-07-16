import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, File } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { CURRICULUM_COURSES } from '../../data/mockData'

// Block Section Uploader — handles CSV, Excel, and PDF file uploads for
// registering courses with block section student data from EduSuite.
// This is a separate action from syllabus creation.

const ACCEPTED_FORMATS = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/pdf': ['.pdf'],
}

const FILE_EXTENSIONS = '.csv,.xlsx,.xls,.pdf'

function parseCSVContent(content) {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return { students: [], headers: [] }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const students = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const student = {}
    headers.forEach((header, idx) => {
      student[header] = values[idx] || ''
    })
    return student
  })

  return { students, headers }
}

function simulateExcelParse(file) {
  // Simulate Excel parsing with mock data
  return {
    students: [
      { StudentID: 'STU-2026-001', Name: 'Juan Santos', Email: 'juan.santos@kcp.edu.ph', YearLevel: '1', Block: 'BSIT-1A', Status: 'Active' },
      { StudentID: 'STU-2026-002', Name: 'Maria Reyes', Email: 'maria.reyes@kcp.edu.ph', YearLevel: '1', Block: 'BSIT-1A', Status: 'Active' },
      { StudentID: 'STU-2026-003', Name: 'Jose Cruz', Email: 'jose.cruz@kcp.edu.ph', YearLevel: '1', Block: 'BSIT-1A', Status: 'Active' },
    ],
    headers: ['StudentID', 'Name', 'Email', 'YearLevel', 'Block', 'Status'],
  }
}

function simulatePDFParse(file) {
  // Simulate PDF parsing with mock data
  return {
    students: [
      { StudentID: 'STU-2026-001', Name: 'Juan Santos', Email: 'juan.santos@kcp.edu.ph', YearLevel: '1', Block: 'BSIT-1A', Status: 'Active' },
      { StudentID: 'STU-2026-002', Name: 'Maria Reyes', Email: 'maria.reyes@kcp.edu.ph', YearLevel: '1', Block: 'BSIT-1A', Status: 'Active' },
      { StudentID: 'STU-2026-003', Name: 'Jose Cruz', Email: 'jose.cruz@kcp.edu.ph', YearLevel: '1', Block: 'BSIT-1A', Status: 'Active' },
    ],
    headers: ['StudentID', 'Name', 'Email', 'YearLevel', 'Block', 'Status'],
  }
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

  const handleFile = useCallback(async (f) => {
    if (!f) return

    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls', 'pdf'].includes(ext)) {
      setError('Supported formats: CSV, Excel (.xlsx/.xls), or PDF')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB')
      return
    }

    setFile(f)
    setError(null)
    setParsing(true)

    try {
      let result
      const ext = f.name.split('.').pop().toLowerCase()

      if (ext === 'csv') {
        const content = await f.text()
        result = parseCSVContent(content)
      } else if (ext === 'xlsx' || ext === 'xls') {
        // Simulate Excel parsing
        result = simulateExcelParse(f)
      } else if (ext === 'pdf') {
        // Simulate PDF parsing
        result = simulatePDFParse(f)
      }

      // Try to detect course code from filename or content
      const filenameLower = f.name.toLowerCase()
      const detectedCourse = CURRICULUM_COURSES.find(c =>
        filenameLower.includes(c.code.toLowerCase().replace(/\s/g, ''))
      )
      if (detectedCourse) {
        setSelectedCourse(detectedCourse.code)
      }

      // Try to detect block section
      const detectedBlock = result.students[0]?.Block
      if (detectedBlock) {
        setSelectedBlock(detectedBlock)
      }

      setParsed(result)
      addToast(`Parsed ${result.students.length} student records from ${f.name}`, 'success')
    } catch (err) {
      setError('Failed to parse the file. Please check the format and try again.')
      setParsed(null)
    } finally {
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

    const course = CURRICULUM_COURSES.find(c => c.code === selectedCourse)
    const registration = {
      courseCode: selectedCourse,
      courseTitle: course?.title || '',
      blockSection: selectedBlock || 'Unknown',
      studentCount: parsed.students.length,
      fileName: file.name,
      students: parsed.students,
      headers: parsed.headers,
    }

    onRegister(registration)
    addToast(`Course ${selectedCourse} registered with ${parsed.students.length} students`, 'success')
  }

  const getFileIcon = () => {
    if (!file) return <Upload size={24} style={{ color: 'var(--sky-500)' }} />
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'csv') return <FileText size={24} style={{ color: 'var(--sky-500)' }} />
    if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet size={24} style={{ color: 'var(--green-600, #16a34a)' }} />
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
        onClick={() => inputRef.current?.click()}
        style={{ cursor: 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={FILE_EXTENSIONS}
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />

        {parsing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ animation: 'spin 1s linear infinite' }}>
              <Loader2 size={24} style={{ color: 'var(--sky-500)' }} />
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Parsing student data…</div>
          </div>
        ) : !file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div className="upload-zone-icon">
              <Upload size={24} style={{ color: 'var(--sky-500)' }} />
            </div>
            <p style={{ fontWeight: 700, marginBottom: '4px' }}>Drop your EduSuite block section file here or click to browse</p>
            <p className="text-sm text-muted">Upload CSV, Excel, or PDF with student class list data from EduSuite</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: '4px' }}>
              Accepted: .csv, .xlsx, .xls, .pdf · Max 10MB
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
              {(file.size / 1024).toFixed(0)} KB · {parsed ? `${parsed.students.length} students parsed` : 'Ready to parse'}
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
              <label className="form-label">Select Course *</label>
              <select
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
              <label className="form-label">Block Section</label>
              <input
                className="form-input"
                value={selectedBlock}
                onChange={e => setSelectedBlock(e.target.value)}
                placeholder="e.g., BSIT-1A"
              />
            </div>
          </div>

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
            <button className="btn btn-primary" onClick={handleRegister} disabled={!selectedCourse}>
              <CheckCircle size={14} /> Register Course
            </button>
            <button className="btn btn-secondary" onClick={() => { setFile(null); setParsed(null); setError(null); setSelectedCourse(''); setSelectedBlock('') }}>
              Choose Different File
            </button>
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
