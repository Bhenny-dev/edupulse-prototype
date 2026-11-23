import {useEffect} from 'react'
import {useSearchParams} from 'react-router-dom'
import {useWorkspaceViewState} from '../../context/WorkspaceContext'
import {CURRENT_LOAD_TERM,isWritableLoadTerm,validLoadTerm} from '../../utils/loadTerms'

/** One account/role-scoped semester selection across academic pages; URLs can restore it. */
export default function useAcademicTerm(linkedTerm=null){
 const [params,setParams]=useSearchParams()
 const [saved,setSaved]=useWorkspaceViewState('academic-term',CURRENT_LOAD_TERM)
 const requested=params.get('term'),term=requested===null?(linkedTerm||saved):validLoadTerm(requested)?requested:'unspecified'
 useEffect(()=>{if(term!==saved)setSaved(term)},[term,saved,setSaved])
 const select=next=>{if(!validLoadTerm(next))return;setSaved(next);const query=new URLSearchParams(params);query.set('term',next);setParams(query)}
 return {term,select,writable:isWritableLoadTerm(term),academicYear:term.split('|')[0],semester:term.split('|')[1]||''}
}
