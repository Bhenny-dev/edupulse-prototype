import {scheduleDays,scheduleHours} from './teachingLoad'
import {slotTimes,sectionOf} from './blockSections'
type Slot={days?:string;time?:string;room?:string;block?:string}
export function loadSchedule(load:{sections?:{block:string;slots:Slot[]}[];sourceRows?:Record<string,unknown>[];days?:string;time?:string;room?:string;block?:string}){
 let slots:Slot[]=(load.sections||[]).flatMap(section=>section.slots.map(slot=>({...slot,block:section.block})))
 if(!slots.length)slots=(load.sourceRows||[]).map(row=>({days:String(row.days||''),time:String(row.time||''),room:String(row.room||''),block:sectionOf(String(row.subject_code||'')).block}))
 if(!slots.length)slots=[load]
 const events=slots.flatMap(slot=>{
  const days=scheduleDays(slot.days||'')||[],times=(slot.time||'').split('/').map(s=>s.trim()),rooms=(slot.room||'').split('/').map(s=>s.trim())
  return days.map((day,index)=>{const time=times.length===days.length?times[index]:times.join(' / '),room=rooms.length===days.length?rooms[index]:rooms.join(' / ')
   const clock=times.length>1&&times.length!==days.length?{start:'',end:''}:slotTimes(time),explicit=[...time.matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi)]
   if(explicit.length===2){const format=(m:RegExpMatchArray)=>String(Number(m[1])%12+(m[3].toUpperCase()==='PM'?12:0)).padStart(2,'0')+':'+m[2];clock.start=format(explicit[0]);clock.end=format(explicit[1])}
   const minute=(v:string)=>v?Number(v.slice(0,2))*60+Number(v.slice(3)):null
   return {day,time,room,block:slot.block||'',start:minute(clock.start),end:minute(clock.end),hours:scheduleHours(time,'M')}
  })
 })
 return events.filter((event,index)=>events.findIndex(other=>JSON.stringify(other)===JSON.stringify(event))===index)
}
