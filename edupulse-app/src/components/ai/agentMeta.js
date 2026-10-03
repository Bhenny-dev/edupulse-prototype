// One colour per named agent (all ≥4.5:1 contrast with white text in both themes).
export const AGENT_META = {
  Planner: { color: '#4f46e5', role: 'Classifies the request and plans search queries' },
  Researcher: { color: '#0369a1', role: 'Runs hybrid vector + keyword search in parallel' },
  Ranker: { color: '#0f766e', role: 'Reranks with a cross-encoder and keeps diverse sources' },
  Comparator: { color: '#7e22ce', role: 'Aligns two sources: shared, related and unique points' },
  Writer: { color: '#1d4ed8', role: 'Drafts the answer with citations' },
  Verifier: { color: '#15803d', role: 'Checks every claim and counts corroborating documents' },
  Corrector: { color: '#b45309', role: 'Repairs citations and requests revisions' },
  Librarian: { color: '#be185d', role: 'Finds real references in open catalogs' },
}
