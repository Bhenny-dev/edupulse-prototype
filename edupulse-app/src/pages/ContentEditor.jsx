import { useState, useEffect } from 'react'
import { useToast } from '../context/ToastContext'
import {
  Eye, CheckCircle, AlertTriangle,
  Save, Undo, Redo, Bold, Italic, List, Link2, Image,
  Code, Quote, Search, Tag, Bot, X, Accessibility, Plus
} from 'lucide-react'

const MOCK_EDITOR_ITEM = {
  id: 'cw-101',
  title: 'Week 1 — What is Programming: Lecture Notes',
  type: 'material',
  course: 'IT 102',
  topic: 'Introduction to Programming',
  status: 'draft',
  aiGenerated: true,
  confidence: 0.92,
  createdAt: '2026-07-10T10:00:00',
  updatedAt: '2026-07-11T14:30:00',
  author: 'GPT-4o Mini',
  wordCount: 2450,
  readingLevel: 'Grade 10',
  readabilityScore: 78,
  content: '<h2>What is Programming?</h2><p>Programming is the process of creating instructions that computers can execute...</p>',
  metadata: {
    tags: ['introductory', 'fundamentals', 'CHED-aligned'],
    language: 'en',
    license: 'CC-BY-4.0',
    chedCode: 'CHED-IT-02',
    estimatedReadTime: '12 min',
    difficulty: 'Beginner',
  },
  accessibility: {
    score: 85,
    issues: [
      { type: 'warning', message: '3 images missing alt text', count: 3 },
      { type: 'pass', message: 'Heading hierarchy is sequential' },
      { type: 'pass', message: 'Color contrast meets WCAG AA' },
      { type: 'info', message: 'Reading level appropriate for target audience' },
    ],
  },
  autosave: { lastSaved: '2026-07-11T14:32:00', enabled: true },
}

function MetadataPanel({ item }) {
  const [tags, setTags] = useState(item.metadata.tags)
  const [newTag, setNewTag] = useState('')
  return (
    <div>
      <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '12px' }}><Tag size={14} style={{ marginRight: '6px' }} /> Metadata</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Title</label>
          <input className="form-input" defaultValue={item.title} style={{ fontSize: '0.8125rem' }} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Course</label>
          <input className="form-input" defaultValue={item.course} style={{ fontSize: '0.8125rem' }} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Difficulty</label>
          <select className="form-input" defaultValue={item.metadata.difficulty} style={{ fontSize: '0.8125rem' }}>
            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>License</label>
          <select className="form-input" defaultValue={item.metadata.license} style={{ fontSize: '0.8125rem' }}>
            <option>CC-BY-4.0</option><option>CC-BY-SA-4.0</option><option>CC-BY-NC-4.0</option><option>MIT</option><option>All Rights Reserved</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>CHED Code</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input className="form-input" defaultValue={item.metadata.chedCode} style={{ fontSize: '0.8125rem', flex: 1 }} />
            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}><Search size={12} /></button>
          </div>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
            {tags.map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '8px', fontSize: '0.6875rem', background: 'var(--sky-100)', color: 'var(--sky-700)' }}>
                {t}
                <button onClick={() => setTags(tags.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--sky-500)' }}><X size={10} /></button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input className="form-input" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add tag..." style={{ fontSize: '0.75rem', flex: 1 }}
              onKeyDown={e => { if (e.key === 'Enter' && newTag.trim()) { setTags([...tags, newTag.trim()]); setNewTag('') } }}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => { if (newTag.trim()) { setTags([...tags, newTag.trim()]); setNewTag('') } }} style={{ padding: '2px 6px' }}><Plus size={12} /></button>
          </div>
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span>Reading time: {item.metadata.estimatedReadTime}</span>
          <span>Word count: {item.wordCount}</span>
          <span>Language: {item.metadata.language.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}

function AccessibilityPanel({ accessibility }) {
  return (
    <div>
      <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '12px' }}><Accessibility size={14} style={{ marginRight: '6px' }} /> Accessibility Checklist</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${accessibility.score >= 80 ? 'var(--green-500)' : accessibility.score >= 60 ? 'var(--amber-500)' : 'var(--red-500)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
          {accessibility.score}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Score: {accessibility.score}/100</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>{accessibility.issues.filter(i => i.type === 'pass').length} passed · {accessibility.issues.filter(i => i.type !== 'pass').length} issues</div>
        </div>
      </div>
      {accessibility.issues.map((issue, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: issue.type === 'pass' ? 'var(--green-100)' : issue.type === 'warning' ? 'var(--amber-100)' : 'var(--sky-50)', marginBottom: '4px', fontSize: '0.75rem' }}>
          {issue.type === 'pass' ? <CheckCircle size={12} style={{ color: 'var(--green-500)' }} /> : issue.type === 'warning' ? <AlertTriangle size={12} style={{ color: 'var(--amber-500)' }} /> : <Eye size={12} style={{ color: 'var(--sky-500)' }} />}
          <span>{issue.message}</span>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" style={{ marginTop: '8px', width: '100%' }}><Search size={12} /> Run Full Scan</button>
    </div>
  )
}

export default function ContentEditor() {
  const { addToast } = useToast()
  const item = MOCK_EDITOR_ITEM
  const [activePanel, setActivePanel] = useState('metadata')
  const [lastSaved, setLastSaved] = useState(new Date(item.autosave.lastSaved))

  useEffect(() => {
    if (!item.autosave.enabled) return
    const interval = setInterval(() => {
      setLastSaved(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [item.autosave.enabled])

  // Trimmed to Metadata and Accessibility only — FR-CW-09/10 (no citation-formatting,
  // localization, or multi-stage editorial tooling beyond what one instructor needs).
  const panels = [
    { id: 'metadata', label: 'Metadata', icon: Tag },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Editor toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px', borderBottom: '1px solid var(--gray-100)', background: 'var(--white)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><Undo size={14} /></button>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><Redo size={14} /></button>
          </div>
          <div style={{ width: '1px', height: '20px', background: 'var(--gray-200)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {[Bold, Italic, List, Link2, Image, Code, Quote].map((Icon, i) => (
              <button key={i} className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }}><Icon size={14} /></button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {item.aiGenerated && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '8px', fontSize: '0.6875rem', fontWeight: 700, background: 'var(--purple-100)', color: 'var(--purple-500)' }}>
              <Bot size={10} /> AI-Assisted
            </span>
          )}
          <span style={{ fontSize: '0.6875rem', color: 'var(--gray-400)' }}>
            Auto-saved {lastSaved.toLocaleTimeString()}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => addToast('Draft saved', 'success')}><Save size={14} /> Save</button>
          <button className="btn btn-primary btn-sm" onClick={() => addToast('Item checked — ready to publish', 'success')}>Check</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-100)', background: 'var(--white)' }}>
            <input defaultValue={item.title} style={{ width: '100%', border: 'none', outline: 'none', fontSize: '1.25rem', fontFamily: 'var(--font-heading)', fontWeight: 700, background: 'transparent' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--gray-400)' }}>
              <span className="badge badge-draft">{item.type}</span>
              <span>{item.course}</span>
              <span>·</span>
              <span>{item.topic}</span>
              <span>·</span>
              <span>{item.wordCount} words</span>
            </div>
          </div>
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', fontSize: '0.9375rem', lineHeight: 1.8, color: 'var(--gray-700)' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', marginBottom: '12px' }}>What is Programming?</h2>
              <p>Programming is the process of creating instructions that computers can execute to perform specific tasks. It involves designing, writing, testing, and maintaining source code in various programming languages.</p>
              <p>Modern programming encompasses a wide range of disciplines, from web development and mobile applications to artificial intelligence and scientific computing. Understanding programming fundamentals is essential for any IT professional.</p>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', marginTop: '20px', marginBottom: '10px' }}>Key Concepts</h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li style={{ marginBottom: '6px' }}><strong>Variables and Data Types</strong> — Understanding how computers store and manipulate data</li>
                <li style={{ marginBottom: '6px' }}><strong>Control Structures</strong> — Making decisions and repeating actions in code</li>
                <li style={{ marginBottom: '6px' }}><strong>Functions</strong> — Organizing code into reusable blocks</li>
                <li style={{ marginBottom: '6px' }}><strong>Data Structures</strong> — Efficient ways to organize and access data</li>
              </ul>
              <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--amber-50)', border: '1px solid var(--amber-200)', marginTop: '16px', fontSize: '0.8125rem' }}>
                <strong>Example:</strong> A simple program that prints "Hello, World!" demonstrates the basic structure of a program: input (none), processing (string literal), and output (display to screen).
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div style={{ width: '320px', borderLeft: '1px solid var(--gray-100)', background: 'var(--white)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)', overflowX: 'auto' }}>
            {panels.map(p => (
              <button key={p.id} onClick={() => setActivePanel(p.id)} style={{
                flex: 1, padding: '8px 4px', border: 'none', background: activePanel === p.id ? 'var(--sky-50)' : 'transparent',
                borderBottom: activePanel === p.id ? '2px solid var(--sky-500)' : '2px solid transparent',
                cursor: 'pointer', fontSize: '0.625rem', fontWeight: 600, color: activePanel === p.id ? 'var(--sky-600)' : 'var(--gray-500)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap',
              }}>
                <p.icon size={12} />
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            {activePanel === 'metadata' && <MetadataPanel item={item} />}
            {activePanel === 'accessibility' && <AccessibilityPanel accessibility={item.accessibility} />}
          </div>
        </div>
      </div>
    </div>
  )
}
