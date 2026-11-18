import {loadTermOptions} from '../../utils/loadTerms'
import useAcademicTerm from './useAcademicTerm'
export default function LoadTermFilter({data}){
 const {term,select}=useAcademicTerm()
 return <label className="academic-filter">Academic term<select aria-label="Academic term" className="form-input" value={term} onChange={event=>select(event.target.value)}><option value="all">All terms · view only</option>{loadTermOptions(data).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
}
