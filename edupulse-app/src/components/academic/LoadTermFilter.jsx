import {useSearchParams} from 'react-router-dom'
import {CURRENT_LOAD_TERM,loadTermOptions} from '../../utils/loadTerms'
export default function LoadTermFilter({data}){
 const [params,setParams]=useSearchParams()
 return <label className="academic-filter">Academic term<select aria-label="Academic term" className="form-input" value={params.get('term')||CURRENT_LOAD_TERM} onChange={event=>{const next=new URLSearchParams(params);next.set('term',event.target.value);setParams(next)}}><option value="all">All terms</option>{loadTermOptions(data).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
}
