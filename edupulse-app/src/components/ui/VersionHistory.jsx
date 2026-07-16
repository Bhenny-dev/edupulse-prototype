import { useState } from 'react'
import { useToast } from '../../context/ToastContext'
import {
  History, Eye, RotateCcw, Tag, Clock, ChevronDown, ChevronRight,
  GitCompare, Download, AlertTriangle, Check, X, Search, Filter,
  FileText, Lock, Unlock, Archive, Star, MessageSquare, Link2, Shield
} from 'lucide-react'

const TAG_COLORS = {
  Draft: { bg: 'var(--amber-100)', color: '#92400e' },
  Reviewed: { bg: 'var(--sky-100)', color: 'var(--sky-700)' },
  Final: { bg: 'var(--green-100)', color: '#166534' },
  Published: { bg: 'var(--green-100)', color: '#166534' },
  Deprecated: { bg: 'var(--gray-200)', color: 'var(--gray-600)' },
  Archived: { bg: 'var(--purple-100)', color: '#6b21a8' },
}

const REVIEW_STATUS = {
  pending: { label: 'Pending Review', color: 'var(--amber-500)', bg: 'var(--amber-100)' },
  approved: { label: 'Approved', color: 'var(--green-500)', bg: 'var(--green-100)' },
  returned: { label: 'Returned', color: 'var(--red-500)', bg: 'var(--red-100)' },
}

function DiffView({ oldVersion, newVersion }) {
  const changes = []
  if (oldVersion.topics !== newVersion.topics) {
    const diff = newVersion.topics - oldVersion.topics
    changes.push({ type: diff > 0 ? 'added' : 'removed', field: 'Topics', old: oldVersion.topics, new: newVersion.topics })
  }
  if (oldVersion.ilos !== newVersion.ilos) {
    const diff = newVersion.ilos - oldVersion.ilos
    changes.push({ type: diff > 0 ? 'added' : 'removed', field: 'ILOs', old: oldVersion.ilos, new: newVersion.ilos })
  }
  if (oldVersion.assessmentWeight !== newVersion.assessmentWeight) {
    changes.push({ type: 'modified', field: 'Assessment Weight', old: oldVersion.assessmentWeight, new: newVersion.assessmentWeight })
  }
  if (oldVersion.tag !== newVersion.tag) {
    changes.push({ type: 'modified', field: 'Tag', old: oldVersion.tag, new: newVersion.tag })
  }
  if (oldVersion.note !== newVersion.note) {
    changes.push({ type: 'modified', field: 'Revision Note', old: oldVersion.note, new: newVersion.note })
  }
  if (oldVersion.compliance !== newVersion.compliance) {
    changes.push({ type: 'modified', field: 'Compliance', old: oldVersion.compliance, new: newVersion.compliance })
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {changes.length === 0 && <p className="text-sm text-muted">No differences found.</p>}
      {changes.map((c, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
          borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem',
          background: c.type === 'added' ? 'var(--green-100)' : c.type === 'removed' ? 'var(--red-100)' : 'var(--amber-100)',
        }}>
          <span style={{
            fontSize: '0.6875rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
            background: c.type === 'added' ? 'var(--green-500)' : c.type === 'removed' ? 'var(--red-500)' : 'var(--amber-500)',
            color: 'white', textTransform: 'uppercase',
          }}>{c.type}</span>
          <strong>{c.field}:</strong>
          {c.type === 'modified' ? (
            <span><span style={{ textDecoration: 'line-through', color: 'var(--red-500)' }}>{String(c.old)}</span> → <span style={{ color: 'var(--green-500)', fontWeight: 600 }}>{String(c.new)}</span></span>
          ) : (
            <span>{c.type === 'added' ? `+${c.new}` : `-${c.old}`}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function VersionTimeline({ versions, onSelectVersion, selectedId }) {
  return (
    <div style={{ position: 'relative', paddingLeft: '24px' }}>
      <div style={{ position: 'absolute', left: '8px', top: '0', bottom: '0', width: '2px', background: 'var(--sky-200)' }} />
      {versions.map((v, i) => {
        const tagStyle = TAG_COLORS[v.tag] || TAG_COLORS.Draft
        const reviewInfo = REVIEW_STATUS[v.reviewStatus]
        return (
          <div key={v.id} style={{ position: 'relative', marginBottom: '20px', cursor: 'pointer' }} onClick={() => onSelectVersion(v)}>
            <div style={{
              position: 'absolute', left: '-20px', top: '4px', width: '14px', height: '14px',
              borderRadius: '50%', background: selectedId === v.id ? 'var(--sky-500)' : 'var(--white)',
              border: `3px solid ${selectedId === v.id ? 'var(--sky-500)' : 'var(--sky-300)'}`,
              transition: 'all 200ms', zIndex: 1,
            }} />
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: selectedId === v.id ? 'var(--sky-50)' : 'var(--white)',
              border: `1px solid ${selectedId === v.id ? 'var(--sky-200)' : 'var(--gray-100)'}`,
              transition: 'all 200ms',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.875rem' }}>v{v.version}</span>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.6875rem', fontWeight: 700, background: tagStyle.bg, color: tagStyle.color }}>{v.tag}</span>
                  {v.reviewStatus && (
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.6875rem', fontWeight: 700, background: reviewInfo.bg, color: reviewInfo.color }}>{reviewInfo.label}</span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{new Date(v.timestamp).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--gray-600)', marginBottom: '4px' }}>{v.note}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                <span>{v.author}</span>
                <span>{v.topics} topics</span>
                <span>{v.sizeKB} KB</span>
                {v.compliance && <span style={{ color: v.compliance === 'Compliant' ? 'var(--green-500)' : 'var(--red-500)' }}>{v.compliance}</span>}
              </div>
              {v.reviewerComment && (
                <div style={{ marginTop: '6px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--red-100)', fontSize: '0.75rem', color: '#991b1b' }}>
                  <MessageSquare size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  {v.reviewerComment}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function VersionHistory({ versions = [], entityType = 'syllabus', onClose }) {
  const { addToast } = useToast()
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState(null)
  const [compareB, setCompareB] = useState(null)
  const [showDiff, setShowDiff] = useState(false)
  const [filterAuthor, setFilterAuthor] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 5

  const filteredVersions = versions.filter(v => {
    if (filterAuthor && v.author !== filterAuthor) return false
    if (filterTag && v.tag !== filterTag) return false
    if (searchQuery && !v.note.toLowerCase().includes(searchQuery.toLowerCase()) && !v.author.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const totalPages = Math.ceil(filteredVersions.length / perPage)
  const paginatedVersions = filteredVersions.slice((currentPage - 1) * perPage, currentPage * perPage)
  const uniqueAuthors = [...new Set(versions.map(v => v.author))]
  const uniqueTags = [...new Set(versions.map(v => v.tag))]

  const handleRestore = (v) => {
    addToast(`Version ${v.version} restored as current draft`, 'success')
  }

  const handleCompare = () => {
    if (compareA && compareB) setShowDiff(true)
  }

  const handleSelectForCompare = (v) => {
    if (!compareA || (compareA && compareB)) {
      setCompareA(v); setCompareB(null)
    } else {
      setCompareB(v)
    }
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><History size={20} /> Version History — {entityType === 'syllabus' ? 'Syllabus' : 'Courseware Item'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Filters - REQ-1009, REQ-1036 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ color: 'var(--gray-400)' }} />
            <input className="form-input" style={{ flex: 1, padding: '6px 10px', fontSize: '0.8125rem' }} placeholder="Search by note or author..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} />
          </div>
          <select className="form-input" style={{ width: '140px', padding: '6px 10px', fontSize: '0.8125rem' }} value={filterAuthor} onChange={e => { setFilterAuthor(e.target.value); setCurrentPage(1) }}>
            <option value="">All Authors</option>
            {uniqueAuthors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="form-input" style={{ width: '120px', padding: '6px 10px', fontSize: '0.8125rem' }} value={filterTag} onChange={e => { setFilterTag(e.target.value); setCurrentPage(1) }}>
            <option value="">All Tags</option>
            {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className={`btn btn-sm ${compareMode ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null); setShowDiff(false) }}>
            <GitCompare size={14} /> {compareMode ? 'Cancel Compare' : 'Compare'}
          </button>
        </div>

        {compareMode && compareA && (
          <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--sky-50)', border: '1px solid var(--sky-200)', marginBottom: '12px', fontSize: '0.8125rem' }}>
            Comparing: <strong>v{compareA.version}</strong>
            {compareB && <> vs <strong>v{compareB.version}</strong></>}
            {!compareB && <span className="text-muted"> — select a second version</span>}
            {compareA && compareB && <button className="btn btn-primary btn-sm" style={{ marginLeft: '8px' }} onClick={handleCompare}>Show Diff</button>}
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', minHeight: '400px' }}>
          {/* Timeline - REQ-1008 */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '55vh', paddingRight: '8px' }}>
            <VersionTimeline
              versions={paginatedVersions}
              onSelectVersion={compareMode ? handleSelectForCompare : setSelectedVersion}
              selectedId={compareMode ? (compareA?.id || compareB?.id) : selectedVersion?.id}
            />
          </div>

          {/* Detail Panel - REQ-1003, REQ-1010, REQ-1037, REQ-1038 */}
          {selectedVersion && !compareMode && (
            <div style={{ width: '320px', flexShrink: 0, overflowY: 'auto', maxHeight: '55vh' }}>
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>v{selectedVersion.version} Details</h4>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.6875rem', fontWeight: 700, background: TAG_COLORS[selectedVersion.tag]?.bg, color: TAG_COLORS[selectedVersion.tag]?.color }}>{selectedVersion.tag}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem' }}>
                  <div><span className="text-muted">Author:</span> <strong>{selectedVersion.author}</strong></div>
                  <div><span className="text-muted">Date:</span> {new Date(selectedVersion.timestamp).toLocaleString()}</div>
                  <div><span className="text-muted">Size:</span> {selectedVersion.sizeKB} KB</div>
                  <div><span className="text-muted">Topics:</span> {selectedVersion.topics}</div>
                  <div><span className="text-muted">ILOs:</span> {selectedVersion.ilos}</div>
                  <div><span className="text-muted">Assessment:</span> {selectedVersion.assessmentWeight}</div>
                  <div><span className="text-muted">Compliance:</span> <span style={{ color: selectedVersion.compliance === 'Compliant' ? 'var(--green-500)' : 'var(--red-500)', fontWeight: 600 }}>{selectedVersion.compliance}</span></div>
                  {selectedVersion.reviewStatus && (
                    <div><span className="text-muted">Review:</span> <span style={{ color: REVIEW_STATUS[selectedVersion.reviewStatus]?.color, fontWeight: 600 }}>{REVIEW_STATUS[selectedVersion.reviewStatus]?.label}</span></div>
                  )}
                  {selectedVersion.reviewerComment && (
                    <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--red-100)', fontSize: '0.75rem', color: '#991b1b' }}>
                      <strong>Reviewer:</strong> {selectedVersion.reviewerComment}
                    </div>
                  )}
                  <div style={{ marginTop: '4px', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--gray-50)' }}>
                    <div className="text-muted" style={{ fontSize: '0.6875rem', marginBottom: '4px' }}>Revision Note:</div>
                    <div>{selectedVersion.note}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => addToast('Version exported as CSV', 'success')}><Download size={12} /> CSV</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => addToast('Version exported as PDF', 'success')}><Download size={12} /> PDF</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => addToast('Version exported as HTML', 'success')}><Download size={12} /> HTML</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { handleRestore(selectedVersion); setSelectedVersion(null) }}><RotateCcw size={12} /> Restore</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pagination - REQ-1008 */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '12px' }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCurrentPage(i + 1)} style={{ minWidth: '32px' }}>{i + 1}</button>
            ))}
          </div>
        )}

        {/* Diff View Modal - REQ-1005, REQ-1006 */}
        {showDiff && compareA && compareB && (
          <div className="overlay-backdrop" style={{ zIndex: 1000 }} onClick={() => setShowDiff(false)}>
            <div className="modal-content" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2><GitCompare size={20} /> Diff: v{compareA.version} → v{compareB.version}</h2>
                <button className="modal-close" onClick={() => setShowDiff(false)}>✕</button>
              </div>
              <DiffView oldVersion={compareA} newVersion={compareB} />
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowDiff(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '12px', marginTop: '12px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
