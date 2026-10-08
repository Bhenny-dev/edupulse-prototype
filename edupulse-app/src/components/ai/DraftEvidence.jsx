import { AGENT_META } from './agentMeta'
import './ai.css'

const KIND = { topic: 'Topic', outcome: 'Outcome', activity: 'Planned activity', assessment: 'Planned assessment' }
const STATUS = { covered: { label: 'Covered', badge: 'badge-approved' }, partial: { label: 'Partial', badge: 'badge-draft' }, missing: { label: 'Missing', badge: 'badge-error' } }

export default function DraftEvidence({ metadata }) {
  if (!metadata) return null
  const coverage = metadata.coverage, verification = metadata.verification, answerKey = metadata.answerKey
  return <aside className="ai-draft-evidence" data-pulse-target="AI draft review" style={{ margin: '16px 24px', padding: 16, border: '1px solid var(--gray-200)', borderRadius: 8, fontSize: '0.8125rem', overflowWrap: 'anywhere' }}>
    <strong>AI draft review</strong>
    <p>Verify the content and answer key before marking this item checked. The checks below are automatic aids, not approval.</p>
    {metadata.warning && <p role="status">{metadata.warning}</p>}
    {coverage && <details open><summary>Outline alignment · {Math.round(coverage.coverage * 100)}% coverage ({coverage.method === 'semantic+lexical' ? 'semantic + lexical' : 'lexical'} check)</summary>
      <table className="aa-compare"><thead><tr><th scope="col">Outline {`item`}</th><th scope="col" style={{ width: 90 }}>Status</th><th scope="col" style={{ width: 100 }}>Found in</th></tr></thead><tbody>
        {coverage.items.map(item => <tr key={`${item.kind}-${item.text}`}><td><small>{KIND[item.kind] || item.kind}</small><div>{item.text}</div></td><td><span className={`badge ${STATUS[item.status].badge}`}>{STATUS[item.status].label}</span></td><td>{item.matchedIn || '—'}</td></tr>)}
      </tbody></table>
      {coverage.items.some(i => i.status === 'missing') && <p role="status">Some outline items are not addressed. Regenerate this week or add them before checking the draft.</p>}
    </details>}
    {verification && <p>Statements checked against the outline and references: {verification.supported} supported, {verification.total - verification.supported} for your verification.</p>}
    {answerKey && <p role={answerKey.issues?.length ? 'alert' : undefined}>Answer-key check: {answerKey.consistent} of {answerKey.checked} explanations agree with the marked answer.{answerKey.issues?.length ? ` Check ${answerKey.issues.map(i => `question ${i.question} (marked ${String.fromCharCode(65 + i.marked)}, explanation points to ${String.fromCharCode(65 + i.supported)})`).join(', ')} before publishing.` : ''}</p>}
    <details><summary>Generation details and references ({metadata.sources?.length || 0})</summary>
      <p>{metadata.provider} · {metadata.model} · Request {metadata.requestId}</p>
      {metadata.trace?.length > 0 && <ol className="aa-timeline">{metadata.trace.map((step, i) => <li key={i} style={{ '--agent-color': AGENT_META[step.agent]?.color }}><strong>{step.agent || step.node}</strong>{step.action ? ` · ${step.action}` : ''}<div>{step.detail}</div></li>)}</ol>}
      {metadata.sources?.length ? metadata.sources.map((source, i) => <div key={`${source.id}-${i}`}><strong>{source.title}{source.page ? ` · p. ${source.page}` : ''}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{source.text}</p></div>) : <p>No additional library passages were retrieved. Verify subject facts against your course references.</p>}
    </details>
  </aside>
}
