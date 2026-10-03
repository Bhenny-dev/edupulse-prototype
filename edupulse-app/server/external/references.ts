import { z } from 'zod'
import type { Reference } from '../../src/lib/rag/types.js'

// Librarian agent tools. Free, keyless public catalogs only. Requests go to
// fixed origins, never follow redirects, time out, cap response size and are
// schema-validated. Returned links are rebuilt from validated identifiers.
const ORIGINS = new Set(['https://openlibrary.org', 'https://api.openalex.org', 'https://en.wikipedia.org'])
const USER_AGENT = 'EduPulse-capstone/0.4 (education prototype; reference suggestions)'
const MAX_BYTES = 1_500_000
type CatalogStatus = { name: string; ok: boolean; count: number }
export type ReferenceResult = { references: Reference[]; status: CatalogStatus[]; warning?: string }
const cache = new Map<string, { at: number; value: ReferenceResult }>()

async function getJson(url: URL, signal: AbortSignal, transport: typeof fetch): Promise<unknown> {
  if (!ORIGINS.has(url.origin)) throw new Error('Origin not allowed')
  const response = await transport(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) })
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
  const reader = response.body.getReader(), parts: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Response too large') }
    parts.push(value)
  }
  return JSON.parse(Buffer.concat(parts).toString('utf8'))
}

// oxlint-disable-next-line no-control-regex -- removing control characters is the purpose of this pattern
const clean = (value: unknown, max = 300) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/&(amp|quot|#39|lt|gt);/g, m => ({ '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' })[m]!).replace(/[\u0000-\u001f\u007f\u202a-\u202e]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : ''
const year = (value: unknown) => typeof value === 'number' && value > 1400 && value <= new Date().getFullYear() + 1 ? value : null

const openLibrary = z.object({ docs: z.array(z.object({ key: z.string(), title: z.string(), author_name: z.array(z.string()).optional(), first_publish_year: z.number().optional(), publisher: z.array(z.string()).optional(), isbn: z.array(z.string()).optional() }).loose()).max(50) }).loose()
const openAlex = z.object({ results: z.array(z.object({ id: z.string(), display_name: z.string().nullable(), publication_year: z.number().nullable().optional(), doi: z.string().nullable().optional(), authorships: z.array(z.object({ author: z.object({ display_name: z.string().nullable().optional() }).loose() }).loose()).optional(), primary_location: z.object({ source: z.object({ display_name: z.string().nullable().optional() }).loose().nullable().optional() }).loose().nullable().optional() }).loose()).max(50) }).loose()
const wikipedia = z.object({ pages: z.array(z.object({ key: z.string(), title: z.string(), excerpt: z.string().nullable().optional(), description: z.string().nullable().optional() }).loose()).max(50) }).loose()

async function searchOpenLibrary(topic: string, signal: AbortSignal, transport: typeof fetch): Promise<Reference[]> {
  const url = new URL('https://openlibrary.org/search.json')
  url.search = new URLSearchParams({ q: topic, fields: 'key,title,author_name,first_publish_year,publisher,isbn', limit: '8' }).toString()
  return openLibrary.parse(await getJson(url, signal, transport)).docs.filter(d => /^\/works\/OL\d+W$/.test(d.key)).map(d => ({
    title: clean(d.title, 240), authors: (d.author_name || []).slice(0, 4).map(a => clean(a, 80)), year: year(d.first_publish_year), venue: clean(d.publisher?.[0], 120),
    url: `https://openlibrary.org${d.key}`, source: 'Open Library' as const, identifier: d.isbn?.find(i => /^(97[89])?\d{9}[\dX]$/.test(i)) ? `ISBN ${d.isbn.find(i => /^(97[89])?\d{9}[\dX]$/.test(i))}` : d.key.slice(7), relevance: null, summary: '',
  }))
}

async function searchOpenAlex(topic: string, signal: AbortSignal, transport: typeof fetch): Promise<Reference[]> {
  const url = new URL('https://api.openalex.org/works')
  url.search = new URLSearchParams({ search: topic, 'per-page': '8', select: 'id,display_name,publication_year,authorships,primary_location,doi' }).toString()
  return openAlex.parse(await getJson(url, signal, transport)).results.filter(r => r.display_name && /^https:\/\/openalex\.org\/W\d+$/.test(r.id)).map(r => {
    const doi = r.doi && /^https:\/\/doi\.org\/10\.\d{4,9}\/[^\s"<>]+$/.test(r.doi) ? r.doi : null
    return {
      title: clean(r.display_name, 240), authors: (r.authorships || []).slice(0, 4).map(a => clean(a.author.display_name, 80)).filter(Boolean), year: year(r.publication_year),
      venue: clean(r.primary_location?.source?.display_name, 160), url: doi || r.id, source: 'OpenAlex' as const, identifier: doi ? `DOI ${doi.slice(16)}` : r.id.slice(21), relevance: null, summary: '',
    }
  })
}

async function searchWikipedia(topic: string, signal: AbortSignal, transport: typeof fetch): Promise<Reference[]> {
  const url = new URL('https://en.wikipedia.org/w/rest.php/v1/search/page')
  url.search = new URLSearchParams({ q: topic, limit: '5' }).toString()
  return wikipedia.parse(await getJson(url, signal, transport)).pages.map(p => ({
    title: clean(p.title, 200), authors: ['Wikipedia contributors'], year: null, venue: 'Wikipedia (CC BY-SA 4.0)',
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key.replace(/ /g, '_'))}`, source: 'Wikipedia' as const, identifier: p.key.slice(0, 200), relevance: null,
    summary: clean(p.description || p.excerpt, 300),
  }))
}

/**
 * Searches open catalogs in parallel and ranks results by semantic similarity
 * to the topic. A failing catalog is reported, not fatal.
 */
export async function findReferences(topic: string, signal: AbortSignal, embed?: (texts: string[], signal: AbortSignal) => Promise<number[][]>, transport: typeof fetch = fetch): Promise<ReferenceResult> {
  const key = topic.toLowerCase().trim()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < 600_000 && transport === fetch) return hit.value
  const catalogs = [['Open Library', searchOpenLibrary], ['OpenAlex', searchOpenAlex], ['Wikipedia', searchWikipedia]] as const
  const settled = await Promise.allSettled(catalogs.map(([, search]) => search(topic, signal, transport)))
  signal.throwIfAborted()
  const status: CatalogStatus[] = catalogs.map(([name], i) => ({ name, ok: settled[i]!.status === 'fulfilled', count: settled[i]!.status === 'fulfilled' ? (settled[i] as PromiseFulfilledResult<Reference[]>).value.length : 0 }))
  let references = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []).filter(r => r.title)
  const seen = new Set<string>()
  references = references.filter(r => { const id = r.title.toLowerCase().replace(/\W+/g, ' ').trim(); if (seen.has(id)) return false; seen.add(id); return true })
  if (embed && references.length) {
    try {
      const [query, ...vectors] = await embed([topic, ...references.map(r => `${r.title}. ${r.summary} ${r.venue}`)], signal)
      references = references.map((r, i) => ({ ...r, relevance: Number(vectors[i]!.reduce((dot, v, d) => dot + v * query![d]!, 0).toFixed(3)) }))
    } catch { signal.throwIfAborted() }
  }
  references.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
  const perSource = new Map<string, number>()
  references = references.filter(r => (r.relevance === null || r.relevance >= 0.2) && (perSource.set(r.source, (perSource.get(r.source) || 0) + 1).get(r.source)! <= 4)).slice(0, 8)
  const failed = status.filter(s => !s.ok).map(s => s.name)
  const value: ReferenceResult = { references, status, warning: failed.length ? `${failed.join(' and ')} did not respond; results come from the other catalogs.` : undefined }
  if (transport === fetch) { cache.set(key, { at: Date.now(), value }); if (cache.size > 100) cache.delete(cache.keys().next().value!) }
  return value
}
