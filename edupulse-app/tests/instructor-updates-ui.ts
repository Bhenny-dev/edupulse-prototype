import {expect,type Page} from '@playwright/test'
import {instructorUpdatesUI,sender,recipient,sharedStore} from './instructor-updates-fixture'
type Capture=(name:string,target?:any)=>Promise<void>
export async function instructorDashboardScene(page:Page,capture?:Capture){
 const fixture=await instructorUpdatesUI(page)
 await page.goto('/#/dashboard')
 const blocks=page.locator('.card').filter({has:page.getByRole('heading',{name:'My Block Sections',exact:true})})
 await expect(blocks.getByText('BSIT-1A',{exact:true})).toHaveCount(2)
 await expect(blocks).toContainText('IT 102 — Computer Programming 1');await expect(blocks).toContainText('IT 103 — Programming Lab')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 const scores=page.locator('.card').filter({has:page.getByRole('heading',{name:'Score Snapshot',exact:true})})
 await expect(scores).toContainText('33%');await expect(scores).toContainText('67%');await expect(scores).toContainText('100%')
 await expect(scores.locator('.kpi-value').nth(1)).toHaveText('67%')
 await expect.poll(()=>scores.locator('svg.recharts-surface').evaluate(element=>element.getBoundingClientRect().width)).toBeGreaterThan(0)
 await capture?.('dashboard-blocks',blocks);await capture?.('dashboard-scores',scores)
 await blocks.getByRole('button',{name:'Student Monitoring'}).first().click()
 await expect(page.getByRole('dialog',{name:'IT 102 · BSIT-1A monitoring',exact:true})).toBeVisible()
 await page.reload();await expect(page.getByRole('dialog',{name:'IT 102 · BSIT-1A monitoring',exact:true})).toBeVisible()
 fixture.records.attempts=[];await page.goto('/#/dashboard');await page.reload();await expect(page.getByText('No marked scores yet.',{exact:false})).toBeVisible()
}
export async function instructorSyllabusScene(page:Page,capture?:Capture){
 const {store}=await instructorUpdatesUI(page)
 await page.goto('/#/syllabus?tab=mine')
 const table=page.locator('.syllabus-list')
 await expect(table.getByRole('columnheader',{name:'Version',exact:true})).toHaveCount(0);await expect(table.getByRole('columnheader',{name:'Outline',exact:true})).toHaveCount(0)
 await expect(table.getByTitle('Archive',{exact:true})).toHaveCount(0);await expect(table.getByTitle('Review recorded changes',{exact:true})).toHaveCount(0)
 await expect(table.getByTitle('Version History',{exact:true})).toHaveCount(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await capture?.('my-syllabus',page.viewportSize()!.width<600?table:undefined)
 await table.getByTitle('Version History',{exact:true}).click();await expect(page.getByRole('dialog',{name:'Syllabus history'})).toBeVisible();await page.reload();await expect(page.getByRole('dialog',{name:'Syllabus history'})).toBeVisible();await capture?.('syllabus-history',page.getByRole('dialog',{name:'Syllabus history'}));await page.getByRole('dialog',{name:'Syllabus history'}).getByRole('button',{name:'Close',exact:true}).click()
 await table.getByTitle('Delete syllabus',{exact:true}).click();await page.reload();const dialog=page.getByRole('dialog',{name:'Delete syllabus',exact:true});await expect(dialog).toBeVisible();await capture?.('delete-syllabus',dialog)
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();expect(store.workspaces[sender].syllabi).toHaveLength(1)
 await table.getByTitle('Delete syllabus',{exact:true}).click();store.failDelete=true
 await dialog.getByRole('button',{name:'Confirm delete',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Synthetic unavailable save');expect(store.workspaces[sender].syllabi).toHaveLength(1)
 await dialog.getByRole('button',{name:'Confirm delete',exact:true}).click();await expect(table).toHaveCount(0);expect(store.workspaces[sender].syllabi).toHaveLength(0);expect(store.workspaces[sender].content).toEqual({})
 await page.reload();await expect(table).toHaveCount(0)
}
export async function instructorSharingScene(page:Page,capture?:Capture){
 const store=sharedStore();await instructorUpdatesUI(page,sender,store)
 await page.goto('/#/syllabus?tab=mine');await page.locator('.syllabus-list').getByTitle('Share syllabus',{exact:true}).click()
 await page.reload();const dialog=page.getByRole('dialog',{name:'Share syllabus',exact:true});await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Instructor email')).toHaveValue('')
 await dialog.getByLabel('Instructor email').fill('recipient@example.invalid');await capture?.('share-syllabus',dialog)
 await dialog.getByRole('button',{name:'Share syllabus',exact:true}).click();await expect(dialog).toHaveCount(0)
 await page.getByRole('button',{name:'Shared Repository',exact:true}).click();await expect(page.getByRole('heading',{name:'My shared syllabi'})).toBeVisible();await expect(page.getByText('Synthetic recipient',{exact:true})).toBeVisible();for(const toast of await page.locator('.toast').all())await toast.click();await capture?.('shared-repository',page.viewportSize()!.width<600?page.locator('section').filter({has:page.getByRole('heading',{name:'My shared syllabi',exact:true})}):undefined)
 const problems:string[]=[]
 const browser=page.context().browser()!,context=await browser.newContext({viewport:page.viewportSize()!,isMobile:page.viewportSize()!.width<600,hasTouch:page.viewportSize()!.width<600})
 try{
  const received=await context.newPage();received.on('pageerror',error=>problems.push(error.message));await received.emulateMedia({reducedMotion:'reduce'});await instructorUpdatesUI(received,recipient,store);await received.goto(new URL('/#/syllabus?tab=mine',page.url()).href)
  await expect(received.getByText('Shared by Synthetic sender',{exact:true})).toBeVisible()
  await capture?.('received-syllabus',received.locator('.card').filter({has:received.getByRole('heading',{name:'Shared with me',exact:true})}))
  await received.getByRole('button',{name:'View shared syllabus',exact:true}).click();await expect(received.locator('.syllabus-view-modal')).toBeVisible();await received.reload();await expect(received.locator('.syllabus-view-modal')).toBeVisible();await received.locator('.syllabus-view-modal').getByRole('button',{name:'Close syllabus details',exact:true}).click()
  await received.getByRole('button',{name:'Use as draft',exact:true}).click();await expect(received.locator('.syllabus-list')).toContainText('Shared by Synthetic sender');expect(store.workspaces[recipient].syllabi[0].status).toBe('drafted');expect(store.workspaces[recipient].syllabi[0].approvedFile).toBeUndefined()
  await received.reload();await expect(received.locator('.syllabus-list')).toContainText('Shared by Synthetic sender')
  await received.getByRole('button',{name:'Shared Repository',exact:true}).click();await expect(received.getByText('You have not shared any syllabi yet.',{exact:false})).toBeVisible()
 }finally{await context.close();expect(problems).toEqual([])}
 expect(store.workspaces[sender].syllabi).toHaveLength(1)
}
