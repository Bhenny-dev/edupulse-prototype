import {expect,type Page,type Locator} from '@playwright/test'
import {monitoringUI,monitoringStore} from './monitoring-fixture'
export type MonitoringShot=(name:string,target?:Page|Locator)=>Promise<void>
const noop:MonitoringShot=async()=>{}
export async function monitoringScenes(page:Page,shot:MonitoringShot=noop){
 await monitoringUI(page);await page.goto('/#/student-monitoring')
 await expect(page.getByRole('region',{name:'Year 2',exact:true})).toBeVisible();await shot('01-handled-classes')
 await page.getByRole('button',{name:'Open IT 102 · BSIT-1A',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'IT 102 · BSIT-1A monitoring',exact:true})
 await expect(dialog.getByRole('region',{name:'Enrolled students table',exact:true})).not.toContainText('Different block learner');await shot('02-class-students',dialog)
 await dialog.getByRole('button',{name:'Edit Synthetic learner',exact:true}).click();await shot('08-edit-membership',page.getByRole('dialog',{name:'Edit student membership',exact:true}));await page.keyboard.press('Escape')
 await dialog.getByRole('button',{name:'Suspend Synthetic learner',exact:true}).click();await shot('09-suspend-membership',page.getByRole('dialog',{name:'Suspend student membership',exact:true}));await page.keyboard.press('Escape')
 await dialog.getByRole('button',{name:'Assessment Scores',exact:true}).click();await expect(dialog.getByRole('img',{name:/^Assessment score radar:/})).toBeVisible();await shot('03-assessment-overview',dialog)
 const panel=(title:string)=>dialog.locator('section.card').filter({has:page.getByRole('heading',{name:title,exact:true})})
 await shot('04-assessment-students',panel('Assessment scores by student'))
 await dialog.getByRole('button',{name:'Synthetic learner',exact:true}).click();const assessment=page.getByRole('dialog',{name:'Student assessment breakdown',exact:true});await expect(assessment).toContainText('67%');await shot('05-assessment-breakdown',assessment);await page.keyboard.press('Escape')
 await dialog.getByRole('button',{name:'Learning Material Access',exact:true}).click();await expect(dialog.getByRole('heading',{name:'Learning material access radar',exact:true})).toBeVisible();await shot('06-material-overview',dialog)
 await shot('10-material-completion',panel('Reading completion per material'));await shot('11-material-students',panel('Learning material access by student'))
 await dialog.getByRole('button',{name:'Synthetic learner',exact:true}).click();const material=page.getByRole('dialog',{name:'Student material progress',exact:true});await expect(material).toContainText('50%');await shot('07-material-breakdown',material)
}
export async function monitoringReadingScene(page:Page,shot:MonitoringShot=noop){
 const store=monitoringStore();store.records.reading=[];await monitoringUI(page,'student',store);await page.goto('/#/courseware');await page.getByRole('button',{name:/^Open course /}).first().click();await page.getByRole('button',{name:'Open material',exact:true}).first().click();await page.getByRole('button',{name:'Confirm section 1 read',exact:true}).click();await expect(page.getByRole('region',{name:'Your reading progress',exact:true})).toContainText('1/2');await shot('12-student-reading',page.getByRole('region',{name:'Opened courseware',exact:true}))
}
