import { test, expect } from '@playwright/test'
import { makeRuledSyllabusPdf } from '../fixtures'
import { readFile } from 'node:fs/promises'
import { getDocumentProxy, extractText } from 'unpdf'

async function builder(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button',{name:'Instructor',exact:true}).click()
  await page.goto('/#/syllabus?tab=builder')
  await page.getByLabel('Upload syllabus DOCX or PDF').setInputFiles({name:'sample-syllabus.pdf',mimeType:'application/pdf',buffer:makeRuledSyllabusPdf()})
  await expect(page.getByText('Extracted Sections Preview',{exact:true})).toBeVisible({timeout:30_000})
  await page.getByRole('button',{name:'Use This Syllabus',exact:true}).click()
}
async function say(page: import('@playwright/test').Page,text:string) {
  await page.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill(text)
  await page.getByRole('button',{name:'Send',exact:true}).click()
}
test('page-uploaded PDF survives focused follow-up, corrects only the selected outline and downloads a genuine PDF',async({page},info)=>{
  await builder(page)
  const topic=page.getByPlaceholder('Topic...',{exact:true}).nth(1)
  await expect(topic).toHaveValue('a. Variable declaration and assignment')
  await topic.fill('Incomplete topic')
  await topic.focus();await page.keyboard.press('Alt+p')
  const panel=page.getByRole('dialog',{name:'Pulse',exact:true})
  await expect(panel.locator('.pulse-focus-heading strong')).toBeVisible()
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
  await say(page,'make it more accurate to the file uploaded, these are incomplete and not correct')
  const card=panel.getByRole('region',{name:'Import syllabus sections'})
  await card.getByRole('button',{name:'Prepare edit preview'}).click()
  await expect(card).toContainText('a. Variable declaration and assignment')
  await expect(card).not.toContainText('nested conditions using a trace table')
  await card.getByRole('button',{name:'Apply to open form'}).click()
  await expect(topic).toHaveValue('a. Variable declaration and assignment')
  await expect(page.getByPlaceholder('Program outcome 1',{exact:true})).toHaveValue('1. Explain a program using examples.')
  if(info.project.name==='desktop') {
    const main=await page.locator('#main-content').boundingBox(), chat=await panel.boundingBox()
    expect(main!.x+main!.width).toBeLessThanOrEqual(chat!.x)
    for (const field of await page.locator('[data-section="1"] .form-input').all()) {
      const bounds=await field.boundingBox();expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(main!.x+main!.width)
    }
  }
  await panel.getByRole('button',{name:'Close Pulse',exact:true}).click()
  const downloaded=page.waitForEvent('download')
  await page.getByRole('button',{name:'Download PDF draft',exact:true}).click()
  const download=await downloaded
  expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  const pdf=await getDocumentProxy(new Uint8Array(await readFile((await download.path())!)))
  try { const {text}=await extractText(pdf,{mergePages:true});expect(text).toContain('Nested conditions and complete examples');expect(text).toContain('Week 4') } finally { await pdf.loadingTask.destroy() }
})
test('model conversations receive buddy identity, follow-up history and retained page source for material drafts',async({page})=>{
  const calls:any[]=[]
  await page.route('**/api/ai?action=health',route=>route.fulfill({json:{ready:true,provider:'test-provider',model:'synthetic-chat'}}))
  await page.route('**/api/ai?action=chat',async route=>{const body=route.request().postDataJSON();calls.push(body);await route.fulfill({json:{requestId:crypto.randomUUID(),mode:'generated',answer:body.buddy?'Let us choose one useful example together.':'Draft: explain variables with a worked example.',sources:[]}})})
  await builder(page)
  await page.getByRole('button',{name:'Open Pulse assistant'}).click()
  await say(page,'Create learning materials based on the course outline in my uploaded syllabus')
  await expect(page.getByText('Draft: explain variables with a worked example.',{exact:true})).toBeVisible()
  expect(calls.at(-1).task).toBe('draft')
  expect(calls.at(-1).attachments[0].text).toContain('Nested conditions and complete examples')
  await say(page,'generate me this')
  await expect.poll(()=>calls.length).toBe(2)
  expect(calls[1].attachments[0].text).toContain('Variable declaration and assignment')
  await page.getByText('Response actions',{exact:true}).last().click()
  await expect(page.getByRole('button',{name:'Download response as PDF'}).last()).toBeVisible()
  await page.getByRole('button', { name: 'Pulse options', exact: true }).click(); await page.getByRole('button',{name:'Open workspace buddies'}).click()
  const office=page.getByRole('dialog',{name:'Meet your crew.'})
  await office.getByRole('button',{name:/Talk to Quill,/}).click()
  await office.getByLabel('Message Quill').fill('How do you decide which example helps me?')
  await office.getByRole('button',{name:'Send to buddy'}).click()
  await expect(office.getByRole('log')).toContainText('Let us choose one useful example together.')
  expect(calls.at(-1).buddy).toBe('quill')
  await office.getByLabel('Message Quill').fill('Can you explain your approach a little more?')
  await office.getByRole('button',{name:'Send to buddy'}).click()
  await expect.poll(()=>calls.length).toBe(4)
  await expect(office.getByText('Let us choose one useful example together.',{exact:true})).toHaveCount(2)
  expect(calls[3].history.some((turn:any)=>turn.content.includes('choose one useful example'))).toBe(true)
})
