import {useEffect,useId,useRef} from 'react'
import {CalendarDays,X} from 'lucide-react'
import {loadSchedule} from '../../utils/loadSchedule'
import {useWorkspaceViewState} from '../../context/WorkspaceContext'
import './load-schedule.css'
export default function LoadSchedulePopover({load}){
 const id=useId(),ref=useRef(null),[open,setOpen]=useWorkspaceViewState(`load-schedule:${load.key}`,false),events=loadSchedule(load)
 useEffect(()=>{if(open)ref.current?.showPopover()},[open])
 if(!events.length)return <span className="text-muted">Schedule not added</span>
 const days=['Monday','Tuesday','Wednesday','Thursday','Friday',...['Saturday','Sunday'].filter(day=>events.some(e=>e.day===day))]
 const valid=events.filter(e=>e.start!==null&&e.end!==null&&e.end>e.start),start=valid.length?Math.floor(Math.min(...valid.map(e=>e.start))/60):8,end=valid.length?Math.ceil(Math.max(...valid.map(e=>e.end))/60):17
 return <><button type="button" className="btn btn-secondary btn-sm" popoverTarget={id} aria-label={`View schedule for ${load.code} ${load.instructorName}`}><CalendarDays size={15} aria-hidden="true"/>View schedule</button>
 <section ref={ref} id={id} popover="auto" role="dialog" aria-label="Class schedule" className="load-schedule-popover" onToggle={event=>setOpen(event.newState==='open')}>
 <header><h3>Class schedule</h3><button type="button" className="btn btn-ghost" popoverTarget={id} popoverTargetAction="hide" aria-label="Close schedule"><X size={20}/></button></header>
 <div className="load-week-scroll"><div className="load-week" style={{gridTemplateColumns:`64px repeat(${days.length},minmax(100px,1fr))`,gridTemplateRows:`36px repeat(${(end-start)*2},28px)`}}><div>Time</div>{days.map(day=><strong key={day}>{day}</strong>)}
 {Array.from({length:end-start},(_,i)=>start+i).map(hour=><span key={hour} className="load-hour-label" style={{gridColumn:1,gridRow:`${(hour-start)*2+2} / span 2`}}>{String(hour).padStart(2,'0')}:00</span>)}
 {days.map((day,index)=><div key={day} className="load-day-track" style={{gridColumn:index+2,gridRow:`2 / span ${(end-start)*2}`}}/>)}
 {valid.map((event,index)=><article key={index} className="load-meeting" style={{gridColumn:days.indexOf(event.day)+2,gridRow:`${Math.floor((event.start-start*60)/30)+2} / span ${Math.max(1,Math.ceil((event.end-event.start)/30))}`}}><strong>{event.block?`Block ${event.block}`:'Class'}</strong><span>{event.time}</span><span>{event.hours===null?'Hours need review':`${event.hours} hours`}</span><span>{event.room?`Room ${event.room}`:'Room not added'}</span></article>)}
 </div></div>{events.filter(e=>e.start===null||e.end===null||e.end<=e.start).map((e,i)=><p key={i}>{e.day}: {e.time||'Time not added'} {e.room} (review time)</p>)}
 </section></>
}
