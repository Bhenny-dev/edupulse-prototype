import {LinkCard} from '../classroom/LinkAttachments'
import {parseLink} from '../../utils/classroom'

/** Links stay at their provider. Attaching a URL does not change its sharing permissions. */
export default function StudentResourceLinks({links=[]}) {
 return <div className="student-resource-links">{links.map((link,index)=>{
  const raw=typeof link==='string'?link:link?.url||link?.href
  let resource
  try { resource=parseLink(raw) } catch { return <p key={index} role="status">This resource link is unavailable. Ask your instructor for an updated link.</p> }
  const title=typeof link==='object'&&(link.title||link.name)
  return <div key={resource.url+':'+index}>
   <LinkCard link={{title,url:resource.url}} embed={false}/>
   <p className="text-sm text-muted">If access is denied, ask your instructor to check sharing permissions.</p>
  </div>
 })}</div>
}
