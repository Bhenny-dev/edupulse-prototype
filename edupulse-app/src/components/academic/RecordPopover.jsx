import {useEffect,useId,useRef} from 'react'
import {X} from 'lucide-react'
import {useWorkspaceViewState} from '../../context/WorkspaceContext'
import './load-schedule.css'
/** Read-only, authorized record content; persist only the bounded open/closed reference. */
export default function RecordPopover({viewKey,label,title,buttonLabel,children}){
 const id=useId(),ref=useRef(null),[open,setOpen]=useWorkspaceViewState(`record-popover:${viewKey}`,false)
 useEffect(()=>{if(open)ref.current?.showPopover()},[open])
 return <><button type="button" className="btn btn-secondary btn-sm" popoverTarget={id} aria-label={label}>{buttonLabel||label}</button><section ref={ref} id={id} popover="auto" role="dialog" aria-label={title} className="load-schedule-popover" onToggle={event=>setOpen(event.newState==='open')}><header><h3>{title}</h3><button type="button" className="btn btn-ghost" popoverTarget={id} popoverTargetAction="hide" aria-label="Close details"><X size={20}/></button></header>{children}</section></>
}
