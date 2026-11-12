import {expect,type Page} from '@playwright/test'
import {editableSyllabusUI} from './editable-syllabus-fixture'
import {sender} from './instructor-updates-fixture'
type Capture=(name:string,target?:any)=>Promise<void>
export async function editableSyllabusScene(page:Page,capture?:Capture){
 const fixture=await editableSyllabusUI(page)
 await page.goto('/#/syllabus?tab=mine');await page.getByRole('button',{name:'Open Pulse assistant'}).click()
 const chat=page.getByRole('dialog',{name:'Pulse',exact:true})
 const ask=async(message:string)=>{await chat.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill(message);await chat.getByRole('button',{name:'Send',exact:true}).click()}
 await ask('Complete Week 1 of my saved IT 104 syllabus')
 await expect(chat.getByRole('button',{name:'Open editable syllabus',exact:true})).toBeVisible();expect(fixture.calls).toHaveLength(0)
 await capture?.('open-editable',chat)
 await chat.getByRole('button',{name:'Open editable syllabus',exact:true}).click();await expect(page).toHaveURL(/tab=builder&edit=editable-methods/)
 await ask('Generate the course outline for Week 1 only')
 const first=page.getByLabel('Week 1 contents',{exact:true})
 await expect(first).toHaveValue('Week 1 research questions\nWeek 1 feasibility and scope')
 await expect(chat.getByRole('button',{name:'Apply to open form',exact:true})).toHaveCount(0);await expect(chat.getByRole('button',{name:'Confirm and save draft',exact:true})).toHaveCount(0)
 await expect(chat.getByRole('button',{name:'Generate Week 2',exact:true}).last()).toBeVisible()
 await capture?.('week-one',chat)
 await first.focus();await page.keyboard.press('Alt+p')
 await ask('can you provide week 2 then')
 await expect(page.getByLabel('Week 2 contents',{exact:true})).toHaveValue('Week 2 research questions\nWeek 2 feasibility and scope')
 expect(fixture.calls.at(-1).message).toMatch(/Week 2 only/);expect(fixture.calls.at(-1).targetPath).toBeUndefined()
 await expect(first).toHaveValue('Week 1 research questions\nWeek 1 feasibility and scope')
 await chat.getByRole('button',{name:'Review changes',exact:true}).last().click();await expect(chat).toContainText('Week 2 - Contents');await capture?.('review-changes',chat.locator('.pulse-draft-review').last())
 expect(fixture.store.workspaces[sender].syllabi[0].courseOutline[0].contents).toEqual([''])
 await chat.getByRole('button',{name:'Close Pulse',exact:true}).click();await page.getByRole('button',{name:'Save as Drafted',exact:true}).click()
 await expect(page).toHaveURL(/tab=builder&edit=editable-methods/);await expect.poll(()=>fixture.store.revisions[sender]).toBe(2)
 const count=fixture.calls.length;await page.reload();await expect(first).toHaveValue('Week 1 research questions\nWeek 1 feasibility and scope');expect(fixture.calls).toHaveLength(count)
 await capture?.('saved-builder',page.locator('[data-section="5"]'))
 await page.getByRole('button',{name:'Open Pulse assistant'}).click();fixture.hold(4);await ask('complete the remaining weeks')
 await expect(page.getByLabel('Week 3 contents',{exact:true})).toHaveValue('Week 3 research questions\nWeek 3 feasibility and scope')
 await expect(page.getByLabel('Week 4 contents',{exact:true})).toHaveValue('')
 await capture?.('progressive',chat);fixture.release()
 await expect(page.getByLabel('Week 4 contents',{exact:true})).toHaveValue('Week 4 research questions\nWeek 4 feasibility and scope')
 await expect(chat.getByRole('button',{name:'Send',exact:true})).toBeVisible()
 expect(fixture.store.workspaces[sender].syllabi).toHaveLength(1);expect(fixture.store.workspaces[sender].syllabi[0].status).toBe('drafted');expect(fixture.store.workspaces[sender].syllabi[0].approvedFile).toBeUndefined();expect(fixture.store.revisions[sender]).toBe(2)
 return fixture
}
