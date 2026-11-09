export type SyllabusReference = { kind:'book'|'link'; title:string; url:string; authors:string; year:string; publisher:string }
const text=(value:unknown)=>typeof value==='string'?value.trim():''
export function referenceToken(ref:SyllabusReference) {
 if(ref.url){try{const url=new URL(ref.url);url.hash='';return 'url:'+url.href}catch{return 'url:'+ref.url}}
 return 'book:'+JSON.stringify([ref.title,ref.authors,ref.year,ref.publisher].map(value=>value.toLowerCase().replace(/\s+/g,' ').trim()))
}
// A corrected author/edition is a new citation association, never silently reused
// with a copy retained under older bibliographic details.
export const referenceSnapshotToken=(ref:SyllabusReference)=>JSON.stringify([referenceToken(ref),ref.kind,ref.title,ref.authors,ref.year,ref.publisher])
export function collectSyllabusReferences(syllabus:Record<string,any>,week?:number):SyllabusReference[] {
 const refs:SyllabusReference[]=[], seen=new Set<string>()
 const add=(value:any,kind:'book'|'link')=>{
  if(!value)return
  const raw=typeof value==='string'?value:''
  const ref:SyllabusReference={kind,title:text(value.title)||text(value.name)||raw,url:text(value.url)||(/^https?:\/\//i.test(raw)?raw:''),authors:Array.isArray(value.authors)?value.authors.map(text).filter(Boolean).join(', '):text(value.authors),year:String(value.year||'').trim(),publisher:text(value.publisher)}
  if(!ref.title)ref.title=ref.url
  if(!ref.title)return
  const key=referenceToken(ref);if(seen.has(key))return;seen.add(key);refs.push(ref)
 }
 for(const book of [...syllabus.books||[],...syllabus.references?.books||[]])add(book,'book')
 for(const link of [...syllabus.onlineReferences||[],...syllabus.references?.onlineReferences||[]])add(link,'link')
 if(Array.isArray(syllabus.references))for(const link of syllabus.references)add(link,'link')
 for(const row of syllabus.courseOutline||[])if(week===undefined||row.week===week)for(const resource of row.resources||[])add(resource,'link')
 if(refs.length>80)throw new Error('This source view supports up to 80 distinct references. Split the syllabus source list before scanning; no references were silently omitted.')
 return refs
}
export function bibliographicLabel(ref:Partial<SyllabusReference>) {
 return [ref.authors,ref.year?`(${ref.year})`:null,ref.title,ref.publisher].filter(Boolean).join('. ')
}
