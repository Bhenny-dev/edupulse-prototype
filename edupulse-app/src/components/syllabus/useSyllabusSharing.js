import {useState,useEffect,useCallback,useRef} from 'react'
import {useAuth} from '../../context/AuthContext'
import {aiRequest} from '../../lib/aiClient'

export default function useSyllabusSharing(){
 const {user}=useAuth(),allowed=!!user?.authenticated&&['instructor','admin'].includes(user.role)
 const scope=`${user?.accountId||user?.id}:${user?.id}:${user?.role}`
 const [state,setState]=useState({scope,shares:[],loading:allowed,error:''})
 const request=useRef(null),active=useRef({scope,mounted:true})
 active.current.scope=scope
 const load=useCallback(async()=>{
  if(!active.current.mounted||active.current.scope!==scope)return
  request.current?.abort();const controller=new AbortController();request.current=controller
  if(!allowed){setState({scope,shares:[],loading:false,error:''});return}
  setState(previous=>({...previous,scope,loading:true,error:''}))
  try{const result=await aiRequest('syllabi','POST',{operation:'list'},controller.signal);if(!controller.signal.aborted)setState({scope,shares:result.shares,loading:false,error:''})}
  catch(error){if(!controller.signal.aborted)setState({scope,shares:[],loading:false,error:error.message})}
 },[allowed,scope])
 useEffect(()=>{active.current.mounted=true;void load();return()=>{active.current.mounted=false;request.current?.abort()}},[load])
 const command=async input=>{const result=await aiRequest('syllabi','POST',input);if(!active.current.mounted||active.current.scope!==scope)throw new Error('The account view changed. Reopen Syllabus to verify the action.');if(!['open','recipients','adopt'].includes(input.operation))await load();return result}
 return {...(state.scope===scope?state:{shares:[],loading:allowed,error:''}),allowed,load,command}
}
