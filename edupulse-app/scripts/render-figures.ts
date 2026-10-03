// Renders the capstone figures (evaluation charts and architecture diagrams)
// from the session evaluation data into PNG figures.
// Run after `npm run eval:rag`: node --import tsx scripts/render-figures.ts
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const SESSION = '../feature-documentation/session-generated/2026-10-02-agentic-rag'
const results = JSON.parse(await readFile(`${SESSION}/evaluation-data/rag-evaluation.json`, 'utf8'))
// Reference palette, light mode (validated: slots 1-3 pass all-pairs; aqua needs visible labels).
const C = { surface: '#fcfcfb', text: '#0b0b0b', muted: '#52514e', grid: '#e4e3df', s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a' }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const page = (title: string, subtitle: string, body: string, note = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:${C.surface};font-family:Inter,Segoe UI,system-ui,sans-serif;color:${C.text}}
  .fig{padding:28px 32px 22px;width:960px;box-sizing:border-box}
  h1{font-size:20px;margin:0 0 4px;font-weight:650} p.sub{margin:0 0 14px;color:${C.muted};font-size:13px}
  .legend{display:flex;gap:18px;font-size:12.5px;color:${C.muted};margin-bottom:6px}.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px}
  p.note{font-size:11.5px;color:${C.muted};margin:10px 0 0}
  table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid ${C.grid};vertical-align:top}th{color:${C.muted};font-weight:600}td.n{text-align:right;font-variant-numeric:tabular-nums}
</style></head><body><div class="fig" id="fig"><h1>${esc(title)}</h1><p class="sub">${esc(subtitle)}</p>${body}${note ? `<p class="note">${esc(note)}</p>` : ''}</div></body></html>`

/** Horizontal grouped bars: thin marks, 2px gaps, rounded data ends, every value labelled. */
function groupedBars(groups: { label: string; values: number[] }[], series: { name: string; color: string }[], format: (v: number) => string, max: number) {
  const bar = 13, gap = 2, groupGap = 22, left = 210, width = 620
  const groupHeight = series.length * (bar + gap) - gap
  const height = groups.length * (groupHeight + groupGap) + 26
  const x = (v: number) => (v / max) * width
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => t * max)
  let svg = `<svg width="896" height="${height}" role="img" xmlns="http://www.w3.org/2000/svg">`
  for (const t of ticks) svg += `<line x1="${left + x(t)}" x2="${left + x(t)}" y1="0" y2="${height - 22}" stroke="${C.grid}"/><text x="${left + x(t)}" y="${height - 6}" font-size="11" fill="${C.muted}" text-anchor="middle">${format(t)}</text>`
  groups.forEach((g, gi) => {
    const top = gi * (groupHeight + groupGap)
    svg += `<text x="${left - 12}" y="${top + groupHeight / 2 + 4}" font-size="13" fill="${C.text}" text-anchor="end">${esc(g.label)}</text>`
    g.values.forEach((v, si) => {
      const y = top + si * (bar + gap), w = Math.max(2, x(v))
      svg += `<path d="M${left},${y} h${w - 4} a4,4 0 0 1 4,4 v${bar - 8} a4,4 0 0 1 -4,4 h${-(w - 4)} z" fill="${series[si]!.color}"><title>${esc(series[si]!.name)}: ${format(v)}</title></path>`
      svg += `<text x="${left + w + 6}" y="${y + bar - 2}" font-size="11.5" fill="${C.muted}">${format(v)}</text>`
    })
  })
  return `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>${svg}</svg>`
}

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`
const configs: [string, string][] = [['keyword', 'Keyword (Postgres full-text)'], ['vector', 'Vector (pgvector cosine)'], ['hybrid', 'Hybrid (RRF fusion)'], ['hybrid+rerank', 'Hybrid + cross-encoder']]
const figures: { folder: string; name: string; html: string }[] = []
figures.push({ folder: 'evaluation-charts', name: '01-retrieval-accuracy', html: page('Retrieval accuracy by configuration', `${results.validQuestions} questions over ${results.corpus.length} real documents (4 Wikipedia PDFs, 2 EduPulse specifications)`, groupedBars(configs.map(([k, label]) => ({ label, values: [results.retrieval[k].hitAt1, results.retrieval[k].hitAt3, results.retrieval[k].hitAt5] })), [{ name: 'Hit@1', color: C.s1 }, { name: 'Hit@3', color: C.s2 }, { name: 'Hit@5', color: C.s3 }], pct, 1), `Hit@k: share of questions whose answer-bearing passage is ranked in the top k. MRR@10: ${configs.map(([k, l]) => `${l.split(' (')[0]} ${results.retrieval[k].mrrAt10.toFixed(3)}`).join(' · ')}.`) })
figures.push({ folder: 'evaluation-charts', name: '02-retrieval-latency', html: page('Mean retrieval latency per question', `CPU only, ${results.environment.onnxThreads} ONNX threads, local PGlite vector store`, groupedBars(configs.map(([k, label]) => ({ label, values: [results.retrieval[k].meanMs] })), [{ name: 'Milliseconds', color: C.s1 }], v => `${Math.round(v)} ms`, Math.max(...configs.map(([k]) => results.retrieval[k].meanMs)) * 1.15), 'Includes query embedding and SQL; the cross-encoder adds reranking of the top 20 fused passages.') })
type Scores = { accuracy: number; precision: number; recall: number; f1: number }
const verifier: [string, Scores][] = [['Semantic + lexical + consistency gates (shipped)', results.verification['semantic+lexical']], ['Lexical + consistency gates', results.verification.lexical]]
try {
  // Baseline preserved before the consistency gates were added, for the discussion.
  const before = JSON.parse(await readFile(`${SESSION}/evaluation-data/rag-evaluation-before-consistency-gates.json`, 'utf8'))
  verifier.push(['Semantic + lexical, before gates', before.verification['semantic+lexical']])
} catch { /* baseline not present */ }
figures.push({ folder: 'evaluation-charts', name: '03-verifier-accuracy', html: page('Verifier on labelled claims', `${results.claims.length} claims: half paraphrase a source passage, half alter a fact (names, numbers, polarity)`, groupedBars(['accuracy', 'precision', 'recall', 'f1'].map(m => ({ label: m === 'f1' ? 'F1' : m[0]!.toUpperCase() + m.slice(1), values: verifier.map(([, v]) => v[m as keyof Scores]) })), verifier.map(([name], i) => ({ name, color: [C.s1, C.s2, C.s3][i]! })), pct, 1), 'A claim is predicted as supported when its best support score against the top six reranked passages reaches 0.55. Gates cap support when a number, proper noun or absolute word in the claim is missing from the passage.') })
const agentRows = (results.agentic as Record<string, unknown>[]).map(a => `<tr><td>${esc(String(a.message))}</td><td>${esc(String(a.task ?? ''))}</td><td>${esc(String(a.mode ?? a.error ?? ''))}</td><td class="n">${a.sources ?? '—'}</td><td class="n">${a.groundedness === null || a.groundedness === undefined ? '—' : pct(a.groundedness as number)}</td><td class="n">${a.citationAccuracy === null || a.citationAccuracy === undefined ? '—' : pct(a.citationAccuracy as number)}</td><td class="n">${a.revisions ?? '—'}</td><td class="n">${a.ms ? ((a.ms as number) / 1000).toFixed(1) : '—'}</td></tr>`).join('')
if (agentRows) figures.push({ folder: 'evaluation-charts', name: '04-end-to-end-agents', html: page('End-to-end agent runs', `Free local model ${results.environment.generationModel} on CPU via Ollama; same corpus`, `<table><thead><tr><th>Request</th><th>Task</th><th>Outcome</th><th>Sources</th><th>Grounded</th><th>Citations</th><th>Revisions</th><th>Seconds</th></tr></thead><tbody>${agentRows}</tbody></table>`, 'Outcome “retrieval” means the Corrector replaced an answer it could not verify with cited source excerpts; “insufficient-evidence” means the Ranker found no qualifying passage.') })

// Architecture diagrams (SVG, same palette, text in ink colours).
function box(x: number, y: number, w: number, h: number, title: string, sub: string, color: string) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#fff" stroke="${color}" stroke-width="2"/><rect x="${x}" y="${y}" width="6" height="${h}" rx="3" fill="${color}"/><text x="${x + 16}" y="${y + 24}" font-size="14" font-weight="650" fill="${C.text}">${esc(title)}</text>${sub.split('\n').map((line, i) => `<text x="${x + 16}" y="${y + 43 + i * 15}" font-size="11.5" fill="${C.muted}">${esc(line)}</text>`).join('')}`
}
// Labels are placed explicitly in the gaps between boxes so they never overlap titles or lines.
const arrow = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.muted}" stroke-width="1.6" marker-end="url(#a)"/>`
const tag = (x: number, y: number, text: string, anchor = 'start') => `<text x="${x}" y="${y}" font-size="11" fill="${C.muted}" text-anchor="${anchor}">${esc(text)}</text>`
const defs = `<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${C.muted}"/></marker></defs>`
// Four columns (x 20 / 250 / 500 / 730) and three rows (y 20 / 160 / 300) with 60 px gaps.
const agentsSvg = `<svg width="896" height="390" xmlns="http://www.w3.org/2000/svg">${defs}
  ${box(20, 20, 170, 70, 'Planner', 'task + search queries\n(rules, no model call)', C.s1)}
  ${box(250, 20, 190, 70, 'Researcher × N', 'parallel LangGraph Send\nhybrid vector + keyword', C.s1)}
  ${box(500, 20, 170, 70, 'Ranker', 'cross-encoder rerank\nfloor, diversity, caps', C.s1)}
  ${box(730, 20, 150, 70, 'Comparator', 'two-source alignment\n(compare tasks)', C.s2)}
  ${box(20, 160, 170, 70, 'Librarian', 'Open Library · OpenAlex\n· Wikipedia', C.s2)}
  ${box(250, 160, 190, 70, 'Knowledge stores', 'pgvector HNSW +\nPostgres full-text', C.s3)}
  ${box(500, 160, 170, 70, 'Writer', 'cited answer / draft\nprovider or on-device', C.s1)}
  ${box(250, 300, 190, 70, 'Corrector', 'fix citations; one\nrevision; safe fallback', C.s2)}
  ${box(500, 300, 170, 70, 'Verifier', 'claim support +\ncorroboration count', C.s3)}
  ${box(730, 300, 150, 70, 'Answer', 'sources, claims,\nagent timeline', C.s3)}
  ${arrow(190, 55, 248, 55)}${arrow(440, 55, 498, 55)}${arrow(670, 55, 728, 55)}
  ${arrow(105, 90, 105, 158)}${tag(112, 130, 'references task')}
  ${arrow(345, 90, 345, 158)}${tag(352, 130, 'search')}
  ${arrow(585, 90, 585, 158)}${tag(592, 130, 'ranked evidence')}
  ${arrow(805, 90, 672, 186)}${tag(752, 150, 'alignment')}
  ${arrow(585, 230, 585, 298)}
  ${arrow(500, 335, 442, 335)}${tag(471, 353, 'not found', 'middle')}
  ${arrow(425, 300, 502, 222)}${tag(432, 272, 'revise once', 'end')}
  ${arrow(670, 335, 728, 335)}${tag(699, 353, 'verified', 'middle')}
</svg>`
figures.push({ folder: 'architecture-figures', name: '01-agent-workflow', html: page('Pulse multi-agent workflow (LangGraph)', 'Named agents share one graph state; every step is recorded in the answer’s agent timeline', agentsSvg) })
const steps = [['Upload', 'raw bytes ≤ 4 MB'], ['Sniff', 'magic bytes,\nextension match'], ['Sandbox', 'worker · 256 MB heap\n30 s · no secrets'], ['Clean', 'headers, page\nnumbers, hyphens'], ['Evaluate', 'quality score,\ninjection scan'], ['Review', 'user reads and\ncorrects the text'], ['Chunk', 'page/section aware\n900 chars, 120 overlap'], ['Embed', 'MiniLM ONNX\n384-d vectors'], ['Index', 'HNSW + GIN\nfull-text index']] as const
// Two-row snake: extraction left to right, then indexing right to left beneath it.
let pipeSvg = `<svg width="896" height="250" xmlns="http://www.w3.org/2000/svg">${defs}`
steps.forEach(([title, sub], i) => {
  const row = i < 5 ? 0 : 1, col = row ? 9 - i : i, x = 20 + col * 180, y = 20 + row * 130
  pipeSvg += box(x, y, 150, 84, title, sub, i < 5 ? C.s1 : i === 5 ? C.s2 : C.s3)
  if (i < 4) pipeSvg += arrow(x + 150, y + 42, x + 178, y + 42)
  else if (i === 4) pipeSvg += arrow(x + 75, y + 84, x + 75, y + 128)
  else if (i < steps.length - 1) pipeSvg += arrow(x, y + 42, x - 28, y + 42)
})
figures.push({ folder: 'architecture-figures', name: '02-ingestion-pipeline', html: page('Document ingestion pipeline (LangChain runnable sequence)', 'Extraction runs before review; nothing is stored until the user indexes the reviewed text', `${pipeSvg}</svg>`) })

const browser = await chromium.launch()
const context = await browser.newContext({ deviceScaleFactor: 2 })
for (const figure of figures) {
  const tab = await context.newPage()
  await tab.setContent(figure.html)
  await mkdir(`${SESSION}/${figure.folder}`, { recursive: true })
  await tab.locator('#fig').screenshot({ path: `${SESSION}/${figure.folder}/${figure.name}.png` })
  await tab.close()
  console.log(`rendered ${figure.folder}/${figure.name}.png`)
}
await browser.close()
