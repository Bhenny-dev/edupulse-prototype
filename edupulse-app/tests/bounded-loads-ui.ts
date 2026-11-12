import {expect,type Page} from '@playwright/test'
import {monitoringUI,monitoringStore,monitoringOwner} from './monitoring-fixture'
/** Fictional nine-class allocation; no real accounts or learner activity. */
export async function boundedLoadUI(page:Page){
 const store=monitoringStore(),base=structuredClone(store.records.courses[0])
 store.records.courses=Array.from({length:9},(_,i)=>({...base,id:(i+1).toString(16).repeat(32),course_code:`SYN ${i+1}`,course_title:`Sample course ${i+1}`,instructor_id:monitoringOwner,block_info:[{block:`BSIT-${Math.floor(i/3)+1}${i%2?'B':'A'}`,students:25,yearLevel:String(Math.floor(i/3)+1)}]}))
 store.records.enrollments=store.records.courses.flatMap((c,i)=>Array.from({length:25},(_,j)=>({course_id:c.id,student_email:`sample-${Math.floor(i/3)+1}-${i%2}-${j}@example.invalid`,display_name:`Sample learner ${j+1}`,student_ref:`SYN-${i}-${j}`,block_section:c.block_info![0].block,year_level:Math.floor(i/3)+1})))
 store.records.publications=[];store.records.attempts=[];store.records.accesses=[];store.records.reading=[];store.records.sessions=[];store.records.institutional=[]
 store.workspace.registrations=[];store.workspace.enrollmentOverrides=[]
 await monitoringUI(page,'instructor',store)
 await page.goto('/#/student-monitoring')
 await expect(page.locator('.academic-sync-status')).toContainText('Records up to date')
 await expect(page.locator('.monitoring-course-card')).toHaveCount(9)
 await expect(page.locator('.kpi-grid')).toContainText('150')
 await page.reload();await expect(page.locator('.monitoring-course-card')).toHaveCount(9)
 expect(store.commands).toEqual([])
}
