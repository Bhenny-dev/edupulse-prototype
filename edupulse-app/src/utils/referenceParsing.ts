export type CitationEntry={title:string;authors?:string;year?:string;publisher?:string;url?:string}
const heading=/^(?:books?|online(?: references?)?|web(?:site)?s?|references?|bibliography|learning resources)\s*:?[ \t]*$/i
const date='(?:\\d{3,4}(?:[a-z]|[–-]\\d{4})?|n\\.d\\.)(?:, [^)]{1,30})?'
const dated=new RegExp(`^.{1,180}?\\(${date}\\)|^[A-Za-z].{1,99}?\\b(?:19|20)\\d{2}\\s*[.−–-]`,'i')
const boundary=new RegExp(`^(?:\\d{1,3}[.)]\\s+|[\\u2022\\u25aa\\u25e6*]\\s+|(?:19|20)\\d{2}\\.\\s+[A-Z])|^.{1,180}?\\(${date}\\)|^[A-Za-z].{1,99}?\\b(?:19|20)\\d{2}\\s*[.−–-]`,'i')
const strip=(s:string)=>s.replace(/^\s*(?:\d{1,3}[.)]|[\u2022\u25aa\u25e6*])\s+/,'').trim()
/** Join physical line wraps; a citation start or heading always ends the prior entry. */
export function referenceLines(raw:string):string[]{
 const rows:string[]=[];let sectionStart=true,numbered=false,ordinal=''
 // A PDF can place a publisher continuation and the next author on the same line.
 const physicalLines=raw.replace(/^Books[\t :]+(?=\S)/im,'Books\n').split(/\r?\n/).flatMap(line=>{
  const start=line.search(/\b[A-Z][\p{L}’'-]+,\s*(?:[A-Z]\.\s*)+\(\d{3,4}\)/u)
  return start>0&&/(?:Press|Learning|Media|Wiley)\s*$/i.test(line.slice(0,start))?[line.slice(0,start),line.slice(start)]:[line]
 })
 for(const physical of physicalLines){
  let value=physical.trim();if(!value)continue
  if(/^(?:Prepared|Reviewed|Approved|Noted)(?: by)?\s*:/i.test(value))break
  if(/^(?:CIT\s*[–-]\s*Bachelor of Science in Information Technology|College of Information Technology)$/i.test(value))continue
  if(heading.test(value)){sectionStart=true;numbered=false;continue}
  if(/^(?:st|nd|rd|th)$/.test(value)){ordinal=value;continue}
  if(ordinal){value=value.replace(/\b(\d{1,2})\s+(?=Edition\b)/i,`$1${ordinal} `);ordinal=''}
  const line=strip(value),last=rows.at(-1)
  if(/^\d{1,3}[.)]\s+/.test(value))numbered=true
  // Join only an apparent continuation of a URL, never the next citation or URL.
  if(!sectionStart&&last&&/https?:\/\/\S+$/.test(last)&&!boundary.test(value)&&!/^https?:/i.test(line)&&(/[/?#._%-]/.test(line)||/[-/]$/.test(last)&&/^[a-z0-9]/.test(line))&&/^[-\w%/.?#=&+~]+(?:-\s+[\w%/.?#=&+~]+)*[.,;]?$/.test(line)){
   rows[rows.length-1]=last+line.replace(/-\s+/g,'-');continue
  }
  const continuation=!sectionStart&&last&&!boundary.test(value)&&(
   numbered||dated.test(last)&&!/^https?:/i.test(line)||
   /^[a-z]/.test(line)&&!/^https?:/i.test(line)||
   /^https?:\/\//i.test(line)&&!last.match(/https?:\/\//i)&&(dated.test(last)||/[-:]$/.test(last))||
   /\(\d{4}[a-z]?\)/.test(last)&&!/[.!?]$/.test(last)&&!/^(?:Coursera|Khan Academy|https?:|www\.)/i.test(line))
  if(continuation)rows[rows.length-1]=last.endsWith('-')&&!/https?:/.test(last)?last+line:last+' '+line
  else rows.push(line)
  sectionStart=false
 }
 return rows
}
export function parseCitation(value:string):CitationEntry{
 let line=strip(value).replace(/\s+/g,' ').trim().replace(/(https?:\/\/\S*[-/])\s+([-a-z0-9._~%/?#=&+]+)$/i,'$1$2')
 const explicit=line.split(';').map(x=>x.trim())
 if(explicit.length===4&&/^\d{4}$/.test(explicit[2]||''))return {title:explicit[0]!,authors:explicit[1]!,year:explicit[2]!,publisher:explicit[3]!}
 const match=line.match(/https?:\/\/[^\s<>]+/i)
 let url=match?.[0]||''
 url=url.replace(/[.,;]+$/,'');if(url.endsWith(')')&&(url.match(/\)/g)||[]).length>(url.match(/\(/g)||[]).length)url=url.slice(0,-1)
 if(url)line=line.replace(match![0],'').replace(/[\s\u2013\u2014:-]+$/,'').trim()
 const citation=line.match(new RegExp(`^(.{2,180}?)\\s*\\((${date})\\)\\s*[.,:]?\\s*(.+)$`,'i'))||line.match(/^(.{2,100}?)\s+((?:19|20)\d{2})\s*[.−–-]\s*(.+)$/)
 let title=citation?.[3]||line||url,authors=citation?.[1]||'',year=citation?.[2]||'',publisher=''
 const anonymous=title.match(/^((?:19|20)\d{2})\.\s+(.+)$/)
 if(!citation&&anonymous){year=anonymous[1]!;title=anonymous[2]!}
 if(/^\[Class No\./i.test(title)){title=authors+' '+title;authors=''}
 const press=title.match(/\.\s*(?:(?:United States of America|Indianapolis, Indiana):\s*)?((?:Pearson|Cengage(?: Learning)?|McGraw[- ]Hill|(?:John )?Wiley|Springer|Routledge|Sage|Oxford University Press|Cambridge University Press|Cisco [Pp]ress|For Dummies|Addison-Wesley|O[’']Reilly|Pragmatic Bookshelf|MIT Press|No Starch Press|SitePoint|World Scientific|Bedford\/St\.\s*Martin[’']s|Kendall Hunt|Prentice Hall)(?:[^.]*)?)\.?$/i)
 if(press){publisher=press[1]!.replace(/\.$/,'');title=title.slice(0,press.index).trim()}
 return {title:title.replace(/\.$/,''),authors,year,publisher,...(url?{url}:{})}
}
/** Legacy saved forms can hold a wrapped trailing word as another blank-metadata book. */
export function repairReferenceEntries<T extends CitationEntry>(rows:T[]):T[]{
 const result:T[]=[]
 for(const entry of rows){if(!entry)continue;const prior=result.at(-1),fragment=entry.title?.trim()
  if(heading.test(fragment)||/^(?:CIT\s*[–-]\s*Bachelor of Science in Information Technology|College of Information Technology)$/i.test(fragment))continue
  if(prior&&fragment==='Learning'&&/Cengage$/.test(prior.publisher||'')&&!entry.authors&&!entry.year&&!entry.url){result[result.length-1]={...prior,publisher:prior.publisher+' Learning'};continue}
  if(prior&&(prior.authors||prior.year||dated.test(prior.title))&&/^(?:O[’']Reilly Media|Martin[’']s|United States of America:.+|Inc\.)\.?$/i.test(fragment)&&!entry.authors&&!entry.year&&!entry.url){result[result.length-1]={...prior,title:prior.title+' '+fragment};continue}
  if(prior&&(prior.authors||prior.year||/\(\d{4}[a-z]?\)/.test(prior.title))&&fragment&&/^[a-z][a-z ,'-]{0,90}[.]?$/.test(fragment)&&!entry.authors&&!entry.year&&!entry.publisher&&!entry.url&&!prior.url&&prior.title&&!/[.!?]$/.test(prior.title))result[result.length-1]={...prior,title:prior.title+(prior.title.endsWith('-')?'':' ')+fragment}
  else result.push({...entry})
 }
 return result
}
