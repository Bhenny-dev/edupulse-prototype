export type DeliveryWindow = { week:number; opens_at:string; closes_at:string|null }
export type DeliverySchedule = { course_id:string; instructor_id:string; syllabus_id:string; block_section:string; revision:number; windows:DeliveryWindow[]; updated_at:string }
export type DeliveryDate = { week:number; date:string; start:string; end:string }
export type TimedPublication = { delivery_mode?:string; delivery_state?:string; delivery_open_at?:string|null; delivery_close_at?:string|null }
export const DELIVERY_ZONE = 'Asia/Manila'
const datePattern=/^\d{4}-\d{2}-\d{2}$/,timePattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/
const validDate=(date:string)=>datePattern.test(date)&&Number.isFinite(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date
export function localDeliveryTime(value:string|null|undefined) {
 if(!value)return {date:'',time:''}
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:DELIVERY_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(part=>[part.type,part.value]))
 return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`}
}
export function weeklyDeliveryDates(weeks:number[],date:string,start:string,end=''):DeliveryDate[] {
 if(!validDate(date)||!timePattern.test(start)||end&&(!timePattern.test(end)||end<=start))throw new Error('Choose a valid first date and class start. A closing time must follow the start on the same day.')
 const ordered=[...new Set(weeks)].sort((a,b)=>a-b),first=ordered[0]
 return ordered.map(week=>({week,date:new Date(Date.parse(`${date}T00:00:00Z`)+(week-first)*7*86400000).toISOString().slice(0,10),start,end}))
}
export function scheduleDates(weeks:number[],schedule?:DeliverySchedule):DeliveryDate[] {
 return weeks.map(week=>{const row=schedule?.windows.find(row=>row.week===week),opening=localDeliveryTime(row?.opens_at),closing=localDeliveryTime(row?.closes_at);return {week,date:opening.date,start:opening.time,end:closing.time}})
}
export function validateDeliveryDates(rows:DeliveryDate[]) {
 for(const row of rows)if(!validDate(row.date)||!timePattern.test(row.start)||row.end&&(!timePattern.test(row.end)||row.end<=row.start))throw new Error(`Week ${row.week} needs a date and class start. Its optional closing time must follow the start.`)
}
export function deliveryState(publication:TimedPublication,now=Date.now()):'legacy'|'open'|'scheduled'|'closed'|'unconfigured' {
 if(publication.delivery_mode!=='block_schedule')return 'legacy'
 if(!publication.delivery_open_at)return 'unconfigured'
 if(now<new Date(publication.delivery_open_at).getTime())return 'scheduled'
 if(publication.delivery_close_at&&now>=new Date(publication.delivery_close_at).getTime())return 'closed'
 return 'open'
}
export const deliveryTimeLabel=(value:string)=>new Intl.DateTimeFormat('en-PH',{timeZone:DELIVERY_ZONE,dateStyle:'medium',timeStyle:'short'}).format(new Date(value))
