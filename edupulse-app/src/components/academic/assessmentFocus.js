import {useLayoutEffect,useRef,useSyncExternalStore} from 'react'
const active=new Set(),listeners=new Set()
const notify=()=>listeners.forEach(listener=>listener())
const subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener)}
const snapshot=()=>active.size>0
/** Presentation-only guard, derived from the actual reader state; no learner/session writes. */
export function useAssessmentFocus(focused){
 const token=useRef(Symbol('assessment-reader'))
 useLayoutEffect(()=>{if(!focused)return;const id=token.current;active.add(id);notify();return()=>{active.delete(id);notify()}},[focused])
}
export const useAssessmentFocusBlocked=()=>useSyncExternalStore(subscribe,snapshot,()=>false)
