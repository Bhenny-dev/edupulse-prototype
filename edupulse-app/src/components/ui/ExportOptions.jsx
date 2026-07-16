import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, FileText, Table, Printer, Eye } from 'lucide-react'
import { exportCSV, exportHTML, anonymizeData, timestampedFilename } from '../../utils/exportUtils'

export default function ExportOptions({ data, defaultFilename = 'export', columns, title }) {
  const [open, setOpen] = useState(false)
  const [anonymize, setAnonymize] = useState(false)
  const [includeComments, setIncludeComments] = useState(true)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const getExportData = () => {
    let d = data || []
    if (anonymize) d = anonymizeData(d)
    if (!includeComments && columns) {
      const exclude = new Set(['comments', 'reviewerComments', 'notes'])
      d = d.map(row => {
        const filtered = {}
        for (const [k, v] of Object.entries(row)) {
          if (!exclude.has(k)) filtered[k] = v
        }
        return filtered
      })
    }
    return d
  }

  const handleExport = (type) => {
    const d = getExportData()
    const ts = defaultFilename
    switch (type) {
      case 'csv':
        exportCSV(d, timestampedFilename(ts, 'csv'), columns)
        break
      case 'html':
        exportHTML(d, timestampedFilename(ts, 'html'), title || defaultFilename, columns)
        break
      case 'print':
        exportHTML(d, `_print_${ts}.html`, title || defaultFilename, columns)
        break
    }
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Export options"
      >
        <Download size={14} /> Export <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : '' }} />
      </button>

      {open && (
        <div
          className="popover"
          role="menu"
          aria-label="Export format options"
          style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', minWidth: '240px', zIndex: 50 }}
        >
          <div className="popover-body" style={{ padding: '8px' }}>
            <div style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Format
            </div>
            {[
              { type: 'csv', icon: Table, label: 'CSV Spreadsheet', desc: 'Comma-separated values' },
              { type: 'html', icon: FileText, label: 'HTML Document', desc: 'Formatted table document' },
              { type: 'print', icon: Printer, label: 'Print View', desc: 'Opens print dialog' },
            ].map(item => (
              <button
                key={item.type}
                role="menuitem"
                onClick={() => handleExport(item.type)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '8px 10px', border: 'none', background: 'none', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', textAlign: 'left', fontSize: '0.8125rem',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--sky-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <item.icon size={16} style={{ color: 'var(--sky-500)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>{item.desc}</div>
                </div>
              </button>
            ))}

            <div style={{ borderTop: '1px solid var(--gray-100)', margin: '6px 0' }} />
            <div style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Options
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', fontSize: '0.8125rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}>
              <input type="checkbox" checked={anonymize} onChange={e => setAnonymize(e.target.checked)} />
              <span>Anonymize student data</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', fontSize: '0.8125rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}>
              <input type="checkbox" checked={includeComments} onChange={e => setIncludeComments(e.target.checked)} />
              <span>Include reviewer comments</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
