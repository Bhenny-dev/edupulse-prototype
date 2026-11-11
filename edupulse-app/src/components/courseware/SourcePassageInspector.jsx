import {useState,useEffect,useRef,useMemo} from 'react'
import {Search,MessageSquare,X} from 'lucide-react'
import {aiRequest} from '../../lib/aiClient'
import {pulse} from '../pulse/pulseBus'
import {useWorkspaceViewState} from '../../context/WorkspaceContext'
import RetainedSourceReview from '../ai/RetainedSourceReview'

const signature=text=>{let hash=2166136261;for(const char of text||'')hash=Math.imul(hash^char.charCodeAt(0),16777619);return String(hash>>>0)}
const sourceCandidates=(sources,text)=>{
 const citations=[...text.matchAll(/\[(\d+)\]/g)].map(match=>Number(match[1])),words=[...new Set(text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[])].slice(0,100)
 const ranked=sources.map((source,index)=>({id:source.retained?.id,score:(citations.includes(source.citation||index+1)?100:0)+words.filter(word=>(source.text||'').toLowerCase().includes(word)).length})).sort((a,b)=>b.score-a.score)
 return [...new Set(ranked.map(source=>source.id).filter(Boolean))].slice(0,12)
}
export default function SourcePassageInspector({content,children}) {
 const root=useRef(null),popover=useRef(null),trigger=useRef(null),[selection,setSelection]=useState(''),[basisSelection,setBasisSelection]=useState(''),[reference,setReference]=useState(null),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const sections=useMemo(()=>content.sections||content.questions?.map(question=>({body:question.text}))||[],[content.sections,content.questions])
 const key=`source-inspector:${content._storeId||content.title}`
 const [nav,setNav]=useWorkspaceViewState(key,null),[viewing,setViewing]=useWorkspaceViewState(key+':retained',null)
 const sources=useMemo(()=>content.sourceEvidence||content.ai?.sources||[],[content.sourceEvidence,content.ai?.sources]),ids=[...new Set(sources.map(source=>source.retained?.id).filter(Boolean))],idsKey=ids.join(',')

 const capture=event=>{
  const control=event?.target
  if(control?.tagName==='TEXTAREA'&&/^questions\.\d+\.text$/.test(control.dataset.pulseField||'')){
   const index=Number(control.closest('[data-source-section]')?.dataset.sourceSection),start=control.selectionStart,end=Math.min(control.selectionEnd,start+2000)
   if(end>start){setSelection(control.value.slice(start,end));setReference({section:index,start,end,signature:signature(sections[index]?.body),input:true})}return
  }
  const selected=window.getSelection();if(!selected?.rangeCount||!selected.toString().trim())return
  const range=selected.getRangeAt(0),element=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement,section=element?.closest('[data-source-section]')
  if(!section||!root.current?.contains(section)||!section.contains(range.endContainer))return
  const index=Number(section.dataset.sourceSection),prefix=range.cloneRange();prefix.selectNodeContents(section);prefix.setEnd(range.startContainer,range.startOffset)
  const start=prefix.toString().length,text=range.toString().slice(0,2000)
  setSelection(text);setReference({section:index,start,end:start+text.length,signature:signature(sections[index]?.body)})
 }
 useEffect(()=>{
  if(!nav)return
  const section=sections[nav.section],element=root.current?.querySelector(`[data-source-section="${nav.section}"]`)
  const currentText=nav.input?section?.body:element?.textContent
  if(!section||signature(section.body)!==nav.signature||typeof currentText!=='string'||nav.start<0||nav.end>currentText.length||nav.end<=nav.start||nav.end-nav.start>2000||!idsKey){setNav(null);return}
  const quote=currentText.slice(nav.start,nav.end),abort=new AbortController()
  setSelection(quote);setBasisSelection(quote);setResult(null);setBusy(true);setError('')
  void aiRequest('syllabus-sources','POST',{operation:'locate',ids:sourceCandidates(sources,quote),text:quote},abort.signal).then(setResult).catch(failure=>{if(!abort.signal.aborted)setError(failure.message)}).finally(()=>{if(!abort.signal.aborted)setBusy(false)})
  return()=>abort.abort()
 },[nav,idsKey,sources,sections,setNav])
 const find=()=>{if(reference&&!busy)setNav(reference)}
 const close=()=>{setNav(null);trigger.current?.focus({preventScroll:true})}
 useEffect(()=>{if(nav)popover.current?.focus({preventScroll:true})},[nav])
 const explain=hit=>pulse.ask('Explain how this generated passage relates to its retained source. Distinguish supported ideas, original examples and any unsupported claim. Generated passage: '+basisSelection,{task:'summarize',label:'Selected teaching content and retained source',attachments:[{title:`${hit.title}${hit.page?' · page '+hit.page:''}`,fileName:'retained-source-excerpt.txt',text:hit.text,kind:'material'}]})
 return <><div ref={root} onMouseUp={capture} onKeyUp={capture} onTouchEnd={capture}>{children}</div>
 {ids.length>0&&<div className="source-selection-toolbar"><span className="text-sm">Select a passage to inspect its source basis.</span><button ref={trigger} type="button" className="btn btn-secondary btn-sm" disabled={selection.length<3||busy} onClick={find}><Search size={14}/>{busy?'Finding source…':'Find source for selection'}</button></div>}
 {nav&&<section ref={popover} className="source-passage-popover" role="dialog" aria-label="Source basis for selected passage" tabIndex={-1} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();close()}}}><header><strong>Source basis</strong><button className="btn btn-ghost btn-sm" aria-label="Close source basis" onClick={close}><X size={16}/></button></header><blockquote>{basisSelection}</blockquote>{busy&&<p role="status">Searching retained copies…</p>}{error&&<p role="alert">{error}</p>}{result&&<><p className="text-sm">{result.message}</p>{!result.matches.length&&<p>No matching passage was found in these retained copies. The selected text has no verified source basis here.</p>}{result.matches.map((hit,index)=><article key={`${hit.id}-${index}`}><strong>{hit.title}{hit.page?` · page ${hit.page}`:hit.section?` · ${hit.section}`:' · unpaginated'}</strong><p>{hit.text.slice(0,hit.highlight?.start||0)}<mark>{hit.text.slice(hit.highlight?.start||0,hit.highlight?.end||hit.text.length)}</mark>{hit.highlight&&hit.text.slice(hit.highlight.end)}</p><p className="text-sm">{hit.exact?'Exact wording found':'Related passage — review the connection'}{hit.truncated?' · Partial searchable copy':''}</p><div className="ai-actions"><button className="btn btn-secondary btn-sm" onClick={()=>setViewing(hit.id)}>Open retained copy</button><button className="btn btn-secondary btn-sm" onClick={()=>explain(hit)}><MessageSquare size={14}/>Explain in Pulse</button></div></article>)}</>}</section>}
 {viewing&&ids.includes(viewing)&&<RetainedSourceReview id={viewing} onClose={()=>setViewing(null)}/>}
 </>
}
