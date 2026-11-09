/** Recheck review state when an asynchronous generation completes. */
export function mergeDrafts<T extends { status: string }>(current: Record<string, T>, updates: Record<string, T>): Record<string, T> {
  const next = { ...current }
  for (const [id, item] of Object.entries(updates)) {
    if (!['checked', 'published'].includes(current[id]?.status)) next[id] = item
  }
  return next
}
import { jsonValue } from './jsonValue.js'


/** Replace only the requested week's unreviewed drafts after the whole plan has completed. */
export function mergeGeneratedWeek<T extends {status:string;type:string;syllabusId:string;week:number;content?:{ai?:unknown;title?:string}}>(current:Record<string,T>,updates:Record<string,T>,expected:Record<string,T>,scope:{syllabusId:string;week:number;types:string[];missingOnly?:boolean}) {
  const next={...current}
  for(const [id,item] of Object.entries(updates)) {
    if(item.syllabusId!==scope.syllabusId||item.week!==scope.week||!scope.types.includes(item.type))throw new Error('Generated content is outside the selected outline week.')
    if(['checked','published'].includes(current[id]?.status))continue
    if(jsonValue(current[id])!==jsonValue(expected[id]))throw new Error('A draft changed during generation. Your newer work was preserved; generate again.')
    next[id]=item
  }
  if(!scope.missingOnly)for(const [id,item] of Object.entries(current)) {
    if(item.syllabusId===scope.syllabusId&&item.week===scope.week&&item.status==='draft'&&item.content?.ai&&!scope.types.includes(item.type)&&jsonValue(item)===jsonValue(expected[id]))delete next[id]
  }
  return next
}
