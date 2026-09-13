export default function DraftEvidence({ metadata }) {
  if (!metadata) return null
  return <aside className="ai-draft-evidence" style={{ margin: '16px 24px', padding: 16, border: '1px solid var(--gray-200)', borderRadius: 8, fontSize: '0.8125rem', overflowWrap: 'anywhere' }}>
    <strong>AI draft review</strong>
    <p>Verify the content and answer key before marking this item checked. Generation used your outline and the reference excerpts below.</p>
    {metadata.warning && <p role="status">{metadata.warning}</p>}
    <details><summary>Generation details and references ({metadata.sources?.length || 0})</summary>
      <p>{metadata.provider} · {metadata.model} · Request {metadata.requestId}</p>
      {metadata.sources?.length ? metadata.sources.map((source, i) => <div key={`${source.id}-${i}`}><strong>{source.title}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{source.text}</p></div>) : <p>No additional library passages were retrieved. Verify subject facts against your course references.</p>}
    </details>
  </aside>
}
