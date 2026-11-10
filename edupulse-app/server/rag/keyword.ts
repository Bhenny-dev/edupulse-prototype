import { localDb, userDb } from '../database.js'
import { config } from '../config.js'
import type { Identity } from '../contracts.js'
import type { Evidence } from '../../src/lib/rag/types.js'
import { searchTerms } from '../../src/lib/rag/text.js'
import {indexedSourceMetadata} from '../sources/contracts.js'

/** Indexed keyword/prefix retrieval. No embedding, model download or generation request. */
export async function keywordSearch(identity: Identity, question: string, documentIds: string[], signal: AbortSignal): Promise<Evidence[]> {
  if (identity.role==='guest') return []
  const query=searchTerms(question,12).map(t=>`${t.length>4?t.slice(0,3):t}:*`).join(' | ')
  if (!query) return []
  let rows: any[]
  if (config().database==='local') {
    rows=(await (await localDb()).query(`SELECT c.id,c.document_id,c.text,c.page,c.section,c.flagged,d.title,d.quality FROM ai_chunks c JOIN ai_documents d ON d.id=c.document_id WHERE d.owner_id=$1 AND c.tsv @@ to_tsquery('english',$2) AND ($3::text[] IS NULL OR c.document_id=ANY($3)) ORDER BY ts_rank(c.tsv,to_tsquery('english',$2)) DESC,c.id LIMIT 100`,[identity.id,query,documentIds.length?documentIds:null])).rows
  } else {
    let request=userDb(identity).from('edupulse_ai_chunks').select('id,document_id,text,page,section,flagged,document:edupulse_ai_documents!inner(title,quality)').textSearch('fts',query,{config:'english'}).order('id').limit(100).abortSignal(signal)
    if (documentIds.length) request=request.in('document_id',documentIds)
    const {data,error}=await request
    if (error) throw new Error('Keyword library unavailable')
    rows=data || []
  }
  signal.throwIfAborted()
  return rows.map(row=>({id:row.id,documentId:row.document_id,title:row.title||row.document?.title||'Saved document',text:row.text,page:row.page,section:row.section,flagged:row.flagged,origin:'private',method:'keyword',similarity:null,relevance:null,rrf:1,query:question,...indexedSourceMetadata(row.quality||row.document?.quality)}))
}
