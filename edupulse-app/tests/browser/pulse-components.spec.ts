import { test, expect } from '@playwright/test'
import { componentBuilder, focusComponent, exampleFieldModel, fileTransfer } from '../pulse-component-fixture'
import { researchMethodsDraft } from '../syllabus-draft-fixture'

test('a dragged field is placed directly, preserves neighboring outcomes and saves only from the builder',async({page},info)=>{
 const field=await componentBuilder(page),requests=await exampleFieldModel(page),pulse=await focusComponent(page,field,info.project.name==='mobile')
 await pulse.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('Draft this field using the selected course');await pulse.getByRole('button',{name:'Send',exact:true}).click()
 await expect(field).toHaveValue('Formulate a research question and justify an appropriate method.');await expect(page.locator('[data-pulse-field="programOutcomes.1"]')).toHaveValue('Keep this neighboring outcome')
 expect(requests[0]?.section).toBe('programOutcomes');expect(requests[0]?.context).toContain('programOutcomes.0');await expect(pulse.getByRole('button',{name:'Confirm and save draft',exact:true})).toHaveCount(0)
 await pulse.getByRole('button',{name:'Close Pulse',exact:true}).click();await page.getByRole('button',{name:'Save as Drafted',exact:true}).click();await expect(page).toHaveURL(/tab=builder&edit=/)
 await page.reload();await expect(field).toHaveValue('Formulate a research question and justify an appropriate method.');await expect(page.locator('[data-pulse-field="programOutcomes.1"]')).toHaveValue('Keep this neighboring outcome')
})

test('manual changes during inference reject placement atomically; an explicit whole-syllabus request broadens the scope',async({page})=>{
 const field=await componentBuilder(page);let release=()=>{},started=false;const gate=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/api/ai?action=operator',async route=>{const input=route.request().postDataJSON();started=true;await gate;await route.fulfill({json:{patch:{programOutcomes:input.editor.data.programOutcomes.map((text:string,index:number)=>index?text:'New generated outcome')},generated:true}})})
 await field.focus();await page.keyboard.press('Alt+p');const pulse=page.getByRole('dialog',{name:'Pulse',exact:true})
 await pulse.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('Improve this field');await pulse.getByRole('button',{name:'Send',exact:true}).click();await expect.poll(()=>started).toBe(true);await field.fill('New manual wording');release()
 await expect(pulse).toContainText('changed during generation');await expect(field).toHaveValue('New manual wording')
 await page.route('**/api/ai?action=operator',route=>route.fulfill({json:{patch:researchMethodsDraft,generated:true}}))
 await pulse.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('Generate all fields in this syllabus using research');await pulse.getByRole('button',{name:'Send',exact:true}).click()
 await expect(page.getByPlaceholder('Contents...',{exact:true}).first()).toHaveValue('Research questions and evidence');await expect(pulse.getByRole('button',{name:'Apply to open form',exact:true})).toHaveCount(0)
})

test('files drop onto the closed mascot or chat without sending, while invalid batches preserve attachments', async ({ page }) => {
  await componentBuilder(page)
  const csv = await fileTransfer(page, [{ name: 'IT104-class-list.csv', type: 'text/csv', text: 'StudentID,Name,Email,Block\nSYN-1,Synthetic Learner,learner@example.invalid,BSIT-1A' }])
  await page.locator('[data-pulse-ui="mascot"]').dispatchEvent('drop', { dataTransfer: csv })
  const pulse = page.getByRole('dialog', { name: 'Pulse', exact: true })
  await expect(pulse.locator('.connected-pulse-attachments')).toContainText('1 students')
  const input = pulse.getByRole('textbox', { name: 'Ask Pulse', exact: true }); await input.fill('Keep my unsent question')
  const text = await fileTransfer(page, [{ name: 'research-notes.txt', text: 'Research questions guide the selection of methods and collection of relevant evidence.' }])
  await pulse.dispatchEvent('dragenter', { dataTransfer: text })
  await expect(pulse.getByText('Drop files to attach', { exact: true })).toBeVisible()
  await pulse.dispatchEvent('drop', { dataTransfer: text })
  await expect(pulse.locator('.connected-pulse-attachments')).toContainText('research-notes.txt')
  await expect(input).toHaveValue('Keep my unsent question')
  await expect(pulse.locator('.connected-pulse-message.from-user')).toHaveCount(0)
  const tooMany = await fileTransfer(page, [{ name: 'third.txt', text: 'Third file' }, { name: 'fourth.txt', text: 'Fourth file' }])
  await pulse.dispatchEvent('drop', { dataTransfer: tooMany })
  await expect(pulse.getByRole('alert')).toContainText('up to three files')
  await expect(pulse.locator('.connected-pulse-attachments li')).toHaveCount(2)
  const invalid = await fileTransfer(page, [{ name: 'unsupported.exe', text: 'Unsupported reference' }])
  await pulse.dispatchEvent('drop', { dataTransfer: invalid })
  await expect(pulse.getByRole('alert')).toBeVisible()
  await expect(pulse.locator('.connected-pulse-attachments li')).toHaveCount(2)
})


test('a focused requirements section proposes its three fields and preserves unrelated outcomes', async ({ page }, info) => {
 await componentBuilder(page)
 await page.route('**/api/ai?action=operator', async route => {
  const input=route.request().postDataJSON()
  expect(input.section).toBe('all');expect(input.context).toContain('courseRequirements, gradingSystem, coursePolicy')
  await route.fulfill({json:{patch:{programOutcomes:['Unrelated change'],courseRequirements:['Proposed research portfolio'],gradingSystem:input.editor.data.gradingSystem,coursePolicy:['Proposed source-attribution policy']},generated:true,requiresConfirmation:true}})
 })
 const pulse=await focusComponent(page,page.locator('[data-section="6"] h3'),info.project.name==='mobile')
 await pulse.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('Draft this section')
 await pulse.getByRole('button',{name:'Send',exact:true}).click()
 await expect(pulse.getByRole('button',{name:'Apply to open form',exact:true})).toHaveCount(0)
 await expect(page.locator('[data-pulse-field="courseRequirements.0"]')).toHaveValue('Proposed research portfolio')
 await expect(page.locator('[data-pulse-field="programOutcomes.0"]')).toHaveValue('Original first outcome')
})
