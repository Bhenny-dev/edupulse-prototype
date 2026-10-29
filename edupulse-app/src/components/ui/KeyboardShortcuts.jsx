import { Keyboard } from 'lucide-react'

const available = [
  ['Ctrl / Cmd + K', 'Open search'],
  ['Alt + P', 'Ask Pulse about the focused component'],
  ['?', 'Open Settings → Keyboard Shortcuts (outside text fields and dialogs)'],
  ['Escape', 'Close the current overlay'],
  ['Tab', 'Move to the next control'],
  ['Shift + Tab', 'Move to the previous control'],
]
const planned = [
  ['G then D', 'Go to Dashboard'], ['G then S', 'Go to Syllabus'],
  ['G then C', 'Go to Courseware'], ['G then P', 'Go to Performance'],
  ['G then A', 'Go to AI Assistant'], ['Ctrl + E', 'Export current view'],
  ['Ctrl + S', 'Save current form'], ['Ctrl + Z', 'Undo last action'],
]

export default function KeyboardShortcuts() {
  const rows = items => <dl>{items.map(([keys, description]) => <div key={keys} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}><dt>{description}</dt><dd style={{ margin: 0 }}><kbd style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--gray-100)', color: 'var(--gray-700)', border: '1px solid var(--gray-200)' }}>{keys}</kbd></dd></div>)}</dl>
  return <section className="card" aria-label="Keyboard Shortcuts">
    <div className="card-header"><h2><Keyboard size={18} /> Keyboard Shortcuts</h2></div>
    <div className="card-body"><p>Use these shortcuts with your keyboard. Page access continues to follow your role.</p>{rows(available)}
      <details className="mt-24"><summary>Planned shortcuts</summary><p className="text-sm text-muted mt-16">These entries from the earlier shortcut guide are not connected to application actions yet. Use each page’s controls to save, export or undo.</p>{rows(planned)}</details>
    </div>
  </section>
}
