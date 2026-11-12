import {searchBookCatalog} from '../external/references.js'
import {parseCitation} from '../../src/utils/referenceParsing.js'
import type {SourceReference} from './contracts.js'
import type {Reference} from '../../src/lib/rag/types.js'
const tokens=(s:string)=>new Set(s.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(x=>x.length>2&&!['the','and','for','with','introduction'].includes(x)))
export function matchingReference(reference:SourceReference,candidates:Reference[]){
 const parsed=parseCitation(reference.title),title=tokens(parsed.title),author=tokens(reference.authors||parsed.authors||'')
 return candidates.filter(c=>c.source!=='Wikipedia').map(candidate=>{
  const t=tokens(candidate.title),a=tokens(candidate.authors.join(' ')),hits=[...title].filter(x=>t.has(x)).length
  const score=title.size?hits/title.size:0,precision=t.size?hits/t.size:0
  const authorMatch=!author.size||[...author].some(x=>a.has(x))
  return {candidate,score:authorMatch&&precision>=.65?score:0}
 }).filter(c=>c.score>=.85).sort((a,b)=>b.score-a.score)[0]?.candidate
}
export async function discoverReference(reference:SourceReference,signal:AbortSignal,search?:typeof searchBookCatalog){
 const parsed=parseCitation(reference.title)
 const result=await (search||searchBookCatalog)(parsed.title,(reference.authors||parsed.authors||'').split(',')[0]||'',signal)
 const candidate=matchingReference(reference,result.references)
 if(!candidate)return {candidate:null,warning:result.warning||'No sufficiently close title and author match was found in the public catalogs. The citation was not replaced.'}
 const notes=[result.warning,'Catalog identity only; the cited edition and full teaching text have not been verified.',candidate.year?`Catalog year: ${candidate.year}${candidate.source==='Open Library'?' (first publication; not necessarily the cited edition)':''}.`:null]
 if((reference.year||parsed.year)&&String(candidate.year)!==(reference.year||parsed.year))notes.push(`The syllabus year ${reference.year||parsed.year} differs from this catalog record. Verify the edition before citing.`)
 return {candidate,warning:notes.filter(Boolean).join(' ')}
}
