import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { parseSyllabusFile } from '../../utils/syllabusParser'

const SECTION_LABELS = [
  'Course Information',
  'Course Description',
  'Institutional Context',
  'Program Outcomes',
  'Course Outline',
  'Requirements, Grading & Policy',
  'References',
]

export default function UploadExistingSyllabus({ onExtract, onCancel, compact }) {
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const [expandedSection, setExpandedSection] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFile = useCallback(async (f) => {
    if (!f) return
    if (!f.name.match(/\.docx$/i)) {
      setError('Only .docx files are supported')
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
      const result = await parseSyllabusFile(f)
      setParsed(result)
    } catch (err) {
      setError('Failed to parse the document. Please ensure it is a valid .docx syllabus file.')
      setParsed(null)
    } finally {
      setParsing(false)
    }
  }, [])

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

  const handleUseSyllabus = () => {
    if (parsed) onExtract(parsed)
  }

  const sectionPreview = (idx) => {
    if (!parsed?.sections?.[idx]) return null
    const sec = parsed.sections[idx]
    const p = sec.parsed || {}
    switch (idx) {
      case 0: return `${p.courseCode || '—'} · ${p.courseTitle || '—'} · ${p.periodOffered || '—'}`
      case 1: return (p.description || '').substring(0, 120) + ((p.description || '').length > 120 ? '…' : '')
      case 2: return 'KCP Vision, Mission, Objectives + CIT Mission, Objectives'
      case 3: return `${(p.programOutcomes || []).filter(o => o.trim()).length} program outcome(s) found`
      case 4: return `${(p.courseOutline || []).filter(w => w.ilos || w.contents?.some(c => c.trim())).length} of 18 weeks with content`
      case 5: return `Grading + ${(p.coursePolicy || []).length} policy items`
      case 6: return `${(p.books || []).filter(b => b.title).length} book(s), ${(p.onlineReferences || []).filter(r => r.url).length} link(s)`
      default: return null
    }
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />

        {parsing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="upload-zone-icon" style={{ animation: 'spin 1s linear infinite' }}>
              <Loader2 size={24} style={{ color: 'var(--sky-500)' }} />
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Parsing syllabus document…</div>
          </div>
        ) : !file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div className="upload-zone-icon">
              <Upload size={24} style={{ color: 'var(--sky-500)' }} />
            </div>
            {!compact && <p style={{ fontWeight: 700, marginBottom: '4px' }}>Drop your syllabus .docx here or click to browse</p>}
            <p className="text-sm text-muted">The system will extract content and auto-fill the 7-section syllabus form.</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: '4px' }}>Accepted: .docx · Max 10MB</p>
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
              <FileText size={24} style={{ color: 'var(--green-600, #16a34a)' }} />
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }}>{file.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
              {(file.size / 1024).toFixed(0)} KB · {parsed ? 'Parsed successfully' : 'Ready to parse'}
            </div>
          </div>
        )}
      </div>

      {parsed && (
        <div style={{ marginTop: '16px' }}>
          {parsed.courseMatch && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
              background: 'var(--green-50, #f0fdf4)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--green-200, #bbf7d0)', marginBottom: '12px', fontSize: '0.8125rem',
            }}>
              <CheckCircle size={16} style={{ color: 'var(--green-500, #22c55e)' }} />
              <span style={{ color: 'var(--green-800, #166534)' }}>
                Matched to curriculum: <strong>{parsed.courseMatch.code} — {parsed.courseMatch.title}</strong>
              </span>
            </div>
          )}

          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '8px' }}>
            Extracted Sections Preview
          </div>
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {SECTION_LABELS.map((label, idx) => (
              <div key={idx}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                    borderBottom: idx < 6 ? '1px solid var(--gray-100)' : 'none',
                    cursor: 'pointer', background: expandedSection === idx ? 'var(--gray-50)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                >
                  {expandedSection === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem', minWidth: '180px' }}>
                    Section {idx + 1}: {label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', flex: 1 }}>
                    {sectionPreview(idx)}
                  </span>
                </div>
                {expandedSection === idx && parsed.sections[idx]?.raw && (
                  <div style={{ padding: '10px 14px 10px 40px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)' }}>
                    <pre style={{ fontSize: '0.6875rem', color: 'var(--gray-600)', whiteSpace: 'pre-wrap', margin: 0, maxHeight: '120px', overflow: 'auto' }}>
                      {parsed.sections[idx].raw.substring(0, 500)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleUseSyllabus}>
              <CheckCircle size={14} /> Use This Syllabus
            </button>
            <button className="btn btn-secondary" onClick={() => { setFile(null); setParsed(null); setError(null) }}>
              Choose Different File
            </button>
            <button className="btn btn-ghost" onClick={onCancel}>
              Skip — Start Empty
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
