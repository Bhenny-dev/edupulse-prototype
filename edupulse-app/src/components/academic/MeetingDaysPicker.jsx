import {useId} from 'react'
import {scheduleDays} from '../../utils/teachingLoad'
import './meeting-days.css'
export const meetingDays=[['Monday','M'],['Tuesday','T'],['Wednesday','W'],['Thursday','Th'],['Friday','F'],['Saturday','S']]
export const validMeetingDays=value=>{const days=scheduleDays(value||'');return Boolean(days&&days.length<=2&&days.every(day=>meetingDays.some(([name])=>day===name)))}
/** Canonical day codes are shared with hours calculation and block delivery calendars. */
export default function MeetingDaysPicker({value='',onChange,disabled=false,label='Days'}){
 const id=useId(),selected=scheduleDays(value)||[],invalid=Boolean(value&&!validMeetingDays(value))
 const change=(name,checked)=>{const next=checked?[...selected,name]:selected.filter(day=>day!==name);onChange(meetingDays.filter(([day])=>next.includes(day)).map(([,code])=>code).join(''))}
 return <div className="meeting-days"><span id={id}>{label}</span><details><summary className="form-input" aria-labelledby={id} aria-disabled={disabled} onClick={event=>{if(disabled)event.preventDefault()}}>{(validMeetingDays(value)?meetingDays.filter(([name])=>selected.includes(name)).map(([,code])=>code).join(''):value)||'Choose days'}</summary><fieldset disabled={disabled}><legend>Choose up to two days</legend>{meetingDays.map(([name,code])=><label key={code}><input type="checkbox" checked={selected.includes(name)} disabled={!selected.includes(name)&&selected.length>=2} onChange={event=>change(name,event.target.checked)}/><span>{name}</span><small>{code}</small></label>)}{value&&<button type="button" className="btn btn-ghost" onClick={()=>onChange('')}>Clear days</button>}</fieldset></details><small>M / T / W / Th / F / S. Choose one or two.</small>{invalid&&<small role="alert">Review the imported days: choose up to two, Monday to Saturday.</small>}</div>
}
