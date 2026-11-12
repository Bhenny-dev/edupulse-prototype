import {repairReferenceEntries} from '../../utils/referenceParsing.js'
export type SyllabusReference = { kind:'book'|'link'; title:string; url:string; authors:string; year:string; publisher:string; doi?:string; isbn?:string }
const text=(value:unknown)=>typeof value==='string'?value.trim():''
export function referenceToken(ref:SyllabusReference) {
 if(ref.url){try{const url=new URL(ref.url);url.hash='';return 'url:'+url.href}catch{return 'url:'+ref.url}}
 return 'book:'+JSON.stringify([ref.title,ref.authors,ref.year,ref.publisher].map(value=>value.toLowerCase().replace(/\s+/g,' ').trim()))
}
// A corrected author/edition is a new citation association, never silently reused
// with a copy retained under older bibliographic details.
export const referenceSnapshotToken=(ref:SyllabusReference)=>JSON.stringify([referenceToken(ref),ref.kind,ref.title,ref.authors,ref.year,ref.publisher,...(ref.doi||ref.isbn?[ref.doi||'',ref.isbn||'']:[])])
export function collectSyllabusReferences(syllabus:Record<string,any>,week?:number):SyllabusReference[] {
 const refs:SyllabusReference[]=[], seen=new Set<string>()
 const add=(value:any,kind:'book'|'link')=>{
  if(!value)return
  const raw=typeof value==='string'?value:''
  const ref:SyllabusReference={kind,title:text(value.title)||text(value.name)||raw,url:text(value.url)||(/^https?:\/\//i.test(raw)?raw:''),authors:Array.isArray(value.authors)?value.authors.map(text).filter(Boolean).join(', '):text(value.authors),year:String(value.year||'').trim(),publisher:text(value.publisher)}
  if(text(value.doi))ref.doi=text(value.doi)
  if(text(value.isbn))ref.isbn=text(value.isbn)
  if(!ref.title)ref.title=ref.url
  if(!ref.title)return
  const key=referenceToken(ref);if(seen.has(key))return;seen.add(key);refs.push(ref)
 }
 const books=repairReferenceEntries([...syllabus.books||[],...syllabus.references?.books||[]].map(book=>typeof book==='string'?{title:book}:book))
 const links=[...syllabus.onlineReferences||[],...syllabus.references?.onlineReferences||[]].map(link=>typeof link==='string'?{title:link,url:link}:{...link})
 const attached=new Set<any>()
 for(const link of links){
  if(!link||String(link.title||'').trim()!==String(link.url||'').trim())continue
  let host='';try{host=new URL(link.url).hostname.replace(/^www\./,'').split('.')[0]||''}catch{continue}
  const book=books.find(book=>book&&!book.url&&/[-:]$/.test(book.title)&&host.length>=4&&book.title.toLowerCase().startsWith(host.toLowerCase()))
  if(book){link.title=book.title.replace(/[-:]+$/,'').trim();attached.add(book)}
 }
 for(const book of books)if(!attached.has(book))add(book,'book')
 for(const link of links)add(link,'link')
 if(Array.isArray(syllabus.references))for(const link of syllabus.references)add(link,'link')
 for(const row of syllabus.courseOutline||[])if(week===undefined||row.week===week)for(const resource of row.resources||[])add(resource,'link')
 if(refs.length>80)throw new Error('This source view supports up to 80 distinct references. Split the syllabus source list before scanning; no references were silently omitted.')
 return refs
}
export function bibliographicLabel(ref:Partial<SyllabusReference>) {
 return [ref.authors,ref.year?`(${ref.year})`:null,ref.title,ref.publisher,ref.doi?`DOI: ${ref.doi}`:null,ref.isbn?`ISBN: ${ref.isbn}`:null].filter(Boolean).join('. ')
}

/** Remove a citation association from this syllabus, not its reusable private source copy. */
export function removeSyllabusReference(syllabus:Record<string,any>,reference:SyllabusReference){
 const key=referenceToken(reference)
 const filter=(rows:any[],kind:'book'|'link')=>(rows||[]).filter(value=>{const normalized=collectSyllabusReferences(kind==='book'?{books:[value]}:{onlineReferences:[value]})[0];return !normalized||referenceToken(normalized)!==key})
 return {...syllabus,books:filter(syllabus.books,'book'),onlineReferences:filter(syllabus.onlineReferences,'link'),...(Array.isArray(syllabus.references)?{references:filter(syllabus.references,'link')}:syllabus.references?{references:{...syllabus.references,books:filter(syllabus.references.books,'book'),onlineReferences:filter(syllabus.references.onlineReferences,'link')}}:{})}
}
export function addSyllabusReference(syllabus:Record<string,any>,reference:SyllabusReference){
 const updated=removeSyllabusReference(syllabus,reference),{kind,...entry}=reference,field=kind==='book'?'books':'onlineReferences'
 return {...updated,[field]:[...updated[field].filter((value:any)=>value.title||value.url),entry]}
}
