import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Coffee, Pause, Play, ArrowUpRight, Send, CheckCircle2 } from 'lucide-react'
import { BUDDIES, buddyReply, buddyForRequest } from '../../../agents/buddies'
import OfficeCanvas from './OfficeCanvas'
import './workspace-office.css'

export default function WorkspaceOffice({ tasks, messages, onClose, onTask, busy, modelReady, error }) {
  const [selected, setSelected] = useState('pip'), [paused, setPaused] = useState(false), [question, setQuestion] = useState(''), [handoff, setHandoff] = useState(null)
  const [chats, setChats] = useState({}), [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const root = useRef(null), closeButton = useRef(null), timer = useRef(null), waiting = useRef(null), log = useRef(null)
  const buddy = BUDDIES.find(item => item.id === selected), working = tasks.filter(task => task.status === 'working'), pending = tasks.filter(task => task.status === 'review')
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'; closeButton.current?.focus()
    const preference = matchMedia('(prefers-reduced-motion: reduce)'), change = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', change)
    return () => { document.body.style.overflow = overflow; preference.removeEventListener('change', change); clearTimeout(timer.current); previous?.focus?.() }
  }, [])
  useEffect(() => { if(log.current) log.current.scrollTop=log.current.scrollHeight }, [chats, selected])
  useEffect(() => {
    const reply = messages.at(-1)
    if (!waiting.current || !reply || reply.from !== 'pulse' || reply.id === waiting.current.previous) return
    const id = waiting.current.buddy
    const text = reply.mode === 'actions' ? 'Your request has a tool card in Pulse. Open it to inspect the source, preview the changes, and confirm.' : reply.text || 'Pulse has returned the result. Open the conversation to review it.'
    setChats(previous => ({ ...previous, [id]: [...(previous[id] || []), { from: id, text }] })); waiting.current=null
  }, [messages])
  function ask(text = question) {
    if (!text.trim() || handoff) return
    if (busy) return
    const personal = /\b(?:you|your|coffee|habit|personality)\b/i.test(text) && !/\b(?:open|redirect|generate|create|update|import|fix|revise|replace)\b/i.test(text)
    if (!modelReady && personal) {
      const result = buddyReply(selected, text.trim(), tasks)
      setQuestion('')
      setChats(previous => ({...previous,[selected]:[...(previous[selected]||[]),{from:'you',text:text.trim()},{from:selected,text:`Offline role guide: ${result.text}`}].slice(-20)}))
      return
    }
    const target = personal ? selected : buddyForRequest(text)
    const destination = BUDDIES.find(item=>item.id===target)
    setQuestion('')
    setChats(previous=>({...previous,[selected]:[...(previous[selected]||[]),{from:'you',text:text.trim()}].slice(-20)}))
    const submit=()=>{setSelected(target);setHandoff(null);waiting.current={buddy:target,previous:messages.at(-1)?.id};onTask(text.trim(),destination,personal)}
    if(target!==selected){setHandoff({from:buddy.name,to:destination.name,fromId:selected,toId:target});timer.current=setTimeout(submit,reducedMotion?0:650)}else submit()
  }

  function keyboard(event) {
    if(event.key==='Escape') { event.stopPropagation();onClose() }
    if(event.key==='Tab') {
      const controls=[...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(item=>item.getClientRects().length)
      const first=controls[0],last=controls.at(-1)
      if(event.shiftKey&&document.activeElement===first){ event.preventDefault();last?.focus() }
      else if(!event.shiftKey&&document.activeElement===last){ event.preventDefault();first?.focus() }
    }
  }
  return createPortal(<div className="workspace-office-backdrop" data-pulse-ui="office" onKeyDown={keyboard}>
    <section className="workspace-office" ref={root} role="dialog" aria-modal="true" aria-labelledby="workspace-office-title">
      <header className="office-topbar"><div className="office-brand-mark" aria-hidden="true">✦</div><div><span className="office-eyebrow">PULSE / WORKSPACE BUDDIES</span><h2 id="workspace-office-title">Meet your crew.</h2></div><div className="office-topbar-actions"><span className="office-live"><i />{working.length?`${working.length} at work`:'Ready when you are'}</span><button type="button" onClick={()=>setPaused(value=>!value)} aria-pressed={paused} aria-label={paused?'Resume office animation':'Pause office animation'}>{paused?<Play size={17}/>:<Pause size={17}/>}</button><button ref={closeButton} type="button" onClick={onClose} aria-label="Close workspace"><X size={21}/></button></div></header>
      <div className="office-body"><div className="office-world">
        <OfficeCanvas tasks={tasks} selected={selected} onSelect={setSelected} paused={paused} reducedMotion={reducedMotion} handoff={handoff}/>
        {handoff&&<div className="office-handoff" role="status"><span aria-hidden="true">▤</span>{handoff.from} → {handoff.to}<small>Passing your request to the right desk</small></div>}
        <div className="office-desk-grid" aria-label="Choose a workspace buddy">{BUDDIES.map(item=>{
          const active=working.some(task=>task.buddy===item.id),review=pending.filter(task=>task.buddy===item.id).length
          return <button key={item.id} className={`office-desk ${selected===item.id?'is-selected':''}`} style={{'--buddy-color':item.color}} onClick={()=>setSelected(item.id)} aria-pressed={selected===item.id} aria-label={`Talk to ${item.name}, ${item.title}`}><span className="office-buddy-face" aria-hidden="true"><i/><i/></span><span><strong>{item.name}</strong><small>{item.title}</small></span><em className={active?'is-working':''}>{active?'Working':review?`${review} to review`:'Coffee break'}</em></button>
        })}</div>
      </div><aside className="office-companion" style={{'--buddy-color':buddy.color}}>
        <div className="office-profile"><span className="office-eyebrow">{buddy.station}</span><h3>{buddy.name}<span>{buddy.title}</span></h3><p>“{buddy.motto}”</p></div>
        <div className="office-conversation" role="log" aria-live="polite" ref={log}><div className="office-bubble"><strong>{buddy.name}</strong><p>{buddy.role}</p></div>{(chats[selected]||[]).map((item,index)=><div className={`office-bubble ${item.from==='you'?'is-you':''}`} key={index}><strong>{item.from==='you'?'You':BUDDIES.find(person=>person.id===item.from)?.name}</strong><p>{item.text}</p></div>)}{busy&&waiting.current?.buddy===selected&&<p className="office-awaiting" role="status">Your request is active in Pulse. This desk will show the result when it returns.</p>}</div>
        <div className="office-quick-questions"><button onClick={()=>ask('What do you do?')} disabled={busy||!!handoff}>Your role</button><button onClick={()=>ask('What have you accomplished?')} disabled={busy||!!handoff}>Completed work</button><button onClick={()=>ask('What are your goals?')} disabled={busy||!!handoff}>Your goals</button></div>
        {error && <p role="alert" className="connected-pulse-error">{error}</p>}
        <form className="office-chat-form" onSubmit={event=>{event.preventDefault();ask()}}><input value={question} onChange={event=>setQuestion(event.target.value)} maxLength={1000} aria-label={`Message ${buddy.name}`} placeholder={`Ask ${buddy.name}…`}/><button type="submit" aria-label="Send to buddy" disabled={busy||!!handoff||!question.trim()}><Send size={17}/></button></form>
        <button className="office-return" onClick={onClose}>Review tools and results in Pulse <ArrowUpRight size={15}/></button>
      </aside></div>
      <footer className="office-footer"><span><Coffee size={15}/>{pending.length?`${pending.length} request${pending.length===1?'':'s'} awaiting your review`:'No requests waiting for review'}</span><span><CheckCircle2 size={15}/>{tasks.filter(task=>task.status==='done').length} completed session events</span><small>Fictional crew · real task events. Idle animations do not mean background processing.{reducedMotion?' Reduced motion is on.':''}</small></footer>
    </section>
  </div>,document.body)
}
