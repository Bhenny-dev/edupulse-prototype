/**
 * Export utility functions for generating downloadable files.
 * All exports produce client-side blob downloads (no server required).
 */

/**
 * Convert an array of objects to CSV string.
 * Handles values with commas, quotes, and newlines.
 */
export function toCSV(data, columns) {
  if (!data.length) return ''
  const headers = columns || Object.keys(data[0])
  const escape = (val) => {
    const str = val == null ? '' : String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const lines = [
    headers.map(escape).join(','),
    ...data.map(row => headers.map(h => escape(row[h])).join(','))
  ]
  return lines.join('\n')
}

/**
 * Convert an array of objects to a simple HTML table string.
 */
export function toHTMLTable(data, title, columns) {
  if (!data.length) return `<p>No data available.</p>`
  const headers = columns || Object.keys(data[0])
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title || 'Export'}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 32px; color: #1e293b; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 0.8rem; margin-bottom: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-size: 0.85rem; }
  th { background: #f0f9ff; font-weight: 600; }
  tr:nth-child(even) { background: #f8fafc; }
</style>
</head>
<body>
  <h1>${title || 'Export'}</h1>
  <div class="meta">Generated: ${new Date().toLocaleString()} · ${data.length} records</div>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</body>
</html>`
}

/**
 * Trigger a client-side file download from a string.
 */
export function downloadBlob(content, filename, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export data as CSV file.
 */
export function exportCSV(data, filename, columns) {
  const csv = toCSV(data, columns)
  downloadBlob(csv, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv')
}

/**
 * Export data as an HTML file (can be opened and printed as PDF).
 */
export function exportHTML(data, filename, title, columns) {
  const html = toHTMLTable(data, title, columns)
  downloadBlob(html, filename.endsWith('.html') ? filename : `${filename}.html`, 'text/html')
}

/**
 * Anonymize data by removing/masking PII fields.
 */
export function anonymizeData(data, piiFields = ['Name', 'Email', 'StudentID']) {
  return data.map(row => {
    const masked = { ...row }
    for (const field of piiFields) {
      if (masked[field]) masked[field] = '***'
    }
    return masked
  })
}

/**
 * Generate a timestamped filename.
 */
export function timestampedFilename(base, ext = 'csv') {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
  return `${base}_${ts}.${ext}`
}
