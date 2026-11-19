import MeetingDaysPicker,{validMeetingDays} from './MeetingDaysPicker'
const fields=[['time','Time',150],['days','Days',80],['room','Room',150],['units','Units',50],['lecture','Lecture units',50],['lab','Lab units',50],['hours','Listed hours',168],['students','Students listed',2000],['program','Program',250],['degree','Degree on source',200]]
const numeric=new Set(['units','lecture','lab','hours','students'])
const display=value=>value===null||value===undefined||value===''?'Not recorded':value

export const loadFieldErrors=entry=>[...(validMeetingDays(entry.days)?[]:[{key:'days',message:'Choose one or two days, Monday to Saturday.'}]),...fields.filter(([key,,max])=>numeric.has(key)&&entry[key]!==null&&entry[key]!==undefined&&(!Number.isFinite(entry[key])||entry[key]<0||entry[key]>max||(key==='students'&&!Number.isInteger(entry[key])))).map(([key,label,max])=>({key,message:`${label} must be ${key==='students'?'a whole number':'a number'} between 0 and ${max}.`}))]

/** Reviewed corrections are local until the existing explicit import confirmation. */
export default function TeachingLoadFields({entry,editable,disabled,block,onChange}){
 const errors=loadFieldErrors(entry)
 return <fieldset className="load-import-facts load-import-edit" disabled={disabled}>
  <legend>Schedule and source details</legend>
  <div><span>Block section</span><p>{block}</p></div>
  {fields.map(([key,label,max])=><div key={key}>{editable?key==='days'?<MeetingDaysPicker value={entry.days||''} onChange={value=>onChange('days',value)} disabled={disabled}/>:<label>{label}<input aria-invalid={errors.some(error=>error.key===key)||undefined} className="form-input" type={numeric.has(key)?'number':'text'} value={entry[key]??''} min={numeric.has(key)?0:undefined} max={numeric.has(key)?max:undefined} step={key==='students'?1:'any'} maxLength={numeric.has(key)?undefined:max} list={key==='days'?`load-days-${entry.id}`:key==='degree'?`load-degree-${entry.id}`:undefined} onChange={event=>onChange(key,numeric.has(key)?event.target.value===''?null:Number(event.target.value):event.target.value)}/></label>:<><span>{label}</span><p>{display(entry[key])}</p></>}{editable&&errors.filter(error=>error.key===key).map(error=><small role="alert" key={key}>{error.message}</small>)}</div>)}
  <div><span>Computed hours / week</span><output>{display(entry.computedHours)}</output><small>Calculated from time and days.</small></div>
  {editable&&<><datalist id={`load-degree-${entry.id}`}>{['Bachelors','Masters','Doctorate'].map(value=><option key={value} value={value}/>)}</datalist></>}
 </fieldset>
}
