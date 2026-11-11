import type {Page} from '@playwright/test'
import {accountSupportUI,supportAccounts} from './account-support-fixture'

export const ADMIN_VIEW_KEY='edupulse-admin-view-v1'
export const ADMIN_ACTOR_ID='fe67b9d2-719b-4b10-91cd-76031ab115fe'
export type AcademicRole='student'|'instructor'|'dean'|'associate_dean'
export const roleReloadCases:{role:AcademicRole;path:string}[]=[
  {role:'student',path:'/assessment'},
  {role:'instructor',path:'/syllabus?tab=mine'},
  {role:'dean',path:'/monitor?tab=overview'},
  {role:'associate_dean',path:'/monitor?tab=students'},
]

/** Seed once per tab, so exiting and reloading cannot silently recreate a removed hint. */
export async function seedAdminView(page:Page,hint:{accountId:string;role:AcademicRole;subjectId:string|null}){
  await page.addInitScript(({key,hint})=>{
    const marker='synthetic-admin-reload-seeded'
    if(!sessionStorage.getItem(marker)){
      sessionStorage.setItem(key,JSON.stringify(hint))
      sessionStorage.setItem(marker,'true')
    }
  },{key:ADMIN_VIEW_KEY,hint})
}

/** Controlled account/workspace transport only; this fixture never exercises hosted authorization. */
export async function adminReloadUI(page:Page,role:AcademicRole='instructor',options:{subjectId?:string|null;accountId?:string}={}){
  const fixture=await accountSupportUI(page)
  const account=supportAccounts.find(item=>item.role===role)!
  const hint={accountId:options.accountId||ADMIN_ACTOR_ID,role,subjectId:options.subjectId===undefined?account.id:options.subjectId}
  await seedAdminView(page,hint)
  return {...fixture,account,hint}
}
