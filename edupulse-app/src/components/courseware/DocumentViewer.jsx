import { useState } from 'react'
import { ArrowLeft, Download, Printer, Save, Pencil, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

/* ─── Document Viewer ───
 * Renders content as a styled A4 document with proper margins,
 * headings, body text, justified alignment, and indentation.
 * Instructors can toggle edit mode to modify sections inline.
 * Used for viewing materials and activities.
 */

export default function DocumentViewer({ content, onBack, isStudent = false, onSave }) {
  const { addToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)

  if (!content) return null

  const sections = editing ? draft : content.sections

  const startEditing = () => {
    setDraft(JSON.parse(JSON.stringify(content.sections || [])))
    setEditing(true)
  }

  const cancelEditing = () => {
    setDraft(null)
    setEditing(false)
  }

  const updateSectionHeading = (idx, value) => {
    setDraft(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], heading: value }
      return next
    })
  }

  const updateSectionBody = (idx, value) => {
    setDraft(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], body: value }
      return next
    })
  }

  const addSection = () => {
    setDraft(prev => [...prev, { heading: 'New Section', body: '' }])
  }

  const removeSection = (idx) => {
    if (draft.length <= 1) return
    setDraft(prev => prev.filter((_, i) => i !== idx))
  }

  const saveEdits = () => {
    if (onSave) {
      onSave(draft)
      addToast('Changes saved', 'success')
    }
    setDraft(null)
    setEditing(false)
  }

  const renderBody = (body, idx, isEditing) => {
    if (isEditing) {
      return (
        <textarea
          className="form-input doc-edit-body"
          value={body || ''}
          onChange={e => updateSectionBody(idx, e.target.value)}
          rows={Math.max(4, (body || '').split('\n').length + 1)}
          placeholder="Enter content (use • for bullets, numbers for lists)..."
        />
      )
    }

    return (
      <div className="doc-viewer-text">
        {(body || '').split('\n').map((line, i) => {
          const trimmed = line.trim()
          if (!trimmed) return <br key={i} />
          const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')
          const isNumbered = /^\d+[\.\)]\s/.test(trimmed)
          const isIndented = line.startsWith('   ')
          return (
            <p key={i} className={
              isBullet ? 'doc-viewer-bullet' :
              isNumbered ? 'doc-viewer-numbered' :
              isIndented ? 'doc-viewer-indented' :
              ''
            }>{trimmed.replace(/^[•\-\*]\s*/, '')}</p>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--gray-100)', minHeight: '100vh', padding: '24px 0' }}>
      {/* Toolbar */}
      <div style={{
        maxWidth: '850px', margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        {!isStudent && (
          editing ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={cancelEditing}>
                <X size={14} /> Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={saveEdits}>
                <Save size={14} /> Save
              </button>
            </>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={startEditing}>
              <Pencil size={14} /> Edit
            </button>
          )
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> Print
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => addToast('Download coming soon', 'info')}>
          <Download size={14} /> Download
        </button>
      </div>

      {/* A4 Document */}
      <div className="doc-viewer-page">
        {/* Header */}
        <div className="doc-viewer-header">
          <div className="doc-viewer-institution">King's College of the Philippines</div>
          <div className="doc-viewer-department">College of Information Technology</div>
        </div>

        {/* Title */}
        <h1 className="doc-viewer-title">{content.title}</h1>
        {content.subtitle && (
          <div className="doc-viewer-subtitle">{content.subtitle}</div>
        )}

        {/* Sections */}
        <div className="doc-viewer-body">
          {sections?.map((section, idx) => (
            <div key={idx} className="doc-viewer-section">
              {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    className="form-input doc-edit-heading"
                    value={section.heading}
                    onChange={e => updateSectionHeading(idx, e.target.value)}
                    style={{ fontWeight: 700, fontSize: '0.9375rem', flex: 1 }}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', color: 'var(--red-400)' }}
                    onClick={() => removeSection(idx)}
                    disabled={sections.length <= 1}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <h2 className="doc-viewer-heading">{section.heading}</h2>
              )}
              {renderBody(section.body, idx, editing)}
            </div>
          ))}
          {editing && (
            <button className="btn btn-ghost" style={{ marginTop: '12px' }} onClick={addSection}>
              + Add Section
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="doc-viewer-footer">
          <div>Page 1 of 1</div>
          <div>{content.title}</div>
        </div>
      </div>

      <style>{`
        .doc-viewer-page {
          max-width: 850px;
          margin: 0 auto;
          background: #fff;
          border-radius: var(--radius-lg);
          box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .doc-viewer-header {
          text-align: center;
          padding: 48px 72px 16px;
          border-bottom: 2px solid var(--gray-800);
        }
        .doc-viewer-institution {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1.125rem;
          color: var(--gray-900);
          letter-spacing: 0.5px;
        }
        .doc-viewer-department {
          font-size: 0.8125rem;
          color: var(--gray-500);
          margin-top: 2px;
        }
        .doc-viewer-title {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--gray-900);
          text-align: center;
          padding: 24px 72px 0;
          margin: 0;
          line-height: 1.4;
        }
        .doc-viewer-subtitle {
          text-align: center;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--sky-600);
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 6px 72px 20px;
        }
        .doc-viewer-body {
          padding: 0 72px 32px;
        }
        .doc-viewer-section {
          margin-bottom: 20px;
        }
        .doc-viewer-heading {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.9375rem;
          color: var(--gray-900);
          margin: 0 0 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid var(--gray-200);
        }
        .doc-viewer-text {
          font-size: 0.8125rem;
          line-height: 1.7;
          color: var(--gray-700);
          text-align: justify;
        }
        .doc-viewer-text p {
          margin: 0 0 4px;
          text-indent: 0;
        }
        .doc-viewer-bullet {
          padding-left: 20px;
          text-indent: -14px;
        }
        .doc-viewer-bullet::before {
          content: '•';
          font-weight: 700;
          color: var(--sky-500);
          margin-right: 6px;
        }
        .doc-viewer-numbered {
          padding-left: 20px;
          text-indent: -20px;
        }
        .doc-viewer-indented {
          padding-left: 36px;
          color: var(--gray-500);
        }
        .doc-viewer-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 72px;
          border-top: 1px solid var(--gray-200);
          font-size: 0.6875rem;
          color: var(--gray-400);
        }
        .doc-edit-heading {
          border: 1px solid var(--sky-300);
          border-radius: var(--radius-md);
          padding: 4px 10px;
          font-family: var(--font-heading);
        }
        .doc-edit-body {
          width: 100%;
          font-size: 0.8125rem;
          line-height: 1.7;
          resize: vertical;
          min-height: 80px;
        }
        @media print {
          .doc-viewer-page {
            box-shadow: none;
            border-radius: 0;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
