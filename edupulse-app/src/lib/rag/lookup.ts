import { terms } from './text.js'

export const words = (text: string):string[] => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []
export const informationalQuestion=(text:string)=>/^(?:please\s+)?(?:how|what|who|where|when|why|do you know|sino|ano|paano|saan|kilala)\b/i.test(text.trim())

/** Small, bounded edit distance, including adjacent-key transpositions. Never applied to IDs. */
export function wordMatch(a: string, b: string) {
  if (a === b) return 1
  if (/\d/.test(a + b) || Math.min(a.length,b.length) < 4 || Math.max(a.length,b.length)>64 || Math.abs(a.length-b.length) > 2) return 0
  const rows = Array.from({ length: a.length+1 }, (_,i) => Array.from({ length: b.length+1 }, (_,j) => i ? j ? 0 : i : j))
  for (let i=1;i<=a.length;i++) for (let j=1;j<=b.length;j++) {
    rows[i]![j] = Math.min(rows[i-1]![j]!+1,rows[i]![j-1]!+1,rows[i-1]![j-1]!+(a[i-1]===b[j-1]?0:1))
    if (i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) rows[i]![j]=Math.min(rows[i]![j]!,rows[i-2]![j-2]!+1)
  }
  const distance=rows[a.length]![b.length]!
  return distance <= (Math.min(a.length,b.length)>=7?2:1) ? 1-distance/Math.max(a.length,b.length) : 0
}

export function keywordMatch(question: string, text: string) {
  const all=lookupTerms(question.replace(/\b(?:use|using)\s+(?:edupulse|system\s+(?:sources?|records?|content)(?:\s+only)?)\b/gi, '')), query=all.length>1&&/^(?:how|paano)\b/i.test(question)?all.filter(t=>!['create','generate','draft','write','add'].includes(t)):all, content=[...new Set(terms(text))]
  return query.length ? query.reduce((sum,q)=>sum+Math.max(0,...content.map(t=>wordMatch(q,t))),0)/query.length : 0
}
const requestWords=new Set(['detail','only','know','find','search','system','local','content','say','pdf','document','attach','upload','ang','si','ba','mga','sa','ng'])
export const lookupTerms=(text:string)=>[...new Set(terms(text))].filter(word=>!requestWords.has(word)).slice(0,24)

export function nameMatch(query: string, name: string, id: string) {
  if (/\d/.test(query)) return query.trim().toLowerCase()===id.toLowerCase()?1:0
  const parts=words(query), available=words(name)
  if (!parts.length) return 0
  const scores=parts.map(q=>q.length===1 ? available.some(t=>t.startsWith(q))?1:0 : Math.max(0,...available.map(t=>wordMatch(q,t))))
  return scores.some(s=>s<0.7)?0:scores.reduce((a,b)=>a+b,0)/parts.length
}
