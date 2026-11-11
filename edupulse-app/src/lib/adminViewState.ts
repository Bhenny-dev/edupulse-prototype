import { canSwitchRole } from './authRoles.js'
type Actor={id:string;authenticated?:boolean;canSwitchRoles?:boolean;baseRole?:string;email?:string;accountEmail?:string}
type View={accountId:string;role:string;subjectId:string|null}
type TabStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>
export const ADMIN_VIEW_KEY='edupulse-admin-view-v1'
export const ADMIN_PICKER_KEY='edupulse-admin-picker-v1'
const tabStorage=()=>{try{return sessionStorage}catch{return null}}
const subjectId=(value:unknown)=>typeof value==='string'&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
const academicRole=(value:unknown):value is string=>typeof value==='string'&&['student','instructor','dean','associate_dean'].includes(value)
export function clearAdminView(storage:TabStorage|null=tabStorage()){try{storage?.removeItem(ADMIN_VIEW_KEY)}catch{/* In-memory navigation remains usable. */}}
export function clearAdminPicker(storage:TabStorage|null=tabStorage()){try{storage?.removeItem(ADMIN_PICKER_KEY)}catch{/* Closing the picker remains usable without storage. */}}
/** Restore only an open picker role, never a search, account result or pending action. */
export function readAdminPicker(actor:Actor,storage:TabStorage|null=tabStorage()):string|null {
  try{
    const raw=storage?.getItem(ADMIN_PICKER_KEY);if(!raw||raw.length>1000)return null
    const hint=JSON.parse(raw)
    return hint?.accountId===actor.id&&academicRole(hint.role)&&canSwitchRole(actor,hint.role)?hint.role:null
  }catch{return null}
}
export function saveAdminPicker(actor:Actor,role:string,storage:TabStorage|null=tabStorage()){
  if(!academicRole(role)||!canSwitchRole(actor,role)){clearAdminPicker(storage);return}
  try{storage?.setItem(ADMIN_PICKER_KEY,JSON.stringify({accountId:actor.id,role}))}catch{/* The picker remains available for this render. */}
}
/** A tab-local hint only. Never restore authority, names or credentials from storage. */
export function readAdminView(actor:Actor,storage:TabStorage|null=tabStorage()):View|null {
  try{
    const raw=storage?.getItem(ADMIN_VIEW_KEY);if(!raw||raw.length>1000)return null
    const view=JSON.parse(raw)
    if(view?.accountId!==actor.id||!academicRole(view.role)||!canSwitchRole(actor,view.role)||!(view.subjectId===null||subjectId(view.subjectId)))return null
    return {accountId:actor.id,role:view.role,subjectId:view.subjectId?.toLowerCase()||null}
  }catch{return null}
}
export function saveAdminView(actor:Actor,role:string,id:string|null,storage:TabStorage|null=tabStorage()){
  if(!academicRole(role)||!canSwitchRole(actor,role)||!(id===null||subjectId(id))){clearAdminView(storage);return}
  try{storage?.setItem(ADMIN_VIEW_KEY,JSON.stringify({accountId:actor.id,role,subjectId:id?.toLowerCase()||null}))}catch{/* No tokens or account data are required for this hint. */}
}
